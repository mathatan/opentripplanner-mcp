# Tasks: OpenTripPlanner MCP Server (Feature 001-opentripplanner-mcp-server)

Generated: 2025-09-16
Branch: 001-opentripplanner-mcp-server

Source Docs Loaded: plan.md, research.md, data-model.md, contracts/*, quickstart.md

Legend:
  [P] = Task can be executed in parallel (different file, no unmet dependency)
  RED = Write failing test/spec only
  GREEN = Implement logic to satisfy previously failing tests

Constitution Alignment: All implementation follows Clause C1 (Test-First), C2 (Integration Triggers), C5 (Rate Limit & Retry), C6 (Unified Errors).

## Phase 1: Setup & Scaffolding

T001  Create base directories: src/schema, src/tools, src/services, src/infrastructure, src/store, src/util (empty index.ts files exporting nothing yet). Update tsconfig paths if needed.
T002  Add placeholder exports in src/index.ts referencing upcoming registries (no logic) so future imports resolve.
T003 [P] Initialize shared type re-export file src/schema/index.ts (placeholder) to allow test compilation before concrete schemas exist.
T004 [P] Add test utilities file tests/helpers/testHttp.ts (mock HTTP + token bucket harness skeleton, no implementation yet).

## Phase 2: Test-First (Contracts, Schemas, Infrastructure)  (ALL RED Tests Only)

NOTE: Do NOT implement production code in this phase—only failing tests & minimal type stubs.

// Contract Tool Tests (each contract file → one RED test file per tool)
T005 [P] RED contract tests for plan_trip in tests/tools/plan_trip.contract.test.ts (validation cases, realtime/mixed placeholders, dedupe placeholder).
T006 [P] RED contract tests for find_stops in tests/tools/find_stops.contract.test.ts (radius, truncation, filter warnings).
T007 [P] RED contract tests for get_departures in tests/tools/get_departures.contract.test.ts (delay mapping, cancellation precedence, truncation).
T008 [P] RED contract tests for geocode_address in tests/tools/geocode_address.contract.test.ts (truncation > size, no results error, ordering, focus tie-break).
T009 [P] RED contract tests for reverse_geocode in tests/tools/reverse_geocode.contract.test.ts (no results error, language fallback).
T010 [P] RED contract tests for save_user_variable in tests/tools/save_user_variable.contract.test.ts (overwrite previous, coordinate validation, TTL marker placeholder).
T011 [P] RED contract tests for get_user_variables in tests/tools/get_user_variables.contract.test.ts (empty list, after saves ordering).

// Schema Entity Tests (each entity gets a dedicated schema file plan; combine simple ones where logical)
T012 [P] RED schema tests for Coordinate & validation boundaries in tests/schema/coordinate.schema.test.ts.
T013 [P] RED schema tests for LocationRef in tests/schema/locationRef.schema.test.ts.
T014 [P] RED schema tests for PlanConstraints & AccessibilityPrefs ranges and unknown key rejection in tests/schema/planConstraints.schema.test.ts.
T015 [P] RED schema tests for Leg & Itinerary realtime status mapping placeholders in tests/schema/itinerary.schema.test.ts.
T016 [P] RED schema tests for GeocodeResult & GeocodeResponse (truncated flag) in tests/schema/geocode.schema.test.ts.
T017 [P] RED schema tests for Departure & DepartureResponse ordering in tests/schema/departure.schema.test.ts.
T018 [P] RED schema tests for UserVariable & UserVariablesResponse TTL shape in tests/schema/userVariable.schema.test.ts.
T019 [P] RED schema tests for Error & Warning objects in tests/schema/error.schema.test.ts.

// Infrastructure & Utility Tests (RED)
T020 [P] RED tests for rate limiter token bucket in tests/infra/rateLimiter.test.ts (burst 30 cap, refill 10/s behavior simulation using fake timers).
T021 [P] RED tests for retry policy (exponential jitter bounds, max attempts=5, non-retry codes) in tests/infra/retryPolicy.test.ts.
T022 [P] RED tests for http client wrapper (timeout, header injection of API key, correlation ID propagation) in tests/infra/httpClient.test.ts.
T023 [P] RED tests for unified error mapping (status→code matrix) in tests/infra/errorMapping.test.ts.
T024 [P] RED tests for user variable store (overwrite returns previous, TTL expiry simulation) in tests/store/userVariableStore.test.ts.
T025 [P] RED tests for geocode LRU cache & itinerary request collapsing in tests/cache/cache.test.ts.
T026 [P] RED tests for fingerprint hashing uniqueness & stability in tests/util/fingerprint.test.ts.
T027 [P] RED tests for logging interface structure (fields presence) in tests/infra/logging.test.ts.

// Integration RED scaffolds (placeholders referencing not-yet-implemented code)
T028 [P] RED e2e test skeleton for plan_trip via stdio in tests/e2e/plan_trip.e2e.test.ts (spawns built server) extending existing handshake.
T029 [P] RED e2e test skeleton for geocode_address in tests/e2e/geocode_address.e2e.test.ts.
T030 [P] RED e2e test skeleton for user variable roundtrip (save + get) in tests/e2e/user_variables.e2e.test.ts.

## Phase 3: Schema & Infrastructure Implementation (GREEN)

Implement only after all Phase 2 tests exist & fail.

T031  Implement Coordinate & basic primitive schemas in src/schema/coordinate.ts make RED tests pass.
T032 [P] Implement LocationRef schema src/schema/locationRef.ts.
T033 [P] Implement PlanConstraints & AccessibilityPrefs with strict key rejection src/schema/planConstraints.ts.
T034 [P] Implement Leg & Itinerary schemas with status derivation helper src/schema/itinerary.ts.
T035 [P] Implement GeocodeResult & GeocodeResponse schemas src/schema/geocode.ts.
T036 [P] Implement Departure & DepartureResponse schemas src/schema/departure.ts.
T037 [P] Implement UserVariable & UserVariablesResponse schemas src/schema/userVariable.ts.
T038 [P] Implement Error & Warning schemas src/schema/error.ts.
T039  Aggregate exports in src/schema/index.ts (ensure tree-shake safe) and update tests imports.
T040  Implement rate limiter src/infrastructure/rateLimiter.ts (capacity 30, refill 10/s).
T041 [P] Implement retry policy util src/infrastructure/retryPolicy.ts (exponential decorrelated jitter).
T042 [P] Implement http client wrapper src/infrastructure/httpClient.ts (timeout, retries, rate limit integration, correlation ID injection, Accept-Language pass-through).
T043 [P] Implement unified error mapping src/infrastructure/errors.ts (factory + mapping table).
T044 [P] Implement logging interface src/infrastructure/logging.ts (JSON line logger) with correlation integration.
T045 [P] Implement user variable store src/store/userVariables.ts (TTL 24h, lazy sweep, overwrite semantics).
T046 [P] Implement geocode & itinerary caches src/infrastructure/cache.ts (LRU + request collapsing window 500ms).
T047 [P] Implement fingerprint util src/util/fingerprint.ts (sha1 hash method as per spec).

## Phase 4: Service Layer Implementation

T048  Implement routing service src/services/routingService.ts (GraphQL query builder minimal fragments, dedupe support hook).
T049 [P] Implement geocoding service src/services/geocodingService.ts (forward + reverse, normalization, truncation logic).
T050 [P] Implement departures service src/services/departuresService.ts (status mapping + freshness computation).
T051 [P] Implement user variable service adapter src/services/userVariablesService.ts (wrap store with validation helper functions).

## Phase 5: Tool Implementations (GREEN per tool after schemas & services ready)

T052  Implement plan_trip tool src/tools/planTrip.ts (validation using schemas, service invocation, dedupe placeholder, realtimeUsed calculation simple initial) + update src/index.ts registration.
T053 [P] Implement find_stops tool src/tools/findStops.ts (radius validation, truncation warning, modes filter, register tool).
T054 [P] Implement get_departures tool src/tools/getDepartures.ts (delay/status mapping, ordering, truncation warning).
T055 [P] Implement geocode_address tool src/tools/geocodeAddress.ts (forward only, truncation flag/warning, focus tie-break, error mapping for no results).
T056 [P] Implement reverse_geocode tool src/tools/reverseGeocode.ts (language fallback chain, first candidate selection).
T057 [P] Implement save_user_variable tool src/tools/saveUserVariable.ts (overwrite logic, return previous summary) and register.
T058 [P] Implement get_user_variables tool src/tools/getUserVariables.ts.

## Phase 6: Advanced Behavior Enhancements

T059  Implement itinerary deduplication via fingerprint & meta.deduplicatedFrom in planTrip service/tool.
T060 [P] Implement realtime aggregation & scheduleType calculation improvements (mixed vs realtime) in itinerary transform.
T061 [P] Implement disruption detection & alternate search logic (delay >300s / cancellation triggers second query) with warning injection.
T062 [P] Implement accessibility warnings unsupported-accessibility-flag & preference-unmet logic.
T063 [P] Implement geocode disambiguation (fuzzy suggestions) extension (if provider supports) else stub with TODO & tests adjusted.
T064 [P] Implement language fallback for all tools (Accept-Language header cascade + warnings when unmet) centralizing logic.

## Phase 7: Integration & Performance (GREEN new tests)

T065  Flesh out e2e plan_trip test (real transformation assertions) tests/e2e/plan_trip.e2e.test.ts.
T066 [P] Flesh out e2e geocode_address test.
T067 [P] Flesh out e2e user variables roundtrip test.
T068 [P] Add e2e find_stops test tests/e2e/find_stops.e2e.test.ts.
T069 [P] Add e2e get_departures test tests/e2e/get_departures.e2e.test.ts.
T070  Add rate limit stress test integration (simulated parallel invocations) tests/integration/rateLimit.stress.test.ts.
T071 [P] Add error path integration test (401/429/timeout mocks) tests/integration/errorPaths.test.ts.
T072 [P] Add performance baseline test measuring p50/p95 timings (mock upstream) tests/perf/performance.test.ts.
T073 [P] Add cache hit/miss integration test tests/integration/cacheBehavior.test.ts.

## Phase 8: Documentation & Governance

T074  Update quickstart.md examples for all tools & parameters (ensuring alignment with final schemas).
T075 [P] Generate or hand-write schema reference docs docs/schema-reference.md (list all entities & fields).
T076 [P] Add constitution audit mapping (clauses → files/tests) docs/constitution-audit.md.
T077 [P] Update README.md with new tool usage & build/test instructions.

## Phase 9: Hardening & Polish

T078  Add fuzz validation test suite tests/fuzz/validationFuzz.test.ts (random invalid payloads produce validation-error not crashes).
T079 [P] Add soak test (1k sequential plan_trip with mock responses) tests/soak/planTripSoak.test.ts ensuring no memory leak.
T080 [P] Add security/dependency audit script (pnpm audit) integrated into a test guard tests/security/audit.test.ts (skips on offline).
T081 [P] Add coverage threshold enforcement script (vitest coverage gate) updating package.json scripts.
T082 [P] Refactor & remove duplication (single constants file src/constants.ts) – no behavior change; ensure tests remain green.
T083 [P] Run and document manual exploratory scenarios docs/manual-test-scenarios.md (list prompts & expected outputs).
T084 [P] Final pass: ensure all tool error paths include correlationId & warnings never silently dropped (spot tests update if missing).
T085  Version bump to 0.1.0 in package.json & changelog entry CHANGELOG.md summarizing implemented feature set.

## Dependencies Summary (High-Level)

- Phase order strictly ascending: Setup → Test-First → Schemas/Infra → Services → Tools → Advanced → Integration → Docs → Hardening.
- Each RED test task (T005–T030, T012–T027) precedes its corresponding GREEN implementation tasks (T031+ etc.).
- Tool implementations (T052–T058) depend on services (T048–T051) and schemas (T031–T038) & infra (T040–T047).
- Advanced behaviors (T059–T064) depend on base tool implementations (T052–T058).
- E2E tests (T065–T073) depend on tool implementations; performance & rate limit tests depend on infra & tools.
- Documentation tasks (T074–T077) depend on stable schemas & tools.
- Hardening tasks depend on all previous phases.

## Parallel Execution Guidance Examples

Example 1 (Contract Tests Batch):
  Can run in parallel: T005 T006 T007 T008 T009 T010 T011

Example 2 (Schema Tests Batch):
  Parallel: T012 T013 T014 T015 T016 T017 T018 T019

Example 3 (Infra Tests Batch):
  Parallel: T020 T021 T022 T023 T024 T025 T026 T027

Example 4 (Schema Implementation Batch after all RED tests present & failing):
  Parallel: T032 T033 T034 T035 T036 T037 T038 (T031 & T039 & T040 must respect ordering: T031 before others referencing coordinate; T039 after all schema files; T040 after retry policy if it imports it.)

Example 5 (Tool Implementation Batch):
  Parallel: T053 T054 T055 T056 T057 T058 (T052 serialized first due to shared itinerary transformation components refined in later tasks.)

Example 6 (Advanced Enhancements):
  Parallel: T060 T061 T062 T063 T064 after T059 completed.

Task Agent Invocation Sample (conceptual):
  agent run T005 T006 T007 T008 T009 T010 T011
  agent run T012..T019
  agent run T020..T027
  agent run T031 && agent run T032 T033 T034 T035 T036 T037 T038

## Validation Checklist

  [ ] All contract files mapped to RED test tasks (plan_trip, find_stops, get_departures, geocode_address, reverse_geocode, save_user_variable, get_user_variables)
  [ ] All entities from data-model have schema test & implementation tasks
  [ ] All infra components (rate limiter, retry, http client, error mapping, cache, store, logging, fingerprint) have RED then GREEN tasks
  [ ] Tests precede implementation for every component (C1)
  [ ] Parallel [P] tasks operate on distinct files
  [ ] Each task specifies a concrete file path or output artifact
  [ ] Documentation tasks scheduled after implementation stabilization
  [ ] Coverage & performance gates included (T072, T081)

## Completion Definition

All tasks through T085 completed, tests green, lint passes, coverage thresholds met, performance targets documented, version bumped, and constitution audit produced.

Status: READY FOR EXECUTION
