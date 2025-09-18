import { z } from "zod";
import { CoordinateSchema } from "./coordinate.js";

/**
 * Raw source values aligned with the spec:
 * - 'geocode' | 'user-variable' | 'input'
 *
 * Conservative set chosen so arbitrary strings (e.g. 'invalid') will fail.
 */
export const RawSourceEnum = z.enum(["geocode", "user-variable", "input"] as const);

/**
 * Location reference schema
 *
 * - coordinate is required
 * - address must be a single-line string (no '\n') and will be trimmed
 * - .strict() used to reject unknown keys
 */
export const LocationRefSchema = z.preprocess(
    (inp) => {
        // Do not mutate the original input. Build a normalized shallow copy.
        if (!inp || typeof inp !== "object") return inp;

        const copy: Record<string, any> = { ...(inp as Record<string, any>) };

        // If no explicit discriminant, try to infer it from provided keys
        if (!("type" in copy)) {
            if ("coordinate" in copy || ("lat" in copy && "lon" in copy)) copy.type = "coordinate";
            else if ("id" in copy) copy.type = "stopId";
        }

        // Preserve legacy `label` as an optional field (do not delete). If name missing, keep label available for downstream logic.
        // Trim single-line address if present
        if ("address" in copy && typeof copy.address === "string") {
            copy.address = copy.address.trim();
        }

        return copy;
    },
    z
        .discriminatedUnion("type", [
            z
                .object({
                    type: z.literal("coordinate"),
                    coordinate: CoordinateSchema,
                    // lightweight mnemonic or client label preserved
                    label: z.string().optional(),
                    name: z.string().optional(),
                    address: z
                        .string()
                        .optional()
                        .refine((s) => !s || !s.includes("\n"), { message: "Address must be single-line" }),
                    rawSource: RawSourceEnum.optional(),
                })
                .strict(),
            z
                .object({
                    type: z.literal("stopId"),
                    id: z.string(),
                    label: z.string().optional(),
                    name: z.string().optional(),
                    rawSource: RawSourceEnum.optional(),
                })
                .strict(),
        ])
        .describe("Location reference schema"),
);

export type LocationRef = z.infer<typeof LocationRefSchema>;
