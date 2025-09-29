import { httpPost } from "../infrastructure/httpClient.js";
import { createErrorPayload, ErrorCategory } from "../infrastructure/errorMapping.js";
import { sortItinerariesDeterministic } from "../util/sorting.js";
import { shortFingerprint } from "../util/fingerprint.js";

export type RouteRequest = {
    from: { lat: number; lon: number };
    to: { lat: number; lon: number };
    departureTimeIso?: string; // ISO time
    arriveBy?: boolean;
    maxItineraries?: number;
};

export type ItineraryLeg = {
    mode: string;
    lineName?: string;
    from: { name: string; lat: number; lon: number };
    to: { name: string; lat: number; lon: number };
    departureTime: string;
    arrivalTime: string;
    headsign?: string;
    distanceMeters: number;
};

export type ItinerarySummary = {
    id: string;
    durationMinutes: number;
    numberOfTransfers: number;
    startTime: string;
    endTime: string;
    totalWalkDistanceMeters: number;
    legs: ItineraryLeg[];
};

const DEFAULT_MAX_ITINERARIES = 3;

export async function planRoute(req: RouteRequest): Promise<ItinerarySummary[]> {
    // GraphQL based implementation aligned with docs/routing-api.md
    const maxItineraries = req.maxItineraries ?? DEFAULT_MAX_ITINERARIES;
    const dt = req.departureTimeIso ? new Date(req.departureTimeIso) : new Date();
    const date = dt.toISOString().slice(0, 10); // YYYY-MM-DD
    const time = dt.toTimeString().slice(0, 8); // HH:MM:SS

    const query = `
query Plan($fromLat: Float!, $fromLon: Float!, $toLat: Float!, $toLon: Float!, $date: String!, $time: String!, $arriveBy: Boolean, $num: Int!) {
    plan(
        from: { lat: $fromLat, lon: $fromLon }
        to: { lat: $toLat, lon: $toLon }
        date: $date
        time: $time
        arriveBy: $arriveBy
        numItineraries: $num
    ) {
        itineraries {
            duration
            startTime
            endTime
            legs {
              mode
              distance
              startTime
              endTime
              from { name lat lon }
              to { name lat lon }
              trip { route { shortName longName } }
              headsign
            }
        }
    }
}`;

    const variables = {
        fromLat: req.from.lat,
        fromLon: req.from.lon,
        toLat: req.to.lat,
        toLon: req.to.lon,
        date,
        time,
        arriveBy: req.arriveBy ?? false,
        num: maxItineraries,
    } as any;

    const { getDigitransitApiBaseUrl } = await import("../infrastructure/env.js");
    const url = getDigitransitApiBaseUrl();
    const res = await httpPost<any>(url, { query, variables });
    if (res.status >= 500)
        throw createErrorPayload(ErrorCategory.UPSTREAM_FAILURE, "ROUTING_ERROR", "Routing upstream error");
    if (res.status === 401 || res.status === 403)
        throw createErrorPayload(ErrorCategory.AUTH_FAILURE, "INVALID_API_KEY", "Invalid API key for routing");
    if (res.status !== 200 || res.body?.errors)
        throw createErrorPayload(
            ErrorCategory.UPSTREAM_FAILURE,
            "ROUTING_UNAVAILABLE",
            `Routing endpoint returned ${res.status}: ${JSON.stringify(res.body)}`,
        );

    const itineraries = res.body?.data?.plan?.itineraries ?? [];

    function toIso(ts: any): string {
        if (typeof ts === "number") {
            let ms = ts;
            if (ms < 1e12) ms = ms * 1000; // treat as seconds if value seems seconds-based
            return new Date(ms).toISOString();
        }
        if (typeof ts === "string") {
            const n = Number(ts);
            if (!Number.isNaN(n)) return toIso(n);
            return new Date(ts).toISOString();
        }
        return new Date().toISOString();
    }

    const summaries: ItinerarySummary[] = itineraries.map((it: any) => {
        const durationMinutes = Math.round(((it?.duration ?? 0) as number) / 60);
        const transfers = Math.max(
            0,
            ((it?.legs || []).filter((l: any) => l.mode && l.mode !== "WALK").length || 1) - 1,
        );
        const startTimeIso = toIso(it?.startTime);
        const endTimeIso = toIso(it?.endTime);
        const legs: ItineraryLeg[] = (it?.legs || []).map((l: any) => ({
            mode: l.mode,
            lineName: l?.trip?.route?.shortName ?? undefined,
            from: { name: l?.from?.name || "", lat: l?.from?.lat, lon: l?.from?.lon },
            to: { name: l?.to?.name || "", lat: l?.to?.lat, lon: l?.to?.lon },
            departureTime: toIso(l?.startTime),
            arrivalTime: toIso(l?.endTime),
            headsign: l?.headsign,
            distanceMeters: Math.round(l?.distance ?? 0),
        }));
        const totalWalkDistanceMeters = legs
            .filter((l) => l.mode === "WALK")
            .reduce((sum, l) => sum + l.distanceMeters, 0);
        const id = shortFingerprint({ duration: it?.duration, startTime: startTimeIso, legs: it?.legs }).slice(0, 12);
        return {
            id,
            durationMinutes,
            numberOfTransfers: transfers,
            startTime: startTimeIso,
            endTime: endTimeIso,
            totalWalkDistanceMeters,
            legs,
        } as ItinerarySummary;
    });

    summaries.sort(sortItinerariesDeterministic as any);
    return summaries.slice(0, maxItineraries);
}
