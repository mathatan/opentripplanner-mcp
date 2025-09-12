---
title: Geocoding API Task Spec
slug: geocoding-api
version: 1.0.0
generate: true
finalArtifact: docs/geocoding-api.md
dependsOn:
	- routing-api
sources:
	- https://digitransit.fi/en/developers/apis/3-geocoding-api/
otpTopics: []
---

<!-- EXECUTION DIRECTIVE: Runner MUST emit docs/geocoding-api.md with full outline. -->

## NOTE: This is a TASK specification, not the final documentation

---

## TASK: Geocoding API

## 0. Purpose

Specification for producing Geocoding API documentation: address / place search, autocomplete, reverse geocoding, multilingual handling, administrative hierarchy, scoring & ranking, integration points with Routing API origin/destination selection.

## 1. Scope & Boundaries

- IN SCOPE: Forward search, reverse geocoding, autocomplete, filtering (layers, types), localization, scoring parameters, error & edge cases, performance considerations, integrated meta topics (auth, terms, FAQ, changes, glossary seeds).
- OUT OF SCOPE: Internal indexing pipeline implementation details, proprietary dataset weighting formulas.

## 2. Source Authorities (Always Re-Fetch)

1. Geocoding API page(s) (list actual Digitransit URLs when executing)
2. Architecture counterpart: (architecture geocoding page URL)
3. Registration & Keys: <https://digitransit.fi/en/developers/api-registration/>
4. Changes: <https://digitransit.fi/en/developers/changes/>
5. Deprecations: <https://digitransit.fi/en/developers/deprecations/>
6. OTP Topics (if any relevant for place / stop name normalization) or note none if not required.

## 3. Deliverables (Structure Blueprint)

Planned final doc sections: Overview; Concepts (Forward, Reverse, Autocomplete, Hierarchy); Endpoints & Query Parameters; Authentication & Keys (integrated); Parameters & Ranking Factors; Usage Examples (forward search basic, autocomplete minimal latency, reverse geocode coordinates, localized query, filtered layer query, complexity/perf example); Performance & Rate (latency, caching, partial responses); Error & Edge Cases; Integrated Policy & Terms Notes; Change & Deprecation Notes; Testing & Validation; References; Changelog; Glossary Seeds.

## 4. Quality Criteria

- Minimum 6 example scenarios (forward basic, forward filtered, autocomplete, reverse, localized, rate/latency optimization).
- Parameter table includes name, type, default (— if unknown), since, source (Digitransit vs internal), description.
- Ranking explanation maps core factors (text match, distance bias, popularity) with source attribution or NOTE: MISSING DATA.
- Error cases cover: no results, invalid bbox, unsupported language, throttling placeholder, partial data.
- Integrated meta topics represented (auth header placeholder, attribution link, FAQ seeds, change scan summary, glossary seed terms).

## 5. Detailed Steps (Todo Blueprint)

1. Fetch all listed source URLs.
2. Identify and list all endpoints (forward, reverse, autocomplete) with base paths.
3. Extract/define query parameters (text, lat, lon, bbox, layers/types, size/limit, lang, boundary filters).
4. Draft parameter table skeleton linking to source lines.
5. Enumerate ranking factors and mark unknowns.
6. Define example scenario placeholders (see Section 7).
7. Assemble performance considerations (index latency, caching headers if present, pagination/limit guidance).
8. Compile error & edge case matrix.
9. Integrate meta topic notes (auth, terms, FAQ seeds, changes summary, glossary seeds).
10. Add changelog entry.
11. Escalation review for missing data.

## 6. Parameter Table Framework (Planned Domains)

| Domain | Representative Parameters | Notes |
|--------|---------------------------|-------|
| Forward Search | text, layers, size, lang | Core user entry |
| Reverse Geocoding | lat, lon, radius | Coordinate to place |
| Autocomplete | text, size, focus.point.lat/lon | Low latency results |
| Filtering | bbox, layers, types | Constrain domain |
| Localization | lang, accept-language | Output language control |
| Ranking | (implicit factors) | Popularity, proximity, token match |

## 7. Planned Example Scenarios (Placeholders Only)

| ID | Scenario | Elements |
|----|----------|----------|
| EX1 | Basic forward search | text="central station" lang=en size=5 |
| EX2 | Filtered layers | text="market" layers=venue,poi size=3 |
| EX3 | Autocomplete | text="cen" focus.point near city center |
| EX4 | Reverse geocode | lat/lon -> nearest street address |
| EX5 | Localized query | text in Finnish + lang=fi fallback rules |
| EX6 | Performance/limit demo | large text + limit vs default comparison |

## 8. Error & Edge Case Checklist (Planned)

| Case | Trigger Strategy | Expected Handling |
|------|------------------|-------------------|
| No results | Obscure query token | Empty array + 200 |
| Invalid bbox | Malformed coords | 400 with validation error |
| Unsupported language | lang code not served | Fallback to default lang + warning flag |
| Throttling (future) | Simulated burst | 429 guidance (placeholder) |
| Partial data | Missing house number | Return best-effort feature w/ precision note |
| Ranking tie | Multiple identical scores | Deterministic tie-break explanation |

## 9. Cross-Links & Dependencies

Depends on: routing-api (consumer of geocoded coordinates). Integrated meta topics: Auth (API key header), Terms (attribution for geodata), FAQ (no results, language fallback), Changes (recent parameter additions), Glossary Seeds (place, feature, layer, bbox, token).

### Integrated Meta Topics Plan

| Meta Topic | Integration Point | Planned Content Stub |
|------------|-------------------|----------------------|
| Authentication & Registration | Authentication & Keys section | API key usage + placeholder quota note |
| Terms & Usage Policies | Policy notes subsection | Attribution link & caching hint |
| FAQ & Troubleshooting | Embedded FAQ | No results, language fallback, bbox invalid, ranking confusion |
| Changes & Deprecations | Change notes | Last 2 changes + how to detect new params |
| Glossary Seeds | Glossary seeds | feature, layer, token, bbox, ranking, autocomplete |

## 10. Changelog (Task Spec Evolution)

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | (replace-with-date) | Initial task spec created |

## 11. Escalation & Missing Data Policy

Unresolved ranking factor or parameter default after retries → NOTE: MISSING DATA with attempted sources.

---
(Do not add EXECUTION_SUMMARY until run phase.)
