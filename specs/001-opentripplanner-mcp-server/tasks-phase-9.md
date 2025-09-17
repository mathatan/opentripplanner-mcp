# Phase 9: Hardening & Polish

Status: NOT STARTED

## Goals

Elevate reliability, security posture, and maintainability through fuzzing, soak, security/dependency audit scaffolding, coverage enforcement, duplication cleanup, and structured manual exploratory scenarios. Finalize semantic version bump and produce a CHANGELOG entry encapsulating the delivered feature set.

## Task List

| ID  | P? | Task | File / Path | Notes |
|-----|----|------|-------------|-------|
| T078 |  | Add fuzz validation test suite | `tests/fuzz/validationFuzz.test.ts` | Random invalid inputs yield `validation-error`, never crash. |
| T079 | P | Add soak test (1k sequential plan_trip) | `tests/soak/planTripSoak.test.ts` | Detect memory growth; measure avg latency drift. |
| T080 | P | Security/dependency audit test | `tests/security/audit.test.ts` | Executes `pnpm audit`; skip if offline/env var set. |
| T081 | P | Coverage threshold enforcement | `package.json` + config | Vitest thresholds lines/branches; failing gate breaks CI. |
| T082 | P | Refactor constants duplication | `src/constants.ts` | Extract shared numeric/string literals (rate limits, retry). |
| T083 | P | Manual exploratory scenarios doc | `docs/manual-test-scenarios.md` | Scripted prompts + expected high-level outcomes. |
| T084 | P | Ensure all tool error paths add correlationId & warnings propagate | spot updates tests/* | Add assertions; backfill missing fields if implemented. |
| T085 |  | Version bump + CHANGELOG | `package.json`, `CHANGELOG.md` | Set version 0.1.0 & summarize features + constraints. |

Legend: P = Parallelizable.

## Fuzz Testing Strategy (T078)

Scope: Input schemas for all tools.
Approach: Property-style generation (hand-rolled) using arrays of edge-case primitives ("", very long strings, extreme numbers, NaN if coerced, objects with extra keys, nulls) combined into payload permutations.
Success Criteria: Each invalid variant → rejected with structured `{ code: 'validation-error' }`; no thrown uncaught exceptions.
Out-of-Scope: Performance fuzz (addressed by soak) and upstream network mutation.

### Fuzz Harness Design

1. Enumerate tool schemas (import Zod definitions).
2. Define mutation operators: remove required field, add extra field, wrong type, boundary exceed.
3. Generate cases (target ~200 per tool).
4. Run sequentially (avoid overwhelming test runtime) and aggregate distinct failure codes (expect only `validation-error`).
5. Track coverage lines touched (ensure core validation branches executed).

## Soak Test Strategy (T079)

Parameters: 1000 sequential `plan_trip` invocations with deterministic mocked upstream itinerary.
Metrics Captured: memory RSS snapshot every 100 calls, average latency per 100-call window.
Fail Conditions: RSS growth > 15% after stabilization (first 200 warmup) OR average latency drift > 2x baseline window.
Implementation: Use manual GC hint (if Node flags allow) only for diagnostic logging, not as mitigation.

## Security / Dependency Audit (T080)

Wrapper test executes `pnpm audit --json` (or programmatic API) and:

- If network unavailable or AUDIT_SKIP env var set → skip with warning.
- Fails only on high/critical advisories (medium tolerated initial version).

Parse JSON, list findings in test output for transparency.

## Coverage Gate (T081)

Add Vitest config thresholds (e.g., lines >= 80%, branches >= 70% initial).
Update `package.json` script: `test:coverage` running `vitest run --coverage` and a small script asserting thresholds (if not native).
Future Raise: Document plan to raise to Constitution targets (C11) once core advanced realtime implemented.

## Constants Refactor (T082)

Create `src/constants.ts` exporting:

- RATE_LIMIT_CAPACITY = 30
- RATE_LIMIT_REFILL_PER_SECOND = 10
- RETRY_MAX_ATTEMPTS = 5
- RETRY_BASE_DELAY_MS = 100 (if used)
- CACHE_COLLAPSE_WINDOW_MS = 500
- MESSAGE_MAX_LEN = 200

Use type assertions to ensure numeric literals not accidentally changed; update imports in infra modules & tests (non-behavioral change, ensure GREEN).

## Manual Exploratory Scenarios (T083)

Document scenario table:

| Scenario | Steps | Expected Outcome | Notes |
|----------|-------|------------------|-------|
| Multi-leg trip | plan_trip with mixed modes | Returns multiple legs merged logically | Validate ordering |
| No itineraries | plan_trip with impossible path | Empty itineraries array + maybe warning | No error |
| Geocode truncation | geocode_address size=1 on multi results | Only first result returned | Order preserved |
| Variable overwrite | save_user_variable same key twice | Last value wins; updatedAt increases | No duplicates |
| Near rate limit | Burst > capacity then steady | Some delayed or structured rate limit handling | No silent drops |
| Retry recovering | Simulated 500→503→200 | Final success after retries | Attempt count logged |
| Cache collapse | Identical concurrent routing calls | Single upstream call shared | Same object ref (if design) |
| Departures all cancelled | get_departures with all cancelled | status=cancelled per item | No delay mislabel |

## Error Path Consistency (T084)

Audit each tool handler ensuring: correlationId (if implemented) always present in error responses; warnings array not silently suppressed (if generated). Add targeted tests verifying sample error injection for each tool.

## Version Bump & Changelog (T085)

`CHANGELOG.md` structure:

```markdown
## [0.1.0] - YYYY-MM-DD
### Added
- Initial MCP server with tools: plan_trip, geocode_address, reverse_geocode, find_stops, get_departures, save_user_variable, get_user_variables.
- Unified error taxonomy & validation via Zod.
- Rate limiting, retry policy, caching, request collapsing.

### Documentation
- Comprehensive schema reference, constitution audit, quickstart usage examples.

### Testing
- Unit + E2E + integration + performance + fuzz + soak foundations.
```

Follow Keep a Changelog conventions; compare prior unreleased section if exists.

## Acceptance Criteria

- Fuzz suite passes, producing only validation-error outcomes—no crashes.
- Soak test shows stable memory and latency within thresholds.
- Audit test either passes or is properly skipped; no unhandled promise rejections.
- Coverage gates enforced and failing locally if thresholds unmet.
- No duplicated literal values remain (grep for numeric constants replaced).
- Manual scenarios document committed and readable (table renders; no lint issues).
- Version updated to 0.1.0 with accurate date; CHANGELOG entry complete.

### Per-Task Success Details

| Task | Additional Acceptance Detail |
|------|-------------------------------|
| T078 | Generates ≥150 mutated cases per tool; failure summary lists distinct invalid pattern types; reproducible seed logged. |
| T079 | Memory RSS variance reported; log includes baseline & final MB values; iteration count configurable via env var. |
| T080 | High/Critical advisories enumerated; test skipped with SKIP tag if offline; warnings printed for moderate issues. |
| T081 | Thresholds cause intentional failure when artificially lowered (manual spot test). |
| T082 | All replaced constants removed from infra files (grep shows zero matches of old literals except in constants file/tests verifying value). |
| T083 | At least 8 scenarios documented with clear expected outcomes; cross-referenced by Phase 7 tests where applicable. |
| T084 | Each tool has at least one forced error test asserting correlationId (if implemented) & warnings pass-through. |
| T085 | CHANGELOG uses Keep a Changelog format & includes comparison links placeholder. |

### Threat Model (Initial Snapshot)

| Asset | Potential Threat | Current Mitigation | Future Action |
|-------|------------------|--------------------|---------------|
| MCP stdio channel | Malformed JSON frames | Zod validation & try/catch boundary | Add per-frame size limit |
| User variable store | Memory exhaustion via large values | (Planned) size limit per value (TBD) | Implement limit & eviction policy |
| External HTTP calls | Retry amplification / thundering herd | Token bucket rate limiter | Add jitter & circuit breaker (future) |
| Error messages | Leakage of provider internals | Truncation to 200 chars | Redaction patterns tests |

### Additional Security & Compliance Tasks (Future / Optional)

- License audit: produce SPDX summary (script placeholder).
- SAST placeholder: integrate `semgrep` or `eslint-plugin-security` rule set.
- Dependency update policy: document monthly review cadence in decision log.

### Fuzz Seeding & Repro

Provide environment variable `FUZZ_SEED`. If present, deterministic RNG sequence reproduces failing case. On first failure, log minimal JSON reproducer that developers can paste into a focused unit test.

### Parameterization & Env Vars

| Variable | Purpose | Default |
|----------|---------|---------|
| SOAK_ITERATIONS | Override default soak loop count | 1000 |
| SOAK_WARMUP | Warmup iterations excluded from drift calc | 200 |
| FUZZ_MAX_CASES | Cap total fuzz cases per tool | 200 |
| FUZZ_SEED | Deterministic seed for fuzz harness | random |

### Open Questions

| Topic | Question | Proposed Handling |
|-------|----------|-------------------|
| correlationId ready by Phase 9? | Might slip to Phase 10 | Mark partial in audit if absent |
| Memory measurement accuracy | Node RSS variance on CI machines | Use relative % thresholds vs absolute MB |
| Changelog link strategy | Use GitHub compare links? | Add placeholder; fill post-merge |
| License scanning tooling | Which scanner to adopt? | Evaluate `license-checker` in Phase 10 |

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Fuzz test runtime too long | Limit cases per tool & early exit on stable code path repetition. |
| Soak test flakiness in CI | Allow optional reduced iteration via env var (e.g., SOAK_ITERATIONS). |
| Audit network instability | Skip gracefully with explicit message tagging. |
| Coverage thresholds block progress prematurely | Start conservative, raise later (document plan). |

## Constitution Clause Mapping

| Clause | Coverage in Phase 9 |
|--------|---------------------|
| C1 | Tests (fuzz, soak) precede fixes if failures appear. |
| C5 | Constants reflect limiter/retry parameters centrally. |
| C6 | Error path audit ensures structured outputs. |
| C7 | Version bump + changelog. |
| C11 | Coverage gating step groundwork. |
| C12 | No PII; user variables only ephemeral. |
| C13 | Structured placement of new test categories. |
| C14 | Validation remains schema-driven in fuzz harness. |

## Next Steps After Phase 9

Prepare for potential Phase 10 (not in current scope): Production readiness (observability wiring, realtime data freshness SLA enforcement, external API key integration) if roadmap requires.
