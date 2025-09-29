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

    const mapType = (raw: any) => {
        const layer = raw?.properties?.layer ?? raw?.layer ?? "";
        // treat station/stop/bikestation as STOP, everything else as ADDRESS by default
        const stopLayers = new Set(["stop", "station", "bus_stop", "tram_stop", "bikestation"]);
        return stopLayers.has(String(layer)) ? "STOP" : "ADDRESS";
    };

    const mapId = (raw: any) => {
        return raw?.properties?.id ?? raw?.properties?.source_id ?? raw?.properties?.gid ?? undefined;
    };

    const normalizeStopId = (id: string | undefined) => {
        if (!id) return undefined;
        // Drop leading GTFS: prefix if present (e.g., GTFS:HSL:1000102 -> HSL:1000102)
        if (id.startsWith("GTFS:")) return id.slice(5);
        return id;
    };

    const extractPlatformCode = (raw: any) => raw?.properties?.addendum?.GTFS?.code ?? undefined;
    const extractModes = (raw: any): string[] | undefined => {
        const modes = raw?.properties?.addendum?.GTFS?.modes;
        return Array.isArray(modes) && modes.length > 0 ? modes : undefined;
    };

    const mapNames = (raw: any) => {
        return {
            fi: raw?.properties?.name || raw?.properties?.locality || undefined,
            en: raw?.properties?.name_en || raw?.properties?.name || undefined,
            sv: raw?.properties?.name_sv || raw?.properties?.name || undefined,
        };
    };

    return {
        query: input.text,
        candidates: res.candidates.map((c) => {
            const rawId = mapId(c.raw) ?? null;
            const type = mapType(c.raw);
            const normalizedStopId = type === "STOP" ? normalizeStopId(rawId || undefined) : undefined;
            return {
                id: rawId,
                normalizedStopId: normalizedStopId ?? null,
                platformCode: type === "STOP" ? (extractPlatformCode(c.raw) ?? null) : null,
                modes: type === "STOP" ? (extractModes(c.raw) ?? null) : null,
                name: c.name,
                primaryLanguage: c.primaryLanguage ?? "default",
                names: mapNames(c.raw),
                type,
                coordinate: c.coordinate,
                confidenceScore: c.confidenceScore,
                locality: c.raw?.properties?.locality ?? c.raw?.properties?.localadmin ?? undefined,
                rawQuery: input.text,
                raw: c.raw,
            };
        }),
        needsClarification: res.needsClarification,
    };
}
