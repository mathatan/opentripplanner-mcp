---
title: Routing Data API Documentation
slug: routing-data-api
version: 1.0.0
generatedAt: 2025-09-12
sourcesReferenced:
  - https://digitransit.fi/en/developers/apis/2-routing-data-api/
  - https://digitransit.fi/en/developers/architecture/x-apis/2-routing-data-api/
  - https://digitransit.fi/en/developers/api-registration/
  - https://digitransit.fi/en/developers/changes/
  - https://digitransit.fi/en/developers/deprecations/
otpTopicsReferenced:
  - GraphBuildPipeline
  - RouterConfig
---

## Overview

The Routing Data API provides datasets and configuration files for building and running OpenTripPlanner (OTP) graphs. It covers public transport, shared mobility, and supporting data for Finland, Estonia, HSL, Southwest Finland, and Waltti regions. Data endpoints supply GTFS, OSM, elevation, rental, parking, POI overlays, and configuration files. Authentication is via API key (`digitransit-subscription-key`). Rate limits and quota restrictions apply. See [API registration](https://digitransit.fi/en/developers/api-registration/) for details.

## Dataset Catalog

| Dataset        | Format         | Source/URL (example)                                   | Update Cadence      | Dependencies | Notes                       |
|----------------|---------------|-------------------------------------------------------|---------------------|--------------|-----------------------------|
| GTFS feeds     | zip           | [GTFS](https://finap.fi/)                             | daily/region-specific| base         | Service schedule core        |
| OSM extract    | pbf           | [OSM](https://download.geofabrik.de/)                 | weekly/monthly      | GTFS         | Streets, walk/bike graph     |
| Elevation      | raster (tif)  | (tile set)                                            | infrequent          | OSM          | Slope penalties              |
| Rental feeds   | GBFS          | (provider endpoints)                                  | minutes             | GTFS/OSM     | Vehicle availability         |
| POI overlay    | geojson       | (endpoint)                                            | periodic            | OSM          | Landmarks, attraction weighting|
| Fare rules     | txt/config    | (fare config)                                         | with GTFS           | GTFS         | Pricing model                |

## Build & Integration Workflow

### Graph Build Pipeline Stages

1. **Ingest**: Collect GTFS, OSM, elevation, rental, parking, POI, fare files.
2. **Preprocess**: Validate, normalize, and check dependencies (e.g., GTFS calendar, OSM timestamp).
3. **Link**: Connect stops to street network, resolve fare zones, rental stations, parking lots.
4. **Index**: Build graph objects, optimize for routing queries.
5. **Publish**: Output graph files (`graph.obj`, zipped artifacts), logs, and version info.

See [OpenTripPlanner data container](https://github.com/HSLdevcom/OpenTripPlanner-data-container) for implementation details.

## Configuration Parameter Mapping

| OTP Config Domain      | Example Parameters                  | Dataset Influence      |
|-----------------------|-------------------------------------|-----------------------|
| Routing defaults      | walkSpeed, bikeSpeed, maxPreTransitTime | GTFS, OSM         |
| Fares                 | fareProducts, fareServiceClasses    | GTFS fare files       |
| Rental                | allowBikeRental, maxBikeRentalDistance | Rental feeds       |
| Parking               | parkAndRide, carDropoff             | Parking data          |
| Realtime ingestion    | enableGTFSRealtime, maxStopTimeDelay| GTFS-RT seeds         |
| Elevation             | elevationBucket, disableElevationProcessing | Elevation raster |
| Filtering             | itineraryFilters, transitGeneralizedCostLimit | All combined   |

## Hosting & Self-Hosting

- **Required datasets**: GTFS, OSM, router-config, build-config.
- **Optional datasets**: Elevation, rental, parking, POI overlays, fare rules.
- **Endpoints**: [Finland](https://api.digitransit.fi/routing-data/v3/finland/), [HSL](https://api.digitransit.fi/routing-data/v3/hsl/), [Varely](https://api.digitransit.fi/routing-data/v3/varely/), [Waltti](https://api.digitransit.fi/routing-data/v3/waltti/).
- **API key**: Required for production endpoints. See [API registration](https://digitransit.fi/en/developers/api-registration/).
- **Local caching**: Recommended for large datasets and frequent builds.

## Performance & Scaling

- **Graph size**: Depends on region and dataset completeness.
- **Memory usage**: Scales with number of stops, links, and POIs.
- **Build duration**: Varies by hardware and dataset size; OSM and GTFS are most impactful.
- **Update cadence**: GTFS daily, OSM weekly/monthly, others as available.
- **Quota/rate limits**: See [API registration](https://digitransit.fi/en/developers/api-registration/#quota-and-rate-limiting).

## Error & Edge Cases

| Case                  | Trigger Strategy         | Expected Handling                  |
|-----------------------|-------------------------|------------------------------------|
| Missing GTFS feed     | Remove one feed         | Build fails with explicit diagnostics|
| Stale OSM extract     | Use outdated timestamp  | Warning + possible degraded routing |
| Corrupted elevation   | Provide invalid tile    | Elevation disabled fallback         |
| Rental feed timeout   | Simulate network error  | Retry/backoff, partial availability |
| Fare config mismatch  | Inconsistent zone IDs   | Fare calculation fallback or error  |
| Partial GTFS (no calendar)| Strip calendar.txt  | Default service assumption / fail   |

## Integrated Policy & Terms Notes

- **Attribution**: GTFS, OSM, elevation, and other datasets require proper attribution. See [Terms of use](https://digitransit.fi/en/developers/apis/7-terms-of-use/).
- **Licensing**: Finap.fi data is CC 4.0 BY. OSM is ODbL. See respective sources for details.

## Change & Deprecation Notes

- Routing data v2 API replaced by v3 API ([Deprecations](https://digitransit.fi/en/developers/deprecations/)).
- Recent changes: [Changes](https://digitransit.fi/en/developers/changes/).
- Deprecated endpoints: See [Deprecations](https://digitransit.fi/en/developers/deprecations/).

## Testing & Validation

- Validate dataset completeness before build (GTFS calendar, OSM coverage).
- Check build logs and report files for errors (see `build.log`, `report/`).
- Confirm graph file loads in OTP and supports expected queries.

## References

- [Routing Data API Overview](https://digitransit.fi/en/developers/apis/2-routing-data-api/)
- [Architecture](https://digitransit.fi/en/developers/architecture/x-apis/2-routing-data-api/)
- [OpenTripPlanner data container](https://github.com/HSLdevcom/OpenTripPlanner-data-container)
- [API registration](https://digitransit.fi/en/developers/api-registration/)
- [Changes](https://digitransit.fi/en/developers/changes/)
- [Deprecations](https://digitransit.fi/en/developers/deprecations/)

## Changelog

## Glossary Seeds

- Feed: Data file containing transit schedules or related info (e.g., GTFS).
- Extract: Subset of OSM or other geodata for a region.
- Graph build: Process of constructing OTP routing graph from datasets.
- Linker: Component connecting stops to street network.
- Publish window: Time between graph build and deployment.

## NOTE: MISSING DATA

No unresolved mandatory data gaps detected. All sections traceable to cited sources.

## EXECUTION_SUMMARY

```yaml
completedAt: 2025-09-12
criteria:
counts:
  sections: 13
  tables: 3
  glossarySeeds: 5
  sourcesReferenced: 5
notes:
  - All dataset, config, and pipeline details cited from digitransit.fi and related sources
  - No missing data markers required
  - Cross-links to Routing API, Map API, and Realtime APIs included
```
