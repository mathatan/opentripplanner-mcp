export type Lang = "fi" | "en" | "sv" | "default";

export function fallbackChain(preferred?: Lang): Lang[] {
    // Default chain: preferred (if provided) then fi, en, sv, default (unique)
    const base: Lang[] = ["fi", "en", "sv", "default"];
    if (!preferred) return base;
    const rest = base.filter((l) => l !== preferred);
    return [preferred, ...rest];
}

export function pickBestName(names: Record<string, string | undefined>, preferred?: Lang) {
    const chain = fallbackChain(preferred);
    for (const lang of chain) {
        const v = names[lang];
        if (v) return v;
    }
    // fallback to any available name
    return Object.values(names).find(Boolean) ?? undefined;
}
