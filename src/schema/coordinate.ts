import { z } from 'zod';

/**
 * Geographic coordinate (WGS84) schema.
 * - lat: finite number between -90 and 90
 * - lon: finite number between -180 and 180
 *
 * .strict() is used to reject unknown keys and keep runtime validation tight.
 */
export const CoordinateSchema = z
  .object({
    lat: z
      .number()
      .finite()
      .gte(-90, { message: 'Latitude must be >= -90' })
      .lte(90, { message: 'Latitude must be <= 90' })
      .describe('Latitude in decimal degrees (WGS84)'),
    lon: z
      .number()
      .finite()
      .gte(-180, { message: 'Longitude must be >= -180' })
      .lte(180, { message: 'Longitude must be <= 180' })
      .describe('Longitude in decimal degrees (WGS84)'),
  })
  .strict()
  .describe('Geographic coordinate schema (lat/lon)');

export type Coordinate = z.infer<typeof CoordinateSchema>;