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
* - base defaults to 100ms
* - maxBackoff defaults to 2000ms
* - Uses base * 2^(attempt-1) and caps by maxBackoff
*
* Returns the exponential backoff (rounded) BEFORE jitter is applied.
*/
export function computeBackoff(attempt: number, opts?: { base?: number; maxBackoff?: number }): number {
 const base = opts?.base ?? 100
 const maxBackoff = opts?.maxBackoff ?? 2000
 const pow = Math.max(0, attempt - 1)
 const raw = base * Math.pow(2, pow)
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
 const r = (() => {
   if (typeof randomFn === 'function') {
     const v = randomFn(attempt)
     // clamp to [0,1)
     if (!Number.isFinite(v)) return 0
     return Math.max(0, Math.min(0.999999999999, v))
   }
   // deterministic 32-bit mix using Knuth's multiplicative constant
   const u32 = ((attempt * 2654435761) >>> 0) >>> 0
   return u32 / 2 ** 32
 })()

 return jitterMin + r * (jitterMax - jitterMin)
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
* - Throws the last encountered error if exhausted
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
     // await between retries
     // eslint-disable-next-line no-await-in-loop
     await sleep(sleepMs)
   }
 }

 // exhausted
 throw lastErr
}