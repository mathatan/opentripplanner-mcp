## Purpose & scope

This document summarizes the testing strategy for the lookup service and orients contributors to the focused, deterministic unit and utility tests that validate public service behaviour. Aim for small, single-purpose scenarios that exercise mapping, ordering, filtering, and error mapping while keeping external interactions mocked.

## Architectural underpinnings

- Determinism is central: comparator-driven ordering, explicit confidence thresholds, and stable lexical fallbacks ensure repeatable results.
- Primary ordering keys: confidence → language preference → coordinates tie-break → name lexical fallback.
- Service surface under test: public outputs of [`src/services/lookupService.ts`](src/services/lookupService.ts:1); utilities (sorting, language fallback) are tested separately.

## Test taxonomy

- Unit: service behavior with upstream HTTP mocked.
- Utility: pure comparator and language fallback tests.
- Boundary: confidence and distance thresholds.
- Negative/defensive: malformed geometry, missing coordinates, upstream error mapping.

## Determinism & idempotence

- Always reset and isolate mocks; run stress checks by shuffling fixtures and asserting stable ordering.
- Add determinism tests when introducing new ranking keys, Unicode normalization, or probabilistic scoring.

## Coverage strategy

- Prioritize user-visible behaviour and branching logic.
- Run local coverage: pnpm test -- --coverage.
- Accept light coverage gaps for trivial upstream payload shapes; document such trade-offs in PR descriptions.

## Maintenance guidelines

- Keep builders pure and deterministic; update tests and docs together when changing builder signatures.
- Prefer small, atomic scenarios; avoid large fixtures that duplicate service-derived fields.

## Activation triggers

- Add tests when changing error mappings, ranking dimensions, or language fallback order.

## Links

- Scenarios catalog: [scenarios.md](docs/testing/lookup/scenarios.md:1)
- Fixtures & mocking: [fixtures-and-mocking.md](docs/testing/lookup/fixtures-and-mocking.md:1)