import { describe, it, expect } from "vitest";
import { GeocodeResultSchema, GeocodeResponseSchema } from "src/schema/geocode";

/**
 * T016 - GeocodeResult & GeocodeResponse (placeholders)
 *
 * These tests are intentionally written as placeholders that describe the
 * required behavior. The actual Zod schemas in src/schema/geocode.ts are
 * minimal stubs that throw a not-implemented error so the test-suite stays RED
 * until proper implementations are provided.
 */

describe("GeocodeResponse (T016) - truncated flag and size cap", () => {
    it("caps results to 40 and emits truncated-results warning when requested size > 40", () => {
        // Build an envelope that simulates provider returning more than allowed;
        // GeocodeResponseSchema.transform enforces a hard cap of 40 and adds a warning.
        const manyResults = new Array(50).fill(0).map((_, i) => ({
            name: `Place ${i}`,
            coordinates: { lat: 60.17 + i * 0.00001, lon: 24.93 + i * 0.00001 },
            type: "address",
            confidence: 0.9 - i * 0.001, // descending
        }));

        const response = {
            query: "Helsinki",
            language: "fi",
            correlationId: "corr-123",
            results: manyResults,
            size: 100, // client requested
        } as any;

        const parsed: any = GeocodeResponseSchema.parse(response);
        // Enforced cap
        expect(parsed.results.length).toBeLessThanOrEqual(40);
        // truncated flag should be true when original exceeded cap
        expect(parsed.truncated).toBe(true);
        // warnings should include truncated-results code
        expect(parsed.warnings).toBeDefined();
        expect(parsed.warnings.some((w: any) => w.code === "truncated-results")).toBe(true);
    });
});

describe("GeocodeResult (T016) - required fields and ranges", () => {
    it("accepts a valid GeocodeResult with required and optional Pelias fields", () => {
        const valid: any = {
            name: "Helsinki Central Station",
            coordinates: { lat: 60.1708, lon: 24.941 },
            type: "stop",
            confidence: 0.95,
            label: "Helsinki C",
            gid: "osm:node:123",
            rawLayer: "venue",
            rawSource: "pelias",
            sourceId: "123",
            distanceKm: 0.1,
            zones: ["zone1"],
        };

        expect(() => GeocodeResultSchema.parse(valid)).not.toThrow();
    });

    it("rejects GeocodeResult with confidence outside 0..1", () => {
        const invalidHigh = {
            name: "Nowhere",
            coordinates: { lat: 0, lon: 0 },
            type: "poi",
            confidence: 1.5,
        };

        const invalidLow = {
            name: "Nowhere",
            coordinates: { lat: 0, lon: 0 },
            type: "poi",
            confidence: -0.1,
        };

        expect(() => GeocodeResultSchema.parse(invalidHigh)).toThrow();
        expect(() => GeocodeResultSchema.parse(invalidLow)).toThrow();
    });

    it("enforces type to be one of address|poi|stop", () => {
        const invalidType = {
            name: "Somewhere",
            coordinates: { lat: 10, lon: 10 },
            type: "building",
            confidence: 0.5,
        };

        expect(() => GeocodeResultSchema.parse(invalidType)).toThrow();
    });
});

describe("GeocodeResult ordering and language rules", () => {
    it("orders results by confidence descending after parse/transform", () => {
        const results = [
            { name: "A", coordinates: { lat: 1, lon: 1 }, type: "poi", confidence: 0.6 },
            { name: "B", coordinates: { lat: 2, lon: 2 }, type: "poi", confidence: 0.9 },
        ];

        const response = {
            query: "query",
            language: "en",
            correlationId: "cid-ord",
            results,
        } as any;

        const parsed: any = GeocodeResponseSchema.parse(response);
        expect(parsed.results[0].confidence).toBeGreaterThanOrEqual(parsed.results[1].confidence);
    });

    it("accepts optional language fields limited to fi|sv|en and rejects others at result envelope", () => {
        const response = {
            query: "query",
            language: "fi",
            correlationId: "cid-lang",
            results: [
                { name: "Locale A", coordinates: { lat: 3, lon: 3 }, type: "address", confidence: 0.7, language: "fi" },
            ],
        } as any;

        expect(() => GeocodeResponseSchema.parse(response)).not.toThrow();

        const badResponse = {
            query: "query",
            language: "de",
            correlationId: "cid-lang-bad",
            results: [{ name: "Locale B", coordinates: { lat: 4, lon: 4 }, type: "address", confidence: 0.6 }],
        } as any;

        // envelope language is validated against allowed values (fi|sv|en) in schema
        expect(() => GeocodeResponseSchema.parse(badResponse)).toThrow();
    });
});

describe("GeocodeResponse shape (T016) - envelope fields", () => {
    it("includes query, language, results, correlationId and optional warnings", () => {
        const response = {
            query: "Espoo",
            language: "sv",
            correlationId: "corr-999",
            results: [{ name: "Place", coordinates: { lat: 60, lon: 25 }, type: "address", confidence: 0.8 }],
            warnings: [{ code: "truncated", message: "Upstream truncated results" }],
        };

        // Placeholder: real schema should validate envelope shape.
        const parsed: any = GeocodeResponseSchema.parse(response);
        expect(parsed.query).toBeDefined();
        expect(parsed.language).toBeDefined();
        expect(Array.isArray(parsed.results)).toBe(true);
        expect(typeof parsed.correlationId).toBe("string");
        // warnings is optional
        if (parsed.warnings !== undefined) {
            expect(Array.isArray(parsed.warnings)).toBe(true);
        }
    });
});
