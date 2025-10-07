// Lightweight HTTP mock helper for tests.
//
// Purpose: provide a reusable boundary for stubbing the external httpGet call used by
// [`src/services/lookupService.ts`](../../src/services/lookupService.ts:69-71).
// Note: Sorting & distance logic are part of the service under test and not relevant
// to this helper — this file focuses purely on the boundary of the external call.
//
// Comments in lookupService reference status handling which this mock drives:
// see lines at [`src/services/lookupService.ts`](../../src/services/lookupService.ts:71)
import { vi } from "vitest";
import * as httpClient from '../../src/infrastructure/httpClient';

export type MockHttpResponse = { status: number; body?: any };

// Internal state
let _responses: MockHttpResponse[] | (() => MockHttpResponse | Promise<MockHttpResponse>) | null = null;
let _calls: { url: string }[] = [];
let _spy: ReturnType<typeof vi.spyOn> | null = null;

/**
 * setupHttpGetMock
 * - responses: either an array (shifted per call) or a function invoked per call. Function may return a value or a promise.
 * - records each call's url for later inspection via getHttpGetCalls()
 */
export function setupHttpGetMock(
  responses: MockHttpResponse[] | (() => MockHttpResponse | Promise<MockHttpResponse>)
) {
  _responses = responses;
  _calls = [];

  // Restore any existing spy to avoid duplicate spies stacking
  if (_spy && typeof _spy.mockRestore === 'function') {
    try { _spy.mockRestore(); } catch { /* ignore */ }
    _spy = null;
  }

  // Spy on the actual httpClient import used by the service
  _spy = vi.spyOn(httpClient as any, 'httpGet').mockImplementation(async (url: string, _headers?: Record<string, string>) => {
    // Track invocation for call-introspection in tests
    _calls.push({ url });

    if (Array.isArray(_responses)) {
      if (_responses.length === 0) {
        // Defensive error to catch unexpected extra calls
        throw new Error('httpMock: response queue exhausted');
      }
      // return next queued response (shift)
      const next = _responses.shift() as MockHttpResponse;
      return next;
    }

    if (typeof _responses === 'function') {
      // Support sync or async generator function
      const v = (_responses as () => MockHttpResponse | Promise<MockHttpResponse>)();
      return await Promise.resolve(v);
    }

    throw new Error('httpMock: invalid responses configured');
  });
}

/**
 * getHttpGetCalls
 * - returns shallow copy of recorded calls (url only)
 */
export function getHttpGetCalls() {
  return _calls.slice();
}

/**
 * restoreHttpGetMock
 * - convenience for afterEach blocks in tests
 * - intentionally calls vi.restoreAllMocks() to ensure a clean slate
 */
export function restoreHttpGetMock() {
  _responses = null;
  _calls = [];
  if (_spy && typeof _spy.mockRestore === 'function') {
    try { _spy.mockRestore(); } catch { /* ignore */ }
    _spy = null;
  }
  // Best-effort cleanup for any other mocks in test scope
  vi.restoreAllMocks();
}