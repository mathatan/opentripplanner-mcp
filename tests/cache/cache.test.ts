import { describe, it, expect, vi } from "vitest";
import { GeocodeCache, collapseRequest } from "src/infrastructure/cache";

describe("Geocode LRU cache TTL & size", () => {
    it("evicts older entries when size exceeds max (placeholder)", () => {
        const cache = new GeocodeCache({ ttlMs: 10 * 60 * 1000, maxSize: 500 });
        for (let i = 0; i < 600; i++) {
            cache.set(`q${i}`, { result: i });
        }
        expect(cache.size).toBeLessThanOrEqual(500);
    });

    it("expires entries after TTL (placeholder)", async () => {
        vi.useFakeTimers();
        const cache = new GeocodeCache({ ttlMs: 10 * 60 * 1000, maxSize: 500 });
        cache.set("hello:en", { lat: 0, lon: 0 });
        await vi.advanceTimersByTimeAsync(10 * 60 * 1000 + 1000);
        expect(cache.get("hello:en")).toBeUndefined();
        vi.useRealTimers();
    });
});

describe("Request collapsing and recent-result reuse", () => {
    it("collapses multiple concurrent callers into a single upstream call", async () => {
        const resolveFns: Array<(v: any) => void> = [];
        const upstream = vi.fn(() => new Promise((res) => resolveFns.push(res)));
        const p1 = collapseRequest("concurrent:1", () => upstream(), 500);
        const p2 = collapseRequest("concurrent:1", () => upstream(), 500);
        // Both callers should have caused only a single upstream invocation.
        expect(upstream).toHaveBeenCalledTimes(1);
        // Resolve the upstream once.
        resolveFns[0]("ok");
        const [r1, r2] = await Promise.all([p1, p2]);
        expect(r1).toBe("ok");
        expect(r2).toBe("ok");
    });

    it("reuses recent successful result for calls started within windowMs after success", async () => {
        vi.useFakeTimers();
        const upstream = vi.fn(async () => "value-1");
        // First call invokes upstream.
        const r1 = await collapseRequest("reuse:key", () => upstream(), 500);
        expect(r1).toBe("value-1");
        // Immediate second call within window should NOT call upstream again.
        const r2 = await collapseRequest("reuse:key", () => upstream(), 500);
        expect(r2).toBe("value-1");
        expect(upstream).toHaveBeenCalledTimes(1);

        // Advance time beyond the collapse window so new calls invoke upstream again.
        await vi.advanceTimersByTimeAsync(501);
        const r3 = await collapseRequest("reuse:key", () => upstream(), 500);
        expect(r3).toBe("value-1");
        expect(upstream).toHaveBeenCalledTimes(2);

        vi.useRealTimers();
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
