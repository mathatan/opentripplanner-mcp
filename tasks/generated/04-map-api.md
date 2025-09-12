---
title: Map API Task Spec
slug: map-api
version: 1.0.0
generate: true
finalArtifact: docs/map-api.md
dependsOn:
	- routing-api
	- geocoding-api
sources:
	- https://digitransit.fi/en/developers/apis/4-map-api/
otpTopics: []
---

<!-- EXECUTION DIRECTIVE: Runner MUST emit docs/map-api.md with final documentation. -->

## NOTE: This is a TASK specification, not the final documentation

---

## TASK: Map API

## 0. Purpose

Specification for producing Map API documentation: tile services (raster/vector), style endpoints, attribution requirements, coordinate reference assumptions, caching & performance strategies, integration with Routing & Geocoding outputs.

## 1. Scope & Boundaries

- IN SCOPE: Tile endpoint patterns, style JSON retrieval, supported zoom range, format differences (PNG/JPG/WebP vs vector), attribution text, rate/performance considerations (tile caching, CDN hints), integrated meta topics.
- OUT OF SCOPE: Internal rendering pipeline, proprietary style layer definitions beyond public schema.

## 2. Source Authorities (Always Re-Fetch)

1. Map API page(s) (list concrete Digitransit URLs)
2. Architecture map service page
3. Registration & Keys: <https://digitransit.fi/en/developers/api-registration/>
4. Changes: <https://digitransit.fi/en/developers/changes/>
5. Deprecations: <https://digitransit.fi/en/developers/deprecations/>
6. Style specification reference (e.g., MapLibre/Mapbox style spec – ensure licensing ok) if explicitly cited.

## 3. Deliverables (Structure Blueprint)

Planned final doc sections: Overview; Concepts (Tile Pyramid, Style Definitions, Coordinate System); Endpoints (Raster Tiles, Vector Tiles, Style Manifest, Static Map if applicable); Authentication & Keys; Parameters (x,y,z, scale/@2x, format, style id, versioning); Usage Examples (tile URL, vector tile request with headers, style retrieval, caching example, attribution overlay); Performance & Rate (cache headers, CDN strategies, parallel request guidance); Error & Edge Cases; Integrated Policy & Terms Notes; Change & Deprecation Notes; Testing & Validation; References; Changelog; Glossary Seeds.

## 4. Quality Criteria

- Parameter/endpoint matrix covers tile path pattern, required vs optional segments.
- At least 5 example scenarios (basic tile fetch, high-DPI tile, vector tile fetch, style JSON, caching header inspection).
- Attribution section cites exact required text & link placeholders.
- Performance section includes concurrency guidance & cache-control interpretation if available.
- Edge cases include: invalid tile coordinates, unsupported zoom, missing style, format not allowed, rate placeholder.
- Integrated meta topics present (auth header placeholder; terms/attribution; FAQ seeds; change summary; glossary seed terms: tile, zoom, style, retina, cache).

## 5. Detailed Steps (Todo Blueprint)

1. Fetch sources & record base endpoints.
2. Enumerate endpoint patterns (raster, vector, style) with variable segments.
3. List parameters & derive defaults/constraints.
4. Plan example scenarios (Section 7).
5. Draft performance considerations (parallelism, header-based caching, CDN hints).
6. Compose error & edge matrix.
7. Integrate meta topic notes & glossary seeds.
8. Add changelog entry.
9. Escalation review.

## 6. Parameter Table Framework (Planned Domains)

| Domain | Representative Parameters | Notes |
|--------|---------------------------|-------|
| Raster Tiles | z, x, y, format, scale | Scale for retina (@2x) |
| Vector Tiles | z, x, y, tileset/style id | MVT format |
| Style Manifest | styleId, version | JSON style schema |
| Static Map (if any) | center, zoom, width, height | Optional feature |
| Caching | cache-control headers | Client caching rules |
| Attribution | attribution text/link | Legal requirements |

## 7. Planned Example Scenarios (Placeholders Only)

| ID | Scenario | Elements |
|----|----------|----------|
| EX1 | Basic raster tile | /tiles/{z}/{x}/{y}.png |
| EX2 | High-DPI raster tile | /tiles/{z}/{x}/{y}@2x.png + scale mention |
| EX3 | Vector tile request | /tiles/{z}/{x}/{y}.mvt headers |
| EX4 | Style manifest fetch | /styles/{styleId}.json |
| EX5 | Caching header demo | tile request + response headers analysis |

## 8. Error & Edge Case Checklist (Planned)

| Case | Trigger Strategy | Expected Handling |
|------|------------------|-------------------|
| Invalid coordinates | Out-of-range x/y | 404 or error JSON |
| Unsupported zoom | z beyond max | Error or empty tile |
| Missing style | Nonexistent styleId | 404 style not found |
| Unsupported format | Use .gif | 400/415 error |
| Rate placeholder | Simulated high request rate | Document backoff |
| Attribution missing | Client omits credit | Policy note (non-technical) |

## 9. Cross-Links & Dependencies

Depends on: routing-api (map overlays & stop markers), geocoding-api (coordinate resolution). Integrated meta topics: Auth (API key query/header), Terms (attribution required), FAQ (blank tiles, style not found, zoom unsupported), Changes (new style versioning), Glossary Seeds (tile, zoom, style, retina, cache).

### Integrated Meta Topics Plan

| Meta Topic | Integration Point | Planned Content Stub |
|------------|-------------------|----------------------|
| Authentication & Registration | Authentication & Keys | API key pattern, optional query param |
| Terms & Usage Policies | Policy & Terms Notes | Exact attribution string & link placeholder |
| FAQ & Troubleshooting | Embedded FAQ | Blank tile, style 404, zoom limit, high-DPI mismatch |
| Changes & Deprecations | Change notes | Recent style schema update summary |
| Glossary Seeds | Glossary seeds | tile, zoom, style, retina, cache |

## 10. Changelog (Task Spec Evolution)

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | (replace-with-date) | Initial task spec created |

## 11. Escalation & Missing Data Policy

Uncertain or absent style parameter or cache-control semantics after retries → NOTE: MISSING DATA with attempted sources.

---
(Do not add EXECUTION_SUMMARY until run phase.)
