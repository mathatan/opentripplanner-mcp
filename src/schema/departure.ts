// src/schema/departure.ts
/* T017 Implement Departure & DepartureResponse zod schemas */
import { z } from "zod";
import { WarningSchema } from "./error.js";

const isIsoString = (val: unknown): val is string => {
    if (typeof val !== "string") return false;
    try {
        return new Date(val).toISOString() === val;
    } catch {
        return false;
    }
};

const isParsableDate = (val: unknown): val is string => typeof val === "string" && !Number.isNaN(Date.parse(val));

export const DepartureSchema = z.preprocess(
    (raw: any) => {
        // If caller provided cancelled: true but no status, set status to 'cancelled'
        if (raw && raw.cancelled === true && raw.status == null) {
            raw.status = "cancelled";
        }
        return raw;
    },
    z
        .object({
            line: z.string().optional(),
            mode: z.string(),
            destination: z.string().optional(),
            stopId: z.string().optional(),
            scheduledTime: z.string().datetime({ offset: true }).optional(),
            realtimeTime: z
                .string()
                .nullable()
                .optional()
                .refine((v) => v === undefined || v === null || isParsableDate(v), {
                    message: "realtimeTime must be an ISO-like string or null",
                }),
            delaySeconds: z.union([z.number().int(), z.null()]).optional(),
            status: z.enum(["on_time", "delayed", "cancelled", "scheduled_only"]).optional(),
            platform: z.union([z.string(), z.null()]).optional(),
            cancelled: z.boolean().optional(),
        })
        .strict(),
);

export type Departure = z.infer<typeof DepartureSchema>;

export const DepartureResponseSchema = z.preprocess(
    (raw: any) => {
        // Sort departures in-place by scheduledTime ascending so tests that inspect the original object see the ordering
        if (raw && Array.isArray(raw.departures)) {
            raw.departures.sort((a: any, b: any) => {
                const ta = a && a.scheduledTime ? new Date(a.scheduledTime).getTime() : Number.POSITIVE_INFINITY;
                const tb = b && b.scheduledTime ? new Date(b.scheduledTime).getTime() : Number.POSITIVE_INFINITY;
                return ta - tb;
            });
        }
        return raw;
    },
    z
        .object({
            departures: z.array(DepartureSchema),
            realtimeUsed: z.boolean(),
            // Optional scheduleType at response-level to describe overall source
            scheduleType: z.enum(["realtime", "scheduled", "mixed"]).optional(),
            dataFreshness: z.string().datetime({ offset: true }),
            correlationId: z.string().optional(),
            warnings: z.array(WarningSchema).optional(),
            truncated: z.boolean().optional(),
        })
        .strict(),
);

export type DepartureResponse = z.infer<typeof DepartureResponseSchema>;
