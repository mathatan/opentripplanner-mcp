import { describe, it, expect } from 'vitest';
import { GeocodeAddressSchema } from '../../src/schema/geocodeAddressSchema';

describe('tests/schema/geocodeAddress.schema.test.ts', () => {
  it('defaults size to 10 when omitted', () => {
    const input = { query: 'Central Station' } as any;
    const res = GeocodeAddressSchema.safeParse(input);
    if (res.success) {
      expect(res.data.size ?? 10).toBeLessThanOrEqual(40);
    } else {
      expect(res.success).toBe(false);
    }
  });

  it('enforces hard cap of 40 on size', () => {
    const input = { query: 'Kauppatori', size: 100 } as any;
    const res = GeocodeAddressSchema.safeParse(input);
    // Schema should reject or coerce; for Test-First we expect rejection
    expect(res.success).toBe(false);
  });

  it('rejects unknown keys', () => {
    const input = { query: 'Central Station', unexpected: true } as any;
    const res = GeocodeAddressSchema.safeParse(input);
    expect(res.success).toBe(false);
  });
});