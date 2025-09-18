# Tasks Phase 5: Tool Implementations (Normative)

Objective: Implement MCP tools that expose validated schemas & orchestrate service calls. Tools perform a single boundary validation via Zod, create/propagate correlation IDs, return unified errors/warnings, and are test-first (TDD) per Constitution.

Legend: [ ] Pending | [P] Parallel-safe

| ID | Status | Task | Acceptance Criteria | References |
|----|--------|------|---------------------|------------|
| T052 | [ ] | plan_trip tool `src/tools/planTrip.ts` + Zod input schema in `src/schema/planTripSchema.ts` + register in `src/index.ts` | - Tool validates input using `src/schema/planTripSchema.ts` (Zod .strict()) and rejects unknown keys with `validation-error`; - Invokes routing service via `services/routingService.ts`; - Attaches `realtimeUsed` and `scheduleType` per contract; - Returns `itineraries[]` with `warnings` (never null) and `correlationId` (UUID v4) present; - Unit + contract + schema tests GREEN (see tests list). | contracts/plan_trip.md, docs/routing-api.md |
| T053 | [ ] [P] | find_stops tool `src/tools/findStops.ts` + schema `src/schema/findStopsSchema.ts` | - Validates radius & modes (strict), default radius = 500m if omitted; - Returns sorted stops subset; warnings array present (possibly `truncated-results`). | contracts/find_stops.md |
| T054 | [ ] [P] | get_departures tool `src/tools/getDepartures.ts` + schema `src/schema/getDeparturesSchema.ts` | - Validates stopId and limit (1..50), default limit=10; - Delay/status mapping consistent with contract tests; ordering deterministic; warnings non-null. | contracts/get_departures.md, docs/realtime-apis.md |
| T055 | [ ] [P] | geocode_address tool `src/tools/geocodeAddress.ts` + schema `src/schema/geocodeAddressSchema.ts` | - Validates `text` length and `size` (default 10, hard cap 40); - Sets `truncated=true` when upstream results > size and emits `truncated-results` warning; - No-results → `geocode-no-results` error with correlationId. Unit + contract tests GREEN. | contracts/geocode_address.md |
| T056 | [ ] [P] | reverse_geocode tool `src/tools/reverseGeocode.ts` + schema `src/schema/reverseGeocodeSchema.ts` | - Validates coordinate; languages optional array deduped; ensures fallback includes `en` if not found; - Returns first viable candidate and emits `language-fallback` warning when fallback used; - Unit + contract tests GREEN. | contracts/reverse_geocode.md |
| T057 | [ ] [P] | save_user_variable tool `src/tools/saveUserVariable.ts` + schema `src/schema/userVariableSchema.ts` | - Validates key pattern `^[a-zA-Z0-9_\\-]{1,64}$` and value length ≤ 4096; - Preserves key case (no automatic lowercasing). Deterministic overwrite behavior: return previous summary + `key-overwritten` warning; - Unit + contract tests GREEN. | contracts/user_variables.md |
| T058 | [ ] [P] | get_user_variables tool `src/tools/getUserVariables.ts` + schema `src/schema/getUserVariablesSchema.ts` | - No input fields (strict object or null allowed); - Returns list ordered by `updatedAt` desc; empty list → `[]` not null; - Unit + contract tests GREEN. | contracts/user_variables.md |

## Cross-Cutting Requirements (normative)

1. Test‑First (C1): Every tool MUST have failing Vitest tests before implementation (unit + schema + contract). Tests listed in section "Required tests" below must be added/updated first.
2. Schema Single Source-of-Truth (C14): All runtime validation schemas MUST live under `src/schema/`. Each schema file MUST export:
   - `export const FooSchema = z.object(...).strict()` (or equivalent strict discriminated union)
   - `export type Foo = z.infer<typeof FooSchema>`
3. Single boundary validation (C14): Tools must parse/validate inputs exactly once at the tool boundary (handler). Internal helper functions accept trusted typed input.
4. Unknown-key rejection: Top-level input objects MUST be `.strict()` and any unknown key MUST produce `validation-error` with message `unknown key: <key>`.
5. Warnings array: Every successful tool response MUST include `warnings: Warning[]` (empty array if none).
6. CorrelationId (C6): Every tool invocation MUST attach a `correlationId` (UUID v4). If client supplies one (string), preserve it; otherwise generate new. All responses (success & error) should include the correlationId. Tests MUST assert correlationId presence.
7. Error shape: All errors conform to `{ code, message, hint?, correlationId? }` following Constitution and contracts. Use kebab-case error codes only.
8. Defaults & Caps (deterministic runtime values applied by the handler):
   - find_stops radius default = 500 (m), allowed range (1..5000)
   - plan_trip limit default = 2, allowed 1..3 (contract-enforced)
   - geocode_address size default = 10, hard cap = 40
   - get_departures default limit = 10, allowed 1..50.
9. Deduplication & limit order: Deduplicate itineraries (fingerprint) → insert disruption alternatives (if any) → then apply `limit`.
10. Key normalization decision: Preserve keys exactly as provided (no lowercasing). Documented decision to avoid surprising user-facing changes - revisit in Phase 6 if needed.
11. Correlation ID format decision: Use UUID v4 (canonical) for now; TODO to support configurable generator (nanoid) if needed.
12. Logging hooks: Add TODO comment placeholder near each handler root referencing `src/infrastructure/logging.ts`. Actual logging implementation planned in Phase 6 (observability).
13. Tests required before implementation: List in "Required tests" below.

## Validation flow (normative)

- Each tool MUST:
  1. import its input schema from `src/schema/*` and parse with `Schema.parseAsync(arguments)` or `safeParse`.
  2. map validation errors to `validation-error` with `code` and `message` listing the first failing field and description.
  3. perform enrichment & service calls using typed inputs.
  4. normalize `warnings` and `correlationId` before return.

## Example handler skeleton (doc only)

- Tools should follow the `src/tools/hello.ts` pattern in `src/index.ts` registration: register handler, call `XSchema.parse()`, attach correlationId (if missing), call service, return `{ ...result, warnings: result.warnings ?? [], correlationId }`.

## Unified Error Codes Utilized (Phase 5 Scope)

As in original Phase-5, enforce listed set; mapping unchanged. Retry eligibility remains infra-only.

## Warnings Taxonomy & Deduplication

- Warnings dedupe rule: de-duplicate by `code` (emit code once per response) and preserve emission order (first occurrence wins). Tests must assert dedupe.

## Correlation & Logging Hooks

- Generate `correlationId` UUID v4 when absent. Attach to both success and error responses. Add `TODO: hook into structured logger` comment in each new tool file.

## Example Payloads & Responses (normative)

- `warnings` shown as `[]` when none; `correlationId` present in all responses.

## Testing Strategy (normative / required)

- Unit tests (fast): schema validation success/failure, automatic correlationId generation & preservation, warnings empty array, unknown-key rejection
- Contract tests (tool-level): response shape and mapping to spec/contract (e.g., `plan_trip` contract cases)
- Integration tests (in Phase 6): upstream calls & retry behavior

## Required tests to create/update (Test‑First order)

- For each tool X:
  - tests/schema/X.schema.test.ts (Zod happy path, missing required fields, unknown key rejection)
  - tests/tools/X.contract.test.ts (already in repo for many tools; update expectations to require correlationId + warnings array)
  - tests/tools/X.unit.test.ts (handler-level behaviors: correlationId, warnings dedupe)
- See detailed test list below.

## Acceptance Criteria (normative)

- All new & updated tests GREEN (unit + contract + schema) before Phase 6 work.
- `pnpm build && pnpm test` must pass.
- No ad-hoc validation in tool bodies (schemas must be imported).
- Warnings never null, correlationId present, unknown keys rejected.

## Open Questions / TODOs (now resolved or documented)

- Key normalization: decided to PRESERVE case (documented).
- Correlation ID format: standardized to UUID v4 for Phase 5.

## Constitution Clause Mapping

- Test-First: Clause C1 enforced.
- Schema discipline & single source-of-truth: Clause C14 enforced.
- Unified errors: Clause C6 enforced.
- Observability TODO: Clause C3 noted for Phase 6.
