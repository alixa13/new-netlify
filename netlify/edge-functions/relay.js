// ─── Config (parsed once at cold start) ─────────────────────────────────────
const TARGET_BASE  = (Netlify.env.get("TARGET_DOMAIN")        || "").replace(/\/$/, "");
const RELAY_KEY    = (Netlify.env.get("RELAY_KEY")            || "").trim();
const TIMEOUT_MS   = posInt(Netlify.env.get("UPSTREAM_TIMEOUT_MS"), 55_000, 5_000);
const MAX_INFLIGHT = posInt(Netlify.env.get("MAX_INFLIGHT"),         64,     1);

// ─── Hop-by-hop + platform headers — never forwarded to upstream ─────────────
const STRIP = new Set([
  "host", "connection", "proxy-connection", "keep-alive", "via",
  "proxy-authenticate", "proxy-authorization",
  "te", "trailer", "transfer-encoding", "upgrade",
  "forwarded", "x-forwarded-host", "x-forwarded-proto", "x-forwarded-port",
  "x-forwarded-for", "x-real-ip",
]);

// ─── Allowed methods ─────────────────────────────────────────────────────────
const ALLOWED_METHODS = new Set(["GET", "HEAD", "POST"]);

// ─── In-flight counter ───────────────────────────────────────────────────────
let inFlight = 0;

// ─────────────────────────────────────────────────────────────────────────────
export default async function handler(request) {

  if (!TARGET_BASE)
    return reply(500, "Misconfigured: TARGET_DOMAIN not set");

  if (!ALLOWED_METHODS.has(request.method))
    return reply(405, "Method Not Allowed");

  if (RELAY_KEY) {
    const token = request.headers.get("x-relay-key") || "";
    if (token !== RELAY_KEY) return reply(403, "Forbidden");
  }

  if (inFlight >= MAX_INFLIGHT)
    return reply(503, "Server Busy");
  inFlight++;

  try {
    // Full path + query forwarded untouched — xhttp needs the exact path
    const url       = new URL(request.url);
    const targetUrl = TARGET_BASE + url.pathname + url.search;

    // Blacklist approach: pass ALL headers except hop-by-hop and platform ones.
    // This ensures referer (x_padding), content-type, and any xhttp-specific
    // headers reach the upstream server correctly.
    const upHeaders = new Headers();
    let   clientIp  = "";

    for (const [k, v] of request.headers) {
      const lk = k.toLowerCase();

      if (lk === "x-real-ip")       { if (!clientIp) clientIp = v; continue; }
      if (lk === "x-forwarded-for") { if (!clientIp) clientIp = v; continue; }
      if (STRIP.has(lk))               continue;
      if (lk.startsWith("x-nf-"))      continue;
      if (lk.startsWith("x-netlify-")) continue;
      if (lk === "x-relay-key")        continue;

      upHeaders.set(lk, v);
    }

    if (clientIp) upHeaders.set("x-forwarded-for", clientIp);

    // AbortController ties client disconnect + hard timeout to the upstream fetch
    const ac = new AbortController();

    request.signal.addEventListener("abort", () => {
      try { ac.abort(); } catch {}
    }, { once: true });

    const timer = setTimeout(() => {
      try { ac.abort(); } catch {}
    }, TIMEOUT_MS);

    // duplex:"half" is required for simultaneous xhttp upload+download streaming.
    // Without it the runtime buffers the full upload body before starting download,
    // which destroys throughput and causes periodic disconnects.
    const hasBody = request.method !== "GET" && request.method !== "HEAD";
    const fetchOpts = {
      method:   request.method,
      headers:  upHeaders,
      redirect: "manual",
      signal:   ac.signal,
      ...(hasBody ? { body: request.body, duplex: "half" } : {}),
    };

    let upstream;
    try {
      upstream = await fetch(targetUrl, fetchOpts);
    } catch {
      clearTimeout(timer);
      return ac.signal.aborted ? reply(504, "Gateway Timeout") : reply(502, "Bad Gateway");
    }
    clearTimeout(timer);

    // Drop hop-by-hop response headers
    const resHeaders = new Headers();
    for (const [k, v] of upstream.headers) {
      const lk = k.toLowerCase();
      if (lk === "transfer-encoding" || lk === "connection") continue;
      resHeaders.set(k, v);
    }

    // Zero-copy stream from upstream directly to client
    return new Response(upstream.body, {
      status:  upstream.status,
      headers: resHeaders,
    });

  } finally {
    inFlight = Math.max(0, inFlight - 1);
  }
}

function reply(status, text) {
  return new Response(text, { status });
}

function posInt(raw, fallback, min = 1) {
  const n = Number(raw);
  return Number.isFinite(n) && n >= min ? Math.trunc(n) : fallback;
}
