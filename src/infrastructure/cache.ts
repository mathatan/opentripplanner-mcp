/**
 * Simple in-memory GeocodeCache with TTL and LRU eviction + collapseRequest
 *
 * - GeocodeCache: class with constructor({ ttlMs, maxSize }), set/get, size property
 * - collapseRequest: coalesce concurrent requests by key
 * - also export legacy get/set helpers for compatibility
 */

type CacheEntry = { value: any; ts: number };

export class GeocodeCache {
    private ttlMs: number;
    private maxSize: number;
    private map: Map<string, CacheEntry>;

    constructor(options?: { ttlMs?: number; maxSize?: number }) {
        this.ttlMs = options?.ttlMs ?? 10 * 60 * 1000;
        this.maxSize = options?.maxSize ?? 500;
        this.map = new Map();
    }

    // Purge expired entries
    private purgeExpired() {
        if (this.ttlMs <= 0) return;
        const now = Date.now();
        for (const [k, entry] of Array.from(this.map.entries())) {
            if (now - entry.ts > this.ttlMs) {
                this.map.delete(k);
            }
        }
    }

    get size(): number {
        this.purgeExpired();
        return this.map.size;
    }

    set(key: string, value: any): void {
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

// Provide legacy helpers using an internal simple cache instance
const defaultCache = new GeocodeCache({ ttlMs: 10 * 60 * 1000, maxSize: 500 });

export function get(key: string): any {
    return defaultCache.get(key);
}

export function set(key: string, value: any): void {
    defaultCache.set(key, value);
}

/**
 * Coalesce concurrent requests for the same key.
 * If a promise is in-flight for the key, return it.
 * Otherwise call fn(), store the in-flight promise, and remove it once settled.
 */
const inflight = new Map<string, Promise<any>>();

export async function collapseRequest<T>(key: string, fn: () => Promise<T>, windowMs = 500): Promise<T> {
    if (inflight.has(key)) {
        return inflight.get(key)! as Promise<T>;
    }

    // Create a Promise and store it immediately so concurrent callers receive
    // the exact same Promise reference. Resolve/reject it once fn() completes.
    let resolveRef: (v: T) => void;
    let rejectRef: (e: any) => void;

    const p = new Promise<T>((resolve, reject) => {
        resolveRef = resolve;
        rejectRef = reject;
    });

    inflight.set(key, p);
    (async () => {
        try {
            const result = await fn();
            // @ts-ignore - assigned above
            resolveRef(result);
        } catch (err) {
            // @ts-ignore - assigned above
            rejectRef(err);
        } finally {
            inflight.delete(key);
        }
    })();

    return p;
}

// Named exports are already declared above (class and function). No extra export list needed.
