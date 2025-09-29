#!/usr/bin/env -S node --loader ts-node/esm
import { planRoute } from "../../src/services/routeService.js";

// We'll call the GraphQL planConnection query directly to match documented examples

// Usage: tsx scripts/manual/route-demo.ts <fromLat> <fromLon> <toLat> <toLon> [departureTimeIso] [arriveBy]
async function main() {
    const rawArgs = process.argv.slice(2).filter((a) => a !== "--");
    const args = rawArgs;
    const fromLat = Number(args[0] ?? 60.168992);
    const fromLon = Number(args[1] ?? 24.932366);
    const toLat = Number(args[2] ?? 60.175294);
    const toLon = Number(args[3] ?? 24.684855);
    const departureTimeIso = args[4] ?? undefined;
    const arriveBy = args[5] === "true" ? true : false;

    const input = {
        from: { lat: fromLat, lon: fromLon },
        to: { lat: toLat, lon: toLon },
        departureTimeIso,
        arriveBy,
    } as any;

    try {
        const summaries = await planRoute({
            from: input.from,
            to: input.to,
            departureTimeIso: input.departureTimeIso,
            arriveBy: input.arriveBy,
        });
        console.log(JSON.stringify({ ok: true, input, result: { itineraries: summaries } }, null, 2));
    } catch (err: any) {
        console.error(JSON.stringify({ ok: false, error: err?.message ?? err, err }, null, 2));
        process.exit(1);
    }
}

main();
