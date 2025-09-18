// src/schema/departure.ts
/**
 * T036 Implement Departure & DepartureResponse zod schemas
 *
 * Spec & references:
 * - specs/001-opentripplanner-mcp-server/contracts/get_departures.md
 * - tests/schema/departure.schema.test.ts
 *
 * Exports:
 * - export const DepartureSchema
 * - export type Departure
 * - export const DepartureResponseSchema
 * - export type DepartureResponse
 */
import { z } from "zod";
import { WarningSchema } from "./error.js";

/**
 * Helpers
 */
const isParsableDate = (val: unknown): val is string => typeof val === "string" && !Number.isNaN(Date.parse(val));

const serviceDateRegex = /^\d{4}-\d{2}-\d{2}$/;
const isValidServiceDate = (val: unknown): val is string =>
    typeof val === "string" && serviceDateRegex.test(val) && !Number.isNaN(Date.parse(val + "T00:00:00Z"));

/**
 * Departure schema
 *
 * Notes:
 * - Keeps original-field names (line, mode, destination, etc.) that existing tests use.
 * - Preprocess maps cancelled: true -> status = 'cancelled' before validation.
 * - Numeric delaySeconds is validated as finite and non-negative.
 * - All objects are strict.
 */
export const DepartureSchema = z.preprocess(
    (raw: any) => {
        if (raw && raw.cancelled === true && raw.status == null) {
            raw.status = "cancelled";
        }
        return raw;
    },
    z
        .object({
            line: z.string().optional(),
            mode: z.string().optional(),
            destination: z.string().optional(),
            stopId: z.string().optional(),
            serviceDate: z
                .string()
                .optional()
                .refine((v) => v === undefined || isValidServiceDate(v), { message: "serviceDate must be YYYY-MM-DD" }),
            scheduledTime: z
                .string()
                .optional()
                .refine((v) => v === undefined || isParsableDate(v), {
                    message: "scheduledTime must be an ISO 8601 / RFC3339 parseable string",
                }),
            realtimeTime: z
                .string()
                .nullable()
                .optional()
                .refine((v) => v === undefined || v === null || isParsableDate(v), {
                    message: "realtimeTime must be an ISO 8601 / RFC3339 parseable string or null when provided",
                }),
            delaySeconds: z
                .number()
                .min(0)
                .refine(Number.isFinite, { message: "delaySeconds must be a finite number" })
                .optional(),
            status: z.enum(["on-time", "delayed", "cancelled", "unknown"]).optional(),
            lineRef: z.string().optional(),
            platform: z.union([z.string(), z.undefined()]).optional(),
            cancelled: z.boolean().optional(),
        })
        .strict(),
);

export type Departure = z.infer<typeof DepartureSchema>;

/**
 * DepartureResponse schema
 *
 * - matches tests that use `departures`, `realtimeUsed`, `dataFreshness`, etc.
 * - sorts departures by effective time (realtimeTime || scheduledTime) ascending in a preprocess step.
 * - strict object.
 */
export const DepartureResponseSchema = z.preprocess(
    (raw: any) => {
        if (raw && Array.isArray(raw.departures)) {
            // sort by effective departure time (realtimeTime || scheduledTime) ascending
            raw.departures.sort((a: any, b: any) => {
                const taRaw = a && (a.realtimeTime ?? a.scheduledTime);
                const tbRaw = b && (b.realtimeTime ?? b.scheduledTime);
                const ta = isParsableDate(taRaw) ? Date.parse(taRaw) : Number.POSITIVE_INFINITY;
                const tb = isParsableDate(tbRaw) ? Date.parse(tbRaw) : Number.POSITIVE_INFINITY;
                return ta - tb;
            });
        }
        return raw;
    },
    z
        .object({
            departures: z.array(DepartureSchema),
            realtimeUsed: z.boolean().optional(),
            scheduleType: z.enum(["realtime", "scheduled", "mixed"]).optional(),
            dataFreshness: z
                .string()
                .optional()
                .refine((v) => v === undefined || isParsableDate(v), {
                    message: "dataFreshness must be an ISO 8601 / RFC3339 parseable string",
                }),
            correlationId: z.string().optional(),
            warnings: z.array(WarningSchema).optional(),
            truncated: z.boolean().optional(),
        })
        .strict(),
);

export type DepartureResponse = z.infer<typeof DepartureResponseSchema>;