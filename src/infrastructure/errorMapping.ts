/**
 * Minimal, deterministic error mapping utilities.
 *
 * - Exports:
 *   - makeError(code, message, meta?)
 *   - mapHttpError(statusOrErrorOrObj)
 *
 * - Uses .js suffix in imports where needed.
 *
 * Spec / rationale:
 * - Implements T043 Unified error mapping (see spec clause C6).
 * - Truncates long provider messages (>200 chars) and exposes the original length
 *   under meta.originalMessageLength and top-level originalMessageLength.
 * - Exposes a truncated providerMessage (<=200 chars + ellipsis) at top-level
 *   as `providerMessage`. The primary `message` field remains a short canonical
 *   message and MUST NOT contain the full provider message.
 */
 
 
export type ErrorObject = {
  code: string
  message?: string
  // optional conveniences for tests/consumers
  retryAfter?: number
  originalMessageLength?: number
  providerMessage?: string
  meta?: Record<string, any>
  [key: string]: any
}
 
/**
 * Create a simple plain error-object used across the codebase/tests.
 * Ensure that meta fields DO NOT override the primary `code` property.
 * If meta contains `code`, preserve it under `originalCode`.
 */
export function makeError(code: string, message: string, meta?: Record<string, any>): ErrorObject {
  const err: ErrorObject = { code, message }
  if (meta && typeof meta === 'object') {
    // Avoid overwriting the main `code` property from meta
    const { code: originalCode, ...rest } = meta as Record<string, any>;
    if (originalCode !== undefined) {
      // keep original error code from upstream under a non-conflicting key
      (err as any).originalCode = originalCode;
    }
    // Copy remaining meta fields onto the top-level error object for convenience
    Object.assign(err, rest);
    // Also keep full meta under `.meta`
    (err as any).meta = { ...meta };
  } else if (meta !== undefined) {
    err.meta = meta as any
  }
  return err
}
 
type HttpLike = { status?: number; headers?: any; body?: any }
 
function getHeaderCaseInsensitive(headers: any, key: string): any {
  if (!headers) return undefined
  if (typeof headers.get === 'function') {
    return headers.get(key) ?? headers.get(key.toLowerCase())
  }
  if (headers instanceof Map) {
    return headers.get(key) ?? headers.get(key.toLowerCase())
  }
  // plain object
  const keys = Object.keys(headers)
  for (const k of keys) {
    if (k.toLowerCase() === key.toLowerCase()) return headers[k]
  }
  return undefined
}
 
/**
 * mapHttpError accepts:
 * - a numeric status (e.g. 500)
 * - an object like { status, headers, body }
 * - or an Error-like object (e.g. { code: 'ETIMEDOUT' })
 *
 * Behavior:
 * - Extracts provider messages from common fields on body
 * - Truncates provider messages >200 chars and exposes original length
 * - Extracts numeric retryAfter from headers (case-insensitive) or body
 * - Maps status / error codes to canonical kebab-case error codes
 */
export function mapHttpError(arg: number | HttpLike | any): ErrorObject {
  // Timeout / network error handling (error-like objects)
  if (arg && typeof arg === 'object' && (arg.code === 'ETIMEDOUT' || arg.code === 'ECONNABORTED')) {
    const meta = { code: arg.code };
    const err = makeError('upstream-timeout', 'timeout', meta);
    // expose top-level convenience properties
    (err as any).retryAfter = undefined;
    return err;
  }
 
  let status: number | undefined
  let headers: any = undefined
  let body: any = undefined
 
  if (typeof arg === 'number') {
    status = arg
  } else if (arg && typeof arg === 'object') {
    status = arg.status
    headers = arg.headers
    body = arg.body
  }
 
  const meta: Record<string, any> = {}
  if (status !== undefined) meta.status = status
  if (body !== undefined) meta.body = body
 
  // Derive providerMessage candidate from body or arg.message
  let providerMessageCandidate: string | undefined
  if (body && typeof body === 'object') {
    if (typeof body.message === 'string') providerMessageCandidate = body.message
    else if (typeof body.error === 'string') providerMessageCandidate = body.error
    else if (typeof body.error_description === 'string') providerMessageCandidate = body.error_description
    else if (typeof body.detail === 'string') providerMessageCandidate = body.detail
  }
  if (!providerMessageCandidate && arg && typeof arg === 'object' && typeof arg.message === 'string') {
    providerMessageCandidate = arg.message
  }
  if (providerMessageCandidate && typeof providerMessageCandidate !== 'string') {
    providerMessageCandidate = String(providerMessageCandidate)
  }
 
  // Truncate provider message > 200 chars
  let providerMessage: string | undefined
  if (typeof providerMessageCandidate === 'string') {
    const originalLength = providerMessageCandidate.length
    meta.originalMessageLength = originalLength
    if (originalLength > 200) {
      // keep truncated text + ellipsis character
      providerMessage = providerMessageCandidate.slice(0, 200) + '…'
    } else {
      providerMessage = providerMessageCandidate
    }
  }
 
  // Extract numeric retryAfter from headers (case-insensitive) or body
  let retryAfter: number | undefined
  const rawRetry = getHeaderCaseInsensitive(headers, 'Retry-After')
  if (rawRetry != null) {
    const n = Number(rawRetry)
    if (!Number.isNaN(n)) retryAfter = n
  }
  if (retryAfter == null && body && typeof body.retryAfter === 'number') {
    retryAfter = body.retryAfter
  }
  if (retryAfter != null) meta.retryAfter = retryAfter
 
  // 429 -> rate-limited
  if (status === 429) {
    const err = makeError('rate-limited', 'rate limited', meta);
    if (retryAfter != null) (err as any).retryAfter = retryAfter;
    if (meta.originalMessageLength != null) (err as any).originalMessageLength = meta.originalMessageLength;
    if (providerMessage) (err as any).providerMessage = providerMessage;
    return err;
  }
 
  // 401 / 403 -> auth-failed
  if (status === 401 || status === 403) {
    const err = makeError('auth-failed', 'authentication failed', meta);
    if (meta.originalMessageLength != null) (err as any).originalMessageLength = meta.originalMessageLength;
    if (providerMessage) (err as any).providerMessage = providerMessage;
    return err;
  }
 
  // 5xx -> upstream-error
  if (status !== undefined && status >= 500 && status < 600) {
    const err = makeError('upstream-error', 'upstream server error', meta);
    if (meta.originalMessageLength != null) (err as any).originalMessageLength = meta.originalMessageLength;
    if (providerMessage) (err as any).providerMessage = providerMessage;
    if (retryAfter != null) (err as any).retryAfter = retryAfter;
    return err;
  }
 
  // 400 -> validation-error
  if (status === 400) {
    const err = makeError('validation-error', 'validation failed', meta);
    if (meta.originalMessageLength != null) (err as any).originalMessageLength = meta.originalMessageLength;
    if (providerMessage) (err as any).providerMessage = providerMessage;
    return err;
  }
 
  // fallback
  const err = makeError('upstream-error', 'upstream server error', meta);
  if (meta.originalMessageLength != null) (err as any).originalMessageLength = meta.originalMessageLength;
  if (providerMessage) (err as any).providerMessage = providerMessage;
  if (retryAfter != null) (err as any).retryAfter = retryAfter;
  return err;
}