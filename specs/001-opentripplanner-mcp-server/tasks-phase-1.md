# Tasks Phase 1: Setup & Scaffolding

Feature: 001-opentripplanner-mcp-server
Related Specs: `specs/001-opentripplanner-mcp-server/plan.md`, `research.md`, `data-model.md`, `spec.md`
Related Docs: `docs/routing-api.md`, `docs/routing-data-api.md`, `docs/geocoding-api.md`, `docs/realtime-apis.md`, `docs/map-api.md`

Purpose: Establish minimal directory & export scaffolding so RED contract & schema tests (Phase 2) can compile without implementing business logic (Constitution C1 Test-First). No runtime behavior beyond placeholder exports.

Legend:
 [x] = Completed
 Status for entire Phase: COMPLETE ✅

## Tasks

| ID | Status | Description | Acceptance Criteria | Spec / Doc Trace |
|----|--------|-------------|---------------------|------------------|
| T001 | [x] | Create base directories: `src/schema`, `src/tools`, `src/services`, `src/infrastructure`, `src/store`, `src/util`; add empty `index.ts` barrels. Update `tsconfig.json` path mappings if required. | Directories exist; build succeeds (no TS errors); no business logic added. | plan.md (architecture layout), spec.md (future modules) |
| T002 | [x] | Add placeholder exports in `src/index.ts` referencing upcoming registries (commented or empty objects) so future imports resolve. | `src/index.ts` builds; exports names used later (e.g. tools registry) without implementations. | spec.md tool registry section |
| T003 | [x] | Initialize shared type re-export file `src/schema/index.ts` (placeholder) to allow test compilation before concrete schemas exist. | Importing any planned schema symbol yields a placeholder (type only) and no runtime throw. | data-model.md entities list |
| T004 | [x] | Add test utilities file `tests/helpers/testHttp.ts` (mock HTTP + token bucket harness skeleton, no implementation yet). | File exists exposing planned helper function signatures (`mockHttp`, `withRateLimiterHarness` placeholders). | routing-api.md (HTTP patterns), realtime-apis.md (future rate limiter needs) |

## Additional Notes

- Rationale: Establishing structure early reduces refactors when implementing contract tests (C1).
- No dependencies on external APIs; keep placeholders pure/side-effect free.
- Logging & HTTP wrappers intentionally deferred to later phases (see Phase 3 & 4 tasks) per spec layering (spec.md layering diagram).
- Conforms to Constitution Clauses: C1 (no implementation before tests), C13 (search discipline—structure mirrored from spec, not ad hoc).

## Completion Evidence

- Build & lint pass with only placeholders.
- Import graph resolves all referenced future module paths.
- No tool registrations beyond existing demo until Phase 5.

Phase 1 COMPLETE ✅
