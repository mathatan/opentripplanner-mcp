---
# REQUIRED FRONT-MATTER KEYS
# title: <Human readable task title>
# slug: <kebab-case-identifier>
# version: 1.0.0
# generate: true               # MUST be true for runner to emit final doc
# finalArtifact: docs/<slug>.md # Relative path of final documentation file to WRITE/OVERWRITE
# dependsOn: []                 # Optional array of other task slugs
# sources: []                   # Canonical source URLs
# otpTopics: []                 # OTP topic identifiers required
---

# TASK: <REPLACE_WITH_TASK_TITLE>

## 0. Purpose

Concise statement of what final documentation artifact this task will eventually produce and how it fits into the Digitransit set.

## 1. Scope & Boundaries

- IN SCOPE: Specific outputs (tables, examples, scenarios, glossary terms, etc.).
- OUT OF SCOPE: Explicit exclusions (internal runbooks, raw data dumps, proprietary metrics).

## 2. Source Authorities (Always Re-Fetch)

List canonical URLs (Digitransit pages, architecture pages, registration, changes, deprecations) plus OTP topics (RouteRequest, FeatureFlags, etc.). Supplemental sources only if gaps appear.

## 3. Deliverables (Structure Blueprint)

Define the sections the future generated documentation MUST contain. Integrate meta topics (Auth & Registration, Terms/Policies, FAQ/Troubleshooting, Changes/Deprecations, Glossary seeds) WITHIN the single task’s structure instead of separate task files. Recommended sections (and expected presence in final artifact `finalArtifact`):

- Overview
- Concepts (Domain Model)
- Endpoints / Interfaces
- Authentication & Keys (integrated; no standalone auth doc)
- Parameters (merged OTP + Digitransit)
- Usage Examples
- Performance & Rate Guidance
- Error & Edge Cases
- Integrated Policy & Terms Notes
- Change & Deprecation Notes
- Testing & Validation
- References
- Changelog
- Glossary Seeds

Any omission MUST be justified with `NOTE: MISSING DATA` inside the emitted final documentation.

## 4. Quality Criteria

Enumerate acceptance checks (sources re-fetched, parameter origins cited, minimum example scenarios, advanced scenario present, security placeholders, edge cases covered, changelog initialized).

## 5. Detailed Steps (Todo Blueprint)

Ordered actionable steps the execution agent will materialize (fetch sources, retrieve OTP topics, outline scaffold, build tables, draft example placeholders, performance notes, error matrix, cross-links, quality review, finalize summary). These steps will be turned into a live todo list by the runner. The runner MUST NOT stop after summary— it MUST also write the fully synthesized documentation file at `finalArtifact`.

## 6. Parameter Table Framework (If Applicable)

Provide skeletal table header and planned domains / groupings. Omit if not relevant to this task domain.

## 7. Planned Example Scenarios (Placeholders Only)

Enumerate scenario IDs with short descriptions (no full examples). Cover basic, intermediate, advanced/realtime, multilingual, edge/perf, complexity-limited where relevant.

## 8. Error & Edge Case Checklist (Planned)

Table of case, trigger strategy, expected handling. Include invalid key, rate/complexity limits, empty result, realtime stale, timezone rollover, unsupported mode, deprecation, partial data.

## 9. Cross-Links & Dependencies

List related task slugs (dependsOn, related) and rationale (e.g., uses dataset definitions from routing-data-api, references realtime examples from realtime-apis).

## 10. Changelog (Task Spec Evolution)

Seed with 1.0.0 creation row. Future edits increment patch/minor/major.

## 11. Escalation & Missing Data Policy

State how unresolved data is marked (NOTE: MISSING DATA) and criteria for deferral. Each unresolved item becomes a memory key `missing:<slug>:<descriptor>`.

## 12. Execution Directive (MANDATORY)

The documentation runner MUST, after completing quality checks, generate/overwrite the file indicated by `finalArtifact` with the fully rendered documentation using ONLY validated context (sources & otpTopics). The task file itself remains a specification; the emitted artifact is consumer-facing. All placeholders in sections 6–8 must be replaced in the artifact; placeholders MAY remain in the task spec.

### Final Artifact Minimum Structural Outline

```markdown
---
title: <title>
slug: <slug>
version: <task version>
generatedAt: <ISO8601>
sourcesReferenced: [..]
otpTopicsReferenced: [..]
---

# <Title>

## Overview
## Concepts
## Endpoints
## Authentication & Keys
## Parameters
## Usage Examples
## Performance & Rate
## Error & Edge Cases
## Integrated Policy & Terms Notes
## Change & Deprecation Notes
## Testing & Validation
## References
## Changelog
## Glossary Seeds
```

The runner MUST ensure this outline exists (sections may be empty only with explicit NOTE: MISSING DATA).

---

Template version: 2.1.0
