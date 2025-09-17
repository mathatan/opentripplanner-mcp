import { describe, it, expect } from "vitest";
import { reverseGeocode } from "../../src/tools/reverseGeocode";
import { GeocodeResponseSchema, GeocodeResultSchema } from "../../src/schema/geocode";

describe("reverse_geocode contract - T009", () => {
    it("rejects with geocode-no-results when coords are outside supported area", async () => {
        const args = { lat: 59.0, lon: 10.0, context: {} };
        await expect(reverseGeocode.handler(args)).rejects.toMatchObject({ code: "geocode-no-results" });
    });

    it("returns a schema-compliant geocode response for Helsinki center", async () => {
        const args = { lat: 60.1699, lon: 24.9384, context: {} };
        const res = (await reverseGeocode.handler(args)) as any;
        // Validate envelope using Zod schema
        const parsed = GeocodeResponseSchema.parse(res);
        expect(parsed.results.length).toBeGreaterThan(0);
        // Validate correlationId present
        expect(typeof parsed.correlationId === "string").toBe(true);
        // Validate query format
        expect(parsed.query).toBe(`${args.lat},${args.lon}`);
        // Validate first result shape
        const first = parsed.results[0];
        GeocodeResultSchema.parse(first);
        // confidence in [0,1]
        expect(first.confidence).toBeGreaterThanOrEqual(0);
        expect(first.confidence).toBeLessThanOrEqual(1);
        // type is one of expected values
        expect(["address", "poi", "stop"]).toContain(first.type);
    });

    it("respects Accept-Language from context when provided", async () => {
        const args = { lat: 60.1699, lon: 24.9384, context: { headers: { "accept-language": "sv" } } };
        const res = (await reverseGeocode.handler(args)) as any;
        const parsed = GeocodeResponseSchema.parse(res);
        expect(parsed.results[0].language).toBe("sv");
    });

    it("falls back to fi then en when requested language unavailable", async () => {
        // If requesting an unsupported language, handler should fallback to fi or en
        const args = { lat: 60.1699, lon: 24.9384, lang: "de", context: {} };
        const res = (await reverseGeocode.handler(args)) as any;
        const parsed = GeocodeResponseSchema.parse(res);
        expect(["fi", "en"]).toContain(parsed.results[0].language);
    });
});
