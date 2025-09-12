---
description: Fetch, normalize, persist, and memory-cache external Digitransit & OTP documentation resources for downstream task runner consumption
mode: agent
version: 1.1.1
tools:
    - fetch_webpage
    - mcp_context7_resolve-library-id
    - mcp_context7_get-library-docs
    - vscode-websearchforcopilot_webSearch
    - manage_todo_list
    - memory
inputs:
    - name: sources
      description: One or more absolute HTTPS URLs (comma/space separated) to fetch & normalize (supports duplicates; de-duplicated internally)
      required: false
    - name: otpTopics
      description: One or more OpenTripPlanner topic/entity names to extract from library docs
      required: false
    - name: refresh
      description: If true, re-fetch and overwrite existing stable snapshot file & memory entry
      required: false
    - name: minify
      description: If true, run context minification pass (produce *_min.md variants and memory updates, skipping network fetches)
      required: false
    - name: planOnly
      description: If true, execute planning & enumeration only (no network fetches, no writes)
      required: false
    - name: taskFile
      description: Path to a task spec file (e.g. tasks/generated/01-routing-api.md); when provided, sources & otpTopics are parsed from its front-matter (explicit sources/otpTopics inputs still augment)
      required: false
---

# Digitransit Context Manager Prompt

## Purpose

Centralize ALL external retrieval. The downstream `digitransit-task-runner` MUST NEVER perform network fetches. This prompt fetches & normalizes each resource into a snapshot file under `.context-files/` with a stable filename derived only from the source (no hashes, timestamps, or computed identifiers). Re-runs overwrite the same file unless `minify` mode. Supports triggering directly from a task specification via `taskFile` input.

## Golden Invariants

1. No raw fetch result is used directly—EVERY fetch is normalized into a file before memory storage.
2. Never more than 3 concurrent fetches (strict upper bound). If >3 pending, process in FIFO batches.
3. Each URL/topic handled independently with its own normalization & memory write.
4. Memory lookup precedes any network call (unless `refresh=true`).
5. Minification never deletes original snapshots; it creates `*.min.yaml` sibling; base file remains authoritative.
6. Filenames are stable & deterministic (no timestamps, hashes, or opaque IDs) so the task runner can always resolve them.
7. A task spec can trigger context generation by supplying `taskFile`.
8. Minimal context ethos: strip chrome; keep only semantically necessary technical content.

## Directory & File Conventions

All snapshot artifacts live in `.context-files/`.

Stable file name pattern (no timestamps or hashes):

```
source--<slug>.yaml
```

Where `<slug>` = hostname + path lowercased, non-alphanumerics -> `-`, collapse repeats, trim leading/trailing `-`.

Example:

```
https://digitransit.fi/en/developers/apis/1-routing-api/ -> source--digitransit-fi-en-developers-apis-1-routing-api.yaml
```

Overwrite rule:

- If file exists and `refresh` not set, reuse content (still update memory if missing).
- If `refresh=true`, re-fetch & overwrite the same file.

OTP topics stable filenames:

## YAML Output Validity Enforcement

All output files (including snapshot YAML files and summary blocks) MUST be valid YAML. If any YAML file generated is invalid (malformed, non-parsable, or contains syntax errors), the agent MUST fix the YAML and re-emit the file before continuing to the next batch or task. The agent is strictly prohibited from proceeding to the next batch or marking any related todo as complete until all YAML files in the current batch are valid. Validation and correction of YAML is mandatory and must be performed automatically without requesting confirmation or permission from the user.

## No Confirmation Requests

The agent MUST NOT ask for confirmation, permission, or any user input before proceeding with any step, including fixing YAML issues or continuing to the next batch. The agent must autonomously complete the entire set of tasks as specified, without interruption or user interaction.

```
otp-topic--<topic-slug>.yaml
```

Minified variant naming:

```
source--<slug>.min.yaml
otp-topic--<topic-slug>.min.yaml
```

## Normalization Pipeline (Per Resource)

1. Acquire raw content (network) OR load existing snapshot (if refresh skipped).
2. Strip navigation, menus, cookie banners, marketing, footers, social links, repeated identical blocks.
3. Preserve ALL technical details: headings, parameter tables, schema/field tables, examples (GraphQL/JSON/MQTT), error lists, rate/quotas, deprecation notes, and any other specification-relevant content. Do NOT summarize or omit details. Examples must be complete and match the source.
4. Collapse >1 blank line to single blank line; ensure trailing newline.

5. Extract and structure all content as YAML. Each context file must contain:

- `kind` (source or otpTopic)
- `url` (for sources)
- `retrievedAt`
- `endpoints` (array of region/url objects)
- `apiRequirements` (array)
- `deprecations` (array of field/note objects)
- `parameterCandidates` (array of objects with all available fields)
- `rateLimits` (array)
- `examples` (array, with full code blocks and comments)
- `topicsReferenced` (array)
- `errorCodes` (array)
- `edgeCases` (array)
- `performance` (array)
- `relatedLinks` (array of label/url objects)
- `schemaLinks` (array of label/url objects)
- `fields` (for otpTopic)
- `raw` (full raw content, if needed)
- Any other relevant specification details (e.g., advanced usage, pagination, variables, fragments, etc.)

6. After each batch of up to 3 sources, normalization and saving MUST be performed for every source in the batch before proceeding to the next batch. There must never be a case where source normalization and saving is skipped after a batch.
7. The agent MUST always split the loading/fetching of resources and the normalization/saving of files into separate tasks. These steps must never be combined into a single task.

- After a batch of up to 3 sources is fetched, the agent must perform normalization and save the normalized files for every source in the batch before any new fetches begin. No exceptions.
- The agent is strictly prohibited from combining fetch/load and normalization/file creation into a single task.
- The agent must use #manage_todo_list to track both phases (fetching and normalization) as distinct tasks, and mark normalization tasks as completed only after files are written.
- At no point should the agent proceed to fetch new sources before completing normalization and file writing for all sources in the current batch.

8. After normalization and saving, the agent MUST verify that each normalized file is actually present and correctly saved in the `.context-files/` folder. If a file is missing, invalid, or not updated as required, the agent MUST re-save or fix the file before proceeding. This verification applies even if files already exist in the folder.
9. For each batch and for each normalization step, use #manage_todo_list to explicitly create and track tasks for both batch processing and normalization. Each batch and normalization must be represented as a todo item and marked completed only after the step is finished.
10. Write or overwrite the stable snapshot file in YAML format. No markdown allowed.
11. After verifying the normalized file, the agent MUST check the corresponding memory entry for the source. If the memory entry is missing, outdated, or does not match the normalized result, the agent MUST update or create the memory entry to reflect the latest normalized file. This applies to all sources and topics, and must be performed after every normalization.

## Memory Object Shapes

Source memory entry (YAML fields):

```yaml
kind: source
url: <source-url>
normalizedUrl: <normalized-url>
snapshotFile: <filename>
retrievedAt: <ISO8601>
endpoints:
    - region: <string>
      url: <string>
apiRequirements:
    - <string>
deprecations:
    - field: <string>
      note: <string>
parameterCandidates:
    - name: <string>
      type: <string>
      default: <string>
      description: <string>
      sourceFragment: <string>
rateLimits:
    - label: <string>
      value: <string>
      unit: <string>
      notes: <string>
examples:
    - language: <string>
      label: <string>
      code: <string>
topicsReferenced:
    - <string>
errorCodes:
    - code: <string>
      description: <string>
edgeCases:
    - description: <string>
performance:
    - note: <string>
relatedLinks:
    - label: <string>
      url: <string>
schemaLinks:
    - label: <string>
      url: <string>
raw: <string>
```

OTP topic memory entry (YAML fields):

```yaml
kind: otpTopic
topic: <topic>
snapshotFile: <filename>
retrievedAt: <ISO8601>
fields:
    - name: <string>
      type: <string>
      description: <string>
relatedLinks:
    - label: <string>
      url: <string>
schemaLinks:
    - label: <string>
      url: <string>
raw: <string>
```

Minified memory entry adds:

```yaml
minified:
    snapshotFileMin: <filename>
    retainedSections:
        - <heading>
    removedSections:
        - <heading>
```

## Minification Pass

Goal: reduce token/character footprint for downstream synthesis while preserving referential fidelity.

Rules:

- Retain: parameter tables, field/ schema definitions, example code blocks (deduplicate identical ones), rate & error sections, version/deprecation notes.
- Remove: verbose narrative paragraphs > 400 chars unless they introduce unique parameter names not elsewhere captured (heuristic: scan tokens).
- Summarize removed large blocks into bullet list in minified file under `## Removed Summaries` with short abstracts.
- Update memory entry with `retainedSections` (ordered heading list) & `removedSections` (headings removed).

## Concurrency Management

Maintain a queue of pending network fetch tasks. Dequeue up to 3, perform fetches, then proceed with next batch. Between batches optional 250–400ms jitter delay to be respectful.

## Inputs & Operational Modes

| Mode      | Trigger         | Behavior                                                                               |
| --------- | --------------- | -------------------------------------------------------------------------------------- |
| Plan Only | `planOnly=true` | Enumerate targets, report plan, no network or file writes                              |
| Refresh   | `refresh=true`  | Force re-fetch & new snapshot(s) even if duplicates exist                              |
| Minify    | `minify=true`   | Skip fetch; load existing latest snapshots; produce minified variants + memory updates |

If `taskFile` provided: parse its front-matter to extract `sources` & `otpTopics` (merging with explicit inputs, de-duplicate). If after merge none exist and not `minify`, treat as noop (emit summary).

## Tool Usage Mandates

1. Memory pre-check before each URL/topic -> reuse if present & not `refresh`.
2. After network fetch normalization -> store memory.
3. Web search only for unresolved critical data fragments (e.g., missing rate limits) after initial set.
4. Use manage_todo_list to explicitly create and track tasks for fetching sources and handling normalization after each batch. Do not rely on internal execution alone; every fetch and normalization step should be represented as a todo task.
5. Use manage_todo_list to track phases: Plan, FetchSources, FetchOtpTopics, Minify, Summary.

## Failure & Gap Handling

If a source fails (non-2xx or network error) after 2 retries (1s, 2s backoff) record a memory entry marking it missing and include it in the summary.

## Summary Block

Emit (stdout task output) a YAML summary snippet:

```
CONTEXT_MANAGER_SUMMARY:
  executedAt: <ISO8601>
  sourcesProcessed: <n>
  otpTopicsProcessed: <n>
  fetched: <n>
  reused: <n>
  minified: <n>
  failures: [<normalizedUrl or topic>]
  notes: <short>
```

## Prohibited

- Fetching without normalization file creation.
- More than 3 concurrent fetches.
- Modifying `.context-files/` files produced by prior runs (except adding new or minified variants).
- Deleting snapshot history.

## Quick Checklist Before Finish

- Memory entries created/updated for every processed item?
- Snapshot files exist (unless failures)?
- Normalized files are verified to be present and correctly saved, even if files already existed?
- Concurrency respected?
- Minified variants present when requested?
- Summary emitted?

---

End of context manager specification.
