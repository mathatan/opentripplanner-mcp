import { describe, it, expect } from 'vitest';
import { findStops } from '../../src/tools/findStops';

describe('T006 - find_stops contract tests', () => {
  it('rejects when radius is greater than allowed maximum (3000)', async () => {
    const args = {
      location: { lat: 60.1699, lon: 24.9384 },
      radius: 5000, // > 3000 should be rejected per spec
    };
    await expect(findStops.handler(args)).rejects.toMatchObject({ code: 'validation-error' });
  });

  it('should include a truncated warning when client requests size above provider max (placeholder - currently failing)', async () => {
    const args = {
      location: { lat: 60.1699, lon: 24.9384 },
      size: 100, // request above provider max; expect truncated warning
    };
    const res = await findStops.handler(args) as any;
    // Placeholder assertions: will fail until implementation adds warnings
    expect(Array.isArray(res.warnings)).toBe(true);
    expect(res.warnings).toContainEqual(expect.objectContaining({ code: 'truncated-results' }));
  });

  it('should warn when an unsupported mode filter is requested (placeholder - currently failing)', async () => {
    const args = {
      location: { lat: 60.1699, lon: 24.9384 },
      mode: 'CAR', // unsupported mode should produce a warning
    };
    const res = await findStops.handler(args) as any;
    // Placeholder assertion: will fail until implementation added
    expect(res.warnings).toContainEqual(expect.objectContaining({ code: 'unsupported-mode' }));
  });
});