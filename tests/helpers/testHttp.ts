/**
 * tests/helpers/testHttp.ts
 *
 * Phase 1 skeleton for test utilities:
 * - Minimal types for mock HTTP requests/responses
 * - Token bucket state shape and helper creation function (skeleton)
 * - Exported stubs that throw "Not implemented" so callers know they are placeholders.
 *
 * NOTE: This is intentionally a placeholder. Implementations will be added in later phases.
 */

/** Minimal representation of an HTTP request for tests */
export type MockHttpRequest = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
};

/** Minimal representation of an HTTP response for tests */
export type MockHttpResponse = {
  status: number;
  headers?: Record<string, string>;
  body?: unknown;
  elapsedMs?: number;
};

/** Token bucket state (skeleton) */
export type TokenBucketState = {
  capacity: number;
  tokens: number;
  refillPerSecond: number;
  lastRefillTs: number; // epoch ms
};

/**
 * Create a token bucket state skeleton for tests.
 * This function is a placeholder and intentionally throws until implemented.
 */
export function createTokenBucketState(overrides?: Partial<TokenBucketState>): TokenBucketState {
  throw new Error("createTokenBucketState not implemented (test harness skeleton)");
}

/**
 * Mock a single HTTP request. Placeholder that must be implemented in infra tests.
 * Intentionally throws so tests importing this helper know it's a stub.
 */
export async function mockHttpRequest(req: MockHttpRequest): Promise<MockHttpResponse> {
  throw new Error("mockHttpRequest not implemented (test harness skeleton)");
}

/**
 * Install an HTTP mock harness (e.g., interceptors, fake timers).
 * Placeholder: no-op or throw to indicate unimplemented.
 */
export function installHttpMock(): void {
  throw new Error("installHttpMock not implemented (test harness skeleton)");
}

/**
 * Reset any installed HTTP mocks. Placeholder.
 */
export function resetHttpMock(): void {
  throw new Error("resetHttpMock not implemented (test harness skeleton)");
}

export {};