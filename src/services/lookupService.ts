import { httpGet } from "../infrastructure/httpClient.js";
import { createErrorPayload, ErrorCategory } from "../infrastructure/errorMapping.js";
import { sortLocationsDeterministic, ResolvedLocation } from "../util/sorting.js";
import { pickBestName, fallbackChain } from "../util/languageFallback.js";

export type LookupInput = {
    text: string;
    focus?: { lat: number; lon: number };
    maxDistanceMeters?: number;
    lang?: string[]; // preferred languages in order
    size?: number; // max candidates requested from upstream
};

export type LookupCandidate = {
    name: string;
    coordinate?: { lat: number; lon: number };
    confidenceScore: number; // 0..1
    primaryLanguage: string;
    raw: any;
};

export type LookupResult = {
    candidates: LookupCandidate[];
    needsClarification: boolean;
};

const DEFAULT_MAX_CANDIDATES = 5;
const EPSILON = 0.02; // distance tie-break threshold per spec

function normalizeConfidence(v: unknown): number {
    if (typeof v === "number") {
        if (v < 0) return 0;
        if (v > 1) return 1;
        return v;
    }
    // fallback if upstream missing - assume low confidence
    return 0;
}

function extractCoordinate(feature: any) {
    if (!feature) return undefined;
    const c = feature?.geometry?.coordinates;
    if (Array.isArray(c) && c.length >= 2) {
        return { lon: Number(c[0]), lat: Number(c[1]) };
    }
    // pelias may have center or bbox - try center
    if (feature?.center && Array.isArray(feature.center) && feature.center.length >= 2) {
        return { lon: Number(feature.center[0]), lat: Number(feature.center[1]) };
    }
    return undefined;
}

export async function lookupAddressOrStop(input: LookupInput): Promise<LookupResult> {
    if (!input || !input.text) {
        throw createErrorPayload(ErrorCategory.VALIDATION, "MISSING_TEXT", "Missing text for lookup");
    }

    const size = input.size ?? DEFAULT_MAX_CANDIDATES * 2; // ask upstream for more and truncate locally
    const params = new URLSearchParams();
    params.set("text", input.text);
    params.set("size", String(size));
    if (input.focus) {
        params.set("focus.point.lat", String(input.focus.lat));
        params.set("focus.point.lon", String(input.focus.lon));
    }
    if (input.lang && input.lang.length > 0) {
        params.set("lang", input.lang.join(","));
    }

    const url = `https://api.digitransit.fi/geocoding/v1/search?${params.toString()}`;
    const res = await httpGet<any>(url);
    if (res.status === 401 || res.status === 403) {
        throw createErrorPayload(ErrorCategory.AUTH_FAILURE, "INVALID_API_KEY", "Authentication to upstream failed");
    }
    if (res.status === 429) {
        // map upstream retry-after if present
        const retryAfter = (res.body && res.body.headers && res.body.headers["retry-after"]) || 60;
        throw createErrorPayload(ErrorCategory.THROTTLED, "UPSTREAM_THROTTLED", "Upstream rate limit reached", {
            retryAfter,
        });
    }
    if (res.status >= 500) {
        throw createErrorPayload(ErrorCategory.UPSTREAM_FAILURE, "GEOCODING_ERROR", "Upstream geocoding failure");
    }

    const features = res.body?.features ?? [];
    const candidates: LookupCandidate[] = features.map((f: any) => {
        const coord = extractCoordinate(f);
        const confidence = normalizeConfidence(f.properties?.confidence ?? f.properties?.score ?? undefined);
        const preferred = (input.lang && input.lang[0]) as any;
        const names: Record<string, string | undefined> = {
            fi: f.properties?.locality || f.properties?.name || undefined,
            en: f.properties?.name_en || f.properties?.name || undefined,
            sv: f.properties?.name_sv || f.properties?.name || undefined,
            default: f.properties?.label || f.properties?.name || f.text || undefined,
        };
        const best = pickBestName(names, preferred as any) ?? f.properties?.label ?? f.properties?.name ?? f.text ?? "";
        // primary language - pick first in fallback chain that has a value
        const chain = fallbackChain(preferred as any);
        let primaryLang = "default";
        for (const l of chain) {
            if (names[l]) {
                primaryLang = l;
                break;
            }
        }
        return {
            name: best,
            coordinate: coord ? { lat: coord.lat, lon: coord.lon } : undefined,
            confidenceScore: confidence,
            primaryLanguage: primaryLang,
            raw: f,
        } as LookupCandidate;
    });

    // Apply maxDistanceMeters filter if provided
    let filtered = candidates;
    if (input.maxDistanceMeters && input.focus) {
        // compute haversine distance
        const R = 6371000;
        const toRad = (d: number) => (d * Math.PI) / 180;
        const dist = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
            const dLat = toRad(b.lat - a.lat);
            const dLon = toRad(b.lon - a.lon);
            const la = toRad(a.lat);
            const lb = toRad(b.lat);
            const x = Math.sin(dLat / 2) ** 2 + Math.cos(la) * Math.cos(lb) * Math.sin(dLon / 2) ** 2;
            const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
            return R * c;
        };
        filtered = filtered.filter((c) => {
            if (!c.coordinate) return false;
            const d = dist({ lat: input.focus!.lat, lon: input.focus!.lon }, c.coordinate);
            return d <= input.maxDistanceMeters!;
        });
    }

    // Sort by deterministic comparator
    filtered.sort(sortLocationsDeterministic as any);

    // Truncate to max candidates and enforce needsClarification if top ones low confidence
    const maxCandidates = DEFAULT_MAX_CANDIDATES;
    const truncated = filtered.slice(0, maxCandidates);

    // If multiple candidates and top confidence below threshold, flag disambiguation
    const needsClarification = truncated.length > 1 && truncated[0].confidenceScore < 0.8;

    return { candidates: truncated, needsClarification };
}
