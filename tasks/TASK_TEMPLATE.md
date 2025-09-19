---
# REQUIRED FRONT-MATTER KEYS (fill or copy into YAML front-matter)
# title: <Human readable task title>
# slug: <kebab-case-identifier>
# version: 1.0.0
# generate: true               # MUST be true for runner to emit final doc
# finalArtifact: docs/<slug>.md # Relative path of final documentation file to WRITE/OVERWRITE
# dependsOn: []                 # Optional array of other task slugs
# sources: []                   # Canonical source URLs
# otpTopics: []                 # OTP topic identifiers required
---

# TASK: {{SHORT_TITLE}}

> This template is a concise, LLM-friendly task spec. Replace {{PLACEHOLDERS}} with concrete values.

## 0. Purpose

One-line description of the intended final artifact and why it exists.

## 1. Scope & Boundaries

- IN SCOPE: {{IN_SCOPE}}
- OUT OF SCOPE: {{OUT_OF_SCOPE}}

## 2. Sources / Authorities

- canonical sources: {{SOURCES}}  # list URLs or spec files

## 3. Deliverables

- finalArtifact (optional): `{{FINAL_ARTIFACT_PATH}}`
- Deliverable sections (optional): Overview, Endpoints, Parameters, Usage Examples, Error & Edge Cases, References

## 4. Phases (template)

### Phase {{PHASE_MAJOR}}: {{PHASE_TITLE}}

- [ ] {{TASK_ID}} {{TASK_TITLE}}  # files: {{FILES}} ; owner: {{OWNER}} ; status: {{STATUS}}
  - {{TASK_DETAIL_BULLET_1}}  # optional, add relevant details about the task and it's execution

### Phase {{PHASE_MAJOR_NEXT}}: {{PHASE_TITLE_NEXT}}

- [ ] {{TASK_ID_NEXT}} {{TASK_TITLE_NEXT}}  # files: {{FILES_NEXT}} ; owner: {{OWNER_NEXT}} ; status: {{STATUS_NEXT}}
  - {{TASK_DETAIL_BULLET_A}}  # optional, add relevant details about the task and it's execution

Notes: use `{{TASK_ID}}` (T001 style); mark parallelizable tasks with `[P]`.

## 5. Acceptance criteria

Checklist the agent should satisfy to consider the task accepted. Populate concrete steps when creating the task.

- [ ] {{ACCEPT_STEP_1}}
- [ ] {{ACCEPT_STEP_2}}
- [ ] {{ACCEPT_STEP_3}}

### Technical checks (optional)

List the technical validation steps the agent should run. These are executable checks the agent performs; results should be recorded in the phase logs but not tracked as persistent flags here.

- build: `{{BUILD_COMMAND}}`  # e.g. `pnpm build`
- lint: `{{LINT_COMMAND}}`    # e.g. `pnpm lint`
- test suite: `{{UNIT_TEST_COMMAND}}`  # e.g. `pnpm test`
- singular test: `{{E2E_TEST_COMMAND}}`    # e.g. `pnpm test [test-file]`
- test-first (TDD): `{{TDD_STEPS}}`    # e.g. create failing test, implement, ensure pass

If a check fails, record logs and failure details in the corresponding phase entry.

## 6. Clarification needed (optional)

List items requiring user input or research; the agent should populate this during planning.

- {{CLARIFY_ITEM_1}}
- {{CLARIFY_ITEM_2}}

## 7. Notes (optional)

Only include notes when they add meaningful context for reviewers or the agent. If nothing to add, omit this section.

- "{{NOTES_DETAILS}}"    # optional free-form details or short bullets
- links: [ {{LINK_1}} ]            # optional related docs or specs

## 8. References

- sources: {{SOURCES_LIST}}

---

Template version: 2.4.0
