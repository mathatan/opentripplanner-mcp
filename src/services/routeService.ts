import { httpGet } from "../infrastructure/httpClient.js";
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

export type ItinerarySummary = {
    id: string;
    durationMinutes: number;
    numberOfTransfers: number;
    startTime: string;
};

const DEFAULT_MAX_ITINERARIES = 3;

export async function planRoute(req: RouteRequest): Promise<ItinerarySummary[]> {
    const maxItineraries = req.maxItineraries ?? DEFAULT_MAX_ITINERARIES;

    const query = `
query Plan($fromLat: Float!, $fromLon: Float!, $toLat: Float!, $toLon: Float!, $date: String!, $time: String!, $arriveBy: Boolean!) {
  plan(input: { from: { lat: $fromLat, lon: $fromLon }, to: { lat: $toLat, lon: $toLon }, date: $date, time: $time, arriveBy: $arriveBy }) {
    itineraries {
      duration
      startTime
      legs { mode }
    }
  }
}
`;

    const dt = req.departureTimeIso ? new Date(req.departureTimeIso) : new Date();
    const vars = {
        fromLat: req.from.lat,
        fromLon: req.from.lon,
        toLat: req.to.lat,
        toLon: req.to.lon,
        date: dt.toISOString().slice(0, 10),
        time: dt.toTimeString().slice(0, 8),
        arriveBy: !!req.arriveBy,
    } as any;

    const url = `https://api.digitransit.fi/routing/v1/routers/default/plan`;
    // Digitransit routing accepts GraphQL POSTs; but httpGet is GET-only - use GET with query param wrapper
    const q = new URLSearchParams();
    q.set("query", query);
    q.set("variables", JSON.stringify(vars));

    const fullUrl = `https://api.digitransit.fi/graphql?${q.toString()}`;
    const res = await httpGet<any>(fullUrl);
    if (res.status >= 500)
        throw createErrorPayload(ErrorCategory.UPSTREAM_FAILURE, "ROUTING_ERROR", "Routing upstream error");
    if (res.status === 401 || res.status === 403)
        throw createErrorPayload(ErrorCategory.AUTH_FAILURE, "INVALID_API_KEY", "Invalid API key for routing");

    const itineraries = res.body?.data?.plan?.itineraries ?? [];
    const summaries = itineraries.map((it: any) => {
        const durationMinutes = Math.round((it.duration ?? 0) / 60);
        const transfers = (it.legs || []).filter((l: any) =>
            l.mode === "TRANSFER" || l.mode === "BUS" ? false : false,
        ).length; // placeholder
        const start = it.startTime ?? new Date().toISOString();
        const id = shortFingerprint({ duration: it.duration, startTime: start, legs: it.legs }).slice(0, 12);
        return {
            id,
            durationMinutes,
            numberOfTransfers: transfers,
            startTime: start,
        } as ItinerarySummary;
    });

    summaries.sort(sortItinerariesDeterministic as any);
    return summaries.slice(0, maxItineraries);
}
