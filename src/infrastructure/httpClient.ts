/**
 * Minimal, test-friendly HTTP client abstraction.
 *
 * - Exports a named HttpClient class
 * - Uses globalThis.fetch when present
 * - Supports mockResponse, simulateStatus, timeout, header injection, and correlationId propagation
 *
 * JSDoc: Rate limiter behavior:
 * - If a rateLimiter is provided it must implement { acquire(): boolean | Promise<boolean> }.
 * - acquire() is invoked on every network attempt (i.e. inside the retry wrapper).
 * - If acquire() returns/resolves to false a rate-limited error is thrown with code 'rate-limited' and status = 429.
 * - Note: mockResponse and simulateStatus short-circuit and intentionally bypass rate limiting / retry to keep tests deterministic.
 */
import { makeError, mapHttpError } from "./errorMapping.js";
import { retry, type RetryOpts } from "./retryPolicy.js";
import { createLogger } from "./logging.js";

export type HttpRequestOptions = {
  method?: string;
  headers?: Record<string, string> | Array<[string, string]> | { get?: (name: string) => string | null };
  body?: any;
  timeoutMs?: number;
  correlationId?: string;
  mockResponse?: any;
  simulateStatus?: number;
};

function getHeaderValueFromHeaders(headers: any, name: string): string | undefined {
  if (!headers) return undefined;
  if (typeof headers.get === "function") {
    return headers.get(name) ?? headers.get(name.toLowerCase()) ?? undefined;
  }
  if (headers instanceof Map) {
    return headers.get(name) ?? headers.get(name.toLowerCase()) ?? undefined;
  }
  if (Array.isArray(headers)) {
    const found = headers.find((p: [string, string]) => p[0].toLowerCase() === name.toLowerCase());
    return found ? found[1] : undefined;
  }
  // plain object
  return headers[name] ?? headers[name.toLowerCase()] ?? undefined;
}

function normalizeToPlainObject(headers?: any): Record<string, string> {
  if (!headers) return {};
  const out: Record<string, string> = {};

  // Prefer enumerating known iterable / enumerable header shapes.
  // 1) WHATWG Headers implements forEach((value, key) => ...)
  // 2) Some header-like objects provide entries() -> iterator of [k,v]
  // 3) Some custom implementations are iterable (Symbol.iterator) and yield [k,v]
  // 4) Map and Array<[k,v]> are handled below
  try {
    if (typeof headers.forEach === "function") {
      // WHATWG Headers: forEach((value, key) => ...)
      headers.forEach((value: any, key: any) => {
        out[String(key)] = String(value);
      });
      return out;
    }

    if (typeof headers.entries === "function") {
      for (const [k, v] of headers.entries()) {
        out[String(k)] = String(v);
      }
      return out;
    }

    // Support generic iterables that yield [k, v] pairs (e.g., custom iterables).
    if (typeof Symbol !== "undefined" && headers && typeof headers[Symbol.iterator] === "function") {
      for (const pair of headers as Iterable<any>) {
        if (!pair) continue;
        const [k, v] = pair;
        out[String(k)] = String(v);
      }
      return out;
    }
  } catch {
    // If enumeration throws for some reason, fall through to other checks / empty result.
  }

  if (headers instanceof Map) {
    for (const [k, v] of headers.entries()) out[String(k)] = String(v);
    return out;
  }

  if (Array.isArray(headers)) {
    for (const [k, v] of headers) out[String(k)] = String(v);
    return out;
  }

  // Plain object copy (shallow). Preserve original behavior for plain objects.
  return { ...(headers as Record<string, string>) };
}

export class HttpClient {
  private timeoutMs?: number;
  private apiKey?: string;
  private rateLimiter?: { acquire: () => boolean | Promise<boolean> };
  private retryOpts?: RetryOpts;

  constructor(options?: { timeoutMs?: number; apiKey?: string; rateLimiter?: { acquire: () => boolean | Promise<boolean> }; retryOpts?: RetryOpts }) {
    this.timeoutMs = options?.timeoutMs;
    this.apiKey = options?.apiKey ?? process.env.DIGITRANSIT_API_KEY;
    this.rateLimiter = options?.rateLimiter;
    this.retryOpts = options?.retryOpts;
  }

  request(url: string, opts?: HttpRequestOptions): Promise<any> {
    const outer = (async () => {
      // If simulateStatus indicates an error (>=400), map and throw immediately.
      // This intentionally short-circuits network, rate-limiter, and retry for deterministic tests.
      if (typeof opts?.simulateStatus === "number" && opts.simulateStatus >= 400) {
        const err = mapHttpError({
          status: opts.simulateStatus,
          headers: opts?.headers,
          body: opts?.mockResponse,
        });
        (err as any).status = opts.simulateStatus;
        throw err;
      }

      // Short-circuit mockResponse (useful for tests). This intentionally bypasses rate limiter and retry.
      if (opts && Object.prototype.hasOwnProperty.call(opts, "mockResponse")) {
        const res: any = {
          status: 200,
          json: async () => opts.mockResponse,
        };
        if (opts.correlationId) res.correlationId = opts.correlationId;
        return res;
      }

      // The core network interaction is encapsulated in attemptFn which is passed to retry().
      // This ensures acquire() is invoked on each attempt.
      const attemptFn = async () => {
        // Rate limiter check (invoked on each attempt)
        if (this.rateLimiter) {
          // First, invoke acquire() and map only unexpected rejections/throws to upstream-error.
          let ok: boolean | undefined = undefined;
          try {
            ok = await Promise.resolve(this.rateLimiter.acquire());
          } catch (err) {
            // Map unexpected rejection/throw from rateLimiter.acquire() into a
            // canonical upstream-error so retry logic receives a deterministic shape.
            throw makeError("upstream-error", String((err as any)?.message ?? err), { original: err });
          }
          // If acquire resolved to a falsy value, treat as rate-limited.
          if (!ok) {
            const err = makeError("rate-limited", "rate limited", { status: 429 });
            // ensure status field exists for retry classification
            (err as any).status = 429;
            throw err;
          }
        }

        // Build headers as plain object so test helpers can introspect easily
        const headersObj = normalizeToPlainObject((opts as any)?.headers);

        // Inject digitransit api key when present
        if (this.apiKey) {
          headersObj["digitransit-subscription-key"] = this.apiKey;
        }

        // Inject correlation id
        if (opts?.correlationId) {
          headersObj["x-correlation-id"] = opts.correlationId;
        }

        // Use AbortController for timeout when available
        const controller = typeof AbortController !== "undefined" ? new AbortController() : undefined;
        const signal = controller ? controller.signal : undefined;

        const fetchFn = typeof globalThis.fetch === "function" ? globalThis.fetch.bind(globalThis) : undefined;

        if (!fetchFn) {
          throw makeError("upstream-error", "fetch-not-available");
        }

        let fetchPromise: Promise<any>;
        try {
          fetchPromise = fetchFn(url, {
            method: opts?.method ?? "GET",
            headers: headersObj,
            body: opts?.body,
            signal,
          } as any);
        } catch (err) {
          // synchronous throw from fetch (rare) -> map and rethrow
          throw makeError("upstream-error", String((err as any)?.message ?? err), { original: err });
        }

        // Prevent unhandled rejections from the raw fetch promise in cases where the
        // timeout causes the raced promise to reject first and the underlying fetch
        // later rejects (e.g., due to AbortError). We attach a handler that behaves
        // differently depending on environment to avoid swallowing errors in production
        // while keeping tests deterministic.
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        fetchPromise.catch((err: any) => {
          // In tests we intentionally suppress logging to avoid noisy output and to
          // match existing test expectations (Vitest fake timers, etc.).
          if (process.env.NODE_ENV === "test") {
            return;
          }
          // In non-test environments we MUST NOT silently suppress errors. Log a
          // detailed debug message including stack when available so failures are
          // observable and debuggable (INF-HTTP-03).
          try {
            const logger = createLogger('http-client');
            const isErrorLike = err && typeof err === "object" && ("message" in err || "stack" in err);
            const details = isErrorLike
              ? { message: (err as Error).message ?? String(err), stack: (err as Error).stack }
              : { message: String(err) };
            // Use structured logger so logs are consistent with repository conventions.
            logger.info({ correlationId: (opts as any)?.correlationId }, { event: 'unhandled-fetch-rejection', ...details });
          } catch (logErr) {
            // If logging itself fails, attempt a minimal structured log and otherwise swallow.
            try {
              const logger = createLogger('http-client');
              logger.info({ correlationId: (opts as any)?.correlationId }, { event: 'unhandled-fetch-rejection-logging-failed', error: String(logErr) });
            } catch {
              // swallow - logging must never throw
            }
          }
        });

        // Timeout handling uses the instance timeout or per-request timeout
        const timeout = opts && typeof opts.timeoutMs === "number" ? opts.timeoutMs : this.timeoutMs;
        let timeoutHandle: any = undefined;

        const timeoutPromise = new Promise<never>((_, reject) => {
          if (!timeout) return;
          timeoutHandle = setTimeout(() => {
            try {
              controller?.abort();
            } catch {
              /* intentionally ignore abort errors */
            }
            reject(makeError("upstream-timeout", "timeout", { code: "ETIMEDOUT" }));
          }, timeout);
        });

        // Mark the timeout promise as handled to avoid Node's unhandled rejection
        // warnings in test environments where the caller may attach a rejection
        // handler only after timers are advanced (Vitest fake timers scenario).
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        (timeoutPromise as Promise<never> | undefined)?.catch(() => {});

        let resp: any;
        try {
          // Create the raced promise and attach a rejection handler immediately so that
          // if it rejects before callers attach their own handlers (common in fake-timer
          // tests), Node/Vitest won't treat it as an unhandled rejection. The handler
          // rethrows the error so the outer async function still rejects with the same
          // error for callers.
          const raced = timeout ? Promise.race([fetchPromise, timeoutPromise]) : fetchPromise;
          const racedWithHandler = raced.then(
            (v: any) => v,
            (err: any) => {
              throw err;
            },
          );
          resp = await racedWithHandler;
        } catch (err: any) {
          // Already a mapped error (object with code) -> rethrow
          if (err && typeof err === "object" && typeof err.code === "string") throw err;
          // Map timeout-like native errors
          if (err && (err.code === "ETIMEDOUT" || err.code === "ECONNABORTED")) {
            throw makeError("upstream-timeout", "timeout", { code: err.code });
          }
          // Fallback mapping
          throw makeError("upstream-error", String(err?.message ?? err), { original: err });
        } finally {
          if (timeoutHandle != null) clearTimeout(timeoutHandle);
        }

        // Extract correlation id from response headers if present
        let correlationId: string | undefined = undefined;
        try {
          correlationId = getHeaderValueFromHeaders(resp?.headers, "x-correlation-id");
        } catch {
          correlationId = undefined;
        }

        const out: any = {
          status: resp?.status ?? 200,
          json: async () => {
            if (typeof resp?.json === "function") return await resp.json();
            return {};
          },
        };
        if (correlationId) out.correlationId = correlationId;
        return out;
      };

      // Execute with retry semantics. acquire() is invoked inside attemptFn so it runs per attempt.
      return await retry(() => attemptFn(), this.retryOpts);
    })();

    // Attach noop catch to the outer promise to avoid Node's unhandled rejection
    // warnings in fake-timer tests where callers may attach handlers after timers
    // are advanced. This does not prevent callers from observing the rejection.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    outer.catch(() => {});
    return outer;
  }
}

// Convenience helper that delegates to HttpClient with default options
export async function httpRequest(url: string, opts?: HttpRequestOptions): Promise<any> {
  const client = new HttpClient();
  return client.request(url, opts);
}
