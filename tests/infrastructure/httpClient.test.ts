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

  it('forwards Accept-Language header when passed as a Map', async () => {
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

    const headersMap = new Map<string, string>([['Accept-Language', acceptLanguage]]);
    await client.request('https://upstream.example/lang-map', {
      method: 'GET',
      headers: headersMap,
    }).catch(() => {});

    const value = getHeaderValue(capturedInit, 'Accept-Language');
    expect(value).toBe(acceptLanguage);
  });

  it('forwards headers from a Headers-like object exposing entries()', async () => {
    const headerVal = 'from-entries';
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

    // Minimal Headers-like object that exposes entries()
    const headersLike = {
      entries: function* () {
        yield ['X-From-Entries', headerVal];
      },
    } as any;

    await client.request('https://upstream.example/lang-entries', {
      method: 'GET',
      headers: headersLike,
    }).catch(() => {});

    const value = getHeaderValue(capturedInit, 'X-From-Entries');
    expect(value).toBe(headerVal);
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

  it('maps rejected rateLimiter.acquire() to upstream-error and preserves original error in meta', async () => {
    // Simulate rateLimiter.acquire() rejecting (async throw)
    const rl = { acquire: vi.fn().mockRejectedValue(new Error('boom')) };
    const client = new HttpClient({ rateLimiter: rl, retryOpts: { maxAttempts: 1 } });

    await expect(client.request('https://upstream.example/rl-reject')).rejects.toMatchObject({
      code: 'upstream-error',
      meta: { original: { message: 'boom' } },
    });
    expect(rl.acquire).toHaveBeenCalled();
  });

  it('accepts WHATWG Headers object and normalizes headers to plain object for fetch', async () => {
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
    // Use real WHATWG Headers to verify normalizeToPlainObject accepts it
    const headers = new Headers({ 'X-Test-A': '1', 'Content-Type': 'application/json' });
    await client.request('https://upstream.example/headers-whatwg', { method: 'POST', headers }).catch(() => {});

    // normalizeToPlainObject should produce a plain object that includes the requested headers.
    expect(capturedInit).toBeDefined();
    const h = capturedInit.headers ?? {};
    const valueA = h['X-Test-A'] ?? h['x-test-a'];
    const valueCt = h['Content-Type'] ?? h['content-type'];
    expect(valueA).toBe('1');
    expect(valueCt).toBe('application/json');
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
  
  it('forwards headers from a Headers-like object exposing forEach()', async () => {
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
  
    // Minimal Headers-like object that exposes forEach(value, key)
    const headersLike = {
      forEach: (cb: (value: string, key: string) => void) => {
        cb('foreach-value', 'X-From-ForEach');
      },
    } as any;
  
    await client.request('https://upstream.example/lang-foreach', {
      method: 'GET',
      headers: headersLike,
    }).catch(() => {});
  
    const value = getHeaderValue(capturedInit, 'X-From-ForEach');
    expect(value).toBe('foreach-value');
  });
});
it('logs debug info for swallowed fetch rejections in non-test env', async () => {
  const origEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
  // Mock fetch to return an immediately rejecting promise (background rejection)
  globalThis.fetch = vi.fn().mockImplementation(() => Promise.reject(new Error('bgboom')));
  const client = new HttpClient();
  // Trigger request and ignore rejection to allow background handler to run
  client.request('https://upstream.example/bg').catch(() => {});
  // allow microtask queue to flush
  await Promise.resolve();
  expect(spy).toHaveBeenCalled();
  const logged = spy.mock.calls[0] ? spy.mock.calls[0][0] : undefined;
  expect(logged).toBeDefined();
  expect(logged).toHaveProperty('tool', 'http-client');
  expect(logged).toHaveProperty('event', 'unhandled-fetch-rejection');
  spy.mockRestore();
  process.env.NODE_ENV = origEnv;
});

it('is silent for swallowed fetch rejections in test env', async () => {
  const origEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
  globalThis.fetch = vi.fn().mockImplementation(() => Promise.reject(new Error('bgboom')));
  const client = new HttpClient();
  client.request('https://upstream.example/bg-test').catch(() => {});
  await Promise.resolve();
  expect(spy).not.toHaveBeenCalled();
  spy.mockRestore();
  process.env.NODE_ENV = origEnv;
});