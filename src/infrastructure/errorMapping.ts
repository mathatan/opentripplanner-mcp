export enum ErrorCategory {
    VALIDATION = "VALIDATION",
    NOT_FOUND = "NOT_FOUND",
    DISAMBIGUATION_REQUIRED = "DISAMBIGUATION_REQUIRED",
    NO_RESULTS = "NO_RESULTS",
    THROTTLED = "THROTTLED",
    UPSTREAM_FAILURE = "UPSTREAM_FAILURE",
    AUTH_FAILURE = "AUTH_FAILURE",
    INTERNAL = "INTERNAL",
}

export function createErrorPayload(
    category: ErrorCategory,
    code: string,
    message: string,
    details?: Record<string, unknown>,
    recommendation?: string,
) {
    return { category, code, message, details, recommendation } as const;
}
