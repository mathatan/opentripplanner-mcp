export function clampSearchWindowMinutes(value?: number) {
    const defaultVal = 45;
    if (value == null) return defaultVal;
    const v = Math.floor(value);
    return Math.max(1, Math.min(120, v));
}

export function clampHorizonMinutes(value?: number) {
    const defaultVal = 45;
    if (value == null) return defaultVal;
    const v = Math.floor(value);
    return Math.max(1, Math.min(90, v));
}

export function isoNow() {
    return new Date().toISOString();
}
