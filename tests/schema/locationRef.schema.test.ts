import { describe, it, expect } from "vitest";
import { LocationRefSchema } from "src/schema/locationRef";

describe("LocationRefSchema", () => {
    it("requires a discriminant and coordinate when type=coordinate", () => {
        // Missing type will be inferred by preprocess to 'coordinate' when lat/lon present
        const input = { coordinate: { lat: 60, lon: 25 } } as any;
        const parsed = LocationRefSchema.parse(input);
        expect(parsed.type).toBeDefined();
        expect(parsed.coordinate).toBeDefined();
    });

    it("rejects multi-line address", () => {
        const bad = { type: "coordinate", coordinate: { lat: 60, lon: 24 }, address: "Line1\nLine2" } as any;
        expect(() => LocationRefSchema.parse(bad)).toThrow();
    });

    it("accepts allowed rawSource values (geocode | user-variable | input)", () => {
        const good1 = { type: "coordinate", coordinate: { lat: 60, lon: 25 }, rawSource: "geocode" } as any;
        const good2 = { type: "coordinate", coordinate: { lat: 60, lon: 25 }, rawSource: "user-variable" } as any;
        const good3 = { type: "coordinate", coordinate: { lat: 60, lon: 25 }, rawSource: "input" } as any;

        expect(() => LocationRefSchema.parse(good1)).not.toThrow();
        expect(() => LocationRefSchema.parse(good2)).not.toThrow();
        expect(() => LocationRefSchema.parse(good3)).not.toThrow();
    });
});
