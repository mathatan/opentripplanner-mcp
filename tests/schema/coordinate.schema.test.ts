import { describe, it, expect } from "vitest";
import { CoordinateSchema } from "src/schema/coordinate";

describe("CoordinateSchema", () => {
    it("accepts a valid coordinate within bounds", () => {
        const valid = { lat: 60.17, lon: 24.93 };
        expect(() => CoordinateSchema.parse(valid)).not.toThrow();
        const parsed = CoordinateSchema.parse(valid);
        expect(parsed.lat).toBeCloseTo(60.17);
        expect(parsed.lon).toBeCloseTo(24.93);
    });

    it("rejects latitude out of bounds and non-finite values", () => {
        expect(() => CoordinateSchema.parse({ lat: 95, lon: 0 })).toThrow();
        expect(() => CoordinateSchema.parse({ lat: -95, lon: 0 })).toThrow();
        expect(() => CoordinateSchema.parse({ lat: NaN, lon: 0 })).toThrow();
        expect(() => CoordinateSchema.parse({ lat: Infinity, lon: 0 })).toThrow();
    });

    it("rejects longitude out of bounds and non-finite values", () => {
        expect(() => CoordinateSchema.parse({ lat: 0, lon: 190 })).toThrow();
        expect(() => CoordinateSchema.parse({ lat: 0, lon: -190 })).toThrow();
        expect(() => CoordinateSchema.parse({ lat: 0, lon: NaN })).toThrow();
        expect(() => CoordinateSchema.parse({ lat: 0, lon: -Infinity })).toThrow();
    });
});
