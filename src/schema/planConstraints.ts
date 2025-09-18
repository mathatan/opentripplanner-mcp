/**
 * PlanConstraints & AccessibilityPrefs Zod schemas
 *
 * Spec references:
 * - Plan guidance and ranges: [`specs/001-opentripplanner-mcp-server/plan.md`](specs/001-opentripplanner-mcp-server/plan.md:1)
 * - Data-model reference: [`specs/001-opentripplanner-mcp-server/data-model.md`](specs/001-opentripplanner-mcp-server/data-model.md:1)
 * - Tests: [`tests/schema/planConstraints.schema.test.ts`](tests/schema/planConstraints.schema.test.ts:1)
 *
 * Exports required by T033:
 * - export const AccessibilityPrefsSchema
 * - export type AccessibilityPrefs = z.infer<typeof AccessibilityPrefsSchema>
 * - export const PlanConstraintsSchema
 * - export type PlanConstraints = z.infer<typeof PlanConstraintsSchema>
 *
 * Notes:
 * - All object schemas are `.strict()` to reject unknown keys.
 * - Numeric fields use Number.isFinite refinements to reject NaN and Infinity.
 * - The only runtime enrichment performed is adding a `warnings` array when
 *   unsupported accessibility prefs are requested (per tests).
 */

import { z } from "zod";

/**
 * Accessibility preferences used by plan constraints.
 * Only the boolean flags referenced by tests are accepted.
 */
export const AccessibilityPrefsSchema = z
    .object({
        // Basic wheelchair preference; maps to OTP wheelchair accessibility flag
        wheelchair: z.boolean().optional(),
        stepFree: z.boolean().optional(),
        fewTransfers: z.boolean().optional(),
        lowWalkingDistance: z.boolean().optional(),
        prioritizeLowFloor: z.boolean().optional(),
    })
    .strict();

export type AccessibilityPrefs = z.infer<typeof AccessibilityPrefsSchema>;

/**
 * Base PlanConstraints schema (strict).
 *
 * Fields implemented to satisfy tests:
 * - maxWalkingDistance: number (meters) >= 0 and <= 3000, default 1500
 * - maxTransfers: integer >= 0 and <= 8, default 4
 * - optimize: enum('balanced' | 'few_transfers' | 'shortest_time'), default 'balanced'
 * - accessibilityPrefs: AccessibilityPrefsSchema (optional)
 *
 * No additional top-level keys are allowed.
 */
const _PlanConstraintsBase = z
    .object({
        maxWalkingDistance: z
            .number()
            .min(0, { message: "maxWalkingDistance must be >= 0" })
            .max(3000, { message: "maxWalkingDistance must be <= 3000" })
            .default(1500)
            .refine(Number.isFinite, { message: "maxWalkingDistance must be a finite number" }),
        maxTransfers: z
            .number()
            .int({ message: "maxTransfers must be an integer" })
            .min(0, { message: "maxTransfers must be >= 0" })
            .max(8, { message: "maxTransfers must be <= 8" })
            .default(4)
            .refine(Number.isFinite, { message: "maxTransfers must be a finite number" }),
        optimize: z.enum(["balanced", "few_transfers", "shortest_time"]).default("balanced"),
        accessibilityPrefs: AccessibilityPrefsSchema.optional(),
    })
    .strict();

/**
 * PlanConstraintsSchema
 *
 * Validates input (strictly) and then enriches the result by adding a `warnings`
 * array when provider-unsupported accessibility flags are requested. The tests
 * expect this `warnings` array and a specific warning code when
 * accessibilityPrefs.prioritizeLowFloor === true.
 */
export const PlanConstraintsSchema = _PlanConstraintsBase.transform((val) => {
    const warnings: Array<{ code: string }> = [];
    if (val.accessibilityPrefs?.prioritizeLowFloor === true) {
        warnings.push({ code: "unsupported-accessibility-flag" });
    }
    return { ...val, warnings };
});

export type PlanConstraints = z.infer<typeof PlanConstraintsSchema>;
