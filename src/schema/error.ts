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

export const ErrorSchema = z
    .object({
        code: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: "code must be kebab-case" }),
        message: z.string(),
        hint: z.string().optional(),
        correlationId: z.string().optional(),
        retryAfter: z.number().nullable().optional(),
    })
    .strict()
    .superRefine((obj, ctx) => {
        // If code is rate-limited, ensure retryAfter is a positive number
        if (obj.code === "rate-limited") {
            if (obj.retryAfter == null || typeof obj.retryAfter !== "number" || obj.retryAfter <= 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["retryAfter"],
                    message: "retryAfter (seconds) must be provided and > 0 when code is rate-limited",
                });
            }
        }
    });

export type ErrorObject = z.infer<typeof ErrorSchema>;

export const WarningSchema = z
    .object({
        code: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: "code must be kebab-case" }),
        message: z.string(),
    })
    .strict();

export type WarningObject = z.infer<typeof WarningSchema>;
