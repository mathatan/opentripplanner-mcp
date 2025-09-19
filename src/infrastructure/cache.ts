/**
 * src/infrastructure/cache.ts
 *
 * Simple in-memory GeocodeCache with TTL and LRU eviction plus request collapsing.
 *
 * Public API (honors spec):
 * - new GeocodeCache({ ttlMs?, maxSize? })
 *   - ttlMs: entry time-to-live in milliseconds (default 10 * 60 * 1000 = 10 minutes)
 *   - maxSize: max number of entries before LRU eviction
 * - instance.set(key, value)
 * - instance.get(key)
 * - instance.size (getter)
 *
 * Request collapsing and "recent result" reuse:
 * - collapseRequest(key, fn, windowMs = 500)
 *   - Coalesces concurrent in-flight calls: callers that arrive while a request
 *     is in-flight receive the same Promise instance.
 *   - After a successful request completes, subsequent calls for the same key
 *     that start within the next `windowMs` milliseconds will receive the most
 *     recent successful result without invoking the upstream `fn()` again.
 *   - Failed attempts do NOT populate the recent-result buffer.
 *   - The implementation uses Date.now() for timestamps (tests use fake timers).
 *
 * Memory / eviction note:
 * - A small module-level `recentResults` map stores recent successful results per-key
 *   along with a timestamp. This map is intentionally simple; consider adding LRU or
 *   TTL eviction for `recentResults` if memory pressure is a concern (TODO).
 *
 * See tasks-phase-3.md T046 for requirements and tests.
 */

type CacheEntry = { value: any; ts: number };
/**
 * Default maximum number of entries for the geocode cache.
 * Exported so callers/tests can reference the default sizing constant.
 */
export const DEFAULT_GEOCODE_CACHE_MAX_SIZE = 500;

/**
 * GeocodeCache
 *
 * In-memory cache with TTL + LRU eviction semantics.
 *
 * Complexity:
 * - get/set operations are O(1) amortized (Map get/delete/set).
 * - purgeExpired() iterates entries but is only invoked lazily on operations; TTL disables
 *   purging when ttlMs <= 0.
 *
 * LRU semantics:
 * - "Least Recently Used" is approximated by Map insertion order. On get/set the key is
 *   removed and re-inserted so recently used items move to the end. Eviction removes
 *   the Map iterator's first key (oldest).
 *
 * TTL semantics:
 * - Each entry stores a timestamp (ts). purgeExpired() removes entries older than ttlMs.
 */
export class GeocodeCache {
    private ttlMs: number;
    private maxSize: number;
    private map: Map<string, CacheEntry>;

    constructor(options?: { ttlMs?: number; maxSize?: number }) {
        // Defaults preserved from existing implementation
        this.ttlMs = options?.ttlMs ?? 10 * 60 * 1000;
        this.maxSize = options?.maxSize ?? 500;
        this.map = new Map();
    }

    // Purge expired entries (no-op if ttlMs <= 0)
    private purgeExpired() {
        if (this.ttlMs <= 0) return;
        const now = Date.now();
        // Use Array.from to snapshot keys since we may delete while iterating
        for (const [k, entry] of Array.from(this.map.entries())) {
            if (now - entry.ts > this.ttlMs) {
                this.map.delete(k);
            }
        }
    }

    /**
     * Current number of non-expired entries in the cache.
     * Accessing this getter will run a lazy purge of expired entries.
     */
    get size(): number {
        this.purgeExpired();
        return this.map.size;
    }

    /**
     * Set a value in the cache.
     *
     * Throws if `key` is falsy to catch incorrect usage early.
     *
     * Behavior:
     * - Updates existing key insertion order to reflect recent use (LRU).
     * - Evicts oldest entries if size exceeds maxSize.
     */
    set(key: string, value: any): void {
        if (!key) {
            // Small runtime assertion to help catch incorrect usage (non-invasive).
            throw new Error('GeocodeCache.set: key must be a non-empty string');
        }

        this.purgeExpired();
        // If already exists, remove to update insertion order (LRU semantics)
        if (this.map.has(key)) this.map.delete(key);
        this.map.set(key, { value, ts: Date.now() });

        // Evict least-recently-used until within maxSize
        while (this.map.size > this.maxSize) {
            const oldestKey = this.map.keys().next().value;
            if (oldestKey === undefined) break;
            this.map.delete(oldestKey);
        }
    }

    /**
     * Get a value from the cache.
     *
     * Returns undefined if missing or expired. Access marks the entry as recently used.
     */
    get(key: string): any | undefined {
        this.purgeExpired();
        const entry = this.map.get(key);
        if (!entry) return undefined;
        // Mark as recently used: remove and re-insert
        this.map.delete(key);
        this.map.set(key, { value: entry.value, ts: entry.ts });
        return entry.value;
    }
}

/**
 * Legacy default cache instance for backward compatibility.
 *
 * TODO: make geocode cache defaults (e.g., maxSize) configurable via environment or app config.
 */
const defaultCache = new GeocodeCache({
    ttlMs: 10 * 60 * 1000,
    maxSize: DEFAULT_GEOCODE_CACHE_MAX_SIZE,
});

export function get(key: string): any {
    return defaultCache.get(key);
}

export function set(key: string, value: any): void {
    defaultCache.set(key, value);
}

/**
 * Coalesce concurrent requests for the same key and provide short-term reuse of
 * recent successful results.
 *
 * Behavior:
 * - If a request is already in-flight for `key`, concurrent callers receive the
 *   same Promise instance (coalescing).
 * - If the most recent successful result for `key` occurred within `windowMs`
 *   milliseconds, callers receive that recent result immediately (no upstream call).
 * - Failed upstream attempts do not populate the recent-result buffer.
 *
 * Implementation notes:
 * - Uses a small module-level `recentResults` map to store `{ value, ts }` per-key.
 * - Uses Date.now() for timestamps. Tests control time with fake timers.
 * - The `inflight` map ensures only one upstream `fn()` is invoked concurrently
 *   for a given key.
 *
 * TODO: Consider bounding or evicting entries in `recentResults` to avoid unbounded
 * memory growth (e.g., small LRU or TTL). This is intentionally not implemented
 * here to keep behavioral changes minimal.
 */
const recentResults = new Map<string, { value: any; ts: number }>();
const inflight = new Map<string, Promise<any>>();

export async function collapseRequest<T>(key: string, fn: () => Promise<T>, windowMs = 500): Promise<T> {
    // If there is an in-flight request, return its Promise so callers are coalesced.
    if (inflight.has(key)) {
        return inflight.get(key)! as Promise<T>;
    }

    // Check for a recent successful result that is still within windowMs.
    const recent = recentResults.get(key);
    if (recent && Date.now() - recent.ts <= windowMs) {
        return Promise.resolve(recent.value as T);
    }

    // Create deferred Promise references with definite assignment assertions.
    let resolveRef!: (v: T) => void;
    let rejectRef!: (e: unknown) => void;

    const p = new Promise<T>((resolve, reject) => {
        resolveRef = resolve;
        rejectRef = reject;
    });

    // Record as in-flight before invoking the upstream to coalesce concurrent callers.
    inflight.set(key, p);

    (async () => {
        try {
            const result = await fn();
            // Only store successful results in recentResults.
            recentResults.set(key, { value: result, ts: Date.now() });
            resolveRef(result);
        } catch (err) {
            rejectRef(err);
        } finally {
            // Ensure the in-flight marker is removed regardless of success/failure.
            inflight.delete(key);
        }
    })();

    return p;
}

// Named exports are already declared above (class and function). No extra export list needed.
