import { describe, it, expect } from 'vitest';
import { getDepartures } from '../../src/tools/getDepartures';

describe('T007 - get_departures contract tests', () => {
  it('rejects when neither stopId nor stopName provided', async () => {
    await expect(getDepartures.handler({})).rejects.toMatchObject({ code: 'validation-error' });
  });

  it('maps upstream delay to delaySeconds on departure objects (placeholder - currently failing)', async () => {
    const args = {
      stopId: 'STOP:1',
      includeRealtime: true,
      limit: 10,
    };
    const res = await getDepartures.handler(args) as any;
    expect(res).toBeTypeOf('object');
    expect(Array.isArray(res.departures)).toBe(true);
    if ((res.departures || []).length > 0) {
      expect(
        typeof res.departures[0].delaySeconds === 'number' ||
          res.departures[0].delaySeconds === null
      ).toBe(true);
    }
  });

  it('cancellation takes precedence over realtime delay (placeholder - currently failing)', async () => {
    const args = {
      stopId: 'STOP:CANCEL',
      includeRealtime: true,
    };
    const res = await getDepartures.handler(args) as any;
    expect(Array.isArray(res.departures)).toBe(true);
    expect(res.departures.some((d: any) => d.status === 'cancelled')).toBe(true);
  });

  it('includes truncated-results warning when client limit exceeds provider max (placeholder - currently failing)', async () => {
    const args = {
      stopId: 'STOP:1',
      limit: 5000,
    };
    const res = await getDepartures.handler(args) as any;
    expect(Array.isArray(res.warnings)).toBe(true);
    expect(res.warnings).toContainEqual(expect.objectContaining({ code: 'truncated-results' }));
  });
});