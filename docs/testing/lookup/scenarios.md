## Scenarios Catalog

This file lists implemented scenario groups for the lookup service. Refer to the test suite for full assertions: [`tests/services/lookupService.test.ts`](tests/services/lookupService.test.ts:1).

- S01 — Category: Validation  
  Purpose: Missing query text handling.  
  Key Assertions: returns VALIDATION / MISSING_TEXT.

- S02 — Category: Error Mapping  
  Purpose: Upstream 401 response.  
  Key Assertions: maps to AUTH_FAILURE / INVALID_API_KEY.

- S03 — Category: Error Mapping  
  Purpose: Upstream 403 response.  
  Key Assertions: maps to AUTH_FAILURE / INVALID_API_KEY.

- S04 — Category: Error Mapping / Throttling  
  Purpose: 429 with Retry-After header.  
  Key Assertions: THROTTLED / UPSTREAM_THROTTLED; passthrough retryAfter.

- S05 — Category: Error Mapping / Throttling  
  Purpose: 429 without Retry-After header.  
  Key Assertions: THROTTLED / UPSTREAM_THROTTLED; default retryAfter=60.

- S06 — Category: Error Mapping  
  Purpose: Upstream 5xx responses.  
  Key Assertions: UPSTREAM_FAILURE / GEOCODING_ERROR.

- S07 — Category: Mapping  
  Purpose: Single high-confidence candidate.  
  Key Assertions: normalized mapping, coordinate present, needsClarification=false.

- S08 — Category: Geometry Handling  
  Purpose: Empty geometry with center present.  
  Key Assertions: center extracted as coordinate.

- S09 — Category: Filtering  
  Purpose: Malformed coordinates + distance filter.  
  Key Assertions: malformed candidate excluded.

- S10 — Category: Normalization  
  Purpose: Confidence < 0.  
  Key Assertions: clamped to 0 in output.

- S11 — Category: Normalization  
  Purpose: Confidence > 1.  
  Key Assertions: clamped to 1 in output.

- S12 — Category: Normalization / Defaults  
  Purpose: Missing confidence/score.  
  Key Assertions: defaults to 0.

- S13 — Category: Language Fallback  
  Purpose: Preferred language selection.  
  Key Assertions: primaryLanguage set to preferred locale.

- S14 — Category: Language Fallback  
  Purpose: Secondary locale fallback and label-only payloads.  
  Key Assertions: fallback selection; primaryLanguage may become 'default'.

- S15 — Category: Filtering / Focus  
  Purpose: maxDistanceMeters without focus or vice versa.  
  Key Assertions: no filtering when parameters incomplete.

- S16 — Category: Filtering  
  Purpose: Partial distance filtering effect.  
  Key Assertions: removes far candidates, preserves near ones.

- S17 — Category: Edge Case  
  Purpose: All coordinate-bearing candidates filtered out.  
  Key Assertions: empty result array; needsClarification=false.

- S18 — Category: Ordering / Tie-break  
  Purpose: Sorting and tie-break resolution.  
  Key Assertions: confidence → language → coordinate → name order applied.

- S19 — Category: Truncation  
  Purpose: Preserve ordering when truncating to max candidates.  
  Key Assertions: truncated list respects comparator order.

- S20 — Category: Clarification  
  Purpose: needsClarification when top < 0.8 with multiple candidates.  
  Key Assertions: needsClarification=true.

- S21 — Category: Boundary  
  Purpose: top == 0.80 with multiple candidates.  
  Key Assertions: needsClarification=false (strict threshold).

- S22 — Category: Composite  
  Purpose: Combined fallback, filtering, normalization, truncation, clarification.  
  Key Assertions: all composed rules applied consistently.