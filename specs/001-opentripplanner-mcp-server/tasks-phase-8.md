# Phase 8: Documentation & Governance

Status: NOT STARTED

## Goals

Produce comprehensive, user & contributor‑facing documentation that is synchronized with implemented schemas and behaviors. Formalize governance artifacts: schema reference, constitution audit mapping, README updates, and ensure quickstart examples reflect final tool contracts (not ad‑hoc shapes). This phase increases discoverability, reduces onboarding time, and creates auditable traceability between constitution clauses, code, and tests.

## Task List

| ID   | Status   | Task | Acceptance Criteria | Spec / Doc Trace |
|------|----------|------|---------------------|------------------|
| T074 | [ ]      | Update quickstart examples for all tools (File: `specs/001-opentripplanner-mcp-server/quickstart.md`) — Include plan_trip, geocode_address, reverse_geocode, find_stops, get_departures, user vars. | See "Per-Task Success Details" for T074. | This document: Per-Task Success Details. |
| T075 | [ ] [P]  | Generate/hand-write schema reference (File: `docs/schema-reference.md`) — Derive field tables from Zod schemas; link to source paths. | See "Per-Task Success Details" for T075. | This document: Schema Reference Structure; Per-Task Success Details. |
| T076 | [ ] [P]  | Add constitution audit mapping (File: `docs/constitution-audit.md`) — Clause → file(s)/test(s)/status table. | See "Per-Task Success Details" for T076. | This document: Constitution Audit. |
| T077 | [ ] [P]  | Update README with tool usage (File: `README.md`) — Add invocation examples & build/lint/test workflow. | See "Per-Task Success Details" for T077. | This document: README Enhancements. |

Legend: [ ] Pending | [P] Parallel-safe

## Documentation Principles

- Single Source of Truth: Schema reference extracted from Zod definitions in `src/schema/*`. Manual sections should not duplicate constraints verbatim—link & summarize.
- Drift Detection: Add NOTE blocks instructing future contributors to update both the schema and reference if changes occur (tie to C7 versioning clause).
- Minimal Redundancy: Avoid replicating entire error taxonomy already documented; instead reference Phase 4/5 sections and error schema file.
- Contract Alignment: All example payloads in quickstart/README MUST match the tool contracts in `specs/001-opentripplanner-mcp-server/contracts/*.md` and e2e tests in `tests/e2e/*.test.ts`. Do not invent alternative shapes.

## Schema Reference Structure (`docs/schema-reference.md`)

Suggested outline:

1. Overview (purpose, scope)
2. Core Entities
   - Coordinate
   - LocationRef
   - PlanConstraints
   - Itinerary and Leg
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

Manual Cross‑Check Checklist (keep updated until generator exists):

- [ ] `src/schema/coordinate.ts` → CoordinateSchema referenced once
- [ ] `src/schema/locationRef.ts` → LocationRefSchema referenced once
- [ ] `src/schema/planConstraints.ts` → PlanConstraintsSchema referenced once
- [ ] `src/schema/itinerary.ts` → LegSchema + ItinerarySchema referenced once
- [ ] `src/schema/geocode.ts` → GeocodeResultSchema + GeocodeResponseSchema referenced once
- [ ] `src/schema/departure.ts` → DepartureSchema + DepartureResponseSchema referenced once
- [ ] `src/schema/userVariable.ts` → UserVariable schema(s) referenced once (if exported)
- [ ] `src/schema/error.ts` → ErrorSchema + WarningSchema referenced once

## Constitution Audit (`docs/constitution-audit.md`)

Table columns:

| Clause | Description (short) | Implemented Files | Test Coverage | Status | Notes |

Status values: Implemented | Partial | Pending.

Include narrative sections for: Observability (C3 future), Realtime Freshness (C4 future), and Rate Limit & Retry (C5) summarizing current implementation boundaries.

## Quickstart Enhancements

Add per-tool example invocation (JSON MCP frame or CLI snippet if wrapper planned). Each snippet: request payload + truncated response focusing on key fields. Use realistic coordinates & stop IDs consistent with test fixtures.

Guardrails (must follow contracts):

- plan_trip: use origin/destination shape from contract: `{ "type": "coords", "value": { "lat", "lon" } }` or `{ "type": "label", "value": "home" }`; include `when` and optional `constraints` per contract. Do not use raw `{ lat, lon }` at the top level for examples.
- geocode_address: `{ text, size?, language?, focus?, layers? }` as specified.
- get_departures: `stop` as `{ type: 'id' | 'label', value: string }`; include `windowMinutes?`, `limit?`.
- reverse_geocode: `{ lat, lon, language? }`.
- save_user_variable: `{ key, type: 'location'|'preference'|'other', value: ... }`.
- get_user_variables: `{}` (empty arguments).

Note: Mirror shapes already used in `tests/e2e/*.e2e.test.ts` to avoid drift.

## README Enhancements

- Add "Project Architecture" section summarizing layers.
- Add "Development Workflow" enumerating: install → build → lint → test → dev watch.
- Add "Testing Strategy" referencing Phases 2 (RED), 3–7 (GREEN) maturity progression.
- Add "Contributing" with checklist referencing constitution clauses.
- Add badge placeholders (coverage, build) for future CI.
- Environment Variables: Standardize on `DIGITRANSIT_API_KEY` (align with onboarding). Clearly state that the current code path does not require an API key yet; mark API‑key based integration as future work to avoid misleading users (C12, C7). Remove/avoid conflicting names like `DIGITRANSIT_SUBSCRIPTION_KEY` in examples.
- Usage Examples: Prefer real tool examples (plan_trip, geocode_address, get_departures, save/get_user_variables). De‑emphasize or remove the temporary `hello` example once the main tools are in place.

## Governance & Traceability

Introduce a short decision log subsection in `docs/constitution-audit.md` listing major design decisions (e.g., token bucket parameters, retry backoff strategy, itinerary fingerprint composition) with date & reference commit (placeholder until commit known).

## Acceptance Criteria

- All listed docs created/updated with no markdown lint errors.
- Schema reference lists every exported schema with no missing fields (spot cross-check against directory listing of `src/schema`).
- Constitution audit accurately maps each clause; pending clauses clearly labeled.
- README and quickstart examples pass manual execution mentally (payload fields match contracts and schemas; no stale names).
- No duplicated contradictory constraints.
- Contract & Test Consistency: Quickstart example payloads match the corresponding contracts (`specs/.../contracts/*.md`) and the shapes exercised in `tests/e2e/*.e2e.test.ts` (e.g., `plan_trip`, `geocode_address`, `user_variables`).

### Per-Task Success Details

| Task | Additional Acceptance Detail |
|------|-------------------------------|
| T074 | Quickstart shows at least one example per tool with minimal + extended variant (e.g., plan_trip with constraints). Includes note about building before tests. |
| T075 | Every schema exported in `src/schema` appears exactly once in reference table; each field row includes source path. Automated diff script placeholder added. Manual checklist at bottom kept in sync. |
| T076 | Each constitution clause row contains at least one file or is marked Pending with rationale; future clauses (C3, C4) explained in notes section. |
| T077 | README gains Architecture, Workflow, Contributing, and Testing sections; links to schema reference & audit documents. Environment variables standardized; clarify API key not required yet. |

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
4. Verify quickstart examples match `contracts/*.md` input shapes (e.g., `plan_trip.origin.type === 'coords'|'label'`).

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
| C12 | Security & privacy statements explicit; avoid implying PII storage or mandatory API keys at this phase. |

## Next Steps After Phase 8

Enter Phase 9 to harden (fuzz, soak, security, coverage gates) and finalize version bump once documentation stable.
