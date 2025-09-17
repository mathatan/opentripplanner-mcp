import { describe, it, expect, vi } from 'vitest'
import { createLogger } from 'src/infrastructure/logging'

describe('logging interface T027', () => {
  it('emits required fields for info logs', () => {
    const logger = createLogger('my-tool')
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    // call
    logger.info({ correlationId: 'corr-1' }, { durationMs: 42, success: true })
    // capture
    const call = spy.mock.calls[0]
    const logged = call ? call[0] : undefined
    expect(logged).toBeDefined()
    expect(logged).toHaveProperty('ts')
    expect(logged).toHaveProperty('level')
    expect(logged).toHaveProperty('tool')
    expect(logged).toHaveProperty('correlationId')
    expect(logged).toHaveProperty('durationMs')
    expect(logged).toHaveProperty('success')
    spy.mockRestore()
  })

  it('propagates correlationId when supplied in context', () => {
    const logger = createLogger('my-tool')
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    logger.info({ correlationId: 'ctx-123' }, { durationMs: 1, success: true })
    const logged = spy.mock.calls[0] ? spy.mock.calls[0][0] : undefined
    expect(logged).toHaveProperty('correlationId', 'ctx-123')
    spy.mockRestore()
  })

  it('includes errorCode and stack/message for error logs', () => {
    const logger = createLogger('my-tool')
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const err = new Error('boom')
    ;(err as any).code = 'E_BOOM'
    logger.error({ correlationId: 'err-1' }, err, { retries: 2 })
    const logged = spy.mock.calls[0] ? spy.mock.calls[0][0] : undefined
    expect(logged).toHaveProperty('errorCode')
    expect(logged).toHaveProperty('stack')
    expect(logged).toHaveProperty('message')
    spy.mockRestore()
  })

  it('includes upstream metrics when provided', () => {
    const logger = createLogger('my-tool')
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    logger.info({ correlationId: 'u-1' }, { upstreamLatencyMs: [10, 20], rateLimitTokensRemaining: 5, durationMs: 100, success: true })
    const logged = spy.mock.calls[0] ? spy.mock.calls[0][0] : undefined
    expect(logged).toHaveProperty('upstreamLatencyMs')
    expect(logged).toHaveProperty('rateLimitTokensRemaining')
    spy.mockRestore()
  })
})