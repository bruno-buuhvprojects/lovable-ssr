export function parseCookies(raw) {
    const cookies = {};
    if (!raw)
        return cookies;
    raw.split(';').forEach((part) => {
        const [k, ...rest] = part.split('=');
        if (!k)
            return;
        const key = k.trim();
        if (!key)
            return;
        cookies[key] = decodeURIComponent(rest.join('=').trim());
    });
    return cookies;
}
export function buildRequestContext(req) {
    const cookiesRaw = req.headers.cookie ?? '';
    return {
        cookiesRaw,
        cookies: parseCookies(cookiesRaw),
        headers: req.headers,
        method: req.method,
        url: req.originalUrl,
    };
}
