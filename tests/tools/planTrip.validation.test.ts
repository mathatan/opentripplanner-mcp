import { describe, it, expect } from 'vitest';
import { planTrip } from '../../src/tools/planTrip';

// Lightweight stub/mock of routing service could be used by test when implemented.
// For Test-First, assert correlationId behavior and warnings presence.
describe('tests/tools/planTrip.validation.test.ts', () => {
  it('generates a correlationId if none provided', async () => {
    const args = {
      from: { lat: 60.1699, lon: 24.9384 },
      to: { lat: 60.2055, lon: 24.6559 },
    };
    // Handler may not exist yet; this test asserts intended behavior when implemented
    const res = await planTrip.handler(args) as any;
    expect(typeof res.correlationId).toBe('string');
  });

  it('preserves provided correlationId', async () => {
    const args = {
      from: { lat: 60.1699, lon: 24.9384 },
      to: { lat: 60.2055, lon: 24.6559 },
      correlationId: 'test-cid-123',
    };
    const res = await planTrip.handler(args) as any;
    expect(res.correlationId).toBe('test-cid-123');
  });

  it('always returns a warnings array (never null)', async () => {
    const args = {
      from: { lat: 60.1699, lon: 24.9384 },
      to: { lat: 60.2055, lon: 24.6559 },
    };
    const res = await planTrip.handler(args) as any;
    expect(Array.isArray(res.warnings)).toBe(true);
  });
});