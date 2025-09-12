description: Produce a complete Digitransit documentation artifact from a single task spec (always full execution, local context first).
mode: agent
tools: - manage_todo_list - memory - fetch_webpage - vscode-websearchforcopilot_webSearch - mcp_context7_resolve-library-id - mcp_context7_get-library-docs
inputs: - name: task
description: Single task file path (e.g. tasks/generated/01-routing-api.md)
required: true
version: 1.5.1

---

This prompt performs deterministic end-to-end synthesis. Always finish and emit the artifact.

Tools:

- #manage_todo_list: maintain one active phase; update after each.
- #memory: read existing context; add only `missing:<slug>:<descriptor>` markers.
- #fetch_webpage: fallback fetch only if mandatory section impossible from local data.
- #vscode-websearchforcopilot_webSearch: discover authoritative source when URL unknown.
- #mcp_context7_resolve-library-id then #mcp_context7_get-library-docs: obtain structured library/OTP schema docs when absent locally.

Priority: memory → `.context-files/` snapshots → minimal fetch (context7 / search / webpage) → mark missing.

### Golden Rules

1. Always parse front-matter before any other action; abort if `generate` or `finalArtifact` missing (record quality issues).
2. Strict context priority: (a) memory entries → (b) `.context-files/` snapshots → (c) optional fetch (only if tools available AND required for a mandated section) → (d) mark missing.
3. Never fabricate parameters, fields, versions, defaults, or examples not present in loaded context.
4. Every fact in output must be traceable to a memory key or snapshot filename; cite minimally.
5. Maintain an up-to-date todo list: one active phase; mark complete immediately when done.
6. Missing data MUST produce both a NOTE entry and a `missing:<slug>:<descriptor>` memory key (singular per descriptor).
7. Execute all phases; no early exit.
8. Always emit artifact; use NOTE markers for gaps.
9. Preserve ordering & table schema; no snapshot mutation.

### Context Resolution

1. Memory (`source:*`, `otpTopic:*`).
2. Targeted fetch (context7 / websearch / webpage) if content missing.
3. If nothing can be found mark missing.
   Citation: reference memory key or snapshot filename.

### Core Principles (Compact)

Parse → Load → Gap → Synthesize → Emit → Validate → Summarize → Finalize. No fabrication. Cite everything.

### 1. Required Front-Matter

title, slug, sources (list), otpTopics (list), generate=true, finalArtifact. Optional: version, dependsOn, serial.

### Phases

1 Init (parse/validate)
2 Todos (bootstrap)
3 Context Load
4 Gap Scan
5 Synthesis (sections + NOTE)
6 Emit Artifact
7 Quality Gate
8 Summary Block
9 Finalize

### Scope

Single task per invocation. No batch mode.

### Parameter Table

Columns fixed: Name | Type | Default | Since | Source | Description. Unknown default → —. Deprecated → suffix `(DEPRECATED)`.

### Examples

GraphQL ≥3 (basic / intermediate / advanced). Fields must exist.
Formatting:

- Use fenced ```graphql blocks.
- Include concise `#` comments explaining intent or noteworthy arguments.
- Progressively introduce complexity (pagination, filters, realtime fields if relevant).
- Avoid invented fields; every field must be resolvable from loaded topics.
  MQTT section only if realtime; include topic pattern, sample payload, and field meaning.

### Errors & Edge Cases

Include: Invalid/expired key; Quota/complexity; Empty result; Realtime stale/missing vehicle; Post‑midnight rollover; Unsupported mode.

### Performance & Rate

Include: latency expectations, complexity considerations, pagination pattern (e.g. cursor / offset parameters), caching (ETag / If-Modified-Since if applicable), realtime update frequency (or NOTE if unknown).

### Missing Data

List each unresolved item under NOTE; add memory key if absent.

### Memory Keys

source:<normalizedUrl> | otpTopic:<topic> | search:<query> | missing:<slug>:<descriptor>.

### Quality Criteria

MissingFrontMatterKey:<key> | SectionMissing:<section> | ArtifactMissing | MemoryReferenceMissing:<url> | MemoryExtractionOmission:<url>.

### Summary Block

Insert/replace single `EXECUTION_SUMMARY` YAML block with execution metadata (time, counts, criteria, notes).

### Artifact Layout

Front-matter: title, slug, version, generatedAt, sourcesReferenced, otpTopicsReferenced.
Sections: Overview | Parameters | Examples | Errors & Edge Cases | Performance & Rate | Glossary Seeds | NOTE: MISSING DATA.

### Style & Formatting

- Tone: neutral, instructional, concise; avoid marketing language.
- Voice: second-person imperative for guidance ("Use", "Provide").
- Line width guideline: keep lines <= 110 characters where practical.
- Collapse excessive blank lines; single blank line between sections.
- All code examples fenced with proper language (graphql, json, mqtt if needed).

### Glossary Seeds

Provide seed terms to expand later. Format as bullet list: `Term: short definition` (one line each). Only include terms actually referenced in this artifact.

### Completion

When summary block written & artifact present with required sections (or NOTE markers) task is complete.

End of prompt.

```

```
