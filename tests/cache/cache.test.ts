import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GeocodeCache, collapseRequest } from "../../src/infrastructure/cache";

// Ensure fake timers are always restored after each test to avoid leaking fake timer state.
afterEach(() => {
    vi.useRealTimers();
});

describe("Geocode LRU cache TTL & size", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });
    it("evicts older entries when size exceeds max (placeholder)", () => {
        const cache = new GeocodeCache({ ttlMs: 10 * 60 * 1000, maxSize: 500 });
        for (let i = 0; i < 600; i++) {
            cache.set(`q${i}`, { result: i });
        }
        expect(cache.size).toBeLessThanOrEqual(500);
    });

    it("size getter is side-effect free and expiration requires explicit purge", async () => {
        const ttl = 10 * 60 * 1000;
        const cache = new GeocodeCache({ ttlMs: ttl, maxSize: 500 });
        // Insert an entry
        cache.set("hello:en", { lat: 0, lon: 0 });
        expect(cache.size).toBe(1);

        // Advance time beyond TTL so the entry becomes expired.
        await vi.advanceTimersByTimeAsync(ttl + 1000);

        // size() must be side-effect free: it should not purge expired entries.
        // Therefore the logical count of stored Map entries remains 1 until purgeExpired() runs.
        expect(cache.size).toBe(1);

        // Explicit purgeExpired() removes expired entries.
        cache.purgeExpired();
        expect(cache.size).toBe(0);

        // After purge, get should return undefined.
        expect(cache.get("hello:en")).toBeUndefined();
    });
});

describe("Request collapsing and recent-result reuse", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });
    it("collapses multiple concurrent callers into a single upstream call", async () => {
        const resolveFns: Array<(v: any) => void> = [];
        const upstream = vi.fn(() => new Promise((res) => resolveFns.push(res)));
        const p1 = collapseRequest("concurrent:1", () => upstream(), 500);
        const p2 = collapseRequest("concurrent:1", () => upstream(), 500);
        // Both callers should have caused only a single upstream invocation.
        expect(upstream).toHaveBeenCalledTimes(1);
        // Concurrent callers must receive the identical Promise instance.
        expect(p1).toBe(p2);
        // Resolve the upstream once.
        resolveFns[0]("ok");
        const [r1, r2] = await Promise.all([p1, p2]);
        expect(r1).toBe("ok");
        expect(r2).toBe("ok");
    });

    it("coalesces callers created across microtasks (same in-flight Promise)", async () => {
        const upstream = vi.fn(() => new Promise((res) => setTimeout(() => res("micro"), 10)));
        // First caller in the same tick.
        const p0 = collapseRequest("micro:1", () => upstream(), 500);
        // Ensure we advance the microtask queue between calls to simulate callers arriving
        // across microtask ticks while still coalescing on the same in-flight Promise.
        await Promise.resolve();
        const p1 = collapseRequest("micro:1", () => upstream(), 500);
        await Promise.resolve();
        const p2 = collapseRequest("micro:1", () => upstream(), 500);
        // All callers, even across microtask ticks, must receive identical in-flight Promise.
        expect(p0).toBe(p1);
        expect(p1).toBe(p2);
        expect(upstream).toHaveBeenCalledTimes(1);
        // Advance timers so the upstream resolves.
        await vi.advanceTimersByTimeAsync(20);
        const results = await Promise.all([p0, p1, p2]);
        expect(results.every((r) => r === "micro")).toBe(true);
    });

    it("stress: many concurrent callers receive the identical Promise instance and result", async () => {
        const upstream = vi.fn(() => new Promise((res) => setTimeout(() => res("many"), 10)));
        const callers = 200;
        const promises: Promise<any>[] = [];
        // Fire many concurrent callers synchronously
        for (let i = 0; i < callers; i++) {
            promises.push(collapseRequest("stress:identical", () => upstream(), 500));
        }
        // All returned Promise objects should be the identical instance (identity reuse).
        expect(promises.every((p) => p === promises[0])).toBe(true);
        // Upstream must have been invoked exactly once.
        expect(upstream).toHaveBeenCalledTimes(1);
        // Advance timers so the upstream resolves.
        await vi.advanceTimersByTimeAsync(20);
        const results = await Promise.all(promises);
        expect(results.every((r) => r === "many")).toBe(true);
    });

    it("inflight timeout rejects and prevents populating recent-results (subsequent call triggers new upstream)", async () => {
        const upstream = vi.fn(() => new Promise((res) => setTimeout(() => res("will-succeed"), 100)));
        // First call with a short inflight timeout - should reject.
        const pTimeout = collapseRequest("inflight:timeout", () => upstream(), 500, 10);
        // Advance fake timers so the inflight timeout fires.
        await vi.advanceTimersByTimeAsync(20);
        await expect(pTimeout).rejects.toThrow(/inflight timeout/);

        // After timeout the upstream may still finish, but recent-results must not be populated.
        // A subsequent call should trigger a fresh upstream invocation.
        const p2 = collapseRequest("inflight:timeout", () => upstream(), 500, 200);
        // Advance timers to allow upstream to finish.
        await vi.advanceTimersByTimeAsync(150);
        const r2 = await p2;
        expect(r2).toBe("will-succeed");
        // The upstream should have been invoked twice: once for the timed-out attempt, once for recovery.
        expect(upstream).toHaveBeenCalledTimes(2);
    });
 
    it("reuses recent successful result for calls started within windowMs after success (identity reuse)", async () => {
        const upstream = vi.fn(async () => "value-1");
        // First call invokes upstream.
        const p1 = collapseRequest("reuse:identity", () => upstream(), 500);
        const r1 = await p1;
        expect(r1).toBe("value-1");
        // Immediate second call within window should reuse the identical Promise instance.
        const p2 = collapseRequest("reuse:identity", () => upstream(), 500);
        expect(p2).toBe(p1);
        const r2 = await p2;
        expect(r2).toBe("value-1");
        expect(upstream).toHaveBeenCalledTimes(1);
    });
 
    it("does not populate recent result buffer when upstream fails", async () => {
        const failing = vi.fn(() => Promise.reject(new Error("boom")));
        // Ensure the rejection does not populate the recent-result buffer.
        await expect(collapseRequest("fail:key", () => failing(), 500)).rejects.toThrow("boom");
 
        // Subsequent successful upstream should still be invoked.
        const success = vi.fn(async () => "recovered");
        const r = await collapseRequest("fail:key", () => success(), 500);
        expect(r).toBe("recovered");
        expect(success).toHaveBeenCalledTimes(1);
    });
 
    it("recentResults preserves stored Promise identity on getRecentResultWithin", () => {
        const cache = new GeocodeCache({ ttlMs: 1000, maxSize: 10 });
        const p = Promise.resolve("pid-value");
        cache.setRecentResult("pid:key", p);
        const got = cache.getRecentResultWithin("pid:key", 500);
        // Identity must be preserved when a Promise was stored.
        expect(got).toBe(p);
    });
 
    it("getRecentResultWithin returns raw values unchanged (raw values are not wrapped by the cache)", () => {
        const cache = new GeocodeCache({ ttlMs: 1000, maxSize: 10 });
        cache.setRecentResult("raw:key", "raw-val");
        const got = cache.getRecentResultWithin("raw:key", 500);
        // Raw values are returned as-is; collapseRequest wraps raw values per-call.
        expect(got).toBe("raw-val");
    });
 
    it("evicts recent-result after windowMs so a new call returns a new Promise/value", async () => {
        const upstream = vi.fn(async () => "ttl-value");
        // Initial call
        const p1 = collapseRequest("ttl:key", () => upstream(), 50);
        const r1 = await p1;
        expect(r1).toBe("ttl-value");
        // Immediate reuse within window should return identical Promise
        const p2 = collapseRequest("ttl:key", () => upstream(), 50);
        expect(p2).toBe(p1);
        // Advance time beyond the collapse window
        await vi.advanceTimersByTimeAsync(51);
        const p3 = collapseRequest("ttl:key", () => upstream(), 50);
        // After expiry, new call must produce a different Promise (new upstream invocation)
        expect(p3).not.toBe(p1);
        const r3 = await p3;
        expect(r3).toBe("ttl-value");
        expect(upstream).toHaveBeenCalledTimes(2);
    });
    it("recentResults bounded under high request rates", async () => {
        // Use a small cap to make assertions deterministic and fast.
        const cap = 50;
        const cache = new GeocodeCache({
            ttlMs: 10 * 60 * 1000,
            maxSize: 500,
            recentResultsMaxSize: cap,
            recentResultsTtlMs: 1000,
        });
        // Simulate a high rate of successful upstream results with unique keys.
        for (let i = 0; i < 200; i++) {
            cache.setRecentResult(`rk${i}`, Promise.resolve(i));
        }
        const recentMap = (cache as any).recentResultsMap as Map<string, any>;
        // Ensure the underlying recent-results map never grows beyond the configured cap.
        expect(recentMap.size).toBeLessThanOrEqual(cap);
        // Oldest entries should have been evicted while newest remains.
        expect(recentMap.has('rk0')).toBe(false);
        expect(recentMap.has(`rk199`)).toBe(true);
    });
    
    it("recentResults TTL eviction works as expected", async () => {
        const cache = new GeocodeCache({
            ttlMs: 10 * 60 * 1000,
            maxSize: 500,
            recentResultsMaxSize: 100,
            recentResultsTtlMs: 50,
        });
        // Insert a recent result and confirm immediate availability.
        cache.setRecentResult("tkey", "tvalue");
        expect(cache.getRecentResultWithin("tkey", 100)).toBe("tvalue");
        // Advance clocks beyond the recent-results TTL.
        await vi.advanceTimersByTimeAsync(51);
        // Accessing should purge expired recent-results and return undefined.
        const res = cache.getRecentResultWithin("tkey", 100);
        expect(res).toBeUndefined();
        const recentMap = (cache as any).recentResultsMap as Map<string, any>;
        // Underlying map should have been purged of the expired key.
        expect(recentMap.has("tkey")).toBe(false);
    });
});

describe("LRU behavior (placeholder)", () => {
    it("retains recently accessed keys and evicts least-recently-used", () => {
        const cache = new GeocodeCache({ ttlMs: 10 * 60 * 1000, maxSize: 3 });
        cache.set("a", "A");
        cache.set("b", "B");
        cache.set("c", "C");
        // Access a to make it recently used
        cache.get("a");
        cache.set("d", "D"); // should evict 'b'
        expect(cache.get("b")).toBeUndefined();
        expect(cache.get("a")).toBe("A");
    });
});

describe("Cache key acceptance & validation", () => {
    it("accepts numeric keys and the string \"0\" and rejects empty / null / undefined keys", () => {
        const cache = new GeocodeCache({ ttlMs: 10 * 60 * 1000, maxSize: 10 });

        // string "0" must be accepted
        cache.set("0", "str-zero");
        expect(cache.get("0")).toBe("str-zero");

        // numeric 0 must be accepted and treated as a distinct key from the string "0"
        cache.set(0, "num-zero");
        expect(cache.get(0)).toBe("num-zero");
        // Ensure string "0" value remains unchanged (keys are distinct)
        expect(cache.get("0")).toBe("str-zero");

        // another numeric key
        cache.set(42, "forty-two");
        expect(cache.get(42)).toBe("forty-two");

        // Reject truly empty keys
        expect(() => cache.set("", "bad")).toThrow();
        expect(() => cache.set(null as any, "bad")).toThrow();
        expect(() => cache.set(undefined as any, "bad")).toThrow();
    });
});
describe("purgeExpired behavior with large caches and concurrent shrink", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it("purges only the leading expired entries and preserves recent ones in a large cache", async () => {
        const ttl = 1000;
        const cache = new GeocodeCache({ ttlMs: ttl, maxSize: 5000 });

        // Insert a large batch that will become expired.
        const expiredCount = 1500;
        for (let i = 0; i < expiredCount; i++) {
            cache.set(`e${i}`, { v: i });
        }

        // Advance time so the above entries become expired.
        await vi.advanceTimersByTimeAsync(ttl + 10);

        // Insert a later batch that should remain valid (newer timestamps).
        const freshCount = 500;
        for (let i = 0; i < freshCount; i++) {
            cache.set(`f${i}`, { v: i });
        }

        // Sanity: total entries is expiredCount + freshCount.
        expect(cache.size).toBe(expiredCount + freshCount);

        // Calling purgeExpired should remove the leading expired entries and stop
        // once it encounters the first non-expired entry. The final size should
        // equal the number of fresh entries.
        cache.purgeExpired();
        expect(cache.size).toBe(freshCount);

        // Verify a few representative keys: first expired key removed, fresh keys remain.
        expect(cache.get("e0")).toBeUndefined();
        expect(cache.get(`f0`)).toEqual({ v: 0 });
    });

    it("exits early from purgeExpired when the cache is externally shrunk during iteration", async () => {
        const ttl = 1000;
        const cache = new GeocodeCache({ ttlMs: ttl, maxSize: 10 });

        // Create a small map with several expired entries and one fresh entry.
        cache.set("e1", 1);
        cache.set("e2", 2);
        cache.set("e3", 3);

        // Move time forward so existing entries become expired.
        await vi.advanceTimersByTimeAsync(ttl + 10);

        // Insert a fresh entry that will not be expired.
        cache.set("fresh", "keep-me");

        // Confirm initial size
        expect(cache.size).toBe(4);

        // Monkey-patch the underlying Map.keys() on this instance to simulate an
        // external shrink that deletes "fresh" while purgeExpired is iterating.
        const underlyingMap = (cache as any).map as Map<any, any>;
        const origKeys = Array.from(underlyingMap.keys());
        let yieldCount = 0;
        // Replace keys() on this instance only.
        (underlyingMap as any).keys = function* () {
            for (const k of origKeys) {
                // Before yielding the second key, simulate an external actor removing the fresh entry.
                if (yieldCount === 1) {
                    underlyingMap.delete("fresh");
                }
                yieldCount++;
                yield k;
            }
        };

        // Run purgeExpired; because the cache is externally shrunk during iteration,
        // the implementation should detect the shrink and exit early without removing
        // all expired entries.
        cache.purgeExpired();

        // The simulated external deletion removed "fresh".
        expect(underlyingMap.has("fresh")).toBe(false);

        // Because purgeExpired should have exited early, at least one expired key remains.
        const remainingExpired = ["e2", "e3"].filter((k) => underlyingMap.has(k));
        expect(remainingExpired.length).toBeGreaterThan(0);

        // A subsequent call to purgeExpired (without monkey-patching) should remove remaining expired entries.
        // Restore original keys() to use normal iteration behavior.
        delete (underlyingMap as any).keys;
        cache.purgeExpired();
        // Now the underlying map should be empty.
        expect(cache.size).toBe(0);
    });
});