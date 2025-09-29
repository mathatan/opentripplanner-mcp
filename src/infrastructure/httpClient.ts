import { getApiKey } from "./env.js";

export type HttpResponse<T> = { status: number; body: T };

export async function httpGet<T>(url: string, headers: Record<string, string> = {}): Promise<HttpResponse<T>> {
    const apiKey = getApiKey();
    const headerName = "digitransit-subscription-key";
    const h = { ...headers };
    if (apiKey) h[headerName] = apiKey;
    // No debug logging in production client
    const res = await fetch(url, { headers: h });
    const text = await res.text();
    let body: any = text;
    try {
        body = JSON.parse(text);
    } catch {
        /* keep text */
    }
    return { status: res.status, body };
}

export async function httpPost<T>(
    url: string,
    bodyObj: any,
    headers: Record<string, string> = {},
): Promise<HttpResponse<T>> {
    const apiKey = getApiKey();
    const headerName = "digitransit-subscription-key";
    const h: Record<string, string> = { "Content-Type": "application/json", ...headers } as any;
    if (apiKey) (h as any)[headerName] = apiKey;
    // No debug logging in production client
    const res = await fetch(url, { method: "POST", headers: h, body: JSON.stringify(bodyObj) });
    const text = await res.text();
    let body: any = text;
    try {
        body = JSON.parse(text);
    } catch {
        /* keep text */
    }
    return { status: res.status, body };
}
// Fallback helpers removed. Use `httpGet` / `httpPost` which send the canonical header.
