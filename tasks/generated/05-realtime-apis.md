---
# NOTE: This is a TASK specification, not the final documentation.
---

# TASK: Realtime APIs

## 0. Purpose

Specification for producing Realtime APIs documentation: GTFS-RT Service Alerts, Trip Updates, Vehicle Positions plus High-Frequency Positioning (MQTT), integration with Routing API (realtimeState, cancellations, disruptions), latency & freshness guidance.

## 1. Scope & Boundaries

- IN SCOPE: Feed endpoints, message types, field mapping to routing entities, MQTT topic structure/wildcards, connection (TLS/WebSocket) variants, polling vs subscription strategies, edge cases (stale data, missing vehicles), integrated meta topics.
- OUT OF SCOPE: Proprietary internal broker configuration, non-public monitoring dashboards.

## 2. Source Authorities (Always Re-Fetch)

1. Realtime API pages (list concrete Digitransit URLs: service alerts, trip updates, vehicle positions, high-frequency positioning)
2. Architecture realtime page
3. Registration & Keys: <https://digitransit.fi/en/developers/api-registration/>
4. Changes: <https://digitransit.fi/en/developers/changes/>
5. Deprecations: <https://digitransit.fi/en/developers/deprecations/>
6. OTP Topics: RealtimeState fields, TripUpdate mapping, VehiclePosition mapping, Itinerary adjustments, Canceled trips handling.
7. MQTT protocol references (only if publicly cited) else NOTE gaps.

## 3. Deliverables (Structure Blueprint)

Planned final doc sections: Overview; Concepts (Feed Types & Semantics, Freshness, Push vs Pull); Endpoints & Topics (GTFS-RT URLs, MQTT broker/topics); Authentication & Keys; Parameters & Message Fields (mapping tables); Usage Examples (GTFS-RT curl fetch, MQTT subscription pattern, routing query with realtime fields, disruption scenario); Performance & Rate (poll intervals, subscription QoS, payload size hints); Error & Edge Cases; Integrated Policy & Terms Notes; Change & Deprecation Notes; Testing & Validation (staleness simulation, schema validation); References; Changelog; Glossary Seeds.

## 4. Quality Criteria

- Mapping tables for each feed: Field, Type, Source (GTFS-RT / MQTT), Routing Field Mapping, Notes.
- At least 6 example scenarios (basic poll, subscription, disruption, cancellation, stale fallback, complexity-limited itinerary with realtime).
- Latency guidance includes acceptable freshness window & fallback behaviors.
- Edge cases cover: missing vehicle, trip canceled mid-journey, out-of-order updates, stale timestamp, broker disconnect, excessive subscription wildcard.
- Integrated meta topics present (auth header placeholder, terms attribution for data provenance, FAQ seeds, change summary, glossary seed terms: realtimeState, tripUpdate, vehiclePosition, headsign, delay, cancellation).

## 5. Detailed Steps (Todo Blueprint)

1. Fetch all realtime source pages.
2. List GTFS-RT endpoints + formats.
3. Document MQTT broker base URL(s) & topic patterns (wildcards, per-agency if applicable).
4. Build field mapping tables (alerts, trip updates, vehicle positions, HFP topics) referencing OTP schema fields.
5. Define example scenario placeholders (Section 7).
6. Draft freshness/latency guidance (poll vs push intervals).
7. Compile error & edge matrix.
8. Integrate meta topics (auth, terms, FAQ, changes, glossary seeds).
9. Add changelog entry.
10. Escalation review.

## 6. Parameter & Field Mapping Framework (Planned)

| Feed / Topic | Field | Type | Source | Routing Mapping | Notes |
|--------------|-------|------|--------|-----------------|-------|
| Trip Updates | delay | int | GTFS-RT | leg.delay / realtimeState | Seconds precision |
| Vehicle Positions | latitude | float | GTFS-RT | vehicle position lat | Geo coordinate |
| Service Alerts | cause | enum | GTFS-RT | disruption cause | Standard GTFS cause |
| HFP MQTT | topic vehicle id | string | MQTT | vehicle ref | Extracted from topic |

## 7. Planned Example Scenarios (Placeholders Only)

| ID | Scenario | Elements |
|----|----------|----------|
| EX1 | Basic GTFS-RT poll | curl fetch trip updates feed |
| EX2 | MQTT subscription | subscribe wildcard agency/# with TLS endpoint |
| EX3 | Disruption-aware itinerary | routing query + affected alert mapping |
| EX4 | Cancellation handling | canceled trip detection + alternative query |
| EX5 | Stale data fallback | simulate old timestamp and fallback plan |
| EX6 | Complexity-limited realtime plan | restrict fields with maxNumberOfResultFields |

## 8. Error & Edge Case Checklist (Planned)

| Case | Trigger Strategy | Expected Handling |
|------|------------------|-------------------|
| Missing vehicle position | Vehicle ID absent | Mark leg realtimeState=NO_DATA |
| Canceled trip mid-journey | Trip update cancellation | Replan suggestion or alt itinerary note |
| Out-of-order update | Timestamp regression | Ignore stale update |
| Stale feed | Past timestamp threshold | Fallback to scheduled times |
| Broker disconnect | Drop MQTT connection | Reconnect with backoff |
| Wildcard overload | Broad topic subscription | Recommend narrowing scope |

## 9. Cross-Links & Dependencies

Depends on: routing-api (realtime field consumption), routing-data-api (static baseline), map-api (vehicle layer overlays). Integrated meta topics: Auth (key use), Terms (data attribution), FAQ (stale data, missing vehicle, cancellation), Changes (new feed fields), Glossary Seeds (realtimeState, delay, cancellation, freshness, wildcard).

### Integrated Meta Topics Plan

| Meta Topic | Integration Point | Planned Content Stub |
|------------|-------------------|----------------------|
| Authentication & Registration | Authentication & Keys | Key header usage & rate caveat |
| Terms & Usage Policies | Policy & Terms Notes | Attribution for realtime providers |
| FAQ & Troubleshooting | Embedded FAQ | Stale feed, no vehicle, cancellation, latency spikes |
| Changes & Deprecations | Change notes | New field additions summary |
| Glossary Seeds | Glossary seeds | realtimeState, delay, cancellation, freshness, wildcard |

## 10. Changelog (Task Spec Evolution)

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | (replace-with-date) | Initial task spec created |

## 11. Escalation & Missing Data Policy

Missing broker/topic info after retries → NOTE: MISSING DATA with attempted sources.

---
(Do not add EXECUTION_SUMMARY until run phase.)
