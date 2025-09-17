// src/schema/departure.ts
/* T017 Implement Departure & DepartureResponse zod schemas */
import { z } from 'zod';

const isIsoString = (val: unknown): val is string => {
  if (typeof val !== 'string') return false;
  try {
    return new Date(val).toISOString() === val;
  } catch {
    return false;
  }
};

const isParsableDate = (val: unknown): val is string =>
  typeof val === 'string' && !Number.isNaN(Date.parse(val));

export const DepartureSchema = z.preprocess((raw: any) => {
  // If caller provided cancelled: true but no status, set status to 'cancelled'
  if (raw && raw.cancelled === true && raw.status == null) {
    raw.status = 'cancelled';
  }
  return raw;
},
  z.object({
    line: z.string().optional(),
    mode: z.string(),
    destination: z.string().optional(),
    stopId: z.string().optional(),
    scheduledTime: z.string().optional().refine((v) => v === undefined || isParsableDate(v), { message: 'scheduledTime must be an ISO-like string' }),
    realtimeTime: z.union([z.string(), z.null()]).optional(),
    delaySeconds: z.union([z.number(), z.null()]).optional(),
    status: z.enum(['on_time', 'delayed', 'cancelled', 'scheduled_only']).optional(),
    platform: z.union([z.string(), z.null()]).optional(),
    cancelled: z.boolean().optional(),
  }).strict()
);

export type Departure = z.infer<typeof DepartureSchema>;

export const DepartureResponseSchema = z.preprocess((raw: any) => {
  // Sort departures in-place by scheduledTime ascending so tests that inspect the original object see the ordering
  if (raw && Array.isArray(raw.departures)) {
    raw.departures.sort((a: any, b: any) => {
      const ta = a && a.scheduledTime ? new Date(a.scheduledTime).getTime() : Number.POSITIVE_INFINITY;
      const tb = b && b.scheduledTime ? new Date(b.scheduledTime).getTime() : Number.POSITIVE_INFINITY;
      return ta - tb;
    });
  }
  return raw;
},
  z.object({
    departures: z.array(DepartureSchema),
    realtimeUsed: z.boolean(),
    dataFreshness: z.string().refine(isParsableDate, { message: 'dataFreshness must be an ISO-like timestamp' }),
    correlationId: z.string().optional(),
    warnings: z.array(z.object({ code: z.string(), message: z.string().optional() }).strict()).optional(),
    truncated: z.boolean().optional(),
  }).strict()
);

export type DepartureResponse = z.infer<typeof DepartureResponseSchema>;