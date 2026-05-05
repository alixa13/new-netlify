const UPSTREAM_URL = (Netlify.env.get("TARGET_DOMAIN") || "").replace(/\/$/, "");

export default async function proxyHandler(request) {
  if (!UPSTREAM_URL) {
    return new Response("Misconfigured: TARGET_DOMAIN is not set", { status: 500 });
  }

  try {
    const url = new URL(request.url);
    const targetUrl = UPSTREAM_URL + url.pathname + url.search;

    const method = request.method;
    const hasBody = method !== "GET" && method !== "HEAD";

    const OMIT_HEADERS = new Set([
      "host",
      "connection",
      "keep-alive",
      "proxy-authenticate",
      "proxy-authorization",
      "te",
      "trailer",
      "transfer-encoding",
      "upgrade",
      "forwarded",
      "x-forwarded-host",
      "x-forwarded-proto",
      "x-forwarded-port",
    ]);

    const outHeaders = new Headers();
    let realIp = null;

    for (const [key, value] of request.headers) {
      const k = key.toLowerCase();
      if (OMIT_HEADERS.has(k)) continue;
      if (k.startsWith("x-nf-")) continue;
      if (k.startsWith("x-netlify-")) continue;
      if (k === "x-real-ip") {
        realIp = value;
        continue;
      }
      if (k === "x-forwarded-for") {
        if (!realIp) realIp = value;
        continue;
      }
      outHeaders.set(k, value);
    }

    if (realIp) outHeaders.set("x-forwarded-for", realIp);

    const fetchOptions = {
      method,
      headers: outHeaders,
      redirect: "manual",
    };

    if (hasBody) {
      fetchOptions.body = request.body;
    }

    const upstreamRes = await fetch(targetUrl, fetchOptions);

    const responseHeaders = new Headers();
    for (const [key, value] of upstreamRes.headers) {
      if (key.toLowerCase() === "transfer-encoding") continue;
      responseHeaders.set(key, value);
    }

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  } catch (error) {
    return new Response("Bad Gateway: Relay Failed", { status: 502 });
  }
}
