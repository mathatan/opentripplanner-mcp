import { describe, it, expect } from 'vitest';
import { UserVariableSchema, UserVariablesResponseSchema } from 'src/schema/userVariable';

describe('UserVariableSchema (T018 placeholders)', () => {
  it('TTL shape: includes createdAt, updatedAt and an expiry marker (placeholder)', () => {
    const input = {
      key: 'myVar',
      type: 'other',
      value: 'hello',
      sessionId: 'session-1',
    };

    // Placeholder: real schema should return an object with ISO timestamps and an expiry marker.
    // This will remain failing until schema is implemented.
    const parsed: any = UserVariableSchema.parse(input);
    expect(parsed.createdAt).toBeDefined();
    expect(typeof parsed.createdAt).toBe('string');
    // ISO check (will throw / fail until implemented)
    expect(new Date(parsed.createdAt).toISOString()).toBe(parsed.createdAt);

    expect(parsed.updatedAt).toBeDefined();
    expect(typeof parsed.updatedAt).toBe('string');

    // expiry marker could be `expiresAt` ISO string or `ttlSeconds` number
    expect(parsed.expiresAt || parsed.ttlSeconds).toBeDefined();
  });

  it('Overwrite semantics: updating same key updates updatedAt (placeholder)', () => {
    const initial = {
      key: 'counter',
      type: 'other',
      value: 1,
      sessionId: 'session-1',
    };

    const updated = {
      key: 'counter',
      type: 'other',
      value: 2,
      sessionId: 'session-1',
    };

    // Placeholder: real implementation would persist and return different timestamps.
    const first: any = UserVariableSchema.parse(initial);
    const second: any = UserVariableSchema.parse(updated);

    // Expect updatedAt to be >= createdAt after overwrite (placeholder)
    expect(new Date(second.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(first.createdAt).getTime()
    );
  });

  it('Type narrowing: location type must include coordinate shape (invalid location should throw)', () => {
    const badLocation = {
      key: 'home',
      type: 'location',
      // invalid shape: lat/lon should be numbers in a proper location object
      value: { coordinate: { lat: 'not-a-number', lon: null } },
      sessionId: 'session-1',
    };

    // Placeholder: schema should validate and throw for this bad input.
    expect(() => UserVariableSchema.parse(badLocation)).toThrow();
  });
});

describe('UserVariablesResponseSchema (T018 placeholders)', () => {
  it('Response envelope contains variables[] and correlationId string (placeholder)', () => {
    const response = {
      correlationId: 'corr-123',
      variables: [
        { key: 'a', type: 'other', value: 'x', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 1000).toISOString() },
      ],
    };

    // Placeholder: real schema should accept and validate the envelope
    const parsed: any = UserVariablesResponseSchema.parse(response);
    expect(Array.isArray(parsed.variables)).toBe(true);
    expect(typeof parsed.correlationId).toBe('string');
  });

  it('Isolation per session: variables are isolated when sessionId differs (placeholder)', () => {
    const respSession1 = {
      correlationId: 'c1',
      variables: [
        { key: 'x', sessionId: 's1', type: 'other', value: 'v1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ],
    };

    const respSession2 = {
      correlationId: 'c2',
      variables: [
        { key: 'x', sessionId: 's2', type: 'other', value: 'v2', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ],
    };

    // Placeholder: real storage/validation should ensure isolation; this test asserts they differ.
    const p1: any = UserVariablesResponseSchema.parse(respSession1);
    const p2: any = UserVariablesResponseSchema.parse(respSession2);

    expect(JSON.stringify(p1.variables)).not.toBe(JSON.stringify(p2.variables));
  });
});