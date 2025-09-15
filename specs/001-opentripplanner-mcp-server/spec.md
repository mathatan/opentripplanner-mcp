# Feature Specification: OpenTripPlanner MCP Server for Intelligent Real-Time Public Transportation Assistance

**Feature Branch**: `001-opentripplanner-mcp-server`
**Created**: 2025-09-15
**Status**: Complete

## Business Context

AI assistants increasingly serve as travel concierges, yet lack direct, structured access to reliable public transit data. Travelers need timely, multimodal journey options that reflect real-time disruptions and personal preferences. This feature enables AI assistants to deliver accurate Finnish public transport guidance (HSL, Tampere, Southwest Finland, Waltti) with extensibility for future regions while maintaining clarity, accessibility, and privacy.

## Core MCP Tools

| Tool | Purpose |
|------|---------|
| plan_trip | Compute multimodal itineraries (scheduled + realtime) between two points or saved variables |
| find_stops | Discover nearby stops by coordinates / optional radius or partial name |
| get_departures | Return upcoming departures (realtime + delays) for a stop or saved label |
| geocode_address | Forward geocoding of place text to coordinates with disambiguation |
| reverse_geocode | Reverse geocoding of coordinates to human-readable place |
| save_user_variable | Store a named user location or preference (overwrites on conflict) |
| get_user_variables | Retrieve all stored user variables for contextual reuse |

## Core Value Proposition

Provide a standardized, AI-friendly interface that bridges natural language transit queries and high-quality multimodal routing data—combining real-time reliability, personalization, and accessibility-aware journey planning within clear geographic and operational boundaries.

## Success Criteria

1. Journey plans reflect realtime delays or are explicitly labeled as schedule-based when realtime unavailable.
2. Minimum one valid itinerary (or clear structured failure) for ≥95% of in-scope origin/destination queries within supported regions (given at least one exists in underlying data).
3. All MCP tools respond within a typical 2s median (95th percentile ≤5s; long-running planning escalates to async pattern) under normal load.
4. Disambiguation and fuzzy suggestions provided for ≥90% of ambiguous geocoding queries with user-resolvable options.
5. Accessibility preferences (when set) alter or filter output, with unmet cases clearly marked.
6. User variables correctly resolve in ≥99% of tool invocations referencing them during retention window.
7. No unsupported region itineraries returned; errors are explicit and actionable.
8. Rate limit breaches return standardized structured errors with retry-after guidance.
9. All tool outputs include consistent units, language fallback logic, and mode labeling.

## Scope

In Scope (Initial Release):

- Multimodal journey planning (walk + transit + cycling + shared micro-mobility)
- Finnish regions: HSL, Tampere, Southwest Finland, Waltti
- Realtime delay / cancellation integration and disruption flagging
- Geocoding (forward & reverse) with disambiguation and fuzzy suggestions
- Nearby stop discovery & real-time departures
- User context variables (locations & preferences) with persistent long-term retention
- Accessibility preference filtering (step_free, few_transfers, low_walking_distance)
- Rate limiting, error normalization, language fallback (fi, sv, en)

Out of Scope (Initial Release):

- Car routing / park-and-ride integration
- Cross-border or non-Finnish region expansion
- Payment, ticketing, or fare product purchase workflows
- Advanced emissions calculations or carbon comparison beyond itinerary baseline fields
- Rich map tile rendering (consumed externally, not produced here)

Future Considerations:

- Additional regions (Estonia, cross-border) and mode expansion (ferry bike carriage rules, wheelchair granular metadata)
- Persistent profile storage and multi-session personalization
- Enhanced preference weighting (multi-objective optimization exposure)
- Emissions scoring integration (CO₂ per itinerary leg)

### Context & Dependencies

- External Data: Digitransit routing, geocoding, and realtime APIs (GTFS / GTFS-RT derived). Assumes availability within documented latency & rate guidance.
- Data Freshness: Realtime considered stale > 30s since last update; fallback to scheduled times with explanatory label.
- Language Coverage: Based on geocoding docs (fi, sv, en) with deterministic fallback chain.
- Privacy: Ephemeral session storage only; no PII persistence beyond 24h inactivity window.
- Reliability: Alternate itinerary generation required when primary itinerary disrupted and viable path exists.

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story

An everyday traveler asks their AI assistant: "How do I get from my home to my office?" The assistant uses the MCP server to plan a multimodal journey (walking + transit, possibly cycling or shared mobility) using real-time Finnish public transport data (HSL, Tampere, Southwest Finland, Waltti). It returns options with departure times, transfers, walking segments, delays, and accessibility notes, adapting if a disruption affects a suggested route.

### Acceptance Scenarios

1. **Given** a user has saved "Home" and "Work" locations, **When** they ask "How do I get from home to work now?", **Then** the assistant returns at least one current valid journey option including: origin/destination labels, departure time, arrival estimate, total duration, number of transfers, walking distance, and realtime delay annotations if any.
2. **Given** a user shares current coordinates, **When** they request "Find nearby tram stops", **Then** the assistant lists nearby stops within a default radius including stop name, modes served, and next imminent departures.
3. **Given** a user requests trip planning during a service disruption affecting one line, **When** an alternate line or path exists, **Then** the assistant provides an alternate itinerary flagged as a disruption reroute.
4. **Given** a user with accessibility preference saved (e.g., avoid stairs), **When** they plan a trip, **Then** results exclude or clearly mark itineraries violating the preference.
5. **Given** no realtime data is currently available for a segment, **When** a plan is requested, **Then** the assistant returns a schedule-based itinerary clearly labeled as "using scheduled times".
6. **Given** a user wants to save a favorite stop, **When** they say "Save this stop as my local metro", **Then** the assistant confirms storage and the stop appears in subsequent retrievals of user variables.
7. **Given** a user requests "What are departures from Central Station in the next 10 minutes?", **When** the stop exists, **Then** the assistant lists departures (mode, line, destination, departure time, delay) limited to the requested time window.

### Edge Cases

- Origin or destination cannot be geocoded → Return clear failure with guidance and up to 3 fuzzy alternative suggestions (ranked by confidence) so user can pick.
- Extreme trip distance spanning unsupported regions → Return scoped error referencing supported Finnish regions; no cross-border fallback in initial release.
- Ambiguous place name (e.g., multiple "Central Square") → Present disambiguation list capped at 5 options, ordered by proximity (if context) then confidence.
- Realtime feed latency or outage → Fallback to scheduled times with a disclaimer and last successful realtime update timestamp.
- Duplicate favorite label save attempt → Overwrites existing value and returns confirmation including previous vs new summary.
- Accessibility preference conflicts with all itineraries → Provide best-effort itineraries labeled "may not fully meet accessibility preference" plus recommendation to adjust constraints.
- Rate limit exceeded → Return standardized rate limit error including retry-after seconds and guidance to batch requests.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow AI assistants to request multimodal journey plans between two locations (address, coordinates, or saved user variable labels).
- **FR-002**: System MUST support incorporating real-time delays and cancellations into journey results when available.
- **FR-003**: System MUST provide nearby stop discovery based on coordinates and optional radius parameter.
- **FR-004**: System MUST return real-time departures for a specified stop (by ID, name, or saved favorite) within a configurable time window.
- **FR-005**: System MUST provide forward geocoding of human-readable addresses or place names to coordinates.
- **FR-006**: System MUST provide reverse geocoding from coordinates to human-readable address or place label.
- **FR-007**: System MUST enable saving user-specific variables (e.g., named locations, preferences) via a dedicated tool.
- **FR-008**: System MUST allow retrieval of previously saved user variables for personalization.
- **FR-009**: System MUST clearly label when an itinerary or departure uses scheduled (non-realtime) data.
- **FR-010**: System MUST support inclusion of walking (required), cycling (personal + rental where available), and shared micro-mobility (bike/scooter) segments; other motorized personal modes (car) are excluded in initial scope.
- **FR-011**: System MUST allow specifying desired arrival time or desired departure time for journey planning.
- **FR-012**: System MUST handle accessibility preferences: step_free (avoid stairs), few_transfers, low_walking_distance, prioritize_low_floor (if data), and expose when unmet.
- **FR-013**: System MUST provide disambiguation when multiple geocoding results match a query (max 5 options with confidence + proximity ordering).
- **FR-014**: System MUST restrict operations to supported Finnish transit regions initially (HSL, Tampere, Southwest Finland, Waltti) and reject unsupported regions with a clear message.
- **FR-015**: System MUST apply rate limiting: baseline 10 requests/second (token bucket, burst 30), soft daily quota 50,000 requests per key, with structured 429 including retry-after.
- **FR-016**: System MUST expose consistent error structures including error type, human-readable message, and optional remediation hint.
- **FR-017**: System MUST log (conceptually) failed planning attempts referencing cause categories (geocode_failed, unsupported_region, no_itinerary_found, rate_limited) for monitoring.
- **FR-018**: System MUST allow referencing saved user variables by label within other tool invocations (e.g., plan_trip origin = saved:home).
- **FR-019**: System MUST provide at least one alternative itinerary when possible if primary itinerary contains a disruption.
- **FR-020**: System MUST mark itineraries containing disruptions with a clear disruption flag and short description.
- **FR-021**: System MUST provide total estimated travel time and breakdown per leg (mode, line/ref, duration, distance if applicable).
- **FR-022**: System MUST support specifying maximum walking distance with default 1500 m, configurable up to 3000 m.
- **FR-023**: System MUST support specifying maximum number of transfers with default 4, configurable lower or higher (hard cap 8).
- **FR-024**: System MUST support user optimization preference optimize = balanced | few_transfers | shortest_time.
- **FR-025**: System MUST handle requests lacking sufficient parameters by returning a structured validation error listing missing fields.
- **FR-026**: System MUST deterministically overwrite existing user variable values on name conflict and return previous value summary.
- **FR-027**: System MUST allow listing all saved variables for a user session.
- **FR-028**: System MUST support partial text search when finding stops by name.
- **FR-029**: System MUST document that only WGS84 (EPSG:4326) is supported; requests implying alternative CRS are rejected with guidance.
- **FR-030**: System MUST differentiate between no service available and query errors.
- **FR-031**: System MUST provide timestamp (ISO 8601) of data freshness for realtime responses.
- **FR-032**: System MUST ensure consistent labeling of modes (bus, tram, metro, train, ferry, walk, bike, scooter) across all tools.
- **FR-033**: System MUST allow specifying language preference for place names (fi, sv, en) with fallback priority: requested → fi → en.
- **FR-034**: System MUST support cancellation of long-running planning requests: if >5s initial computation, respond with operation_id and allow status polling; hard timeout 10s.
- **FR-035**: System MUST store user variables ephemerally per session with retention up to 24h inactivity (or until explicit clear) and isolate data per user context.
- **FR-036**: System MUST expose a mechanism to clear all stored user variables on command.
- **FR-037**: System MUST provide consistent units (meters, minutes) and clearly state them in responses.
- **FR-038**: System MUST limit geocoding result set size: default 10, max 40 (excess truncated with note).
- **FR-039**: System MUST provide fallback textual guidance if no itineraries meet all constraints (e.g., suggest relaxing walking distance limit).
- **FR-040**: System MUST avoid returning duplicate itineraries differing only by trivial timing variations (define uniqueness by leg sequence + start time delta ≥ 2 minutes).

### Assumptions & Default Parameters

- Supported languages derived from geocoding docs: fi, sv, en.
- Rate limits aligned with publicly documented Digitransit 10 rps guidance; burst and quota values defined for clarity pending confirmation.
- Walking distance defaults based on typical urban transit usability; configurable range provides flexibility without overextending search.
- Transfer cap default (4) balances choice and complexity; cap of 8 prevents excessive branching.
- Session data retention (24h) balances personalization and privacy; longer retention deferred until explicit persistence policy defined.
- Non-transit modes limited to those with reliable data (walking, cycling, shared micro-mobility) to ensure quality.
- Cancellation pattern introduced to maintain responsiveness for complex multi-region searches.

### Key Entities *(include if feature involves data)*

- **Journey Plan**: Represents a computed multimodal itinerary; attributes: origin (label/coords), destination (label/coords), requested time type (depart/arrive), itineraries (list), constraints applied, realtime_used flag, data_freshness timestamp, disruption flags.
- **Itinerary**: A single travel option; attributes: legs, total_duration, total_distance, number_of_transfers, walking_distance, accessibility_notes, disruption_flag, schedule_type (realtime|scheduled|mixed).
- **Leg**: A segment of travel; attributes: mode, line/ref (if transit), from_point, to_point, departure_time, arrival_time, duration, distance, realtime_delay (if any), accessibility attributes (e.g., wheelchair_flag), disruption_note.
- **Stop**: A transit stop/station; attributes: id, name (localized variants), coordinates, modes_served, accessibility_features, parent_station (optional).
- **Departure**: A predicted or scheduled vehicle event; attributes: stop_id, line/ref, destination, scheduled_time, realtime_time (optional), delay_seconds, platform (if applicable), status (on_time|delayed|cancelled|scheduled_only).
- **User Variable**: Stored user-specific datum; attributes: key (label), type (location|preference|other), value (e.g., coordinates, string), created_at, updated_at.
- **Geocode Result**: Place candidate; attributes: name, coordinates, type (address|poi|stop), confidence, language (if localized), bounding_box (optional).
- **Accessibility Preference**: User context selection; attributes: preference_type (e.g., step_free), value set, last_updated.
- **Error Structure**: Standardized error response; attributes: code, message, hint (optional), correlation_id (optional).
- **Region Support Policy**: Defines supported region codes and labels; attributes: region_id, name, modes_supported, status (active|planned).

---
