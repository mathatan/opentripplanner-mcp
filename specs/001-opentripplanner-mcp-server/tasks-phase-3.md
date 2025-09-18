# Tasks Phase 3: Schema & Infrastructure Implementation (GREEN)

- [2025-09-18] Marked T031–T039 schemas implemented (automated update)

Objective: Implement schemas & infrastructure so previously failing RED tests (Phase 2) turn GREEN. Maintain strict adherence to spec constraints (Unified Errors C6, Rate Limit & Retry C5). No service or tool logic beyond core validation / infra utilities.

Legend:
 [ ] Pending  | [P] Parallel-safe

## 3.1 Schema Implementations

| ID | Status | Task | Acceptance Criteria | Spec / Doc Trace |
|----|--------|------|---------------------|------------------|
| T031 | [x] | Implement Coordinate schema `src/schema/coordinate.ts` | Validates lat ∈ [-90,90], lon ∈ [-180,180]; rejects non-number; tests T012 pass | `specs/001-opentripplanner-mcp-server/data-model.md` (Coordinate) |
| T032 | [x] [P] | Implement LocationRef schema `src/schema/locationRef.ts` | Discriminated union forms (id, coordinates, stopId etc.) validated; tests T013 pass | `specs/001-opentripplanner-mcp-server/data-model.md` (LocationRef) |
| T033 | [x] [P] | Implement PlanConstraints & AccessibilityPrefs `src/schema/planConstraints.ts` | Range limits enforced; unknown keys rejected; tests T014 pass | `specs/001-opentripplanner-mcp-server/plan.md`, `specs/001-opentripplanner-mcp-server/data-model.md` |
| T034 | [x] [P] | Implement Leg & Itinerary schemas `src/schema/itinerary.ts` | Realtime status derivation helper stub returns scheduled by default; tests T015 pass | `docs/routing-api.md`, `specs/001-opentripplanner-mcp-server/contracts/plan_trip.md` |
| T035 | [x] [P] | Implement GeocodeResult & Response `src/schema/geocode.ts` | truncated flag computed; ordering preserved; tests T016 pass | `specs/001-opentripplanner-mcp-server/contracts/geocode_address.md` |
| T036 | [x] [P] | Implement Departure & Response `src/schema/departure.ts` | Ordering by time; status enum placeholder; tests T017 pass | `specs/001-opentripplanner-mcp-server/contracts/get_departures.md`, `docs/realtime-apis.md` |
| T037 | [x] [P] | Implement UserVariable & Response `src/schema/userVariable.ts` | TTL field optional; type union; tests T018 pass | `specs/001-opentripplanner-mcp-server/contracts/user_variables.md` |
| T038 | [x] [P] | Implement Error & Warning schemas `src/schema/error.ts` | Shape: {code,message,hint?,correlationId?,retryAfter?}; code format enforced; redaction/truncation tested in `src/infrastructure/errorMapping.ts` tests (T043); tests T019 pass | `specs/001-opentripplanner-mcp-server/spec.md` (C6) |
| T039 | [x] | Aggregate exports `src/schema/index.ts` | Re-export all schema consts & types; tree-shake safe; no circular deps | `specs/001-opentripplanner-mcp-server/plan.md` architecture |

### Schema Specification Details

Below captures required fields, types, constraints, and notable edge cases per schema (source: `data-model.md`, contracts, routing & geocoding docs, constitution clauses C6, C14):

All schema property names are camelCase and types MUST be exported using the `export const XSchema = ...` / `export type X = z.infer<typeof XSchema>` pattern (see constitution C14).

1. Coordinate:
   - Fields: `lat: number` (−90 ≤ lat ≤ 90), `lon: number` (−180 ≤ lon ≤ 180)
   - Reject: NaN, Infinity, strings, objects. Normalize not required (no rounding at schema level).
   - Edge Cases: extreme bounds (±90, ±180) must pass; outside by 0.000001 must fail.
2. LocationRef (discriminated union):
   - Variants (example): `{ type: 'stopId', id: string }`, `{ type: 'coordinate', coordinate: Coordinate }`, `{ type: 'placeId', id: string }` (exact variant list per data-model; ensure exhaustive with `never` check).
   - Only allow required keys per variant; no extraneous keys (use `.strict()`).
3. PlanConstraints & AccessibilityPrefs:
   - Numeric ranges (examples, adapt from plan.md): `maxWalkDistance` ≥ 0; `maxTransfers` ≥ 0 integer; `wheelchair` boolean; accessibility sub-object disallows unknown flags.
   - Reject any unknown top-level constraint keys (guards future drift; C14).
4. Itinerary / Leg:
   - Core fields (minimal for Phase 3): itineraries: Itinerary[], each Itinerary must include:
      - legs: Leg[]
      - totalDurationSeconds: number (total itinerary duration in seconds)
      - numberOfTransfers: number
      - walkingDistanceMeters: number
      - scheduleType: 'realtime' | 'scheduled' | 'mixed'
      - disruptionFlag?: boolean
      - accessibilityNotes?: string[]
      - alternativeIndicator?: boolean
      - Leg minimal fields (schema-level canonical names & units):
      - mode: string
      - from: LocationRef
      - to: LocationRef
      - departureTime: string (ISO 8601 / RFC3339 timestamp)
      - arrivalTime: string (ISO 8601 / RFC3339 timestamp)
      - durationSeconds: number (non-negative; seconds)
      - distanceMeters?: number (meters)
      - lineRef?: string
      - realtimeDelaySeconds?: number (non-negative; seconds)
      - cancelled?: boolean
      - disruptionNote?: string
   - Time canonicalization: All timestamp fields at schema boundaries MUST use ISO 8601 / RFC3339 strings (e.g., "2025-09-18T08:00:00Z"). Do NOT adopt epoch milliseconds as the canonical representation in schema docs — epoch ms may be used internally if explicitly agreed and documented, but the public tool-level schemas and tests must declare ISO 8601 strings.
   - Edge rules: zero-distance legs are permitted only if durationSeconds ≥ 0; negative durations must be rejected at validation. Realtime status derivation helper remains a placeholder returning 'scheduled' for Phase 3.
5. GeocodeResult & Response:
   - Result fields: `id`, `name`, `coordinate`, optional `distanceMeters?` (focus proximity), `language?`, `type` (enum e.g. `address|stop|poi`).
   - Response: `{ results: GeocodeResult[], truncated: boolean, warnings?: Warning[] }`.
   - truncated semantics: The schema exposes `truncated: boolean` in GeocodeResponse but does NOT compute it from `results.length` alone. The `truncated` flag must be derived by the service/adapter layer using upstream metadata (e.g., upstream `total_count` or `meta.max_size`) or by comparing requested size vs. provider-declared max. Tests must assert that the service sets `truncated=true` when upstream indicates the result set was truncated (see `docs/geocoding-api.md` for max_size behavior).
6. Departure & Response:
   - Departure fields: `stopId`, `serviceDate` (YYYY-MM-DD), `scheduledTime`, `realtimeTime?`, `delaySeconds?`, `status` enum placeholder (`on-time|delayed|cancelled|unknown`).
   - Response ordering strictly ascending by (effective departure time).
   - Edge: negative delay disallowed (use zero floor) unless spec later allows early arrivals (document if change required).
7. UserVariable & Response:
   - Fields: `name: string` (kebab/camel allowed), `value: string|number|Coordinate|boolean|object (JSON serializable)`, `updatedAt: epoch ms`, `ttlExpiresAt?: epoch ms`.
   - Response collection sorted by `updatedAt` desc (later phases may finalize order).
   - TTL optional now; enforcement logic in store not schema.
8. Error & Warning:
   - Error shape: { code: kebab-case-string, message: string, hint?: string, correlationId?: string, retryAfter?: number }.
   - Warning shape: similar but without retryAfter.
   - Validate code regex: `^[a-z0-9]+(?:-[a-z0-9]+)*$` (C6).
   - Message length & redaction: The schema SHOULD allow message strings of reasonable length; provider message redaction/truncation is the responsibility of the unified error mapping layer (`src/infrastructure/errorMapping.ts`, task T043). Do not enforce strict ≤200 characters in the Zod schema; tests for redaction belong in error-mapping tests.

### Test Matrix Guidance (Mapping RED → GREEN)

| Area | Cases to Ensure GREEN | Related Tasks |
|------|-----------------------|---------------|
| Coordinate | min/max bounds, fractional, invalid types, NaN, Infinity | T031 |
| LocationRef | Each variant valid, missing required key, extra key rejection, unknown type | T032 |
| Constraints | Numeric boundary edges (0, large), negative rejection, unknown key | T033 |
| Itinerary | Leg array non-empty, time ordering, duration positive, realtime status placeholder | T034 |
| Geocode | truncated flag logic, ordering preserved, empty results allowed (tool will map error) | T035 |
| Departure | Ordering, status placeholder mapping not yet applied (Phase 5/6 adds logic) | T036 |
| UserVariable | Accept multiple value types, TTL optional, updatedAt presence | T037 |
| Error/Warning | Code format, optional fields, length constraints | T038 |
| Aggregation | All exports compile and types derive via z.infer | T039 |

### Performance & Memory Considerations

- Schemas should avoid heavy transformations; prefer `.transform` only where necessary (none required this phase except possible truncated computation if done inline).
- Fingerprint util (T047) must produce stable hash (sha1) O(n) over legs; ensure consistent ordering and exclude volatile fields (like delay) in Phase 3 to prevent later dedupe regressions (document fields used).
- Cache design (T046) LRU complexity O(1) operations; choose capacity constants (assumption: geocode 256 entries, itinerary collapse keyed on serialized request). Add TODO for configurability.

### Constitution Clause Mapping

| Clause | Enforcement in Phase 3 |
|--------|------------------------|
| C1 Test-First | Only implementing code after RED tests authored (Phases 1–2). |
| C5 Rate Limit & Retry | Rate limiter (T040) & retry policy (T041) implement capacity/attempt semantics. |
| C6 Unified Errors | Error schema (T038) and mapping (T043) centralize shapes & codes. |
| C14 Schema Discipline | All schemas in `src/schema/` with Zod; types exported via `z.infer`. |
| C13 Search Discipline | No ad-hoc directories beyond spec layout. |

### Implementation Order Recommendation (Granular)

1. Core primitives (T031) → union (T032) → constraints (T033).
2. Itinerary & Leg (T034) to unblock geocode & departures referencing location shapes.
3. Geocode & Departure schemas (T035–T036).
4. UserVariable, Error/Warning (T037–T038).
5. Export barrel (T039).
6. Infra sequence: RateLimiter → Retry → ErrorMapping → Logging → Store → Cache → Fingerprint (T040–T047).

### Edge / Failure Scenarios to Handle Now

- Acquire on rate limiter when empty returns false quickly (no await stall).
- Retry policy: exponential decorrelated jitter formula `sleep = min(cap, base * 2^attempt * randomFactor)` (document constants: base=100ms, cap=2000ms, randomFactor ∈ [0.5,1.0]).
- HTTP client placeholder: do not perform real network; ensure interface ready (tests stub underlying fetch/agent).
- Error mapping must gracefully handle unknown status (map to `unknown-error`).

### Deliverables

- Source files listed in tasks.
- Passing GREEN tests for T012–T027 scope.
- Updated documentation comments in each schema file summarizing fields & spec references.

## 3.2 Infrastructure / Store / Util Implementations

| ID | Status | Task | Acceptance Criteria | Spec Trace |
|----|--------|------|---------------------|------------|
| T040 | [ ] | Rate limiter `src/infrastructure/rateLimiter.ts` | Token bucket cap 30; refill 10/s; async acquire returns boolean; tests T020 pass | spec.md (C5) |
| T041 | [ ] [P] | Retry policy `src/infrastructure/retryPolicy.ts` | Decorrelated jitter exponential; max attempts 5; classification logic; tests T021 pass | spec.md (C5) |
| T042 | [ ] [P] | HTTP client `src/infrastructure/httpClient.ts` | Integrates rate limiter + retry; injects correlationId; timeout support; tests T022 pass | plan.md HTTP layer |
| T043 | [ ] [P] | Unified error mapping `src/infrastructure/errorMapping.ts` | Factory maps HTTP status→ internal code; redacts long provider msgs; tests T023 pass | spec.md (C6) |
| T044 | [ ] [P] | Logging interface `src/infrastructure/logging.ts` | Exports logToolInvocation(data); includes correlationId, durationMs; tests T027 pass | spec.md (C3) |
| T045 | [ ] [P] | User variable store `src/store/userVariableStore.ts` | set/get list; returns previous on overwrite; TTL purge lazy; tests T024 pass | user_variables.md |
| T046 | [ ] [P] | Cache implementations `src/infrastructure/cache.ts` | LRU (size TBD via constant); request collapsing ≤500ms window; tests T025 pass | plan.md caching section |
| T047 | [ ] [P] | Fingerprint util `src/util/fingerprint.ts` | Deterministic hash of itinerary; uniqueness on varied legs; tests T026 pass | plan_trip.md dedupe |

## Dependencies

- Schemas (T031–T039) implemented.
- HTTP client (T042) depends on rate limiter (T040) & retry (T041).
- Error mapping (T043) used by HTTP client optionally later by services.

## Exit Criteria

1. All Phase 2 tests related to schemas & infra GREEN.
2. No implementation of service logic (routing/geocoding) yet.
3. Error codes centralized; no duplication.
4. Rate limiter & retry measured in tests with fake timers (deterministic).

## Post-Phase Checklist

- [ ] All schema files include JSDoc with spec references.
- [ ] No `any` or implicit `any` (enforce with `tsc --noEmit` pass).
- [ ] Barrel export does not introduce circular dependencies (import graph review).
- [ ] Rate limiter & retry covered ≥95% branches (future coverage gate; note current coverage).
- [ ] Fingerprint excludes ephemeral realtime fields (documented).
