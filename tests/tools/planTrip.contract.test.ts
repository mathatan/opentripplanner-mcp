import { describe, it, expect } from 'vitest';
import { planTrip } from '../../src/tools/planTrip';

describe('T005 - plan_trip contract tests', () => {
  it('rejects when both origin and destination are missing', async () => {
    await expect(planTrip.handler({})).rejects.toMatchObject({ code: 'validation-error' });
  });

  it('rejects when coordinates are invalid (lat out of range)', async () => {
    const args = {
      origin: { lat: 100, lon: 24 }, // invalid latitude
      destination: { lat: 60.192059, lon: 24.945831 },
    };
    await expect(planTrip.handler(args)).rejects.toMatchObject({ code: 'validation-error' });
  });

  it('should include realtimeUsed with one of the expected values when successful (placeholder - currently failing)', async () => {
    const args = {
      origin: { lat: 60.1699, lon: 24.9384 },
      destination: { lat: 60.2055, lon: 24.6559 },
    };
    const res = await planTrip.handler(args) as any;
    expect(typeof res.correlationId).toBe('string');
    expect(Array.isArray(res.warnings)).toBe(true);
    expect(res).toHaveProperty('realtimeUsed');
    expect(['realtime', 'scheduled', 'mixed']).toContain(res.realtimeUsed);
  });

  it('should return itineraries with fingerprint and dedupe duplicates (placeholder - currently failing)', async () => {
    const args = {
      origin: { lat: 60.1699, lon: 24.9384 },
      destination: { lat: 60.2055, lon: 24.6559 },
    };
    const res = await planTrip.handler(args) as any;
    expect(typeof res.correlationId).toBe('string');
    expect(Array.isArray(res.warnings)).toBe(true);
    expect(Array.isArray(res.itineraries)).toBe(true);
    const fingerprints = (res.itineraries || []).map((it: any) => it.fingerprint);
    expect(fingerprints.every((f: any) => typeof f === 'string')).toBe(true);
    // Ensure duplicates removed
    const uniqueCount = new Set(fingerprints).size;
    expect(uniqueCount).toBe(fingerprints.length);
  });
});