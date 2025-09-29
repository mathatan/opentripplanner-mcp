import { getStopTimetable } from "../services/timetableService.js";
import { createErrorPayload, ErrorCategory } from "../infrastructure/errorMapping.js";

export type TimetableInput = {
    stopId?: string;
    horizonMinutes?: number;
    maxDepartures?: number;
};

export async function getStopTimetableTool(input: TimetableInput) {
    if (!input || !input.stopId) {
        throw createErrorPayload(ErrorCategory.VALIDATION, "MISSING_STOP_ID", "stopId is required");
    }
    const res = await getStopTimetable({
        stopId: input.stopId,
        horizonMinutes: input.horizonMinutes,
        maxDepartures: input.maxDepartures,
    });
    return { departures: res };
}
