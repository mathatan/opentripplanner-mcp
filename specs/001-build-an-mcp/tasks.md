# Tasks: MCP Timetables, Routes & Address Lookup

Feature Directory: `specs/001-build-an-mcp/`
Input Docs: `plan.md`, `research.md`, `data-model.md`, `contracts/*.md`, `quickstart.md`

Generated: 2025-09-29

## Conventions

- Format: `[ID] [P?] Description (file paths, purpose)`
- `[P]` marks tasks that can execute in parallel (different files, no dependency ordering conflict)
- Sequential tasks touching same file or depending on prior artifacts are NOT marked `[P]`.
- Source layout per plan: add new subfolders under `src/` (`infrastructure/`, `schema/`, `services/`, `tools/`, `util/`).
- Tests intentionally deferred unless/until stability triggers (Constitution Principle 2). Manual scripts (Phase 3.7) serve as primary validation; formal test tasks are marked DEFERRED with explicit activation triggers.

## Phase 3.1: Setup & Scaffolding

- [x] T001 Initialize feature source structure: create `src/infrastructure/`, `src/schema/`, `src/services/`, `src/tools/`, `src/util/` (no code yet). (Creates directories)
- [x] T002 Add base `src/schema/index.ts` exporting placeholder Zod schemas file headers (to be filled by later model tasks). (Depends: T001)
- [x] T003 [P] Add environment validation module `src/infrastructure/env.ts` (validate `DIGITRANSIT_API_KEY` present; throw early). (Depends: T001)
- [x] T004 [P] Add lightweight HTTP client wrapper `src/infrastructure/httpClient.ts` (native fetch, header injection, basic error mapping stub). (Depends: T001)
- [x] T005 [P] Add error taxonomy module `src/infrastructure/errorMapping.ts` (enum + factory). (Depends: T001)
- [x] T006 [P] Add rate limiter stub `src/infrastructure/rateLimiter.ts` (currently pass-through; TODO implement adaptive logic ONLY if ≥3 upstream 429s in rolling 60s OR upstream quota change). (Depends: T001)
- [x] T007 [P] Add retry policy stub `src/infrastructure/retryPolicy.ts` (exponential backoff helper; TODO enable for transient network failures once first upstream timeout observed). (Depends: T001)
- [x] T008 Integrate logging utility skeleton `src/infrastructure/logging.ts` (console wrapper). (Depends: T001)

## Phase 3.2: Data Model Schemas (From data-model.md entities)

Entities: LocationQueryInput, ResolvedLocation, DisambiguationSet, RouteRequestInput, Itinerary, Leg, TimetableRequestInput, Departure, ErrorPayload

- [x] T009 [P] Implement `CoordinateSchema` & `LocationQueryInputSchema` in `src/schema/location.ts`. (Depends: T002)
- [x] T010 [P] Implement `ResolvedLocationSchema` & `DisambiguationSetSchema` in `src/schema/locationResolution.ts`. (Depends: T009)
- [x] T011 [P] Implement `RouteRequestInputSchema`, `LegSchema`, `ItinerarySchema` in `src/schema/route.ts`. (Depends: T009)
- [x] T012 [P] Implement `TimetableRequestInputSchema`, `DepartureSchema` in `src/schema/timetable.ts`. (Depends: T009)
- [x] T013 [P] Implement `ErrorPayloadSchema` in `src/schema/error.ts`. (Depends: T002)
- [x] T014 Update `src/schema/index.ts` to export all schemas & associated inferred types. (Depends: T009-T013)

## Phase 3.3: Utility Layer

- [x] T015 [P] Implement deterministic sorting helpers `src/util/sorting.ts` (geocode candidates, itineraries, departures). (Depends: T014, T011, T012)
- [x] T016 [P] Implement hash/fingerprint helper `src/util/fingerprint.ts` (for itinerary id). (Depends: T011)
- [x] T017 [P] Implement language fallback helper `src/util/languageFallback.ts`. (Depends: T010)
- [x] T018 Implement time & clamp helpers `src/util/time.ts` (search window clamp, horizon clamp). (Depends: T011, T012)

## Phase 3.4: Service Implementations

- [ ] T019 Implement geocoding service `src/services/lookupService.ts` (calls upstream Pelias, applies confidence normalization 0–1, uses epsilon=0.02 for distance tiebreak, enforces maxLookupCandidates/truncation & needsClarification flags, uses language fallback). (Depends: T010, T015, T017, T004, T005)
- [ ] T020 Implement routing service `src/services/routeService.ts` (GraphQL query template, apply ordering, create itinerary ids). (Depends: T011, T016, T015, T004, T005)
- [ ] T021 Implement timetable service `src/services/timetableService.ts` (GraphQL query for departures, apply clamps & ordering). (Depends: T012, T015, T018, T004, T005)

## Phase 3.5: Tool Handlers (MCP Tools)

- [ ] T022 Implement `findAddressOrStop` tool handler `src/tools/findAddressOrStop.ts` (validate request → call lookupService → map result/disambiguation). (Depends: T019, T010, T011, T013)
- [ ] T023 Implement `planRoute` tool handler `src/tools/planRoute.ts` (validate request → routeService). (Depends: T020, T011, T013)
- [ ] T024 Implement `getStopTimetable` tool handler `src/tools/getStopTimetable.ts` (validate request → timetableService). (Depends: T021, T012, T013)
- [ ] T025 Wire tools into entrypoint `src/index.ts` (register 3 tools; integrate env validation & error mapping). (Depends: T022-T024, T003, T005)

## Phase 3.6: Integration & Manual Validation Support

- [ ] T026 [P] Add quickstart scenario script `scripts/manual/lookup-demo.ts` (executes sample lookup). (Depends: T025)
- [ ] T027 [P] Add route scenario script `scripts/manual/route-demo.ts`. (Depends: T023)
- [ ] T028 [P] Add timetable scenario script `scripts/manual/timetable-demo.ts`. (Depends: T024)
- [ ] T029 Update `quickstart.md` with actual command examples referencing new scripts. (Depends: T026-T028)

## Phase 3.7: Newly Added Coverage & Instrumentation Tasks

- [ ] T030 [P] Update `README.md` feature section summarizing tools & env var. (Depends: T025)
- [ ] T031 [P] Add performance notes & p95 instrumentation comment in `docs/routing-api.md` or new `docs/performance.md`. (Depends: T019-T021)
- [ ] T032 [P] Remove any unused stubs (rateLimiter/retry if still no-op) or justify with inline TODO referencing future feature. (Depends: T025)
- [ ] T033 Final pass: ensure all exported schemas documented with `.describe()`; update `src/schema/*`. (Depends: T014)
- [ ] T034 Run lint & build, fix issues; update tasks status log (manual). (Depends: All prior implementation tasks)

## Phase 3.8: Contract Tests

- [ ] T035 Contract test for findAddressOrStop in `tests/contract/findAddressOrStop.contract.test.ts` (execute after contract stability trigger).
- [ ] T036 Contract test for planRoute in `tests/contract/planRoute.contract.test.ts` (execute after contract stability trigger).
- [ ] T037 Contract test for getStopTimetable in `tests/contract/getStopTimetable.contract.test.ts` (execute after contract stability trigger).

## Phase 3.9: Unit Tests

- [ ] T038 Unit tests for sorting helpers.
- [ ] T039 Unit tests for language fallback.
- [ ] T040 Unit tests for time clamp helpers.
- [ ] T044 Unit tests error mapping.
- [ ] T045 Truncation test for lookup candidates.

## Phase 3.10: Integration Tests (Optional Until Trigger)

- [ ] T041 Integration test ambiguous lookup.
- [ ] T042 Integration test route no results.
- [ ] T043 Integration test timetable empty.
- [ ] T046 Itinerary truncation ordering test.
- [ ] T047 Localization + unicode normalization integration test.

## Phase 3.11: Unicode & Localization

- [ ] T048 Implement unicode normalization utility `src/util/unicode.ts` (NFD + remove combining marks; detect invalid code points) (FR-021). (Depends: T009)
- [ ] T049 Integrate unicode normalization into lookup pipeline `lookupService.ts` and tool handler (preserve original, comparison only). (Depends: T019, T048)

## Phase 3.12: Metrics & Instrumentation

- [ ] T050 Implement in-memory metrics & latency module `src/infrastructure/metrics.ts` (counters + simple histogram/reservoir; export increment/observe functions) (FR-017, FR-018). (Depends: T001)
- [ ] T051 Instrument tool handlers (findAddressOrStop, planRoute, getStopTimetable) for latency & counters (wrap handler invocation) (FR-017, FR-018). (Depends: T025, T026, T027, T050)

## Phase 3.13: Docs & Data Freshness

- [ ] T052 Add data freshness statement to `README.md` and/or `docs/routing-api.md` (FR-015). (Depends: T030)

## Dependencies Summary

Ordering logic (selected examples; deferred backlog isolated):

- Core path: T001 → T002 → T009 → (T010,T011,T012) → T014 → (T015,T016,T017,T018) → (T019,T020,T021) → (T022,T023,T024) → (T025,T026,T027) → T028 → (T029,T030,T031) → (T048,T050) → (T049,T051) → (T030,T031,T032,T033,T052) → T034 → (optional backlog phase)

## Parallel Execution Guidance

- Early parallel batch (after T002): T009, T013
- Schema expansion batch: T010, T011, T012 (after T009)
- Utility batch: T015, T016, T017 (after schemas), plus T018
- Service batch: T019, T020, T021
- Tool handler batch: T022, T023, T024
- Manual script batch: T026, T027, T028
- Instrumentation/unicode batch: T048, T050 then T049, T051
- Docs/polish batch: T030, T031, T032, T033, T052; final: T034

## Validation Checklist

This checklist summarizes the minimal validations to perform before moving from implementation to integration/manual validation phases.

- [ ] All schema tasks completed (T009–T014)
- [x] Deterministic ordering utilities implemented before service usage (T015)
- [ ] Unicode normalization & language fallback integrated (T048, T017)
- [ ] Metrics & latency instrumentation operational (T050, T051)
- [ ] Tool handlers wired and registered in entrypoint (T025)
- [ ] Manual validation scripts runnable (T026–T028)
- [ ] Data freshness & performance docs updated (T032, T031)
- [ ] Backlog test tasks remain gated by activation triggers (Phase 3.8-3.13)

---
Generated following `.specify/templates/tasks-template.md` rules and feature design docs.
