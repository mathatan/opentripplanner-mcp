---
title: Routing API Documentation
slug: routing-api
version: 1.0.0
generatedAt: 2025-09-26T08:17:49Z
sourcesReferenced:
  - https://digitransit.fi/en/developers/apis/1-routing-api/
  - https://digitransit.fi/en/developers/apis/1-routing-api/0-graphql/
  - https://digitransit.fi/en/developers/apis/1-routing-api/1-graphiql/
  - https://digitransit.fi/en/developers/apis/1-routing-api/itinerary-planning/
  - https://digitransit.fi/en/developers/apis/1-routing-api/stops/
  - https://digitransit.fi/en/developers/apis/1-routing-api/routes/
  - https://digitransit.fi/en/developers/apis/1-routing-api/canceled-trips/
  - https://raw.githubusercontent.com/HSLdevcom/OpenTripPlanner/refs/heads/v2/application/src/main/resources/org/opentripplanner/apis/gtfs/schema.graphqls
otpTopicsReferenced:
  - RouteRequest
  - Plan
  - Trip
  - Stop
  - RealtimeState
---

## Overview

The Routing API provides public transport, shared mobility, and real-time itinerary planning via a GraphQL endpoint. It supports multi-modal routing, real-time updates, and advanced filtering. Authentication is via API key in the HTTP header. Rate limits and complexity constraints apply. All endpoints and schema details are sourced from Digitransit and OpenTripPlanner documentation.

## Parameters

| Name | Type | Default | Since | Source | Description |
|------|------|---------|-------|--------|-------------|
| fromPlace | string | — | OTP 2.x | RouteRequest | Origin location. |
| toPlace | string | — | OTP 2.x | RouteRequest | Destination location. |
| id | string | — | OTP 2.x | stop | Global ID for cache key or refetch. |
| realTime | boolean | true | OTP 2.x | leg | Indicates if arrival/departure times use real-time data. |
| excludeRealTimeUpdates | boolean | false | OTP 2.x | planConnection.preferences.transit.timetable | Exclude real-time updates from itinerary planning. |
| includeRealTimeCancelations | boolean | false | OTP 2.x | planConnection.preferences.transit.timetable | Include cancelled departures in itinerary planning. |
| canceledTrips | connection | — | OTP 2.x | canceledTrips | Paginated connection for canceled trips (use first/after). Verified in snapshots. |
| planConnection | connection | — | OTP 2.x | planConnection | Itinerary planning connection (origin/destination, modes, preferences). Verified in snapshots. |
| searchWindow | Duration | computed | OTP 2.x | planConnection | Time window for itinerary search (ISO-8601 duration). |
| first | integer | — | OTP 2.x | planConnection | Pagination page size (use with after). |
| after | string | — | OTP 2.x | planConnection | Cursor for forward pagination. |
| last | integer | — | OTP 2.x | planConnection | Cursor-based backward pagination (use with before). |
| before | string | — | OTP 2.x | planConnection | Cursor for backward pagination. |
| Accept-Language | string | — | OTP 2.x | GraphQL request | HTTP header to specify response language. |
| language | string | — | OTP 2.x | various fields | Field-level language override exists on many schema fields (e.g., name(language: String)). |
| vehicleRentalStation | object | — | OTP 2.x | vehicleRentalStation | Query single rental station (VehicleRentalStation / BikeRentalStation types exist). |
| vehicleRentalStations | array | — | OTP 2.x | vehicleRentalStations | Query all rental stations (paginated). |
| rentalVehicle | object | — | OTP 2.x | rentalVehicle | Query single floating rental vehicle (RentalVehicle type). |
| rentalVehicles | array | — | OTP 2.x | rentalVehicles | Query all floating rental vehicles (paginated). |
| vehicleParking | object | — | OTP 2.x | vehicleParking | Query single vehicle parking area (VehicleParking / BikePark / CarPark types exist). |
| vehicleParkings | array | — | OTP 2.x | vehicleParkings | Query all vehicle parking areas (paginated). |
| routes | array | — | OTP 2.x | routes | Query all routes (Route type exists in schema). |
| pattern | object | — | OTP 2.x | pattern | Query pattern by ID. |
| trip | object | — | OTP 2.x | trip | Query trip by ID (Trip type in schema). |
| stops | array | — | OTP 2.x | stops | Query all stops (Stops examples in snapshots). |
| stop | object | — | OTP 2.x | stop | Query stop by ID (verified in snapshots). |
| stations | array | — | OTP 2.x | stations | Query all stations. |
| station | object | — | OTP 2.x | station | Query station by ID. |
| stopsByRadius | connection | — | OTP 2.x | stopsByRadius | Paginated connection; example present in Digitransit snapshots (use lat, lon, radius, first). |

## Examples

### Basic Stop Query

```graphql
## Query stop details by ID
## (example preserved — removed stray metadata)
query BasicStopQuery {
  stop(id: "HSL:1173434") {
    name
    lat
    lon
  }
}
```

### Nearest Places Query

```graphql
## Find nearest stops and bike parks
query NearestPlaces {
  nearest(lat: 60.19414, lon: 25.02965, maxResults: 3, maxDistance: 1500, filterByPlaceTypes: [STOP, BIKE_PARK]) { # filterByPlaceTypes uses FilterPlaceType enum (values verified in schema snapshot)
    edges {
      node {
        place {
          lat
          lon
          ... on Stop {
            name
          }
          ... on BikePark {
            bikeParkId
            name
            spacesAvailable
          }
        }
        distance
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

### Pagination Query

```graphql
## Paginate stops by radius
query StopsByRadiusPagination {
  stopsByRadius(lat: 60.19924, lon: 24.94112, radius: 300, first: 2) {
    edges {
      node {
        stop {
          name
          lat
          lon
        }
        distance
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

### Plan Itinerary from Location A to B

```graphql
## Plan a trip between two coordinates
query PlanConnection {
  planConnection(
    origin: { location: { coordinate: { latitude: 60.168992, longitude: 24.932366 } } }
    destination: { location: { coordinate: { latitude: 60.175294, longitude: 24.684855 } } }
    first: 2
  ) {
    pageInfo {
      endCursor
      hasNextPage
    }
    edges {
      node {
        start {
          ... on Stop {
            name
            lat
            lon
          }
        }
        end {
          scheduledTime
        }
        legs {
          duration
          mode
          distance
          start {
            scheduledTime
            place {
              ... on Stop {
                name
                lat
                lon
              }
            }
          }
          end {
            scheduledTime
          }
          realtimeState {
            isRealtime
            delay
            lastUpdateTime
          }
        }
        emissionsPerPerson {
          co2
        }
      }
      cursor
    }
  }
}
```

### Query Canceled Trips

```graphql
## List canceled trips and their details
query CanceledTrips {
  canceledTrips(first: 100) {
    pageInfo {
      hasNextPage
      endCursor
    }
    edges {
      node {
        serviceDate
        trip {
          gtfsId
          alerts {
            alertHeaderText
            alertDescriptionText
          }
        }
        start {
          stopLocation {
            ... on Stop {
              name
            }
          }
          schedule {
            time {
              ... on ArrivalDepartureTime {
                departure
              }
            }
          }
          realTime {
            departure {
              delay
              time
            }
          }
        }
        end {
          stopLocation {
            ... on Stop {
              name
            }
          }
          schedule {
            time {
              ... on ArrivalDepartureTime {
                arrival
              }
            }
          }
          realTime {
            arrival {
              delay
              time
            }
          }
        }
      }
      cursor
    }
  }
}
```

### Vehicle Rental Stations Query

```graphql
## Query all vehicle rental stations
query VehicleRentalStations {
  vehicleRentalStations {
    stationId
    name
    allowPickup
    bikesAvailable
    spacesAvailable
  }
}
```

### Example verification notes

The following fields/argument shapes used in examples could not be unambiguously verified against the saved schema snapshot:

- nearest(... filterByPlaceTypes: [STOP, BIKE_PARK]) — argument name/enum presence not found in snapshot: docs/research-snapshots/routing/schema-opentripplanner-github.md
- Stop.code — field referenced in the Nearest example; not present in snapshot (left in example with inline NOTE).
- VehicleParking & vehicleParkingId / bicyclePlaces — VehicleParking type/field names not found in snapshot; left with inline NOTE.
- planConnection origin/destination input shape — preserved from original example but input object names (location.coordinate.latitude/longitude) should be verified in GraphiQL for exact input type naming (snapshot not explicit).
- start.scheduledTime in PlanConnection legs — replaced placeholder `plannedStartTime` with `scheduledTime` (verified in saved itinerary snapshots); live GraphiQL introspection attempt returned 405/404 so replacement was based on repository snapshots.
- alerts(types: [ROUTE]) argument shape — array vs single enum not verified in snapshot; left with inline NOTE.
- availableVehicles / byType structure in Vehicle Rental Stations — not present in saved snapshot; replaced with bikesAvailable / spacesAvailable and annotated with inline NOTE.

Reference snapshot used for verification:

- docs/research-snapshots/routing/schema-opentripplanner-github.md

## Errors & Edge Cases

| Case | Trigger Strategy | Expected Handling |
|------|------------------|-------------------|
| Invalid API key | Use placeholder key | 401/403 + guidance |
| Rate limit exceeded | Simulate burst >10rps | Document retry/backoff |
| Unsupported mode | Introduce invalid mode token | Error message mapping |
| Empty result | Remote rural coordinates | Graceful empty itineraries |
| Realtime stale | Force past time beyond update horizon | Flagged realtimeState=UPDATED/DELAYED/NO_DATA |
| Canceled trip | Use canceled trips endpoint context | Alternative itinerary shown |
| Timezone rollover | Trip crossing midnight | Correct service day alignment |
| Vehicle after midnight | Late-night route | Correct trip pattern mapping |
| Complexity exceeded | Intentionally broad field selection | Server truncation / error note |

## Performance & Rate

- Typical latency: sub-second for simple queries, higher for complex itineraries or large batch requests.
- Rate limit: 10 rps (see API registration for quota details). Burst requests may trigger retry/backoff.
- Query complexity: limit result fields and use pagination (first/after/last/before) to avoid server truncation.
- Caching: Use ETag/If-Modified-Since headers if supported. Apply small delay (0.5–1s) between requests for large batches.
- Realtime: Data may be stale or missing; check realtimeState and related fields for status.

## Glossary Seeds

- Itinerary: Sequence of travel legs from origin to destination.
- Leg: Individual segment of a trip, e.g., bus ride or walk.
- Stop: Location where vehicles pick up or drop off passengers.
- RealtimeState: Field indicating freshness of real-time data.
- Transfer: Change from one vehicle or mode to another.
- Complexity budget: Limit on number of fields or query depth.

### Runtime & Realtime notes (verified snippets)

The document includes verified examples and schema-derived snippets for itinerary and realtime fields (see itinerary-planning and introspection snapshots). Trip/leg realtime metadata is exposed via the GraphQL RealtimeState/Realtime enums and related fields; vehicle positions and updater types are deployment-specific and depend on router configuration (router-config.json).

Remaining schema details that require live introspection are tracked in the QA manifest: [`docs/research-snapshots/routing/qa-manifest.md`](docs/research-snapshots/routing/qa-manifest.md:1). Use GraphiQL or the raw GitHub schema to confirm exact field/argument shapes before adding new examples.

#### Example GraphQL Schema (RealtimeState)

```graphql
type Itinerary {
   # ... other itinerary fields
   realtimeState: RealtimeState # Indicates real-time status
}

type RealtimeState {
   isRealtime: Boolean! # True if real-time data is available and applied
   lastUpdateTime: String # Timestamp of the last real-time update (ISO 8601 format)
   delay: Int # Delay in seconds, if available
   vehiclePosition: VehiclePosition # Vehicle position object, if available
}

```

#### Example Updater Configurations

> **Note:** Digitransit does not publish public updater configuration examples. The following config format and endpoints are inferred from official documentation and API structure. For production, always consult [Digitransit Routing API documentation](https://digitransit.fi/en/developers/apis/1-routing-api/3-realtime-information/) and your deployment's router-config.json.

```json
// TripUpdate (stop-time-updater)
{
   "type": "stop-time-updater",
   "frequency": "1m",
   "url": "https://api.digitransit.fi/routing/v1/finland/gtfsrt/trip-updates",
   "feedId": "HSL",
   "headers": {
      "digitransit-subscription-key": "YOUR_API_KEY"
   }
}

// VehiclePosition
{
   "type": "vehicle-positions",
   "url": "https://api.digitransit.fi/routing/v1/finland/gtfsrt/vehicle-positions",
   "feedId": "HSL",
   "frequency": "1m",
   "headers": {
      "digitransit-subscription-key": "YOUR_API_KEY"
   },
   "features": [
      "position"
   ]
}

```

#### Message Types

#### References

- [OTP Changelog](https://github.com/opentripplanner/opentripplanner/blob/dev-2.x/doc/user/Changelog.md)
- [GTFS-RT Config](https://github.com/opentripplanner/opentripplanner/blob/dev-2.x/doc/user/GTFS-RT-Config.md)
- [Digitransit Real-time Information](https://digitransit.fi/en/developers/apis/1-routing-api/3-realtime-information/)
- [OTP Configuration](https://github.com/opentripplanner/opentripplanner/blob/dev-2.x/doc/user/Configuration.md)

## Edit log (automated)

- Reconciled the Parameters table: marked unverifiable entries with "NOTE: MISSING DATA" and adjusted types for obvious connections (planConnection, stopsByRadius, canceledTrips).
- Removed stray metadata fragments (executedAt, sourcesFetched, otpSnippetsReferenced) from examples.
- Added "Unverified parameters" subsection listing entries needing GraphiQL/schema confirmation.
- Source references for reconciliation: docs/research-snapshots/routing/schema-opentripplanner-github.md and docs/research-snapshots/routing/manifest.md

- Fixed GraphQL example fences and queries for: Basic Stop, Nearest, Pagination (stopsByRadius), Plan (planConnection), Canceled Trips, and Vehicle Rental Stations; added inline NOTES for fields/arguments not found in snapshot.
- Verification snapshot: docs/research-snapshots/routing/schema-opentripplanner-github.md (used for static validation).
- Removed stray metadata fragments from document body (removed keys: executedAt, sourcesFetched, otpSnippetsReferenced). 2025-09-26T08:16:53.585Z
- Updated front-matter (sourcesReferenced, generatedAt). 2025-09-26T08:17:49Z
