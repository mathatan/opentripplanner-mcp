import { z } from "zod";
import { CoordinateSchema } from "./coordinate.js";
import { WarningSchema } from "./error.js";

/**
 * Single geocode result returned by geocoding providers.
 *
 * - name: human readable place name
 * - coordinates: lat/lon pair validated by CoordinateSchema
 * - type: one of 'address' | 'poi' | 'stop'
 * - confidence: number in range [0,1]
 * - language: optional language hint limited to 'fi'|'sv'|'en'
 * - id: optional identifier from upstream provider
 * - boundingBox: optional nullable object { minLon, maxLon, minLat, maxLat }
 */
export const GeocodeResultSchema = z
    .object({
        name: z.string(),
        coordinates: CoordinateSchema,
        type: z.enum(["address", "poi", "stop"]),
        confidence: z.number().gte(0).lte(1),
        language: z.enum(["fi", "sv", "en"]).optional(),
        // Pelias-aligned optional metadata
        label: z.string().optional(),
        gid: z.string().optional(),
        rawLayer: z.string().optional(),
        rawSource: z.string().optional(),
        sourceId: z.string().optional(),
        // distance from bias/focus point in kilometers
        distanceKm: z.number().nonnegative().optional(),
        zones: z.array(z.string()).optional(),
        id: z.string().optional(),
        boundingBox: z
            .object({
                minLon: z.number(),
                maxLon: z.number(),
                minLat: z.number(),
                maxLat: z.number(),
            })
            .nullable()
            .optional(),
    })
    .strict()
    .describe("GeocodeResult");

export type GeocodeResult = z.infer<typeof GeocodeResultSchema>;

// Use unified WarningSchema from error module to enforce kebab-case codes

/**
 * Envelope for geocoding responses.
 *
 * The transform sorts results by confidence descending to ensure callers
 * always receive results ordered highest-confidence first.
 */
export const GeocodeResponseSchema = z
    .object({
        query: z.string(),
        // requested language hint
        language: z.enum(["fi", "sv", "en"]).optional(),
        correlationId: z.string().optional(),
        results: z.array(GeocodeResultSchema),
        // requested page/size; per-spec default 10, hard cap 40
        size: z.number().int().positive().optional(),
        truncated: z.boolean().optional(),
        warnings: z.array(WarningSchema).optional(),
    })
    .strict()
    .transform((obj) => {
        // Copy results and sort by confidence desc
        const sorted = (obj.results ?? []).slice().sort((a, b) => b.confidence - a.confidence);

        // Determine effective requested size (default 10, hard cap 40)
        const requested =
            typeof obj.size === "number" && Number.isFinite(obj.size) ? Math.max(0, Math.floor(obj.size)) : 10;
        const effectiveSize = Math.min(requested, 40);

        const outWarnings = (obj.warnings ?? []).slice();

        let finalResults = sorted;
        if (sorted.length > effectiveSize) {
            finalResults = sorted.slice(0, effectiveSize);
            // set truncated flag and add a truncated-results warning if not already present
            if (!outWarnings.some((w) => w && w.code === "truncated-results")) {
                outWarnings.push({ code: "truncated-results", message: `Results truncated to ${effectiveSize}` });
            }
        }

        return {
            ...obj,
            results: finalResults,
            truncated: obj.truncated ?? sorted.length > effectiveSize,
            warnings: outWarnings.length ? outWarnings : undefined,
        };
    });

export type GeocodeResponse = z.infer<typeof GeocodeResponseSchema>;
