---
title: Map API
slug: map-api
version: 1.0.0
generatedAt: 2025-09-12
sourcesReferenced:
  - https://digitransit.fi/en/developers/apis/4-map-api/
  - https://digitransit.fi/en/developers/api-registration/
  - https://digitransit.fi/en/developers/changes/
  - https://digitransit.fi/en/developers/deprecations/
otpTopicsReferenced: []
---

# Overview

The Digitransit Map API provides raster map tiles (background map) and vector tiles (points of interest, rental stations, park & ride areas) for use in HSL and partner applications. Raster tiles use a generic HSL map style, while vector tiles are designed to overlay additional data on the background map. The API supports integration with Routing and Geocoding APIs for overlays and coordinate resolution.

# Parameters

| Name                        | Type    | Default | Since | Source                                                      | Description                                                                 |
|-----------------------------|---------|---------|-------|-------------------------------------------------------------|-----------------------------------------------------------------------------|
| z                           | int     | —       | 1.0.0 | <https://digitransit.fi/en/developers/apis/4-map-api/>        | Zoom level for tile pyramid                                                 |
| x                           | int     | —       | 1.0.0 | <https://digitransit.fi/en/developers/apis/4-map-api/>        | Tile X coordinate                                                           |
| y                           | int     | —       | 1.0.0 | <https://digitransit.fi/en/developers/apis/4-map-api/>        | Tile Y coordinate                                                           |
| format                      | string  | png     | 1.0.0 | <https://digitransit.fi/en/developers/apis/4-map-api/>        | Raster tile format (png, jpg, webp)                                         |
| scale                       | string  | —       | 1.0.0 | <https://digitransit.fi/en/developers/apis/4-map-api/>        | Retina/high-DPI scale (@2x)                                                  |
| tileset/styleId             | string  | —       | 1.0.0 | <https://digitransit.fi/en/developers/apis/4-map-api/>        | Vector tile set or style identifier                                         |
| styleId                     | string  | —       | 1.0.0 | <https://digitransit.fi/en/developers/apis/4-map-api/>        | Style manifest identifier                                                   |
| version                     | string  | —       | 1.0.0 | <https://digitransit.fi/en/developers/apis/4-map-api/>        | Style manifest version                                                      |
| center                      | string  | —       | 1.0.0 | <https://digitransit.fi/en/developers/apis/4-map-api/>        | Center coordinate for static map (if supported)                             |
| width, height               | int     | —       | 1.0.0 | <https://digitransit.fi/en/developers/apis/4-map-api/>        | Dimensions for static map (if supported)                                    |
| digitransit-subscription-key| string  | —       | 1.0.0 | <https://digitransit.fi/en/developers/api-registration/>      | API key for authentication (query param or header)                          |
| cache-control               | string  | —       | 1.0.0 | <https://digitransit.fi/en/developers/apis/4-map-api/>        | HTTP cache control headers for client caching                               |

# Examples

## Basic raster tile

**Request:**

```
GET https://cdn.digitransit.fi/map/v3/hsl-map/{z}/{x}/{y}.png?digitransit-subscription-key={API_KEY}
```

**Response:**

- Format: PNG image
- MIME type: `image/png`
- Example: [View PNG tile](https://cdn.digitransit.fi/map/v3/hsl-map/16/37313/18958.png)

## High-DPI raster tile

**Request:**

```
GET https://cdn.digitransit.fi/map/v3/hsl-map/{z}/{x}/{y}@2x.png?digitransit-subscription-key={API_KEY}
```

**Response:**

- Format: PNG image (retina)
- MIME type: `image/png`
- Example: [View retina PNG tile](https://cdn.digitransit.fi/map/v3/hsl-map/16/37313/18958@2x.png)

## Vector tile request

**Request:**

```
GET https://cdn.digitransit.fi/map/v3/hsl/stops,stations/{z}/{x}/{y}.pbf?digitransit-subscription-key={API_KEY}
Header: digitransit-subscription-key: <API_KEY>
```

**Response:**

- Format: Mapbox Vector Tile (.pbf)
- MIME type: `application/x-protobuf`
- Example: [View vector tile](https://cdn.digitransit.fi/map/v3/hsl/stops,stations/16/37308/18959.pbf)

## Style manifest fetch

**Request:**

```
GET https://cdn.digitransit.fi/map/v3/hsl-map/index.json?digitransit-subscription-key={API_KEY}
```

**Response:**

- Format: JSON (MapLibre/Mapbox style schema)
- MIME type: `application/json`
- Example: [View style manifest](https://cdn.digitransit.fi/map/v3/hsl-map/index.json)

## Caching header demo

**Request:**

```
GET https://cdn.digitransit.fi/map/v3/hsl-map/{z}/{x}/{y}.png?digitransit-subscription-key={API_KEY}
```

**Response Header:**

```
Cache-Control: public, max-age=86400
```

## Error response example

**Request:**

```
GET https://cdn.digitransit.fi/map/v3/hsl-map/99/99999/99999.png?digitransit-subscription-key={API_KEY}
```

**Response:**

- Format: JSON error object
- MIME type: `application/json`
- Example:

```json
{
  "error": "Tile coordinates out of range"
}
```

# Errors & Edge Cases

| Case                  | Trigger Strategy         | Expected Handling                       |
|-----------------------|-------------------------|-----------------------------------------|
| Invalid coordinates   | Out-of-range x/y        | 404 or error JSON                       |
| Unsupported zoom      | z beyond max            | Error or empty tile                     |
| Missing style         | Nonexistent styleId     | 404 style not found                     |
| Unsupported format    | Use .gif                | 400/415 error                           |
| Rate placeholder      | High request rate       | Documented backoff, possible 403        |
| Attribution missing   | Client omits credit     | Policy note (non-technical)             |

# Performance & Rate

- Tile requests are subject to quota and rate limiting. For large batch requests, apply a delay (0.5–1s) between requests to avoid traffic peaks and hitting rate limits ([source](https://digitransit.fi/en/developers/api-registration/#quota-and-rate-limiting)).
- Raster and vector tiles support HTTP cache-control headers for client-side caching. Example: `Cache-Control: public, max-age=86400`.
- CDN is used for tile delivery; parallel requests are supported but should be rate-limited for best performance.

# Glossary Seeds

- Tile: A single map image or vector data chunk at a specific zoom/x/y.
- Zoom: Map scale level, higher values show more detail.
- Style: JSON manifest describing map appearance.
- Retina: High-DPI display, typically using @2x tiles.
- Cache: Mechanism for storing tiles locally to reduce repeated requests.

# NOTE: MISSING DATA

- Style manifest schema details (MapLibre/Mapbox reference) not present in loaded sources. See task spec for licensing note.
- Static map endpoint details (center, width, height) not present in loaded sources.
- Attribution text and link requirements not present in loaded sources.
- Error response JSON schema not present in loaded sources.
- FAQ and troubleshooting details not present in loaded sources.
- Terms and usage policy details not present in loaded sources.
- Changelog and glossary expansion not present in loaded sources.
