# Quickstart: MCP Timetables, Routes & Address Lookup

This guide shows how to configure and exercise the three MCP tools: `findAddressOrStop`, `planRoute`, `getStopTimetable`.

## 1. Prerequisites

- Node.js 18+ (see `.node-version` if present)
- pnpm installed
- Digitransit API subscription key (Geocoding + Routing access)

## 2. Install Dependencies

```bash
pnpm install
```

## 3. Environment Variables

Create `.env` (or export directly) with:

```
DIGITRANSIT_API_KEY=your_key_here
```

Never commit real keys. The server will refuse to start if missing.

## 4. Run in Development

```bash
pnpm dev
```

Hot reload via nodemon; TypeScript sources in `src/`.

## 5. Planned Source Structure (after implementation)

```
src/
  index.ts                 # Registers MCP tools
  infrastructure/          # httpClient, geocodingClient, routingClient, rateLimiter, cache
  schema/                  # Zod schemas & types
  services/                # lookupService, routeService, timetableService
  tools/                   # findAddressOrStop.ts, planRoute.ts, getStopTimetable.ts
  util/                    # helpers (normalization, hashing, ordering)
```

## 6. Tool Contracts (High-Level)

### findAddressOrStop

Request: `{ query, focusPoint?, maxDistanceMeters?, languagePreference? }`
Response (resolved): `{ type: 'resolved', location }`
Response (needs disambiguation): `{ type: 'disambiguation', candidates[], totalCandidatesFound, truncated, needsClarification: true, autoResolvedThreshold }`

### planRoute

Request: `{ origin, destination, departureTime? | arrivalTime?, searchWindowMinutes?, journeyPreset? }` (exactly one of departureTime/arrivalTime)
Response: `{ itineraries[], window{requested,applied,clamped}, sorting, metadata{noResultsReason|null} }`

### getStopTimetable

Request: `{ stopId, maxDepartures?, horizonMinutes? }`
Response: `{ departures[], applied{maxDepartures,horizonMinutes,clamped}, metadata{noResultsReason|null} }`

## 7. Example Usage (Conceptual)

These are illustrative JSON payloads the MCP runtime (client) could send to the tool handlers.

### A. Lookup Address

```json
{
  "tool": "findAddressOrStop",
  "input": { "query": "Kamppi" }
}
```

### B. Plan Route (Departure Time)

```json
{
  "tool": "planRoute",
  "input": {
    "origin": { "rawText": "Kamppi, Helsinki" },
    "destination": { "rawText": "Espoon keskus" },
    "departureTime": "2025-09-29T14:30:00+03:00",
    "journeyPreset": "FASTEST"
  }
}
```

### C. Stop Timetable

```json
{
  "tool": "getStopTimetable",
  "input": { "stopId": "HSL:1173434", "maxDepartures": 5 }
}
```

## 8. Error Handling Pattern

All tools may return:

```json
{
  "error": {
    "category": "VALIDATION",
    "code": "INVALID_TIME_FORMAT",
    "message": "arrivalTime must be ISO 8601",
    "details": { "field": "arrivalTime" }
  }
}
```

Caller logic should branch on presence of `error` vs success envelope.

## 9. Deterministic Ordering Guarantees

- Lookup candidates: confidence DESC, distance ASC (if focus), name ASC
- Itineraries: endTime ASC, transfers ASC, duration ASC
- Departures: scheduledTime ASC, routeShortName ASC (tie)

## 10. Performance & Limits

| Aspect | Default | Max | Notes |
|--------|---------|-----|-------|
| Lookup candidates | 5 | 5 | Truncated flag if more upstream |
| Itineraries | ≤3 | 3 | Upstream limited via query vars |
| Timetable departures | 3 | 5 | Clamp & flag if exceeded |
| Route search window (min) | 45 | 120 | Clamp + warning flag |
| Timetable horizon (min) | 45 | 90 | Clamp + flag |

## 11. Localization

Primary name fallback: Finnish → English → Swedish → upstream default. Additional available names surfaced in `names` map.

## 12. Future Enhancements (Deferred)

- Micro-cache (short TTL) for identical queries
- Autocomplete specialization
- Metrics export (counters) once usage patterns stabilize
- Realtime integration (separate feature)

## 13. Manual Validation Checklist

- [ ] Lookup: ambiguous query returns disambiguation set (<=5)
- [ ] Lookup: high-confidence single candidate returns resolved form
- [ ] Route: arrivalTime search works (destination arrival constraint verified)
- [ ] Route: clamp searchWindow >120
- [ ] Timetable: clamp horizon >90 and departures >5
- [ ] Error: missing API key produces AUTH_FAILURE
- [ ] Error: invalid coordinate triggers VALIDATION

## 14. Troubleshooting

| Symptom | Possible Cause | Action |
|---------|----------------|--------|
| AUTH_FAILURE INVALID_API_KEY | Wrong key | Regenerate in portal, restart process |
| THROTTLED | Burst over provider limit | Honor retryAfter, slow client loop |
| Empty itineraries | Service gap or late night | Check timeframe; enlarge window within limit |
| Names missing expected language | Upstream lacks translation | Fallback chain applied; inspect `names` map |

---
Aligned with Constitution Principles: lean approach, docs precede code, minimal dependencies.

## 15. Run demo scripts (local manual validation)

After installing dependencies and setting `DIGITRANSIT_API_KEY` in your environment, you can execute small demo scripts that call the tool handlers directly (useful for manual validation without running the MCP stdio server):

```
pnpm demo:lookup        # runs scripts/manual/lookup-demo.ts (optional arg: search text)
pnpm demo:route         # runs scripts/manual/route-demo.ts
pnpm demo:timetable     # runs scripts/manual/timetable-demo.ts (optional arg: stopId)
```

These scripts will print JSON to stdout. They import existing tool handlers under `src/tools/*` and exercise core flows.
