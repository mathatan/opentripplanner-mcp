# Implementation Plan: OpenTripPlanner MCP Server

Date: 2025-09-15
Branch: 001-opentripplanner-mcp-server
Status: ACTIVE

## 1. Feature Summary

Implements a Model Context Protocol (MCP) server exposing transit planning and geocoding tools backed by Digitransit (Routing GraphQL + Geocoding REST). Provides real-time aware multimodal trip planning, stop discovery, departures, and user variable storage with strong validation, rate limiting, and observability per Constitution clauses.

## 2. Architecture Overview

### 2.1 Layered Components

- Transport Layer: MCP server runtime (entry: `src/index.ts`) registering tools.
- Tool Layer: Individual tool modules (e.g., `tools/planTrip.ts`) each exporting Zod schemas and handlers.
- Service Layer: `services/` modules for routing, geocoding, departures, user store, leveraging shared HTTP client.
- Infrastructure Layer: HTTP client wrapper, rate limiter, retry policy, logging abstraction, configuration loader.
- Schema Layer: Central `schema/` providing Zod definitions + TypeScript types.
- Storage Layer: In-memory session store for user variables (extensible for persistence later).

### 2.2 Data Flow (plan_trip Example)

1. MCP request → validate input (Zod).
2. Resolve origin/destination (expand saved variables or geocode if flagged future extension).
3. Build GraphQL query minimal field set.
4. Invoke HTTP client (rate-limited + retries + timeout) with `digitransit-subscription-key` and Accept-Language.
5. Transform response to internal itinerary model; aggregate realtime states.
6. Deduplicate itineraries; apply accessibility constraints & flag unmet.
7. Compute scheduleType, dataFreshness, warnings.
8. Return standardized response with correlationId and logs emitted.

### 2.3 Key Cross-Cutting Modules

- `config.ts`: loads env vars, validates (API key required), sets defaults.
- `rateLimiter.ts`: token bucket (capacity 30, refill 10/s).
- `httpClient.ts`: fetch wrapper (timeout, retries, correlation ID propagation).
- `error.ts`: error factory + mapping functions.
- `logging.ts`: logger interface (structured JSON lines).
- `schemas/*`: Zod entity and tool input/output schemas.
- `store/userVariables.ts`: in-memory map with TTL sweeper.
- `util/fingerprint.ts`: itinerary fingerprint hashing.

### 2.4 Technology Decisions

| Aspect | Choice | Rationale |
|--------|--------|-----------|
| Validation | Zod | Type inference + rich error details |
| HTTP | fetch (undici) | Native in Node 18+, consistent API |
| Rate Limiting | Token bucket | Smooth burst handling & simplicity |
| Retries | Exponential jitter | Avoid thundering herd/backoff collisions |
| Testing | Vitest | Fast TS integration + snapshots for fixtures |
| Logging | Structured JSON | Machine parsing & observability alignment |

## 3. Tool Contracts (Summary)

| Tool | Purpose | Key Inputs | Key Outputs |
|------|---------|-----------|-------------|
| plan_trip | Multimodal itinerary plan | origin, destination, time prefs, constraints | itineraries[], realtimeUsed, dataFreshness |
| find_stops | Nearby stop discovery | coordinate, radius?, limit? | stops[] (id, name, distance, modes) |
| get_departures | Stop departures | stopId or name/variable, window? | departures[], realtimeUsed |
| geocode_address | Forward geocode | text, size?, language? | results[], truncated flag |
| reverse_geocode | Reverse geocode | lat, lon, language? | best result + candidates |
| save_user_variable | Persist user location/preference | key, type, value | stored variable + previous summary |
| get_user_variables | List stored variables | none | variables[] |

## 4. Real-Time & Disruption Strategy

- Derive scheduleType by evaluating leg realtime flags/resolved delays.
- Mark an itinerary disrupted if any leg canceled or delay > 300s.
- Attempt alternate itinerary fetch (one additional request) when disruption present (keeping within 3 itinerary cap overall).
- Provide explicit fallback labeling when no realtime present.

## 5. Rate Limiting & Resilience

- Token bucket enforced in HTTP layer; tools remain ignorant of mechanics (separation of concerns).
- Retry classification matrix implemented (429, 5xx, network). Max attempts 5.
- Optional circuit breaker (future ADV) if failure ratio > threshold.

## 6. Performance Considerations

- Minimal GraphQL selection sets; shared fragment to avoid drift.
- Request collapsing (Promise cache) for identical plan_trip requests within 500ms.
- Geocode LRU caching (10m TTL, size 500) keyed by query+lang.
- Dedup itinerary fingerprints to avoid redundant output.

## 7. Error Model & Observability

- Unified error object: `{ code, message, hint?, correlationId?, retryAfter? }`.
- Logging fields: { ts, level, tool, correlationId, durationMs, success, errorCode?, retries, upstreamLatencyMs[], rateLimitTokensRemaining }.
- Diagnostic tool (future) could expose recent rate limit state (skipped initial delivery to maintain scope focus).

## 8. Constitution Alignment Matrix

| Principle | Implementation Mapping |
|-----------|------------------------|
| Test-First | All tasks enumerated start with failing Vitest specs (TOOL-001 etc.) |
| Integration Testing | INT-* tasks include live & fixture tests for each tool & error map |
| Observability | logging.ts + structured fields; correlation IDs per request |
| Versioning | Initial semantic version 0.1.0; breaking schema changes require major bump |
| Simplicity | Narrow fragments, avoid over-fetching, minimal module surface |
| MCP Tool Architecture | Each tool: Zod input, unified error, logging, rate awareness, realtime metadata |
| Public Transit Integration | Focused on routing + geocoding; real-time via GraphQL enrichment |

## 9. Phased Execution Timeline (Indicative)

| Week | Focus | Milestones |
|------|-------|------------|
| 1 | Infra + plan_trip core | INF-001..006, TOOL-001/002 green |
| 2 | Remaining core tools | TOOL-003..008, basic unit tests |
| 3 | Advanced realtime & disruptions | ADV-001..004, integration baseline |
| 4 | Disambiguation, language fallback, cancellation | ADV-005..007, INT-001..005 |
| 5 | Docs + Hardening | DOC-001..003, QA-*, performance measurements |

## 10. Risks & Mitigations (Condensed)

| Risk | Mitigation |
|------|-----------|
| Upstream schema change | Central fragments + integration test alert |
| Rate limit exceed under concurrency | Token bucket + collapsing + jitter backoff |
| Realtime gaps degrade trust | Explicit labeling + alternate itinerary fetch |
| Complex accessibility exclusions remove all options | Provide warnings + fallback suggestion |
| Duplicate itinerary noise | Fingerprint dedup hash |

## 11. Open Issues & Follow-Ups

- Need schema introspection to finalize disruption flags (pending GraphQL introspection task later).
- Departure tool query pattern not fully documented (will refine in implementation once fields confirmed).
- Evaluate adding streaming partial results (deferred).

## 12. Acceptance & Success Metrics

- ≥95% origin/destination success (integration sampling) where upstream data exists.
- p50 latency ≤2s, p95 ≤5s in integration tests w/ low concurrency.
- All required tools implemented with ≥85% coverage (critical modules ≥95%).
- No unhandled promise rejections or uncaught exceptions in test suite.

## 13. Progress Tracking Snapshot

```text
Phase 0: COMPLETE
Phase 1: COMPLETE (data model draft)
Phase 2: COMPLETE (tasks plan)
Phase 3+: NOT STARTED (pending coding stage)
```

## 14. Artifacts Generated

- research.md
- data-model.md
- tasks.md
- plan.md (this)

## 15. Next Immediate Actions

1. Initialize `src/schema/` and scaffold Zod definitions (tests first).
2. Implement HTTP client + rate limiter with unit tests.
3. Start `plan_trip` RED tests including validation + transformation placeholder.

Status: READY FOR IMPLEMENTATION
