---
title: Routing API Documentation
slug: routing-api
version: 1.0.0
generatedAt: 2025-09-12T12:34:56Z
sourcesReferenced:
  - https://digitransit.fi/en/developers/apis/1-routing-api/
  - https://digitransit.fi/en/developers/apis/1-routing-api/0-graphql/
  - https://digitransit.fi/en/developers/apis/1-routing-api/1-graphiql/
  - https://digitransit.fi/en/developers/apis/1-routing-api/2-glossary/
  - https://digitransit.fi/en/developers/apis/1-routing-api/3-realtime-information/
  - https://digitransit.fi/en/developers/apis/1-routing-api/4-translations/
  - https://digitransit.fi/en/developers/apis/1-routing-api/bicycles-scooters-cars/
  - https://digitransit.fi/en/developers/apis/1-routing-api/disruption-info/
  - https://digitransit.fi/en/developers/apis/1-routing-api/canceled-trips/
  - https://digitransit.fi/en/developers/apis/1-routing-api/itinerary-planning/
  - https://digitransit.fi/en/developers/apis/1-routing-api/routes/
  - https://digitransit.fi/en/developers/apis/1-routing-api/stops/
  - https://digitransit.fi/en/developers/architecture/x-apis/1-routing-api/
  - https://digitransit.fi/en/developers/api-registration/
  - https://digitransit.fi/en/developers/changes/
  - https://digitransit.fi/en/developers/deprecations/
otpTopicsReferenced:
  - RouteRequest
  - Plan
  - Trip
  - Stop
  - RealtimeState
---

# Overview

The Routing API provides public transport, shared mobility, and real-time itinerary planning via a GraphQL endpoint. It supports multi-modal routing, real-time updates, and advanced filtering. Authentication is via API key in the HTTP header. Rate limits and complexity constraints apply. All endpoints and schema details are sourced from Digitransit and OpenTripPlanner documentation.

# Parameters

| Name | Type | Default | Since | Source | Description |
|------|------|---------|-------|--------|-------------|
| fromPlace | string | — | OTP 2.x | RouteRequest | Origin location |
| toPlace | string | — | OTP 2.x | RouteRequest | Destination location |
| id | string | — | OTP 2.x | stop | Global ID for cache key or refetch |
| realTime | boolean | true | OTP 2.x | leg | Indicates if arrival/departure times use real-time data |
| excludeRealTimeUpdates | boolean | false | OTP 2.x | planConnection.preferences.transit.timetable | Exclude real-time updates from itinerary planning |
| includeRealTimeCancelations | boolean | false | OTP 2.x | planConnection.preferences.transit.timetable | Include cancelled departures in itinerary planning |
| canceledTrips | array | — | OTP 2.x | canceledTrips | Query canceled trips |
| planConnection | object | — | OTP 2.x | planConnection | Query itineraries between origin and destination |
| searchWindow | string | computed | OTP 2.x | planConnection | Time window for itinerary search |
| first | integer | 2 | OTP 2.x | planConnection | Number of itineraries to return |
| after | string | — | OTP 2.x | planConnection | Cursor for pagination |
| last | integer | — | OTP 2.x | planConnection | Number of previous itineraries to return |
| before | string | — | OTP 2.x | planConnection | Cursor for pagination (previous) |
| Accept-Language | string | — | OTP 2.x | GraphQL request | HTTP header to specify response language |
| language | string | — | OTP 2.x | vehicleParkings.name | Field parameter to override response language |
| vehicleRentalStation | object | — | OTP 2.x | vehicleRentalStation | Query single rental station |
| vehicleRentalStations | array | — | OTP 2.x | vehicleRentalStations | Query all rental stations |
| rentalVehicle | object | — | OTP 2.x | rentalVehicle | Query single floating rental vehicle |
| rentalVehicles | array | — | OTP 2.x | rentalVehicles | Query all floating rental vehicles |
| vehicleParking | object | — | OTP 2.x | vehicleParking | Query single vehicle parking area |
| vehicleParkings | array | — | OTP 2.x | vehicleParkings | Query all vehicle parking areas |
| routes | array | — | OTP 2.x | routes | Query all routes |
| pattern | object | — | OTP 2.x | pattern | Query pattern by ID |
| trip | object | — | OTP 2.x | trip | Query trip by ID |
| stops | array | — | OTP 2.x | stops | Query all stops |
| stop | object | — | OTP 2.x | stop | Query stop by ID |
| stations | array | — | OTP 2.x | stations | Query all stations |
| station | object | — | OTP 2.x | station | Query station by ID |
| stopsByRadius | array | — | OTP 2.x | stopsByRadius | Query stops by location and radius |

# Examples

## Basic Stop Query

```graphql
# Query stop details by ID
-
executedAt: 2025-09-12T12:34:56Z

sourcesFetched: 15

otpSnippetsReferenced:

   }
}
```

## Nearest Places Query

```graphql
# Find nearest stops and bike parks
{
   nearest(lat: 60.19414, lon: 25.02965, maxResults: 3, maxDistance: 1500, filterByPlaceTypes: [STOP, BIKE_PARK]) {
      edges {
         node {
            place {
               lat
               lon
               ...on Stop {
                  name
                  gtfsId
                  code
               }
               ...on VehicleParking {
                  vehicleParkingId
                  name
                  bicyclePlaces
               }
            }
            distance
         }
      }
   }
}
```

## Pagination Query

```graphql
# Paginate stops by radius
{
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

         ---
      }
   }
}
```

## Plan Itinerary from Location A to B

```graphql
# Plan a trip between two coordinates
{
   planConnection(
      origin: {location: {coordinate: {latitude: 60.168992, longitude: 24.932366}}}
      destination: {location: {coordinate: {latitude: 60.175294, longitude: 24.684855}}}
      first: 2
   ) {
      pageInfo {
         endCursor
      }
      edges {
         node {
            start
            end
            legs {
               duration
               mode
               distance
               start {
               }
               end {
                  scheduledTime
               }
               mode
               duration
               realtimeState
            }
            emissionsPerPerson {
               co2
            }
         }
      }
   }
}
```

## Query Canceled Trips

```graphql
# List canceled trips and their details
{
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
               alerts (types:ROUTE) {
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
      }
   }
}
```

## Vehicle Rental Stations Query

```graphql
# Query all vehicle rental stations
{
   vehicleRentalStations {
      stationId
      name
      allowPickup
      availableVehicles {
         byType {
            count
            vehicleType {
               formFactor
            }
         }
      }
   }
}
```

# Errors & Edge Cases

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

# Performance & Rate

- Typical latency: sub-second for simple queries, higher for complex itineraries or large batch requests.
- Rate limit: 10 rps (see API registration for quota details). Burst requests may trigger retry/backoff.
- Query complexity: limit result fields and use pagination (first/after/last/before) to avoid server truncation.
- Caching: Use ETag/If-Modified-Since headers if supported. Apply small delay (0.5–1s) between requests for large batches.
- Realtime: Data may be stale or missing; check realtimeState and related fields for status.

# Glossary Seeds

- Itinerary: Sequence of travel legs from origin to destination.
- Leg: Individual segment of a trip, e.g., bus ride or walk.
- Stop: Location where vehicles pick up or drop off passengers.
- RealtimeState: Field indicating freshness of real-time data.
- Transfer: Change from one vehicle or mode to another.
- Complexity budget: Limit on number of fields or query depth.

# NOTE: MISSING DATA

## ItineraryAdjustment

*OptimizeTransfers*: OTP inspects all found itineraries and optimizes transfer locations (stops), considering waiting time, priority, and guaranteed transfers. (Feature flag, affects itinerary results)

## TripUpdate

*TripUpdates* report on the status of scheduled trips as they happen, providing observed and predicted arrival and departure times for the remainder of the trip.
Updater type: `stop-time-updater` (router-config.json)
GraphQL: Trip legs expose `realtimeState`, `start.estimated`, `end.estimated`, and delay fields.

*VehiclePositions* give the location of some or all vehicles currently in service, in terms of geographic coordinates or position relative to their scheduled stops.
Updater type: `vehicle-positions` (router-config.json)
GraphQL: Vehicle position data is available via `vehiclePosition` field in trip/leg objects (if supported by feed).

*RealtimeState* field in GraphQL itinerary/leg/trip objects indicates if real-time data is available and applied.
Fields: `isRealtime` (Boolean), `lastUpdateTime` (ISO 8601), `delay`, `vehiclePosition`

### Example GraphQL Schema (RealtimeState)

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

### Example Updater Configurations

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

### Message Types

### References

- [OTP Changelog](https://github.com/opentripplanner/opentripplanner/blob/dev-2.x/doc/user/Changelog.md)
- [GTFS-RT Config](https://github.com/opentripplanner/opentripplanner/blob/dev-2.x/doc/user/GTFS-RT-Config.md)
- [Digitransit Real-time Information](https://digitransit.fi/en/developers/apis/1-routing-api/3-realtime-information/)
- [OTP Configuration](https://github.com/opentripplanner/opentripplanner/blob/dev-2.x/doc/user/Configuration.md)
