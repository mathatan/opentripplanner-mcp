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
        // Coerce legacy shapes: map 'label' -> 'name' and infer 'type' when possible
        if (inp && typeof inp === "object") {
            // @ts-ignore
            if (!("type" in inp)) {
                // @ts-ignore
                if ("coordinate" in inp) inp.type = "coordinate";
                // @ts-ignore
                else if ("id" in inp) inp.type = "stopId";
            }
            // @ts-ignore
            if ("label" in inp) {
                // preserve explicit name if present, otherwise copy from label
                // @ts-ignore
                if (!("name" in inp)) inp.name = inp.label;
                // remove legacy key to satisfy .strict()
                // @ts-ignore
                delete inp.label;
            }
        }
        return inp;
    },
    z
        .discriminatedUnion("type", [
            z
                .object({
                    type: z.literal("coordinate"),
                    coordinate: CoordinateSchema,
                    name: z.string().optional(),
                    address: z
                        .preprocess(
                            (val) => (typeof val === "string" ? val.trim() : val),
                            z.string().refine((s) => !s.includes("\n"), { message: "Address must be single-line" }),
                        )
                        .optional(),
                    rawSource: RawSourceEnum.optional(),
                })
                .strict(),
            z
                .object({
                    type: z.literal("stopId"),
                    id: z.string(),
                    name: z.string().optional(),
                    rawSource: RawSourceEnum.optional(),
                })
                .strict(),
            // Add other variants as specified in data-model.md
        ])
        .describe("Location reference schema"),
);

export type LocationRef = z.infer<typeof LocationRefSchema>;
