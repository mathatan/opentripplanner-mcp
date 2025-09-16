# Tool Contract: reverse_geocode

Status: Final

## Purpose

Reverse geocoding converting coordinates to nearest named feature.

## Input Parameters

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| lat | number | Yes | – | -90..90 |
| lon | number | Yes | – | -180..180 |
| language | string | No | en | fi \| sv \| en (fallback chain) |

## Output Schema (Conceptual)

```text
query: { lat: number, lon: number }
result?: GeocodeResult (first candidate or undefined if none)
candidates: GeocodeResult[] (ordered by confidence desc)
correlationId: string (UUID)
warnings?: Warning[]

GeocodeResult {
  name: string
  coordinates: { lat:number, lon:number }
  confidence: number (0..1)
  type: 'address' | 'poi' | 'stop'
  language?: string
  label?: string
  address?: string // formatted address if provider returns (common when type='address')
}
```

## Business Rules

1. First candidate becomes `result` (highest confidence ordering from provider).
2. If no candidates, return `geocode-no-results` error.
3. If requested language absent, attempt fallback: requested -> fi -> en.
4. Normalize coordinates & confidence same as forward geocode.

## Error Codes

| Code | Condition | Retry? |
|------|-----------|--------|
| validation-error | Invalid coordinates | No |
| geocode-no-results | No features within provider resolution radius | Maybe |
| upstream-error | Provider error | Yes |
| upstream-timeout | Timeout | Yes |

## Examples

### Request

```json
{ "tool": "reverse_geocode", "arguments": { "lat": 60.1699, "lon": 24.9384 } }
```

### Success Response (abridged)

```json
{
  "query": { "lat": 60.1699, "lon": 24.9384 },
  "result": { "name": "Kamppi", "coordinates": { "lat": 60.1699, "lon": 24.9384 }, "confidence": 0.93, "type": "poi" },
  "correlationId": "uuid"
}
```

### Error (no results)

```json
{ "error": { "code": "geocode-no-results", "message": "No features near coordinate", "correlationId": "uuid" } }
```

## Tests

* Basic reverse geocode
* No result error
* Language fallback path

## Constitution Alignment

* Test-first: tests enumerated before implementation (TOOL-006).
* Consistency: shares normalization logic with forward geocode.
