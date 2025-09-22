import { list as storeList } from '../store/userVariableStore.js';
import { UserVariablesResponseSchema } from '../schema/userVariable.js';

/** Correlation id generator */
const genCorrelationId = () => `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;

export const getUserVariables = {
  name: 'get_user_variables',
  handler: async (args: any) => {
    try {
      const sessionId = (args && args.sessionId) ?? 'default';
      const variables = await storeList(sessionId);
   
      // Normalize timestamps returned by the store: the in-memory store uses epoch-ms numbers.
      // Convert numeric timestamps back to ISO strings expected by the response schema.
      const variablesNormalized = variables.map((v: any) => {
        const nv: any = { ...v };
        if (typeof nv.createdAt === "number") nv.createdAt = new Date(nv.createdAt).toISOString();
        if (typeof nv.updatedAt === "number") nv.updatedAt = new Date(nv.updatedAt).toISOString();
        if (typeof nv.expiresAt === "number") nv.expiresAt = new Date(nv.expiresAt).toISOString();
        // Accept numeric-string ttlSeconds and coerce to number
        if (nv.ttlSeconds != null && typeof nv.ttlSeconds === "string") {
          const trimmed = nv.ttlSeconds.trim();
          const n = Number(trimmed);
          if (Number.isFinite(n)) nv.ttlSeconds = Math.floor(n);
        }
        return nv;
      });
   
      // Sort by updatedAt descending (updatedAt is now an ISO string)
      variablesNormalized.sort((a: any, b: any) => {
        const ta = a && a.updatedAt ? Date.parse(a.updatedAt) : 0;
        const tb = b && b.updatedAt ? Date.parse(b.updatedAt) : 0;
        return tb - ta;
      });
   
      const resp = {
        correlationId: genCorrelationId(),
        variables: variablesNormalized,
      };

      const validated = UserVariablesResponseSchema.parse(resp);
      return validated;
    } catch (err: any) {
      if (err && err.name === 'ZodError') {
        return Promise.reject({ code: 'validation-error', message: err.message });
      }
      return Promise.reject(err);
    }
  },
} as const;

export default getUserVariables;