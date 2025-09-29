import { z } from "zod";
import { CoordinateSchema } from "./location.js";

export const ResolvedLocationSchema = z
    .object({
        id: z.string().optional().describe("Optional id (present for STOP)").nullable(),
        name: z.string().describe("Primary display name"),
        primaryLanguage: z.enum(["fi", "en", "sv", "default"]).describe("Primary language of the name"),
        names: z
            .object({ fi: z.string().optional(), en: z.string().optional(), sv: z.string().optional() })
            .partial()
            .optional()
            .describe("Localized name map"),
        type: z.enum(["ADDRESS", "STOP"]).describe("Entity type"),
        coordinate: CoordinateSchema.describe("Coordinate for the resolved location"),
        confidenceScore: z.number().gte(0).lte(1).describe("Normalized confidence 0..1"),
        locality: z.string().optional().describe("Locality or municipality"),
        rawQuery: z.string().describe("Echo of original input used to produce this resolution"),
    })
    .describe("A resolved address or stop");

export type ResolvedLocation = z.infer<typeof ResolvedLocationSchema>;

export const DisambiguationSetSchema = z
    .object({
        candidates: ResolvedLocationSchema.array().min(1).max(5).describe("Candidate resolutions"),
        totalCandidatesFound: z.number().int().gte(1).describe("Total upstream candidates before truncation"),
        truncated: z.boolean().describe("Whether candidates were truncated to maxLookupCandidates"),
        needsClarification: z.literal(true).describe("Invariant: this set requires clarification"),
        autoResolvedThreshold: z.number().gte(0).lte(1).describe("Confidence threshold used for auto-resolution"),
    })
    .describe("A disambiguation set returned when multiple match candidates exist");

export type DisambiguationSet = z.infer<typeof DisambiguationSetSchema>;
