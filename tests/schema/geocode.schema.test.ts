import { describe, it, expect } from 'vitest';
import { GeocodeResultSchema, GeocodeResponseSchema } from 'src/schema/geocode';

/**
 * T016 - GeocodeResult & GeocodeResponse (placeholders)
 *
 * These tests are intentionally written as placeholders that describe the
 * required behavior. The actual Zod schemas in src/schema/geocode.ts are
 * minimal stubs that throw a not-implemented error so the test-suite stays RED
 * until proper implementations are provided.
 */

describe('GeocodeResponse (T016) - truncated flag', () => {
  it('marks response as truncated when upstream returned more results than allowed', () => {
    // Client requested size: 100, upstream limited to 40
    const response = {
      query: 'Helsinki',
      language: 'fi',
      correlationId: 'corr-123',
      // <= 40 results returned
      results: new Array(40).fill({
        name: 'Someplace',
        coordinates: { lat: 60.17, lon: 24.93 },
        type: 'address',
        confidence: 0.9,
      }),
      // Implementation may set truncated: true or provide warnings
      truncated: true,
    };

    // Placeholder: real schema.parse should accept this and preserve truncated flag.
    // This will currently FAIL until GeocodeResponseSchema is implemented.
    const parsed: any = GeocodeResponseSchema.parse(response);
    expect(parsed.truncated).toBe(true);
    expect(parsed.results.length).toBeLessThanOrEqual(40);
  });
});

describe('GeocodeResult (T016) - required fields and ranges', () => {
  it('accepts a valid GeocodeResult with required fields', () => {
    const valid: any = {
      name: 'Helsinki Central Station',
      coordinates: { lat: 60.1708, lon: 24.9410 },
      type: 'stop',
      confidence: 0.95,
    };

    // Placeholder: real schema should accept this object.
    // This will currently FAIL until GeocodeResultSchema is implemented.
    expect(() => GeocodeResultSchema.parse(valid)).not.toThrow();
  });

  it('rejects GeocodeResult with confidence outside 0..1', () => {
    const invalidHigh = {
      name: 'Nowhere',
      coordinates: { lat: 0, lon: 0 },
      type: 'poi',
      confidence: 1.5,
    };

    const invalidLow = {
      name: 'Nowhere',
      coordinates: { lat: 0, lon: 0 },
      type: 'poi',
      confidence: -0.1,
    };

    // Placeholder negative assertions: real schema should throw for invalid confidence.
    expect(() => GeocodeResultSchema.parse(invalidHigh)).toThrow();
    expect(() => GeocodeResultSchema.parse(invalidLow)).toThrow();
  });

  it('enforces type to be one of address|poi|stop', () => {
    const invalidType = {
      name: 'Somewhere',
      coordinates: { lat: 10, lon: 10 },
      type: 'building',
      confidence: 0.5,
    };

    // Placeholder: real schema should reject unknown types.
    expect(() => GeocodeResultSchema.parse(invalidType)).toThrow();
  });
});

describe('GeocodeResult ordering and language rules', () => {
  it('orders results by confidence descending', () => {
    const results = [
      { name: 'A', coordinates: { lat: 1, lon: 1 }, type: 'poi', confidence: 0.9 },
      { name: 'B', coordinates: { lat: 2, lon: 2 }, type: 'poi', confidence: 0.85 },
    ];

    const response = {
      query: 'query',
      language: 'en',
      correlationId: 'cid-ord',
      results,
    };

    // Placeholder: real parse should either validate ordering or the tool producing
    // these results should order them. This test asserts ordering explicitly.
    const parsed: any = GeocodeResponseSchema.parse(response);
    expect(parsed.results[0].confidence).toBeGreaterThanOrEqual(parsed.results[1].confidence);
  });

  it('accepts optional language fields limited to fi|sv|en and rejects others', () => {
    const goodLang = {
      name: 'Locale A',
      coordinates: { lat: 3, lon: 3 },
      type: 'address',
      confidence: 0.7,
      language: 'fi',
    };

    const badLang = {
      name: 'Locale B',
      coordinates: { lat: 4, lon: 4 },
      type: 'address',
      confidence: 0.6,
      language: 'de', // invalid in our API (only fi, sv, en allowed)
    };

    // Placeholder: goodLang should be accepted, badLang should cause validation error.
    expect(() => GeocodeResultSchema.parse(goodLang)).not.toThrow();
    expect(() => GeocodeResultSchema.parse(badLang)).toThrow();
  });
});

describe('GeocodeResponse shape (T016) - envelope fields', () => {
  it('includes query, language, results, correlationId and optional warnings', () => {
    const response = {
      query: 'Espoo',
      language: 'sv',
      correlationId: 'corr-999',
      results: [
        { name: 'Place', coordinates: { lat: 60, lon: 25 }, type: 'address', confidence: 0.8 },
      ],
      warnings: [{ code: 'truncated', message: 'Upstream truncated results' }],
    };

    // Placeholder: real schema should validate envelope shape.
    const parsed: any = GeocodeResponseSchema.parse(response);
    expect(parsed.query).toBeDefined();
    expect(parsed.language).toBeDefined();
    expect(Array.isArray(parsed.results)).toBe(true);
    expect(typeof parsed.correlationId).toBe('string');
    // warnings is optional
    if (parsed.warnings !== undefined) {
      expect(Array.isArray(parsed.warnings)).toBe(true);
    }
  });
});