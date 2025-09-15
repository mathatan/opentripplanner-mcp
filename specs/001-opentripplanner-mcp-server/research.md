# Phase 0 Research: OpenTripPlanner MCP Server

Date: 2025-09-15
Branch: 001-opentripplanner-mcp-server

## 1. Digitransit API Integration Patterns & Rate Limiting

### 1.1 Endpoints & Domains

- Routing (GraphQL): `https://api.digitransit.fi/routing/v1/finland/graphql` (regional path segment may vary; single endpoint with region selection inside query via feed IDs / scope)
- Geocoding (REST): `https://api.digitransit.fi/geocoding/v1/{search|reverse|autocomplete}`
- Realtime (implicit via GraphQL leg / trip realtime fields; GTFS‑RT feeders internal to Digitransit) — we will not pull GTFS‑RT directly; rely on GraphQL enriched itinerary data.

### 1.2 Authentication

- Header: `digitransit-subscription-key: <KEY>` required for all routing + geocoding requests.
- Strategy: Centralized key injection middleware; disallow accidental logging of key (mask in logs). Environment variable: `DIGITRANSIT_API_KEY` (validate at startup).

### 1.3 Rate Limiting Strategy (Client-Side)

- Stated public guidance: 10 requests/second soft limit. We enforce a token bucket (capacity 30 to allow short bursts, refill 10 tokens/s).
- Retry policy: Exponential backoff with decorrelated jitter (base 200ms, max ~2.5s, 5 attempts) on HTTP 429 or transient 5xx.
- Circuit-breaker (optional enhancement) for repeated 5xx (e.g., open after 10 failures in rolling 30s; half-open probe after backoff).
- Telemetry counters: `rateLimit.tokensRemaining`, `retry.attempts`, `429.count`.

### 1.4 Caching & Conditional Requests

- GraphQL: Limited benefit; consider short-lived (<=5s) per identical itinerary query caching keyed by (origin,destination, time, constraints hash) to collapse bursts.
- Geocoding: Cache successful forward/reverse lookups (normalized query hash or lat/lon rounded to 5 decimal places) for 10 minutes (LRU size bound ~500 entries). Include language and bounding constraints in key.
- Avoid stale realtime: NEVER cache realtime legs beyond 15–30s; add freshness timestamp.

### 1.5 Pagination & Complexity Control

- Use `first` and cursor fields (`endCursor`) for additional itineraries. Cap requested itineraries at 3 for performance; post-filter duplicates.
- Keep GraphQL selections minimal: only fields required to assemble standardized MCP contract (avoid full stop or route expansions unless necessary).

## 2. MCP SDK Best Practices (Tools Implementation)

### 2.1 Tool Definition Principles

- Each MCP tool exports: name, description, schema (Zod), handler async function.
- Shared error utility: `makeError(code: string, message: string, hint?: string)` returning standardized object.
- Input schemas strongly typed; generate TypeScript types via `z.infer`.
- Use discriminated unions for operations (e.g., user variable operations if combined) or separate tools for clarity.

### 2.2 Context & Cancellation

- Support abort via `AbortController` integrated with MCP request context if provided.
- Timeouts: Wrap external HTTP calls with per-call timeout (e.g., 5s geocoding, 8s routing) enforcing constitution performance goals.

### 2.3 Logging Hooks

- Provide a pluggable logger interface (default console) capturing: tool_name, start_ts, duration_ms, success, error_code, retries, upstream_calls.

### 2.4 Validation Flow

1. Parse & refine using Zod.
2. On failure, convert issues → `validation-error` code listing missing/invalid path segments.
3. Do not partially execute on validation failure.

### 2.5 Testing Pattern (TDD)

- Write Vitest unit spec for each tool: input validation, success path (stub HTTP), error paths (429, 5xx, invalid key, validation error).
- Integration tests hitting live API behind opt-in flag or using recorded fixtures (VCR style) to stabilize CI.

## 3. Real-Time Data Handling for Transit

### 3.1 Freshness Tracking

- Extract realtime indicators from itinerary legs/trips: fields like `realtimeState`, delays (seconds). Derive `schedule_type` (realtime|scheduled|mixed) and `realtime_used` boolean.
- Provide `data_freshness`: latest `lastUpdateTime` across legs (fallback to current timestamp with `scheduled-only`).

### 3.2 Disruption & Cancellation

- Use `canceledTrips` query selectively (not per plan unless disruption suspected) — future optimization. Initially rely on leg/trip realtime/canceled flags accessible in plan query; if absent, consider separate query.
- Itinerary level `disruption_flag` if any leg has cancellation or severe delay (> 5 min) vs schedule.
- Provide alternative itinerary when disruption detected (request +1 itinerary or broaden `searchWindow`).

### 3.3 Degradation Modes

- No realtime fields → label itinerary as scheduled; include hint: "Realtime not available; using scheduled timetable data.".

### 3.4 Performance

- Avoid chaining multiple full GraphQL queries; prefer single `planConnection` query selecting required leg fields.

## 4. Error Handling Patterns for External API Failures

| Scenario | Detection | Response Mapping | Retry? |
|----------|-----------|------------------|--------|
| 401/403 invalid key | HTTP status | `auth-failed` | No |
| 429 rate limited | HTTP 429 | `rate-limited` + retry_after | Yes (backoff) |
| 5xx transient | 500–599 | `upstream-error` | Yes (backoff) |
| Timeout | Abort/timeout | `upstream-timeout` | Maybe (one retry) |
| Network DNS/ECONNRESET | Error code | `network-error` | Yes (limited) |
| Malformed GraphQL errors | errors[] array | Map first error type → `upstream-error` or domain-specific | Possibly |
| Empty itinerary set | 200 with empty edges | `no-itinerary-found` (with remediation suggestions) | No |
| Invalid region code | Pre-validation | `unsupported-region` | No |
| Geocode no results | 200 empty features | `geocode-no-results` (with suggestions if fuzzy alt query run) | No |

### 4.1 Correlation IDs

- Generate UUID v4 per tool invocation; include in logs & error.correlationId for traceability.

### 4.2 Partial Failures

- If auxiliary call (e.g., alternate itinerary) fails but primary succeeds: return primary with `warnings: []` array containing structured warning objects.

## 5. Performance Optimization for GraphQL Queries

### 5.1 Field Minimization

Select only: itinerary start/end timestamps, legs (mode, start/end times, distance, duration, fromStop basic info, toStop basic info, realtimeState/delay, route/line shortName, trip id). Exclude emissions, vehicle positions initially unless required.

### 5.2 Batching & De-Duplication

- Collapse identical `plan_trip` requests within a 500ms window (debounce map) to single upstream call distributing result promises.
- Use persistent HTTP/2 or keep-alive agent to reduce TLS handshake overhead.

### 5.3 Adaptive Search Window

- Start with default `first:2` itineraries; if disruption flagged or user requests more choices, fetch additional using cursor.

### 5.4 Parallelization Constraints

- Avoid parallel GraphQL requests for same itinerary; sequential fallback only when required (e.g., alt after disruption detection).

### 5.5 Warm Cache Strategy

- Optional prefetch geocoding for saved user variables at session start to prime reverse geocode or coordinate queries.

## 6. Open Questions / Research Gaps

- Confirm authoritative Digitransit daily quota & burst policy beyond 10rps guidance.
- Clarify best field for realtime disruption: is `realtimeState` sufficient or are explicit cancellation flags needed per leg? (Need schema introspection.)
- Determine recommended pagination strategy for departures (stop query) — may require separate pattern not yet captured in docs provided.
- Decide policy for partial accessibility compliance — label vs exclude.

## 7. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Realtime not consistently available | User confusion | Explicit schedule_type labeling, fallback messaging |
| Rate limit bursts under load | Throttling errors | Token bucket + jitter retries + local collapsing |
| Schema evolution upstream | Breaks queries | Centralize GraphQL fragments + versioned test fixtures |
| High latency routing queries | User impatience | Timeouts + async operation pattern for >5s |
| Over-fetching GraphQL fields | Performance regression | Shared fragment with lint rule / codegen enforcement |
| Duplicate itineraries | Cluttered UX | Post-process uniqueness by leg sequence fingerprint |

## 8. Constitution Alignment Summary

- TDD: Plan to scaffold failing tests first for each tool (unit + integration triggers) — clause I.
- Integration tests: Add for each new tool contract & API schema usage — clause II.
- Observability: Logging spec enumerated (tool_name, duration, retries) — clause III.
- Versioning: Prepare initial semantic version 0.1.0; major bump on contract changes — clause IV.
- Simplicity: Minimal field selection & tool-specific modules — clause V.
- MCP Tool Architecture: All tools expose Zod schemas & unified error model — clause VI.
- Data Integration: Focus only on routing + geocoding now — clause VII.

## 9. Decision Records (Initial)

- DR001: Adopt token bucket (capacity 30, refill 10/s) + exponential jitter for rate limiting resilience.
- DR002: Use Zod for schema + type inference; reject partially valid payloads.
- DR003: Map realtime to schedule_type (realtime|scheduled|mixed) via leg state aggregation.
- DR004: Keep itinerary queries to `first:2` initially; expand on demand.
- DR005: Avoid direct GTFS-RT polling; rely on Digitransit GraphQL enrichment (reduces integration surface).

## 10. Next Steps (Feeds Phase 1 Planning)

- Define Zod schemas for: JourneyPlan, Itinerary, Leg, Stop, Departure, GeocodeResult, Error, UserVariable.
- Implement HTTP client wrapper with rate limiting + retry + logging.
- Prototype `plan_trip` minimal query + transformation (test with mocked response fixture).
- Build unit tests (failing first) for error mapping matrix.

---
Status: COMPLETE (Phase 0)
