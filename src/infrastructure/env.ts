export function requireEnv(name: string): string {
    const v = process.env[name];
    if (!v) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return v;
}

export const getOptionalEnv = (name: string, fallback?: string) => process.env[name] ?? fallback;

/**
 * Resolve the Digitransit API key from multiple common environment variable names.
 * Returns undefined if none are set.
 */
export function getApiKey(): string | undefined {
    const candidates = [
        "DIGITRANSIT_API_KEY",
        "DIGITRANSIT_SUBSCRIPTION_KEY",
        "DIGITRANSIT_SUBSCRIPTION",
        "DIGITRANSIT_KEY",
        "digitransit_api_key",
        "digitransit_subscription_key",
        "DIGITRANSIT_SUBSCRIPTIONKEY",
    ];
    for (const k of candidates) {
        const v = process.env[k];
        if (v && v.length > 0) return v;
    }
    return undefined;
}

/**
 * Unified Digitransit API base URL resolver.
 * Precedence for full explicit URL overrides (first non-empty wins):
 *   1. DIGITRANSIT_API_BASE_URL
 *   2. DIGITRANSIT_GRAPHQL_URL (legacy specific override)
 *   3. DIGITRANSIT_ROUTING_URL (legacy specific override)
 * Otherwise compose from region (precedence): DIGITRANSIT_REGION, DIGITRANSIT_ROUTING_REGION, DIGITRANSIT_GRAPHQL_REGION.
 * Default region: hsl
 * Result example: https://api.digitransit.fi/routing/v2/hsl/gtfs/v1
 */
export const getDigitransitApiBaseUrl = (): string => {
    const explicit =
        process.env.DIGITRANSIT_API_BASE_URL ||
        process.env.DIGITRANSIT_GRAPHQL_URL ||
        process.env.DIGITRANSIT_ROUTING_URL;
    if (explicit) return explicit;
    const region =
        process.env.DIGITRANSIT_REGION ||
        process.env.DIGITRANSIT_ROUTING_REGION ||
        process.env.DIGITRANSIT_GRAPHQL_REGION ||
        "hsl";
    return `https://api.digitransit.fi/routing/v2/${region}/gtfs/v1`;
};
