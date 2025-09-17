# Tasks Phase 5: Tool Implementations

Objective: Implement MCP tools that expose validated schemas & orchestrate service calls. Tools perform boundary validation, correlation ID creation, error mapping, warnings aggregation.

Legend: [ ] Pending | [P] Parallel-safe

| ID | Status | Task | Acceptance Criteria | References |
|----|--------|------|---------------------|------------|
| T052 | [ ] | plan_trip tool `src/tools/planTrip.ts` + register in `src/index.ts` | Validates input via schemas; invokes routing service; attaches realtimeUsed/simple scheduleType; returns itineraries array; unit + contract tests GREEN | contracts/plan_trip.md, routing-api.md |
| T053 | [ ] [P] | find_stops tool `src/tools/findStops.ts` | Validates radius & modes; truncation warning; returns stops subset | contracts/find_stops.md |
| T054 | [ ] [P] | get_departures tool `src/tools/getDepartures.ts` | Delay/status mapping consistent with contract tests; ordering; truncation warning | contracts/get_departures.md, realtime-apis.md |
| T055 | [ ] [P] | geocode_address tool `src/tools/geocodeAddress.ts` | Forwards to geocoding service; focus tie-break; sets truncated flag & warning; no-results error with code geocode-no-results | contracts/geocode_address.md |
| T056 | [ ] [P] | reverse_geocode tool `src/tools/reverseGeocode.ts` | Language fallback (simple chain); returns first viable candidate; no-results error | contracts/reverse_geocode.md |
| T057 | [ ] [P] | save_user_variable tool `src/tools/saveUserVariable.ts` | Saves & returns previous summary; coordinate validation; TTL placeholder field unchanged | contracts/user_variables.md |
| T058 | [ ] [P] | get_user_variables tool `src/tools/getUserVariables.ts` | Returns list ordered by updated time (desc or spec-defined); empty list safe | contracts/user_variables.md |

## Cross-Cutting Requirements

1. All tools emit unified errors (C6) and propagate correlationId.
2. Validation performed exactly once at boundary (C14).
3. Warnings array never null; empty = [].
4. Each tool unit + contract tests pass before moving to Phase 6.

## Detailed Validation Flow (Per Tool)

| Tool | Input Validation Steps | Additional Normalization | Output Post-Processing |
|------|------------------------|---------------------------|------------------------|
| plan_trip | Validate required: from, to, time (ISO8601), modes subset, constraints object. Reject if from==to (validation-error). | Clamp max itineraries (if size param) to internal cap (e.g., 10). | Add `scheduleType` placeholder (`scheduled` until realtime integrated). |
| find_stops | radius number in meters (0 < r ≤ 5000); modes optional array; center coordinate valid. | Trim modes duplicates; default radius if omitted (e.g., 500). | Sort by distance asc; slice to limit. |
| get_departures | stopId non-empty; limit within [1, 50]; includeRealtime boolean optional. | Default limit=10; coerce negative delay to 0. | Derive status: cancelled / delayed / on-time. |
| geocode_address | query string length 1–200; size within [1, 10]; focus optional coordinate. | Trim query; collapse internal whitespace to single space. | Set `truncated=true` if provider returned > size. |
| reverse_geocode | coordinate valid; languages optional array (ordered preference). | Deduplicate languages; append fallback `en` if missing. | Choose first candidate; expose chosen language code. |
| save_user_variable | key: /^[a-zA-Z0-9_\-]{1,64}$/; value length ≤ 4096; type accepted; coordinate variant validated if type indicates coordinate. | Lowercase key? (Decide – if yes, document; else preserve). | Return full stored variable with updatedAt. |
| get_user_variables | (no input fields except maybe pagination TBD) | N/A | Sort by updatedAt desc (or spec). |

Assumption: Where spec silent (e.g., radius default, lowercasing keys) decisions annotated with TODO and Constitution Clause C7 triggers update if later changed.

## Unified Error Codes Utilized (Phase 5 Scope)

| Code | Trigger Condition | HTTP Analog | Hint Provided? | Notes |
|------|-------------------|-------------|----------------|-------|
| validation-error | Schema validation fails or semantic rule (e.g., from==to). | 400 | Optional first failing field. | Never retried. |
| geocode-no-results | geocode_address or reverse_geocode zero results after filtering. | 404 | Suggest adjusting query or radius. | Not an internal failure. |
| user-variable-too-large | value exceeds allowed length (if enforced). | 413 | State max length. | Optional; implement if limit active. |
| unsupported-language | reverse_geocode language list all rejected. | 400 | Suggest removing language filter. | May not appear if fallback covers. |

Retry-eligible errors (429/5xx) occur only beneath service layer; tool boundary maps them—Phase 5 does not introduce new retry behavior logic.

## Warnings Taxonomy (Initial)

| Warning Code | Emitted By | Condition | Action for Client |
|--------------|------------|-----------|------------------|
| truncated-results | geocode_address, find_stops, get_departures | Upstream > requested size; response sliced | Consider increasing size parameter. |
| language-fallback | reverse_geocode | Preferred language unavailable → fallback used | Display original + chosen fallback to user. |
| key-overwritten | save_user_variable | Existing key replaced | Decide if user wants audit trail. |
| no-itineraries | plan_trip | Zero itineraries returned (not error) | Prompt user to adjust time/modes. |

Warnings array ordering: chronological emission order; no duplicates (dedupe by code when generating). If multiple truncated contexts could occur, emit once.

## Correlation & Logging Hooks

- Generate `correlationId` (UUID v4 or nanoid) once per tool invocation if not already present in context. Attach to error responses (C6) and (future) success metadata.
- Logging (future Phase): structure (tool, correlationId, durationMs, errorCode?). For now: add TODO comment in each tool root.

## Example Payloads & Responses

plan_trip Request:

```json
{
  "from": { "lat": 60.1699, "lon": 24.9384 },
  "to": { "lat": 60.2055, "lon": 24.6559 },
  "time": "2025-09-17T08:00:00Z",
  "modes": ["BUS", "TRAM"],
  "constraints": { "maxItineraries": 3 }
}
```

plan_trip Success (truncated excerpt):

```json
{
  "itineraries": [
    { "durationSeconds": 900, "legs": [{ "mode": "BUS", "line": "550" }] }
  ],
  "scheduleType": "scheduled",
  "warnings": []
}
```

geocode_address No Results Error:

```json
{
  "error": { "code": "geocode-no-results", "message": "No geocoding matches found", "hint": "Broaden the query or adjust focus." }
}
```

reverse_geocode Fallback Warning:

```json
{
  "result": { "name": "Helsinki Central", "language": "en" },
  "warnings": [{ "code": "language-fallback", "message": "Preferred fi not available; used en." }]
}
```

save_user_variable Overwrite Response:

```json
{
  "variable": { "key": "home", "value": "Kamppi", "updatedAt": "2025-09-17T07:59:00.000Z" },
  "warnings": [{ "code": "key-overwritten", "message": "Existing variable replaced." }]
}
```

## Testing Strategy

| Test Category | Focus | Notes |
|---------------|-------|-------|
| Unit (tool) | Validation path: success + each failure branch | Use minimal mocks of services. |
| Contract | Ensure returned shape matches spec (snapshot subset) | Avoid brittle ordering of object keys. |
| Warning emission | Trigger truncated & fallback scenarios | Force upstream over-size arrays. |
| Error mapping | validation-error, geocode-no-results, unsupported-language | Semantic equality on code/message. |
| Overwrite semantics | save/get user variables roundtrip | updatedAt increases; warning emitted. |

## Constitution Clause Mapping

| Clause | Application in Phase 5 |
|--------|-----------------------|
| C1 | Tests first for each tool before implementation logic. |
| C5 | Tools abstain from duplicating retry logic (handled infra). |
| C6 | Unified error codes returned on all failures. |
| C13 | Consistent file placement under `src/tools`. |
| C14 | Single boundary validation with Zod; internal logic assumes typed. |

## Acceptance Criteria

- All tool tests GREEN (unit + contract) with warnings & error cases covered.
- No duplicate validation logic; boundary schemas imported rather than redefined.
- Warnings taxonomy implemented where conditions met; absent otherwise.
- Correlation ID generation placeholder present (TODO if not yet surfaced externally).
- Example payloads align with schemas (spot checked).

## Open Questions / TODOs

| Topic | Question | Impact | Action |
|-------|----------|--------|--------|
| Key normalization | Lowercase user variable keys? | Consistency vs user intent | Decide & document before Phase 6. |
| Max itineraries cap | Enforce explicit upper bound? | Prevent perf issues | Define in spec if needed. |
| Language fallback ordering | Guarantee inclusion of 'en'? | Internationalization completeness | Confirm with spec owner. |
| Warning dedupe strategy | Merge identical codes? | Noise reduction | Implement simple set filter. |
