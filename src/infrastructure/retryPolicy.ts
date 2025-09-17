/**
 * Deterministic retry policy with exponential backoff + simple deterministic jitter.
 *
 * - retry(fn, opts) retries when errors are considered retryable:
 *   err?.code === 'rate-limited' || err?.retryable === true ||
 *   numeric status >= 500 || status === 429
 *
 * - computeBackoff(attempt, opts) returns a backoff in ms (base * 2^(attempt-1)) capped by maxBackoff
 *
 * Jitter is deterministic (based on attempt) to keep tests stable.
 */

export type RetryOpts = {
  maxAttempts?: number
  baseMs?: number
  maxBackoffMs?: number
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms))
}

export function computeBackoff(attempt: number, opts?: { base?: number; maxBackoff?: number }): number {
  const base = opts?.base ?? 100
  const maxBackoff = opts?.maxBackoff ?? 10_000
  const pow = Math.max(0, attempt - 1)
  const backoff = Math.min(base * Math.pow(2, pow), maxBackoff)
  return Math.round(backoff)
}

/**
 * Deterministic jitter generator so tests don't get flaky.
 * Produces a small millisecond offset based on attempt number.
 */
function deterministicJitter(attempt: number, maxJitter = 100) {
  // simple deterministic sequence derived from attempt
  return (attempt * 37) % maxJitter
}

export async function retry<T>(fn: () => Promise<T>, opts?: RetryOpts): Promise<T> {
  const maxAttempts = opts?.maxAttempts ?? 3
  const baseMs = opts?.baseMs ?? 100

  let lastErr: any

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err: any) {
      lastErr = err
      // Determine retryability
      const status = typeof err?.status === 'number' ? err.status : undefined
      const isRetryable =
        err?.code === 'rate-limited' ||
        err?.retryable === true ||
        status === 429 ||
        (typeof status === 'number' && status >= 500)

      if (!isRetryable) {
        throw err
      }

      if (attempt >= maxAttempts) {
        break
      }

      const backoff = computeBackoff(attempt, { base: baseMs, maxBackoff: opts?.maxBackoffMs })
      const jitter = deterministicJitter(attempt)
      await sleep(backoff + jitter)
    }
  }

  throw lastErr
}