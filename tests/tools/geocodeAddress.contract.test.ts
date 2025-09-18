import { describe, it, expect } from 'vitest';
import { geocodeAddress } from '../../src/tools/geocodeAddress';

describe('T008 - geocode_address contract tests', () => {
  it('includes truncated-results warning when client requests size above provider max (placeholder - currently failing)', async () => {
    const args = {
      query: 'Mannerheimintie 1, Helsinki',
      size: 100,
    };
    const res = await geocodeAddress.handler(args) as any;
    // Placeholder assertions: will fail until implementation adds warnings and truncation
    expect(typeof res.correlationId).toBe('string');
    expect(Array.isArray(res.warnings)).toBe(true);
    expect(res.warnings).toContainEqual(expect.objectContaining({ code: 'truncated-results' }));
    expect(Array.isArray(res.results)).toBe(true);
    expect(res.results.length).toBeLessThanOrEqual(40);
  });

  it('rejects with geocode-no-results when upstream returns zero features', async () => {
    const args = {
      query: 'Nonexistent Place 123456789',
      size: 5,
    };
    await expect(geocodeAddress.handler(args)).rejects.toMatchObject({ code: 'geocode-no-results' });
  });

  it('orders results by confidence and proximity to focus (placeholder - currently failing)', async () => {
    const focus = { lat: 60.1699, lon: 24.9384 };
    const args = {
      query: 'Kauppatori',
      focus,
      size: 5,
    };
    const res = await geocodeAddress.handler(args) as any;
    expect(typeof res.correlationId).toBe('string');
    expect(Array.isArray(res.results)).toBe(true);
    if (res.results.length >= 2) {
      expect(res.results[0].confidence).toBeGreaterThanOrEqual(res.results[1].confidence);
      // tie-breaker: when confidence equal, closer to focus should come first
      const dist2 = (a: any, b: any) => {
        const dlat = (a.lat - b.lat);
        const dlon = (a.lon - b.lon);
        return dlat * dlat + dlon * dlon;
      };
      if (res.results[0].confidence === res.results[1].confidence) {
        expect(dist2(res.results[0].location, focus)).toBeLessThanOrEqual(dist2(res.results[1].location, focus));
      }
    }
  });

  it('defaults to size 10 when omitted (placeholder - currently failing)', async () => {
    const args = { query: 'Central Station' };
    const res = await geocodeAddress.handler(args) as any;
    expect(typeof res.correlationId).toBe('string');
    expect(Array.isArray(res.results)).toBe(true);
    expect(res.results.length).toBeLessThanOrEqual(10);
  });
});