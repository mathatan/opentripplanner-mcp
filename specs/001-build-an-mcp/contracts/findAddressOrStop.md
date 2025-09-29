# Contract: findAddressOrStop

Purpose: Resolve a free‑text query into either a single ResolvedLocation or a DisambiguationSet requiring clarification.

## Request Schema (Zod Inspired)

```ts
const FindAddressOrStopRequest = z.object({
  query: z.string().min(1).max(200),
  focusPoint: CoordinateSchema.optional(),
  maxDistanceMeters: z.number().int().positive().max(200000).optional(),
  languagePreference: z.enum(['fi','en','sv']).optional()
});
```

## Response Variants

### Success - Single Resolution

```json
{
  "type": "resolved",
  "location": { /* ResolvedLocation */ }
}
```

### Success - Disambiguation

```json
{
  "type": "disambiguation",
  "candidates": [ /* ResolvedLocation[1..5] */ ],
  "totalCandidatesFound": 12,
  "truncated": true,
  "needsClarification": true,
  "autoResolvedThreshold": 0.8
}
```

### Error

`ErrorPayload` per taxonomy.

## Deterministic Ordering

Candidates sorted by (confidence DESC, distance ASC (if focus), name ASC).

## Edge Cases

- Empty candidate list → NO_RESULTS error (should not occur if upstream returns something; guard anyway)
- `maxDistanceMeters` without `focusPoint` → VALIDATION error

## Idempotency

Same input → identical ordering and output structure barring upstream data change.
