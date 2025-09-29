import { z } from "zod";
import { CoordinateSchema, LocationQueryInputSchema } from "./location.js";
import { ResolvedLocationSchema } from "./locationResolution.js";

export const LegSchema = z
    .object({
        mode: z.string().describe("Transport mode"),
        lineName: z.string().optional().describe("Line short name"),
        from: CoordinateSchema.merge(z.object({ name: z.string().describe("Stop/place name") })),
        to: CoordinateSchema.merge(z.object({ name: z.string().describe("Stop/place name") })),
        departureTime: z.string().datetime().describe("ISO 8601 departure time"),
        arrivalTime: z.string().datetime().describe("ISO 8601 arrival time"),
        headsign: z.string().optional().describe("Direction/headsign"),
        distanceMeters: z.number().int().nonnegative().describe("Distance in meters"),
    })
    .describe("A single itinerary leg");

export const ItinerarySchema = z
    .object({
        id: z.string().describe("Deterministic itinerary id (hash of legs+times)"),
        durationMinutes: z.number().int().positive().describe("Total duration in minutes"),
        startTime: z.string().datetime().describe("ISO 8601 start time"),
        endTime: z.string().datetime().describe("ISO 8601 end time"),
        numberOfTransfers: z.number().int().nonnegative().describe("Number of transfers"),
        totalWalkDistanceMeters: z.number().int().nonnegative().describe("Total walking distance"),
        legs: LegSchema.array().min(1).describe("Ordered legs of itinerary"),
    })
    .describe("A full itinerary");

export const RouteRequestInputSchema = z
    .object({
        origin: z.union([LocationQueryInputSchema, ResolvedLocationSchema]).describe("Origin specifier"),
        destination: z.union([LocationQueryInputSchema, ResolvedLocationSchema]).describe("Destination specifier"),
        departureTime: z.string().datetime().optional(),
        arrivalTime: z.string().datetime().optional(),
        searchWindowMinutes: z.number().int().positive().max(120).default(45),
        journeyPreset: z.enum(["FASTEST", "FEWEST_TRANSFERS", "LEAST_WALK"]).default("FASTEST"),
    })
    .refine((v) => (v.departureTime ? !v.arrivalTime : !!v.arrivalTime), {
        message: "Specify exactly one of departureTime or arrivalTime",
        path: ["departureTime", "arrivalTime"],
    })
    .describe("Route planning input");

export type Leg = z.infer<typeof LegSchema>;
export type Itinerary = z.infer<typeof ItinerarySchema>;
export type RouteRequestInput = z.infer<typeof RouteRequestInputSchema>;
