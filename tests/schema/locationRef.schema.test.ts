import { describe, it, expect } from 'vitest';
import { LocationRefSchema } from 'src/schema/locationRef';

describe('LocationRefSchema', () => {
  it('requires coordinate', () => {
    // Placeholder failing assertion until schema implemented
    expect(() => LocationRefSchema.parse({ label: 'X' })).toThrow();
  });

  it('prefers name over label when both provided', () => {
    // Placeholder: parse expected to return a result where `name` is primary.
    const input = { name: 'Primary Name', label: 'Secondary Label', coordinate: { lat: 60, lon: 25 } };
    const result = LocationRefSchema.parse(input);
    // The real schema will return an object where `name` is preferred for display
    expect(result.name).toBe('Primary Name');
    expect(result.name).not.toBe(result.label);
  });

  it('rejects multi-line address', () => {
    const bad = { label: 'X', coordinate: { lat: 60, lon: 24 }, address: 'Line1\nLine2' };
    expect(() => LocationRefSchema.parse(bad)).toThrow();
  });

  it('rejects invalid rawSource values', () => {
    const bad = { label: 'X', coordinate: { lat: 60, lon: 24 }, rawSource: 'invalid' };
    expect(() => LocationRefSchema.parse(bad)).toThrow();
  });

  it('accepts allowed rawSource values (geocode | user-variable | input)', () => {
    // Spec-driven allowed values: 'geocode' | 'user-variable' | 'input'
    const good1 = { label: 'A', coordinate: { lat: 60, lon: 25 }, rawSource: 'geocode' };
    const good2 = { label: 'B', coordinate: { lat: 60, lon: 25 }, rawSource: 'user-variable' };
    const good3 = { label: 'C', coordinate: { lat: 60, lon: 25 }, rawSource: 'input' };

    expect(() => LocationRefSchema.parse(good1)).not.toThrow();
    expect(() => LocationRefSchema.parse(good2)).not.toThrow();
    expect(() => LocationRefSchema.parse(good3)).not.toThrow();
  });
});