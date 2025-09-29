# Phase 0 Research: MCP Timetables, Routes & Address Lookup

Date: 2025-09-29
Spec: `specs/001-build-an-mcp/spec.md`

## Objective

Establish concrete technical decisions, confirm absence of blocking unknowns, and document rationale before design artifacts (data model & contracts). All clarifications present in spec; no open NEEDS CLARIFICATION markers. Research focuses on upstream API usage (Digitransit Geocoding & Routing), validation strategy, error taxonomy, performance & ordering guarantees, and minimal architecture aligned with Constitution.

## Domains & Upstream APIs

### Geocoding (Pelias via Digitransit)

Endpoints in scope (GET): `/geocoding/v1/search`, `/geocoding/v1/reverse`, `/geocoding/v1/autocomplete` (may use search primarily; autocomplete optional early). Key parameters: `text`, `focus.point.lat/lon`, bounding shapes, `layers`, `sources`, `size`, `lang`. We require deterministic candidate truncation (top 5). Confidence scoring: Pelias returns `confidence` (0..1). We'll map that directly to internal `confidenceScore` and apply threshold 0.80. Fallback language resolution performed post-response using localized name properties if present.

### Routing (OTP GraphQL via Digitransit)

Single GraphQL endpoint. We will craft query templates for:

- Stop timetable (next departures) using `stop(id)` and traversing `stoptimesWithoutPatterns` (scheduled) or equivalent verified field.
- Itinerary planning using `plan` or `planConnection` (prefer stable `plan` if complexity minimal; use `planConnection` only if needed for pagination/searchWindow). We'll bound search by `numItineraries` (<=3) and time window semantics. Arrival vs departure controlled via `date/time` + `arriveBy` boolean.

GraphQL complexity: Keep selection sets minimal—only required itinerary leg fields per FR-004.

## Key Decisions

| Decision | Rationale | Alternatives | Status |
|----------|-----------|--------------|--------|
| Use native `fetch` (Node 18+) | Avoid new deps, minimal HTTP layer | `axios`, `undici` | Chosen |
| Zod for boundary validation | Already mandated, concise schemas | Custom validators | Chosen |
| In-memory LRU cache (optional) | Avoid repeated identical geocode/plan calls within short interval; latency reduction | No cache; external cache | Deferred (phase 2 consideration) |
| Deterministic ordering via stable sort keys | Ensures reproducibility (FR-013) | Rely on upstream order | Chosen |
| Error taxonomy central enum & mapper | Single source-of-truth for tools | Inline ad-hoc strings | Chosen |
| Single env var `DIGITRANSIT_API_KEY` | Simplicity; restart rotation acceptable | Dynamic reload file watcher | Chosen |
| Truncate geocode candidates >5 | FR-019 compliance | Return all; random sample | Chosen |
| Truncate itineraries >3 using arrival→transfers→duration sort | FR-019 deterministic rule | Upstream order only | Chosen |
| Language fallback FI→EN→SV→default | FR-014 requirement | EN first, or user-specified | Chosen |
| Skip realtime fields initially | Out-of-scope; reduces complexity | Add placeholder real-time blending | Chosen |

## Validation Strategy

- Zod schemas for: LocationQueryInput, ResolvedLocation, DisambiguationSet, RouteRequestInput, Itinerary, TimetableRequestInput, Departure, ErrorPayload.
- Input time parsing: ISO 8601 datetime or separate date+time fields; internal conversion to JS Date + epoch seconds for GraphQL variables.
- Coordinate validation: lat ∈ [-90,90], lon ∈ [-180,180].
- Confidence threshold & truncation enforced post-geocode response.

## Error Classification Mapping (Initial)

| Category | Internal Code Examples | Trigger Sources |
|----------|-----------------------|-----------------|
| VALIDATION | MISSING_ORIGIN, INVALID_TIME_FORMAT | Schema parse errors, semantic checks |
| NOT_FOUND | STOP_NOT_FOUND | Upstream 404 semantic or empty unique fetch |
| DISAMBIGUATION_REQUIRED | MULTIPLE_CANDIDATES | Geocode < threshold & >1 candidate |
| NO_RESULTS | NO_ITINERARIES, NO_DEPARTURES | Valid request but empty domain result |
| THROTTLED | RATE_LIMITED | Upstream 429 |
| UPSTREAM_FAILURE | GEOCODING_ERROR, ROUTING_GRAPHQL_ERROR | 5xx, malformed responses |
| AUTH_FAILURE | MISSING_API_KEY, INVALID_API_KEY | Missing env, 401/403 |
| INTERNAL | UNEXPECTED | Throw/catch fallback |

## Performance & Caching Notes

- Basic per-call timing (Date.now diff) for potential logging of p95 later (not persisted yet).
- Optional future micro-cache key: hash(method, endpoint/query, serialized params). TTL short (e.g., 15–30s) to reduce burst duplication.

## Deterministic Ordering Rules

1. Geocode candidates: sort by (confidence DESC, distanceMeters ASC (if focus present), name ASC (tie-breaker)).
2. Itineraries: sort by (endTime ASC, numberOfTransfers ASC, durationMinutes ASC).
3. Timetable departures: preserve chronological order already intrinsic; ensure stable by routeShortName ASC when identical timestamps.

## Security Considerations

- Never log API key or full raw GraphQL queries containing it (key sent via header only).
- Reject operation if key absent at initialization (fast fail).

## Internationalization

- Extract `name.fi`, `name.en`, `name.sv` if available else upstream `name`.
- Return `primaryName` + `names: { fi?, en?, sv? }` map.

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Upstream schema evolution | Break itinerary parsing | Keep GraphQL selection minimal; add version comment; fail fast on missing fields |
| Over-truncation hides better candidate | Reduced accuracy | Provide totalCandidates + truncated flag |
| Timezone misalignment | Incorrect itinerary times | Use `Europe/Helsinki` zone; rely on upstream localized timestamps; ensure conversion via Date only for comparisons |
| Silent upstream partial failures | Incomplete data surfaces | Basic shape validation with Zod; promote to UPSTREAM_FAILURE if critical field missing |

## Open Items (Deferred, Not Blocking)

- Add micro-cache layer after baseline passes manual validation.
- Introduce metrics aggregation if adoption warrants.
- Evaluate autocomplete endpoint usefulness after initial adoption.

## Conclusion

All required decisions for Phase 1 design are made; no blocking unknowns. Proceed to data model & contracts generation.
