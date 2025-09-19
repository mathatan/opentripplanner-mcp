import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpClient } from '../../src/infrastructure/httpClient';

function getHeaderValue(init: any, name: string): string | undefined {
  const h = init?.headers;
  if (!h) return undefined;
  if (typeof h.get === 'function') return h.get(name);
  if (Array.isArray(h)) {
    const found = h.find((pair: [string, string]) => pair[0].toLowerCase() === name.toLowerCase());
    return found ? found[1] : undefined;
  }
  // plain object
  return h[name] ?? h[name.toLowerCase()];
}

describe('HttpClient (T022 minimal RED tests)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    // Restore timers in case a test used fake timers
    try {
      vi.useRealTimers();
    } catch {
      /* ignore */
    }
  });

  it('timeout behavior: rejects with code "upstream-timeout" when upstream takes longer than configured timeout', async () => {
    vi.useFakeTimers();

    // Mock fetch to return a promise that never resolves
    const never = new Promise((_resolve, _reject) => {
      // never resolve or reject
    });
    globalThis.fetch = vi.fn().mockReturnValue(never);

    const client = new HttpClient({ timeoutMs: 1000 });

    const p = client.request('https://upstream.example/test');

    // advance timers enough to trigger timeout
    // Use advanceTimersByTimeAsync to properly flush microtasks where supported
    await vi.advanceTimersByTimeAsync(2000);

    await expect(p).rejects.toMatchObject({ code: 'upstream-timeout' });
  });

  it('injects digitransit subscription key from environment/config into outgoing request headers', async () => {
    process.env.DIGITRANSIT_API_KEY = 'test-secret-key';

    let capturedInit: any = undefined;
    // Mock fetch to capture init and respond
    globalThis.fetch = vi.fn().mockImplementation(async (_url: string, init?: any) => {
      capturedInit = init;
      return {
        ok: true,
        status: 200,
        json: async () => ({ hello: 'world' }),
        headers: new Map(),
      } as any;
    });

    const client = new HttpClient();

    // call and ignore result (implementation is expected to fail until implemented)
    // The test asserts header presence in the outgoing request captured by mock
    await client.request('https://upstream.example/headers', { method: 'GET' }).catch(() => {});

    const val = getHeaderValue(capturedInit, 'digitransit-subscription-key');
    expect(val).toBe('test-secret-key');
  });

  it('propagates correlationId: includes x-correlation-id header and returns it in response object', async () => {
    const correlationId = 'corr-12345';
    let capturedInit: any = undefined;

    // Mock fetch to capture init and return a response that includes the correlation id header
    globalThis.fetch = vi.fn().mockImplementation(async (_url: string, init?: any) => {
      capturedInit = init;
      return {
        ok: true,
        status: 200,
        json: async () => ({ done: true }),
        // Simulate headers with get()
        headers: {
          get: (name: string) => {
            if (name.toLowerCase() === 'x-correlation-id') return correlationId;
            return null;
          },
        },
      } as any;
    });

    const client = new HttpClient();

    const res = await client.request('https://upstream.example/corr', { method: 'GET', correlationId }).catch((e) => {
      // Implementation is stubbed to reject; swallow to allow assertions on capturedInit when possible
      return e;
    });

    const headerVal = getHeaderValue(capturedInit, 'x-correlation-id');
    expect(headerVal).toBe(correlationId);

    // Response object is expected to include correlationId property when implemented
    // Placeholder assertion: this will fail until HttpClient returns proper response
    expect(res?.correlationId).toBe(correlationId);
  });

  it('forwards Accept-Language header from caller to upstream', async () => {
    const acceptLanguage = 'fi-FI,fi;q=0.9,en;q=0.8';
    let capturedInit: any = undefined;

    globalThis.fetch = vi.fn().mockImplementation(async (_url: string, init?: any) => {
      capturedInit = init;
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
        headers: new Map(),
      } as any;
    });

    const client = new HttpClient();

    await client.request('https://upstream.example/lang', {
      method: 'GET',
      headers: { 'Accept-Language': acceptLanguage },
    }).catch(() => {});

    const value = getHeaderValue(capturedInit, 'Accept-Language');
    expect(value).toBe(acceptLanguage);
  });

  it('throws rate-limited when rateLimiter.acquire() returns false', async () => {
    const rl = { acquire: vi.fn().mockReturnValue(false) };
    const client = new HttpClient({ rateLimiter: rl, retryOpts: { maxAttempts: 1 } });

    await expect(client.request('https://upstream.example/blocked')).rejects.toMatchObject({ code: 'rate-limited', status: 429 });
    expect(rl.acquire).toHaveBeenCalled();
  });

  it('mockResponse bypasses rate limiter (short-circuit behavior)', async () => {
    // mockResponse is intentionally a short-circuit path and should not invoke rateLimiter.acquire()
    const rl = { acquire: vi.fn().mockReturnValue(false) };
    const client = new HttpClient({ rateLimiter: rl });

    const res = await client.request('https://upstream.example/mock', { mockResponse: { ok: true } });
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(rl.acquire).not.toHaveBeenCalled();
  });

  it('invokes rateLimiter.acquire() on each retry attempt', async () => {
    vi.useFakeTimers();

    // rate limiter that returns true for each attempt
    const rl = { acquire: vi.fn().mockResolvedValue(true) };

    // Mock fetch to fail twice with a retryable error (has code string so HttpClient propagation keeps it)
    const errObj = { code: 'upstream', status: 500, message: 'server' };
    const successResp = {
      ok: true,
      status: 200,
      json: async () => ({ done: true }),
      headers: new Map(),
    } as any;

    globalThis.fetch = vi.fn()
      .mockImplementationOnce(() => Promise.reject(errObj))
      .mockImplementationOnce(() => Promise.reject(errObj))
      .mockImplementationOnce(() => Promise.resolve(successResp));

    // deterministic retry options: small backoffs and no jitter variability
    const client = new HttpClient({
      rateLimiter: rl,
      retryOpts: {
        maxAttempts: 3,
        baseMs: 1,
        jitterMin: 1,
        jitterMax: 1,
        randomFn: () => 0,
      },
    });

    const p = client.request('https://upstream.example/retry');

    // Advance timers enough to cover the small sleeps between retries (1ms + 2ms = 3ms)
    await vi.advanceTimersByTimeAsync(10);

    const res = await p;
    expect(res.status).toBe(200);
    expect(rl.acquire).toHaveBeenCalledTimes(3);
  });
});