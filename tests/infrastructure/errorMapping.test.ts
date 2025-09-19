/**
 * tests/infra/errorMapping.test.ts
 *
 * Tests for unified error mapping (T043)
 */
import { describe, it, expect } from 'vitest'
import { mapHttpError } from 'src/infrastructure/errorMapping'
 
describe('T043 — unified error mapping', () => {
  it('Map 401 → auth-failed', () => {
    const res = mapHttpError({ status: 401, body: {} })
    expect(res).toMatchObject({ code: 'auth-failed' })
  })
 
  it('Map 429 → rate-limited with retryAfter (from headers)', () => {
    const res = mapHttpError({ status: 429, headers: { 'Retry-After': '120' }, body: {} })
    expect(res).toMatchObject({ code: 'rate-limited' })
    expect(typeof (res as any).retryAfter).toBe('number')
    expect((res as any).retryAfter).toBe(120)
    expect((res as any).meta?.retryAfter).toBe(120)
  })
 
  it('Map 429 → rate-limited with retryAfter (from body)', () => {
    const res = mapHttpError({ status: 429, body: { retryAfter: 10 } })
    expect(res).toMatchObject({ code: 'rate-limited' })
    expect((res as any).retryAfter).toBe(10)
    expect((res as any).meta?.retryAfter).toBe(10)
  })
 
  it('Map 5xx → upstream-error', () => {
    const res = mapHttpError({ status: 500, body: {} })
    expect(res).toMatchObject({ code: 'upstream-error' })
  })
 
  it('Timeout -> upstream-timeout', () => {
    const timeoutErr = new Error('timeout')
    ;(timeoutErr as any).code = 'ETIMEDOUT'
    const res = mapHttpError(timeoutErr)
    expect(res).toMatchObject({ code: 'upstream-timeout' })
  })
 
  it('Non-retry classification: status 400 -> validation-error', () => {
    const res = mapHttpError({ status: 400, body: {} })
    expect(res).toMatchObject({ code: 'validation-error' })
  })
 
  it('Truncates long provider message and exposes originalMessageLength', () => {
    const long = 'x'.repeat(500)
    const res = mapHttpError({ status: 500, body: { message: long } })
    expect(res).toMatchObject({ code: 'upstream-error' })
    expect(typeof (res as any).originalMessageLength).toBe('number')
    expect((res as any).originalMessageLength).toBe(500)
    expect(typeof (res as any).providerMessage).toBe('string')
    // truncated length <= 201 (200 chars + ellipsis)
    expect((res as any).providerMessage.length).toBeLessThanOrEqual(201)
    // ensure the canonical `message` field does not contain the full provider message
    expect((res as any).message).not.toContain('x'.repeat(250))
  })
})