import crypto from "crypto";

export function fingerprintFromObject(obj: unknown) {
    const json = JSON.stringify(obj, Object.keys(obj as Record<string, unknown>).sort());
    return crypto.createHash("sha256").update(json).digest("hex");
}

export function shortFingerprint(obj: unknown, length = 12) {
    return fingerprintFromObject(obj).slice(0, length);
}
