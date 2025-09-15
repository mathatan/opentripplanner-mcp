# Tool Contract: plan_trip

Status: Final

## Purpose

Compute multimodal itineraries with realtime awareness between two points or saved user variables.

## Input Parameters

| Field | Type | Required | Default | Constraints / Notes |
|-------|------|----------|---------|---------------------|
| origin | object | Yes | – | See Origin/Destination Shape below. May enrich to LocationRef (name/address) |
| destination | object | Yes | – | Same as origin |
| when | object | No | `{ type:'depart', time:'now' }` | If time = 'now' server uses current UTC; otherwise ISO 8601 provided |
| when.type | string | – | depart | Allowed: depart, arrive |
| constraints.optimize | string | No | balanced | Allowed: balanced, few_transfers, shortest_time |
| constraints.maxWalkingDistance | number | No | 1500 | 1..3000 meters |
| constraints.maxTransfers | number | No | 4 | 0..8 |
| constraints.accessibility.stepFree | boolean | No | false | Adds warning if upstream data insufficient |
| constraints.accessibility.lowWalkingDistance | boolean | No | false | Enables post-filter annotation |
| constraints.language | string | No | en | Allowed: fi, sv, en (fallback chain) |
| limit | number | No | 2 | 1..3 (after dedupe) |
| includeDisruptionAlt | boolean | No | true | Attempt relaxed alt search if disruption detected |

Origin/Destination Shape:

```text
{ type: 'coords', value: { lat: number, lon: number } }
{ type: 'label', value: string } // resolves via user variable store
```

## Validation Rules

1. origin & destination must not be identical coordinates (distance > 1m) else `validation-error`.
2. Coordinates must be within -90..90 / -180..180.
3. Reject if limit > 3 or <1.
4. Reject if maxWalkingDistance > 3000 or < 1.
5. Reject if maxTransfers > 8 or <0.
6. When `type:'arrive'` time MUST be provided (no 'now').

## Output Schema

```text
origin: LocationRef // may include label, name, address depending on resolution source
destination: LocationRef // symmetrical to origin
requested: { type:'depart'|'arrive', time:string }
constraints: PlanConstraints
itineraries: Itinerary[]
realtimeUsed: 'realtime' | 'scheduled' | 'mixed'
dataFreshness: string (ISO 8601)
warnings?: Warning[]
correlationId: string
meta?: { deduplicatedFrom?: number }
```

LocationRef enrichment rules:

- If origin/destination provided as coordinates directly: coordinate set; rawSource='input'.
- If provided via saved user variable of type location: label preserved as variable key; name/address copied if stored.
- If resolved through a geocode lookup (future extension of 'label' indirection): name from geocoder -> name, geocoder formatted address -> address, short user key -> label.

## Error Codes

| Code | HTTP / Upstream Condition | Description | Retry? |
|------|---------------------------|-------------|--------|
| validation-error | Local schema validation | Input failed constraints | No |
| unsupported-region | Origin/Destination outside provider bounds | Cannot service geography | No |
| no-itinerary-found | Upstream returned 0 plans (after one relax attempt) | No viable itineraries | Maybe (if user adjusts) |
| upstream-error | GraphQL errors (non-timeout, 5xx mapped) | Unclassified provider failure | Yes (idempotent) |
| upstream-timeout | Request exceeded timeout (default 8s) | Upstream slow/unavailable | Yes |
| rate-limited | 429 from upstream or local limiter exhausted | Throttle engaged | Yes (Respect retryAfter) |
| network-error | DNS / connection / fetch abort | Transport failure | Yes |

## Business Rules

1. Deduplicate itineraries by fingerprint; track original count for `meta.deduplicatedFrom`.
2. If any itinerary has cancellation OR delay > 300s and `includeDisruptionAlt=true`, perform a secondary query relaxing `optimize=balanced`, `maxWalkingDistance += 25%` (capped 3000) and mark any new itinerary with `DisruptionFlag=true` if it replaces disrupted routes.
3. Enforce output `limit` AFTER deduplication & alternative insertion.
4. Provide `realtimeUsed='mixed'` if at least one leg has realtime updates but not all; `realtimeUsed='realtime'` if all transit legs have realtime; otherwise `scheduled`.
5. Warnings: `truncated-results` (if more itineraries existed than limit), `unsupported-accessibility-flag` (preference not actionable), `preference-unmet` (constraint could not be fully honored but itineraries returned).

## Realtime Mapping

Algorithm:

1. For each transit leg collect `lastRealtimeUpdate` (if provided) and delay seconds.
2. Compute `leg.status`:

- cancelled: explicit cancellation flag
- delayed: delaySeconds > 60
- on_time: realtime present & delaySeconds between -60 and 60
- scheduled_only: no realtime payload

1. Itinerary `scheduleType` & response `realtimeUsed` follow Business Rule #4.
2. `dataFreshness` = max(all leg.lastRealtimeUpdate, requestReceivedTime) ISO 8601.

## Performance & Limits

- Target median handler latency (mock upstream): < 120ms; p95 < 400ms.
- GraphQL single query depth capped; avoid over-fetching fields not mapped.
- Result size upper bound: 3 itineraries * (avg 8 legs) ~ small footprint < 10KB JSON typical.

## Examples

### Request

```json
{
  "tool": "plan_trip",
  "arguments": {
    "origin": { "type": "coords", "value": { "lat": 60.1699, "lon": 24.9384 } },
    "destination": { "type": "coords", "value": { "lat": 60.2055, "lon": 24.6559 } },
    "when": { "type": "depart", "time": "now" },
    "constraints": { "optimize": "balanced", "maxWalkingDistance": 1800 },
    "limit": 2
  }
}
```

### Success Response (abridged)

```json
{
  "origin": { "coordinate": { "lat": 60.1699, "lon": 24.9384 } },
  "destination": { "coordinate": { "lat": 60.2055, "lon": 24.6559 } },
  "itineraries": [
    {
      "legs": [ { "mode": "TRAM", "from": {"name":"Central"}, "to": {"name":"Stop X"}, "status":"on_time" } ],
      "scheduleType": "realtime",
      "fingerprint": "sha1:..."
    }
  ],
  "realtimeUsed": "realtime",
  "dataFreshness": "2025-09-15T10:00:00Z",
  "correlationId": "uuid"
}
```

### Error Response (validation)

```json
{
  "error": {
    "code": "validation-error",
    "message": "origin and destination must differ",
    "correlationId": "uuid"
  }
}
```

### Error Response (no itineraries)

```json
{
  "error": {
    "code": "no-itinerary-found",
    "message": "No itineraries for given constraints",
    "hint": "Try increasing maxWalkingDistance or adjusting departure time",
    "correlationId": "uuid"
  }
}
```

## Tests (To Create)

- Validation: missing destination
- Validation: same coordinate origin/destination
- Realtime: mixed vs realtime detection
- Disruption triggers alt search (delay >300s)
- No itinerary found after relax attempt
- Rate limit path (retry then success)
- Deduplication removes duplicate fingerprints

## Constitution Alignment

| Principle | Mapping |
|-----------|---------|
| Test-first | TOOL-001 writes failing tests before TOOL-002 implementation |
| Reliability & Retries | INF-002 / INF-003 govern rate limiting & retry logic before invocation |
| Transparency | `warnings[]` surface unmet preferences & truncation |
| Minimal Exposure | Only required itinerary fields returned, raw upstream omitted |

## Open Questions & Deferrals

- Emissions data excluded (future feature). No schema impact now.
