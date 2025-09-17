# Copilot Onboarding Instructions (opentripplanner-mcp)

Purpose: Enable an AI coding agent to modify, extend, and validate this repository quickly without exploratory trial‑and‑error. TRUST THESE INSTRUCTIONS first; search the tree only if something here is missing or inconsistent.

---

## 1. Repository Summary

Model Context Protocol (MCP) server scaffold for an upcoming multimodal public transit planning toolkit (Digitransit / OpenTripPlanner). Current implementation only exposes a demo `hello` tool; specs & contracts for the real tools (trip planning, geocoding, stops, departures, user variables) live under `specs/001-opentripplanner-mcp-server/` and will drive future code generation. Tech stack: Node.js (ESM) + TypeScript, pnpm, Vitest, Zod, MCP SDK.

Repo size: small (<200 source lines presently). All production TypeScript is in `src/`. Build output emitted to `build/`. Tests in `tests/` (unit + minimal e2e over stdio framing). No external services are currently called in code; future additions will integrate Digitransit APIs (see docs/ + specs/).

---

## 2. Key Paths & Files

Core code: `src/index.ts` (creates `McpServer`, registers `hello` tool, stdio transport).
Tests: `tests/index.test.ts` (unit) and `tests/index.e2e.test.ts` (spawns built artifact and does MCP handshake + tool call).
Configs: `tsconfig.json`, `eslint.config.js`, `vitest.config.ts`, `nodemon.json`.
Specs & future contracts: `specs/001-opentripplanner-mcp-server/` (authoritative for upcoming tools).
Docs: `docs/` (routing/geocoding/realtime references).
Tasks planning: `tasks/` (auto-generated API reference fragments).
Executable entry after build: `build/index.js` (also wired as `hello-world` binary in `package.json`).

Do NOT place new handwritten code in `build/`; always edit `src/` then rebuild.

---

## 3. Build & Validation Pipeline (Authoritative Command Order)

Always use pnpm 10.15.1 (declared in `packageManager`). Node ≥18 (ESM). All commands assume repo root.

Bootstrap (ALWAYS run before any build/test):

1. `pnpm install` (installs dev + prod deps). No postinstall scripts. Idempotent.

Incremental development: 2. (Optional) `pnpm dev` – nodemon + tsx runs `src/index.ts` with autoreload.

Full build (type-check + emit JS): 3. `pnpm build` – runs `tsc` using `tsconfig.json` (strict mode). Outputs JS to `build/`. Fails on type errors. No emitted declaration files (not configured). Must succeed before publishing / e2e tests (the e2e test spawns `build/index.js`).

Lint (ESLint + TypeScript plugin): 4. `pnpm lint` – targets `src/`. Warnings allowed (e.g., unused vars). Treat any error as gate failure; fix before PR.

Tests (Vitest run mode): 5. `pnpm test` – executes all `tests/**/*.test.ts`. Sequence requirements:

- Must run AFTER a successful `pnpm build` (because the e2e test launches compiled `build/index.js`). If you forget to build, e2e may fail (outdated code) or pass against stale JS. Best practice: run `pnpm build && pnpm test` for CI tasks.
- Output (as of current state): 2 test files, both pass (<1s total).

Single-shot run (build + execute): 6. `pnpm run` – script that performs `pnpm build` then `node build/index.js` (stdout prints readiness message).

Formatting (optional but recommended before commit): 7. `pnpm format` – Prettier over `src/`.

Publishing (future readiness): 8. `pnpm prepublishOnly` triggers an automatic build (same as step 3). Ensure lint + test already clean first; prepublish does NOT run tests.

Command Timing (approx local): build <2s, tests <1s. No long-running tasks currently.

If a command fails:

- Missing deps → you likely skipped step 1.
- E2E handshake stall → ensure you built (step 3) and that Node >=18.
- Type errors → fix `src/` TS; never patch built JS.

---

## 4. Quality / Merge Gates (Follow in PRs)

Required sequence before opening / updating PR:

1. `pnpm install` (only needed once or after lock changes)
2. `pnpm build`
3. `pnpm lint`
4. `pnpm test` (after build)

All must pass. Add new tests for any new exported behavior (future real tools must follow Test‑First). Keep coverage high (policy for future transit tools: infra ≥95% branches, overall ≥85%).

---

## 5. Architectural Overview (Current vs Future)

Current: Minimal MCP server with a single tool.
Future (per spec): layered modules: `schema/` (Zod), `tools/` (MCP handlers), `services/` (routing/geocode/departures adapters), `infrastructure/` (HTTP wrapper, rate limiter, retry, logging, correlation IDs), `store/` (in‑memory user variable TTL), `util/` (fingerprint, language fallback). All outbound network calls will funnel through a single HTTP client with token bucket + exponential backoff. Unified error & warning taxonomy.

Relevance for new code today: Prepare file structure consistent with spec; do not scatter ad‑hoc helpers—anticipate these directories.

---

## 6. Testing Patterns

Unit tests: fast logic or handler tests (e.g., transform / validation) placed in `tests/`.
E2E pattern: spawn compiled server using stdio protocol; interact via JSON lines (see `tests/index.e2e.test.ts` for handshake + tool invocation). Replicate its structure when adding new tools (register tool → extend e2e test to call it). Always rebuild before running e2e. Avoid adding sleeps > needed handshake (current wait 500ms). Prefer deterministic readiness signal in future (e.g., explicit log token).

When adding a tool:

1. Write failing unit test (schema + handler expectation).
2. Implement schema & handler in `src/tools/<Name>.ts` (create folder).
3. Register tool in `src/index.ts` (or future central registry).
4. Add e2e test calling new tool through stdio (after build).
5. Run build + tests sequence.

---

## 7. Lint & Style

ESLint config (`eslint.config.js`) uses recommended JS + TS rules. Key rules: `@typescript-eslint/no-unused-vars` = warn. No enforced formatting via ESLint; rely on Prettier (`pnpm format`). Keep imports ESM; type-only imports allowed. Use camelCase internally; future schemas expose camelCase fields.

---

## 8. Environment & Secrets

Current code does NOT require an API key. Future transit tooling will require `DIGITRANSIT_API_KEY` (named `DIGITRANSIT_SUBSCRIPTION_KEY` in README example—standardize on one env var when implementing). Until implemented, avoid adding env-based conditional logic that would break existing tests.

---

## 9. Common Pitfalls & Avoidance

Pitfall: Running tests before build → e2e test may execute stale binary. Fix: always `pnpm build` first.
Pitfall: Modifying files in `build/` directly → changes lost on next compile. Fix: only edit `src/`.
Pitfall: Introducing a new dependency with npm/yarn. Fix: ALWAYS use pnpm; lockfile is `pnpm-lock.yaml`.
Pitfall: Forgetting to export new tool handler or mismatching schema. Fix: mirror `hello` tool pattern; validate with a unit test.
Pitfall (future): Calling Digitransit directly in multiple places. Fix: funnel via one HTTP client module.

---

## 10. Planned Domain (For Forward Compatibility)

Upcoming tools (see specs): `plan_trip`, `find_stops`, `get_departures`, `geocode_address`, `reverse_geocode`, `save_user_variable`, `get_user_variables`. They share: Zod validation, structured `{ code, message, hint?, correlationId? }` errors, warning list, realtime & dataFreshness semantics, itinerary dedup (fingerprint), rate limit + retry wrappers.

Do not invent divergent shapes—reuse spec definitions. If a spec gap appears, document inline TODO referencing spec section.

---

## 11. File / Directory Snapshot (Current Root)

Root files: `package.json`, `pnpm-lock.yaml`, `README.md`, `LICENSE`, `eslint.config.js`, `tsconfig.json`, `vitest.config.ts`, `nodemon.json`.
Dirs: `src/` (index.ts), `build/` (compiled JS after build), `tests/` (unit+e2e), `docs/` (API reference), `specs/` (feature + contract docs), `tasks/` (generated docs).
Main entry snippet (from `src/index.ts`): creates `McpServer`, registers `hello` tool using zod schema, connects via stdio.

---

## 12. How the Agent Should Operate

ALWAYS follow this order for any non-trivial change: install (if needed) → build → lint → test. Only search the repository if information you need is absent or contradicted here. Before adding transit tools, read spec markdown under `specs/001-opentripplanner-mcp-server/` and mirror contract fields exactly. Never edit compiled output. Prefer small, isolated PRs: one tool or infra component per change with accompanying tests.

If you change public schema / tool contract: update specs + bump version (SemVer). If adding external HTTP calls: create shared HTTP module first, integrate token bucket & retry there, then call from tools.

---

## 13. Quick Command Cheat Sheet (Copy/Paste)

Bootstrap: `pnpm install`
Build (must precede tests): `pnpm build`
Lint: `pnpm lint`
Unit + E2E tests: `pnpm test`
Dev server (hot reload): `pnpm dev`
Format: `pnpm format`
Run compiled binary: `node build/index.js`
Combined build+run: `pnpm run`

---

## 14. Trust Contract

These instructions are the authoritative guide. Only perform grep / exploratory searches if:

1. A command here fails unexpectedly after re-running bootstrap, OR
2. You are implementing a future tool and need a field not specified in specs.

Otherwise, rely on this document to minimize wasted cycles.

---

## 15. Constitution Clauses (Mandatory)

Apply WITHOUT deviation; cite clause numbers (e.g., C1, C2) in PR descriptions you touch.

1 (Test-First). Start every new feature/tool/infra module with failing Vitest tests (RED) before implementation (GREEN → refactor). No production logic first.
2 (Integration Triggers). Add/update e2e tests on: new tool, upstream Digitransit/OTP shape change, realtime logic change, shared schema/error taxonomy change, public contract version bump.
3 (Observability – future). Each tool invocation (once logging infra added) must log: tool, correlationId, durationMs, success, errorCode?, retries, upstreamCallCount, rateLimitTokensRemaining. Each outbound HTTP must log: method, endpoint (hashed if sensitive), status, durationMs, attempt, cacheHit, retryFlag.
4 (Realtime Freshness – future). Treat realtime as stale if last update >30s; outputs must mark schedule type (realtime|mixed|scheduled) and include dataFreshness timestamp.
5 (Rate Limit & Retry). Token bucket: capacity 30, refill 10/s. Retry (max 5, exponential jitter) on 429/5xx/network only. Do NOT retry validation, unsupported-region, geocode-no-results.
6 (Unified Errors). All failures: `{ code, message, hint?, correlationId?, retryAfter? }` using kebab-case codes; redact raw provider messages >200 chars. Extend code list only with tests + spec update.
7 (Versioning). Any breaking schema/tool change → SemVer major + migration note + spec + update this file; track upstream schema version if changed.
8 (Performance). Current hello <1s. Future `plan_trip`: median <2s, p95 <5s; document deviations.
9 (Duplicate Suppression – future routing). Use itinerary fingerprint (mode|line|from|to sequence + time bucket) to drop duplicates (<2 min offset).
10 (Governance). PR descriptions list touched clauses (e.g., C1, C5). Amendments require simultaneous constitution + version + this file update.
11 (Coverage Targets – post transit). Critical infra (rate limiter, retry, itinerary transform) ≥95% branch; overall ≥85% lines or justify.
12 (Security & Privacy). No PII; persist only ephemeral in-memory user variables (24h inactivity TTL) until persistence task approved.
13 (Search Discipline). Avoid broad searches unless data missing/contradictory; fix docs instead of ad-hoc divergence.
14 (TypeScript & Schema Discipline). All runtime validation originates from Zod schemas in `src/schema`; types for tools/services MUST be derived via `z.infer`. No `any` or implicit `any`; `tsconfig` strict settings are authoritative. Discriminated unions must be exhaustive (enable `never` checking); avoid duplicative manual validation. Tool inputs/outputs validated exactly once at boundary, internal logic operates on inferred types. Adding/changing a schema requires: failing test first (C1), spec/contract update if public, version bump if breaking (C7), and regeneration of any dependent tests. Prefer `type` aliases over `interface` unless declaration merging intentionally required. Do not export partially applied schemas—export full `const XSchema` + `export type X = z.infer<typeof XSchema>` pattern.

Conflict Rule: If a previous section conflicts with clauses here, this section prevails. Keep edits concise to preserve brevity.

---

End of onboarding instructions.
