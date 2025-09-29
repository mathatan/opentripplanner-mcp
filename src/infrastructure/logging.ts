export const log = {
    debug: (...args: unknown[]) => console.debug("[DEBUG]", ...args),
    info: (...args: unknown[]) => console.info("[INFO]", ...args),
    warn: (...args: unknown[]) => console.warn("[WARN]", ...args),
    error: (...args: unknown[]) => console.error("[ERROR]", ...args),
};
