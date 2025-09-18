import { describe, it, expect } from 'vitest';
import { planTrip } from '../../src/tools/planTrip';

// Tests that duplicate warning codes are deduped by response
describe('tests/tools/warnings.dedupe.test.ts', () => {
  it('dedupes warnings by code preserving first occurrence', async () => {
    const args = {
      from: { lat: 60.1699, lon: 24.9384 },
      to: { lat: 60.2055, lon: 24.6559 },
    } as any;
    const res = await planTrip.handler(args) as any;
    expect(Array.isArray(res.warnings)).toBe(true);
    // If implementation emits duplicates this test will fail; intended for Test-First
    const codes = res.warnings.map((w: any) => w.code);
    const unique = Array.from(new Set(codes));
    expect(unique.length).toBe(codes.length);
  });
});