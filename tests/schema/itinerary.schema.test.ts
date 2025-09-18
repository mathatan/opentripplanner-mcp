import { describe, it, expect } from "vitest";
import { LegSchema, ItinerarySchema } from "src/schema/itinerary";

describe("Leg schema - required fields and optional realtime metadata", () => {
    it("accepts a minimal Leg with required fields", () => {
        const minimalLeg = {
            mode: "walk",
            from: { id: "A", name: "Origin" },
            to: { id: "B", name: "Destination" },
            departureTime: "2025-09-17T09:00:00Z",
            arrivalTime: "2025-09-17T09:10:00Z",
            duration: 600,
        } as any;

        expect(() => LegSchema.parse(minimalLeg)).not.toThrow();
    });

    it("accepts optional realtimeState and lastRealtimeUpdate when provided", () => {
        const leg = {
            mode: "rail",
            from: { id: "S1" },
            to: { id: "S2" },
            departureTime: "2025-09-17T12:00:00Z",
            arrivalTime: "2025-09-17T12:30:00Z",
            duration: 1800,
            realtimeDelaySeconds: 120,
            realtimeState: "updated",
            lastRealtimeUpdate: "2025-09-17T11:59:00Z",
            status: "delayed",
        } as any;

        const parsed: any = LegSchema.parse(leg);
        expect(parsed.realtimeState).toBe("updated");
        expect(parsed.lastRealtimeUpdate).toBe("2025-09-17T11:59:00Z");
    });
});

describe("Itinerary aggregates and transforms", () => {
    it("computes totalDuration and derives scheduleType", () => {
        const legs = [
            {
                mode: "walk",
                from: { id: "A" },
                to: { id: "B" },
                departureTime: "2025-09-17T09:00:00Z",
                arrivalTime: "2025-09-17T09:05:00Z",
                duration: 300,
            },
            {
                mode: "bus",
                from: { id: "B" },
                to: { id: "C" },
                departureTime: "2025-09-17T09:10:00Z",
                arrivalTime: "2025-09-17T09:40:00Z",
                duration: 1800,
            },
        ];

        const itineraryInput = {
            id: "it1",
            legs,
        } as any;

        const parsed: any = ItinerarySchema.parse(itineraryInput);
        expect(parsed.totalDuration).toBe(legs[0].duration + legs[1].duration);
        expect(["realtime", "scheduled", "mixed"]).toContain(parsed.scheduleType);
        expect(typeof parsed.fingerprint).toBe("string");
    });

    it("sets disruptionFlag when a leg is cancelled", () => {
        const legs = [
            {
                mode: "bus",
                from: { id: "X" },
                to: { id: "Y" },
                departureTime: "2025-09-17T13:00:00Z",
                arrivalTime: "2025-09-17T13:30:00Z",
                duration: 1800,
                status: "cancelled",
            },
        ];

        const parsed: any = ItinerarySchema.parse({ id: "it-disrupt", legs } as any);
        expect(parsed.disruptionFlag).toBe(true);
        expect(typeof parsed.disruptionNote).toBe("string");
    });
});
