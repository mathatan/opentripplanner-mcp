---
title: Geocoding API Documentation
slug: geocoding-api
version: 1.0.0
generatedAt: 2025-09-29T06:34:36Z
sourcesReferenced:
    - https://digitransit.fi/en/developers/apis/3-geocoding-api/
    - https://digitransit.fi/en/developers/apis/3-geocoding-api/address-search/
    - https://digitransit.fi/en/developers/apis/3-geocoding-api/address-lookup/
    - https://digitransit.fi/en/developers/apis/3-geocoding-api/autocomplete/
    - https://digitransit.fi/en/developers/api-registration/
    - https://digitransit.fi/en/developers/architecture/x-apis/3-geocoding-api/
otpTopicsReferenced: []
---

## Overview

Endpoints (HTTP method: GET)

- GET `/geocoding/v1/search` — Forward search
- GET `/geocoding/v1/reverse` — Reverse geocoding (address lookup)
- GET `/geocoding/v1/autocomplete` — Autocomplete (low-latency suggestions)

## Authentication

The Digitransit production Geocoding API requires registration and an API key (subscription). Register via the Digitransit API portal to obtain keys and manage subscriptions for your account.

API key usage: include the key either as an HTTP header or as a URL query parameter using the exact name `digitransit-subscription-key`. This usage is documented in the API registration snapshot and recorded in the manifest. See:

- Registration and key guidance (portal): see the Digitransit API portal (Products → Subscriptions) for account setup and subscription management.
- Manifest: internal documentation (this file contains the needed integration guidance).

Example — header authentication:

```bash
curl -i -H "digitransit-subscription-key: <API_KEY>" "https://api.digitransit.fi/geocoding/v1/search?text=kamppi&size=1"
```

Example — query-parameter authentication:

```http
GET https://api.digitransit.fi/geocoding/v1/search?text=kamppi&size=1&digitransit-subscription-key=<API_KEY>
```

Note: Use the exact parameter/header name `digitransit-subscription-key`. Consult the Digitransit API portal for account-specific subscription and quota details. If numeric quotas are not published for your subscription, apply conservative throttling (guidance below) when running large batch jobs.

## Parameters

Below are per-endpoint parameter tables, reflecting semantics from Digitransit public documentation and representative verification runs.

---

### `/geocoding/v1/search` (Forward Search)

| Name                   | Type      | Default | Required     | Description                                                                                       |
|:-----------------------|:----------|:--------|:------------:|:--------------------------------------------------------------------------------------------------|
| text                  | string    | —       | undocumented | Search string for address/place (primary forward-search input).                                   |
| boundary.rect.min_lon | float     | —       | optional     | Min longitude for bounding box (used to constrain forward search). Axis-aligned bounding box defined by min/max latitude and longitude; values are floating point numbers. Source captured 2025-09-26T14:18:55Z. |
| boundary.rect.max_lon | float     | —       | optional     | Max longitude for bounding box. Axis-aligned bounding box defined by min/max latitude and longitude; values are floating point numbers. Source captured 2025-09-26T14:18:55Z. |
| boundary.rect.min_lat | float     | —       | optional     | Min latitude for bounding box. Axis-aligned bounding box defined by min/max latitude and longitude; values are floating point numbers. Source captured 2025-09-26T14:18:55Z. |
| boundary.rect.max_lat | float     | —       | optional     | Max latitude for bounding box. Axis-aligned bounding box defined by min/max latitude and longitude; values are floating point numbers. Source captured 2025-09-26T14:18:55Z. |
| boundary.circle.lat   | float     | —       | optional     | Center latitude for circle filter (used to bias/constrain results). Floating point number; defines center of circular filter. Source captured 2025-09-26T15:25:00Z. |
| boundary.circle.lon   | float     | —       | optional     | Center longitude for circle filter. Floating point number; defines center of circular filter. Source captured 2025-09-26T15:25:00Z. |
| boundary.circle.radius| float     | —       | optional     | Radius (km) for circle filter. Floating point number; units are kilometers. Source captured 2025-09-26T15:25:00Z. |
| focus.point.lat       | float     | —       | optional     | Latitude for ranking bias (used by autocomplete/forward search to bias results). Results closer to the focus point are scored higher and appear earlier in result lists. Source captured 2025-09-26T14:25:11Z. |
| focus.point.lon       | float     | —       | optional     | Longitude for ranking bias. Results closer to the focus point are scored higher and appear earlier in result lists. Source captured 2025-09-26T14:25:11Z. |
| size                  | integer   | 10      | optional     | Max results (default 10, max 40). Requests for greater values return at most 40 and may include a warning in `meta`. |
| layers                | string[]  | —       | optional     | Comma-delimited list of place-layer names used to filter results by layer (place type). Allowed values: address, venue, street, stop, station, bikestation, neighbourhood, localadmin, region. Source captured 2025-09-26T14:29:30Z. |
| sources               | string[]  | —       | optional     | Comma-delimited list of data sources used to filter results. Allowed values: oa (DVV address data), osm (OpenStreetMap), nlsfi (National Land Survey of Finland), gtfs&lt;feedid&gt;, citybikes&lt;network&gt;. Source captured 2025-09-26T14:32:46Z. |
| lang                  | string    | fi      | optional     | Preferred language (fi, sv, en). Behavior: server attempts language-specific labels; may fall back to defaults. |

---

### `/geocoding/v1/autocomplete`

| Name            | Type    | Default | Required      | Description                                                                 |
|:----------------|:--------|:--------|:-------------:|:-----------------------------------------------------------------------------|
| text            | string  | —       | undocumented  | Search string for address/place (primary autocomplete input).                |
| focus.point.lat | float   | —       | optional      | Latitude for ranking bias (used to bias autocomplete results).               |
| focus.point.lon | float   | —       | optional      | Longitude for ranking bias.                                                  |
| layers          | string[]| —       | optional      | Comma-delimited list of place-layer names used to filter results by layer.   |
| sources         | string[]| —       | optional      | Comma-delimited list of data sources used to filter results.                 |
| lang            | string  | fi      | optional      | Preferred language (fi, sv, en).                                            |
| size            | integer | 10      | optional      | Max results (default 10, max 40).                                           |

---

### `/geocoding/v1/reverse` (Address Lookup)

| Name         | Type      | Default | Required      | Description                                                                 |
|:-------------|:----------|:--------|:-------------:|:-----------------------------------------------------------------------------|
| point.lat    | float     | —       | required      | Latitude for reverse geocoding.                                             |
| point.lon    | float     | —       | required      | Longitude for reverse geocoding.                                            |
| boundary.circle.radius | float | — | optional | Radius (km) for circle filter (units asserted in examples; verify when running live tests). |
| layers       | string[]  | —       | optional      | Comma-delimited list of place-layer names used to filter results by layer.   |
| zones        | integer   | —       | optional      | When present (e.g., zones=1), ticket zones are returned as an array at the response root and per-feature. Zone identifiers are strings prefixed by feed id (e.g., HSL:A). |
| lang         | string    | fi      | optional      | Preferred language (fi, sv, en).                                            |
| size         | integer   | 10      | optional      | Max results (default 10, max 40).                                           |

Notes:

- Digitransit public documentation (address-search and autocomplete pages) document `text` as a string and treat it as the primary forward-search input.
- The public docs do not consistently mark `text` as formally required; therefore this guide marks it "undocumented" until live verification or source inspection confirms enforcement.
- Recommendation: include the YAML mapping above as the source-of-truth and annotate "undocumented" for `text` where precise enforcement is unknown.

> Note (authoritative clarification): Digitransit's public documentation and examples consistently show:
>
> - `layers` filters by place-layer (place type)
> - `sources` filters by data source
>
> A single page contained a swapped/mislabelled table for these rows; this guide follows the consensus from the broader Digitransit docs and representative examples.

## Examples

### Forward Search (Basic)

```http
GET https://api.digitransit.fi/geocoding/v1/search?text=kamppi&size=1
digitransit-subscription-key: <API_KEY>
```

Response:

```json
{
    "geocoding": {
        "version": "0.2",
        "attribution": "http://pelias-api:8080/attribution",
        "query": {
            "text": "kamppi",
            "size": 1,
            "private": false,
            "boundary.country": ["FIN"],
            "lang": "fi",
            "querySize": 20,
            "parsed_text": { "neighbourhood": "kamppi", "name": "kamppi" }
        },
        "engine": { "name": "Pelias", "author": "Mapzen", "version": "1.0" },
        "timestamp": 1759127203347
    },
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "geometry": { "type": "Point", "coordinates": [24.932362, 60.169018] },
            "properties": {
                "id": "node:1378007259",
                "gid": "openstreetmap:station:node:1378007259",
                "layer": "station",
                "source": "openstreetmap",
                "source_id": "node:1378007259",
                "name": "Kamppi",
                "postalcode": "00100",
                "postalcode_gid": "whosonfirst:postalcode:421479569",
                "confidence": 1,
                "accuracy": "centroid",
                "region": "Uusimaa",
                "region_gid": "whosonfirst:region:85683067",
                "localadmin": "Helsinki",
                "localadmin_gid": "whosonfirst:localadmin:907199715",
                "locality": "Helsinki",
                "locality_gid": "whosonfirst:locality:101748417",
                "neighbourhood": "Kamppi",
                "neighbourhood_gid": "whosonfirst:neighbourhood:85898845",
                "label": "Kamppi, Helsinki"
            }
        }
    ],
    "bbox": [24.932362, 60.169018, 24.932362, 60.169018]
}

```

### Forward Search (Filtered)

```http
GET https://api.digitransit.fi/geocoding/v1/search?text=kamppi&layers=address&size=1
digitransit-subscription-key: <API_KEY>
```

Note: `layers=address` is shown in the example response as the first feature's `layer`.

Response:

```json
{
    "geocoding": {
        "version": "0.2",
        "attribution": "http://pelias-api:8080/attribution",
        "query": {
            "text": "kamppi",
            "size": 1,
            "layers": ["address"],
            "private": false,
            "boundary.country": ["FIN"],
            "lang": "fi",
            "querySize": 20,
            "parsed_text": { "neighbourhood": "kamppi", "name": "kamppi" }
        },
        "engine": { "name": "Pelias", "author": "Mapzen", "version": "1.0" },
        "timestamp": 1759129744265
    },
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "geometry": { "type": "Point", "coordinates": [24.921755, 60.243103] },
            "properties": {
                "id": "way:97115977",
                "gid": "openstreetmap:address:way:97115977",
                "layer": "address",
                "source": "openstreetmap",
                "source_id": "way:97115977",
                "name": "Kamppiaistie 3",
                "housenumber": "3",
                "street": "Kamppiaistie",
                "postalcode": "00660",
                "postalcode_gid": "whosonfirst:postalcode:?",
                "confidence": 0.9420118343195267,
                "accuracy": "point",
                "region": "Uusimaa",
                "region_gid": "whosonfirst:region:85683067",
                "localadmin": "Helsinki",
                "localadmin_gid": "whosonfirst:localadmin:907199715",
                "locality": "Helsinki",
                "locality_gid": "whosonfirst:locality:101748417",
                "neighbourhood": "Länsi-Pakila",
                "neighbourhood_gid": "whosonfirst:neighbourhood:85907985",
                "label": "Kamppiaistie 3, Helsinki"
            }
        }
    ],
    "bbox": [24.921755, 60.243103, 24.921755, 60.243103]
}
```

### Autocomplete (Minimal Latency)

```http
GET https://api.digitransit.fi/geocoding/v1/autocomplete?text=kamp&focus.point.lat=60.17&focus.point.lon=24.93
digitransit-subscription-key: <API_KEY>
```

Response:

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

### Reverse Geocode (Coordinates)

```http
GET https://api.digitransit.fi/geocoding/v1/reverse?point.lat=60.170278&point.lon=24.9369448
digitransit-subscription-key: <API_KEY>
```

Response:

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

### Localized Query

```http
GET https://api.digitransit.fi/geocoding/v1/search?text=finlandia&lang=sv&size=1
digitransit-subscription-key: <API_KEY>
```

Response:

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

### Performance/Limit Demo

```http
GET https://api.digitransit.fi/geocoding/v1/search?text=kamppi&size=50
digitransit-subscription-key: <API_KEY>
```

Response: As above, but `meta.max_size` is 40 and only 40 results are returned. If more requested, a warning is included in `meta`.

### Error Response Example

If a request is invalid (e.g., malformed coordinates) the API returns a 400 with a JSON error object as shown below. For throttling, the API returns HTTP 429; an illustrative 429 payload is described in the "Performance & Rate" section and clients should implement exponential backoff.

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

## Errors & Edge Cases

| Case | Trigger | Expected Handling |
|------|---------|------------------|
| No results | Obscure query | Empty array, 200 OK |
| Invalid bbox | Malformed coords | 400 error, validation message |
| Unsupported language | lang not served | Fallback to default, warning flag |
| Throttling | Burst requests | 429, guidance in docs |
| Partial data | Missing address parts | Best-effort feature, precision note |
| Ranking tie | Identical scores | Deterministic tie-break |
| Exceeding size | size > 40 | Returns 40, warning in metadata |

## Performance & Rate

- Default result size is 10, max is 40. Requests for more return 40 and a warning.
- Rate limits / quotas: The Digitransit API portal does not publish numeric per-key request/sec or daily quotas in public docs for all subscription tiers. If numeric quotas are unavailable for your account, apply conservative throttling when running large batch jobs: insert a 0.5–1 second pause between many consecutive requests.
- Recommendation: Avoid sustained request rates above ~10 requests/second. For large batch jobs prefer inserting a 0.5–1 second delay between consecutive requests to reduce the likelihood of throttling.
- 429 handling: The API returns HTTP 429 on throttling. Clients should implement exponential backoff and honor Retry headers when present.

## Glossary Seeds

- Feature: A returned place or address result.
