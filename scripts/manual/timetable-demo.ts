#!/usr/bin/env -S node --loader ts-node/esm
import { getStopTimetableTool } from "../../src/tools/getStopTimetable.js";

// Usage: tsx scripts/manual/timetable-demo.ts <stopId> [horizonMinutes] [maxDepartures]
async function main() {
    const rawArgs = process.argv.slice(2).filter((a) => a !== "--");
    const args = rawArgs;
    let stopId = args[0] ?? "HSL:1173434";
    if (stopId === "--") stopId = "HSL:1173434";
    const horizonMinutes = args[1] ? Number(args[1]) : 90; // try max horizon
    const maxDepartures = args[2] ? Number(args[2]) : 5;
    const input = { stopId, horizonMinutes, maxDepartures } as any;

    try {
        const res = await getStopTimetableTool(input);
        console.log(JSON.stringify({ ok: true, input, result: res }, null, 2));
    } catch (err: any) {
        console.error(JSON.stringify({ ok: false, error: err?.message ?? err, err }, null, 2));
        process.exit(1);
    }
}

main();
