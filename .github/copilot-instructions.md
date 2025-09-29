# Copilot Instructions (Concise)

Refer to `.specify/memory/constitution.md` for full principles. This file is the minimal operational subset.

## 1. Essentials

- Stack: TypeScript Node.js. Source in `src/`. Legacy JS in `build/` (read-only; no new code or tests there).
- Entry: `src/index.ts`.
- Tests (when warranted): `tests/` using Vitest. Legacy `build/index.test.js` untouched.
- Package manager: pnpm only.

## 2. Core Principles (Condensed)

Implementation velocity > abstraction. Add docs with code. Tests only when contract stable, brittle logic, or critical transformation. Keep modules small, delete dead code. Add gates (tests/lint/perf) only for explicit risk.

## 3. Workflow (Follow in Order)

1. Ensure/ add minimal doc or spec snippet for the change (`docs/` or `specs/`).
2. Implement smallest vertical slice in `src/`.
3. Update / add example or research snapshot if behavior new.
4. Manually validate via Node or minimal script.
5. Add targeted tests ONLY if triggers met.
6. Refactor for clarity (no behavior drift) & keep docs in sync.

## 4. Test Triggers

Write/expand tests only if:

1. External contract shape stabilized.
2. Prior or likely brittle branching (defect or complex logic).
3. Critical data transformation (core correctness risk).
   If deferred: add TODO with concrete trigger (e.g., stabilization across 2 releases).

## 5. Assistant Rules

- Always check for (or propose) doc snippet before generating sizeable new code.
- Default answer: minimal working code + pointer to where doc must live.
- Challenge: unused abstraction, generic layers, config flags without active use, premature caching/concurrency.
- Prefer explicit types over speculative factories. No new source in `build/`.
- If user asks for broad test suite without triggers: remind of triggers, offer focused example instead.

## 6. Minimal Patterns

- File placement: new logic → `src/`; tests → `tests/`.
- Avoid snapshot tests until schema stable.
- Keep error handling lean; no taxonomy unless multiple concrete callers need it.

## 6a. Type Safety & Schemas

- Always define explicit TypeScript interfaces/types for exported surfaces (no `any`, avoid implicit `unknown` leaks).
- Derive Types from Zod: prefer `type Foo = z.infer<typeof fooSchema>` so runtime validation & compile-time types stay in sync.
- Zod Usage: each tool/resource input MUST have a Zod schema; describe fields (`.describe()`) for clarity.
- Reuse schemas: single definition per logical entity; factor shared primitives (e.g., `coordinateSchema`) instead of ad-hoc duplicates.
- Narrow early: parse/validate at module boundaries; internal code should assume validated types—no redundant re-parse.
- If adding a schema without immediate usage, justify (likely YAGNI—delay instead).
- Prefer explicit discriminated unions for variant shapes rather than `| string` loosely combined types without validation.

## 6b. ESLint Enforcement

- Treat ESLint errors as must-fix before merging; warnings should be addressed or suppressed with rationale.
- Do not add broad `eslint-disable` blocks; scope disables to a single line with comment explaining necessity.
- When suggesting code, ensure it passes existing lint rules (no unused vars, prefer const, etc.). If a rule conflicts with Constitution velocity, flag it for targeted adjustment rather than blanket disable.

## 7. Quick Commands

```sh
pnpm install   # deps
pnpm dev       # dev server (nodemon)
pnpm test      # run tests (if any)
pnpm lint      # lint
pnpm build     # compile
```

## 8. Response Heuristic

For feature request: confirm doc → propose doc stub (if missing) → supply minimal implementation sketch → mention test deferral status.
For refactor: assert behavior unchanged & docs remain valid.
For test request (premature): restate triggers & offer TODO pattern.

## 9. Conflict Handling

If this file and Constitution disagree, Constitution wins—propose patch here.

---

Compact by design; expand only if a recurring ambiguity emerges.
