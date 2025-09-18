import { describe, it, expect } from 'vitest';
import { saveUserVariable } from '../../src/tools/saveUserVariable';

describe('tests/tools/saveUserVariable.keyNormalization.test.ts', () => {
  it('preserves key case as provided (no lowercasing)', async () => {
    const args = {
      key: 'UserKey_Case',
      value: 'value1',
    } as any;
    const res = await saveUserVariable.handler(args) as any;
    // Expect the returned key to match input case exactly
    expect(res.variable.key).toBe('UserKey_Case');
  });

  it('returns key-overwritten warning when overwriting existing key', async () => {
    const args1 = { key: 'CaseKey', value: 'first' } as any;
    await saveUserVariable.handler(args1);
    const args2 = { key: 'CaseKey', value: 'second' } as any;
    const res2 = await saveUserVariable.handler(args2) as any;
    expect(Array.isArray(res2.warnings)).toBe(true);
    expect(res2.warnings).toContainEqual(expect.objectContaining({ code: 'key-overwritten' }));
  });
});