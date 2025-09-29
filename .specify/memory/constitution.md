<!--
Sync Impact Report
Version change: (none prior) -> 1.0.0
Modified principles: (initial set)
Added sections: Core Principles; Delivery Workflow; Governance
Removed sections: N/A
Templates requiring updates:
	.specify/templates/plan-template.md ✅ updated
	.specify/templates/spec-template.md ✅ no change needed (remains generic)
	.specify/templates/tasks-template.md ✅ updated
Follow-up TODOs: None
-->

# OpenTripPlanner MCP Constitution

## Core Principles

### 1. Implementation Velocity First

The project MUST prioritize delivering working MCP server capabilities rapidly over
exhaustive pre-planning. Code that ships and is exercised by real usage takes
precedence over speculative abstractions. Any proposed delay MUST demonstrate
clear, quantified future rework avoidance. YAGNI is enforced: remove or reject
unused layers, premature generalization, or indirection lacking a present user.
Rationale: Fast feedback loops surface true requirements earlier, reducing total
cost and calendar time.

### 2. Iterative Hardening Over Upfront Testing

Unit and integration test suites are OPTIONAL in early iterations and MAY be
skipped entirely until concrete stability, regression risk, or external contract
surfaces justify them. When tests are added they MUST target: (a) externally
consumed contracts, (b) brittle logic with prior defects, or (c) critical data
transformation. Ad-hoc manual validation via documented examples (docs/ and
research snapshots) is sufficient initially. Rationale: Avoid sunk time writing
tests that will be invalidated by rapid structural change.

### 3. Documentation-As-Source-of-Truth

Feature behavior, API shapes, and data contracts MUST be documented in `docs/` or
spec artifacts before (or at worst concurrently with) non-trivial implementation.
Inline code comments SHOULD focus only on non-obvious rationale. If divergence
occurs, docs MUST be updated in the same commit as the code change. Rationale:
Doc-first alignment enables fast onboarding and replaces many low-value tests.

### 4. Lean, Readable, Standards-Compliant Code

Code MUST favor clarity over cleverness, follow established TypeScript patterns
already present in `src/`, and keep module size small (prefer focused files over
monoliths). Shared utilities MUST have a single authoritative implementation.
Dead, commented-out, or speculative code MUST be removed immediately. Rationale:
Readable code reduces need for tests to explain intent and accelerates future
changes.

### 5. Progressive Quality Gates

Quality controls (tests, performance benchmarks, stricter lint rules) SHOULD be
introduced progressively once baseline feature completeness (MVP) is achieved.
Blocking gates MUST be justified with a concrete risk statement ("Potential data
loss", "External contract instability", etc.). Premature gating is prohibited.
Rationale: Defers non-essential investment until ROI is demonstrable.

## Delivery Workflow

1. Define or update minimal spec / doc snippet describing the change.
2. Implement directly in `src/` focusing on smallest end-to-end viable slice.
3. Add or update documentation examples to exercise new behavior.
4. Perform manual verification using documented examples / scripts.
5. (Optional, when warranted) Introduce targeted tests around newly stable
 contracts or fragile logic.
6. Refactor for clarity (rename, extract, delete) keeping behavioral changes
 isolated and documented.

Non-compliance Handling:

- If a step is skipped it MUST be justified in commit message.
- Repeated unjustified skips trigger a governance review (see below).

## Governance

Authority: This constitution supersedes prior informal practices. All
contributors are responsible for self-enforcement.

Amendments:

- Anyone MAY propose an amendment via PR modifying this file.
- Version MUST bump per Semantic Versioning (see below) with rationale in PR.
- Approval requires at least one maintainer review confirming principles remain
 consistent with project direction.

Versioning Policy (Constitution):

- MAJOR: Removal or reversal of a principle; governance process overhaul.
- MINOR: New principle or section; material expansion changing expectations.
- PATCH: Clarification, wording improvement, formatting, or non-normative edit.

Compliance Review:

- Spot checks MAY be performed on recent merges focusing on: documentation
 alignment, absence of dead code, rationale for added complexity.
- Findings SHOULD result in lightweight follow-up issues; blocking only if risk
 of user-facing breakage or data corruption.

Deferred Tests Policy:

- When skipping tests for a change that introduces complexity (multiple branches
 or data transformations), a TODO MAY be added but MUST include the concrete
 trigger condition for when the test becomes mandatory (e.g., "stabilize API X"
 or "first reported defect in module Y").

Escalation:

- Persistent violations without rationale MAY trigger a MINOR amendment adding a
 stricter gate specific to the abuse vector.

**Version**: 1.0.0 | **Ratified**: 2025-09-29 | **Last Amended**: 2025-09-29
