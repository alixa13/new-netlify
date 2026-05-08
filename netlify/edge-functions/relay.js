// ─── Config (read once at cold start, never per-request) ────────────────────
const TARGET_BASE     = (Netlify.env.get("TARGET_DOMAIN")       || "").replace(/\/$/, "");
const RELAY_PATH      = normalizePath(Netlify.env.get("RELAY_PATH")  || "");
const RELAY_KEY       = (Netlify.env.get("RELAY_KEY")           || "").trim();
const TIMEOUT_MS      = posInt(Netlify.env.get("UPSTREAM_TIMEOUT_MS"), 55_000, 5_000);
const MAX_INFLIGHT    = posInt(Netlify.env.get("MAX_INFLIGHT"),         64,     1);

// ─── Header whitelist (only these pass through — everything else is dropped) ─
// Whitelist is much faster than blacklist: no per-header string scanning.
const FORWARD_EXACT = new Set([
  "accept",
  "accept-encoding",
  "accept-language",
  "cache-control",
  "content-length",
  "content-type",
  "pragma",
  "range",
  "user-agent",
]);
const FORWARD_PREFIX = ["sec-ch-", "sec-fetch-"];

// ─── Hop-by-hop / platform headers that must never reach upstream ────────────
const STRIP = new Set([
  "host", "connection", "proxy-connection", "keep-alive", "via",
  "proxy-authenticate", "proxy-authorization", "te", "trailer",
  "transfer-encoding", "upgrade", "forwarded",
  "x-forwarded-host", "x-forwarded-proto", "x-forwarded-port",
  "x-forwarded-for", "x-real-ip",
]);

// ─── Only these HTTP methods are relayed ────────────────────────────────────
const ALLOWED_METHODS = new Set(["GET", "HEAD", "POST"]);

// ─── In-flight counter (shared across requests in the same isolate) ──────────
let inFlight = 0;

// ────────────────────────────────────────────────────────────────────────────
export default async function handler(request, context) {

  // ── 1. Validate configuration (fast-fail, no wasted work) ──────────────
  if (!TARGET_BASE)
    return reply(500, "Misconfigured: TARGET_DOMAIN not set");

  // ── 2. Method gate ──────────────────────────────────────────────────────
  if (!ALLOWED_METHODS.has(request.method))
    return reply(405, "Method Not Allowed");

  // ── 3. Optional secret key auth ─────────────────────────────────────────
  if (RELAY_KEY) {
    const token = request.headers.get("x-relay-key") || "";
    if (token !== RELAY_KEY) return reply(403, "Forbidden");
  }

  // ── 4. In-flight concurrency limiter ────────────────────────────────────
  if (inFlight >= MAX_INFLIGHT)
    return reply(503, "Server Busy");
  inFlight++;

  try {
    // ── 5. Build upstream URL ─────────────────────────────────────────────
    const url       = new URL(request.url);
    const suffix    = RELAY_PATH
      ? url.pathname.replace(/^\/+/, "") // strip leading slash when path mapping
      : url.pathname;
    const targetUrl = TARGET_BASE + (RELAY_PATH || suffix) + url.search;

    // ── 6. Build clean header set (whitelist approach) ────────────────────
    const upHeaders = new Headers();
    let   clientIp  = "";

    for (const [k, v] of request.headers) {
      const lk = k.toLowerCase();

      // capture client IP before stripping
      if (lk === "x-real-ip")       { if (!clientIp) clientIp = v; continue; }
      if (lk === "x-forwarded-for") { if (!clientIp) clientIp = v; continue; }

      // drop stripped / platform headers
      if (STRIP.has(lk))                  continue;
      if (lk.startsWith("x-nf-"))         continue;
      if (lk.startsWith("x-netlify-"))    continue;
      if (lk === "x-relay-key")           continue;

      // whitelist pass
      if (FORWARD_EXACT.has(lk) || FORWARD_PREFIX.some(p => lk.startsWith(p))) {
        upHeaders.set(lk, v);
      }
    }

    if (clientIp) upHeaders.set("x-forwarded-for", clientIp);

    // ── 7. Abort controller: ties client disconnect → upstream fetch ──────
    const ac = new AbortController();

    // propagate client disconnect immediately
    request.signal.addEventListener("abort", () => {
      try { ac.abort(); } catch {}
    }, { once: true });

    // hard upstream timeout (prevents zombie connections eating Netlify quota)
    const timer = setTimeout(() => {
      try { ac.abort(); } catch {}
    }, TIMEOUT_MS);

    // ── 8. Build fetch options ────────────────────────────────────────────
    const hasBody = request.method !== "GET" && request.method !== "HEAD";
    const fetchOpts = {
      method:   request.method,
      headers:  upHeaders,
      redirect: "manual",
      signal:   ac.signal,
      // duplex:"half" is REQUIRED for simultaneous upload+download streaming
      // (bidirectional xhttp). Without it the runtime buffers the body first,
      // killing throughput and causing the periodic disconnect you saw.
      ...(hasBody ? { body: request.body, duplex: "half" } : {}),
    };

    let upstream;
    try {
      upstream = await fetch(targetUrl, fetchOpts);
    } catch (err) {
      clearTimeout(timer);
      if (ac.signal.aborted)
        return reply(504, "Gateway Timeout");
      return reply(502, "Bad Gateway");
    }
    clearTimeout(timer);

    // ── 9. Build clean response headers ──────────────────────────────────
    const resHeaders = new Headers();
    for (const [k, v] of upstream.headers) {
      const lk = k.toLowerCase();
      // transfer-encoding & connection are hop-by-hop; drop them
      if (lk === "transfer-encoding" || lk === "connection") continue;
      resHeaders.set(k, v);
    }

    // ── 10. Stream body directly — zero buffering ─────────────────────────
    // Netlify Edge Functions support ReadableStream as Response body,
    // so this is a true zero-copy pipe from upstream to client.
    return new Response(upstream.body, {
      status:  upstream.status,
      headers: resHeaders,
    });

  } finally {
    // always release slot so counter never drifts
    inFlight = Math.max(0, inFlight - 1);
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function reply(status, text) {
  return new Response(text, { status });
}

function normalizePath(raw) {
  if (!raw) return "";
  const p = raw.startsWith("/") ? raw : `/${raw}`;
  return p.endsWith("/") && p.length > 1 ? p.slice(0, -1) : p;
}

function posInt(raw, fallback, min = 1) {
  const n = Number(raw);
  return Number.isFinite(n) && n >= min ? Math.trunc(n) : fallback;
}
