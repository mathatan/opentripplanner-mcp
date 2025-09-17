/**
 * Minimal structured logger for tests.
 *
 * - createLogger(toolName?) named export and default export
 * - info(ctx, meta?) and error(ctx, err, meta?) write structured messages to console.log
 * - include correlationId if present in ctx
 * - methods must log plain objects (not JSON strings)
 */

function buildBase(toolName: string, level: string, ctx?: any) {
  const ts = Date.now()
  const correlationId = ctx?.correlationId ?? ctx?.requestId
  return { ts, level, tool: toolName, correlationId }
}

export function createLogger(toolName = 'app') {
  return {
    info(ctx?: any, meta?: any): void {
      try {
        const base = buildBase(toolName, 'info', ctx)
        const payload = meta && typeof meta === 'object' ? { ...meta } : {}
        const msg = { ...base, ...payload }
        // Must use console.log and pass a plain object
        console.log(msg)
      } catch {
        // never throw
      }
    },

    error(ctx?: any, err?: any, meta?: any): void {
      try {
        const base = buildBase(toolName, 'error', ctx)
        const errorCode = err?.code ?? err?.name ?? undefined
        const message = err?.message ?? (typeof err === 'string' ? err : undefined)
        const stack = err?.stack
        const payload = meta && typeof meta === 'object' ? { ...meta } : {}
        const msg = { ...base, errorCode, message, stack, ...payload }
        console.log(msg)
      } catch {
        // never throw
      }
    },
  }
}

export default createLogger