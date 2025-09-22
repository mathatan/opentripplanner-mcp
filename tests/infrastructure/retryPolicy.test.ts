import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { retry, computeBackoff, deterministicJitterFactor } from '../../src/infrastructure/retryPolicy'

describe('retryPolicy (T041) - deterministic retry policy', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    // Ensure timers are restored between tests to avoid leaking fake timers
    try {
      vi.useRealTimers()
    } catch {
      // ignore if already real
    }
  })

  it('retries up to maxAttempts for retryable errors and calls fn exact count', async () => {
    vi.useFakeTimers()
    const fn = vi.fn(async () => {
      throw { status: 500, message: 'server error' }
    })

    const opts = {
      maxAttempts: 5,
      baseMs: 100,
      maxBackoffMs: 2000,
      jitterMin: 0.5,
      jitterMax: 1.0,
      // deterministic randomFn returning 0 forces jitterFactor === jitterMin (0.5)
      randomFn: (_seed: number) => 0
    }

    const promise = retry(fn, opts)
    // attach a noop rejection handler early so Node/Vitest does not report
    // a transient "PromiseRejectionHandledWarning" while timers advance.
    // The original promise remains the same and can still be asserted with `expect(...).rejects`.
    // See test guidance in T041: use deterministic timers and avoid unhandled rejections.
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    promise.catch(() => {})

    // compute expected total sleep between attempts 1..4 (no sleep after final attempt)
    const sleeps: number[] = []
    for (let attempt = 1; attempt < opts.maxAttempts; attempt++) {
      const b = computeBackoff(attempt, { base: opts.baseMs, maxBackoff: opts.maxBackoffMs })
      const jf = deterministicJitterFactor(attempt, opts.jitterMin, opts.jitterMax, opts.randomFn)
      sleeps.push(Math.round(Math.min(b * jf, opts.maxBackoffMs)))
    }
    const totalSleep = sleeps.reduce((s, v) => s + v, 0)

    // advance time enough for all retries to proceed
    await vi.advanceTimersByTimeAsync(totalSleep)

    await expect(promise).rejects.toMatchObject({ status: 500 })
    expect(fn).toHaveBeenCalledTimes(5)

    vi.useRealTimers()
  })

  it('non-retryable errors rethrow immediately', async () => {
    const fn = vi.fn(async () => {
      throw { status: 400, message: 'bad request' }
    })

    await expect(retry(fn)).rejects.toMatchObject({ status: 400 })
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('computeBackoff caps at maxBackoffMs', () => {
    const b1 = computeBackoff(1, { base: 100, maxBackoff: 2000 })
    const bN = computeBackoff(10, { base: 100, maxBackoff: 2000 })
    expect(b1).toBe(100)
    expect(bN).toBeLessThanOrEqual(2000)
  })

  it('jitterFactor deterministic and in range', () => {
    const j1 = deterministicJitterFactor(1, 0.5, 1.0)
    const j1b = deterministicJitterFactor(1, 0.5, 1.0)
    const j2 = deterministicJitterFactor(2, 0.5, 1.0)

    expect(j1).toBeGreaterThanOrEqual(0.5)
    expect(j1).toBeLessThanOrEqual(1.0)
    expect(j1).toBe(j1b)
    // different attempt may produce different jitter (likely)
    expect(j2).toBeGreaterThanOrEqual(0.5)
    expect(j2).toBeLessThanOrEqual(1.0)

    // custom randomFn injection
    const jCustom = deterministicJitterFactor(3, 0.5, 1.0, () => 0.5)
    expect(jCustom).toBeCloseTo(0.75, 8)
  })

  it('works when jitterMin > jitterMax by treating the range correctly', () => {
    // Should behave sensibly even if caller swaps min/max; result must be within [min,max]
    const jm = deterministicJitterFactor(1, 1.0, 0.5)
    const lo = Math.min(1.0, 0.5)
    const hi = Math.max(1.0, 0.5)
    expect(jm).toBeGreaterThanOrEqual(lo)
    expect(jm).toBeLessThanOrEqual(hi)
  })

  it('randomFn edge outputs (NaN, +Inf, -Inf, 1, 0) are clamped / fall back as documented', () => {
    const jmNaN = deterministicJitterFactor(1, 0.5, 1.0, () => NaN)
    const jmPosInf = deterministicJitterFactor(1, 0.5, 1.0, () => Infinity)
    const jmNegInf = deterministicJitterFactor(1, 0.5, 1.0, () => -Infinity)
    const jmOne = deterministicJitterFactor(1, 0.5, 1.0, () => 1)
    const jmZero = deterministicJitterFactor(1, 0.5, 1.0, () => 0)

    // Finite 1 should map to the upper bound exactly
    expect(jmOne).toBeCloseTo(1.0, 12)
    // +Infinity (non-finite > 1) should fallback to 1
    expect(jmPosInf).toBeCloseTo(1.0, 12)

    // NaN, -Infinity and 0 should fallback / clamp to a value slightly above jitterMin
    ;[jmNaN, jmNegInf, jmZero].forEach((v) => {
      expect(v).toBeGreaterThan(0.5)
      expect(v).toBeLessThanOrEqual(1.0)
    })
  })

  it('computeBackoff normalizes non-integer attempt values', () => {
    // attempt 2.4 should be treated as 2 -> base * 2^(2-1) = 100 * 2 = 200
    expect(computeBackoff(2.4, { baseMs: 100, maxBackoff: 2000 })).toBe(200)
  })

  it('computeBackoff clamps very large attempt to provided maxBackoff', () => {
    const maxBackoff = 12345
    expect(computeBackoff(1000, { baseMs: 100, maxBackoff })).toBe(maxBackoff)
  })
  
  it('deterministicJitterFactor fast-path when jitterMin === jitterMax (randomFn must not be invoked)', () => {
    let called = false
    const badRandom = () => {
      called = true
      return 0.123
    }
    const fixed = deterministicJitterFactor(5, 0.7, 0.7, badRandom)
    expect(fixed).toBe(0.7)
    expect(called).toBe(false)
  })
})