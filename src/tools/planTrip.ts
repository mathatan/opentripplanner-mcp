import { CoordinateSchema } from "../schema/coordinate.js";
import { PlanConstraintsSchema } from "../schema/planConstraints.js";
import { ItinerarySchema, LegSchema } from "../schema/itinerary.js";
import { LocationRefSchema } from "../schema/locationRef.js";

/**
 * plan_trip tool - schema-backed synthetic planner
 *
 * Behavior:
 * - Validates origin/destination coordinates when numeric lat/lon provided
 * - Validates optional constraints using PlanConstraintsSchema and uses the
 *   normalized (transformed) result in the output
 * - Produces deterministic synthetic itineraries and validates them with
 *   ItinerarySchema before returning
 * - Maps validation errors to { code: 'validation-error', message: string }
 *
 * Implementation is intentionally simple and synchronous to keep tests stable.
 */

export const planTrip = {
    name: "plan_trip",
    handler: async (args: any) => {
        try {
            // Accept aliases: from/to for origin/destination
            const origin = (args?.origin ?? args?.from) as any;
            const destination = (args?.destination ?? args?.to) as any;
            const { constraints, correlationId: providedCorrelationId } = args || {};

            // Basic presence check
            if (!origin || !destination) {
                return Promise.reject({ code: "validation-error", message: "origin and destination required" });
            }

            // If origin/destination include numeric coordinate values, validate them
            const validateCoordinateIfPresent = (label: string, val: any) => {
                if (!val) return;
                const hasNumericCoord = typeof val.lat === "number" || typeof val.lon === "number";
                if (hasNumericCoord) {
                    try {
                        CoordinateSchema.parse(val);
                    } catch (err: any) {
                        // Zod errors have message property; normalize to our error shape
                        const message = err?.message ?? String(err);
                        throw { code: "validation-error", message: message };
                    }
                }
                // If a full location ref was passed with coordinate property, optionally validate
                if (val && typeof val === "object" && val.coordinate !== undefined) {
                    try {
                        // LocationRefSchema will validate coordinate via CoordinateSchema
                        LocationRefSchema.parse(val);
                    } catch (err: any) {
                        const message = err?.message ?? String(err);
                        throw { code: "validation-error", message };
                    }
                }
            };

            try {
                validateCoordinateIfPresent("origin", origin);
                validateCoordinateIfPresent("destination", destination);
            } catch (e: any) {
                return Promise.reject({ code: "validation-error", message: e?.message ?? String(e) });
            }

            // Constraints validation
            let normalizedConstraints: any = undefined;
            if (constraints !== undefined) {
                if (typeof constraints !== "object" || constraints === null || Array.isArray(constraints)) {
                    return Promise.reject({ code: "validation-error", message: "constraints must be an object" });
                }
                try {
                    normalizedConstraints = PlanConstraintsSchema.parse(constraints);
                } catch (err: any) {
                    const message = err?.message ?? String(err);
                    return Promise.reject({ code: "validation-error", message });
                }
            }

            // Build deterministic synthetic leg(s) and itinerary
            // Use simple, deterministic numbers so tests are stable
            const DURATION_SECONDS = 600; // 10 minutes
            const nowIso = new Date().toISOString();
            const departureTime = nowIso;
            const arrivalTime = new Date(Date.now() + DURATION_SECONDS * 1000).toISOString();

            const leg = {
                mode: "WALK",
                from: { id: "origin" },
                to: { id: "destination" },
                departureTime,
                arrivalTime,
                duration: DURATION_SECONDS,
                // include realtimeDelaySeconds to make itinerary scheduleType -> realtime
                realtimeDelaySeconds: 0,
                status: "on_time",
            };

            // Validate leg shape with LegSchema to be safe (this will throw if invalid)
            try {
                LegSchema.parse(leg);
            } catch (err: any) {
                const message = err?.message ?? String(err);
                return Promise.reject({ code: "validation-error", message });
            }

            const rawItinerary = {
                id: "it1",
                legs: [leg],
                // intentionally omit totalDuration to let ItinerarySchema compute it
            };

            // Validate & run transforms in ItinerarySchema.parse
            let validatedItinerary: any;
            try {
                validatedItinerary = ItinerarySchema.parse(rawItinerary);
            } catch (err: any) {
                const message = err?.message ?? String(err);
                return Promise.reject({ code: "validation-error", message });
            }

            // Ensure fingerprint present (ItinerarySchema.transform sets one)
            if (!validatedItinerary.fingerprint || typeof validatedItinerary.fingerprint !== "string") {
                // Shouldn't happen, but guard defensively
                validatedItinerary.fingerprint = `fp:${validatedItinerary.id ?? ""}|legs:${(validatedItinerary.legs || []).length}|dur:${validatedItinerary.totalDuration ?? 0}`;
            }

            // Deduplicate itineraries by fingerprint (we only have one, but keep logic)
            const itinerariesByFingerprint = new Map<string, any>();
            const addIt = (it: any) => {
                if (it && it.fingerprint) itinerariesByFingerprint.set(it.fingerprint, it);
            };
            addIt(validatedItinerary);

            const itineraries = Array.from(itinerariesByFingerprint.values());

            // Compose final response
            const response: any = {
                origin: origin, // preserve coordinate fields as-is
                destination: destination,
                itineraries,
                realtimeUsed: "realtime",
                dataFreshness: new Date().toISOString(),
                correlationId:
                    providedCorrelationId ??
                    `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
                warnings: [],
            };

            if (normalizedConstraints !== undefined) response.constraints = normalizedConstraints;

            return response;
        } catch (err: any) {
            // Map unexpected errors to validation-error as a safe default per requirements
            const message = err?.message ?? String(err);
            return Promise.reject({ code: "validation-error", message });
        }
    },
    schema: {} as any,
} as const;

export default planTrip;
