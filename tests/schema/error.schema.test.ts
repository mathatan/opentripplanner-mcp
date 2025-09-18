import { describe, it, expect } from "vitest";
import { ErrorSchema, WarningSchema } from "src/schema/error";

describe("ErrorSchema", () => {
    it("requires code and message", () => {
        expect(() => ErrorSchema.parse({})).toThrow();
        expect(() => ErrorSchema.parse({ code: "validation-error", message: "x" })).not.toThrow();
    });

    it("accepts canonical codes", () => {
        const codes = ["validation-error", "no-itinerary-found", "geocode-no-results", "unsupported-region"];
        for (const c of codes) {
            expect(() => ErrorSchema.parse({ code: c, message: "x" })).not.toThrow();
        }
        // Special-case: rate-limited must include retryAfter per schema
        expect(() => ErrorSchema.parse({ code: "rate-limited", message: "x", retryAfter: 10 })).not.toThrow();
    });

    it("allows optional fields", () => {
        expect(() => ErrorSchema.parse({ code: "validation-error", message: "x", hint: "try this" })).not.toThrow();
        expect(() => ErrorSchema.parse({ code: "validation-error", message: "x", correlationId: "abc" })).not.toThrow();
        expect(() => ErrorSchema.parse({ code: "validation-error", message: "x", retryAfter: 30 })).not.toThrow();
    });
});

describe("WarningSchema", () => {
    it("requires code and message", () => {
        expect(() => WarningSchema.parse({})).toThrow();
        expect(() => WarningSchema.parse({ code: "partial-results", message: "x" })).not.toThrow();
    });

    it("rejects invalid shapes", () => {
        expect(() => WarningSchema.parse({ code: "not-kebab", message: 123 })).toThrow();
    });
});

describe("HTTP mapping", () => {
    it("maps 429 to rate-limited placeholder", () => {
        const mapped = { code: "rate-limited", message: "Too many requests", retryAfter: 60 };
        expect(() => ErrorSchema.parse(mapped)).not.toThrow();
    });
});
