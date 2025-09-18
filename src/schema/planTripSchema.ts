import { z } from "zod";
import { CoordinateSchema } from "./coordinate.js";

/**
 * PlanTripSchema
 * - from: coordinate
 * - to: coordinate
 * - time?: ISO 8601 datetime with offset allowed
 * Strict schema; rejects unknown keys.
 * Refines to reject identical origin/destination coordinates.
 */
export const PlanTripSchema = z
    .object({
        from: CoordinateSchema,
        to: CoordinateSchema,
        time: z.string().datetime({ offset: true }).optional(),
    })
    .strict()
    .refine((obj) => !(obj.from.lat === obj.to.lat && obj.from.lon === obj.to.lon), {
        message: "origin and destination must differ",
        path: ["to"],
    });

export type PlanTripInput = z.infer<typeof PlanTripSchema>;
