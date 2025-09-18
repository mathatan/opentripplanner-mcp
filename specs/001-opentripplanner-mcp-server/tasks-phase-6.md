# Tasks Phase 6: Advanced Behavior Enhancements

Objective: Enhance baseline tools with deduplication, improved realtime handling, disruption logic, accessibility warnings, language fallback centralization.

Legend: [ ] Pending | [P] Parallel-safe

| ID | Status | Task | Acceptance Criteria | References |
|----|--------|------|---------------------|------------|
| T059 | [ ] | Itinerary deduplication | Apply fingerprint; add meta.deduplicatedFrom for removed itineraries; tests updated | plan_trip.md dedupe section |
| T060 | [ ] [P] | Realtime aggregation improvements | Compute scheduleType (realtime\|mixed\|scheduled); mark realtimeUsed flag accurately | realtime-apis.md, routing-api.md |
| T061 | [ ] [P] | Disruption detection & alternate search | Trigger secondary search on delay >300s or cancellation; inject warning codes | realtime-apis.md |
| T062 | [ ] [P] | Accessibility preference warnings | unsupported-accessibility-flag & preference-unmet codes emitted | spec.md (future accessibility), plan.md |
| T063 | [ ] [P] | Geocode disambiguation / fuzzy suggestions | Provide fuzzy list or TODO stub with documented limitation if upstream unsupported | geocoding-api.md |
| T064 | [ ] [P] | Central language fallback logic | Single module for Accept-Language cascade; warnings on fallback; reused by geocode & reverse | geocoding-api.md, spec.md |

## Exit Criteria

1. All enhancement tests GREEN (update or add new).
2. No performance regression (baseline p95 <5s maintained).
3. New warnings documented in schema reference.

## Itinerary Deduplication (T059)

Algorithm Steps:

1. For each itinerary compute fingerprint: SHA1 (Node crypto) of the concatenated, sorted leg sequence (mode|line|fromStopId|toStopId) plus a time bucket (startTime rounded down to 120s). Using built-in SHA1 avoids extra native dependencies; if xxHash is later preferred, open an implementation decision issue documenting trade-offs and add benchmark tests.
2. Maintain Map<fingerprint, keptIndex>.
3. On collision: first verify itineraries are actually similar (not hash collision), then compare durationSeconds & number of transfers. Keep itinerary with lower transfers; if equal, lower duration; mark losing itinerary with `meta.deduplicatedFrom = keptFingerprint` and exclude from final list.
4. Expose count of removed itineraries via `meta.deduplicatedCount` (optional).

Edge Cases: If two itineraries identical except small departure time (<120s) they collapse; adjust bucket size with TODO if false positives reported.

Performance: O(n) hashing; compute SHA1 over a small concatenated string (built-in crypto). Hashing cost is negligible relative to network latency.

## Realtime Aggregation & scheduleType (T060)

Definitions:

- realtime: All legs have realtime timestamps and no cancellations.
- mixed: At least one realtime-updated leg AND at least one purely scheduled leg.
- scheduled: No realtime data applied.

Procedure:

1. While assembling itineraries, mark each leg with `isRealtime` if delay or updated departure time provided.
2. Count realtime legs vs total legs.
3. scheduleType assignment:
   - if realtimeLegs == totalLegs → `realtime`
   - else if realtimeLegs > 0 → `mixed`
   - else `scheduled`
4. Flag `realtimeUsed` boolean if scheduleType != scheduled.

## Disruption Detection & Alternate Search (T061)

Trigger Conditions:

- Any leg cancellation OR leg delaySeconds ≥ 300.

Actions:

1. Emit warning `major-disruption` listing affected line(s).
2. Optional retry: Trigger a secondary plan query with alternative modes set (e.g., remove affected line mode; or add WALK+TRAM fallback). Protect with guard to avoid infinite recursion (max 1 alternate).
   - Pass a `isAlternateSearch: true` flag to prevent nested alternate searches
   - Set timeout shorter than original request to prevent cascading delays
   - If alternate search also has disruptions, do not trigger further alternates
3. Merge alternate itineraries appended after originals; mark their `meta.alternateSearch=true`.
4. Re-run deduplication on combined set to remove duplicates produced by alternate search.

Edge Cases: If alternate search yields zero additional itineraries, still return original set with warning.

## Accessibility Preference Warnings (T062)

Preferences Input (example): `{ wheelchair: true, maxWalkDistance: 800 }`.

Warning Codes:

| Code | Condition | Message (Concise) | Client Guidance |
|------|-----------|------------------|-----------------|
| unsupported-accessibility-flag | Flag present but backend does not support filtering | Accessibility flag ignored | Inform user may get inaccessible legs. |
| preference-unmet | Backend supports flag but returned leg violates preference | Some itineraries may be inaccessible | Filter or request alternatives. |

Detection Strategy:

1. Pass through flags to upstream if supported; record capability metadata once (cache).
2. Post-process legs: if wheelChair flag true but any leg has `wheelchairAccessible=false` emit `preference-unmet`.
3. If upstream capability false and flag set emit `unsupported-accessibility-flag` (only once).

Note: Language fallback logic centralized under T064 (see Central language fallback section) to avoid duplication here.

## Geocode Disambiguation / Fuzzy Suggestions (T063)

If upstream supports fuzzy candidates provide `suggestions: string[]` ordered by confidence.
If not: Return empty suggestions array and emit warning `fuzzy-unavailable` (single occurrence) rather than leaving implicit.
Schema Impact: Add optional field `suggestions?: string[]` (documented in schema reference update).

## Central Language Fallback (T064)

Function `resolveLanguages(preferred: string[] | undefined): string[]` returns ordered unique list ending with `'en'` fallback.
Rules:

1. Remove duplicates while preserving first occurrence.
2. Append `'en'` if not present.
3. Limit list length (e.g., max 5) to prevent large Accept-Language headers.
4. If no preferred provided → `['en']`.

Integration:

- geocode_address: pass languages to upstream; if top result language != first requested emit `language-fallback` with from→to detail.
- reverse_geocode: existing logic replaced to call shared resolver.

## Added / Updated Warning Codes (Phase 6)

| Code | Introduced By | Description |
|------|---------------|-------------|
| major-disruption | Disruption detection | Significant delay or cancellation triggered alternate. |
| preference-unmet | Accessibility check | Returned itinerary violates accessibility flag. |
| unsupported-accessibility-flag | Accessibility check | Backend lacked capability. |
| fuzzy-unavailable | Geocode fuzzy suggestions | Upstream does not provide fuzzy list. |

## Testing Strategy (Phase 6)

| Area | Test Cases |
|------|------------|
| Deduplication | Colliding fingerprints choose lower transfers/duration; non-colliding remain. |
| scheduleType | All realtime → realtime; partial → mixed; none → scheduled. |
| Disruption | Inject cancellation & 400s delay; alternate search appended; warning present. |
| Accessibility | Unsupported flag emits one warning; unmet accessible leg emits preference-unmet. |
| Language Fallback | Input ['fi','sv'] returns list with en appended; fallback warning when result not in fi/sv. |
| Fuzzy Suggestions | Upstream mock supports suggestions; absence triggers fuzzy-unavailable warning. |

## Constitution Clause Mapping

| Clause | Application |
|--------|------------|
| C1 | New tests precede enhancements (RED → implement → GREEN). |
| C4 | Preliminary realtime freshness classification (scheduleType). |
| C5 | No change to rate limiter; enhancements avoid extra upstream calls except controlled alternate search (guarded). |
| C6 | Warnings and errors stay structured; new codes documented. |
| C9 | Implements itinerary fingerprint dedupe. |
| C13 | Centralized language fallback consolidates logic. |
| C14 | Validation still single boundary; enhancements operate on typed objects. |

## Acceptance Criteria (Expanded)

- Deduplication removes duplicates deterministically; removed count stable across runs.
- scheduleType & realtimeUsed correct for all itinerary mixes.
- Disruption logic adds at most one alternate search and emits major-disruption when triggered.
- Accessibility warnings emitted precisely once per invocation per code.
- Language fallback shared module used by both geocode tools; no duplication.
- New warnings added to schema reference (Phase 8 dependency) before phase closure.

## Open Questions / TODOs

| Topic | Question | Impact | Action |
|-------|----------|--------|--------|
| Fingerprint window | 120s bucket too coarse? | Potential over-dedup | Monitor & adjust with spec update (C7). |
| Alternate search modes | Which fallback set is optimal? | Result quality | Gather telemetry post-launch. |
| Accessibility flags list | Final schema not finalized | Warning accuracy | Sync with spec owner. |
| Fuzzy suggestions payload | Provide confidence scores? | Usability | Extend schema later if upstream adds. |
