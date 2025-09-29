import { httpPost } from "../infrastructure/httpClient.js";
import { createErrorPayload, ErrorCategory } from "../infrastructure/errorMapping.js";
import { sortDeparturesDeterministic } from "../util/sorting.js";
import { clampHorizonMinutes, isoNow } from "../util/time.js";

export type TimetableRequest = {
    stopId: string;
    horizonMinutes?: number;
    maxDepartures?: number;
};

export type DepartureSummary = {
    scheduledTime: string; // ISO
    routeShortName?: string;
    headsign?: string;
};

const DEFAULT_MAX_DEPARTURES = 5;

export async function getStopTimetable(req: TimetableRequest): Promise<DepartureSummary[]> {
    const horizon = clampHorizonMinutes(req.horizonMinutes);
    const max = req.maxDepartures ?? DEFAULT_MAX_DEPARTURES;

    const now = new Date();

    // Digitransit / OTP exposes stoptimesWithoutPatterns(startTime, timeRange, numberOfDepartures)
    // startTime is in seconds since epoch (OTP 2.x). We'll supply now.
    const startTimeSeconds = Math.floor(now.getTime() / 1000);
    const timeRangeSeconds = horizon * 60; // convert minutes to seconds

    const query = `
query StopTimetable($id: String!, $startTime: Long!, $timeRange: Int!, $numberOfDepartures: Int!) {
    stop(id: $id) {
        name
        stoptimesWithoutPatterns(startTime: $startTime, timeRange: $timeRange, numberOfDepartures: $numberOfDepartures) {
            serviceDay
            scheduledDeparture
            realtimeDeparture
            scheduledArrival
            headsign
                trip { route { shortName longName mode } }
        }
    }
}`;

    const variables = {
        id: req.stopId,
        startTime: startTimeSeconds,
        timeRange: timeRangeSeconds,
        numberOfDepartures: max,
    } as any;

    const { getDigitransitApiBaseUrl } = await import("../infrastructure/env.js");
    const url = getDigitransitApiBaseUrl();
    const res = await httpPost<any>(url, { query, variables });
    if (res.status >= 500)
        throw createErrorPayload(ErrorCategory.UPSTREAM_FAILURE, "TIMETABLE_ERROR", "Upstream timetable error");
    if (res.status === 401 || res.status === 403)
        throw createErrorPayload(ErrorCategory.AUTH_FAILURE, "INVALID_API_KEY", "Invalid API key for timetable");
    if (res.status !== 200 || res.body?.errors)
        throw createErrorPayload(
            ErrorCategory.UPSTREAM_FAILURE,
            "TIMETABLE_UNAVAILABLE",
            `Timetable endpoint returned ${res.status}: ${JSON.stringify(res.body)}`,
        );

    const times = res.body?.data?.stop?.stoptimesWithoutPatterns ?? [];

    const toIso = (v: any): string => {
        if (typeof v === "number") {
            let ms = v;
            if (ms < 1e12) ms = ms * 1000; // treat as seconds epoch
            return new Date(ms).toISOString();
        }
        if (typeof v === "string") {
            const n = Number(v);
            if (!Number.isNaN(n)) return toIso(n);
            return new Date(v).toISOString();
        }
        return isoNow();
    };

    const departures: DepartureSummary[] = times.map((t: any) => {
        // serviceDay is epoch seconds at local midnight; scheduledDeparture is seconds offset; realtimeDeparture may differ
        const sd = typeof t.serviceDay === "number" ? t.serviceDay : undefined;
        const dep = typeof t.realtimeDeparture === "number" ? t.realtimeDeparture : t.scheduledDeparture;
        let absIso: string;
        if (sd != null && typeof dep === "number") {
            absIso = new Date((sd + dep) * 1000).toISOString();
        } else if (typeof dep === "number") {
            absIso = toIso(dep);
        } else if (t.scheduledArrival) {
            absIso = toIso(t.scheduledArrival);
        } else {
            absIso = isoNow();
        }
        return {
            scheduledTime: absIso,
            routeShortName: t?.trip?.route?.shortName,
            routeLongName: t?.trip?.route?.longName,
            headsign: t?.headsign,
            mode: t?.trip?.route?.mode,
            serviceDay: sd != null ? new Date(sd * 1000).toISOString().slice(0, 10) : absIso.slice(0, 10),
        } as DepartureSummary;
    });

    departures.sort(sortDeparturesDeterministic as any);
    return departures.slice(0, max);
}
