/**
 * T045: Finalize User Variable Store behavior
 *
 * This module implements the UserVariable store with the following rules:
 * - save(sessionId, variable):
 *   - Validate/transform via UserVariableSchema.parse
 *   - Normalize timestamps: createdAt/updatedAt/expiresAt -> epoch ms (number)
 *   - If ttlSeconds present, derive expiresAt if none provided
 *   - Return { previous?, variable } where previous is { key, type? } of prior stored entry
 *   - Persist the normalized stored object keyed by parsed.key
 * - get(sessionId, key):
 *   - Return undefined when session/key not found
 *   - Lazily purge expired entries (expiresAt may be string or number)
 *   - Return stored variable with updatedAt as epoch ms
 * - list(sessionId):
 *   - Return non-expired variables sorted by updatedAt desc (numbers)
 *   - Lazily purge expired entries during listing
 *
 * JSDoc references: T045 (tasks-phase-3.md)
 */
import { UserVariableSchema } from "../schema/userVariable.js";
import type { UserVariable } from "../schema/userVariable.js";

/**
 * Stored type alias for in-memory entries.
 * We use the schema's UserVariable for most fields but override
 * the timestamp fields to be numeric epoch-ms values in-memory.
 */
type Stored = Omit<UserVariable, "createdAt" | "updatedAt" | "expiresAt"> & {
  createdAt?: number;
  updatedAt: number;
  expiresAt?: number | null;
};

/**
 * In-memory store:
 * Map<sessionId, Map<key, Stored>>
 */
const store: Map<string, Map<string, Stored>> = new Map();

/**
 * Helper: convert various timestamp shapes to epoch ms number or null.
 * - number & finite -> Math.floor(value)
 * - string of digits only -> Number(value)
 * - other strings -> Date.parse(value) if valid
 * - otherwise -> null
 */
function toEpochMs(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return Math.floor(value);
  if (typeof value === "string") {
    // Numeric string (only digits)
    if (/^\d+$/.test(value)) {
      const n = Number(value);
      return Number.isFinite(n) ? Math.floor(n) : null;
    }
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

/**
 * Save a user variable for a session.
 * - Validates/transforms via UserVariableSchema.parse
 * - Normalizes timestamps and persists
 * - Returns { previous?: { key, type? }, variable: Stored }
 */
export async function save(sessionId: string, variable: unknown): Promise<{ previous?: { key: string; type?: string }; variable: Stored }> {
  // Validate / transform via schema
  const parsed = UserVariableSchema.parse(variable) as UserVariable;

  // Normalize timestamps
  const createdAtMs = toEpochMs((parsed as any).createdAt) ?? Date.now();
  const updatedAtMs = Date.now();
  const expiresAtFromParsed = toEpochMs((parsed as any).expiresAt);
  const expiresAtMs =
    expiresAtFromParsed ??
    (typeof (parsed as any).ttlSeconds === "number" ? Date.now() + Math.floor((parsed as any).ttlSeconds) * 1000 : null);

  const stored: Stored = {
    ...parsed,
    // Overwrite timestamps with normalized numeric values where applicable
    createdAt: createdAtMs,
    updatedAt: updatedAtMs,
    expiresAt: expiresAtMs,
  } as Stored;

  let sessionMap = store.get(sessionId);
  if (!sessionMap) {
    sessionMap = new Map<string, Stored>();
    store.set(sessionId, sessionMap);
  }

  const previous = sessionMap.get(parsed.key) as Stored | undefined;

  // Prepare previous summary per spec
  const previousSummary = previous ? { key: previous.key, ...(typeof (previous as any).type === "string" ? { type: (previous as any).type } : {}) } : undefined;

  // Persist new value (atomic at JS Map level: read previous then set)
  sessionMap.set(parsed.key, stored);

  // Return the normalized stored variable (with epoch ms numbers)
  return { previous: previousSummary, variable: stored };
}

/**
 * Get a stored variable for a session.
 * - Returns undefined if not found or expired (lazy purge).
 * - Always returns updatedAt as epoch ms.
 */
export async function get(sessionId: string, key?: string): Promise<Stored | undefined> {
  if (!key) return undefined;
  const sessionMap = store.get(sessionId);
  if (!sessionMap) return undefined;
  const entry = sessionMap.get(key);
  if (!entry) return undefined;

  const expMs = toEpochMs((entry as any).expiresAt);
  if (expMs != null && Date.now() >= expMs) {
    // expired -> purge and return undefined
    sessionMap.delete(key);
    return undefined;
  }

  // Ensure updatedAt is a number (it should be, since we normalize on save)
  const updatedAtNum = toEpochMs((entry as any).updatedAt) ?? Date.now();

  // Return a shallow clone to avoid accidental external mutation
  return { ...entry, updatedAt: updatedAtNum };
}

/**
 * List non-expired variables for a session sorted by updatedAt desc.
 * - Lazily purges expired entries while iterating.
 */
export async function list(sessionId: string): Promise<Stored[]> {
  const sessionMap = store.get(sessionId);
  if (!sessionMap) return [];

  const out: Stored[] = [];

  for (const [k, v] of sessionMap.entries()) {
    const expMs = toEpochMs((v as any).expiresAt);
    if (expMs != null && Date.now() >= expMs) {
      sessionMap.delete(k);
      continue;
    }
    out.push(v);
  }

  out.sort((a, b) => {
    const aTs = toEpochMs((a as any).updatedAt) ?? 0;
    const bTs = toEpochMs((b as any).updatedAt) ?? 0;
    return bTs - aTs;
  });

  // Return clones to avoid external mutation and ensure updatedAt numbers
  return out.map((v) => ({ ...v, updatedAt: toEpochMs((v as any).updatedAt) ?? 0 }));
}

/**
 * Test helpers: clear a session or clear entire store
 */
export async function clearSession(sessionId: string): Promise<void> {
  store.delete(sessionId);
}

export async function clearAll(): Promise<void> {
  store.clear();
}

/**
 * Default-exported class for compatibility with code/tests that instantiate the store.
 * Provides async methods save/get/list delegating to the module-level functions.
 */
export default class UserVariableStore {
  async save(sessionId: string, variable: unknown) {
    return save(sessionId, variable);
  }

  async get(sessionId: string, key?: string) {
    return get(sessionId, key);
  }

  async list(sessionId: string) {
    return list(sessionId);
  }
}