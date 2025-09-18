/**
 * Error and Warning schemas (Zod)
 *
 * See tests/specs:
 * - tests/schema/error.schema.test.ts (validation expectations)
 * - specs/001-opentripplanner-mcp-server/tasks-phase-3.md (task T038 context)
 *
 * NOTE: message redaction/truncation (if any) is handled by the errorMapping infrastructure
 * (src/infrastructure/errorMapping.ts) and must NOT be implemented here. These schemas only
 * validate shape and basic field constraints.
 */

import { z } from "zod";

export const CanonicalErrorCodes = z.enum([
    "validation-error",
    "unsupported-region",
    "no-itinerary-found",
    "upstream-error",
    "upstream-timeout",
    "rate-limited",
    "network-error",
    "geocode-no-results",
    "realtime-missing",
]);

const kebabCode = z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: "code must be kebab-case (lowercase, alphanumeric and hyphens)" });

export const ErrorSchema = z
    .object({
        code: kebabCode,
        message: z.string(),
        hint: z.string().optional(),
        correlationId: z.string().optional(),
        // retryAfter is optional generally, but must be present (and a finite, non-negative number)
        // when code === "rate-limited". Use refine to ensure finite and non-negative when provided.
        retryAfter: z
            .number()
            .nonnegative({ message: "retryAfter must be non-negative" })
            .refine(Number.isFinite, { message: "retryAfter must be a finite number" })
            .optional(),
    })
    .strict()
    .superRefine((obj, ctx) => {
        if (obj.code === "rate-limited") {
            if (obj.retryAfter == null || typeof obj.retryAfter !== "number") {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["retryAfter"],
                    message: "retryAfter (seconds) must be provided when code is rate-limited",
                });
            } else if (!Number.isFinite(obj.retryAfter)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["retryAfter"],
                    message: "retryAfter must be a finite number",
                });
            } else if (obj.retryAfter < 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["retryAfter"],
                    message: "retryAfter must be non-negative",
                });
            }
        }
    });

export type Error = z.infer<typeof ErrorSchema>;

export const WarningSchema = z
    .object({
        code: kebabCode,
        message: z.string(),
        hint: z.string().optional(),
        correlationId: z.string().optional(),
    })
    .strict();

export type Warning = z.infer<typeof WarningSchema>;
