/**
 * Minimal structured logger for tests.
 *
 * - createLogger(toolName?) named export and default export
 * - info(ctx, meta?) and error(ctx, err, meta?) write structured messages to console.log
 * - include correlationId if present in ctx
 * - methods must log plain objects (not JSON strings)
 *
 * Added:
 * - logToolInvocation(toolName, ctx?, meta?) compatibility helper (Clause C3/C5)
 *   - calls createLogger(toolName).info(ctx, meta)
 *   - ensures durationMs/success keys from meta are preserved on the logged object
 *   - resilient: never throws
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
 
/**
 * Compatibility helper: logToolInvocation
 *
 * Clause C3/C5: provide a small compatibility shim that logs tool invocation metadata
 * in the structured format used by createLogger. This function:
 *
 * - Accepts a toolName and optional ctx/meta and delegates to createLogger(toolName).info
 * - Ensures that, when the caller provides durationMs or success in meta, those keys
 *   are preserved as top-level fields on the logged object (even if falsy).
 * - Is resilient and will never throw.
 *
 * Purpose: make it easy for older code or tests to call a single helper to emit
 * invocation-level metrics (correlationId, durationMs, success, etc.) while
 * keeping the existing createLogger behavior intact.
 */
export function logToolInvocation(toolName: string, ctx?: any, meta?: any): void {
  try {
    const logger = createLogger(toolName)
    // Normalize meta into a plain object so createLogger logs a plain object.
    const metaObj = meta && typeof meta === 'object' ? { ...meta } : {}
    // Explicitly preserve durationMs and success keys if the caller provided them.
    // Use hasOwnProperty to preserve falsy values (0, false, null, undefined).
    if (meta && Object.prototype.hasOwnProperty.call(meta, 'durationMs')) {
      ;(metaObj as any).durationMs = (meta as any).durationMs
    }
    if (meta && Object.prototype.hasOwnProperty.call(meta, 'success')) {
      ;(metaObj as any).success = (meta as any).success
    }
    // Delegate to createLogger to keep format/behavior identical.
    logger.info(ctx, metaObj)
  } catch {
    // never throw
  }
}
 
export default createLogger