# Contract: planRoute

Purpose: Plan public transport itineraries (scheduled) between two locations using departure or arrival semantics.

## Request Schema

```ts
const PlanRouteRequest = z.object({
  origin: z.union([LocationQueryInputSchema, ResolvedLocationSchema]),
  destination: z.union([LocationQueryInputSchema, ResolvedLocationSchema]),
  departureTime: z.string().datetime().optional(),
  arrivalTime: z.string().datetime().optional(),
  searchWindowMinutes: z.number().int().positive().max(120).default(45),
  journeyPreset: z.enum(['FASTEST','FEWEST_TRANSFERS','LEAST_WALK']).default('FASTEST')
}).refine(v => (v.departureTime ? !v.arrivalTime : !!v.arrivalTime), { message: 'Specify exactly one of departureTime or arrivalTime' });
```

## Response (Success)

```json
{
  "itineraries": [ /* Itinerary[0..3] */ ],
  "window": { "requested": 45, "applied": 45, "clamped": false },
  "sorting": "endTime_ASC_transfers_ASC_duration_ASC",
  "metadata": { "noResultsReason": null }
}
```

If no itineraries:

```json
{
  "itineraries": [],
  "window": { "requested": 90, "applied": 90, "clamped": false },
  "metadata": { "noResultsReason": "NO_SERVICE" }
}
```

## Errors

- VALIDATION (missing origin/destination, identical points, both or neither temporal selectors)
- NO_RESULTS (empty within window) – surfaced as success with empty list & reason OR explicit error? DECISION: success envelope with reason to simplify caller flow.

## Deterministic Ordering

Current implementation sorts itineraries primarily by durationMinutes ASC, then numberOfTransfers ASC, then startTime ASC (stable tie-break by id). This differs slightly from the earlier proposed order (endTime-first). Adjust contract or implementation later once ranking strategy is finalized.

Transfers are derived from count of non-WALK legs minus one when an explicit transfers field isn't provided by upstream.

## Notes

- Future expansion: add `debug` flag to include raw upstream query cost metrics.
- GraphQL variable mapping ensures departure vs arrival uses `arriveBy` boolean.
