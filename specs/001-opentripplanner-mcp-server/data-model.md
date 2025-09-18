# Data Model & Domain Contracts (Phase 1)

Date: 2025-09-15

## Overview

This document formalizes the core entities, invariants, and Zod schema contract outlines for the OpenTripPlanner MCP Server, aligning with the Constitution normative section and feature specification functional requirements. All schemas will be implemented under `src/schema/` (planned) and exposed to MCP tools.

## Design Principles

- Stable primitive field naming (snake_case for API responses? -> We will standardize on camelCase in TypeScript, transform external fields).
- Minimal shape required to satisfy tool contract; optional provider-specific metadata gated under `_raw?` if needed later.
- Every top-level tool response includes: `correlationId`, `warnings?[]`, and (if realtime-capable) `dataFreshness`, `realtimeUsed`.

Scope & compatibility:

- Phase 1 targets Digitransit (OTP 2.x GTFS GraphQL) + Pelias Geocoding APIs. We expose a compact, stable contract and map richer upstream fields into optional, clearly prefixed properties when useful.
- Pagination primitives in OTP (`planConnection.first/after/searchWindow`) are not exposed in Phase 1 tools; instead we return a small fixed set of itineraries with internal heuristics. We may surface cursors in a later phase.

## Entity Schemas

### Error

```text
code: string (kebab-case) // validation-error, rate-limited, no-itinerary-found, geocode-no-results, unsupported-region, upstream-error, upstream-timeout, network-error, auth-failed
message: string
hint?: string
correlationId?: string
retryAfter?: number (seconds; only for rate-limited)
```

### Coordinate

```text
lat: number (-90..90)
lon: number (-180..180)
```

Validation: reject NaN, require finite.

### LocationRef

```text
label?: string  // user variable key label or free-form label supplied by client (short handle)
name?: string   // human-friendly proper name from authoritative source (e.g., stop / POI name). Prefer this for UI display.
address?: string // postal or descriptive address line (single-line normalized) if available from geocoder / reverse geocode
coordinate: Coordinate
rawSource?: string // 'geocode' | 'user-variable' | 'input'
```

Semantics:

- label: lightweight mnemonic (often user provided). Not guaranteed authoritative.
- name: canonical name from upstream data (stop name, POI name). If both name & label present, name SHOULD be displayed primary, label may be subtitle.
- address: single-line formatted address (no newlines). Populated only when geocoder returns a structural address; not synthesized from name.

### JourneyPlanResponse

```text
origin: LocationRef
destination: LocationRef
requestedTimeType: 'depart' | 'arrive'
requestedDateTime: string (ISO 8601 input normalized to UTC)
constraints: PlanConstraints
itineraries: Itinerary[] (non-empty else error no-itinerary-found)
realtimeUsed: 'realtime' | 'scheduled' | 'mixed'
dataFreshness: string (ISO)
correlationId: string
warnings?: Warning[]
```

### PlanConstraints

```text
optimize: 'balanced' | 'few_transfers' | 'shortest_time'
maxWalkingDistance: number (meters, default 1500, <= 3000)
maxTransfers: number (default 4, <= 8)
accessibility?: AccessibilityPrefs
language?: 'fi' | 'sv' | 'en'
first?: number (default 2, allowed 1..5) // soft cap; we return few itineraries by design in Phase 1
searchWindowMinutes?: number (optional; typical 30..180) // hint to upstream OTP; Phase 1 may ignore
```

### AccessibilityPrefs

```text
wheelchair?: boolean // enables wheelchair-aware planning; mapped to OTP wheelchairAccessibility
stepFree?: boolean
fewTransfers?: boolean (maps to optimize override maybe)
lowWalkingDistance?: boolean
prioritizeLowFloor?: boolean // may not be supported yet -> yields warning if true
```

### Itinerary

```text
legs: Leg[]
totalDuration: number (seconds)
numberOfTransfers: number
walkingDistance: number (meters)
scheduleType: 'realtime' | 'scheduled' | 'mixed'
accessibilityNotes?: string[]
disruptionFlag?: boolean
disruptionNote?: string
fingerprint: string // derived uniqueness hash (mode|line|from|to per leg + start time bucket)
```

### Leg

```text
mode: TransitMode
from: StopPoint
to: StopPoint
departureTime: string (ISO)
arrivalTime: string (ISO)
duration: number (seconds)
distance?: number (meters if provided)
line?: string // route shortName or code
tripId?: string
realtimeDelaySeconds?: number // positive or negative
status?: 'on_time' | 'delayed' | 'cancelled' | 'scheduled_only'
disruptionNote?: string
realtimeState?: 'updated' | 'scheduled' | 'no_data' // mapped from OTP leg.realtimeState where available
lastRealtimeUpdate?: string (ISO) // if known from upstream
```

### TransitMode (enum)

```text
BUS | TRAM | METRO | RAIL | FERRY | WALK | BIKE | SCOOTER
```

(Internal mapping from OTP GraphQL modes: WALK, BUS, TRAM, SUBWAY->METRO, RAIL, FERRY, BICYCLE->BIKE, SCOOTER, etc.)

### StopPoint

```text
id?: string
name?: string
address?: string // optional if upstream stop/station has an address (rare)
coordinate: Coordinate
platform?: string
```

### DepartureResponse

```text
stopId: string
stopName?: string
language?: string
realtimeUsed: boolean
dataFreshness: string
departures: Departure[]
correlationId: string
warnings?: Warning[]
```

### Departure

```text
line: string
mode: TransitMode
destination: string
scheduledTime: string (ISO)
realtimeTime?: string (ISO)
delaySeconds?: number
status: 'on_time' | 'delayed' | 'cancelled' | 'scheduled_only'
platform?: string
```

### GeocodeResponse

```text
query: string
language: 'fi' | 'sv' | 'en'
results: GeocodeResult[]
truncated?: boolean
warnings?: Warning[]
correlationId: string
size?: number (requested size; default 10, max 40; requests >40 are capped to 40 with a truncated warning)
```

### GeocodeResult

```text
name: string
coordinates: Coordinate
type: 'address' | 'poi' | 'stop'
confidence: number (0..1)
language?: string
boundingBox?: BoundingBox
rawLayer?: string
rawSource?: string
address?: string // formatted address (if type=address) else omitted or sometimes provided for POI
label?: string // display label from geocoder, if provided
distanceKm?: number // distance from bias/focus point in kilometers, if provided
gid?: string // pelias composite id (layer:source:id)
sourceId?: string // source-specific id if available
zones?: string[] // ticket zones if requested
```

### BoundingBox

```text
minLon: number
maxLon: number
minLat: number
maxLat: number
```

### UserVariable

```text
key: string
type: 'location' | 'preference' | 'other'
value: any // narrowed by type at runtime
createdAt: string (ISO)
updatedAt: string (ISO)
```

### UserVariablesResponse

```text
variables: UserVariable[]
correlationId: string
```

### Warning

```text
code: string (kebab-case) // e.g., unsupported-accessibility-flag, truncated-results, realtime-missing, preference-unmet
message: string
```

## Zod Schema Outline (Pseudocode)

```text
const CoordinateSchema = z.object({
  lat: z.number().refine(v => v >= -90 && v <= 90, 'lat range'),
  lon: z.number().refine(v => v >= -180 && v <= 180, 'lon range')
});

const LegSchema = z.object({
  mode: z.enum(['BUS','TRAM','METRO','RAIL','FERRY','WALK','BIKE','SCOOTER']),
  from: StopPointSchema,
  to: StopPointSchema,
  departureTime: z.string().datetime(),
  arrivalTime: z.string().datetime(),
  duration: z.number().int().positive(),
  distance: z.number().int().positive().optional(),
  line: z.string().optional(),
  tripId: z.string().optional(),
  realtimeDelaySeconds: z.number().int().optional(),
  status: z.enum(['on_time','delayed','cancelled','scheduled_only']).optional(),
  disruptionNote: z.string().optional()
});
```

(Additional schemas similar; final code will centralize enumerations.)

## Uniqueness & Fingerprinting

Generate itinerary fingerprint: `sha1(legs.map(l=>`${l.mode}|${l.line||''}|${l.from.id||''}|${l.to.id||''}`).join('~') + '|' + startTimeBucket)` where startTimeBucket = departureTime truncated to minutes/2 for dedup heuristics.

## Validation & Error Mapping

- Validation errors aggregate Zod issues: output `validation-error` with array of `{path, issue}` in hint JSON string or structured field (final design TBD).
- Upstream GraphQL errors are mapped preserving original message truncated to 200 chars.

## Internationalization

- Accept `language` in constraints; forward as `Accept-Language` header for GraphQL, `lang` param for geocoding. Fallback chain: requested -> fi -> en.

Language and locale expectations:

- On geocoding, upstream may return a `lang` property per feature and localized `label`. We populate `GeocodeResult.language?` and `label?` when provided and do not synthesize translations.

## Data Freshness Calculation

- For plan: gather leg realtime timestamps or delays; if any realtime present → scheduleType realtime|mixed. `dataFreshness` = max(lastUpdateTime, now()) if none available.

Realtime expectations:

- `realtimeUsed` is derived from OTP leg-level realtimeState and estimated times. If the last realtime update age exceeds ~30s, we still return the itinerary but include a `realtime-missing` warning at response level.
- Leg `realtimeState?` is mapped to a coarse enum: updated|scheduled|no_data to avoid leaking upstream enum changes.

## Accessibility Handling

- If preference unsupported (e.g., prioritizeLowFloor) produce warning, do not drop itinerary.
- If constraints produce zero itineraries, consider rerun with relaxed walking distance (one attempt) before failing.

## Security & Privacy

- No PII storage. User variables ephemeral per session container (in-memory map keyed by session/user id). Potential persistence layer left abstract.

## Open Questions

- Confirm whether to include emissions fields now (excluded for simplicity).
- Clarify whether scooter rental station names require additional query (deferred).

## Examples

### Error Object

```json
{ "code": "validation-error", "message": "Invalid coordinate", "correlationId": "uuid", "hint": "lat must be between -90 and 90" }
```

### Itinerary (abridged)

```json
{
  "legs": [ { "mode": "TRAM", "from": { "name": "Central" }, "to": { "name": "Stop X" }, "status": "on_time" } ],
  "totalDuration": 420,
  "numberOfTransfers": 0,
  "walkingDistance": 120,
  "scheduleType": "realtime",
  "fingerprint": "sha1:..."
}
```

## Canonical Error Codes

| Code | Meaning |
|------|---------|
| validation-error | Input failed schema or logical constraints |
| unsupported-region | Coordinates outside supported bounds |
| no-itinerary-found | Upstream returned zero plans |
| upstream-error | Provider returned error payload |
| upstream-timeout | Provider request exceeded timeout |
| rate-limited | Upstream 429 or local limiter engaged |
| network-error | Transport failure / abort |
| geocode-no-results | Geocode query returned zero candidates |
| realtime-missing | Realtime feed missing or stale beyond freshness threshold |

## Constitution Alignment

- Test-first: schemas drive Zod tests before tool implementations.
- Reliability: unified error taxonomy ensures consistent retries and logging.
- Privacy: no PII persisted in any schema.
- Transparency: warnings array surfaces unmet settings without silent drops.

## Open Questions Resolution

- Emissions fields: deferred (future feature) – explicitly excluded.
- Scooter rental extra query: deferred; schema leaves extension via `_raw?` if needed later.

Status: Final (Phase 1 complete)

---

## OTP/Pelias Mapping Notes (Informative)

This section clarifies how fields map to upstream APIs and sets explicit constraints for Phase 1. It is non-normative but must remain consistent with the shapes above.

- Routing (OTP GraphQL):
  - We call `planConnection` with origin/destination coordinates and a small `first` value (usually 2). Cursor pagination (`after/before`) is not exposed in Phase 1 responses.
  - Per-leg realtime: `estimated` times and `realtimeState` inform `Leg.realtimeDelaySeconds`, `Leg.status`, and `Leg.realtimeState?` as defined above.
  - Accessibility: `AccessibilityPrefs.wheelchair` maps to enabling wheelchair accessibility in OTP. Other flags like `prioritizeLowFloor` may be unsupported and yield warnings.
  - Limits: `maxWalkingDistance <= 3000m`, `maxTransfers <= 8`. Requests exceeding limits are normalized with a `validation-error` or adjusted downward with a `Warning`.

- Geocoding (Pelias):
  - Request parameters include `text`, `size` (capped at 40), `lang`, optional `layers`, `sources`, and focus/bounds. We map feature properties to `GeocodeResult`, preserving `label`, `gid`, `rawLayer`, `rawSource`, and optional `zones` when present.
  - When `size > 40`, we cap to 40 and set `truncated: true` plus a `truncated-results` warning.

- Departures (Realtime):
  - `DepartureResponse.realtimeUsed` reflects if any departure data was sourced from realtime. `dataFreshness` is an ISO timestamp derived from feed headers or current time.

Edge cases and expectations:

- If OTP returns cancelled trips, we set `Leg.status = 'cancelled'` and propagate `disruptionNote?` when present.
- If geocoder returns no features, we return 200 with an empty `results` array and a `geocode-no-results` warning.
