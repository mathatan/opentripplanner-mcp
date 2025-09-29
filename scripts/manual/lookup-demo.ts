#!/usr/bin/env -S node --loader ts-node/esm
import { findAddressOrStop } from "../../src/tools/findAddressOrStop.js";

async function main() {
    // Robust argument parsing: skip leading npm/pnpm separators like "--" and options
    const rawArgs = process.argv.slice(2).filter((a) => a !== "--");
    const textArg = rawArgs[0] || "Kamppi, Helsinki";

    const input = {
        text: textArg,
        focus: undefined,
        maxDistanceMeters: undefined,
        lang: ["fi", "en"],
    } as any;

    try {
        const res = await findAddressOrStop(input);
        console.log(JSON.stringify({ ok: true, input, result: res }, null, 2));
    } catch (err: any) {
        console.error(JSON.stringify({ ok: false, error: err?.message ?? err, err }, null, 2));
        process.exit(1);
    }
}

main();
