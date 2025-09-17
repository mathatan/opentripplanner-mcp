import { UserVariableSchema } from "../schema/userVariable.js";

/**
 * In-memory store:
 * Map<sessionId, Map<key, UserVariable>>
 *
 * Module-level Map is created on import so it's shared within the process.
 */
const store: Map<string, Map<string, any>> = new Map();

/**
 * Save a user variable for a session.
 * - Validates/transforms `variable` via UserVariableSchema.parse
 * - Persists into in-memory map keyed by sessionId
 * - Returns { previous?, variable }
 */
export async function save(sessionId: string, variable: any): Promise<{ previous?: any; variable: any }> {
    const parsed = UserVariableSchema.parse(variable);

    let sessionMap = store.get(sessionId);
    if (!sessionMap) {
        sessionMap = new Map<string, any>();
        store.set(sessionId, sessionMap);
    }

    const previous = sessionMap.get(parsed.key);
    sessionMap.set(parsed.key, parsed);

    return { previous, variable: parsed };
}

/**
 * Get a single variable by key for a session.
 * If no key is provided, return undefined (store-level helper).
 */
export async function get(sessionId: string, key?: string): Promise<any> {
    if (!key) return undefined;
    const sessionMap = store.get(sessionId);
    if (!sessionMap) return undefined;
    const val = sessionMap.get(key);
    if (!val) return undefined;
    // If there is an expiresAt field, treat it as ISO string and check expiry against current time
    try {
        const exp = (val as any).expiresAt;
        if (typeof exp === "string") {
            const expMs = Date.parse(exp);
            if (!Number.isNaN(expMs) && Date.now() >= expMs) {
                // expired -> remove and return undefined
                sessionMap.delete(key);
                return undefined;
            }
        }
    } catch {
        // ignore parsing errors and return the value
    }
    return val;
}

/**
 * List variables for a session as an array of values.
 */
export async function list(sessionId: string): Promise<any[]> {
    const sessionMap = store.get(sessionId);
    if (!sessionMap) return [];
    return Array.from(sessionMap.values());
}

// Test helpers: clear a session or clear entire store
export async function clearSession(sessionId: string): Promise<void> {
    store.delete(sessionId);
}

export async function clearAll(): Promise<void> {
    store.clear();
}

// Default-exported class for compatibility with code/tests that instantiate the store.
export default class UserVariableStore {
    async save(sessionId: string, variable: any) {
        return save(sessionId, variable);
    }

    async get(sessionId: string, key?: string) {
        return get(sessionId, key);
    }

    async list(sessionId: string) {
        return list(sessionId);
    }
}
