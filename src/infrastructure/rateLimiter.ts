/**
 * Token-bucket RateLimiter (see constitution Clause C5).
 *
 * Clause C5 compliance and notes:
 * - This implementation uses a token-bucket algorithm intended for short-lived
 *   client-side rate limiting. See project constitution Clause C5 for higher-level
 *   governance details related to throttling behavior.
 *
 * Defaults and constants:
 * - Default capacity: 30 tokens
 * - Default refill rate: 10 tokens/second
 *
 * Behavior (explicit):
 * - The primary async acquisition method is `take()` which is non-blocking
 *   and returns a Promise<boolean> immediately indicating success (token taken)
 *   or failure (no token available).
 * - For clarity and compatibility we expose `acquire()` as an alias to `take()`.
 * - A synchronous helper `tryAcquire()` is provided for callers that want a
 *   synchronous boolean check (it performs a refill and returns true/false).
 * - Numeric rounding: exposed token counts via `availableTokens` are explicitly
 *   floored to integers (Math.floor) so tests using fake timers get deterministic,
 *   integer semantics. Token accounting internally uses fractional tokens to
 *   allow smooth refill, but acquisition decisions are based on the floored
 *   integer token count to avoid unexpected behavior around fractional tokens.
 *
 * - Constructor accepts either numeric args or an options object:
 *     new RateLimiter(capacity?, refillPerSec?)
 *     or new RateLimiter({ capacity, refillPerSecond })
 *
 * - Uses Date.now() for deterministic control with fake timers in tests.
 */
export class RateLimiter {
  private capacity: number
  private refillPerSecond: number
  private available: number
  private lastRefillTs: number

  constructor(capacityOrOptions?: number | { capacity?: number; refillPerSecond?: number; refillPerSec?: number }, refillPerSec?: number) {
    let capacity: number
    let refillPerSecond: number

    if (typeof capacityOrOptions === 'object' && capacityOrOptions !== null) {
      capacity = capacityOrOptions.capacity ?? 30
      refillPerSecond = capacityOrOptions.refillPerSecond ?? capacityOrOptions.refillPerSec ?? 10
    } else {
      capacity = typeof capacityOrOptions === 'number' ? capacityOrOptions : 30
      refillPerSecond = typeof refillPerSec === 'number' ? refillPerSec : 10
    }

    this.capacity = capacity
    this.refillPerSecond = refillPerSecond
    this.available = capacity
    this.lastRefillTs = Date.now()
  }

  // Refill tokens based on elapsed time (keeps fractional tokens internally)
  private refill() {
    const now = Date.now()
    const elapsedMs = Math.max(0, now - this.lastRefillTs)
    if (elapsedMs <= 0) return
    const tokensToAdd = (elapsedMs * this.refillPerSecond) / 1000
    if (tokensToAdd > 0) {
      this.available = Math.min(this.capacity, this.available + tokensToAdd)
      this.lastRefillTs = now
    }
  }

  /**
   * take() attempts to consume one token.
   *
   * - Non-blocking: returns Promise<boolean> immediately.
   * - Acquisition decision is based on the floored available token count to
   *   provide deterministic, integer semantics for tests.
   *
   * Do not change the external Promise<boolean> semantics of this method as
   * tests and callers depend on it.
   */
  async take(): Promise<boolean> {
    this.refill()
    const availableInt = Math.floor(this.available)
    if (availableInt >= 1) {
      // subtract exactly one token (preserve fractional remainder)
      this.available = this.available - 1
      return true
    }
    return false
  }

  /**
   * acquire() is an explicit, public alias of `take()` for clarity/compatibility.
   * Preserves the same non-blocking Promise<boolean> behavior.
   */
  async acquire(): Promise<boolean> {
    return this.take()
  }

  /**
   * tryAcquire() is a synchronous helper that attempts to refill and take a token
   * without returning a Promise. Useful for callers that want immediate boolean
   * results and do not want to await.
   *
   * Note: this mirrors the same integer-based acquisition decision used by take().
   */
  tryAcquire(): boolean {
    this.refill()
    const availableInt = Math.floor(this.available)
    if (availableInt >= 1) {
      this.available = this.available - 1
      return true
    }
    return false
  }

  // Expose available tokens as a getter for tests (explicitly floored)
  get availableTokens(): number {
    this.refill()
    return Math.floor(this.available)
  }

  // backward-compat helper
  tokensRemaining(): number {
    return this.availableTokens
  }
}