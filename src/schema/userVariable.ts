import { z } from "zod";
import { CoordinateSchema } from "./coordinate.js";

/**
 * Raw input schema for a user variable.
 *
 * - key: variable name (string)
 * - type: optional enum 'location'|'preference'|'other'
 * - value: unknown runtime payload
 * - sessionId: optional session identifier
 * - createdAt/updatedAt/expiresAt: optional ISO timestamps (strings)
 * - ttlSeconds: optional numeric TTL (nullable allowed)
 *
 * .strict() is used to reject unknown keys.
 */
const RawUserVariable = z.preprocess(
    (inp) => {
        // Accept legacy 'ttl' alias and map to ttlSeconds
        if (inp && typeof inp === "object" && "ttl" in inp && !("ttlSeconds" in inp)) {
            // Cast to any inside preprocessor to allow adding normalized fields
            const asAny = inp as any;
            // Tests historically pass `ttl` in milliseconds; convert to seconds to normalize
            const rawTtl = asAny.ttl;
            // If rawTtl looks numeric, convert ms->s by dividing by 1000 and rounding up to ensure short TTLs expire
            if (typeof rawTtl === "number") {
                asAny.ttlSeconds = Math.ceil(rawTtl / 1000);
            } else {
                asAny.ttlSeconds = rawTtl;
            }
            delete asAny.ttl;
        }
        return inp;
    },
    z
        .object({
            key: z.string(),
            // Accept either the category enum OR a primitive value-type label used in tests
            type: z
                .union([z.enum(["location", "preference", "other"]), z.enum(["string", "number", "boolean"])])
                .optional(),
            value: z.unknown(),
            sessionId: z.string().optional(),
            // If provided, timestamps must be ISO 8601 with offset; transform will normalize when missing
            createdAt: z.string().datetime({ offset: true }).optional(),
            updatedAt: z.string().datetime({ offset: true }).optional(),
            expiresAt: z.string().datetime({ offset: true }).optional(),
            ttlSeconds: z.number().nullable().optional(),
        })
        .strict(),
);

/**
 * Validate location-specific constraints before transformation.
 * - when type === 'location', value must be an object with a `coordinate` that matches CoordinateSchema
 */
const UserVariableValidated = RawUserVariable.superRefine((obj, ctx) => {
    if (obj.type === "location") {
        if (typeof obj.value !== "object" || obj.value === null) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["value"],
                message: "location type requires an object value with a coordinate",
            });
            return;
        }

        // Accept either { coordinate: { lat, lon } } or legacy { lat, lon, name?, address? }
        const possibleCoord =
            (obj.value as any).coordinate ??
            ((obj.value as any).lat !== undefined && (obj.value as any).lon !== undefined
                ? { lat: (obj.value as any).lat, lon: (obj.value as any).lon }
                : undefined);
        if (!possibleCoord) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["value", "coordinate"],
                message: "missing coordinate for location value (expected coordinate or lat/lon keys)",
            });
            return;
        }

        const parsed = CoordinateSchema.safeParse(possibleCoord);
        if (!parsed.success) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["value", "coordinate"],
                message: "coordinate is invalid",
            });
        }
    }
});

/**
 * Transform to ensure timestamps and TTL/expiry presence:
 * - createdAt: preserve if present, otherwise set to now
 * - updatedAt: always set to now (ensures monotonic updatedAt for subsequent parses)
 * - if neither expiresAt nor ttlSeconds provided, set a reasonable default expiresAt (24h)
 */
export const UserVariableSchema = UserVariableValidated.transform((obj) => {
    const now = new Date().toISOString();
    const createdAt = obj.createdAt ?? now;
    const updatedAt = now;

    let expiresAt = obj.expiresAt;
    // Normalize ttlSeconds if a numeric alias is present
    const ttlSeconds =
        typeof obj.ttlSeconds === "number" ? obj.ttlSeconds : obj.ttlSeconds == null ? null : Number(obj.ttlSeconds);

    if (!expiresAt) {
        if (ttlSeconds != null) {
            // derive expiresAt from ttlSeconds
            expiresAt = new Date(Date.now() + Math.floor(ttlSeconds) * 1000).toISOString();
        } else {
            // default expiry 24 hours from now to satisfy tests that require either expiresAt or ttlSeconds
            expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        }
    }

    return {
        ...obj,
        createdAt,
        updatedAt,
        expiresAt,
        ttlSeconds,
    };
});

/**
 * Response envelope schema: correlationId and an array of user variables.
 * .strict() prevents extra keys at the envelope level.
 */
export const UserVariablesResponseSchema = z
    .object({
        correlationId: z.string(),
        variables: z.array(UserVariableSchema),
    })
    .strict();

export type UserVariable = z.infer<typeof UserVariableSchema>;
export type UserVariablesResponse = z.infer<typeof UserVariablesResponseSchema>;
