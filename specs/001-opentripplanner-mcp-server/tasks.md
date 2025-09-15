# Phase 2 Task Breakdown & Execution Plan

Date: 2025-09-15
Branch: 001-opentripplanner-mcp-server

## Phase Overview

Phases map to Implementation Phases provided by user plus constitution quality gates.

| Phase | Objective | Key Outputs |
|-------|-----------|-------------|
| 0 | Research & Decisions | research.md (DONE) |
| 1 | Domain Contracts & Data Model | data-model.md (FINAL) |
| 2 | Task Planning & Execution Map | tasks.md (this), backlog segmentation |
| 3 | Infrastructure Setup | HTTP client, rate limiter, error framework, logging scaffold |
| 4 | Core MCP Tools | plan_trip, find_stops, get_departures, geocode_address, reverse_geocode, save_user_variable, get_user_variables |
| 5 | Advanced Features | Accessibility filtering, disruption handling, deduplication, user variable integration across tools |
| 6 | Integration & Performance | Integration tests, performance tuning, caching, retry telemetry |
| 7 | Documentation & Compliance | quickstart.md, constitution adherence audit, README updates |
| 8 | Hardening | Edge cases, cancellation flow, warnings, resilience checks |

## Workstreams

1. Foundational Infrastructure
2. Tool Implementations
3. Advanced Behavior & Realtime
4. Testing & QA
5. Documentation & Governance

## Detailed Tasks

### 3. Infrastructure Setup

| ID | Task | Description | Acceptance Criteria | Dependencies |
|----|------|-------------|---------------------|--------------|
| INF-001 | HTTP Client Wrapper | Implement fetch wrapper with timeout & Abort support | Unit tests for timeout, retry, header injection | Node fetch / env vars |
| INF-002 | Rate Limiter | Token bucket (capacity 30, refill 10/s) + metrics | Simulated 15 rapid calls only 10 succeed immediate, rest delayed | INF-001 |
| INF-003 | Retry Policy | Exponential jitter backoff (max 5 tries) for 429/5xx | Tests assert delay progression & attempt cap | INF-001 |
| INF-004 | Error Normalization | Map statuses & GraphQL errors to unified codes | All matrix cases mapped with tests | INF-001 |
| INF-005 | Logging Interface | Structured logger abstraction + default console impl | Log object includes required fields in tests | None |
| INF-006 | Correlation ID Utility | UUID generator & propagation | ID present in logs & responses | INF-005 |
| INF-007 | In-Memory Store | User variable session store with TTL (24h inactivity) | Expiration test, isolation test | None |
| INF-008 | Cache Layer | LRU for geocode & itinerary collapse window | Hit/miss metrics, eviction test | INF-001 |

### 4. Core MCP Tools

| ID | Task | Description | Acceptance Criteria | Dependencies |
|----|------|-------------|---------------------|--------------|
| TOOL-001 | plan_trip schema + tests (RED) | Define Zod schema & failing tests | Tests failing initially | INF-* partial |
| TOOL-002 | plan_trip implementation (GREEN) | Build GraphQL query builder & transform | Tests pass, returns standard itinerary | TOOL-001 |
| TOOL-003 | find_stops | Nearest stops via GraphQL `stopsByRadius` or `nearest` | Returns list, truncation logic, tests pass | INF-001, INF-002 |
| TOOL-004 | get_departures | Stop departures transformed to departure model | Schedules w/ realtime status mapping | INF-* |
| TOOL-005 | geocode_address | Forward geocode + pagination/truncation | Proper confidence ordering; max 40 cap noted | INF-001, INF-008 |
| TOOL-006 | reverse_geocode | Reverse geocoding | Top feature selected; tests cover invalid coords | INF-001 |
| TOOL-007 | save_user_variable | Store/overwrite variable | Returns previous summary if overwrite | INF-007 |
| TOOL-008 | get_user_variables | List stored variables | Empty list success & later addition test | INF-007 |

### 5. Advanced Features

| ID | Task | Description | Acceptance Criteria | Dependencies |
|----|------|-------------|---------------------|--------------|
| ADV-001 | Accessibility Filtering | Apply walking distance + transfers constraints; annotate unmet | Flagged itineraries & warnings | TOOL-002 |
| ADV-002 | Realtime Aggregation | Derive scheduleType & dataFreshness | Mixed detection test w/ fixtures | TOOL-002 |
| ADV-003 | Disruption Detection | Detect cancellations/delays > threshold & alt search | Alternate itinerary returned + disruption flag | ADV-002 |
| ADV-004 | Itinerary Deduplication | Fingerprint & remove near duplicates | Duplicate fixture returns unique set | TOOL-002 |
| ADV-005 | Geocode Disambiguation | Fuzzy suggestions on no direct match | Suggestions < =5 with confidence ordering | TOOL-005 |
| ADV-006 | Language Fallback | Implement Accept-Language + fallback chain | Missing translation falls back to fi/en | INF-001 |
| ADV-007 | Cancellation Flow | Introduce long-running cancellation pattern (operation id) | Cancel request test returns cancellation error code | INF-001 |

### 6. Integration & Performance

| ID | Task | Description | Acceptance Criteria | Dependencies |
|----|------|-------------|---------------------|--------------|
| INT-001 | Live API Smoke Tests | Opt-in integration hitting real endpoints | Pass w/ real key (skipped if no key) | TOOL-* |
| INT-002 | Fixture Recording | Capture HTTP fixtures for deterministic tests | Replays succeed offline | INT-001 |
| INT-003 | Performance Baseline | Measure median & p95 timings (mock & live) | Document metrics < targets | INT-001 |
| INT-004 | Rate Limit Stress Test | Simulate >10 rps & verify throttling | Delay distribution validated | INF-002 |
| INT-005 | Error Path Coverage | Simulate 401, 429, 5xx, timeout | All mapped codes; coverage thresholds | INF-004 |

### 7. Documentation & Governance

| ID | Task | Description | Acceptance Criteria | Dependencies |
|----|------|-------------|---------------------|--------------|
| DOC-001 | quickstart.md | Usage examples for each tool | All tool examples compile | TOOL-* |
| DOC-002 | Schema Reference | Auto-generate schema markdown (future) | Document lists all entities | DOC-001 |
| DOC-003 | Constitution Audit | Checklist mapping tasks to clauses | All clauses referenced | All |

### 8. Hardening & QA

| ID | Task | Description | Acceptance Criteria | Dependencies |
|----|------|-------------|---------------------|--------------|
| QA-001 | Fuzz Validation | Random invalid payloads vs schemas | No crashes; structured errors | TOOL-* |
| QA-002 | Soak Test Simulation | 1k sequential trip plans w/ mock upstream | No memory leak growth > threshold | INF-002 |
| QA-003 | Security Scan | ESLint + dependency audit | No high severity unresolved | None |
| QA-004 | Accessibility Pref Edge Cases | Unsupported preference yields warning | Tests pass | ADV-001 |

## Cross-Cutting Acceptance Criteria

- 100% of external requests pass through HTTP wrapper (enforced by central export pattern).
- All tool handlers return within 2s median in mock tests.
- Each tool has: validation tests, success tests, error path tests.
- Coverage: ≥85% lines for new modules; critical logic (rate limiter, retry, itinerary transform) ≥95% branch coverage.

## Definition of Done

A task is considered done when:

1. Failing test written first (if applicable) and then green after implementation.
2. Types compile with `tsc --noEmit`.
3. Lint passes (ESLint + markdown style for docs future pass phase).
4. Integration test added (where mandated by constitution) or explicitly deferred with rationale.
5. Documentation updated if public contract changed.

## Risk-Based Prioritization

1. plan_trip (high complexity & central value)
2. rate limiter & retry (protect reliability)
3. error normalization (consistency foundation)
4. realtime & disruption logic (user trust)
5. geocoding and disambiguation (entry funnel)

## Backlog (Deferred / Future)

- Emissions calculation enrichment (pending policy)
- Persistent storage beyond in-memory (external KV)
- Multi-region dynamic feed expansion
- Streaming partial itinerary results

Status: Final (Phase 2 planning complete; ready for execution)
