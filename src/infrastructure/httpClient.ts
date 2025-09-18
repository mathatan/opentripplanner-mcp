/**
 * Minimal, test-friendly HTTP client abstraction.
 *
 * - Exports a named HttpClient class
 * - Uses globalThis.fetch when present
 * - Supports mockResponse, simulateStatus, timeout, header injection, and correlationId propagation
 */
import { makeError, mapHttpError } from "./errorMapping.js";

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
    if (typeof headers.get === "function") {
        // Can't easily enumerable Headers-like; return empty to avoid exposing functions
        return {};
    }
    if (headers instanceof Map) {
        const out: Record<string, string> = {};
        for (const [k, v] of headers.entries()) out[k] = String(v);
        return out;
    }
    if (Array.isArray(headers)) {
        const out: Record<string, string> = {};
        for (const [k, v] of headers) out[k] = String(v);
        return out;
    }
    return { ...(headers as Record<string, string>) };
}

export class HttpClient {
    private timeoutMs?: number;
    private apiKey?: string;

    constructor(options?: { timeoutMs?: number; apiKey?: string }) {
        this.timeoutMs = options?.timeoutMs;
        this.apiKey = options?.apiKey ?? process.env.DIGITRANSIT_API_KEY;
    }

    request(url: string, opts?: HttpRequestOptions): Promise<any> {
        const outer = (async () => {
            // If simulateStatus indicates an error (>=400), map and throw immediately
            if (typeof opts?.simulateStatus === "number" && opts.simulateStatus >= 400) {
                const err = mapHttpError({
                    status: opts.simulateStatus,
                    headers: opts?.headers,
                    body: opts?.mockResponse,
                });
                (err as any).status = opts.simulateStatus;
                throw err;
            }

            // Short-circuit mockResponse (useful for tests)
            if (opts && Object.prototype.hasOwnProperty.call(opts, "mockResponse")) {
                const res: any = {
                    status: 200,
                    json: async () => opts.mockResponse,
                };
                if (opts.correlationId) res.correlationId = opts.correlationId;
                return res;
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
            // later rejects (e.g., due to AbortError). We attach a noop handler to swallow
            // that particular rejection; the caller still receives the mapped error via
            // the raced promise above.
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            fetchPromise.catch(() => {});

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
