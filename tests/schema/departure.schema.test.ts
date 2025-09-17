import { describe, it, expect } from "vitest";
import { DepartureSchema, DepartureResponseSchema } from "src/schema/departure";

const ISO_RE = /^\d{4}-\d{2}-\d{2}T/;

describe("T017 Departure & DepartureResponse schemas", () => {
    it("Ordering: DepartureResponse.departures should be ordered by scheduledTime ascending", () => {
        const resp = {
            departures: [
                { line: "10", mode: "bus", destination: "North", scheduledTime: "2025-09-17T12:30:00Z" },
                { line: "11", mode: "bus", destination: "South", scheduledTime: "2025-09-17T12:00:00Z" },
            ],
            realtimeUsed: false,
            dataFreshness: new Date().toISOString(),
            correlationId: "corr-ordering-1",
        };

        let parsed: typeof resp | undefined;
        expect(() => {
            parsed = DepartureResponseSchema.parse(resp);
        }).not.toThrow();
        expect(parsed).toBeDefined();
        if (parsed) {
            const departures = parsed.departures;
            if (departures.length > 1) {
                expect(new Date(departures[0].scheduledTime) <= new Date(departures[1].scheduledTime)).toBe(true);
            }
        }
    });

    it("RealtimeUsed & dataFreshness fields must be present and correctly formatted", () => {
        const resp = {
            departures: [],
            realtimeUsed: true,
            dataFreshness: new Date().toISOString(),
            correlationId: "corr-rt-1",
        };

        // Placeholder: will fail until implemented
        expect(() => DepartureResponseSchema.parse(resp)).not.toThrow();

        expect(typeof resp.realtimeUsed).toBe("boolean");
        expect(ISO_RE.test(resp.dataFreshness)).toBe(true);
    });

    it("Departure fields: required and optional fields and status membership", () => {
        const dep = {
            line: "10",
            mode: "tram",
            destination: "Central",
            scheduledTime: new Date().toISOString(),
            realtimeTime: new Date().toISOString(),
            delaySeconds: 120,
            status: "delayed",
        };

        let parsed: typeof dep | undefined;
        expect(() => {
            parsed = DepartureSchema.parse(dep);
        }).not.toThrow();
        expect(parsed).toBeDefined();
        if (parsed) {
            expect(typeof parsed.line).toBe("string");
            expect(typeof parsed.mode).toBe("string");
            expect(typeof parsed.destination).toBe("string");
            expect(typeof parsed.scheduledTime).toBe("string");
            if (parsed.realtimeTime) expect(typeof parsed.realtimeTime).toBe("string");
            if (parsed.delaySeconds !== undefined) expect(typeof parsed.delaySeconds).toBe("number");
            if (parsed.status) expect(["on_time", "delayed", "cancelled", "scheduled_only"]).toContain(parsed.status);
        }
    });

    it("Cancellation precedence: cancelled overrides delay", () => {
        const dep = {
            line: "5",
            mode: "bus",
            destination: "West",
            scheduledTime: new Date().toISOString(),
            delaySeconds: 300,
            cancelled: true,
        };
        const resp = {
            departures: [dep],
            realtimeUsed: false,
            dataFreshness: new Date().toISOString(),
            correlationId: "corr-cancel-1",
        };

        let parsed: typeof resp | undefined;
        expect(() => {
            parsed = DepartureResponseSchema.parse(resp);
        }).not.toThrow();
        expect(parsed).toBeDefined();
        if (parsed) {
            expect(parsed.departures[0].status).toBe("cancelled");
        }
    });

    it("Truncation placeholder: warnings include truncated-results when limit exceeded", () => {
        const resp = {
            departures: [],
            realtimeUsed: false,
            dataFreshness: new Date().toISOString(),
            warnings: [{ code: "truncated-results" }],
            correlationId: "corr-trunc-1",
        };

        let parsed: typeof resp | undefined;
        expect(() => {
            parsed = DepartureResponseSchema.parse(resp);
        }).not.toThrow();
        expect(parsed).toBeDefined();
        if (parsed) {
            const hasTrunc =
                Array.isArray(parsed.warnings) &&
                parsed.warnings.some((w: { code?: string }) => !!w && w.code === "truncated-results");
            expect(hasTrunc).toBe(true);
        }
    });
});
