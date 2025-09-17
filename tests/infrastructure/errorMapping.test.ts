// tests/infra/errorMapping.test.ts
import { describe, it, expect } from 'vitest'
import { mapHttpError, makeError } from 'src/infrastructure/errorMapping'

describe('Phase 2 T023 — unified error mapping (RED tests)', () => {
  it('Map 401 → auth-failed', () => {
    const res = mapHttpError({ status: 401, body: {} })
    expect(res).toMatchObject({ code: 'auth-failed' })
  })

  it('Map 429 → rate-limited with retryAfter', () => {
    const res = mapHttpError({ status: 429, headers: { 'Retry-After': '120' }, body: {} })
    expect(res).toMatchObject({ code: 'rate-limited' })
    expect(typeof (res as any).retryAfter).toBe('number')
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
})