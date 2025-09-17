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

      // Sort by updatedAt descending
      variables.sort((a: any, b: any) => {
        const ta = a && a.updatedAt ? Date.parse(a.updatedAt) : 0;
        const tb = b && b.updatedAt ? Date.parse(b.updatedAt) : 0;
        return tb - ta;
      });

      const resp = {
        correlationId: genCorrelationId(),
        variables,
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