---
# NOTE: This is a TASK specification, not the final documentation.
---

# TASK: Routing Data API

## 0. Purpose

Specification for producing the Routing Data API documentation: catalog of datasets & feeds, graph build pipeline description, configuration influence mapping, hosting/self-hosting guidance, update cadence, change & deprecation references.

## 1. Scope & Boundaries

- IN SCOPE: Dataset list, formats, refresh cadence, dependency ordering, OTP config mapping, build pipeline phases, hosting scenarios, error/edge planning.
- OUT OF SCOPE: Raw dataset binaries, proprietary infra scripts, full config file dumps.

## 2. Source Authorities (Always Re-Fetch)

1. [Routing Data API Overview](https://digitransit.fi/en/developers/apis/2-routing-data-api/)
2. Architecture: <https://digitransit.fi/en/developers/architecture/x-apis/2-routing-data-api/>
3. Registration & Keys: <https://digitransit.fi/en/developers/api-registration/>
4. Changes: <https://digitransit.fi/en/developers/changes/>
5. Deprecations: <https://digitransit.fi/en/developers/deprecations/>
6. OTP Topics (context7): Graph build pipeline, router-config parameters (network, transit, elevation, fares), FeatureFlags, Cache & data eviction, Token schema versioning.

## 3. Deliverables (Structure Blueprint)

Planned final doc sections: Overview; Dataset Catalog; Build & Integration Workflow; Configuration Parameter Mapping; Hosting & Self-Hosting; Performance & Scaling; Error & Edge Cases; Integrated Policy & Terms Notes (attribution/licensing pointers); Change & Deprecation Notes; Testing & Validation; References; Changelog; Glossary Seeds.

## 4. Quality Criteria

- Each dataset row: name, format, cadence, dependencies, usage context.
- OTP config domains (fares, elevation, rental, parking, realtime ingestion, filtering) mapped.
- Build pipeline stages clearly delineated (ingest, preprocess, link, index, publish).
- Hosting guidance separates required vs optional datasets.
- Edge cases include partial/missing feeds, corrupted artifacts, stale data, mismatch in fare zones.
- Cross-links to routing-api (parameter consumer) & realtime-apis (GTFS-RT ingestion seeds).

## 5. Detailed Steps (Todo Blueprint)

1. Fetch sources (list above).
2. Resolve & pull OTP topics (graph build + router-config + feature flags).
3. Enumerate dataset endpoints (GTFS, GTFS-RT seeds if relevant, OSM extracts, elevation, POI overlays, rental feeds).
4. Capture for each dataset: purpose, format, update frequency, dependency order.
5. Outline graph build pipeline sequence (ingest > preprocess > link > index > publish).
6. Map OTP configuration parameters to dataset influence (e.g., fare zones, bike rental networks, parking capacity).
7. Define hosting scenarios: minimal vs full dataset set; local caching considerations.
8. Identify potential failure modes (partial dataset, missing timezone, corrupted feed) and handling strategies.
9. Cross-link to Routing API task for how datasets surface in queries.
10. Performance considerations (graph size, memory, build duration) placeholders.
11. Add change/deprecation audit placeholders.
12. Self-check vs Quality Criteria.
13. Execution summary placeholder.

## 6. Dataset Catalog Framework (Planned Table)

| Dataset | Format | Source/URL (placeholder) | Update Cadence | Dependencies | Notes |
|---------|--------|--------------------------|----------------|-------------|-------|
| GTFS feeds | zip | (list feeds) | daily/region-specific | base | Service schedule core |
| OSM extract | pbf | (extract URL) | weekly/monthly | GTFS (for linking) | Streets, walk/bike graph |
| Elevation | raster | (tile set) | infrequent | OSM | Slope penalties |
| Rental feeds | GBFS | (provider endpoints) | minutes | GTFS/OSM | Vehicle availability |
| Parking data | JSON/GTFS-ext | (endpoint) | hourly/daily | OSM | Park & ride |
| POI overlay | geojson | (endpoint) | periodic | OSM | Landmarks, attraction weighting |
| Fare rules | txt (GTFS) / config | (fare config) | with GTFS | GTFS | Pricing model |

## 7. Planned Mapping of Config Parameters

| OTP Config Domain | Example Parameters | Dataset Influence |
|-------------------|--------------------|-------------------|
| Routing defaults | walkSpeed, bikeSpeed, maxPreTransitTime | GTFS, OSM |
| Fares | fareProducts, fareServiceClasses | GTFS fare files |
| Rental | allowBikeRental, maxBikeRentalDistance | Rental feeds |
| Parking | parkAndRide, carDropoff | Parking data |
| Realtime ingestion | enableGTFSRealtime, maxStopTimeDelay | GTFS-RT seeds |
| Elevation | elevationBucket, disableElevationProcessing | Elevation raster |
| Filtering | itineraryFilters, transitGeneralizedCostLimit | All combined |

## 8. Error & Edge Case Checklist (Planned)

| Case | Trigger Strategy | Expected Handling |
|------|------------------|-------------------|
| Missing GTFS feed | Remove one feed | Build fails with explicit diagnostics |
| Stale OSM extract | Use outdated timestamp | Warning + possible degraded routing |
| Corrupted elevation tiles | Provide invalid tile | Elevation disabled fallback |
| Rental feed timeout | Simulate network error | Retry/backoff, partial availability |
| Fare config mismatch | Inconsistent zone IDs | Fare calculation fallback or error |
| Partial GTFS (no calendar) | Strip calendar.txt | Default service assumption / fail |

## 9. Cross-Links & Dependencies

Depends on: (none prior). Provides inputs to: routing-api (parameter behavior), realtime-apis (baseline feeds), map-api (geometries influences), realtime-apis (GTFS-RT alignment), performance-rate-guidance (build metrics). Integrated meta topics: Auth (key for dataset access if applicable), Terms (data licensing & attribution), FAQ (missing feed, stale extract, corrupted elevation), Changes (new dataset or format versions), Glossary Seeds (feed, extract, graph build, linking, publish).

### Integrated Meta Topics Plan

| Meta Topic | Integration Point | Planned Content Stub |
|------------|-------------------|----------------------|
| Authentication & Registration | Hosting & Self-Hosting | API key / access note or statement of openness |
| Terms & Usage Policies | Policy & Terms Notes | Attribution for GTFS/OSM/elevation sources |
| FAQ & Troubleshooting | Embedded FAQ subsection | Missing feed, stale OSM, elevation gap, fare mismatch, partial calendar |
| Changes & Deprecations | Change & Deprecation Notes | Recent feed schema or pipeline change summary |
| Glossary Seeds | Glossary seeds | feed, extract, graph build, linker, publish window |

## 10. Changelog (Task Spec Evolution)

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | (replace-with-date) | Initial task spec created |

## 11. Escalation & Missing Data Policy

Unresolvable dataset attribute after retries → add NOTE: MISSING DATA with attempted sources & gap rationale.

---
(Do not add EXECUTION_SUMMARY until run phase.)
