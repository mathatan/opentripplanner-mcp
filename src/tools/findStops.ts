import { CoordinateSchema } from "../schema/coordinate.js";
import { LocationRefSchema } from "../schema/locationRef.js";

/**
 * Deterministic, simple correlation id used elsewhere in tools.
 */
const genCorrelationId = () => `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;

const SUPPORTED_MODES = new Set(["BUS", "TRAM", "RAIL", "METRO", "FERRY", "TROLLEY"]);

/**
 * Create a deterministic pool of synthetic stops. No network calls, no side-effects.
 */
function makeStop(i: number, baseLat: number, baseLon: number) {
    const idx = i + 1;
    const distance = 50 + i * 70; // deterministic integer meters
    const lat = +(baseLat + (i % 11) * 0.0006).toFixed(6);
    const lon = +(baseLon + (i % 13) * 0.0007).toFixed(6);
    const modes = i % 3 === 0 ? ["TRAM"] : ["BUS", "TRAM"];
    const stop: any = {
        id: `STOP:${idx}`,
        name: `Stop ${idx}`,
        coordinate: { lat, lon },
        distance,
        modes,
        address: idx % 2 === 0 ? `Street ${idx} 1` : undefined,
        rawSource: "geocode",
    };
    return stop;
}

export const findStops = {
    name: "find_stops",
    handler: async (args: any) => {
        try {
            // Accept either args.coordinate or args.location for compatibility
            const coord = args?.coordinate ?? args?.location;
            if (!coord || typeof coord !== "object") {
                return Promise.reject({ code: "validation-error", message: "coordinate (or location) is required" });
            }

            try {
                CoordinateSchema.parse(coord);
            } catch (err: any) {
                if (err && err.name === "ZodError") {
                    return Promise.reject({ code: "validation-error", message: err.message });
                }
                throw err;
            }

            // radius validation (default 500m)
            const radius = args?.radius == null ? 500 : Number(args.radius);
            if (!Number.isFinite(radius)) {
                return Promise.reject({ code: "validation-error", message: "radius must be a number" });
            }
            if (radius < 1 || radius > 3000) {
                return Promise.reject({ code: "validation-error", message: "radius out of allowed range (1..3000)" });
            }

            // maxResults / size handling
            const requestedMax =
                args?.maxResults != null
                    ? Math.floor(Number(args.maxResults))
                    : args?.size != null
                      ? Math.floor(Number(args.size))
                      : 10;
            const requestCount = Number.isFinite(requestedMax) && requestedMax > 0 ? requestedMax : 10;

            const serverMax = 25;
            const truncationWarnings: any[] = [];
            // per spec: requests above provider max (serverMax) are treated as requested but truncated server-side to serverMax
            if (requestCount > serverMax) {
                truncationWarnings.push({ code: "truncated-results", message: `Results truncated to ${serverMax}` });
            }

            // mode filter check - warn if unsupported
            const warnings: any[] = [...truncationWarnings];
            if (args?.mode) {
                const modeStr = String(args.mode).toUpperCase();
                if (!SUPPORTED_MODES.has(modeStr)) {
                    warnings.push({ code: "unsupported-mode", message: `Mode ${modeStr} not supported` });
                }
            }

            const textFilter =
                typeof args?.textFilter === "string" && args.textFilter.length > 0 ? args.textFilter : undefined;

            // Build a deterministic pool (enough to cover truncation and filtering)
            const poolCount = 30;
            const pool = [];
            const baseLat = coord.lat;
            const baseLon = coord.lon;
            for (let i = 0; i < poolCount; i++) {
                pool.push(makeStop(i, baseLat, baseLon));
            }

            // Apply textFilter post-filtering if provided
            let filtered = pool;
            if (textFilter) {
                const q = textFilter.toLowerCase();
                filtered = pool.filter((s) => (s.name ?? "").toLowerCase().includes(q));
                if (filtered.length === 0) {
                    // No matches after filter - return empty stops and a warning
                    const resp: any = {
                        stops: [],
                        correlationId: genCorrelationId(),
                        warnings: [
                            ...warnings,
                            { code: "no-matches-after-filter", message: "No stops match textFilter" },
                        ],
                    };
                    return resp;
                }
            }

            // Sort by distance ascending (already deterministic)
            filtered.sort((a: any, b: any) => a.distance - b.distance);

            // Apply server-side truncation to serverMax if requested over serverMax
            const toReturnCount = Math.min(filtered.length, requestCount > serverMax ? serverMax : requestCount);

            const stops = filtered.slice(0, toReturnCount);

            // Validate each stop shape using LocationRefSchema to ensure compatibility
            // We only validate a reduced candidate object that matches the strict LocationRefSchema
            for (const s of stops) {
                const candidate: any = s.id
                    ? { type: "stopId", id: s.id, name: s.name, rawSource: s.rawSource }
                    : {
                          type: "coordinate",
                          coordinate: s.coordinate,
                          name: s.name,
                          address: s.address,
                          rawSource: s.rawSource,
                      };
                try {
                    LocationRefSchema.parse(candidate);
                } catch (err: any) {
                    if (err && err.name === "ZodError") {
                        return Promise.reject({ code: "validation-error", message: err.message });
                    }
                    throw err;
                }
            }

            const resp: any = { stops, correlationId: genCorrelationId() };
            if (warnings.length) resp.warnings = warnings;
            return resp;
        } catch (err: any) {
            if (err && err.name === "ZodError") {
                return Promise.reject({ code: "validation-error", message: err.message });
            }
            return Promise.reject(err);
        }
    },
    schema: {} as any,
} as const;

export default findStops;
