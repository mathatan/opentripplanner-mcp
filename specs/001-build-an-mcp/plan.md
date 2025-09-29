
# Implementation Plan: MCP Timetables, Routes & Address Lookup

**Branch**: `001-build-an-mcp` | **Date**: 2025-09-29 | **Spec**: `specs/001-build-an-mcp/spec.md`
**Input**: Feature specification from `/specs/001-build-an-mcp/spec.md`

## Execution Flow (/plan command scope)

```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:

- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

Deliver an MCP (Model Context Protocol) server providing three core transport data capabilities for Finland using Digitransit (OpenTripPlanner + Pelias Geocoding) upstream APIs: (1) free‑text address & stop resolution with deterministic disambiguation, (2) public transport itinerary planning (scheduled only) between two resolved points with departure or arrival semantics and bounded search window, and (3) scheduled stop timetable (next N departures) retrieval. Design emphasizes minimal, lean TypeScript Node.js implementation, Zod v3 schema validation at boundaries, clear error categorization, and documentation-first approach per Constitution. Out of scope: realtime, map tiles, vehicle positions, advanced mode filtering beyond a simple journeyPreset enumeration.

## Technical Context

**Language/Version**: TypeScript (Node.js 18+ runtime assumed; confirm via `.node-version`)
**Primary Dependencies**: Minimal: `zod` (validation), built‑in `fetch` or lightweight `undici` if needed (prefer native), no new heavy frameworks. Existing repo tooling: Vitest, ESLint.
**Storage**: None (stateless; transient in‑memory caching layer optional for response reuse)
**Testing**: Vitest (targeted contract tests later; early phases may rely on manual validation per Constitution Principle 2)
**Target Platform**: Headless MCP server process (CLI / Node service)
**Project Type**: Single backend service (monorepo single project). No frontend.
**Performance Goals**: p95 < 1500ms, p99 < 3000ms for lookup/route/timetable (from spec FR-018)
**Constraints**: Max lookup candidates 5, max itineraries 3, timetable departures 5, searchWindow clamp 120 min, timetable horizon clamp 90 min. Deterministic ordering, Finnish→English→Swedish name fallback.
**Scale/Scope**: Initial Finland-only coverage; moderate request volume bounded by Digitransit limits (documented ~10 rps pragmatic guidance).

Uncertainties: None blocking (all clarifications present in spec). No NEEDS CLARIFICATION markers remain in final functional scope.

## Constitution Check

Principles Assessment:

1. Implementation Velocity First – Plan keeps architecture lean: a small set of modules (infrastructure clients, services, tool handlers, schemas). Avoids premature abstractions (no repository layer, no DI container).
2. Iterative Hardening – Tests deferred except minimal schema validation; quickstart examples will act as manual verification seeds.
3. Documentation-As-Source-of-Truth – Spec + this plan + forthcoming `research.md`, `data-model.md`, `contracts/*`, `quickstart.md` will precede substantial coding changes.
4. Lean, Readable Code – Proposed structure keeps files focused (one concern per file). No speculative layers.
5. Progressive Quality Gates – Performance and error metrics instrumentation planned as lightweight counters only; no heavy observability stack.

Result: PASS (no violations). Complexity Tracking remains empty.

## Project Structure

### Documentation (this feature)

```
specs/001-build-an-mcp/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)

```
src/
├── infrastructure/        # HTTP clients, rate limiting wrapper, caching
├── schema/                # Zod schemas & types (location, route, timetable, errors)
├── services/              # Domain services: lookupService, routeService, timetableService
├── tools/                 # MCP tool handler implementations
├── util/                  # Shared utilities (fingerprint, normalization, ordering)
└── index.ts               # Entry wiring (register tools)

tests/ (incremental; may remain sparse early)
├── contract/              # Future contract tests
├── e2e/                   # Future end-to-end tests
└── unit/                  # Focused logic tests (deferred until stability)
```

**Structure Decision**: Single backend project; refine existing `src/` by introducing subfolders above. Reuses current compiled `build/` transitional JS only until TS rewrites complete.

## Phase 0: Outline & Research

1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:

   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts

*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/` (omit if premature)

3. **(Optional, Use minimal testing) Generate contract tests** after a contract is declared stable:
   - One test file per stable endpoint
   - Assert request/response schemas
   - Avoid broad failing test scaffolding for volatile designs

4. **(Optional, Use minimal testing) Extract test scenarios** from user stories once flows stabilize; rely on quickstart examples early.

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh copilot`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach

*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:

- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each contract → contract test task [P]
- Each entity → model creation task [P]
- Each user story → integration test task
- Implementation tasks to make tests pass

**Ordering Strategy**:

- If tests exist: place before related implementation; else rely on quickstart examples for manual validation.
- Dependency order: Models before services before UI / CLI / API surfaces.
- Mark [P] for parallel execution (independent files)

**Estimated Output**: 25-30 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation

*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |

## Progress Tracking

*This checklist is updated during execution flow*

**Phase Status**:

- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [ ] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:

- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [ ] Complexity deviations documented

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
