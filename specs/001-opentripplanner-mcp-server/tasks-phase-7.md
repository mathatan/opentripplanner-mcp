# Phase 7: Integration & Performance (GREEN New Tests)

Status: NOT STARTED

## Goals

Integrate all implemented services & tools through end-to-end (E2E) tests, add stress & performance baselines, and validate infrastructure behaviors (rate limiter, retry, cache) under realistic orchestration. Establish quantitative latency metrics (p50/p95) using mocked upstream timing, and ensure unified error & correlation propagation across the MCP stdio boundary.

## Task List

| ID   | Status   | Task | Acceptance Criteria | Spec / Doc Trace |
|------|----------|------|---------------------|------------------|
| T065 | [ ]      | Flesh out e2e plan_trip test (File: `tests/e2e/plan_trip.e2e.test.ts`) — Add itinerary shape assertions, multi‑leg, error path. | See "Per-Task Specific Success Conditions" for T065. | This document: Per-Task Specific Success Conditions; E2E Harness Requirements. |
| T066 | [ ] [P]  | Flesh out e2e geocode_address test (File: `tests/e2e/geocodeAddress.e2e.test.ts`) — Forward + size truncation + error case. | See "Per-Task Specific Success Conditions" for T066. | This document: Per-Task Specific Success Conditions; E2E Harness Requirements. |
| T067 | [ ] [P]  | Flesh out e2e user variables roundtrip test (File: `tests/e2e/userVariables.e2e.test.ts`) — save → get list ordering & updatedAt monotonicity. | See "Per-Task Specific Success Conditions" for T067. | This document: Per-Task Specific Success Conditions. |
| T068 | [ ] [P]  | Add e2e find_stops test (File: `tests/e2e/find_stops.e2e.test.ts`) — New file; search radius + limit + no-results. | See "Per-Task Specific Success Conditions" for T068. | This document: Per-Task Specific Success Conditions. |
| T069 | [ ] [P]  | Add e2e get_departures test (File: `tests/e2e/get_departures.e2e.test.ts`) — Realtime vs scheduled mapping, delay threshold. | See "Per-Task Specific Success Conditions" for T069. | This document: Per-Task Specific Success Conditions. |
| T070 | [ ]      | Rate limit stress test integration (File: `tests/integration/rateLimit.stress.test.ts`) — Parallel invocations assert token bucket depletion & refill. | See "Per-Task Specific Success Conditions" for T070. | This document: Stress Test Strategy (Rate Limiter). |
| T071 | [ ] [P]  | Error path integration test (401/429/timeout mocks) (File: `tests/integration/errorPaths.test.ts`) — Validate mapped error codes + retry attempts count. | See "Per-Task Specific Success Conditions" for T071. | This document: Retry Behavior Integration. |
| T072 | [ ] [P]  | Performance baseline test (p50/p95 timings) (File: `tests/perf/performance.test.ts`) — Mock upstream latency distribution; assert under thresholds. | See "Per-Task Specific Success Conditions" for T072. | This document: Performance Metrics (Mocked). |
| T073 | [ ] [P]  | Cache hit/miss integration test (File: `tests/integration/cacheBehavior.test.ts`) — Warm vs cold timings & collapsed requests (≤500ms). | See "Per-Task Specific Success Conditions" for T073. | This document: Cache Behavior Expectations. |
| T074 | [ ] [P]  | Add e2e reverse_geocode test (File: `tests/e2e/reverseGeocode.e2e.test.ts`) — Best-match result + candidates, language fallback, invalid coordinate error. | See "Per-Task Specific Success Conditions" for T074. | Spec: Core MCP Tools (reverse_geocode); This document: Per-Task Specific Success Conditions. |

Legend: [ ] Pending | [P] Parallel-safe

## E2E Harness Requirements

- Must spawn compiled server (`build/index.js`) after `pnpm build` (avoid stale code) — follow existing pattern in `tests/index.e2e.test.ts`.
- Handshake: send initialize + list_tools; assert presence of all tools.
- Each tool call: wrap JSON-RPC/MCP frames; capture correlationId from response (if exposed later—placeholder now). Add TODO if not yet implemented.

Expected tool set to be listed by the server (per Core MCP Tools in `spec.md`):

- plan_trip
- find_stops
- get_departures
- geocode_address
- reverse_geocode
- save_user_variable
- get_user_variables

## Performance Metrics (Mocked)

| Metric | Target | Rationale |
|--------|--------|-----------|
| plan_trip p50 | < 300ms (mocked upstream) | Ensures transformation overhead low. |
| plan_trip p95 | < 800ms | Budget for future real HTTP latency. |
| geocode_address p50 | < 120ms | Simple pass-through + validation. |
| get_departures p95 | < 500ms | Slight logic for status mapping. |
| find_stops p95 | < 400ms | Spatial filter complexity minimal. |

(Real upstream integration deferred—these are synthetic baselines; adjust in future Phase 10 if needed.)

## Stress Test Strategy (Rate Limiter)

- Configure N (e.g., 60) parallel tool invocations using Promise.all.
- Expect: first 30 immediate (capacity 30), remaining paced by refill 10/s.
- Measure wall clock buckets to assert refill behavior (approximate, allow jitter tolerance ±20%).
- Ensure no 429 leaks internally; limiter should queue or delay per spec (if implementation: if not queueing, expect structured error with `rate-limit-exhausted`).

## Retry Behavior Integration

Mock upstream responses sequence: 500 → 503 → 200 to assert exactly 2 retries (3 attempts). Validate logged attempt count (hook or spy). No retry on 400/401/422.

## Cache Behavior Expectations

- First identical routing/geocode request: MISS (store result) — record latency.
- Second identical within TTL: HIT — latency should be (significantly) lower (assert < 50% of first or presence of cache flag if available).
- Request collapsing: Fire 5 identical requests within 500ms window; expect only one upstream call (spy count = 1) and all promises resolved with identical object reference (strict equality) if design allows. (Aligns with `plan.md` request collapsing window.)

## Test Data Generation

Provide deterministic fixtures (e.g., coordinates, stop IDs) via shared `tests/helpers/fixtures.ts` (Phase 7 may create this). Avoid randomness except in performance test (controlled seeded pseudo-random latency).

## Edge Cases to Cover

- Empty geocode results (size=0) returns empty array (not error).
- plan_trip no itineraries → returns empty itineraries array (not error) + maybe warning (Phase 6?).
- user variables large value near limit (define temporary 4KB assumption) still accepted; TODO if limit unspecified.
- departures all cancelled scenario.

## Tool Invocation Contract Checks

For each E2E tool test:

1. Validate schema of response against expected subset (avoid duplicating schema tests—focus on integration shape & key semantics).
2. Assert absence of extraneous fields (defensive: shallow key set match).
3. Confirm stable ordering (itineraries sorted by startTime asc, stops by distance asc, departures by scheduledTime asc if spec states — add TODO markers if not settled).

## Instrumentation Hooks (Forward Looking)

Add TODO comments where correlationId, warnings array, and logging assertions will live once logging infra surfaces externally (Phase 6+). Do not fail tests prematurely if not yet present — use conditional expectations.

## Constitution Clause Mapping

| Clause | Coverage in Phase 7 |
|--------|---------------------|
| C1 | All new tests added before any further optimization/refactors. |
| C5 | Stress test validates rate limiter tokens & refill. |
| C6 | Error path integration ensures mapped `{ code, message }`. |
| C8 | Performance baseline p50/p95 captured (documentation of deviations future). |
| C9 | Not directly (dedupe already unit tested earlier; integration indirectly via plan_trip test). |
| C13 | Structured test file locations (e2e/, integration/, perf/). |
| C14 | Tests rely on validated schemas; no duplicate validation logic. |

## Acceptance Criteria

- All listed test files exist and run green after implementation adjustments.
- Measured performance metrics recorded (console or test summary) without exceeding targets (synthetic environment).
- No flaky timing assertions (use generous timeouts + relative comparisons, not absolute micro benchmarks).
- Stress test demonstrates limiter behavior deterministically on at least 2 consecutive runs.

### Per-Task Specific Success Conditions

| Task | Additional Acceptance Detail |
|------|-------------------------------|
| T065 | Asserts at least one multi-leg itinerary (>=2 legs) AND verifies itinerary ordering by startTime asc. Includes negative case (invalid coordinate) returning validation-error. |
| T066 | Confirms size truncation logic (request size=1 on mock >1 results) and error mapping for upstream 500 → retry attempts recorded. |
| T067 | Saves 2 variables with same key; confirms overwrite semantics and updatedAt monotonic increase; list ordering stable (e.g., alpha by key or insertion—decide & assert TODO). |
| T068 | Verifies distance ordering asc and no-results returns empty array without error; includes boundary radius exactly at limit. |
| T069 | Distinguishes realtime vs scheduled: one departure with delay >0 becomes status=delayed; cancelled mapped; asserts scheduleType logic (if implemented) or TODO. |
| T070 | Measures token consumption timeline; includes assertion tokens never negative; test resilient to ±20% timing jitter. |
| T071 | Injects 401 (no retry), 429 (retry OR limiter interplay), timeout (simulated abort) and checks correct error codes & attempt counts. |
| T072 | Records p50/p95 for at least 3 tools; uses mocked latency provider; asserts distribution shape (p95 >= p50). |
| T073 | Confirms cache HIT reduces latency OR presence of hit flag; collapsing triggers only one upstream call for concurrent burst. |
| T074 | Returns a best reverse geocode match with coordinates echoed; validates candidates[] ordering by confidence; verifies language fallback (requested → fi → en); invalid coords produce `validation-error`; include TODO for bounding_box if not exposed. |

### Test File Structure & Naming Guidance

- e2e tests: `tests/e2e/<tool>.e2e.test.ts` (e.g., `reverseGeocode.e2e.test.ts`)
- integration: `tests/integration/<feature>.test.ts`
- perf: `tests/perf/performance.test.ts` (extendable with sub‑suites later)
- Use consistent top-level `describe("tool:<name>")` blocks to aid grep-based selection.

### Performance Measurement Methodology

1. Inject a latency shim (e.g., pass fake timer/clock or stub `Date.now()` in internal service) instead of real `setTimeout` to eliminate nondeterminism.
2. Generate synthetic latencies from a predefined array (sorted) to compute percentiles deterministically.
3. Derive p50/p95 using simple index math (e.g., `Math.floor(0.5*n)` / `Math.floor(0.95*n)`).
4. Avoid `console.time` reliance; capture timestamps in variables to reduce noise.

### Instrumentation Placeholders

Add inline TODO markers where future fields will be asserted:

- correlationId (Phase 8/9 logging infra) → `// TODO(assert correlationId once surfaced)`
- warnings array presence when itinerary count=0 or geocode truncated.
- retryAttempt count (exposed via debug/log hook) → currently simulated via spy on retry policy.

### Open Questions / Follow-Ups

| Topic | Question | Proposed Handling |
|-------|----------|-------------------|
| Ordering semantics | Should user variables be sorted by key or insertion? | Decide in Phase 5 retro; document in schema reference (Phase 8). |
| Rate limiter behavior | Queue vs immediate error on exhaustion? | Conditional assertions; finalize before external release. |
| scheduleType exposure | Exposed in plan_trip output now or later? | Add TODO; skip assertion until implemented (Phase 6 algorithm). |
| Cache TTL | What specific TTL to assume in integration tests? | Use injected short TTL (e.g., 2s) for deterministic expiry scenario test. |
| Percentile thresholds | Should we store baseline artifacts? | Potential future JSON snapshot (Phase 10). |
| Long-running request cancellation | Where to validate FR-034 async/cancellation flow? | Defer end-to-end cancellation verification to Phase 9; Phase 7 focuses on integration/perf with mocked latencies. |

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Timing variance in CI causing perf test flakes | Use percentile simulation with mocked timers or inject latency provider. |
| Rate limiter design (error vs queue) mismatch with tests | Add conditional assertions depending on exported limiter mode flag. |
| Cache collapsing race conditions | Add barrier (Promise.all) + instrumentation counter. |

## Next Steps After Phase 7

Proceed to Phase 8 to codify documentation & governance, using empirical metrics captured here as reference values.
