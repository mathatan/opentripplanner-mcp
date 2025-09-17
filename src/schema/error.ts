import { z } from 'zod';

export const ErrorSchema = z.object({
  code: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: 'code must be kebab-case' }),
  message: z.string(),
  hint: z.string().optional(),
  correlationId: z.string().optional(),
  retryAfter: z.number().nullable().optional(),
}).strict();

export type ErrorObject = z.infer<typeof ErrorSchema>;

export const WarningSchema = z.object({
  code: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: 'code must be kebab-case' }),
  message: z.string(),
}).strict();

export type WarningObject = z.infer<typeof WarningSchema>;