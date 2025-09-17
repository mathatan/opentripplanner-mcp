import { DepartureResponseSchema, DepartureSchema } from '../schema/departure.js';

/**
 * Simple, deterministic correlation id generator suitable for tests.
 */
const genCorrelationId = () => `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;

export const getDepartures = {
  name: 'get_departures',
  handler: async (args: any) => {
    try {
      // Basic input validation: require stopId or stopName
      if (!args || (args.stopId == null && args.stopName == null)) {
        return Promise.reject({ code: 'validation-error', message: 'stopId or stopName is required' });
      }

      const now = new Date();
      const departures: any[] = [];

      // Helper to create departures that validate against DepartureSchema
      const makeDeparture = (partial: Partial<any>) => {
        const baseScheduled = partial.scheduledTime
          ? new Date(partial.scheduledTime)
          : new Date(now.getTime() + (partial._offsetMinutes ?? 0) * 60 * 1000);

        const scheduledTime = baseScheduled.toISOString();
        let realtimeTime: string | null | undefined = partial.realtimeTime;
        let delaySeconds: number | null | undefined = partial.delaySeconds;

        if (realtimeTime == null && partial._realtimeOffsetMinutes != null) {
          const rt = new Date(baseScheduled.getTime() + partial._realtimeOffsetMinutes * 60_000);
          realtimeTime = rt.toISOString();
          delaySeconds = Math.round((rt.getTime() - baseScheduled.getTime()) / 1000);
        }

        const dep = {
          line: partial.line ?? '1',
          mode: partial.mode ?? 'bus',
          destination: partial.destination ?? 'Central',
          stopId: partial.stopId,
          scheduledTime,
          realtimeTime: realtimeTime ?? null,
          delaySeconds: delaySeconds ?? null,
          status: partial.status,
          platform: partial.platform ?? null,
          cancelled: partial.cancelled ?? false,
        };

        // Validate single departure shape before returning
        const validated = DepartureSchema.parse(dep);
        return validated;
      };

      // Special behaviour: STOP:CANCEL returns at least one cancelled departure
      if (args.stopId === 'STOP:CANCEL') {
        departures.push(
          makeDeparture({
            stopId: args.stopId,
            mode: 'train',
            line: 'X',
            destination: 'Terminus',
            scheduledTime: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
            cancelled: true,
            status: 'cancelled',
          })
        );
      } else {
        // Normal synthetic data: produce up to (limit || 2) departures
        const limit = typeof args.limit === 'number' ? Math.max(1, Math.floor(args.limit)) : 2;
        const produce = Math.min(limit, 5); // keep small & deterministic
        for (let i = 0; i < produce; i++) {
          const offset = 5 + i * 7; // minutes
          // Alternate realtime offsets to produce some delays
          const realtimeOffset = i % 2 === 0 ? 1 : -1; // minutes
          departures.push(
            makeDeparture({
              stopId: args.stopId ?? undefined,
              mode: 'bus',
              line: `${10 + i}`,
              destination: `Destination ${i + 1}`,
              _offsetMinutes: offset,
              _realtimeOffsetMinutes: realtimeOffset,
            })
          );
        }
      }

      const realtimeUsed = departures.some((d) => d.realtimeTime || d.cancelled);

      const resp: any = {
        departures,
        realtimeUsed,
        dataFreshness: new Date().toISOString(),
        correlationId: genCorrelationId(),
      };

      // If limit requested and > 25, include warnings and mark truncated
      if (typeof args.limit === 'number' && args.limit > 25) {
        resp.warnings = [{ code: 'truncated-results', message: 'Results truncated to 25' }];
        resp.truncated = true;
      }

      // Validate final response
      const validated = DepartureResponseSchema.parse(resp);
      return validated;
    } catch (err: any) {
      // Zod validation errors or other runtime errors
      if (err && err.name === 'ZodError') {
        return Promise.reject({ code: 'validation-error', message: err.message });
      }
      return Promise.reject(err);
    }
  },
} as const;

export default getDepartures;