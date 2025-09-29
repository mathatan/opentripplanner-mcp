import { z } from "zod";

export const TimetableRequestInputSchema = z
    .object({
        stopId: z
            .string()
            .regex(/^[A-Z0-9:_-]+$/)
            .describe("Stop identifier pattern"),
        maxDepartures: z.number().int().positive().max(5).default(3),
        horizonMinutes: z.number().int().positive().max(90).default(45),
    })
    .describe("Timetable request input");

export const DepartureSchema = z
    .object({
        scheduledTime: z.string().datetime().describe("ISO 8601 scheduled time"),
        routeShortName: z.string().describe("Short name of the route"),
        routeLongName: z.string().optional(),
        headsign: z.string().optional(),
        mode: z.string().describe("Mode of transport"),
        serviceDay: z.string().describe("Service day (ISO date)"),
    })
    .describe("A scheduled departure entry");

export type TimetableRequestInput = z.infer<typeof TimetableRequestInputSchema>;
export type Departure = z.infer<typeof DepartureSchema>;
