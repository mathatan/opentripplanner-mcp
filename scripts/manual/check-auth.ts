#!/usr/bin/env -S node --loader ts-node/esm
// Use the global fetch available in recent Node.js

function maskKey(k?: string) {
    if (!k) return "<missing>";
    if (k.length <= 8) return k.replace(/./g, "*");
    return k.slice(0, 4) + "..." + k.slice(-4);
}

async function tryRequest(url: string, headers: Record<string, string>) {
    try {
        const res = await fetch(url, { headers });
        const text = await res.text();
        return { status: res.status, body: text };
    } catch (e: any) {
        return { status: 0, body: String(e) };
    }
}

async function main() {
    const key = process.env.DIGITRANSIT_API_KEY;
    console.log("DIGITRANSIT_API_KEY:", maskKey(key));
    const base = "https://api.digitransit.fi/geocoding/v1/search?text=Kamppi&size=1";

    const attempts = [
        { name: "digitransit-subscription-key header", headers: { "digitransit-subscription-key": key || "" } },
        {
            name: "Digitransit-Subscription-Key header (Title-Case)",
            headers: { "Digitransit-Subscription-Key": key || "" },
        },
        { name: "Authorization: Bearer", headers: { Authorization: `Bearer ${key}` } },
        { name: "X-Api-Key", headers: { "X-Api-Key": key || "" } },
        { name: "x-api-key", headers: { "x-api-key": key || "" } },
        { name: "Ocp-Apim-Subscription-Key", headers: { "Ocp-Apim-Subscription-Key": key || "" } },
        { name: "query param api_key", url: key ? `${base}&api_key=${encodeURIComponent(key)}` : base, headers: {} },
        {
            name: "query param subscription-key",
            url: key ? `${base}&subscription-key=${encodeURIComponent(key)}` : base,
            headers: {},
        },
        {
            name: "query param digitransit-subscription-key",
            url: key ? `${base}&digitransit-subscription-key=${encodeURIComponent(key)}` : base,
            headers: {},
        },
    ];

    for (const a of attempts) {
        const url = a.url ?? base;
        console.log("\nTrying", a.name);
        console.log("Request URL:", url);
        console.log("Headers:", Object.keys(a.headers).length ? Object.keys(a.headers).join(", ") : "<none>");
        const r = await tryRequest(url, a.headers as any);
        console.log("Status:", r.status);
        const bodyText = String(r.body).slice(0, 1000);
        console.log("Body (first 1000 chars):", bodyText);
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
