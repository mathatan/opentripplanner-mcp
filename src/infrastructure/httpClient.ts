import { requireEnv } from "./env.js";

export type HttpResponse<T> = { status: number; body: T };

export async function httpGet<T>(url: string, headers: Record<string, string> = {}): Promise<HttpResponse<T>> {
    const apiKey = process.env["DIGITRANSIT_API_KEY"];
    const h = { ...headers };
    if (apiKey) h["Authorization"] = `Bearer ${apiKey}`;
    const res = await fetch(url, { headers: h });
    const text = await res.text();
    let body: any = text;
    try {
        body = JSON.parse(text);
    } catch (e) {
        /* keep text */
    }
    return { status: res.status, body };
}
