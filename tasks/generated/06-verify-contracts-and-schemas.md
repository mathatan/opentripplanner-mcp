# Tasks: Verify Contracts, Schemas, and Schema Tests — Sanity & Groundedness

Purpose: Provide a reproducible checklist to validate the MCP contracts and TypeScript schemas (including their tests) for correctness, consistency, and grounding against authoritative docs.

---

## Inputs

- Contracts: `specs/001-opentripplanner-mcp-server/contracts/`
  - `find_stops.md`
  - `geocode_address.md`
  - `get_departures.md`
  - `plan_trip.md`
  - `reverse_geocode.md`
  - `user_variables.md`
- Schemas: `src/schema/`
  - `coordinate.ts`, `locationRef.ts`, `geocode.ts`, `itinerary.ts`, `departure.ts`, `planConstraints.ts`, `userVariable.ts`, `error.ts`
- Schema tests: `tests/schema/`
  - `coordinate.schema.test.ts`, `locationRef.schema.test.ts`, `geocode.schema.test.ts`, `itinerary.schema.test.ts`, `departure.schema.test.ts`, `planConstraints.schema.test.ts`, `userVariable.schema.test.ts`, `error.schema.test.ts`, `findStops.schema.test.ts`, `geocodeAddress.schema.test.ts`, `planTrip.schema.test.ts`
- Data-model (grounding): `specs/001-opentripplanner-mcp-server/data-model.md`
- Project docs (grounding): `docs/`
  - `routing-api.md`, `routing-data-api.md`, `geocoding-api.md`, `map-api.md`, `realtime-apis.md`
- External source of truth (Context7-tool): OpenTripPlanner
  - Library: `/opentripplanner/opentripplanner`

---

## Phase Scope Notes

- Realtime features are not implemented in this phase. Treat all realtime-related checks as Optional-Phase1 or Deferred-Phase1: document shapes and optional fields, but do not require presence or emission in code/tests yet.
- Mapping (map rendering, map API integration, and geometry-specific outputs like leg polylines) is not implemented in this phase. Skip any verification that depends on `map-api.md` or geometry payloads; ensure schemas do not require these fields.

---

## What to verify in each Analyze step

- Field names and types strictly match the contracts and OTP domain expectations (camelCase, units, enumerations).
- Required vs optional fields match the contract and intended behavior; defaults documented.
- Coordinate semantics (WGS84 lat/lon order, ranges, precision) and CRS assumptions are explicit and consistent.
- Time semantics (timezone, epoch vs ISO 8601, seconds vs milliseconds) are consistent across contracts, schemas, and tests.
- Error taxonomy is aligned with repository policy and usage (kebab-case codes, redaction, hints).
- Realtime vs scheduled semantics are clear for departures and itineraries; dataFreshness and scheduleType are represented when applicable.
- Zod schema constraints reflect all invariants asserted in contracts (min/max, regex, union shape, discriminants) and OTP expectations.
- Tests assert both happy-path and edge cases, including negative cases for validation errors; ensure coverage for discriminated unions and boundary conditions.

---

## Execution Flow (main)

For each target (contract, schema, test):

1. Compare against specified data model in `specs/001-opentripplanner-mcp-server/data-model.md`  internal docs in `docs/` and OTP docs via Context7 (`/opentripplanner/opentripplanner`).
2. Note mismatches or ambiguities; propose minimal fix that keeps public contract stable when possible.
3. If public contract must change, flag as breaking (SemVer) and reference Constitution clauses where relevant.
4. For schemas, ensure Zod mirrors the contract exactly; for tests, ensure expectations match the Zod runtime behavior.

Format for tasks: `[ID] [P?] Description` — IDs are unique, P? optional priority marker.

---

## Contracts — Analyze + Fix

- [ ] V-C-001 Analyze + Fix `specs/001-opentripplanner-mcp-server/contracts/find_stops.md` against data model, `docs/` and OTP
  - Verify stop fields (id, name, lat/lon, code, modes), search bounding parameters, pagination, and sorting semantics.
- [ ] V-C-002 Analyze + Fix `specs/001-opentripplanner-mcp-server/contracts/geocode_address.md` against data model, `docs/` and OTP
  - Verify input address shape, language fallback, limit (`size` cap 40 → truncated=true + warning), focus point/bounds, and output candidates with confidence.
  - Ensure output fields include Pelias-aligned properties where available: `label`, `gid`, `rawLayer`, `rawSource`, `sourceId`, `distanceKm`, and optional `zones`.
- [ ] V-C-003 Analyze + Fix `specs/001-opentripplanner-mcp-server/contracts/reverse_geocode.md` against data model, `docs/` and OTP
  - Verify radius behavior, feature prioritization (stops vs POIs), and coordinate precision.
  - Confirm Pelias field mapping in output (`label`, `gid`, `rawLayer`, `rawSource`, `sourceId`, `distanceKm`, `zones?`) and language propagation.
- [ ] V-C-004 Analyze + Fix `specs/001-opentripplanner-mcp-server/contracts/get_departures.md` against data model, `docs/` and OTP
  - Optional-Phase1: Realtime freshness window and handling (`dataFreshness`, `realtimeUsed`, `realtime-missing` warning). Document shapes, do not require runtime emission.
  - Verify `scheduleType` semantics (documented only), stop selection, time windows, grouping by pattern/line, and cancellations (documented shape), without requiring live realtime.
- [ ] V-C-005 Analyze + Fix `specs/001-opentripplanner-mcp-server/contracts/plan_trip.md` against data model, `docs/` and OTP
  - Verify modes, wheelchair/step-free constraints (AccessibilityPrefs.wheelchair), walk/bike/scooter limits, transfers, itinerary dedup, and time targets.
  - Ensure pagination knobs and hints are covered: `first` (soft cap, default 2, 1..5) and optional `searchWindowMinutes`.
  - Optional-Phase1: Leg-level realtime mapping (estimated times to `realtimeDelaySeconds`, `status`, coarse `realtimeState`), and response-level `realtimeUsed`/`dataFreshness`. Document but do not require runtime emission.
- [ ] V-C-006 Analyze + Fix `specs/001-opentripplanner-mcp-server/contracts/user_variables.md` against data model, `docs/` and OTP
  - Verify TTL semantics, allowed value types, privacy notes, and retrieval/filtering behaviors.

---

## Schemas — Analyze + Fix

- [ ] V-S-001 Analyze + Fix `src/schema/coordinate.ts`
  - Confirm that the schema matches defined contracts and data model.
- [ ] V-S-002 Analyze + Fix `src/schema/locationRef.ts`
  - Confirm that the schema matches defined contracts and data model.
- [ ] V-S-003 Analyze + Fix `src/schema/geocode.ts`
  - Confirm that the schema matches defined contracts and data model.
  - Ensure `GeocodeResponse.size?` is supported and capped at 40 with `truncated` flag semantics.
  - Ensure `GeocodeResult` supports Pelias-aligned fields: `label?`, `gid?`, `sourceId?`, `rawLayer?`, `rawSource?`, `distanceKm?`, `zones?`.
- [ ] V-S-004 Analyze + Fix `src/schema/itinerary.ts`
  - Confirm that the schema matches defined contracts and data model.
  - Optional-Phase1: Keep leg-level realtime metadata as optional fields only; tests need not assert presence. `realtimeState? ('updated'|'scheduled'|'no_data')`, `lastRealtimeUpdate?: string` (ISO).
- [ ] V-S-005 Analyze + Fix `src/schema/departure.ts`
  - Confirm that the schema matches defined contracts and data model.
- [ ] V-S-006 Analyze + Fix `src/schema/planConstraints.ts`
  - Confirm that the schema matches defined contracts and data model.
  - Include `first?: number` (default 2, range 1..5) and optional `searchWindowMinutes?: number`. Add `AccessibilityPrefs.wheelchair?: boolean`.
- [ ] V-S-007 Analyze + Fix `src/schema/userVariable.ts`
  - Confirm that the schema matches defined contracts and data model.
- [ ] V-S-008 Analyze + Fix `src/schema/error.ts`
  - Confirm that the schema matches defined contracts and data model.
  - Ensure canonical codes include `realtime-missing` and `rate-limited` supports `retryAfter?: number` seconds.

---

## Schema Tests — Analyze + Fix

- [ ] V-T-001 Review `tests/schema/coordinate.schema.test.ts`
  - Ensure schema tests for boundary and invalid cases for lat/lon ranges and precision.
- [ ] V-T-002 Review `tests/schema/locationRef.schema.test.ts`
  - Ensure schema tests for discriminant enforcement and mutual exclusivity validation failures.
- [ ] V-T-003 Review `tests/schema/geocode.schema.test.ts`
  - Ensure schema tests for candidate structure, language fallback, and bounds/focus validation.
  - Add tests for `size` capping at 40, `truncated: true` when requested size > 40, and presence of `label`, `gid`, `rawLayer`, `rawSource`, `sourceId`, `distanceKm`, `zones?` when provided by upstream.
- [ ] V-T-004 Review `tests/schema/itinerary.schema.test.ts`
  - Ensure schema tests for legs array validation, realtime flags, units, and fingerprint behavior.
  - Optional-Phase1: If present, validate shape of leg-level `realtimeState` and `lastRealtimeUpdate` (ISO), but do not require presence or specific values.
- [ ] V-T-005 Review `tests/schema/departure.schema.test.ts`
  - Ensure schema tests for realtime delay/cancellation, scheduleType, and timestamp handling.
- [ ] V-T-006 Review `tests/schema/planConstraints.schema.test.ts`
  - Ensure schema tests for constraints lower/upper bounds and conflicting flags.
  - Add tests for `first` (default 2, range enforced 1..5) and optional `searchWindowMinutes` (reasonable range; if enforced).
- [ ] V-T-007 Review `tests/schema/userVariable.schema.test.ts`
  - Ensure schema tests for TTL behavior, allowed value types, and metadata fields.
- [ ] V-T-008 Review `tests/schema/error.schema.test.ts`
  - Ensure schema tests for kebab-case codes and redaction limits enforced.
  - Add a test case for `realtime-missing` code and `retryAfter` semantics on `rate-limited`.
- [ ] V-T-009 Review `tests/schema/findStops.schema.test.ts`
  - Ensure schema tests for search parameters, pagination, and sorting cases.
- [ ] V-T-010 Review `tests/schema/geocodeAddress.schema.test.ts`
  - Ensure schema tests for address input variants, localization, and limits.
- [ ] V-T-011 Review `tests/schema/planTrip.schema.test.ts`
  - Ensure schema tests for modes/constraints coverage and time target (arriveBy/departAt) behavior.

---

## Cross-Cutting Consistency — Analyze + Fix

- [ ] V-X-001 Coordinate order and CRS are consistent across all contracts, schemas, and tests.
- [ ] V-X-002 Time handling: all timestamps documented as epoch milliseconds or ISO 8601 consistently; timezone noted.
- [ ] V-X-003 Realtime semantics: `scheduleType`, `dataFreshness` fields consistent with `realtime-apis.md` and OTP.
  - Optional-Phase1: Document semantics; do not require runtime emission of realtime fields.
- [ ] V-X-004 Error taxonomy: codes, messages, hints follow repo rules and are used consistently in contracts and schemas.
- [ ] V-X-005 Enumerations/modes: values and casing align with OTP; unions are exhaustive with `never` checks where applicable.
- [ ] V-X-006 Public contract changes: if any are required, mark as breaking (C7), add tests (C1, C2), and update specs accordingly.
- [ ] V-X-007 Units and ranges: meters vs kilometers consistently used (e.g., walkingDistance meters, geocode distanceKm), and numeric bounds enforced.
- [ ] V-X-008 Warnings taxonomy: ensure `truncated-results` and `realtime-missing` warnings appear where expected and are documented.
- [ ] V-X-009 Realtime layering: leg-level `realtimeState`/`lastRealtimeUpdate` and response-level `realtimeUsed`/`dataFreshness` are consistent and non-contradictory.

---

## Dependencies

- Per-file tasks are independent. Cross-cutting tasks (V-X-001..006) should be executed after individual analyses to consolidate fixes.

## Notes

- Keep fixes minimal and backward-compatible. If a schema needs tightening without breaking consumers, prefer additive constraints.
- When tests reveal mismatches with OTP expectations, prioritize aligning with OTP source-of-truth unless a deliberate divergence is documented in `specs/`.
- Reference Constitution Clauses for changes:
  - C1 (Test-First), C2 (Integration Triggers), C5 (Rate Limit & Retry — relevant for future services), C6 (Unified Errors), C7 (Versioning), C14 (TypeScript & Schema Discipline).

---

Generated on 2025-09-18
