import { describe, it, expect } from 'vitest';
import { PlanTripSchema } from '../../src/schema/planTripSchema';

describe('tests/schema/planTrip.schema.test.ts', () => {
  it('parses a minimal happy path', () => {
    const input = {
      from: { lat: 60.1699, lon: 24.9384 },
      to: { lat: 60.2055, lon: 24.6559 },
      time: '2025-09-18T08:00:00Z',
    };
    // If the schema is not implemented yet this will throw at import time or fail
    const res = PlanTripSchema.safeParse(input);
    expect(res.success).toBe(true);
  });

  it('rejects when origin and destination are identical', () => {
    const input = {
      from: { lat: 60.1699, lon: 24.9384 },
      to: { lat: 60.1699, lon: 24.9384 },
      time: '2025-09-18T08:00:00Z',
    };
    const res = PlanTripSchema.safeParse(input);
    // Expect schema to fail semantic rule (from==to) per Test-First spec
    expect(res.success).toBe(false);
  });

  it('rejects unknown top-level keys (strict schema)', () => {
    const input = {
      from: { lat: 60.1699, lon: 24.9384 },
      to: { lat: 60.2055, lon: 24.6559 },
      time: '2025-09-18T08:00:00Z',
      unexpected: 'value',
    } as any;
    const res = PlanTripSchema.safeParse(input);
    expect(res.success).toBe(false);
    if (!res.success) {
      // Ensure error mentions unknown key when available
      const messages = res.error.errors.map(e => e.message).join(' | ');
      expect(messages.length).toBeGreaterThan(0);
    }
  });
});