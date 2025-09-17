/**
 * PlanConstraints & AccessibilityPrefs Zod schemas
 *
 * - AccessibilityPrefsSchema: strict object with optional boolean flags
 * - PlanConstraintsSchema: strict object with defaults, validation limits and a transform
 *   that injects a `warnings` array when unsupported accessibility flags are requested.
 *
 * Note: This module is side-effect free and ESM.
 */
import { z } from 'zod';

export const AccessibilityPrefsSchema = z
  .object({
    stepFree: z.boolean().optional(),
    fewTransfers: z.boolean().optional(),
    lowWalkingDistance: z.boolean().optional(),
    prioritizeLowFloor: z.boolean().optional(),
  })
  .strict();

const _PlanConstraintsBase = z
  .object({
    // integer >= 0, <= 3000, default 1500
    maxWalkingDistance: z.number().int().nonnegative().max(3000).default(1500),
    // integer >= 0, <= 8, default 4
    maxTransfers: z.number().int().nonnegative().max(8).default(4),
    // allowed optimization strategies with default (spec: balanced | few_transfers | shortest_time)
    optimize: z.enum(['balanced', 'few_transfers', 'shortest_time']).default('balanced'),
    accessibilityPrefs: AccessibilityPrefsSchema.optional(),
    // optional language for constraints per spec
    language: z.enum(['fi', 'sv', 'en']).optional(),
  })
  .strict();

/**
 * The exported PlanConstraintsSchema applies validation (via _PlanConstraintsBase)
 * and then transforms the validated result to inject a `warnings` array when
 * accessibilityPrefs.prioritizeLowFloor === true.
 *
 * The transform runs after validation so invalid values are rejected before
 * we attempt to enrich the output.
 */
export const PlanConstraintsSchema = _PlanConstraintsBase.transform((val) => {
  const warnings: Array<{ code: string }> = [];
  if (val.accessibilityPrefs?.prioritizeLowFloor === true) {
    warnings.push({ code: 'unsupported-accessibility-flag' });
  }
  return { ...val, warnings };
});

export type AccessibilityPrefs = z.infer<typeof AccessibilityPrefsSchema>;
export type PlanConstraints = z.infer<typeof PlanConstraintsSchema>;