import { planRoute } from "../services/routeService.js";
import { createErrorPayload, ErrorCategory } from "../infrastructure/errorMapping.js";

export type PlanInput = {
    from: { lat: number; lon: number };
    to: { lat: number; lon: number };
    departureTimeIso?: string;
    arriveBy?: boolean;
};

export async function planRouteTool(input: PlanInput) {
    if (!input || !input.from || !input.to) {
        throw createErrorPayload(ErrorCategory.VALIDATION, "MISSING_PARAMS", "from and to required");
    }
    const res = await planRoute({
        from: input.from,
        to: input.to,
        departureTimeIso: input.departureTimeIso,
        arriveBy: input.arriveBy,
    });
    // Return full itinerary objects (id, durationMinutes, numberOfTransfers, startTime, endTime, totalWalkDistanceMeters, legs[])
    return { itineraries: res };
}
