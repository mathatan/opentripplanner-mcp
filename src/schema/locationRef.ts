import { z } from "zod";
import { CoordinateSchema, type Coordinate } from "./coordinate.ts";

/**
 * LocationRef schema (T032)
 *
 * Spec references:
 * - specs/001-opentripplanner-mcp-server/tasks-phase-3.md
 * - specs/001-opentripplanner-mcp-server/data-model.md
 *
 * Tests:
 * - tests/schema/locationRef.schema.test.ts
 *
 * Discriminated union on the `type` property with the following strict variants:
 * - { type: 'stopId', id: string }
 * - { type: 'coordinate', coordinate: Coordinate }
 * - { type: 'placeId', id: string }
 *
 * Each variant is `.strict()` to reject extraneous keys.
 * A small preprocess step is used to infer `type` when absent (tests rely on this),
 * and to trim single-line `address` if present. No other runtime transforms are applied.
 */

/* Allowed rawSource values used by some variants/tests */
export const RawSourceEnum = z.enum(["geocode", "user-variable", "input"] as const);

/* Variant schemas (strict) */
const StopIdVariant = z
  .object({
    type: z.literal("stopId"),
    id: z.string(),
    rawSource: RawSourceEnum.optional(),
  })
  .strict();

const CoordinateVariant = z
  .object({
    type: z.literal("coordinate"),
    coordinate: CoordinateSchema,
    rawSource: RawSourceEnum.optional(),
    address: z
      .string()
      .optional()
      .refine((s) => !s || !s.includes("\n"), { message: "Address must be single-line" }),
  })
  .strict();

const PlaceIdVariant = z
  .object({
    type: z.literal("placeId"),
    id: z.string(),
    rawSource: RawSourceEnum.optional(),
  })
  .strict();

/* Discriminated union using the 'type' property with a lightweight preprocess */
export const LocationRefSchema = z.preprocess(
  (inp) => {
    if (!inp || typeof inp !== "object") return inp;

    const copy: Record<string, any> = { ...(inp as Record<string, any>) };

    // Infer discriminant if missing (tests expect type inference)
    if (!("type" in copy)) {
      if ("coordinate" in copy || ("lat" in copy && "lon" in copy)) copy.type = "coordinate";
      else if ("id" in copy) copy.type = "stopId";
    }

    // Trim single-line address if present
    if ("address" in copy && typeof copy.address === "string") {
      copy.address = copy.address.trim();
    }

    return copy;
  },
  z.discriminatedUnion("type", [StopIdVariant, CoordinateVariant, PlaceIdVariant])
);

export type LocationRef = z.infer<typeof LocationRefSchema>;

/**
 * Helper for exhaustive checks in switch statements.
 * Use `assertNever(value)` in a `default:` branch to get a compile-time error if a new discriminant is added.
 */
export function assertNever(x: never): never {
  throw new Error("Unexpected value in exhaustive check: " + String(x));
}
