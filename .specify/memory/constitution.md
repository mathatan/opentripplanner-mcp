# OpenTripPlanner MCP Server Constitution (Memory Copy)

## Core Principles

### I. Test-First (NON-NEGOTIABLE)

TDD mandatory: Tests written → User approved → Tests fail → Then implement. Strict Red-Green-Refactor. Every MCP tool and feature must begin with Vitest tests. No production code without a failing test first.

### II. Integration Testing

Integration tests required for: new MCP tool contracts, API integration changes (Digitransit/OpenTripPlanner), shared schema modifications, inter-service communication, and real-time data handling logic. Integration tests must validate schema conformity and error paths.

### III. Observability

Structured logging for all MCP tools (request, timing, rate-limit metadata). Multi-tier log streaming for external API calls. Performance metrics recorded for response latency, retry counts, and cache effectiveness. Logs must be text-based and machine-parseable.

### IV. Versioning & Breaking Changes

Semantic: MAJOR.MINOR.BUILD. Breaking changes require: migration note, documented impact, version bump. Digitransit compatibility must be tracked; when upstream schema versions shift, add compatibility matrix.

### V. Simplicity

YAGNI enforced. Avoid unnecessary abstractions. Only core transit planning concerns (routing, geocoding, realtime) allowed in base layer. MCP tool interfaces must remain minimal and purpose-driven.

### VI. MCP Tool Architecture

Each tool MUST provide: Zod-validated inputs, graceful error objects (code + message + remediation), rate limit awareness/backoff, real-time data support (delays/cancellations) with scheduled fallback, and structured logging hooks.

### VII. Public Transit Data Integration

Support: Routing API (GraphQL multimodal planning), Geocoding API (place/address search), User-defined variables (saved stops/routes/locations). Extensible for additional regions while defaulting to Finland coverage.

## Additional Constraints

### Technology Stack & Runtime

Node.js (ESM) + TypeScript, package manager pnpm, validation via Zod, MCP framework @modelcontextprotocol/sdk. No code in `build/` except compiled artifacts. Tests in `tests/` only.

### API Authentication & Rate Limiting

Use `digitransit-subscription-key` header; enforce 10 rps soft limit with token bucket/backoff. Provide retry (exponential jitter) on 429/5xx with max attempt cap. Emit retry telemetry.

### Real-time Data Handling

Acceptable data age < 30s. Fallback to static schedule if realtime missing; mark degradation state. Handle cancellations (exclude from results with reason) and delays (propagate delay metadata on legs).

### Geographic & Modal Coverage

Primary: Finland (HSL, Tampere, Southwest Finland, Waltti). Secondary: Estonia + future regions. Modes: buses, trams, trains, metro, walking, cycling, shared mobility, park & ride.

### Data & Licensing

Ensure proper attribution (GTFS, OSM, Digitransit). Comply with CC BY 4.0 / ODbL. No storage of personal data.

## Development Workflow & Quality Gates

### Workflow

- Development: `pnpm dev` (nodemon + tsx)
- Build: `pnpm build` (TypeScript compile to `build/`)
- Prepublish: `pnpm prepublishOnly` ensures fresh build

### Quality Gates (All Mandatory)

1. Lint clean (`pnpm lint`)
2. TypeScript strict compile success
3. Tests pass (`pnpm test`) with coverage for new paths
4. Integration tests added when triggers met
5. Performance sanity (<1s simple route query) documented if new network logic

### Testing Standards

- Unit tests isolate tool logic
- Integration tests exercise external API contracts (may use recorded fixtures if rate-limited)
- Real-time edge cases: delay, cancellation, missing feed
- Error path tests: invalid input, auth failure, rate limit, upstream timeout

### Observability Requirements

Every external call logs: endpoint, duration ms, status, retryCount, cacheHit (boolean). Provide a diagnostic dump function (read-only) for recent rate-limit state.

## Governance

Constitution supersedes ad-hoc practices. Amendments require: version bump, checklist execution (update templates/specs/tasks), migration guidance for any breaking change, and verification that templates mirror new rules. All PRs must link to constitution clauses for non-trivial changes. Complexity must be justified against Simplicity principle. Runtime development guidelines must remain synchronized.

## MCP Tool Contract & Domain Model (Normative)

This section codifies cross-tool behavioral guarantees distilled from feature specifications.

### Standard Tools (Initial Set)

- plan_trip
- find_stops
- get_departures
- geocode_address
- reverse_geocode
- user_variables (save, list, clear, retrieve)

### Unified Error Model

Errors MUST follow: `{ code, message, hint?, correlationId? }`. Stable kebab-case codes (e.g., `validation-error`, `unsupported-region`, `rate-limited`, `geocode-failed`, `no-itinerary-found`). Validation failures enumerate missing/invalid fields.

### Data Freshness & Realtime Indicators

Realtime-capable responses include:

- `realtime_used` (boolean or enum realtime|scheduled|mixed)
- `data_freshness` (ISO 8601 timestamp)
- Disruption flags per itinerary/leg when applicable.

Fallback to scheduled data MUST be explicitly labeled.

### Journey & Itinerary Representation (Minimum Fields)

Journey plan object includes: origin, destination, requested_time_type (depart|arrive), itineraries[]. Each itinerary: legs[], total_duration, number_of_transfers, walking_distance, disruption_flag?, schedule_type, accessibility_notes?, alternative_indicator?.

Each leg: mode, from, to, departure_time, arrival_time, duration, distance (if meaningful), line/ref (if transit), realtime_delay?, disruption_note?.

### Departures Representation

Departures: stop_id, line/ref, destination, scheduled_time, realtime_time?, delay_seconds, status (on_time|delayed|cancelled|scheduled_only), platform?.

### Geocoding Results

Geocode result: name, coordinates (WGS84), type (address|poi|stop), confidence, language?, bounding_box?.

### User Variables

Operations: create/update (deterministic overwrite policy), list, retrieve, clear-all. Fields: key, type, value, created_at, updated_at. Isolation per user/session.

### Preferences & Constraints

Initial constraints: maximum_walking_distance, maximum_transfers, preference_weight (fewer_transfers|shorter_time), accessibility (e.g., step_free). Unsupported preferences MUST surface warning—not silent drop.

### Disambiguation & Partial Matches

Multiple geocode matches → bounded candidate list (document max). No auto-selection without explicit threshold.

### Internationalization

Localized names: Finnish, Swedish, English when available. `language` parameter MAY request preference; documented fallback order required.

### Rate Limiting Behavior

On exceed: return `rate-limited` with `retry_after` when known. Client guidance: exponential backoff with jitter.

### Duplicate & Redundant Results

Suppress itineraries identical in leg sequence with trivial (<60s) offset unless user explicitly asks for schedule spread.

### Cancellation & Timeout

Long-running operations cancellable → return `operation-cancelled`; omit partial results unless future amendment allows streaming.

### Logging (Conceptual)

Emit: tool_name, duration_ms, success, error_code, upstream_calls, retries, rate_limit_state, correlationId (if provided).

### Extensibility Clause

New tools MUST document: purpose, input schema, output schema, added error codes, rate-limit considerations. Reuse existing entity shape fields; changing them requires major version increment.

## Amendment Record

- 1.0.1 (2025-09-15): Added MCP Tool Contract & Domain Model normative section.

**Version**: 1.0.1 | **Ratified**: 2025-01-27 | **Last Amended**: 2025-09-15
