---
title: Geocoding API Documentation
slug: geocoding-api
version: 1.0.0
generatedAt: 2025-09-12
sourcesReferenced:
    - <https://digitransit.fi/en/developers/apis/3-geocoding-api/>
    - <https://digitransit.fi/en/developers/apis/3-geocoding-api/address-lookup/>
    - <https://digitransit.fi/en/developers/apis/3-geocoding-api/address-search/>
    - <https://digitransit.fi/en/developers/apis/3-geocoding-api/autocomplete/>
    - <https://digitransit.fi/en/developers/api-registration/>
    - <https://digitransit.fi/en/developers/changes/>
    - <https://digitransit.fi/en/developers/deprecations/>
    - <https://digitransit.fi/en/developers/apis/7-terms-of-use/>
    - <https://digitransit.fi/en/developers/apis/6-api-faq/>
    - <https://digitransit.fi/en/developers/architecture/x-apis/3-geocoding-api/api/>
otpTopicsReferenced: []
---

# Overview

Endpoints:

- `/geocoding/v1/search` — Forward search
- `/geocoding/v1/reverse` — Reverse geocoding

# Parameters

| Name | Type | Default | Since | Source | Description |
|------|------|---------|-------|--------|-------------|
| text | string | — | 1.0.0 | address-search, autocomplete | Search string for address/place |
| point.lat | float | — | 1.0.0 | address-lookup | Latitude for reverse geocoding |
| point.lon | float | — | 1.0.0 | address-lookup | Longitude for reverse geocoding |
| boundary.rect.min_lon | float | — | 1.0.0 | address-search, autocomplete | Min longitude for bounding box |
| boundary.rect.max_lon | float | — | 1.0.0 | address-search, autocomplete | Max longitude for bounding box |
| boundary.rect.min_lat | float | — | 1.0.0 | address-search, autocomplete | Min latitude for bounding box |
| boundary.rect.max_lat | float | — | 1.0.0 | address-search, autocomplete | Max latitude for bounding box |
| boundary.circle.lat | float | — | 1.0.0 | address-search | Center latitude for circle filter |
| boundary.circle.lon | float | — | 1.0.0 | address-search | Center longitude for circle filter |
| boundary.circle.radius | float | — | 1.0.0 | address-search, address-lookup | Radius (km) for circle filter |
| focus.point.lat | float | — | 1.0.0 | address-search, autocomplete | Latitude for ranking bias |
| focus.point.lon | float | — | 1.0.0 | address-search, autocomplete | Longitude for ranking bias |
| size | integer | 10 | 1.0.0 | all | Max results (default 10, max 40) |
| layers | string[] | — | 1.0.0 | all | Filter by layer (address, venue, street, stop, station, bikestation, neighbourhood, localadmin, region) |
| sources | string[] | — | 1.0.0 | all | Filter by source (oa, osm, nlsfi, gtfs<feedid>, citybikes<network>) |
| lang | string | fi | 1.0.0 | all | Preferred language (fi, sv, en) |
| zones | integer | — | 1.0.0 | address-lookup | Returns ticket zones for location |

# Examples

## Forward Search (Basic)

```http
GET https://api.digitransit.fi/geocoding/v1/search?text=kamppi&size=1
```

Example response:

```json
{
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [24.93147, 60.16952]
            },
            "properties": {
                "id": "123456",
                "gid": "address:osm:123456",
                "layer": "address",
                "source": "osm",
                "source_id": "123456",
                "name": "Kamppi",
                "postalcode": "00100",
                "confidence": 1,
                "distance": 0.0,
                "accuracy": "point",
                "country": "Finland",
                "country_gid": "country:osm:234",
                "country_a": "FIN",
                "region": "Uusimaa",
                "region_gid": "region:osm:345",
                "localadmin": "Helsinki",
                "localadmin_gid": "localadmin:osm:456",
                "locality": "Helsinki",
                "locality_gid": "locality:osm:567",
                "neighbourhood": "Kamppi",
                "neighbourhood_gid": "neighbourhood:osm:678",
                "label": "Kamppi, Helsinki, Finland"
            }
        }
    ],
    "meta": {
        "query": "kamppi",
        "size": 1,
        "max_size": 40
    }
}
```

## Forward Search (Filtered)

```http
GET https://api.digitransit.fi/geocoding/v1/search?text=kamppi&layers=address
```

Example response: Same as above, but only features with `layer: "address"`.

## Autocomplete (Minimal Latency)

```http
GET https://api.digitransit.fi/geocoding/v1/autocomplete?text=kamp&focus.point.lat=60.17&focus.point.lon=24.93
```

Example response:

```json
{
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [24.93147, 60.16952]
            },
            "properties": {
                "id": "123456",
                "gid": "address:osm:123456",
                "layer": "address",
                "source": "osm",
                "name": "Kamppi",
                "confidence": 0.95,
                "distance": 0.1,
                "label": "Kamppi, Helsinki, Finland"
            }
        }
    ],
    "meta": {
        "query": "kamp",
        "size": 10
    }
}
```

## Reverse Geocode (Coordinates)

```http
GET https://api.digitransit.fi/geocoding/v1/reverse?point.lat=60.170278&point.lon=24.9369448
```

Example response:

```json
{
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [24.9369448, 60.170278]
            },
            "properties": {
                "id": "789012",
                "gid": "venue:osm:789012",
                "layer": "venue",
                "source": "osm",
                "name": "Helsinki Central Station",
                "confidence": 0.99,
                "distance": 0.0,
                "label": "Helsinki Central Station, Helsinki, Finland"
            }
        }
    ],
    "meta": {
        "query": "reverse",
        "size": 10
    }
}
```

## Localized Query

```http
GET https://api.digitransit.fi/geocoding/v1/search?text=finlandia&lang=sv&size=1
```

Example response:

```json
{
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [24.941, 60.174]
            },
            "properties": {
                "name": "Finlandia-huset",
                "label": "Finlandia-huset, Helsingfors, Finland",
                "lang": "sv"
            }
        }
    ],
    "meta": {
        "query": "finlandia",
        "lang": "sv"
    }
}
```

## Performance/Limit Demo

```http
GET https://api.digitransit.fi/geocoding/v1/search?text=kamppi&size=50
```

Example response: As above, but `meta.max_size` is 40 and only 40 results are returned. If more requested, a warning is included in `meta`.

## Error Response Example

If a request is invalid (e.g., malformed coordinates):

```json
{
    "error": {
        "code": 400,
        "message": "Invalid coordinates: point.lat must be between -90 and 90."
    }
}
```

## Data Structure

All endpoints return a GeoJSON `FeatureCollection` object:

- `type`: Always "FeatureCollection"
- `features`: Array of `Feature` objects
  - `type`: "Feature"
  - `geometry`: { "type": "Point", "coordinates": [lon, lat] }
  - `properties`: See below
- `meta`: Metadata about the query (may include query string, size, max_size, warnings)

### Feature Properties (may vary by endpoint and data availability)

| Property         | Type    | Description |
|------------------|---------|-------------|
| id               | string  | Internal identifier |
| gid              | string  | Global identifier (layer, source, id) |
| layer            | string  | Place type (address, venue, etc.) |
| source           | string  | Data source (osm, oa, nlsfi, etc.) |
| source_id        | string  | Source-specific id |
| name             | string  | Name or description |
| postalcode       | string  | Postal code |
| confidence       | number  | Match confidence (0-1) |
| distance         | number  | Distance from query/focus point (km) |
| accuracy         | string  | "point" or "centroid" |
| country          | string  | Country name |
| country_gid      | string  | Country global id |
| country_a        | string  | ISO 3166-1 alpha-3 code |
| region           | string  | Region name |
| region_gid       | string  | Region global id |
| localadmin       | string  | Local admin name |
| localadmin_gid   | string  | Local admin global id |
| locality         | string  | City/town name |
| locality_gid     | string  | City/town global id |
| neighbourhood    | string  | Neighbourhood name |
| neighbourhood_gid| string  | Neighbourhood global id |
| label            | string  | Human-friendly display label |
| zones            | array   | Ticket zone identifiers |
| lang             | string  | Language code (if available) |

Not all properties are present in every result; availability depends on data source and query.

# Errors & Edge Cases

| Case | Trigger | Expected Handling |
|------|---------|------------------|
| No results | Obscure query | Empty array, 200 OK |
| Invalid bbox | Malformed coords | 400 error, validation message |
| Unsupported language | lang not served | Fallback to default, warning flag |
| Throttling | Burst requests | 429, guidance in docs |
| Partial data | Missing address parts | Best-effort feature, precision note |
| Ranking tie | Identical scores | Deterministic tie-break |
| Exceeding size | size > 40 | Returns 40, warning in metadata |

# Performance & Rate

- Default result size is 10, max is 40. Requests for more return 40 and a warning.

# Glossary Seeds

- Feature: A returned place or address result.

# NOTE: MISSING DATA

- Ranking factors (exact scoring formula) are not published; confidence, distance, and popularity are used but details are not public. See Pelias docs for general info.
Returns places for given coordinates.
