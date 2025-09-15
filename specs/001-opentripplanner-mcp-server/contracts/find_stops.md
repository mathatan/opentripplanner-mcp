# Tool Contract: find_stops

Status: Final

## Purpose

Discover nearby stops (and optionally stations / bike parks) from coordinates & radius.

## Input Parameters

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| coordinate.lat | number | Yes | – | -90..90 |
| coordinate.lon | number | Yes | – | -180..180 |
| radius | number | No | 300 | 1..3000 meters |
| maxResults | number | No | 10 | 1..50 (output truncated at 25 with warning) |
| textFilter | string | No | – | Case-insensitive substring match applied client-side |
| language | string | No | en | fi \| sv \| en |
| includeModes | TransitMode[] | No | all | Filters upstream query if provided |

## Output Schema (Conceptual)

```text
stops: StopSummary[] (length >=0, sorted by distance)
correlationId: string (UUID)
warnings?: Warning[]

StopSummary {
  id: string
  name: string
  coordinate: { lat: number, lon: number }
  distance: number (meters, >=0)
  modes: TransitMode[] (non-empty)
  address?: string // rarely available; populated if upstream includes a station address
}
```

## Business Rules

1. Default radius 300m; if >3000 reject validation.
2. Upstream query ordered by distance; ensure stable sort by distance then id.
3. If `maxResults` > 25, still request but truncate output to 25, add warning `truncated-results` and `stopsTruncatedFrom` meta (future) TBD.
4. If `textFilter` provided perform case-insensitive substring filter after upstream results; if zero after filter return `validation-error`? (Decision: return empty list with warning `no-matches-after-filter`).
5. Modes filter: if provided, remove stops whose mode set intersection empty.

## Error Codes

| Code | Condition | Retry? |
|------|-----------|--------|
| validation-error | Invalid coordinate / radius / limits | No |
| upstream-error | GraphQL error payload | Yes |
| upstream-timeout | Exceeded timeout | Yes |
| rate-limited | 429 or local limiter | Yes (respect retryAfter) |

## Examples

### Request

```json
{
  "tool": "find_stops",
  "arguments": { "coordinate": { "lat": 60.1699, "lon": 24.9384 }, "radius": 500, "maxResults": 5 }
}
```

### Success Response (abridged)

```json
{
  "stops": [ { "id": "HSL:1234", "name": "Central", "distance": 42, "modes": ["TRAM"] } ],
  "correlationId": "uuid"
}
```

### Truncated Warning

```json
{
  "stops": [ ...25 items... ],
  "warnings": [ { "code": "truncated-results", "message": "Results truncated to 25" } ],
  "correlationId": "uuid"
}
```

## Tests

* Validation fail (bad lat)
* Basic success (3 stops)
* Name filter reduces set
* Radius cap enforced
* Truncation adds warning
* Modes filter applied

## Constitution Alignment

* Test-first: tests enumerated prior to implementation (TOOL-003).
* Reliability: uses shared HTTP, retry, and rate limiter (INF-001..003).
* Transparency: warnings on truncation & post-filter empty.
