import { save as storeSave } from "../store/userVariableStore.js";

/** Simple stable correlation id generator for tests */
const genCorrelationId = () => `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;

export const saveUserVariable = {
    name: "save_user_variable",
    handler: async (args: any) => {
        try {
            if (!args || typeof args.key !== "string") {
                return Promise.reject({ code: "validation-error", message: "key is required" });
            }

            const sessionId = args.sessionId ?? "default";

            // Normalize location shape: accept { lat, lon } and convert to { coordinate: { lat, lon } }
            let value = args.value;
            if (args.type === "location" && value && typeof value === "object") {
                const hasLat = Object.prototype.hasOwnProperty.call(value, "lat");
                const hasLon = Object.prototype.hasOwnProperty.call(value, "lon");
                if (hasLat && hasLon) {
                    value = { coordinate: { lat: (value as any).lat, lon: (value as any).lon } };
                }
            }

            const input = {
                key: args.key,
                type: args.type,
                value,
                sessionId,
                createdAt: args.createdAt,
                updatedAt: args.updatedAt,
                expiresAt: args.expiresAt,
                ttlSeconds: args.ttlSeconds,
            };

            // Persist via dedicated store (store will validate/transform)
            const { previous, variable } = await storeSave(sessionId, input);

            const response: any = {
                variable,
                previous: previous ? { key: previous.key, type: previous.type } : undefined,
                correlationId: genCorrelationId(),
                ttlSeconds: variable.ttlSeconds,
                expiresAt: variable.expiresAt,
            };

            // Emit warning when overwriting existing key
            if (previous) {
                response.warnings = [{ code: "key-overwritten", message: `Variable '${args.key}' overwritten` }];
            }

            return response;
        } catch (err: any) {
            if (err && err.name === "ZodError") {
                return Promise.reject({ code: "validation-error", message: err.message });
            }
            return Promise.reject(err);
        }
    },
} as const;

export default saveUserVariable;
