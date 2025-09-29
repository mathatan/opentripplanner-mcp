import { lookupAddressOrStop } from "../services/lookupService.js";
import { createErrorPayload, ErrorCategory } from "../infrastructure/errorMapping.js";

export type FindInput = {
    text?: string;
    focus?: { lat: number; lon: number };
    maxDistanceMeters?: number;
    lang?: string[];
};

export async function findAddressOrStop(input: FindInput) {
    if (!input || !input.text) {
        throw createErrorPayload(ErrorCategory.VALIDATION, "MISSING_TEXT", "text is required for lookup");
    }

    const res = await lookupAddressOrStop({
        text: input.text,
        focus: input.focus,
        maxDistanceMeters: input.maxDistanceMeters,
        lang: input.lang,
    });

    return {
        query: input.text,
        candidates: res.candidates.map((c) => ({
            name: c.name,
            coordinate: c.coordinate,
            confidence: c.confidenceScore,
        })),
        needsClarification: res.needsClarification,
    };
}
