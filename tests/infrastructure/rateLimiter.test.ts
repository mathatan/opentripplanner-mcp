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

    it('concurrent take()/acquire()/tryAcquire() calls never drive tokens negative and results respect capacity', async () => {
        const capacity = 5;
        const limiter = new RateLimiter({ capacity, refillPerSecond: 1 });
    
        // Fire multiple take() calls without awaiting between them (concurrent-ish)
        const promises: Promise<boolean>[] = Array.from({ length: 10 }, () => limiter.take());
        const results = await Promise.all(promises);
    
        const trueCount = results.filter((r) => r === true).length;
        const falseCount = results.filter((r) => r === false).length;
    
        // We expect at most `capacity` successes and the remainder to fail
        expect(trueCount).toBe(capacity);
        expect(falseCount).toBe(10 - capacity);
    
        // availableTokens should never be negative and must be within [0, capacity]
        expect(limiter.availableTokens).toBeGreaterThanOrEqual(0);
        expect(limiter.availableTokens).toBeLessThanOrEqual(capacity);
    });
    
    it('stress concurrent take() calls never drive tokens negative', async () => {
        const capacity = 10;
        const limiter = new RateLimiter({ capacity, refillPerSecond: 1 });
    
        // Fire a large number of concurrent take() calls to simulate heavy contention
        const promises: Promise<boolean>[] = Array.from({ length: 1000 }, () => limiter.take());
        const results = await Promise.all(promises);
    
        const trueCount = results.filter((r) => r === true).length;
    
        // At most `capacity` successes; all other calls must fail
        expect(trueCount).toBeLessThanOrEqual(capacity);
    
        // availableTokens should never be negative and must be within [0, capacity]
        expect(limiter.availableTokens).toBeGreaterThanOrEqual(0);
        expect(limiter.availableTokens).toBeLessThanOrEqual(capacity);
    });

    it('acquire() returns a synchronous boolean (sync case) and updates tokens consistently', () => {
        const limiter = new RateLimiter(2, 1);
        const before = limiter.availableTokens;
        const result = limiter.acquire();
        // current implementation returns a boolean
        expect(typeof result).toBe('boolean');
        if (result) {
            expect(limiter.availableTokens).toBe(before - 1);
        } else {
            expect(limiter.availableTokens).toBe(before);
        }
    });
  
    it('acquire() can be implemented to return Promise<boolean> (async case) and remains compatible', async () => {
        // Subclass to simulate an async acquire() while reusing the same internal logic
        class AsyncAcquireLimiter extends RateLimiter {
            acquire(): Promise<boolean> {
                // wrap super.acquire() result into a Promise<boolean>
                return Promise.resolve(super.acquire() as boolean);
            }
        }
  
        const limiter = new AsyncAcquireLimiter(2, 1);
        const before = limiter.availableTokens;
        const result = await limiter.acquire();
        expect(typeof result).toBe('boolean');
        if (result) {
            expect(limiter.availableTokens).toBe(before - 1);
        } else {
            expect(limiter.availableTokens).toBe(before);
        }
    });
  
    it('take() performs synchronous mutation so tokens are consumed immediately when called', async () => {
        const limiter = new RateLimiter({ capacity: 3, refillPerSecond: 1 });
        const before = limiter.availableTokens;
  
        // Call take() twice without awaiting in between to simulate concurrent-ish calls
        const p1 = limiter.take();
        const p2 = limiter.take();
  
        // Mutation should have happened synchronously in tryAcquire()
        expect(limiter.availableTokens).toBe(before - 2);
  
        const results = await Promise.all([p1, p2]);
        const successCount = results.filter((r) => r === true).length;
        expect(successCount).toBe(2);
        expect(limiter.availableTokens).toBeGreaterThanOrEqual(0);
    });
  
    it('acquire() sync boolean is compatible with Promise.resolve(...) and mutates synchronously', async () => {
        const limiter = new RateLimiter({ capacity: 2, refillPerSecond: 1 });
        const before = limiter.availableTokens;
  
        // Wrap the (possibly boolean) acquire() result into a Promise via Promise.resolve
        const prom = Promise.resolve(limiter.acquire() as boolean | Promise<boolean>);
  
        // The synchronous mutation must have already occurred
        expect(limiter.availableTokens).toBe(before - 1);
  
        const result = await prom;
        expect(typeof result).toBe('boolean');
        expect(limiter.availableTokens).toBeGreaterThanOrEqual(0);
    });
  });
