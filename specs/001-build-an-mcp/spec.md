# Feature Specification: MCP Timetables, Routes & Address Lookup

**Feature Branch**: `001-build-an-mcp`
**Created**: 2025-09-29
**Status**: Draft
**Input**: User description: "Build an MCP server for fetching timetables, routes and addresses. Focus only on fetching timetables (stop schedules), routes (itinerary planning between two addresses within timeframe) and address/stop lookup (geocoding + stop search). Exclude map-api and realtime-api features. Provide robust project structure refactoring existing src/index.ts into layered modules (infrastructure clients for routing & geocoding, domain services, MCP tool handlers, schemas, validation). Provide tools: findAddressOrStop, planRoute, getStopTimetable. Include API key handling, rate limiting, caching strategy."

## Execution Flow (main)

```
1. Parse user description from Input
   → If empty: ERROR "No feature description provided"
2. Extract key concepts from description
   → Identify: actors, actions, data, constraints
3. For each unclear aspect:
   → Mark with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
   → If no clear user flow: ERROR "Cannot determine user scenarios"
5. Generate Functional Requirements
   → Each requirement must be testable
   → Mark ambiguous requirements
6. Identify Key Entities (if data involved)
7. Run Review Checklist
   → If any [NEEDS CLARIFICATION]: WARN "Spec has uncertainties"
   → If implementation details found: ERROR "Remove tech details"
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines

This specification expresses user/business intent (WHAT & WHY) for a conversational / agent-driven capability that enables: (1) finding a valid address or public transport stop, (2) planning a public transport route between two textual addresses within a user‑provided temporal window, and (3) retrieving the scheduled (non‑realtime) departures (timetable) for a specified stop. Implementation mechanics (code structure, specific external API parameter names, technology choices) are intentionally excluded.

Scope confirmation:

- In scope: Address & stop lookup, itinerary planning (scheduled / planned), stop timetable (scheduled departures), basic result disambiguation, input validation, clear error messaging, performance & basic throttling constraints at product level.
- Out of scope: Realtime disruption data, live vehicle positions, map tile rendering, user authentication system, persistent user profiles, payment or booking, accessibility optimization beyond what underlying data already provides.

Guiding principles:

- Provide deterministic, testable behaviors for ambiguous or multi‑match queries (rank + top N + explicit disambiguation prompt capability for the LLM client).
- Favor clarity and safety over silent assumptions; surface uncertainties via structured responses the LLM can turn into follow‑up questions.
- Ensure all functional requirements are measurable at acceptance.

Assumptions (business level):

- Geographic focus: Finland only (national coverage of underlying transit & geocoding provider). (Clarified 2025-09-29)
- Language fallback rule: Prefer Finnish → English → Swedish for primary display name; if none present, use upstream default label. Multi-lingual names may be included as auxiliary metadata. (Clarified 2025-09-29)
- API key provisioning: Single static Digitransit subscription key provided via environment variable (e.g., DIGITRANSIT_API_KEY); rotation requires process restart. (Clarified 2025-09-29)

Open Questions flagged with [NEEDS CLARIFICATION] are to be resolved prior to moving status from Draft to Ready.

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story

As an AI assistant interacting with transport data, I need to (a) resolve user‑provided free‑text addresses or stop names to a precise stop or coordinate, (b) plan a public transport journey between two such textual points constrained by a desired departure or arrival timeframe, and (c) show the upcoming scheduled departures for a specific stop so that I can answer user questions about “How do I get from A to B around 5pm?” and “When is the next bus from Stop X?” reliably.

### Acceptance Scenarios

1. **Given** a valid textual origin and destination and a desired departure time, **When** the assistant requests a route, **Then** the system returns at least one itinerary including total duration, transfers, and line identifiers (scheduled, not realtime) or a structured “no routes found within window” response.
2. **Given** an ambiguous address query (e.g., “Aleksanterinkatu”), **When** multiple plausible matches exist, **Then** the system returns a ranked list (<= configured maximum) with enough attributes (name, type, city, lat/lon, disambiguation token) for the assistant to clarify.
3. **Given** a known stop ID or uniquely resolved stop, **When** the assistant requests the timetable, **Then** the system returns the next N scheduled departures (default N) including route short name, destination headsign, scheduled departure time, and mode.
4. **Given** a route planning request where either origin or destination cannot be resolved, **When** the system processes the request, **Then** it returns a structured resolution error containing which side failed and candidate alternatives if available.
5. **Given** a timetable request outside service hours for that stop, **When** processed, **Then** the system returns an empty result set with an explanatory reason (e.g., “No scheduled departures in the next X minutes”).
6. **Given** a request that exceeds defined safe rate thresholds, **When** processed, **Then** the system returns a throttling error with retry guidance instead of partial or degraded data.

### Edge Cases

- Origin and destination resolve to the same stop / coordinate (should return validation error advising walking not needed or require different destination).
- Timeframe window produces itineraries only after a max search extension (default searchWindowMinutes = 45; maximum = 120) — bounded to prevent excessive expansion.
- User supplies arrival time instead of departure time (supported at launch; system performs arrival-time search semantics).
- Extremely common street name returns > maximum disambiguation candidates (system truncates list and signals truncation flag).
- Invalid or expired API key scenario (system returns explicit auth error classification for assistant to message user/prompt for configuration); key supplied as single static environment variable, rotation requires restart.
- Stop with no scheduled departures in next horizon (returns empty list + reason).
- Non‑ASCII characters in address input: system preserves original user string, performs accent/diacritic‑insensitive comparison by normalizing both query and candidate forms for matching while returning upstream canonical forms unchanged.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 Address/Stop Lookup**: System MUST accept a free‑text query and return either a single resolved location (address or stop) or a ranked list of candidates with disambiguation metadata when confidence below an acceptance threshold (auto‑resolve threshold = 0.80 confidenceScore).
- **FR-002 Candidate Ranking**: System MUST order lookup candidates by relevance incorporating textual match quality and an optional caller‑supplied geographic focus coordinate plus a maxDistanceMeters hard filter. If provided: (a) candidates beyond maxDistanceMeters are excluded prior to ranking; (b) within the filtered set, primary ordering remains textual relevance with a mild distance tiebreaker (distance only influences ordering when textual scores are within a small epsilon). Omit both parameters for pure textual ranking. Invalid or out‑of‑range coordinates MUST yield a VALIDATION error (not silent ignore).
- **FR-003 Single Result Contract**: When confidence >= threshold OR only one candidate remains after filtering, system MUST emit a resolved object (not list) including canonical name, type (ADDRESS|STOP), coordinate, and reference identifier.
- **FR-004 Route Planning**: System MUST create itineraries between a resolved origin and destination given either a desired departure time or a desired arrival time (both fully supported) plus a search window, returning zero or more itineraries with standardized fields (duration, legs count, transfers count, start/end times, modes sequence, walking distance, list of leg summaries). Arrival-time searches MUST back-calculate suitable departure times honoring window bounds. Mode control limited to journeyPreset enum (FASTEST | FEWEST_TRANSFERS | LEAST_WALK) in v1 (no raw mode filters).
- **FR-005 Time Window Handling**: System MUST limit route planning search to a bounded window: default searchWindowMinutes = 45; maximum allowed = 120. Requests above max MUST be clamped with a warning flag.
- **FR-006 No Route Case**: If no itineraries found within window, System MUST return an empty itinerary set plus a structured reason code (e.g., NO_SERVICE, OUT_OF_BOUNDS, INVALID_TIME).
- **FR-007 Timetable Retrieval**: System MUST return next N scheduled departures for a resolved stop identifier, with each departure containing route short/long name, destination/headsign, scheduled departure time (ISO 8601), mode, and service day reference. Defaults: default departures N = 3, maximum N = 5. Horizon: default horizonMinutes = 45, maximum horizonMinutes = 90; requests exceeding limits MUST be clamped and include a clamped=true flag.
- **FR-008 Empty Timetable Case**: If zero departures in horizon (configurable minutes ahead), return empty list + reason code NO_DEPARTURES.
- **FR-009 Input Validation**: System MUST detect and respond with structured validation errors for missing origin/destination, invalid time formats, or impossible coordinate values (lat/lon).
- **FR-010 Disambiguation Signaling**: System MUST include a flag (e.g., needsClarification=true) and truncated indicator when candidate list shortened due to cap.
- **FR-011 Rate Limiting (Product)**: Initial scope: no proactive internal throttling; rely solely on upstream Digitransit limits. On upstream HTTP 429 responses, map to THROTTLED error including retryAfter (use upstream header if present else default 60). Internal adaptive limiting marked Deferred.
- **FR-012 Error Classification**: System MUST classify errors into categories: VALIDATION, NOT_FOUND, DISAMBIGUATION_REQUIRED, NO_RESULTS, THROTTLED, UPSTREAM_FAILURE, AUTH_FAILURE, INTERNAL; each category has a machine code and human summary.
- **FR-013 Deterministic Ordering**: Given same inputs and unchanged upstream data, candidate and itinerary ordering MUST be deterministic.
- **FR-014 Localization (Names)**: System MUST pass through multi‑lingual place names if provided upstream while selecting a primary display name using the fallback order: Finnish → English → Swedish → upstream default. Expose the chosen language code and optionally include other available localized names for downstream selection.
- **FR-015 Data Freshness Statement**: System MUST document that results reflect scheduled static data as of last provider update; realtime excluded.
- **FR-016 Security (Keys Handling)**: System MUST avoid exposing sensitive subscription key values in returned payloads (no echo back). A single static key is supplied via environment variable (DIGITRANSIT_API_KEY). Rotation is performed by updating the environment and restarting the process. Failure modes: missing key → AUTH_FAILURE with code MISSING_API_KEY; invalid/expired key → AUTH_FAILURE with code INVALID_API_KEY. No runtime hot-reload required in initial scope.
- **FR-017 Observability (Product Metric)**: System MUST enable tracking counts of successful lookups, disambiguations required, itineraries produced, empty timetable responses, and error categories (names only, not specifying tooling).
- **FR-018 Performance**: Under normal load (no upstream degradation) system SHOULD meet: p95 latency < 1500ms and p99 latency < 3000ms for successful (HTTP 2xx) address/stop lookups, timetable retrievals, and route planning requests. Measurement excludes cold start of process (>60s idle) and excludes time spent waiting on explicit retry-after from THROTTLED responses. Latency is wall‑clock from request receipt to structured response emission.
- **FR-019 Pagination / Limits**: System MUST cap maximum lookup candidates and itineraries returned to prevent overload. Caps: maxLookupCandidates=5, maxItineraries=3. If raw lookup candidates >5, truncate deterministically preserving rank and set truncated=true. If upstream yields >3 itineraries, retain top 3 using sort priority: earliest arrivalTime ASC, then transfers ASC, then total duration ASC.
- **FR-020 Privacy**: System MUST not persist user queries beyond transient processing unless explicit requirement emerges (none currently).
- **FR-021 Unicode Handling**: System MUST preserve original user input (including diacritics / non‑ASCII characters) in transient processing context, perform accent‑insensitive matching using a stable normalization form (e.g., Unicode NFD strip combining marks for comparison only), and return resolved names using upstream canonical forms (do not strip diacritics in output). If normalization fails (invalid code points), return VALIDATION error with details.invalidCharacters list.

Ambiguity markers intentionally retained pending clarification.

### Key Entities *(include if feature involves data)*

- **LocationQuery**: Represents the original free‑text input (and optional bias coordinate) used to resolve an address or stop; attributes: rawText, optional focus (lat, lon), timestamp.
  - Clarified: focus now defined as optional structure: focusPoint(lat, lon) + optional maxDistanceMeters (integer >0). If maxDistanceMeters supplied without focusPoint → VALIDATION error.
- **ResolvedLocation**: A normalized location outcome; attributes: id (if stop), name, type (ADDRESS|STOP), coordinate, confidenceScore, locality (city / region), rawQueryReference.
- **DisambiguationSet**: Ranked collection of candidate ResolvedLocation objects plus metadata: totalCandidatesFound, candidatesReturned, truncated(boolean), needsClarification(boolean).
- **RouteRequest**: Origin + Destination (ResolvedLocation or coordinate), temporal constraint (departureTime OR arrivalTime — both accepted), searchWindowMinutes, journeyPreset (FASTEST | FEWEST_TRANSFERS | LEAST_WALK). No raw mode include/exclude lists in v1.
- **Itinerary**: durationMinutes, startTime, endTime, numberOfTransfers, totalWalkDistanceMeters, legs[] (each leg: mode, lineName/number if transit, from, to, departureTime, arrivalTime, headsign, distanceMeters).
- **TimetableRequest**: stopId (or resolved stop), horizonMinutes (default 45, max 90), maxDepartures (default 3, max 5).
- **Departure**: scheduledTime, routeShortName, routeLongName (optional), headsign, mode, serviceDay.
- **ErrorPayload**: code (enum), category, message (human), details (key-value), recommendation (optional follow‑up hint for assistant).

Relationships: RouteRequest produces zero or more Itineraries; TimetableRequest produces zero or more Departures; LocationQuery produces either ResolvedLocation or DisambiguationSet.

---

## Clarifications

### Session 2025-09-29

- Q: What is the intended geographic coverage for the initial release? → A: Finland only (national coverage)
- Q: What confidence threshold should auto-resolve a single location? → A: 0.80 (balanced)
- Q: Should the initial release support arrival-time based planning? → A: Yes, full support at launch
- Q: What should be the default and maximum route search window (minutes) for itinerary planning? → A: Default 45, Max 120
- Q: What should be the default and maximum timetable departures & horizon? → A: 3/5/45/90 (N/maxN/horizon/maxHorizon)
- Q: What should be the primary language preference order for place names? → A: Finnish → English → Swedish (fallback in that order; upstream default if none)
- Q: How will the Digitransit API key be provisioned & rotated? → A: Single static env variable; restart to rotate
- Q: What baseline rate limiting policy should be enforced? → A: No internal limit; pass through upstream 429 (Option E)
- Q: What numeric caps apply to lookup candidates and itineraries? → A: 5 candidates, 3 itineraries (Option A)
- Q: What level of transit mode filtering is supported initially? → A: High-level journeyPreset enum only (Option D)
- Q: Should caller be able to supply a proximity bias & how? → A: Optional (lat, lon) + maxDistanceMeters filter; ranking primarily textual with distance only as tiebreaker (Option A)
- Q: How should non‑ASCII characters be handled in lookup? → A: Preserve original; accent‑insensitive matching (Option A)

## Review & Acceptance Checklist

### Gate: Automated checks run during main() execution

### Content Quality

- [ ] No implementation details (languages, frameworks, APIs) — REVIEW REQUIRED (verify removal of tech stack references)
- [ ] Focused on user value and business needs
- [ ] Written for non-technical stakeholders
- [ ] All mandatory sections completed

### Requirement Completeness

- [ ] No [NEEDS CLARIFICATION] markers remain (pending resolution phase)
- [ ] Requirements are testable and unambiguous (after clarifications)
- [ ] Success criteria are measurable
- [ ] Scope is clearly bounded
- [ ] Dependencies and assumptions identified

---

## Execution Status

### Updated by main() during processing

- [ ] User description parsed
- [ ] Key concepts extracted
- [ ] Ambiguities marked
- [ ] User scenarios defined
- [ ] Requirements generated
- [ ] Entities identified
- [ ] Review checklist passed

---
