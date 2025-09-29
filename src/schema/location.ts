import { z } from "zod";

export const CoordinateSchema = z
    .object({
        lat: z.number().gte(-90).lte(90).describe("Latitude in degrees, -90..90"),
        lon: z.number().gte(-180).lte(180).describe("Longitude in degrees, -180..180"),
    })
    .describe("Geographic coordinate pair");

export type Coordinate = z.infer<typeof CoordinateSchema>;

export const LocationQueryInputSchema = z
    .object({
        rawText: z
            .string()
            .min(1)
            .max(200)
            .transform((s) => s.trim())
            .describe("Free text location query, trimmed, 1..200 chars"),
        focusPoint: CoordinateSchema.optional().describe("Optional focus point to bias results"),
        maxDistanceMeters: z
            .number()
            .int()
            .positive()
            .max(200000)
            .optional()
            .describe("Optional max distance in meters; requires focusPoint if present"),
        languagePreference: z.enum(["fi", "en", "sv"]).optional().describe("Optional language hint"),
    })
    .refine((v) => !v.maxDistanceMeters || !!v.focusPoint, {
        message: "maxDistanceMeters requires focusPoint",
        path: ["maxDistanceMeters"],
    })
    .describe("Inbound free-text location lookup request");

export type LocationQueryInput = z.infer<typeof LocationQueryInputSchema>;
