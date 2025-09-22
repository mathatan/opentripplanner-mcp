/**
 * Minimal structured logger for tests.
 *
 * - createLogger(toolName?) named export
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
 
// Minimal logger types
type LogContext = { correlationId?: string; requestId?: string; [k: string]: unknown }
type LogMeta = Record<string, unknown>
 
function buildBase(toolName: string, level: string, ctx?: LogContext) {
  const ts = Date.now()
  const correlationId = ctx?.correlationId ?? ctx?.requestId
  return { ts, level, tool: toolName, correlationId }
}

// Sanitize helper (INF-LOG-02):
// - Truncates top-level `providerMessage` strings to 200 code points and appends an ellipsis
//   when truncated. Returns a shallow-copied meta object so callers can safely pass the
//   returned object to the logger without mutating the original input.
function sanitizeMeta(meta: any) {
  if (!meta || typeof meta !== 'object') return meta
  const copy: any = { ...meta }
  const pm = copy.providerMessage
  if (typeof pm === 'string') {
    const maxUnits = 200
    const codepoints = Array.from(pm)
    let out = ''
    let units = 0
    for (const ch of codepoints) {
      const chUnits = ch.length
      if (units + chUnits > maxUnits) break
      out += ch
      units += chUnits
    }
    if (out.length < pm.length) {
      copy.providerMessage = out + '…'
    } else {
      copy.providerMessage = pm
    }
  }
  return copy
}
 
export type Logger = {
  log(ctx?: LogContext, meta?: LogMeta): void
  info(ctx?: LogContext, meta?: LogMeta): void
  warn(ctx?: LogContext, meta?: LogMeta): void
  error(ctx?: LogContext, err?: unknown, meta?: LogMeta): void
}
 
export function createLogger(toolName = 'app'): Logger {
  const isProd = process.env.NODE_ENV === 'production'
 
  function handleInternalError(e: unknown) {
    // In non-production surface internal logger errors to stderr so they're visible in tests/dev.
    if (!isProd) {
      try {
        // Keep output a plain object for consistency
        console.error({
          ts: Date.now(),
          level: 'error',
          tool: toolName,
          internalError:
            e instanceof Error ? { message: e.message, stack: e.stack } : String(e),
        })
      } catch {
        // swallow - we must never throw from the logger itself
      }
    }
    // In production suppress internal logger errors (silent)
  }
 
  return {
    log(ctx?: LogContext, meta?: LogMeta): void {
      try {
        const base = buildBase(toolName, 'info', ctx)
        const payload = meta && typeof meta === 'object' ? sanitizeMeta({ ...meta }) : {}
        const msg = { ...base, ...payload }
        // Must use console.log and pass a plain object
        console.log(msg)
      } catch (e) {
        handleInternalError(e)
      }
    },
  
    info(ctx?: LogContext, meta?: LogMeta): void {
      try {
        const base = buildBase(toolName, 'info', ctx)
        const payload = meta && typeof meta === 'object' ? sanitizeMeta({ ...meta }) : {}
        const msg = { ...base, ...payload }
        // Must use console.log and pass a plain object
        console.log(msg)
      } catch (e) {
        handleInternalError(e)
      }
    },
  
    warn(ctx?: LogContext, meta?: LogMeta): void {
      try {
        const base = buildBase(toolName, 'warn', ctx)
        const payload = meta && typeof meta === 'object' ? sanitizeMeta({ ...meta }) : {}
        const msg = { ...base, ...payload }
        // Use console.log to keep structured output consistent (tests spy on console.log)
        console.log(msg)
      } catch (e) {
        handleInternalError(e)
      }
    },
  
    error(ctx?: LogContext, err?: unknown, meta?: LogMeta): void {
      try {
        const base = buildBase(toolName, 'error', ctx)
        const eAny = err as any
        const errorCode = eAny?.code ?? eAny?.name ?? undefined
        const message = eAny?.message ?? (typeof err === 'string' ? err : undefined)
        const stack = eAny?.stack
        const payload = meta && typeof meta === 'object' ? sanitizeMeta({ ...meta }) : {}
        const msg = { ...base, errorCode, message, stack, ...payload }
        console.log(msg)
      } catch (e) {
        handleInternalError(e)
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
export function logToolInvocation(toolName: string, ctx?: LogContext, meta?: LogMeta): void {
  try {
    const logger = createLogger(toolName)
    // Normalize meta into a plain object so createLogger logs a plain object.
    // - If meta is already an object, shallow-copy it.
    // - If meta is a primitive (string/number/boolean), wrap it under the `meta` key
    //   so the value is preserved in structured logs (compatibility).
    // - If meta is undefined, use an empty object.
    let metaObj: any
    if (meta && typeof meta === 'object') {
      metaObj = { ...meta }
    } else if (meta !== undefined) {
      metaObj = { meta }
    } else {
      metaObj = {}
    }
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
 
export const logger = createLogger()