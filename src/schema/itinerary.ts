import { z } from 'zod';

/**
 * Lightweight location ref used by Leg (only id required, name optional).
 * Tests pass { id: 'A' } so we keep this minimal and strict.
 */
const LocationRefLiteSchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
  })
  .strict();

/**
 * Leg schema
 *
 * - mode: string
 * - from / to: minimal location ref { id: string, name?: string }
 * - departureTime, arrivalTime: required strings
 * - duration: integer >= 0
 * - realtimeDelaySeconds?: number | null
 * - status?: enum of allowed values
 *
 * .strict() to reject unknown keys.
 */
export const LegSchema = z
  .object({
    mode: z.string(),
    from: LocationRefLiteSchema,
    to: LocationRefLiteSchema,
    departureTime: z.string(),
    arrivalTime: z.string(),
    duration: z.number().int().nonnegative(),
    realtimeDelaySeconds: z.number().int().nullable().optional(),
    status: z
      .enum(['on_time', 'delayed', 'cancelled', 'scheduled_only'])
      .optional(),
  })
  .strict();

export type Leg = z.infer<typeof LegSchema>;

/**
 * Itinerary schema
 *
 * - id?: string
 * - legs: Leg[]
 * - totalDuration?: number (will be computed as sum of leg.duration)
 * - numberOfTransfers?: number
 * - walkingDistance?: number
 * - scheduleType?: 'realtime' | 'scheduled' | 'mixed' (preserved or derived)
 * - accessibilityNotes?: string[] (optional per spec)
 * - fingerprint?: string (passed through if provided; otherwise derived)
 *
 * Uses .strict() and a .transform() to compute derived fields and inject
 * disruptionFlag/disruptionNote when any leg has status === 'cancelled'.
 */
export const ItinerarySchema = z
  .object({
    id: z.string().optional(),
    legs: z.array(LegSchema),
    // allow optional input, but we'll override with computed value in transform
    totalDuration: z.number().int().nonnegative().optional(),
    numberOfTransfers: z.number().int().nonnegative().optional(),
    walkingDistance: z.number().nonnegative().optional(),
    scheduleType: z
      .enum(['realtime', 'scheduled', 'mixed'])
      .optional(),
    accessibilityNotes: z.union([z.array(z.string()), z.string()]).optional(),
    fingerprint: z.string().optional(),
  })
  .strict()
  .transform((data) => {
    const totalDuration = data.legs.reduce((sum, l) => sum + (typeof l.duration === 'number' ? l.duration : 0), 0);

    const hasRealtime = data.legs.some(
      (l) => l.realtimeDelaySeconds !== undefined && l.realtimeDelaySeconds !== null
    );
    const hasNonRealtime = data.legs.some(
      (l) => l.realtimeDelaySeconds === undefined || l.realtimeDelaySeconds === null
    );

    // Preserve provided scheduleType when present, otherwise derive
    let scheduleType = data.scheduleType;
    if (!scheduleType) {
      if (hasRealtime && hasNonRealtime) scheduleType = 'mixed';
      else if (hasRealtime) scheduleType = 'realtime';
      else scheduleType = 'scheduled';
    }

    const cancelled = data.legs.some((l) => l.status === 'cancelled');

    const fingerprint =
      data.fingerprint ?? `fp:${data.id ?? ''}|legs:${data.legs.length}|dur:${totalDuration}`;

    const out: Record<string, any> = {
      ...data,
      totalDuration,
      scheduleType,
      fingerprint,
    };

    if (cancelled) {
      out.disruptionFlag = true;
      out.disruptionNote = 'One or more legs cancelled';
    }

    return out;
  });

export type Itinerary = z.infer<typeof ItinerarySchema>;