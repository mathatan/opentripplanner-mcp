---
# NOTE: This is a TASK specification, not the final documentation.
---

# TASK: Routing API (Consolidated)

## 0. Purpose

Specification for producing final Routing API documentation spanning GraphQL endpoint usage, GraphiQL tooling, glossary subset, realtime integration, translations, shared mobility (bikes/scooters/cars), disruptions, cancellations, itinerary planning logic, routes & stops metadata. This task defines structure & planned scenarios only.

## 1. Scope & Boundaries

- IN SCOPE: All public-facing routing functionality, OTP parameter group mapping, planned example scenarios, edge case definitions, cross-links to realtime and routing-data tasks.
- OUT OF SCOPE: Full prose narratives, complete parameter tables, rendered example bodies, operational infrastructure deployment steps.

## 2. Source Authorities (Always Re-Fetch)

1. [Routing API Overview](https://digitransit.fi/en/developers/apis/1-routing-api/)
2. Subpages (fetch each):
   - GraphQL: <https://digitransit.fi/en/developers/apis/1-routing-api/0-graphql/>
   - GraphiQL: <https://digitransit.fi/en/developers/apis/1-routing-api/1-graphiql/>
   - Glossary: <https://digitransit.fi/en/developers/apis/1-routing-api/2-glossary/>
   - Real-time information: <https://digitransit.fi/en/developers/apis/1-routing-api/3-realtime-information/>
   - Translation: <https://digitransit.fi/en/developers/apis/1-routing-api/4-translations/>
   - Bicycles/Scooters/Cars: <https://digitransit.fi/en/developers/apis/1-routing-api/bicycles-scooters-cars/>
   - Disruption info: <https://digitransit.fi/en/developers/apis/1-routing-api/disruption-info/>
   - Canceled trips: <https://digitransit.fi/en/developers/apis/1-routing-api/canceled-trips/>
   - Itinerary planning: <https://digitransit.fi/en/developers/apis/1-routing-api/itinerary-planning/>
   - Routes: <https://digitransit.fi/en/developers/apis/1-routing-api/routes/>
   - Stops: <https://digitransit.fi/en/developers/apis/1-routing-api/stops/>
3. Architecture: <https://digitransit.fi/en/developers/architecture/x-apis/1-routing-api/>
4. Registration & Keys: <https://digitransit.fi/en/developers/api-registration/>
5. Changes: <https://digitransit.fi/en/developers/changes/>
6. Deprecations: <https://digitransit.fi/en/developers/deprecations/>
7. OTP Topics (context7): RouteRequest, GraphQL schema (Route, Plan, Trip, Stop, RealtimeState fields), FeatureFlags, ItineraryFilters, Rental & Vehicle parking, Complexity limiting (maxNumberOfResultFields), Token schema versioning.

## 3. Deliverables (Structure Blueprint)

Planned final doc sections: Overview; Concepts & Data Domains; Endpoints (GraphQL endpoint + GraphiQL IDE, rate guidance mention); Authentication & Keys (integrated—no standalone auth doc); Schema / Parameters (merged OTP + Digitransit); Usage Examples (>=10 GraphQL scenarios progressive complexity, HTTP header sample, realtime augmentation); Performance & Rate (search window, complexity limiting, caching hints); Error & Edge Cases; Integrated Policy & Terms Notes (licensing/attribution pointers); Change & Deprecation Notes (embedded summary); Testing & Validation; Embedded FAQ Snippets (top recurring questions); References; Changelog; Glossary Seeds subsection.

## 4. Quality Criteria

- All source URLs enumerated & fetchable.
- >=10 example scenarios defined (basic → advanced realtime + complexity).
- Parameter domains map cleanly to OTP topics.
- Realtime integration points (realtimeState, stoptimes, tripUpdates) explicitly identified.
- Cross-links planned to routing-data & realtime tasks.
- Edge case list covers authentication, rate, complexity, timezone, realtime stale, cancellations.

## 5. Detailed Steps (Todo Blueprint)

1. Initialize task todos from sections.
2. Fetch all sources (list above).
3. Resolve & fetch OTP topics.
4. Enumerate parameter domain groups (core routing, heuristics, search window, optimization, accessibility, rental, parking, fares, filters, complexity).
5. Draft planned GraphQL scenarios list:
   - Basic itinerary (origin->dest, default modes)
   - Itinerary with rental bike leg
   - Itinerary with e-scooter leg
   - Park & ride scenario
   - Accessibility: wheelchair + elevators preference
   - Real-time enhanced itinerary (delays & cancellations)
   - Disruption-aware alternative planning
   - Multilingual (translations) itinerary output
   - Filtering limited transfers
   - Complexity-limited query (demonstrate field count reduction)
6. Outline error/edge case checklist mapping to parameters.
7. Note required MQTT/Realtime cross-links (point to Realtime APIs task).
8. Specify deprecation audit steps (scan changes & deprecations pages).
9. Compose performance considerations outline (search window trade-offs, caching hints).
10. Final self-check vs Quality Criteria.
11. Append execution summary placeholder block (to be filled when agent runs).

## 6. Parameter Table Framework (Planned Domains)

| Domain | Representative Parameters (to capture later) | OTP Source Topic | Notes |
|--------|----------------------------------------------|------------------|-------|
| Core request | fromPlace, toPlace, date, time, numItineraries | RouteRequest | Standard planning |
| Modes | transportModes, bikeSpeed, walkSpeed | RouteRequest | Multi-modal combos |
| Accessibility | wheelchair, wheelchairAccessibilityScore | RouteRequest | Add elevator usage if available |
| Rental & Shared | allowBikeRental, maxBikeRentalDistance | Rental/Parking | Include scooters & cars |
| Parking | parkAndRide, carDropoff | Rental/Parking | Park & ride integration |
| Fares | includeFares, fareProducts | RouteRequest | If exposed |
| Realtime | realtimeState, includeRealtimeUpdates | GraphQL schema | Derive via stoptimes/trip updates |
| Filters | itineraryFilters, maxTransfers | ItineraryFilters | Post-processing filters |
| Optimization | optimize, searchWindow | RouteRequest | Heuristic depth/cpu tradeoff |
| Complexity | maxNumberOfResultFields | Complexity limiting | Field budget management |

## 7. Planned Example Scenarios (Placeholders Only)

List only—do NOT implement full queries here.

| ID | Scenario | Example Elements |
|----|----------|------------------|
| EX1 | Basic itinerary | plan query with from/to, first 1 itinerary |
| EX2 | Rental bike integration | plan with bike + transit modes |
| EX3 | E-scooter segment | custom mode parameter + rental network filter |
| EX4 | Park & ride | carPark & transit handoff |
| EX5 | Wheelchair accessible | wheelchair=true filters for accessible stops |
| EX6 | Realtime delays | include realtimeState on legs |
| EX7 | Disruption alternative | compare two itineraries w/ canceled trips |
| EX8 | Multilingual | query with language parameter and translation fields |
| EX9 | Limited transfers | maxTransfers=1 scenario |
| EX10 | Reduced complexity | restrict fields demonstrating complexity enforcement |

## 8. Error & Edge Case Checklist (Planned)

| Case | Trigger Strategy | Expected Handling |
|------|------------------|-------------------|
| Invalid API key | Use placeholder key | 401/403 + guidance |
| Rate limit future | Simulate burst >10rps (conceptual) | Document retry/backoff |
| Unsupported mode | Introduce invalid mode token | Error message mapping |
| Empty result | Remote rural coordinates | Graceful empty itineraries |
| Realtime stale | Force past time beyond update horizon | Flagged realtimeState=UPDATED/DELAYED/NO_DATA |
| Canceled trip | Use canceled trips endpoint context | Alternative itinerary shown |
| Timezone rollover | Trip crossing midnight | Correct service day alignment |
| Vehicle after midnight | Late-night route | Correct trip pattern mapping |
| Complexity exceeded | Intentionally broad field selection | Server truncation / error note |

## 9. Cross-Links & Dependencies

Depends on: routing-data-api (dataset influence on parameters), realtime-apis (realtime state semantics). Integrated (no standalone docs) for: Auth & Registration (keys/quota placeholders), Terms & Usage Policies (attribution pointers), FAQ & Troubleshooting (routing-focused entries), Changes & Deprecations (change scan summary), Glossary (seed terms). Related external tasks if created later: performance-rate-guidance (complexity & optimization deep dive).

### Integrated Meta Topics Plan

| Meta Topic | Integration Point | Planned Content Stub |
|------------|-------------------|----------------------|
| Authentication & Registration | Authentication & Keys section | API key header format, quota placeholder, future rate note |
| Terms & Usage Policies | Policy & Terms Notes subsection | Attribution requirement link, caching constraints summary |
| FAQ & Troubleshooting | Embedded FAQ Snippets | Top 5 Q/A: no results, realtime mismatch, mode unsupported, complexity exceeded, timezone shift |
| Changes & Deprecations | Change & Deprecation Notes | Latest 2–3 changes summary + deprecation detection procedure |
| Glossary Seeds | Glossary Seeds subsection | Core terms: itinerary, leg, stoptime, realtimeState, transfer, complexity budget |

## 10. Changelog (Task Spec Evolution)

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | (replace-with-date) | Initial task spec created |

## 11. Escalation & Missing Data Policy

If any source unreachable after retries, mark domain and proceed with partial task + NOTE: MISSING DATA placeholder.
(Do not add EXECUTION_SUMMARY until run phase.)
