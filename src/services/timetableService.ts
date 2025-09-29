import { httpGet } from "../infrastructure/httpClient.js";
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
    const until = new Date(now.getTime() + horizon * 60 * 1000);

    const query = `
query Departures($stopId: String!, $start: String!, $end: String!) {
  stop(id: $stopId) {
    stoptimesForServiceDate(startTime: $start, endTime: $end) {
      scheduledArrival
      trip { route { shortName } }
      headsign
    }
  }
}
`;

    const vars = {
        stopId: req.stopId,
        start: now.toISOString(),
        end: until.toISOString(),
    } as any;

    const q = new URLSearchParams();
    q.set("query", query);
    q.set("variables", JSON.stringify(vars));
    const fullUrl = `https://api.digitransit.fi/graphql?${q.toString()}`;

    const res = await httpGet<any>(fullUrl);
    if (res.status >= 500)
        throw createErrorPayload(ErrorCategory.UPSTREAM_FAILURE, "TIMETABLE_ERROR", "Upstream timetable error");

    const entries = res.body?.data?.stop ?? { stoptimesForServiceDate: [] };
    const times = entries?.stoptimesForServiceDate ?? [];

    const departures = times.map(
        (t: any) =>
            ({
                scheduledTime: t.scheduledArrival ?? isoNow(),
                routeShortName: t?.trip?.route?.shortName,
                headsign: t.headsign,
            }) as DepartureSummary,
    );

    departures.sort(sortDeparturesDeterministic as any);
    return departures.slice(0, max);
}
