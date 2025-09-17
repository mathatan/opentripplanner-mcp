# Phase 8: Documentation & Governance

Status: NOT STARTED

## Goals

Produce comprehensive, user & contributor‑facing documentation that is synchronized with implemented schemas and behaviors. Formalize governance artifacts: schema reference, constitution audit mapping, README updates, and ensure quickstart examples reflect final tool contracts. This phase increases discoverability, reduces onboarding time, and creates auditable traceability between constitution clauses, code, and tests.

## Task List

| ID  | P? | Task | File / Path | Notes |
|-----|----|------|-------------|-------|
| T074 |  | Update quickstart examples for all tools | `specs/001-opentripplanner-mcp-server/quickstart.md` | Include plan_trip, geocode_address, reverse_geocode, find_stops, get_departures, user vars. |
| T075 | P | Generate/hand-write schema reference | `docs/schema-reference.md` | Derive field tables from Zod schemas; link to source paths. |
| T076 | P | Add constitution audit mapping | `docs/constitution-audit.md` | Clause → file(s)/test(s)/status table. |
| T077 | P | Update README with tool usage | `README.md` | Add invocation examples & build/lint/test workflow. |

Legend: P = Parallelizable.

## Documentation Principles

- Single Source of Truth: Schema reference extracted from Zod definitions in `src/schema/*`. Manual sections should not duplicate constraints verbatim—link & summarize.
- Drift Detection: Add NOTE blocks instructing future contributors to update both the schema and reference if changes occur (tie to C7 versioning clause).
- Minimal Redundancy: Avoid replicating entire error taxonomy already documented; instead reference Phase 4/5 sections and error schema file.

## Schema Reference Structure (`docs/schema-reference.md`)

Suggested outline:

1. Overview (purpose, scope)
2. Core Entities
   - Coordinate
   - LocationRef
   - PlanConstraints
   - Itinerary / Leg / Step (if exists)
   - GeocodeResult / GeocodeResponse
   - Departure / DeparturesResponse
   - UserVariable / UserVariablesResponse
   - Error / Warning shape
3. Cross-Cutting Semantics
   - correlationId propagation (future)
   - warnings array usage
   - scheduleType semantics (if completed by Phase 6)
4. Field Tables (per entity)
   - Column set: Field | Type | Nullable? | Constraints | Description | Source Schema Path
5. Versioning & Change Policy (ties to Constitution C7)

## Constitution Audit (`docs/constitution-audit.md`)

Table columns:

| Clause | Description (short) | Implemented Files | Test Coverage | Status | Notes |

Status values: Implemented | Partial | Pending.

Include narrative sections for: Observability (C3 future), Realtime Freshness (C4 future), and Rate Limit & Retry (C5) summarizing current implementation boundaries.

## Quickstart Enhancements

Add per-tool example invocation (JSON MCP frame or CLI snippet if wrapper planned). Each snippet: request payload + truncated response focusing on key fields. Use realistic coordinates & stop IDs consistent with test fixtures.

## README Enhancements

- Add "Project Architecture" section summarizing layers.
- Add "Development Workflow" enumerating: install → build → lint → test → dev watch.
- Add "Testing Strategy" referencing Phases 2 (RED), 3–7 (GREEN) maturity progression.
- Add "Contributing" with checklist referencing constitution clauses.
- Add badge placeholders (coverage, build) for future CI.

## Governance & Traceability

Introduce a short decision log subsection in `docs/constitution-audit.md` listing major design decisions (e.g., token bucket parameters, retry backoff strategy, itinerary fingerprint composition) with date & reference commit (placeholder until commit known).

## Acceptance Criteria

- All listed docs created/updated with no markdown lint errors.
- Schema reference lists every exported schema with no missing fields (spot cross-check against directory listing of `src/schema`).
- Constitution audit accurately maps each clause; pending clauses clearly labeled.
- README and quickstart examples pass manual execution mentally (payload fields match schemas; no stale names).
- No duplicated contradictory constraints.

### Per-Task Success Details

| Task | Additional Acceptance Detail |
|------|-------------------------------|
| T074 | Quickstart shows at least one example per tool with minimal + extended variant (e.g., plan_trip with constraints). Includes note about building before tests. |
| T075 | Every schema exported in `src/schema` appears exactly once in reference table; each field row includes source path. Automated diff script placeholder added. |
| T076 | Each constitution clause row contains at least one file or is marked Pending with rationale; future clauses (C3, C4) explained in notes section. |
| T077 | README gains Architecture, Workflow, Contributing, and Testing sections; links to schema reference & audit documents. |

### Automation & Tooling

Add a future script plan (`scripts/generate-schema-doc.ts`) outline:

1. Import Zod schemas dynamically via glob.
2. Extract `.shape` metadata recursively (handle nested objects/arrays).
3. Output markdown table fragments; preserve manual description overrides via frontmatter YAML or inline JSDoc.
4. Fail (non‑zero exit) if any schema missing from reference doc (drift detection).

Include a NOTE in `schema-reference.md`: "Do not edit generated field tables manually—regenerate via script (Phase 10).".

### Drift Detection Procedure

Interim (manual) steps:

1. `ls src/schema/*.ts` → collect base names.
2. Grep each for `export const (\w+)Schema`.
3. Verify each appears in `docs/schema-reference.md` (case-sensitive). Provide a checklist section at bottom of schema reference file.

### Decision Log Format

Add section template to `docs/constitution-audit.md`:

```markdown
## Decision Log

| Date | ID | Decision | Rationale | Related Clauses | Follow-Up |
|------|----|----------|-----------|-----------------|-----------|
| YYYY-MM-DD | DL001 | Token bucket (30/10s) retained | Balanced burst vs fairness | C5, C8 | Re-eval after real load |
```

### Documentation Linting & Validation

Plan to add (future CI):

- Markdown lint (`markdownlint-cli2`) over `docs/` & `tasks/`.
- Link checker (e.g., `markdown-link-check`) for internal anchor & file references.
- Spell check (optional) for schema names & user-facing text.

### Open Questions

| Topic | Question | Proposed Handling |
|-------|----------|-------------------|
| Schema reference generation | Hand-written vs scripted? | Hand-written now; script in Phase 10. |
| Coverage badge | Add before coverage gate complete? | Placeholder badge, real value once CI sets artifact. |
| correlationId docs | Document now though not implemented? | Document as future field with TODO tag (avoid misleading users). |
| Multi-language examples | Add localized examples? | Defer until language fallback implemented externally. |

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Schema drift after updates | Add CI doc-check step in future (TODO). |
| Overly verbose reference becomes stale | Keep descriptions concise (<140 chars). |
| Clause mapping subjective | Provide rationale column; review in code review. |

## Constitution Clause Mapping

| Clause | Coverage in Phase 8 |
|--------|---------------------|
| C1 | Documentation references test-first approach. |
| C5 | README & audit mention rate limiter & retry design. |
| C6 | Error schema & taxonomy referenced not duplicated. |
| C7 | Versioning/update policy documented. |
| C13 | Structured doc file placement. |
| C14 | Schema-derived references avoid manual redefinition. |

## Next Steps After Phase 8

Enter Phase 9 to harden (fuzz, soak, security, coverage gates) and finalize version bump once documentation stable.
