/**
 * tests/infra/errorMapping.test.ts
 *
 * Tests for unified error mapping (T043)
 */
import { describe, it, expect, vi } from 'vitest'
import { mapHttpError, makeError } from 'src/infrastructure/errorMapping'
 
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

  it('Map 429 → rate-limited with retryAfter (from body numeric-string)', () => {
    const res = mapHttpError({ status: 429, body: { retryAfter: '10' } })
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
 
  it('Parses Retry-After HTTP-date and computes seconds relative to now', () => {
    // Freeze time to ensure deterministic computation.
    vi.useFakeTimers()
    try {
      // Set "now" to a fixed point
      const now = Date.parse('2025-01-01T00:00:00.000Z')
      vi.setSystemTime(new Date(now))

      const httpDate = 'Fri, 01 Jan 2100 00:00:20 GMT'
      const expected = Math.floor((Date.parse(httpDate) - Date.now()) / 1000)
      const res = mapHttpError({ status: 429, headers: { 'Retry-After': httpDate }, body: {} })
      expect(res).toMatchObject({ code: 'rate-limited' })
      // retryAfter should be numeric and equal to expected seconds (>= 0)
      expect(typeof (res as any).retryAfter).toBe('number')
      expect((res as any).retryAfter).toBe(expected)
      expect((res as any).meta?.retryAfter).toBe(expected)
    } finally {
      vi.useRealTimers()
    }
  })

  it('Header lookup is case-insensitive and trims header names', () => {
    const res = mapHttpError({ status: 429, headers: { '  retry-after  ': '120' }, body: {} })
    expect(res).toMatchObject({ code: 'rate-limited' })
    expect(typeof (res as any).retryAfter).toBe('number')
    expect((res as any).retryAfter).toBe(120)
    expect((res as any).meta?.retryAfter).toBe(120)
  })

  it('Caches header normalization to avoid redundant iteration', () => {
    let calls = 0
    const headers = {
      // forEach signature: (value, name) => void
      forEach(cb: any) {
        calls++
        cb('10', '  Retry-After  ')
      }
    }
    // First call should build and cache the normalized map (invoking forEach once)
    const res1 = mapHttpError({ status: 429, headers, body: {} })
    expect(res1).toMatchObject({ code: 'rate-limited' })
    // Second call should reuse the cached lookup and NOT call forEach again
    const res2 = mapHttpError({ status: 429, headers, body: {} })
    expect(res2).toMatchObject({ code: 'rate-limited' })
    expect(calls).toBe(1)
  })
 
  it('Extracts providerMessage from body containing many emoji and truncates by codepoints', () => {
    // Build a long emoji string (260 code points)
    const emoji = '😀' // single code point emoji (multibyte)
    const count = 260
    const long = emoji.repeat(count)
    const res = mapHttpError({ status: 500, body: { message: long } })
    expect(res).toMatchObject({ code: 'upstream-error' })
    // originalMessageLength should reflect codepoints count
    expect((res as any).originalMessageLength).toBe(count)
    // providerMessage should be truncated to at most 200 codepoints + ellipsis
    expect(typeof (res as any).providerMessage).toBe('string')
    const pm = (res as any).providerMessage as string
    // If truncated, should end with ellipsis character
    if (Array.from(pm).length < Array.from(long).length) {
      expect(pm.endsWith('…')).toBe(true)
    }
    // providerMessage when truncated must contain at most 200 codepoints (excluding ellipsis)
    const pmWithoutEllipsis = pm.endsWith('…') ? pm.slice(0, -1) : pm
    expect(Array.from(pmWithoutEllipsis).length).toBeLessThanOrEqual(200)
  })
 
  it('Finds first non-empty nested candidate in objects (nested object/array)', () => {
    const body = {
      top: { irrelevant: 1 },
      first: { message: '' }, // empty -> skip
      second: { error: 'nested error message' },
      arr: [{ error: 'array first' }, { error: 'array second' }]
    }
    const res = mapHttpError({ status: 500, body })
    expect(res).toMatchObject({ code: 'upstream-error' })
    // Expect the first non-empty nested match (second.error) to be chosen
    expect((res as any).providerMessage).toBe('nested error message')
  })
 
  it('Meta fields do not override canonical err.code or message on mapped errors', () => {
    const body = {
      code: 'intruder-code',
      message: 'this should not become the canonical message',
      providerMessage: 'provider says hi'
    }
    const res = mapHttpError({ status: 500, body })
    // canonical code/message must remain mapping-defined
    expect((res as any).code).toBe('upstream-error')
    expect((res as any).message).toBe('upstream server error')
    // incoming body fields should still be present inside meta.body (redacted for sensitive keys)
    expect((res as any).meta?.body?.code).toBe('intruder-code')
    // originalCode should NOT be promoted to top-level code
    expect((res as any).originalCode).toBeUndefined()
  })

  it('Redacts sensitive fields from meta.body and omits raw string bodies', () => {
    // Object body: sensitive keys removed, other keys preserved
    const resObj = mapHttpError({
      status: 500,
      body: {
        message: 'secret message',
        error: 'some error',
        error_description: 'desc',
        detail: 'detail',
        code: 'intruder-code',
        other: 'keep-me'
      }
    })
    expect(resObj).toMatchObject({ code: 'upstream-error' })
    expect((resObj as any).meta?.body?.message).toBeUndefined()
    expect((resObj as any).meta?.body?.error).toBeUndefined()
    expect((resObj as any).meta?.body?.error_description).toBeUndefined()
    expect((resObj as any).meta?.body?.detail).toBeUndefined()
    expect((resObj as any).meta?.body?.code).toBe('intruder-code')
    expect((resObj as any).meta?.body?.other).toBe('keep-me')

    // String body: avoid storing full raw provider messages in meta.body
    const resStr = mapHttpError({ status: 500, body: 'provider raw string message' })
    expect(resStr).toMatchObject({ code: 'upstream-error' })
    expect((resStr as any).meta?.body).toBeUndefined()

    // Array body: redact sensitive fields on object items; non-object items remain unchanged
    const resArr = mapHttpError({
      status: 500,
      body: [
        { message: 'm1', other: 'o1' },
        'plain-string-item',
        { error: 'e2', detail: 'd2', keep: 'v' }
      ]
    })
    expect((resArr as any).meta?.body).toBeInstanceOf(Array)
    expect((resArr as any).meta?.body[0]?.message).toBeUndefined()
    expect((resArr as any).meta?.body[0]?.other).toBe('o1')
    expect((resArr as any).meta?.body[1]).toBe('plain-string-item')
    expect((resArr as any).meta?.body[2]?.error).toBeUndefined()
    expect((resArr as any).meta?.body[2]?.detail).toBeUndefined()
    expect((resArr as any).meta?.body[2]?.keep).toBe('v')
  })

  it('makeError: meta cannot override canonical fields; whitelist promotion only', () => {
    const err = makeError('canonical-code', 'canonical message', {
      code: 'intruder',
      message: 'intruder message',
      retryAfter: 30,
      providerMessage: 'prov',
      extra: 'v'
    })
    expect((err as any).code).toBe('canonical-code')
    expect((err as any).message).toBe('canonical message')
    expect((err as any).originalCode).toBe('intruder')
    expect((err as any).retryAfter).toBe(30)
    expect((err as any).providerMessage).toBe('prov')
    // ensure reserved canonical fields are not duplicated/promoted into meta
    expect((err as any).meta?.code).toBeUndefined()
    expect((err as any).meta?.message).toBeUndefined()
    // non-whitelisted extras remain under meta
    expect((err as any).meta?.extra).toBe('v')
  })

  it('Extracts providerMessage when body is a plain string and truncates/redacts properly', () => {
    const long = 'a'.repeat(300)
    const res = mapHttpError({ status: 500, body: long })
    expect(res).toMatchObject({ code: 'upstream-error' })
    // originalMessageLength should reflect codepoint count (ASCII -> same as length)
    expect(typeof (res as any).originalMessageLength).toBe('number')
    expect((res as any).originalMessageLength).toBe(300)
    // providerMessage should be present and truncated (<= 200 + ellipsis)
    expect(typeof (res as any).providerMessage).toBe('string')
    expect((res as any).providerMessage.length).toBeLessThanOrEqual(201)
    // raw string bodies must NOT be stored in meta.body
    expect((res as any).meta?.body).toBeUndefined()
  })

  it('Extracts providerMessage from array body items (prefers first non-empty string or nested candidate)', () => {
    const body = [
      null,
      '',
      { message: '' },
      { other: 'nope' },
      { error: 'first nested array error' },
      'should not reach this'
    ]
    const res = mapHttpError({ status: 500, body })
    expect(res).toMatchObject({ code: 'upstream-error' })
    // Expect the first non-empty nested match (from array item object.error) to be chosen
    expect((res as any).providerMessage).toBe('first nested array error')

    // Also accept a plain-string-first scenario
    const body2 = ['plain-string-item', { error: 'arr error' }]
    const res2 = mapHttpError({ status: 500, body: body2 })
    expect(res2).toMatchObject({ code: 'upstream-error' })
    expect((res2 as any).providerMessage).toBe('plain-string-item')
  })
})