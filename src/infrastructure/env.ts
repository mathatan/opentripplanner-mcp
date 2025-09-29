export function requireEnv(name: string): string {
    const v = process.env[name];
    if (!v) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return v;
}

export const getOptionalEnv = (name: string, fallback?: string) => process.env[name] ?? fallback;
