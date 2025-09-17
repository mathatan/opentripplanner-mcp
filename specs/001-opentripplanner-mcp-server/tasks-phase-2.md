# Tasks Phase 2: Test-First (Contracts, Schemas, Infrastructure) – RED Tests Only

Feature: 001-opentripplanner-mcp-server
Contracts: `specs/001-opentripplanner-mcp-server/contracts/*.md`
Docs Referenced: `docs/routing-api.md`, `docs/geocoding-api.md`, `docs/realtime-apis.md` (for realtime placeholders), `docs/routing-data-api.md` (data semantics)

Objective: Author failing (RED) tests & minimal type stubs for every contract, schema entity, infrastructure component, store, cache, utility, and e2e handshake extension BEFORE any implementation (Constitution C1). No production logic; only scaffolds sufficient for compilation.

Legend:
 [x] = Completed (RED tests authored & currently failing initially when run before implementations)
 [P] = Parallel-safe (distinct files & no ordering dependency)
 Entire Phase Status: COMPLETE ✅ (All RED artifacts in place historically; moving forward implementations proceed in Phase 3+)

## 2.1 Contract Tool Tests

| ID | Status | Task | Coverage Focus | Contract Trace |
|----|--------|------|----------------|----------------|
| T005 | [x] [P] | plan_trip contract tests `tests/tools/plan_trip.contract.test.ts` | Input validation matrix (required fields, PlanConstraints), realtime/mixed schedule placeholders, itinerary dedupe placeholder expectations | `contracts/plan_trip.md` (input / output schemas), `docs/routing-api.md` (itinerary fields) |
| T006 | [x] [P] | find_stops contract tests `tests/tools/find_stops.contract.test.ts` | Radius bounds, truncation warnings, filter by modes | `contracts/find_stops.md` |
| T007 | [x] [P] | get_departures contract tests `tests/tools/get_departures.contract.test.ts` | Delay → status mapping precedence (cancellation vs delay), ordering, truncation | `contracts/get_departures.md`, `docs/realtime-apis.md` |
| T008 | [x] [P] | geocode_address contract tests `tests/tools/geocode_address.contract.test.ts` | Truncation when results > size, no-results error shape, ordering & focus proximity tie-break | `contracts/geocode_address.md`, `docs/geocoding-api.md` |
| T009 | [x] [P] | reverse_geocode contract tests `tests/tools/reverse_geocode.contract.test.ts` | No-results error, language fallback chain (accept-language stub) | `contracts/reverse_geocode.md`, `docs/geocoding-api.md` |
| T010 | [x] [P] | save_user_variable contract tests `tests/tools/save_user_variable.contract.test.ts` | Overwrite semantics (previous value returned), coordinate validation, TTL placeholder field | `contracts/user_variables.md` (save section) |
| T011 | [x] [P] | get_user_variables contract tests `tests/tools/get_user_variables.contract.test.ts` | Empty list scenario, ordering after multiple saves | `contracts/user_variables.md` (get section) |

## 2.2 Schema Entity Tests

| ID | Status | Task | Key Assertions | Source |
|----|--------|------|---------------|--------|
| T012 | [x] [P] | Coordinate schema tests | Latitude/longitude bounds, rejection of non-number | data-model.md (Coordinate) |
| T013 | [x] [P] | LocationRef schema tests | Discriminated union correctness, required id or coordinates per variant | data-model.md (LocationRef) |
| T014 | [x] [P] | PlanConstraints & AccessibilityPrefs tests | Numeric ranges, unknown key rejection | plan.md (constraints), data-model.md |
| T015 | [x] [P] | Itinerary & Leg schema tests | Realtime status derivation placeholder, required timing fields | routing-api.md (legs, itineraries) |
| T016 | [x] [P] | GeocodeResult & Response tests | truncated flag when results > requested size, ordering stable | geocoding-api.md |
| T017 | [x] [P] | Departure & Response tests | Chronological ordering, status mapping stub expectation | realtime-apis.md |
| T018 | [x] [P] | UserVariable & Response tests | TTL field presence, type validation | user_variables contract |
| T019 | [x] [P] | Error & Warning schema tests | `{ code, message, hint?, correlationId? }` shape; kebab-case codes | spec.md (Unified Errors / C6) |

## 2.3 Infrastructure & Utility RED Tests

| ID | Status | Task | Assertions | Spec Trace |
|----|--------|------|-----------|------------|
| T020 | [x] [P] | Rate limiter tests | Token bucket: capacity 30, refill 10/s (simulated timers) | spec.md (Rate Limit C5) |
| T021 | [x] [P] | Retry policy tests | Exponential jitter bounds, max 5 attempts, non-retry codes skipped | spec.md (Retry C5) |
| T022 | [x] [P] | HTTP client wrapper tests | Timeout behavior, API key header injection placeholder, correlation ID propagation | plan.md (HTTP layer), spec.md (Observability C3 placeholder) |
| T023 | [x] [P] | Unified error mapping tests | status → error code matrix, no leakage of provider messages >200 chars | spec.md (Unified Errors C6) |
| T024 | [x] [P] | User variable store tests | Overwrite returns previous, TTL expiry simulation (fake timers) | user_variables.md, data-model.md |
| T025 | [x] [P] | Cache tests | Geocode LRU eviction, itinerary request collapsing window 500ms | plan.md (caching), geocoding-api.md |
| T026 | [x] [P] | Fingerprint util tests | Hash stability & uniqueness across itineraries | plan_trip contract (dedupe), routing-api.md |
| T027 | [x] [P] | Logging interface tests | Presence of fields: tool, correlationId, durationMs; stub for retries count | spec.md (Observability C3) |

## 2.4 Integration RED Scaffolds

| ID | Status | Task | Purpose | Trace |
|----|--------|------|---------|-------|
| T028 | [x] [P] | plan_trip e2e skeleton | Stdio handshake + tool invocation placeholder assertions | quickstart.md (handshake), contracts/plan_trip.md |
| T029 | [x] [P] | geocode_address e2e skeleton | Forward geocode invocation placeholder | contracts/geocode_address.md |
| T030 | [x] [P] | user variable roundtrip e2e skeleton | Save then get sequence placeholder | contracts/user_variables.md |

## Completion Gates for Phase 2

1. All contract & schema RED tests exist and fail prior to implementation.
2. Running `pnpm build && pnpm test` initially: failing tests correspond exactly to unimplemented features (no runtime errors outside assertions).
3. No production logic (e.g., network calls, real rate limiting) implemented yet.
4. Error schema and codes enumerated in tests to guard accidental divergence (C6).
5. Parallel tasks executed without file conflicts (validated by distinct file paths).

## Notes

- Geocode & itinerary caches intentionally tested early to lock expected behavior before integration complexity (reduces regression risk).
- E2E skeletons provide stable handshake contract to expand in Phase 7 (integration & performance).
- Logging & observability placeholders ensure correlationId field presence can be asserted early (supports C3 when full logging added).

Phase 2 COMPLETE ✅
