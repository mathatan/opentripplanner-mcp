# Contract: getStopTimetable

Purpose: Retrieve next N scheduled departures for a stop within a horizon.

## Request Schema

```ts
const GetStopTimetableRequest = z.object({
  stopId: z.string().regex(/^[A-Z0-9:_-]+$/),
  maxDepartures: z.number().int().positive().max(5).default(3),
  horizonMinutes: z.number().int().positive().max(90).default(45)
});
```

## Response (Success)

```json
{
  "departures": [ /* Departure[0..5] */ ],
  "applied": { "maxDepartures": 5, "horizonMinutes": 90, "clamped": true },
  "metadata": { "noResultsReason": null }
}
```

Empty case:

```json
{
  "departures": [],
  "applied": { "maxDepartures": 3, "horizonMinutes": 45, "clamped": false },
  "metadata": { "noResultsReason": "NO_DEPARTURES" }
}
```

## Errors

- VALIDATION (bad stopId pattern)
- NOT_FOUND (stop exists upstream? if explicit 404 semantics)
- NO_RESULTS (represented by empty set + reason)

## Ordering

Chronological by scheduledTime ascending; stable secondary key routeShortName ASC.

## Notes

- `serviceDay` is always included and paired with `(realtimeDeparture || scheduledDeparture)` from upstream to form `scheduledTime`:

```ts
scheduledTime = new Date((serviceDay + (realtimeDeparture ?? scheduledDeparture)) * 1000).toISOString();
```

- `scheduledTime` reflects realtime adjustment when available; add future field `isRealtime` if callers need to distinguish.
