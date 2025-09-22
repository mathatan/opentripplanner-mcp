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
    // Preserve upstream 'code' under originalCode so it cannot collide with canonical code
    const { code: originalCode, ...rest } = meta as Record<string, any>;
    if (originalCode !== undefined) {
      (err as any).originalCode = originalCode;
    }

    // Whitelist of convenience keys that may be promoted to top-level for compatibility.
    // All other incoming meta keys must remain under `err.meta`.
    const WHITELIST = ['retryAfter', 'originalMessageLength', 'providerMessage'];

    // Build a shallow copy of meta to store under .meta, but remove reserved canonical fields so
    // meta cannot be used to overwrite canonical properties.
    const RESERVED_CANONICAL = ['code', 'message', 'hint', 'correlationId'];
    const metaCopy: Record<string, any> = { ...meta };
    for (const k of RESERVED_CANONICAL) {
      if (Object.prototype.hasOwnProperty.call(metaCopy, k)) {
        delete (metaCopy as any)[k];
      }
    }

    // Promote only whitelisted keys to top-level.
    for (const key of WHITELIST) {
      if (Object.prototype.hasOwnProperty.call(rest, key)) {
        (err as any)[key] = (rest as any)[key];
      }
    }

    // Always keep the incoming meta (minus reserved fields and promoted keys) under `.meta`
    (err as any).meta = metaCopy;
  } else if (meta !== undefined) {
    (err as any).meta = meta as any
  }
  return err
}
 
type HttpLike = { status?: number; headers?: any; body?: any }
 
/**
 * Build a normalized header lookup map for a headers-like object.
 * Keys are trimmed and lower-cased. This helper centralizes the
 * normalization and avoids repeatedly iterating header objects.
 */
const headerLookupCache: WeakMap<object, Map<string, any>> = new WeakMap();

function buildHeaderLookup(headers: any): Map<string, any> {
  const m = new Map<string, any>();
  if (!headers) return m;

  // Fetch/Headers-like objects often implement forEach(name, value)
  if (typeof headers.forEach === 'function') {
    try {
      (headers as any).forEach((value: any, name: string) => {
        m.set(String(name).trim().toLowerCase(), value);
      });
      if (typeof headers === 'object' && headers) headerLookupCache.set(headers, m);
      return m;
    } catch {
      // fallthrough to other strategies if forEach behaves unexpectedly
    }
  }

  // Generic iterable entries() (e.g. Map, Headers)
  if (typeof headers.entries === 'function') {
    try {
      for (const [name, value] of (headers as any).entries()) {
        m.set(String(name).trim().toLowerCase(), value);
      }
      if (typeof headers === 'object' && headers) headerLookupCache.set(headers, m);
      return m;
    } catch {
      // fallthrough
    }
  }

  // Map instance
  if (headers instanceof Map) {
    for (const [name, value] of headers.entries()) {
      m.set(String(name).trim().toLowerCase(), value);
    }
    headerLookupCache.set(headers, m);
    return m;
  }

  // Plain object
  for (const name of Object.keys(headers)) {
    m.set(String(name).trim().toLowerCase(), (headers as any)[name]);
  }
  if (typeof headers === 'object' && headers) headerLookupCache.set(headers, m);
  return m;
}

/**
 * Robust, case-insensitive header lookup.
 * - Trims header names before comparing.
 * - Reuses a cached normalized map when possible to avoid repeated iteration.
 * - Trims string header values before returning to aid numeric parsing.
 */
function getHeaderCaseInsensitive(headers: any, key: string): any {
  if (!headers) return undefined;
  const normalizedKey = String(key).trim().toLowerCase();

  try {
    if (typeof headers === 'object' && headers && headerLookupCache.has(headers)) {
      const cached = headerLookupCache.get(headers);
      if (cached) {
        const v = cached.get(normalizedKey);
        return v == null ? undefined : (typeof v === 'string' ? v.trim() : v);
      }
    }
  } catch {
    // ignore caching errors and fall back to building a map
  }

  const map = buildHeaderLookup(headers);
  const v = map.get(normalizedKey);
  return v == null ? undefined : (typeof v === 'string' ? v.trim() : v);
}
 
 // Redaction helper: inspect meta.body (object or array) and omit sensitive fields.
 // Scope is intentionally narrow: only redact keys at the top-level of the body
 // object or top-level keys of objects inside an array. This preserves unrelated
 // keys and maintains backward-compatible meta shape.
 const SENSITIVE_BODY_KEYS = ['message', 'error', 'error_description', 'detail'] as const;
 function redactBody(body: any): any {
   // Avoid storing raw string bodies (full provider messages) in meta.
   if (typeof body === 'string') return undefined;
 
   if (body && typeof body === 'object') {
     if (Array.isArray(body)) {
       return body.map((item) => {
         if (item && typeof item === 'object' && !Array.isArray(item)) {
           const copy = { ...item };
           for (const k of SENSITIVE_BODY_KEYS) {
             if (Object.prototype.hasOwnProperty.call(copy, k)) {
               delete (copy as any)[k];
             }
           }
           return copy;
         }
         return item;
       });
     }
     // plain object
     const copy = { ...body };
     for (const k of SENSITIVE_BODY_KEYS) {
       if (Object.prototype.hasOwnProperty.call(copy, k)) {
         delete (copy as any)[k];
       }
     }
     return copy;
   }
   return body;
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
  if (body !== undefined) meta.body = redactBody(body)
 
  // Derive providerMessage candidate from body or arg.message.
  // Per INF-ERR-04:
  // - If body is a string, use it directly.
  // - If body is object/array, look for keys message, error, error_description, detail
  //   at top-level or nested one level deep (first non-empty wins).
  let providerMessageCandidate: string | undefined

  const CANDIDATE_KEYS = ['message', 'error', 'error_description', 'detail'] as const

  const extractFromObject = (obj: Record<string, any>): string | undefined => {
    for (const k of CANDIDATE_KEYS) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) {
        const v = obj[k]
        if (typeof v === 'string' && v.trim() !== '') return v
        if (v != null && typeof v !== 'object') return String(v)
      }
    }
    return undefined
  }

  if (body != null) {
    if (typeof body === 'string') {
      providerMessageCandidate = body
    } else if (Array.isArray(body)) {
      // Check array items top-level (and accept string items)
      for (const item of body) {
        if (item == null) continue
        if (typeof item === 'string' && item.trim() !== '') {
          providerMessageCandidate = item
          break
        }
        if (typeof item === 'object' && !Array.isArray(item)) {
          const found = extractFromObject(item)
          if (found) {
            providerMessageCandidate = found
            break
          }
        }
      }
    } else if (typeof body === 'object') {
      // Top-level keys
      providerMessageCandidate = extractFromObject(body) ?? undefined
      // If not found, inspect nested one level deep (objects only)
      if (!providerMessageCandidate) {
        for (const key of Object.keys(body)) {
          const nested = (body as any)[key]
          if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
            const found = extractFromObject(nested)
            if (found) {
              providerMessageCandidate = found
              break
            }
          }
        }
      }
    }
  }

  // Fallback to arg.message (e.g. error-like objects)
  if (!providerMessageCandidate && arg && typeof arg === 'object' && typeof arg.message === 'string') {
    providerMessageCandidate = arg.message
  }

  if (providerMessageCandidate && typeof providerMessageCandidate !== 'string') {
    providerMessageCandidate = String(providerMessageCandidate)
  }

  // Truncate provider message by codepoints and set originalMessageLength in codepoints.
  // - meta.originalMessageLength is the number of user-perceived characters (codepoints)
  // - Truncation is performed on codepoints (Array.from / spread) to avoid slicing surrogate pairs.
  let providerMessage: string | undefined
  if (typeof providerMessageCandidate === 'string' && providerMessageCandidate.length > 0) {
    const codepoints = Array.from(providerMessageCandidate)
    const originalLength = codepoints.length
    meta.originalMessageLength = originalLength

    const maxCodepoints = 200
    if (originalLength > maxCodepoints) {
      providerMessage = codepoints.slice(0, maxCodepoints).join('') + '…'
    } else {
      providerMessage = providerMessageCandidate
    }

    // Store truncated provider message also in meta for debugging/observability (redacted body is already in meta.body)
    meta.providerMessage = providerMessage
  }
 
  // Extract Retry-After per RFC7231:
  // - Accept delta-seconds (number or numeric string) or HTTP-date
  // - If HTTP-date, compute delay in seconds from now
  // - On parse failure, leave retryAfter undefined
  let retryAfter: number | undefined
  const rawRetry = getHeaderCaseInsensitive(headers, 'Retry-After')

  const parseRetryAfterValue = (raw: any): number | undefined => {
    if (raw == null) return undefined
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw

    const s = String(raw).trim()
    if (s === '') return undefined

    // delta-seconds (numeric string)
    if (/^\d+$/.test(s)) {
      const n = Number(s)
      if (!Number.isNaN(n)) return n
    }

    // HTTP-date -> compute seconds from now
    const parsed = Date.parse(s)
    if (!Number.isNaN(parsed)) {
      const diffMs = parsed - Date.now()
      const seconds = Math.floor(diffMs / 1000)
      return seconds > 0 ? seconds : 0
    }

    return undefined
  }

  if (rawRetry != null) {
    retryAfter = parseRetryAfterValue(rawRetry)
  }

  if (retryAfter == null && body && typeof body === 'object') {
    // Accept retry info in several body key forms and accept numeric strings too
    if (
      Object.prototype.hasOwnProperty.call(body, 'retryAfter') ||
      Object.prototype.hasOwnProperty.call(body, 'Retry-After') ||
      Object.prototype.hasOwnProperty.call(body, 'retry-after')
    ) {
      const candidate = (body as any).retryAfter ?? (body as any)['Retry-After'] ?? (body as any)['retry-after']
      retryAfter = parseRetryAfterValue(candidate)
    }
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