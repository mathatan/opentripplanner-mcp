export async function withRetry<T>(fn: () => Promise<T>, attempts = 3, baseMs = 200): Promise<T> {
    let lastErr: any;
    for (let i = 0; i < attempts; i++) {
        try {
            return await fn();
        } catch (e) {
            lastErr = e;
            const delay = baseMs * Math.pow(2, i);
            await new Promise((res) => setTimeout(res, delay));
        }
    }
    throw lastErr;
}
