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
 *     is in-flight receive the same Promise instance (inflight identity).
 *   - After a successful request completes, subsequent calls for the same key
 *     that start within the next `windowMs` milliseconds will receive the
 *     identical Promise instance that represented the successful request
 *     (recent-result identity reuse). This means:
 *       * Callers that arrived while the upstream request was in-flight get the
 *         same Promise object.
 *       * Callers that start after the upstream request finished but within the
 *         `windowMs` reuse the same resolved Promise instance (p1 === p2).
 *   - Failed attempts do NOT populate the recent-result buffer.
 *   - The implementation uses Date.now() for timestamps (tests use fake timers).
 *   - Rationale: preserving Promise identity simplifies reasoning for callers
 *     that compare or cache Promise objects, and ensures strong request
 *     coalescing semantics (both in-flight and immediate reuse return the same
 *     Promise instance).
 *
 * Memory / eviction note:
 * - A bounded, LRU-with-TTL "recentResults" cache is used to store very short-lived
 *   successful results for request collapsing/fast-reuse. This cache is bounded
 *   (default 1000 entries) and supports TTL expiry (default 500ms) to avoid
 *   unbounded memory growth.
 * See tasks-phase-3.md T046 for requirements and tests.
 */

type CacheEntry = { value: any; ts: number };

/**
 * Default maximum number of entries for the geocode cache.
 * Exported so callers/tests can reference the default sizing constant.
 */
export const DEFAULT_GEOCODE_CACHE_MAX_SIZE = 500;

/**
 * Defaults for the short-lived "recent results" buffer used by collapseRequest.
 * - DEFAULT_RECENT_RESULTS_MAX_SIZE: capacity cap for recent-results (entries)
 * - DEFAULT_RECENT_RESULTS_TTL_MS: TTL for recent-results entries (ms)
 *
 * Both may be overridden via constructor options or environment variables:
 * - GEOCODE_RECENT_RESULTS_MAX_SIZE
 * - GEOCODE_RECENT_RESULTS_TTL_MS
 */
export const DEFAULT_RECENT_RESULTS_MAX_SIZE = 1000;
export const DEFAULT_RECENT_RESULTS_TTL_MS = 500;

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
    private map: Map<any, CacheEntry>;

    // Configuration for the short-lived "recent results" cache used by collapseRequest.
    // These options are configurable via the constructor:
    // - recentResultsMaxSize: number (default 1000 entries)
    // - recentResultsTtlMs: number (default 500 ms) -- TTL applied to recent-results entries
    private recentResultsMaxSize: number;
    private recentResultsTtlMs: number;
    // Underlying Map for recent-results; insertion order is used to approximate LRU.
    private recentResultsMap: Map<string, CacheEntry>;

    /**
     * constructor(options?)
     *
     * New optional parameters (in addition to ttlMs/maxSize):
     * - recentResultsMaxSize?: number = 1000
     * - recentResultsTtlMs?: number = 500
     *
     * recentResultsTtlMs defaults to 500ms (same as default collapseRequest windowMs).
     */
    constructor(options?: {
        ttlMs?: number;
        maxSize?: number;
        recentResultsMaxSize?: number;
        recentResultsTtlMs?: number;
    }) {
        // Defaults preserved from existing implementation
        this.ttlMs = options?.ttlMs ?? 10 * 60 * 1000;
        this.maxSize = options?.maxSize ?? 500;
        this.map = new Map();

        // Recent-results cache defaults (constructor options > env > hard default)
        const envRecentMax =
            typeof process !== 'undefined' && process.env.GEOCODE_RECENT_RESULTS_MAX_SIZE
                ? parseInt(process.env.GEOCODE_RECENT_RESULTS_MAX_SIZE, 10)
                : undefined;
        const envRecentTtl =
            typeof process !== 'undefined' && process.env.GEOCODE_RECENT_RESULTS_TTL_MS
                ? parseInt(process.env.GEOCODE_RECENT_RESULTS_TTL_MS, 10)
                : undefined;
        this.recentResultsMaxSize =
            options?.recentResultsMaxSize ?? envRecentMax ?? DEFAULT_RECENT_RESULTS_MAX_SIZE;
        this.recentResultsTtlMs =
            options?.recentResultsTtlMs ?? envRecentTtl ?? DEFAULT_RECENT_RESULTS_TTL_MS;
        this.recentResultsMap = new Map();
    }

    // Purge expired entries (no-op if ttlMs <= 0)
    // Exposed as a public instance/prototype method so callers can explicitly purge
    // when mutating operations are performed. This keeps the size getter side-effect free.
    public purgeExpired() {
        if (this.ttlMs <= 0) return;
        const now = Date.now();

        // Iterate oldest-first using the Map iterator. Stop at the first non-expired
        // entry because insertion order approximates recency (LRU): once we encounter
        // a still-valid entry, all following entries are newer and therefore not expired.
        //
        // Defensive behaviour: if the cache is externally shrunk while we iterate
        // (for example some other operation removed entries concurrently), stop early
        // to avoid iterating over keys that were removed. We detect external shrink
        // by tracking the last observed size and breaking if the map size decreases
        // between iterations (excluding deletions we perform ourselves).
        let lastSize = this.map.size;
        for (const k of this.map.keys()) {
            // If the cache shrank since the last iteration (and it wasn't our own delete),
            // exit early because remaining iterator keys may no longer be relevant.
            if (this.map.size < lastSize) break;

            const entry = this.map.get(k);
            // Update observed size now (before we might delete this key) so our own
            // deletions don't get treated as external shrink on the next loop.
            lastSize = this.map.size;

            if (!entry) continue; // may have been removed concurrently; skip safely
            if (now - entry.ts > this.ttlMs) {
                // expired -> remove and continue purging older entries
                this.map.delete(k);
                // reflect our deletion so we don't treat it as an external shrink
                lastSize = this.map.size;
                continue;
            }
            // first non-expired entry -> early exit to preserve LRU ordering and avoid
            // unnecessary work
            break;
        }
    }

    // Purge expired entries from the recent-results cache (no-op if recentResultsTtlMs <= 0).
    // On each call we iterate oldest-first and remove expired entries. Because insertion
    // order approximates recency, we can stop when we encounter the first non-expired entry.
    private purgeExpiredRecentResults() {
        if (this.recentResultsTtlMs <= 0) return;
        const now = Date.now();
        for (const k of this.recentResultsMap.keys()) {
            const entry = this.recentResultsMap.get(k);
            if (!entry) continue;
            if (now - entry.ts > this.recentResultsTtlMs) {
                this.recentResultsMap.delete(k);
                continue;
            }
            break;
        }
    }

    /**
     * Current number of entries in the cache.
     *
     * NOTE: This getter is side-effect free and does not purge expired entries.
     * Call `purgeExpired()` explicitly when you need to remove expired entries.
     */
    get size(): number {
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
    set(key: any, value: any): void {
        // Only reject keys that are exactly empty string, null, or undefined.
        // Allow other falsy-like values such as 0, "0", NaN, false, etc.
        if (key === '' || key === null || key === undefined) {
            // Small runtime assertion to help catch incorrect usage (non-invasive).
            throw new Error('GeocodeCache.set: key must not be empty, null, or undefined');
        }
 
        // Do NOT automatically purge expired entries on set().
        // purgeExpired() is intentionally an explicit operation that callers/tests
        // invoke when they want to remove expired entries. This preserves the
        // "size getter is side-effect free" semantics and allows tests to observe
        // the logical count of entries until an explicit purge is requested.
        // If the caller desires immediate purging, they should call purgeExpired().
        // Update insertion order (LRU semantics)
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
    get(key: any): any | undefined {
        this.purgeExpired();
        const entry = this.map.get(key);
        if (!entry) return undefined;
        // Mark as recently used: remove and re-insert
        this.map.delete(key);
        this.map.set(key, { value: entry.value, ts: entry.ts });
        return entry.value;
    }

    /**
     * recent-results cache accessors used by collapseRequest.
     *
     * - getRecentResultWithin(key, windowMs) => returns the stored value only if the stored
     *   timestamp is within `windowMs` from now. This method purges expired entries and
     *   updates LRU ordering for the found key.
     * - setRecentResult(key, value) => stores a successful result with a timestamp and
     *   enforces TTL + maxSize eviction.
     */
    public getRecentResultWithin(key: string, windowMs: number): any | undefined {
        // Purge expired recent-results first.
        this.purgeExpiredRecentResults();
        const entry = this.recentResultsMap.get(key);
        if (!entry) return undefined;
        // Touch to mark as recently used (LRU)
        this.recentResultsMap.delete(key);
        this.recentResultsMap.set(key, { value: entry.value, ts: entry.ts });
        // Window-level check: collapseRequest semantics require that callers only reuse
        // a result that is within `windowMs` of the stored timestamp.
        //
        // NOTE: entry.value may be either:
        //  - a Promise (preferred) — the exact in-flight Promise instance is stored.
        //    Policy: Promise identity is preserved for stored Promise values. That means
        //    callers that hit a recent successful Promise will receive the very same
        //    Promise object (p1 === p2) while the cached entry is within `windowMs`.
        //    This preserves strong coalescing semantics and allows downstream callers
        //    to compare or further cache Promise objects if they rely on identity.
        //
        //  - a raw value (for backward compatibility). The cache stores raw values as-is
        //    but does NOT try to synthesize or retain a resolved Promise object for them.
        //    collapseRequest accepts both forms: when a raw value is returned from the
        //    recent-results buffer it will be wrapped with `Promise.resolve()` for the
        //    caller. Wrapping produces a freshly-resolved Promise per call, so identity
        //    is NOT preserved for raw values (each caller receives a new resolved Promise).
        //
        // This hybrid policy intentionally preserves identity for real in-flight Promise
        // instances (strong coalescing) while remaining compatible with older callers
        // that may store raw values.
        if (Date.now() - entry.ts <= windowMs) return entry.value;
        return undefined;
    }

    public setRecentResult(key: string, value: any): void {
        // Purge expired entries first.
        // Value MAY be a Promise (the in-flight Promise instance) or a raw value.
        // We store the value as-is to preserve identity when a Promise is provided.
        this.purgeExpiredRecentResults();
        if (this.recentResultsMap.has(key)) this.recentResultsMap.delete(key);
        this.recentResultsMap.set(key, { value, ts: Date.now() });
 
        // Enforce capacity
        while (this.recentResultsMap.size > this.recentResultsMaxSize) {
            const oldestKey = this.recentResultsMap.keys().next().value;
            if (oldestKey === undefined) break;
            this.recentResultsMap.delete(oldestKey);
        }
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

export function set(key: any, value: any): void {
    defaultCache.set(key, value);
}

/**
 * Expose purgeExpired for the default cache instance so callers/tests can
 * trigger an explicit purge when necessary.
 */
export function purgeExpired(): void {
    defaultCache.purgeExpired();
}

/**
 * The recent-results buffer used by collapseRequest is now a bounded LRU-with-TTL cache
 * owned by the GeocodeCache instance. The global `inflight` map remains module-level
 * so concurrent callers are still coalesced.
 */
const inflight = new Map<string, Promise<any>>();

export function collapseRequest<T>(
    key: string,
    fn: () => Promise<T>,
    windowMs = 500,
    inflightTimeoutMs?: number
): Promise<T> {
    // Fast-path: reuse recent successful result (within collapse window)
    // The recent result may be either a Promise (preferred) or a raw value. If it's
    // a Promise we return it directly to preserve identity. Otherwise wrap it.
    const recent = defaultCache.getRecentResultWithin(key, windowMs);
    if (recent !== undefined) {
        // Support thenables across different realms/testing shims:
        // - If recent is a thenable (has a .then function), return it as-is to
        //   preserve identity; otherwise wrap in a resolved Promise.
        const isThenable = recent && typeof (recent as any).then === 'function';
        return isThenable ? (recent as Promise<T>) : Promise.resolve(recent as T);
    }

    // Atomic compute-if-absent: if there's already an in-flight Promise, return it.
    const existing = inflight.get(key) as Promise<T> | undefined;
    if (existing) return existing;

    // Deferred promise refs so the exact same Promise object can be returned to all callers.
    let resolveRef!: (v: T) => void;
    let rejectRef!: (e: unknown) => void;
    const p = new Promise<T>((resolve, reject) => {
        resolveRef = resolve;
        rejectRef = reject;
    });
    // Attach a noop rejection handler synchronously to avoid Node's "Unhandled
    // Promise rejection" warnings in tests when the inflight timeout or the
    // upstream rejects before callers attach handlers. Adding a catch here
    // registers a rejection handler but does not prevent callers awaiting the
    // original promise from observing the rejection.
    p.catch(() => {});

    // Install as in-flight immediately to coalesce concurrent callers.
    inflight.set(key, p);

    // Track whether we already settled the deferred to avoid double-resolve/reject
    let settled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    // Setup inflight timeout if requested
    if (inflightTimeoutMs && inflightTimeoutMs > 0) {
        timeoutId = setTimeout(() => {
            // Only act if this same Promise is still the current inflight marker.
            if (inflight.get(key) === p) {
                // Remove inflight marker before rejecting so subsequent callers may start a new request.
                inflight.delete(key);
            }
            if (!settled) {
                settled = true;
                const err = new Error(`inflight timeout after ${inflightTimeoutMs}ms`);
                // Mark error name for easier identification in logs/tests if needed.
                (err as any).name = 'InflightTimeoutError';
                rejectRef(err);
            }
        }, inflightTimeoutMs);
    }

    (async () => {
            try {
                const result = await fn();
                // Ensure we clear the inflight entry before settling the returned Promise so
                // downstream .then/.catch handlers observe a cleared inflight state.
                if (inflight.get(key) === p) {
                    inflight.delete(key);
                }
                // Only store successful results in the recent-results cache and only if we
                // haven't already settled (for example due to an inflight timeout). This
                // prevents a late/upstream resolution from populating the recent-results
                // buffer with a Promise that was already rejected by an earlier timeout.
                if (!settled) {
                    settled = true;
                    // Store the exact in-flight Promise instance so subsequent callers receive the
                    // identical Promise (identity reuse) within the collapse window.
                    defaultCache.setRecentResult(key, p);
                    resolveRef(result);
                }
            } catch (err) {
            if (inflight.get(key) === p) {
                inflight.delete(key);
            }
            if (!settled) {
                settled = true;
                rejectRef(err);
            }
        } finally {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        }
    })();

    return p;
}

// Named exports are already declared above (class and function). No extra export list needed.
