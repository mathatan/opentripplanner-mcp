# Tool Contract: get_departures

Status: Final

## Purpose

Retrieve upcoming departures for a stop id (or saved variable mapping to stop id) with realtime delay/cancellation flags.

## Input Parameters

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| stop | object | Yes | – | { type:'id' \| 'label', value:string } (label resolves via user variable store) |
| windowMinutes | number | No | 30 | 1..120 |
| limit | number | No | 10 | 1..50 (post-filter truncation) |
| language | string | No | en | fi \| sv \| en |

## Output Schema

```text
stopId: string
stopName?: string
realtimeUsed: boolean
dataFreshness: string (ISO 8601)
departures: Departure[] (sorted ascending by realtimeTime|scheduledTime)
correlationId: string (UUID)
warnings?: Warning[]

Departure {
  line: string
  mode: TransitMode
  destination: string
  scheduledTime: string (ISO 8601)
  realtimeTime?: string (ISO 8601)
  delaySeconds?: number (may be negative)
  status: 'on_time' | 'delayed' | 'cancelled' | 'scheduled_only'
  platform?: string
}
```

### Departure

```text
line: string
mode: TransitMode
destination: string
scheduledTime: string
realtimeTime?: string
delaySeconds?: number
status: 'on_time' | 'delayed' | 'cancelled' | 'scheduled_only'
platform?: string
```

## Business Rules

1. Compute `delaySeconds = (realtimeTime - scheduledTime)` in seconds if both present.
2. Status precedence: cancelled > delayed (>60 or < -60) > on_time (abs delay <=60) > scheduled_only (no realtimeTime).
3. `realtimeUsed=true` if any departure has realtimeTime or cancellation flag; else false.
4. Sort by `realtimeTime` if present else `scheduledTime` ascending; apply limit after sorting.
5. If upstream returns more than `limit`, add warning `truncated-results`.
6. `dataFreshness` = max(all realtime update timestamps, requestReceivedTime).

## Error Codes

| Code | Condition | Retry? |
|------|-----------|--------|
| validation-error | Invalid stop reference / limits | No |
| upstream-error | GraphQL error payload | Yes |
| upstream-timeout | Timeout exceeded | Yes |
| rate-limited | 429 or local limiter | Yes (respect retryAfter) |

## Performance & Limits

* Target median latency (mock upstream): < 80ms; p95 < 250ms.
* Max departures returned: 50.
* Typical payload size: O(limit) ~ small (<5KB JSON at 50 entries).

## Examples

### Request

```json
{
  "tool": "get_departures",
  "arguments": { "stop": { "type": "id", "value": "HSL:1234" }, "windowMinutes": 20, "limit": 5 }
}
```

### Success Response

```json
{
  "stopId": "HSL:1234",
  "departures": [
    { "line": "7", "mode": "TRAM", "scheduledTime": "2025-09-15T10:05:00Z", "realtimeTime": "2025-09-15T10:06:00Z", "delaySeconds": 60, "status": "delayed" }
  ],
  "realtimeUsed": true,
  "dataFreshness": "2025-09-15T10:00:30Z",
  "correlationId": "uuid"
}
```

### Error Response (validation)

```json
{
  "error": { "code": "validation-error", "message": "stop id missing", "correlationId": "uuid" }
}
```

## Tests

* Basic departure list
* Cancellation mapping
* Delay >0 mapping to delayed
* Early departure (negative delay) mapping to delayed if < -60
* Window limit enforcement
* Truncation warning when > limit

## Constitution Alignment

* Test-first: tests enumerated before implementation (TOOL-004)
* Reliability: centralized retry & limiter usage (INF-002/003)
* Transparency: clear status mapping & warnings
