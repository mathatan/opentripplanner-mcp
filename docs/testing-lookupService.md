## Summary

This file is an index and deprecation notice for the previous monolithic testing guidance for the lookup service. The detailed narrative has been moved to modular documents under docs/testing/lookup/.

## High-level intent

Provide concise, actionable guidance for writing deterministic unit and utility tests that validate the public contract of [`src/services/lookupService.ts`](src/services/lookupService.ts:1). Focus areas: mapping, ordering, filtering, error mapping, fixtures, and mocking discipline.

## Modular docs (click to open)

- [`overview.md`](docs/testing/lookup/overview.md:1) — Purpose, architecture, taxonomy, determinism, coverage, maintenance.
- [`scenarios.md`](docs/testing/lookup/scenarios.md:1) — Compact catalog of implemented scenarios (S01..S22).
- [`fixtures-and-mocking.md`](docs/testing/lookup/fixtures-and-mocking.md:1) — Builders, mocking boundary, lifecycle, anti‑patterns.

## Minimal onboarding checklist

1. Run tests locally: pnpm test -- --run or pnpm vitest.
2. To add a scenario: pick builder from [`fixtures-and-mocking.md`](docs/testing/lookup/fixtures-and-mocking.md:1), queue an `httpGet` mock, assert minimal invariants in [`tests/services/lookupService.test.ts`](tests/services/lookupService.test.ts:1).
3. Verify coverage: pnpm test -- --coverage and document changes in PR.
4. Submit PR referencing affected scenarios and the modular docs.

## References

- Test suites: [`tests/services/lookupService.test.ts`](tests/services/lookupService.test.ts:1)
- Fixtures: [`tests/fixtures/geocodingResponses.ts`](tests/fixtures/geocodingResponses.ts:1)
