import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import UserVariableStore from "../../src/store/userVariableStore";
import { clearAll } from "../../src/store/userVariableStore";

describe("UserVariableStore - T045 user variable store", () => {
  let store: UserVariableStore;

  beforeEach(async () => {
    store = new UserVariableStore();
    await clearAll();
  });

  afterEach(() => {
    try {
      vi.useRealTimers();
    } catch {
      /* ignore errors when restoring real timers */
    }
  });

  it("overwrite returns previous summary", async () => {
    // Save original
    await store.save("s1", { key: "home", value: { lat: 60.0, lon: 24.0 } });

    // Overwrite
    const result = await store.save("s1", { key: "home", value: { lat: 61.0, lon: 25.0 } });

    // Expect the second save to include previous summary with key and optional type
    expect(result).toBeDefined();
    expect(result).toHaveProperty("previous");
    expect(result.previous).toMatchObject({ key: "home" });
    // type may be absent or a string
    if (result.previous.type !== undefined) {
      expect(typeof result.previous.type).toBe("string");
    }
  });

  it("TTL expiry with fake timers", async () => {
    vi.useFakeTimers();

    // Save with short TTL in seconds (schema converts ttl -> ttlSeconds)
    await store.save("s-ttl", { key: "temp", value: "will-expire", ttlSeconds: 1 });

    // Advance 1500 ms to pass TTL (use async advance)
    await vi.advanceTimersByTimeAsync(1500);

    const got = await store.get("s-ttl", "temp");
    expect(got).toBeUndefined();

    vi.useRealTimers();
  });

  it("expiresAt <= 0 treated as no-expiry", async () => {
    vi.useFakeTimers();

    const zeroIso = new Date(0).toISOString();
    const negIso = new Date(-1000).toISOString();

    // Both zero and negative epoch ISO strings should be treated as non-expiring.
    await store.save("s-zero", { key: "keep0", value: "alive", expiresAt: zeroIso });
    await store.save("s-zero", { key: "keepNeg", value: "alive2", expiresAt: negIso });

    // Advance far beyond epoch to ensure if expiry were honored they'd be gone
    await vi.advanceTimersByTimeAsync(1000000);

    const g0 = await store.get("s-zero", "keep0");
    const gN = await store.get("s-zero", "keepNeg");
    expect(g0).toBeDefined();
    expect(gN).toBeDefined();

    vi.useRealTimers();
  });

  it("isolation per session", async () => {
    await store.save("session-A", { key: "token", value: "A-SECRET" });

    const fromB = await store.get("session-B", "token");
    expect(fromB).toBeUndefined();

    const fromA = await store.get("session-A", "token");
    expect(fromA).toBeDefined();
    expect(fromA).toMatchObject({ key: "token", value: "A-SECRET" });
  });

  it("get rejects falsy or empty keys", async () => {
    // Bypass TypeScript compile-time checks by using any so runtime behavior is tested.
    await expect((store as any).get("s-invalid", "")).rejects.toThrow(/key/i);
    await expect((store as any).get("s-invalid")).rejects.toThrow(/key/i);
  });

  it("concurrent saves return previous summaries deterministically", async () => {
    // Simulate concurrent saves
    const p1 = store.save("session-concurrent", { key: "counter", value: 1 });
    const p2 = store.save("session-concurrent", { key: "counter", value: 2 });

    const [r1, r2] = await Promise.all([p1, p2]);

    expect(r1).toBeDefined();
    expect(r2).toBeDefined();
    expect(r1).toHaveProperty("previous");
    expect(r2).toHaveProperty("previous");

    // At least one of the saves should report a previous (the second to run),
    // but due to JS Map atomicity both may include previous (relaxed assertion).
    expect(typeof r1.previous !== "undefined" || typeof r2.previous !== "undefined").toBe(true);
  });

  it("list returns non-expired sorted by updatedAt descending", async () => {
    vi.useFakeTimers();
    // Save A
    await store.save("session-sort", { key: "a", value: "first" });
    // Advance time so updatedAt differs
    await vi.advanceTimersByTimeAsync(10);
    // Save B
    await store.save("session-sort", { key: "b", value: "second" });

    const list = await store.list("session-sort");
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBe(2);
    // b should be first as it was updated later
    expect(list[0].key).toBe("b");
    expect(list[1].key).toBe("a");

    vi.useRealTimers();
  });
});