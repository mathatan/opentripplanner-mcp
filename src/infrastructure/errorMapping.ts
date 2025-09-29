export const ErrorCategory = {
    VALIDATION: "VALIDATION",
    NOT_FOUND: "NOT_FOUND",
    DISAMBIGUATION_REQUIRED: "DISAMBIGUATION_REQUIRED",
    NO_RESULTS: "NO_RESULTS",
    THROTTLED: "THROTTLED",
    UPSTREAM_FAILURE: "UPSTREAM_FAILURE",
    AUTH_FAILURE: "AUTH_FAILURE",
    INTERNAL: "INTERNAL",
} as const;

export type ErrorCategoryType = (typeof ErrorCategory)[keyof typeof ErrorCategory];

export function createErrorPayload(
    category: ErrorCategoryType,
    code: string,
    message: string,
    details?: Record<string, unknown>,
    recommendation?: string,
) {
    return { category, code, message, details, recommendation } as const;
}
