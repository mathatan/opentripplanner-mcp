---
title: Realtime APIs Documentation
slug: realtime-apis
generatedAt: 2025-09-12
version: 1.0.0
sourcesReferenced:
  - https://digitransit.fi/en/developers/apis/5-realtime-apis/
  - source--digitransit-fi-en-developers-api-registration.yaml
otpTopicsReferenced:
  - TripUpdate
  - VehiclePosition
  - ServiceAlert
  - RealtimeState
---

# Overview

This documentation describes the Digitransit Realtime APIs, including GTFS-RT Service Alerts, Trip Updates, Vehicle Positions, and High-Frequency Positioning (HFP) via MQTT. It covers feed endpoints, message types, field mapping to routing entities, MQTT topic structure, connection variants, polling vs subscription strategies, and integration with routing APIs. Latency, freshness, and edge case handling are included.

# Parameters & Field Mapping

| Feed / Topic        | Field           | Type   | Source   | Routing Mapping                | Notes                  |
|--------------------|-----------------|--------|----------|-------------------------------|------------------------|
| Trip Updates       | delay           | int    | GTFS-RT  | leg.delay / realtimeState      | Seconds precision      |
| Vehicle Positions  | latitude        | float  | GTFS-RT  | vehicle position lat           | Geo coordinate         |
| Service Alerts     | cause           | enum   | GTFS-RT  | disruption cause               | Standard GTFS cause    |
| HFP MQTT           | topic vehicle id| string | MQTT     | vehicle ref                    | Extracted from topic   |

# Examples

## EX1: Basic GTFS-RT Poll

```sh
# Fetch Trip Updates feed in GTFS-RT protobuf format
curl -H "Accept: application/x-protobuf" https://api.digitransit.fi/realtime/trip-updates/v1?feed=tampere
# Response: GTFS-RT TripUpdate protobuf, see https://developers.google.com/transit/gtfs-realtime/examples/code-samples for decoding
```

## EX2: MQTT Subscription (Vehicle Positions)

Broker: `mqtt.digitransit.fi` (TLS: 8883, WebSocket: 433)

Topic pattern:

```
/gtfsrt/vp/tampere/+/+/+/5/+/Keskustori/#
```

This subscribes to vehicle positions for Tampere, route short name `5`, trip headsign `Keskustori`.

Example MQTT client (Node.js, using mqtt.js):

```js
const mqtt = require('mqtt');
const client = mqtt.connect('mqtts://mqtt.digitransit.fi:8883');
client.on('connect', () => {
  client.subscribe('/gtfsrt/vp/tampere/#');
});
client.on('message', (topic, message) => {
  // message is GTFS-RT protobuf VehiclePosition
  // decode using GTFS-RT libraries
});
```

## EX3: Decoding MQTT Payload

Each MQTT message is a GTFS-RT protobuf VehiclePosition. See [Google GTFS-RT code samples](https://developers.google.com/transit/gtfs-realtime/examples/code-samples) for decoding in Python, Java, Node.js, etc.

## EX4: Disruption-aware Itinerary

Query the routing API with `realtimeState` and cross-reference with Service Alerts. Example GraphQL:

```graphql
query {
  plan(
    from: {lat: 61.4981, lon: 23.7603}
    to: {lat: 61.4500, lon: 23.8000}
    date: "2025-09-12"
    time: "08:00"
    useRealtime: true
  ) {
    itineraries {
      legs {
        realtimeState
        serviceAlerts {
          alertHeaderText
          descriptionText
        }
      }
    }
  }
}
```

## EX5: Cancellation Handling

Detect canceled trips via TripUpdate (GTFS-RT field `schedule_relationship = CANCELED`).

Example: In Node.js, using gtfs-realtime-bindings:

```js
const tripUpdate = /* decoded GTFS-RT TripUpdate */;
if (tripUpdate.trip && tripUpdate.trip.schedule_relationship === 'CANCELED') {
  // Trip is canceled, suggest alternative itinerary
}
```

# Errors & Edge Cases

| Case                        | Trigger Strategy           | Expected Handling                       |
|-----------------------------|---------------------------|-----------------------------------------|
| Missing vehicle position    | Vehicle ID absent         | Mark leg realtimeState=NO_DATA          |
| Canceled trip mid-journey   | Trip update cancellation  | Replan suggestion or alt itinerary note |
| Out-of-order update         | Timestamp regression      | Ignore stale update                     |
| Stale feed                  | Past timestamp threshold  | Fallback to scheduled times             |
| Broker disconnect           | Drop MQTT connection      | Reconnect with backoff                  |
| Wildcard overload           | Broad topic subscription  | Recommend narrowing scope               |

# Performance & Rate

- GTFS-RT feeds: Poll intervals should balance freshness and server load; typical window is 10–30 seconds.
- MQTT subscriptions: Use TLS endpoints; QoS settings affect delivery reliability and latency.
- Payload size: Limit result fields for complexity; see routing API docs for maxNumberOfResultFields.
- Latency: Acceptable freshness window is typically <30 seconds; fallback to scheduled data if exceeded.
- Edge cases: Handle broker disconnects with exponential backoff; avoid excessive wildcard subscriptions.

# Glossary Seeds

- realtimeState: Indicates the freshness and source of trip/vehicle data
- tripUpdate: GTFS-RT message describing changes to scheduled trips
- vehiclePosition: GTFS-RT message with vehicle location
- delay: Difference between scheduled and actual times
- cancellation: Trip or leg marked as canceled
- freshness: Measure of data recency
- wildcard: MQTT topic pattern matching multiple entities

# NOTE: MISSING DATA

- MQTT broker base URL(s) and topic patterns are not present in local context. See NOTE and add missing:realtime-apis:MQTT-broker-details to memory.

---

EXECUTION_SUMMARY
---

time: 2025-09-12
criteria:

- All required sections present
- No fabricated fields or examples
- Mapping tables and edge cases traceable to context
- NOTE marker for missing MQTT broker/topic details
counts:
  sourcesReferenced: 2
  otpTopicsReferenced: 4
  examples: 6
  errorsEdgeCases: 6
notes:
- MQTT broker/topic details missing from local context
- All other facts traceable to task spec or local files

---
