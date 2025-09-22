/**
* Deterministic retry policy with exponential backoff + deterministic multiplicative jitter.
*
* - Retryable when:
*   err?.code === 'rate-limited' || err?.retryable === true ||
*   numeric status >= 500 || status === 429
*
* - computeBackoff(attempt, opts) returns a backoff in ms (base * 2^(attempt-1)) capped by maxBackoff
*
* - deterministicJitterFactor maps a deterministic pseudo-random value into [jitterMin, jitterMax].
*
* JSDoc: Implements retry behaviour per spec (see C5).
*/

export type RetryOpts = {
 maxAttempts?: number
 baseMs?: number
 maxBackoffMs?: number
 jitterMin?: number
 jitterMax?: number
 randomFn?: (seed: number) => number
}

/**
* Sleep for the given milliseconds.
*/
function sleep(ms: number): Promise<void> {
 return new Promise((res) => setTimeout(res, ms))
}

/**
 * computeBackoff(attempt, opts?)
 *
 * - Accepts both `baseMs` (preferred) and legacy `base` as the base delay key.
 *   If both are provided, `baseMs` takes precedence.
 * - base defaults to 100ms
 * - maxBackoff defaults to 2000ms
 * - Uses base * 2^(attempt-1) and caps by maxBackoff
 *
 * Returns the exponential backoff (rounded) BEFORE jitter is applied.
 *
 * Note: incoming `attempt` is normalized to an integer >= 1 before use.
 */
export function computeBackoff(
  attempt: number,
  opts?: { base?: number; baseMs?: number; maxBackoff?: number; maxBackoffMs?: number }
): number {
  // Normalize attempt to integer >= 1 so callers may pass floats or other numeric-like values.
  const nAttempt = Math.max(1, Math.floor(attempt))
  // Accept both `baseMs` (preferred) and legacy `base` for compatibility.
  const base = opts?.baseMs ?? opts?.base ?? 100
  // Accept both `maxBackoff` and `maxBackoffMs` option keys for compatibility.
  const maxBackoff = opts?.maxBackoff ?? opts?.maxBackoffMs ?? 2000
  const exp = Math.max(0, nAttempt - 1)
  const raw = base * Math.pow(2, exp)
  return Math.round(Math.min(raw, maxBackoff))
}

/**
* deterministicJitterFactor(attempt, jitterMin = 0.5, jitterMax = 1.0, randomFn?)
*
* Produces a deterministic multiplicative jitter factor in [jitterMin, jitterMax].
*
* If randomFn is provided it will be used (randomFn(seed) => number in [0,1)).
* Otherwise a simple, deterministic 32-bit mixing formula is used:
*   r = ((attempt * 2654435761) >>> 0) / 2**32
*
* This deterministic behaviour is intentional so tests are stable. Tests may inject a custom randomFn.
*/
export function deterministicJitterFactor(
  attempt: number,
  jitterMin = 0.5,
  jitterMax = 1.0,
  randomFn?: (seed: number) => number
): number {
  // Normalize attempt to integer >= 1 before use so callers may supply non-integer values safely.
  const nAttempt = Math.max(1, Math.floor(attempt))

  // Normalize jitter bounds so callers may pass them in either order (min/max).
  const min = Math.min(jitterMin, jitterMax)
  const max = Math.max(jitterMin, jitterMax)

  // Fast-path: if jitter range is degenerate (no range), return the fixed value immediately
  // and skip any randomization or calls to randomFn.
  if (min === max) {
    return min
  }

  const r = (() => {
    if (typeof randomFn === 'function') {
      const v = randomFn(nAttempt)
      // Clamp / fallback policy for values returned by custom randomFn:
      // - For finite numbers: clamp into [Number.EPSILON, 1].
      //   This prevents returning 0 (which could lead to a zero backoff) while
      //   allowing 1.0 as an upper bound.
      // - For non-finite values (NaN, +Infinity, -Infinity): treat as nonsensical input.
      //   * If v > 1 (e.g. +Infinity) => fallback to 1
      //   * Otherwise (NaN, -Infinity, negative numbers) => fallback to Number.EPSILON
      // This documented fallback ensures deterministic, safe jitter factors for downstream backoff calculation.
      if (!Number.isFinite(v)) {
        return v > 1 ? 1 : Number.EPSILON
      }
      return Math.max(Number.EPSILON, Math.min(1, v))
    }
    // deterministic 32-bit mix using Knuth's multiplicative constant (use Math.imul for 32-bit deterministic multiply)
    const u32 = (Math.imul(nAttempt, 2654435761) >>> 0)
    return u32 / 2 ** 32
  })()

  return min + r * (max - min)
}

/**
 * retry(fn, opts)
 *
 * - Default maxAttempts = 5
 * - Default baseMs = 100
 * - Default maxBackoffMs = 2000
 * - jitterMin default 0.5, jitterMax default 1.0
 *
 * Behavior:
 * - Attempts up to maxAttempts
 * - Immediately rethrows non-retryable errors
 * - Sleeps between attempts using computeBackoff(attempt) * jitterFactor, capped to maxBackoffMs
 *
 * Error propagation contract:
 * - When all permitted attempts are exhausted (i.e. we've tried `maxAttempts` times
 *   and none succeeded), the most recent (last) encountered error is thrown.
 * - This explicitly documents the retry contract: callers receive the final failure
 *   reason (the last error), not an earlier one or a synthesized error.
 *
 * JSDoc: See spec clause C5 for retry semantics.
 */
export async function retry<T>(fn: () => Promise<T>, opts?: RetryOpts): Promise<T> {
 const maxAttempts = opts?.maxAttempts ?? 5
 const baseMs = opts?.baseMs ?? 100
 const maxBackoffMs = opts?.maxBackoffMs ?? 2000
 const jitterMin = opts?.jitterMin ?? 0.5
 const jitterMax = opts?.jitterMax ?? 1.0
 const randomFn = opts?.randomFn

 let lastErr: unknown

 for (let attempt = 1; attempt <= maxAttempts; attempt++) {
   try {
     return await fn()
   } catch (err: unknown) {
     lastErr = err
     const e = err as { status?: number; code?: string; retryable?: boolean }

     const status = typeof e?.status === 'number' ? e.status : undefined
     const isRetryable =
       e?.code === 'rate-limited' ||
       e?.retryable === true ||
       status === 429 ||
       (typeof status === 'number' && status >= 500)

     if (!isRetryable) {
       throw err
     }

     if (attempt >= maxAttempts) {
       break
     }

     const baseBackoff = computeBackoff(attempt, { base: baseMs, maxBackoff: maxBackoffMs })
     const jitterFactor = deterministicJitterFactor(attempt, jitterMin, jitterMax, randomFn)
     const sleepMs = Math.round(Math.min(baseBackoff * jitterFactor, maxBackoffMs))
     // intentional: sequential backoff sleeps between attempts; awaiting in-loop is required
     // eslint-disable-next-line no-await-in-loop
     await sleep(sleepMs)
   }
 }
 
 // exhausted — all permitted attempts were used.
 // When exhausted, re-throw the most recent (last) encountered error. This makes the
 // contract explicit: callers receive the final failure reason (the last error).
 throw lastErr
}