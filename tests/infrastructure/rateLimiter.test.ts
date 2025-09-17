import { describe, it, expect, vi, afterEach } from "vitest";
import { RateLimiter } from "src/infrastructure/rateLimiter";

describe("RateLimiter - Phase 2 T020", () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it("Capacity & burst test", async () => {
        const limiter = new RateLimiter({ capacity: 30, refillPerSecond: 10 });
        const results: boolean[] = [];

        for (let i = 0; i < 31; i++) {
            results.push(await limiter.take());
        }

        expect(results.slice(0, 30)).toEqual(new Array(30).fill(true));
        expect(results[30]).toBe(false);
    });

    it("Refill behavior with fake timers", async () => {
        vi.useFakeTimers();
        const limiter = new RateLimiter({ capacity: 30, refillPerSecond: 10 });

        // drain all tokens
        for (let i = 0; i < 30; i++) {
            await limiter.take();
        }

        // advance 1 second -> expect at least one token refilled (placeholder)
        vi.advanceTimersByTime(1000);
        expect(await limiter.take()).toBe(true);
    });

    it("Burst + sustained drain", async () => {
        vi.useFakeTimers();
        let limiter = new RateLimiter({ capacity: 30, refillPerSecond: 10 });

        // burst of 30
        for (let i = 0; i < 30; i++) {
            await limiter.take();
        }

        // Try to consume faster than refill rate (10/second)
        const sustainedResults: boolean[] = [];
        for (let i = 0; i < 50; i++) {
            sustainedResults.push(await limiter.take());
            // Advance time by less than 100ms (faster than 10/second refill)
            vi.advanceTimersByTime(50);
        }

        expect(sustainedResults.some((r) => r === false)).toBe(true);

        // advance a lot of time
        vi.advanceTimersByTime(60_000);

        // placeholder assertion that available tokens never exceed capacity
        expect(limiter.availableTokens).toBeLessThanOrEqual(30);
    });
});
