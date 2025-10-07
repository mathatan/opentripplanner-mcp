## Builders catalogue

This section catalogs fixture builders used by lookup tests. Reference: [`tests/fixtures/geocodingResponses.ts`](tests/fixtures/geocodingResponses.ts:1).

- buildFeature(featureOverrides = {}): Canonical feature builder with sensible defaults; returns an upstream-shaped feature suitable for mapping and ordering.
- featureWithGeometry(coords = [lon, lat]): Ensures geometry.coordinates are present in [lon, lat] order; used in coordinate-bearing candidate scenarios.
- featureWithCenter(center = [lon, lat]): Creates a feature with empty geometry but populated center; used to validate center extraction.
- featureNoCoordinate(): Produces a feature lacking both geometry and center for negative-path tests.
- makeConfidenceSet(values = [...]): Produces deterministic confidence arrays used to exercise ordering and clamping behavior.
- makeNameTieSet(count): Produces features with identical confidence to force name-based tie-break scenarios.

## Usage guidelines

- Builders must be pure and deterministic; create fresh instances or clone per test.
- Do not precompute or inject service-derived fields on fixtures (e.g., primaryLanguage, confidenceScore).
- Use propertiesOverride to simulate unusual upstream payload shapes without changing builder signatures.

## Mocking boundary

- Only mock the network boundary: the HTTP client function [`httpGet()`](src/infrastructure/httpClient.ts:1).
- Prefer a queued/spied `httpGet` pattern and helpers in [`tests/utils/httpMock.ts`](tests/utils/httpMock.ts:1).
- Do not mock or stub internal pure utilities such as the comparator or language fallback; test those utilities independently.

## Lifecycle & restore

- Install the httpGet spy/queue in beforeEach and restore in afterEach (or finally).
- Clear queued responses and any mock state between tests to ensure isolation.
- Use one mock instance per test; avoid shared mutable queues across describe blocks.

## Anti-patterns to avoid

- Deep-stubbing of internal utilities (e.g., stubbing `sortLocationsDeterministic`) — brittle and masks logic regressions.
- Mutating shared fixture instances across tests — always rebuild or clone fixtures per spec.
- Precomputing service-derived fields on fixtures; this duplicates service logic and invalidates tests.
- Embedding full upstream arrays in assertions unless explicitly verifying ordering or truncation rules.

## Cross-references

- Fixture implementations: [`tests/fixtures/geocodingResponses.ts`](tests/fixtures/geocodingResponses.ts:1)  
- Mock helpers: [`tests/utils/httpMock.ts`](tests/utils/httpMock.ts:1)