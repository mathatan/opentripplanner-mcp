---
description: Fetch & normalize Digitransit / OTP API & schema sources into stable human‑readable YAML snapshots for documentation.
mode: agent
version: 1.2.2
tools:
    - fetch_webpage
    - mcp_context7_resolve-library-id
    - mcp_context7_get-library-docs
    - vscode-websearchforcopilot_webSearch
    - manage_todo_list
    - memory
inputs:
    - name: sources
      description: HTTPS URLs (comma/space separated) to fetch & normalize (deduplicated)
      required: false
    - name: otpTopics
      description: OTP topic/entity names to extract from library docs
      required: false
---

# Digitransit Context Manager Prompt

## Purpose

Authoritative fetch & normalization layer producing deterministic YAML snapshots in `.context-files/` for downstream documentation generation.

## Golden Rules

1. Stable deterministic filenames (no hashes/timestamps) enable runner citations.
2. Always overwrite snapshot if source exists (no conditional refresh flag).
3. Process in batches ≤3: fetch → normalize → validate YAML → write → update memory before next batch.
4. No fabrication or summarization beyond light structural cleanup.
5. Every written file MUST be valid YAML; fix immediately if invalid.
6. Memory keys: `source:<normalizedUrl>`, `otpTopic:<topic>`, `missing:<id>`.
7. Concurrency limit is hard; exceeding it is a quality failure.
8. Summary must reflect real counts (overwritten, new, failed).
9. Downstream citations rely on snapshot filenames—never rename once established (only overwrite same name on refresh).

## Scope

Single purpose: fetch & normalize. Overwrite existing snapshots deterministically.

## Directory & Naming

- Root: `.context-files/`
- Sources: `source--<slug>.yaml`
- OTP topics: `otp-topic--<topic-slug>.yaml`
  Slug rule: hostname + path → lowercase; non-alphanumeric → `-`; collapse repeats; trim edges.
  Existing filename is always overwritten with latest normalized content.

## YAML Validity

Every snapshot and summary snippet must parse as YAML. If invalid: correct immediately before progressing.

```
otp-topic--<topic-slug>.yaml
```

## Attribution

Runner will cite by snapshot filename. Do not introduce alternative aliases.

## Normalization Pipeline

1. Collect targets (sources + otpTopics) de-duplicated.
2. Batch (≤3) fetch each target (existing snapshot will be replaced).
3. Fetch with retries (1s, 2s) else mark `missing:<normalizedUrl>`.
4. Strip chrome (nav, footer, ads); preserve technical specification content verbatim.
5. Build YAML snapshot (schema below) with `snapshotVersion: 1`.
6. Validate YAML parsing; correct if needed.
7. Write snapshot; update/create memory entry.
8. Next batch.

## Snapshot Schema

Core fields (sources & topics as applicable):

- kind (source | otpTopic)
- snapshotVersion: 1
- url (sources) | topic (otpTopic)
- retrievedAt
- parameterCandidates[]
- fields[] (otpTopic only)
- examples[] (language, label, code)
- rateLimits[]
- errorCodes[]
- edgeCases[]
- performance[]
- deprecations[]
- relatedLinks[]
- schemaLinks[]
- raw
  Optional: endpoints[], apiRequirements[], topicsReferenced[], paginationPatterns[], authNotes[], advancedUsage[], additionalDetails (map)

## Memory Entries

Source memory:

```yaml
kind: source
normalizedUrl: <normalized>
snapshotFile: <filename>
retrievedAt: <ISO8601>
snapshotVersion: 1
rateLimits: []
parameterCandidates: []
examples: []
errorCodes: []
edgeCases: []
performance: []
deprecations: []
relatedLinks: []
schemaLinks: []
raw: <string>
```

OTP topic memory similar (replace url with topic, add fields[]).

## Exclusions

Do not summarize or omit technical fields. Preserve examples exactly. Only remove obvious chrome/navigation noise.

## Concurrency

Max active fetches: 3.

## Overwrite Behavior

Snapshots are always refreshed on execution to ensure currency.

## Tool Usage

Priority: memory reuse → fetch_webpage / context7 docs → web search (only if mandatory rate/limit/schema gaps).
Use manage_todo_list for phases & batch progress (one active item).

## Failure & Gaps

After 2 failed retries mark memory `missing:<normalizedUrl>` and list in summary.

## Quality Criteria

InvalidYAML:<file> | MissingSnapshotFile:<id> | ConcurrencyViolation:>3 | MemoryEntryMissing:<key> | NormalizationOmitted:<id> | FabricatedFieldSuspected:<field>

## Summary Block

```yaml
CONTEXT_MANAGER_SUMMARY:
    executedAt: <ISO8601>
    sourcesProcessed: <n>
    otpTopicsProcessed: <n>
    overwritten: <n>
    newSnapshots: <n>
    failed: [<id>]
    unmetQualityCriteria: [<codes>]
    notes: <short>
```

## Style

Neutral, imperative tone; ≤110 char lines; fenced code blocks; single blank line between sections.

## Completion

Done when all intended targets (success/reused/failed) accounted for, snapshots valid & present, memory updated, summary emitted.
