import { z } from 'zod';

/**
 * Geographic coordinate (WGS84) schema (T031).
 *
 * Spec references:
 * - Parent task spec: specs/001-opentripplanner-mcp-server/tasks-phase-3.md
 * - Data model: specs/001-opentripplanner-mcp-server/data-model.md
 * - Project export pattern: .specify/memory/constitution.md
 *
 * Test expectations:
 * - See tests/schema/coordinate.schema.test.ts for acceptance/rejection examples.
 *
 * Validation rules implemented:
 * - lat: number, must be finite (rejects NaN/Infinity), range inclusive [-90, 90]
 * - lon: number, must be finite (rejects NaN/Infinity), range inclusive [-180, 180]
 *
 * Implementation notes:
 * - Uses z.number().refine(Number.isFinite, ...) to safely reject NaN/Infinity.
 * - Uses .min()/.max() (gte/lte) with informative messages.
 * - The object is .strict() to reject unknown keys.
 * - No runtime transforms applied.
 */
export const CoordinateSchema = z
  .object({
    lat: z
      .number()
      .min(-90, { message: 'Latitude must be >= -90' })
      .max(90, { message: 'Latitude must be <= 90' })
      .refine(Number.isFinite, { message: 'Latitude must be a finite number' })
      .describe('Latitude in decimal degrees (WGS84)'),
    lon: z
      .number()
      .min(-180, { message: 'Longitude must be >= -180' })
      .max(180, { message: 'Longitude must be <= 180' })
      .refine(Number.isFinite, { message: 'Longitude must be a finite number' })
      .describe('Longitude in decimal degrees (WGS84)'),
  })
  .strict()
  .describe('Geographic coordinate schema (lat/lon)');

export type Coordinate = z.infer<typeof CoordinateSchema>;