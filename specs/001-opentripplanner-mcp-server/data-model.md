# Data Model & Domain Contracts (Phase 1)

Date: 2025-09-15

## Overview

This document formalizes the core entities, invariants, and Zod schema contract outlines for the OpenTripPlanner MCP Server, aligning with the Constitution normative section and feature specification functional requirements. All schemas will be implemented under `src/schema/` (planned) and exposed to MCP tools.

## Design Principles

- Stable primitive field naming (snake_case for API responses? -> We will standardize on camelCase in TypeScript, transform external fields).
- Minimal shape required to satisfy tool contract; optional provider-specific metadata gated under `_raw?` if needed later.
- Every top-level tool response includes: `correlationId`, `warnings?[]`, and (if realtime-capable) `dataFreshness`, `realtimeUsed`.

## Entity Schemas

### Error

```text
code: string (kebab-case) // validation-error, rate-limited, no-itinerary-found, geocode-no-results, unsupported-region, upstream-error, upstream-timeout, network-error, auth-failed
message: string
hint?: string
correlationId?: string
retryAfter?: number (seconds; only for rate-limited)
```text

### Coordinate

```text
lat: number (-90..90)
lon: number (-180..180)
```text

Validation: reject NaN, require finite.

### LocationRef

```text
label?: string  // user variable key label or free-form label supplied by client (short handle)
name?: string   // human-friendly proper name from authoritative source (e.g., stop / POI name). Prefer this for UI display.
address?: string // postal or descriptive address line (single-line normalized) if available from geocoder / reverse geocode
coordinate: Coordinate
rawSource?: string // 'geocode' | 'user-variable' | 'input'
```text

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
```text

### PlanConstraints

```text
optimize: 'balanced' | 'few_transfers' | 'shortest_time'
maxWalkingDistance: number (meters, default 1500, <= 3000)
maxTransfers: number (default 4, <= 8)
accessibility?: AccessibilityPrefs
language?: 'fi' | 'sv' | 'en'
```text

### AccessibilityPrefs

```text
stepFree?: boolean
fewTransfers?: boolean (maps to optimize override maybe)
lowWalkingDistance?: boolean
prioritizeLowFloor?: boolean // may not be supported yet -> yields warning if true
```text

### Itinerary

```text
legs: Leg[]
totalDuration: number (seconds)
numberOfTransfers: number
walkingDistance: number (meters)
scheduleType: 'realtime' | 'scheduled' | 'mixed'
accessibilityNotes?: string[]
DisruptionFlag?: boolean
DisruptionNote?: string
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

## Data Freshness Calculation

- For plan: gather leg realtime timestamps or delays; if any realtime present → scheduleType realtime|mixed. `dataFreshness` = max(lastUpdateTime, now()) if none available.

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

## Constitution Alignment

- Test-first: schemas drive Zod tests before tool implementations.
- Reliability: unified error taxonomy ensures consistent retries and logging.
- Privacy: no PII persisted in any schema.
- Transparency: warnings array surfaces unmet settings without silent drops.

## Open Questions Resolution

- Emissions fields: deferred (future feature) – explicitly excluded.
- Scooter rental extra query: deferred; schema leaves extension via `_raw?` if needed later.

Status: Final (Phase 1 complete)
