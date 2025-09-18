# Tasks Phase 4: Service Layer Implementation

Objective: Provide service abstractions over infrastructure (HTTP, retry, rate limiting, logging) for routing, geocoding, departures, user variables. Services translate contract-level schemas to upstream requests & normalize responses. No tool orchestration (Phase 5).

Legend: [ ] Pending | [P] Parallel-safe

## Tasks

| ID | Status | Task | Acceptance Criteria | References |
|----|--------|------|---------------------|------------|
| T048 | [ ] | Routing service `src/services/routingService.ts` | Builds OTP/Digitransit GraphQL query; accepts PlanConstraints; returns normalized itinerary DTO array including realtime metadata (see notes); provides dedupe hooks and enforces itinerary deduplication per spec (fingerprint) | [`docs/routing-api.md`](docs/routing-api.md:1), [`specs/001-opentripplanner-mcp-server/contracts/plan_trip.md`](specs/001-opentripplanner-mcp-server/contracts/plan_trip.md:1) |
| T049 | [ ] [P] | Geocoding service `src/services/geocodingService.ts` | forwardGeocode(), reverseGeocode(); applies size truncation & sets truncated flag; implements per-service language fallback (requested → fi → en) at Phase 4; returns schema-compliant objects | [`docs/geocoding-api.md`](docs/geocoding-api.md:1), [`specs/001-opentripplanner-mcp-server/contracts/geocode_address.md`](specs/001-opentripplanner-mcp-server/contracts/geocode_address.md:1) |
| T050 | [ ] [P] | Departures service `src/services/departuresService.ts` | fetchDepartures(stopIds,...); maps delays → status; sorts departures chronologically; returns truncated warning/metadata if exceed size; includes realtime metadata flags | [`docs/realtime-apis.md`](docs/realtime-apis.md:1), [`specs/001-opentripplanner-mcp-server/contracts/get_departures.md`](specs/001-opentripplanner-mcp-server/contracts/get_departures.md:1) |
| T051 | [ ] [P] | User variables service `src/services/userVariablesService.ts` | save(name,value) returns previous summary; list() returns ordered list; enforces coordinate validation using schemas; TTL behaviour implemented in store consistent with spec (24h inactivity) | [`specs/001-opentripplanner-mcp-server/contracts/user_variables.md`](specs/001-opentripplanner-mcp-server/contracts/user_variables.md:1) |

## Design Notes

- All network calls pass through HTTP client (T042) to ensure rate limiting & retries (C5).
- CorrelationId generated at tool entry later; passed into each service for logging.
- Services return pure data (no side-effects) enabling deterministic tests.

### Service Responsibilities & Contracts

| Service | Public Methods (Phase 4) | Inputs | Outputs | Error Codes (C6) | Notes |
|---------|--------------------------|--------|---------|------------------|-------|
| routingService | `planTrip(request, ctx)` | `request: validated PlanTripInput (schemas), ctx: { correlationId, lang? }` | `{ itineraries: Itinerary[], realtime_used: 'realtime'&#124;'scheduled'&#124;'mixed', data_freshness?: string (ISO 8601) }` | `upstream-timeout`, `upstream-error`, `unknown-error`, `rate-limited` | GraphQL query builder; enforces dedupe (fingerprint) per spec (uniqueness = leg sequence + start-time delta >= 120s). Supports long-running request pattern: for initial computation >5s return operation_id and allow polling (see spec FR-034). |
| geocodingService | `forward(query, opts)` / `reverse(coord, opts)` | query string + { size, focus?, lang? } / Coordinate + { lang? } | `{ results: GeocodeResult[], truncated: boolean }` | `geocode-upstream-error`, `upstream-timeout` | Fallback chain for language left stub (Phase 6 centralization). |
| departuresService | `getDepartures(params, ctx)` | { stopIds: string[], startTime?, limit? } | `{ departures: Departure[], truncated?: boolean }` | `upstream-timeout`, `upstream-error` | Status mapping minimal (delay→delayed if delay>0, cancelled if flag). |
| userVariablesService | `save(name,value,ctx)` / `list(ctx)` | name: string, value: JSON/Coordinate | `{ previous?: UserVariable, current: UserVariable }` / `{ variables: UserVariable[] }` | `validation-error` | Wraps in-memory store; TTL management in store. |

### Retry & Rate Limit Integration

| Concern | Mechanism | Implementation Detail | Test Hook |
|---------|-----------|-----------------------|-----------|
| Rate Limiting | Token bucket (T040) | Acquire token in HTTP client before outbound HTTP. Token-bucket parameters (Phase 4 normative): capacity=30, refill=10 tokens/sec (baseline 10 rps with burst up to 30). If token not immediately available, wait a short configurable grace (default 100ms). If still unavailable return standardized error `rate-limited` with `retryAfter` when known. Tests should cover both successful acquisition and exhaustion scenarios. | Mock bucket depletion scenario |
| Retries | Exponential (decorrelated) jitter (T041) | Retry only on 429, 5xx, and network errors. Max attempts = 5. Do NOT retry validation errors or 4xx (except 429). Include retry metadata in error/warning objects. | Simulate sequence: 500, 502, 200 → attempts=3 |
| Correlation | Pass ctx.correlationId header `x-correlation-id` | Logging captures alongside tool name later | Assert header injection via mock HTTP |
| Timeout | Abort signal after configured ms (HTTP-level; default 4000ms); service-level orchestration follows FR-034 (if total computation >5s return operation_id and support polling; hard timeout 10s) | Map HTTP timeout to `upstream-timeout` error; orchestration handles operation_id pattern | Simulate delayed promise |

### Error Mapping (replacement block)

Map upstream HTTP status to internal codes (subset; full table evolves). Errors MUST be objects matching: `{ code, message, hint?, correlationId?, retryAfter? }` (kebab-case `code` values). Example mappings:

| Status | Code | Hint |
|--------|------|------|
| 400 | `upstream-bad-request` | Possibly invalid provider params |
| 401 | `upstream-unauthorized` | Missing/invalid API key |
| 403 | `upstream-forbidden` | Key lacks permission |
| 404 | `upstream-not-found` | Resource missing |
| 408 / timeout | `upstream-timeout` | Increase timeout or retry later |
| 429 | `rate-limited` | Retry after delay (retryAfter if provided) |
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
