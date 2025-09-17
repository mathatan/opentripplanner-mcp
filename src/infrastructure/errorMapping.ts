/**
 * Minimal, deterministic error mapping utilities.
 *
 * - Exports:
 *   - makeError(code, message, meta?)
 *   - mapHttpError(statusOrErrorOrObj)
 *
 * - Uses .js suffix in imports where needed.
 */

import type { ErrorSchema } from '../schema/error.js'

export type ErrorObject = {
  code: string
  message?: string
  [key: string]: any
}

/**
 * Create a simple plain error-object used across the codebase/tests.
 * Ensure that meta fields DO NOT override the primary `code` property.
 * If meta contains `code`, preserve it under `originalCode`.
 */
export function makeError(code: string, message: string, meta?: any): ErrorObject {
  const err: ErrorObject = { code, message }
  if (meta && typeof meta === 'object') {
    // Avoid overwriting the main `code` property from meta
    const { code: originalCode, ...rest } = meta as Record<string, any>
    if (originalCode !== undefined) {
      // keep original error code from upstream under a non-conflicting key
      (err as any).originalCode = originalCode
    }
    Object.assign(err, rest)
  } else if (meta !== undefined) {
    err.meta = meta
  }
  return err
}

type HttpLike = { status?: number; headers?: any; body?: any }

/**
 * mapHttpError accepts:
 * - a numeric status (e.g. 500)
 * - an object like { status, headers, body }
 * - or an Error-like object (e.g. { code: 'ETIMEDOUT' })
 */
export function mapHttpError(arg: number | HttpLike | any): ErrorObject {
  // Timeout / network error handling (error-like objects)
  if (arg && typeof arg === 'object' && (arg.code === 'ETIMEDOUT' || arg.code === 'ECONNABORTED')) {
    return makeError('upstream-timeout', 'timeout', { code: arg.code })
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

  // 429 -> rate-limited
  if (status === 429) {
    // try headers['Retry-After'] (case-insensitive) first
    let retryAfter: number | undefined
    if (headers) {
      // Headers-like objects might not be plain objects; attempt to read common shapes
      if (typeof headers.get === 'function') {
        const raw = headers.get('Retry-After') ?? headers.get('retry-after')
        if (raw != null) {
          const n = Number(raw)
          if (!Number.isNaN(n)) retryAfter = n
        }
      } else if (headers instanceof Map) {
        const raw = headers.get('Retry-After') ?? headers.get('retry-after')
        if (raw != null) {
          const n = Number(raw)
          if (!Number.isNaN(n)) retryAfter = n
        }
      } else {
        const keys = Object.keys(headers)
        for (const k of keys) {
          if (k.toLowerCase() === 'retry-after') {
            const v = headers[k]
            if (v != null) {
              const n = Number(v)
              if (!Number.isNaN(n)) retryAfter = n
            }
            break
          }
        }
      }
    }
    if (retryAfter == null && body && typeof body.retryAfter === 'number') {
      retryAfter = body.retryAfter
    }
    if (retryAfter != null) meta.retryAfter = retryAfter
    return makeError('rate-limited', 'rate limited', meta)
  }

  // 401 / 403 -> auth-failed
  if (status === 401 || status === 403) {
    return makeError('auth-failed', 'authentication failed', meta)
  }

  // 5xx -> upstream-error
  if (status !== undefined && status >= 500 && status < 600) {
    return makeError('upstream-error', 'upstream server error', meta)
  }

  // 400 -> validation-error
  if (status === 400) {
    return makeError('validation-error', 'validation failed', meta)
  }

  // fallback
  return makeError('upstream-error', 'upstream server error', meta)
}