import { z } from "zod";

export const ErrorPayloadSchema = z
    .object({
        category: z
            .enum([
                "VALIDATION",
                "NOT_FOUND",
                "DISAMBIGUATION_REQUIRED",
                "NO_RESULTS",
                "THROTTLED",
                "UPSTREAM_FAILURE",
                "AUTH_FAILURE",
                "INTERNAL",
            ])
            .describe("Error category"),
        code: z.string().describe("Machine readable error code"),
        message: z.string().describe("Human readable message"),
        details: z.record(z.unknown()).optional().describe("Additional details"),
        recommendation: z.string().optional().describe("Suggested remediation or next steps"),
    })
    .describe("Standard error payload returned by tools");

export type ErrorPayload = z.infer<typeof ErrorPayloadSchema>;
