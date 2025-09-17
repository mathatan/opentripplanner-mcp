# Tasks Phase 4: Service Layer Implementation

Objective: Provide service abstractions over infrastructure (HTTP, retry, rate limiting, logging) for routing, geocoding, departures, user variables. Services translate contract-level schemas to upstream requests & normalize responses. No tool orchestration (Phase 5).

Legend: [ ] Pending | [P] Parallel-safe

## Tasks

| ID | Status | Task | Acceptance Criteria | References |
|----|--------|------|---------------------|------------|
| T048 | [ ] | Routing service `src/services/routingService.ts` | Builds OTP/Digitransit GraphQL query; accepts PlanConstraints; returns normalized itinerary DTO array; hooks for dedupe (fingerprint) | routing-api.md, plan_trip.md |
| T049 | [ ] [P] | Geocoding service `src/services/geocodingService.ts` | forwardGeocode(), reverseGeocode(); applies size truncation & sets truncated flag; language fallback stub; returns schema-compliant objects | geocoding-api.md |
| T050 | [ ] [P] | Departures service `src/services/departuresService.ts` | fetchDepartures(stopIds,...); maps delays → status; sorts departures chronologically; returns truncated warning if exceed size | realtime-apis.md, get_departures.md |
| T051 | [ ] [P] | User variables service `src/services/userVariablesService.ts` | save(name,value) returns previous summary; list() returns ordered list; enforces coordinate validation using schemas | user_variables.md |

## Design Notes

- All network calls pass through HTTP client (T042) to ensure rate limiting & retries (C5).
- CorrelationId generated at tool entry later; passed into each service for logging.
- Services return pure data (no side-effects) enabling deterministic tests.

### Service Responsibilities & Contracts

| Service | Public Methods (Phase 4) | Inputs | Outputs | Error Codes (C6) | Notes |
|---------|--------------------------|--------|---------|------------------|-------|
| routingService | `planTrip(request, ctx)` | request: validated PlanTripInput (schemas), ctx: { correlationId, lang? } | `{ itineraries: Itinerary[] }` | `upstream-timeout`, `upstream-error`, `unknown-error` | GraphQL query builder; no dedupe yet (Phase 6). |
| geocodingService | `forward(query, opts)` / `reverse(coord, opts)` | query string + { size, focus?, lang? } / Coordinate + { lang? } | `{ results: GeocodeResult[], truncated: boolean }` | `geocode-upstream-error`, `upstream-timeout` | Fallback chain for language left stub (Phase 6 centralization). |
| departuresService | `getDepartures(params, ctx)` | { stopIds: string[], startTime?, limit? } | `{ departures: Departure[], truncated?: boolean }` | `upstream-timeout`, `upstream-error` | Status mapping minimal (delay→delayed if delay>0, cancelled if flag). |
| userVariablesService | `save(name,value,ctx)` / `list(ctx)` | name: string, value: JSON/Coordinate | `{ previous?: UserVariable, current: UserVariable }` / `{ variables: UserVariable[] }` | `validation-error` | Wraps in-memory store; TTL management in store. |

### Retry & Rate Limit Integration

| Concern | Mechanism | Implementation Detail | Test Hook |
|---------|-----------|-----------------------|-----------|
| Rate Limiting | Token bucket (T040) | Acquire before outbound HTTP; if denied → immediate error code `rate-limit-exhausted` (optional early) or await? (Decision: non-blocking immediate error to keep deterministic tests) | Mock bucket depletion scenario |
| Retries | Decorrelated jitter (T041) | Only on: 429, 5xx, network errors. Max 5 attempts. No retry on validation / 4xx (except 429). | Simulate sequence: 500, 502, 200 → attempts=3 |
| Correlation | Pass ctx.correlationId header `x-correlation-id` | Logging captures alongside tool name later | Assert header injection via mock HTTP |
| Timeout | Abort signal after configured ms (e.g., 4000ms default) | Map to `upstream-timeout` error | Simulate delayed promise |

### Error Mapping (Phase 4 Scope)

Map upstream HTTP status to internal codes (subset; full table evolves):

| Status | Code | Hint |
|--------|------|------|
| 400 | `upstream-bad-request` | Possibly invalid provider params |
| 401 | `upstream-unauthorized` | Missing/invalid API key |
| 403 | `upstream-forbidden` | Key lacks permission |
| 404 | `upstream-not-found` | Resource missing |
| 408 / timeout | `upstream-timeout` | Increase timeout or retry later |
| 429 | `upstream-rate-limited` | Retry after delay (retryAfter if provided) |
| 5xx | `upstream-error` | Provider temporary issue |
| other | `unknown-error` | Generic fallback |

### Normalization Rules

#### Routing

- Convert provider modes to canonical enum (e.g., `BUS`, `TRAM`, `WALK`). Unknown → `OTHER` with warning (warning surfaced in later phase if needed).
- Duration = sum(leg.endTime - leg.startTime).

#### Geocoding

- Preserve provider ordering; only truncate if > size.
- Normalize coordinate precision (no rounding now).

#### Departures

- Effective departure time = realtimeTime || scheduledTime.
- Simple status mapping Phase 4: if `cancelled` flag true → `cancelled`; else if delaySeconds>0 → `delayed`; else `on-time`. (Advanced mixed logic Phase 6).

#### User Variables

- Save overwrites previous; updatedAt = Date.now() injected (allow clock injection in tests).

### Testing Strategy

| Service | Unit Tests | Integration Stubs | Edge Cases |
|---------|------------|-------------------|-----------|
| routingService | GraphQL fragment assembly; itinerary field normalization | Mock HTTP returns minimal itinerary JSON | Empty itinerary array, single leg, out-of-order legs sorted upstream? (assume upstream sorted) |
| geocodingService | Truncation, size=0 (return empty), focus candidate ordering preserved | Mock returns >size results | Unknown type field ignored vs error? ensure schema rejects unknown type if strict |
| departuresService | Delay→status mapping correctness, time ordering | Mock returns mixed times unsorted → service sorts | Cancelled overshadowing delay |
| userVariablesService | Overwrite previous; list ordering; various value types | Direct store stub | TTL field unaffected (null) |

### Constitution Clause Mapping

| Clause | Phase 4 Enforcement |
|--------|--------------------|
| C1 | Services implemented only after RED tests exist. |
| C5 | Retry + rate limiting integrated; tests assert behavior. |
| C6 | Errors generated via centralized mapping, not ad-hoc. |
| C3 (future observability) | Correlation ID plumbed ready for logging. |
| C14 | Input types derived from schemas; no duplicate validation. |

### Implementation Order Suggestion

1. UserVariables (simplest; no network)
2. Geocoding (straightforward normalization)
3. Departures (adds status mapping)
4. Routing (GraphQL builder last—depends on constraints + itinerary schema)

### Deliverables

- Service source files with JSDoc referencing spec sections.
- Updated tests (or new service tests) passing.
- No direct console/log usage—only exported logger hooks.

## Exit Criteria

1. Unit tests (GREEN) for services (can extend existing contract tests or add new service-level tests).
2. No direct stdout / logging (only via injected logger).
3. All relevant schema types consumed via z.infer (C14).
