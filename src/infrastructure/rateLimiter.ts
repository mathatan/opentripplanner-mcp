/**
 * Simple token-bucket rate limiter suitable for deterministic tests.
 *
 * - constructor accepts either numeric args or an options object:
 *   new RateLimiter(capacity?, refillPerSec?) or new RateLimiter({ capacity, refillPerSecond })
 * - take() returns Promise<boolean> immediately (non-waiting)
 * - availableTokens getter exposes current token count
 * - tokensRemaining() kept for backward compatibility
 *
 * Uses Date.now() for deterministic control with fake timers.
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

  // Refill tokens based on elapsed time
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

  // take removes one token if available and returns true, otherwise false
  async take(): Promise<boolean> {
    this.refill()
    if (this.available >= 1) {
      this.available = this.available - 1
      return true
    }
    return false
  }

  // Expose available tokens as a getter for tests
  get availableTokens(): number {
    this.refill()
    return Math.floor(this.available)
  }

  // backward-compat helper
  tokensRemaining(): number {
    return this.availableTokens
  }
}