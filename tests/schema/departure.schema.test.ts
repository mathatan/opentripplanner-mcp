import { describe, it, expect } from "vitest";
import { DepartureSchema, DepartureResponseSchema } from "src/schema/departure";

describe("Departure & DepartureResponse schemas", () => {
    it("parses a departure with scheduledTime and optional realtimeTime", () => {
        const dep = {
            line: "10",
            mode: "tram",
            destination: "Central",
            scheduledTime: new Date().toISOString(),
            realtimeTime: new Date().toISOString(),
            delaySeconds: 120,
            status: "delayed",
        } as any;

        expect(() => DepartureSchema.parse(dep)).not.toThrow();
    });

    it("cancellation precedence: cancelled true sets status cancelled when parsing", () => {
        const dep = {
            line: "5",
            mode: "bus",
            destination: "West",
            scheduledTime: new Date().toISOString(),
            delaySeconds: 300,
            cancelled: true,
        } as any;

        const parsed = DepartureSchema.parse(dep);
        // preprocess should map cancelled=true to status 'cancelled'
        expect(parsed.status).toBe("cancelled");
    });

    it("DepartureResponse validates dataFreshness and optional scheduleType", () => {
        const resp = {
            departures: [],
            realtimeUsed: false,
            dataFreshness: new Date().toISOString(),
            correlationId: "corr-ordering-1",
        } as any;

        expect(() => DepartureResponseSchema.parse(resp)).not.toThrow();

        const withSchedule = { ...resp, scheduleType: "scheduled" } as any;
        expect(() => DepartureResponseSchema.parse(withSchedule)).not.toThrow();
    });

    it("accepts warnings array containing truncated-results when present", () => {
        const resp = {
            departures: [],
            realtimeUsed: false,
            dataFreshness: new Date().toISOString(),
            warnings: [{ code: "truncated-results", message: "limited" }],
            correlationId: "corr-trunc-1",
        } as any;

        const parsed: any = DepartureResponseSchema.parse(resp);
        expect(parsed.warnings).toBeDefined();
        expect(parsed.warnings.some((w: any) => w.code === "truncated-results")).toBe(true);
    });
});
