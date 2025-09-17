import { describe, it, expect } from 'vitest';
import { saveUserVariable } from '../../src/tools/saveUserVariable';

describe('T010 - save_user_variable contract tests', () => {
  it('overwrites previous semantics (placeholder - currently failing)', async () => {
    const first = {
      key: 'home',
      type: 'location',
      value: { lat: 60, lon: 24 },
    };

    const second = {
      key: 'home',
      type: 'location',
      value: { lat: 61, lon: 25 },
    };

    await saveUserVariable.handler(first);

    const res = await saveUserVariable.handler(second) as any;

    expect(res.previous).toBeDefined();
    expect(res.previous.key).toBe('home');
  });

  it('rejects invalid coordinates for location type with validation-error', async () => {
    await expect(
      saveUserVariable.handler({
        key: 'x',
        type: 'location',
        value: { lat: 95, lon: 200 },
      })
    ).rejects.toMatchObject({ code: 'validation-error' });
  });

  it('includes a TTL marker in the response (placeholder - currently failing)', async () => {
    const args = {
      key: 'session',
      type: 'string',
      value: 'abc123',
    };

    const res = await saveUserVariable.handler(args) as any;

    expect(res.ttlSeconds !== undefined || res.expiresAt !== undefined).toBe(true);
  });
});