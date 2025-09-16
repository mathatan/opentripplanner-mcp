# Tool Contract: geocode_address

Status: Final

## Purpose

Forward geocoding translating text query to coordinate candidates with disambiguation and truncation.

## Input Parameters

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| text | string | Yes | – | Trimmed; 1..200 chars |
| size | number | No | 10 | 1..40 (hard cap) |
| language | string | No | en | fi \| sv \| en |
| focus.lat | number | No | – | Used for distance tiebreak |
| focus.lon | number | No | – | — |
| layers | string[] | No | – | Pass-through to provider (validated length <=8) |

## Output Schema

```text
query: string (original normalized query)
language?: 'fi' | 'sv' | 'en'
results: GeocodeResult[] (length >=0; ordered by relevance/ rules)
truncated?: boolean (true if provider or size cap applied)
warnings?: Warning[]
correlationId: string (UUID)

GeocodeResult {
  name: string
  coordinates: { lat: number, lon: number }
  confidence: number (0..1)
  type: 'address' | 'poi' | 'stop'
  language?: string
  label?: string // short display label (may mirror name)
  address?: string // formatted single-line address if provider returns (primarily when type='address')
  boundingBox?: { minLon:number, maxLon:number, minLat:number, maxLat:number }
}
```

## Business Rules

1. If provider returns more than `size` (capped 40), truncate and set `truncated=true` plus warning `truncated-results`.
2. Primary ordering: provider relevance (confidence desc). Secondary: distance to focus ascending if provided and confidence equal within 0.01.
3. If zero results, respond with `geocode-no-results` error code.
4. Normalize confidence into 0..1 float (if provider returns 0..100 divide by 100).
5. Map provider layers to `type` (address|poi|stop) else default `poi`.

## Error Codes

| Code | Condition | Retry? |
|------|-----------|--------|
| validation-error | Invalid text / size / focus coords | No |
| geocode-no-results | Provider returned zero candidates | Maybe (change text) |
| upstream-error | Provider error payload | Yes |
| upstream-timeout | Timeout exceeded | Yes |

## Examples

### Request

```json
{ "tool": "geocode_address", "arguments": { "text": "kamppi", "size": 5 } }
```

### Success Response (abridged)

```json
{
  "query": "kamppi",
  "results": [ { "name": "Kamppi", "coordinates": { "lat": 60.1699, "lon": 24.9337 }, "confidence": 0.94, "type": "poi" } ],
  "correlationId": "uuid"
}
```

### Error (no results)

```json
{ "error": { "code": "geocode-no-results", "message": "No results for 'zzzx'", "correlationId": "uuid" } }
```

## Tests

* Basic search
* Truncation scenario (size>40)
* No results mapping
* Confidence ordering
* Focus distance tie-break

## Constitution Alignment

* Test-first: tests enumerated before implementation (TOOL-005)
* Minimal exposure: only normalized fields; provider raw omitted.
* Transparency: truncated warning and explicit no-results error.
