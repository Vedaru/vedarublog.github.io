/**
 * worker.js
 * Deployable Cloudflare Worker that proxies audio requests with:
 * - CORS support
 * - Range (partial content) passthrough for seeking/streaming
 * - Edge caching (caches.default + ctx.waitUntil)
 * - OPTIONS preflight handling
 *
 * Usage:
 * - Set TARGET_ORIGIN in your worker environment (wrangler.toml or Dashboard) to the origin you want to proxy,
 *   e.g. https://m801.music.126.net
 * - Deploy with `wrangler publish` or via Cloudflare Dashboard
 *
 * Note: Ensure you have rights to proxy the target content and comply with its terms of service.
 */

const DEFAULT_TARGET_ORIGIN = 'https://m801.music.126.net';
const DEFAULT_CACHE_TTL = 86400; // 1 day

export default {
  async fetch(request, env, ctx) {
    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: preflightHeaders(),
      });
    }

    // Only allow GET/HEAD proxying for safety
    if (!['GET', 'HEAD'].includes(request.method)) {
      return new Response('Method Not Allowed', { status: 405, headers: corsHeaders() });
    }

    const incomingUrl = new URL(request.url);
    const targetOrigin = (env && env.TARGET_ORIGIN) || DEFAULT_TARGET_ORIGIN;

    // Build target URL. If you prefer passing full target via ?url=..., uncomment and use below with caution.
    // const targetUrl = incomingUrl.searchParams.get('url') || (targetOrigin + incomingUrl.pathname + incomingUrl.search);
    const targetUrl = targetOrigin + incomingUrl.pathname + incomingUrl.search;

    // Prevent open proxy: only allow requests to the configured target origin
    try {
      const parsed = new URL(targetUrl);
      if (parsed.origin !== new URL(targetOrigin).origin) {
        return new Response('Forbidden', { status: 403, headers: corsHeaders() });
      }
    } catch (e) {
      return new Response('Bad Request', { status: 400, headers: corsHeaders() });
    }

    // Prepare headers; copy client headers but override as needed
    const headers = new Headers();
    // We forward Range when present (important for media seeking)
    const range = request.headers.get('range');
    if (range) headers.set('Range', range);

    // Add anti-hotlinking headers commonly required by music sites
    headers.set('Referer', 'https://music.163.com/');
    headers.set('User-Agent', request.headers.get('user-agent') || 'Mozilla/5.0');

    // Accept common responses
    headers.set('Accept', request.headers.get('accept') || '*/*');

    const cache = caches.default;

    // Use range header as part of cache key to avoid mixing partial/full responses
    const cacheKey = new Request(targetUrl + (range ? `::range=${range}` : ''));

    // Try edge cache first (very fast)
    try {
      const cached = await cache.match(cacheKey);
      if (cached) {
        const resp = new Response(cached.body, {
          status: cached.status,
          statusText: cached.statusText,
          headers: new Headers(cached.headers),
        });
        setProxyResponseHeaders(resp, /*fromCache=*/ true);
        return resp;
      }
    } catch (e) {
      // Cache read errors shouldn't block serving
      console.warn('Cache read error', e);
    }

    // Fetch from origin with Cloudflare cache directives
    let fetched;
    try {
      fetched = await fetch(targetUrl, {
        method: 'GET',
        headers,
        cf: { cacheEverything: true, cacheTtl: DEFAULT_CACHE_TTL },
      });
    } catch (e) {
      return new Response('Bad Gateway', { status: 502, headers: corsHeaders() });
    }

    // If OK or Partial Content, asynchronously populate edge cache for future requests
    if (fetched && (fetched.ok || fetched.status === 206)) {
      // Clone before using
      const fclone = fetched.clone();
      ctx.waitUntil(
        cache.put(cacheKey, fclone).catch((err) => console.warn('Cache put failed', err))
      );
    }

    // Build response and attach proper CORS / expose headers
    const proxied = new Response(fetched.body, {
      status: fetched.status,
      statusText: fetched.statusText,
      headers: new Headers(fetched.headers),
    });

    setProxyResponseHeaders(proxied);

    // If upstream returned an error, surface a friendly message
    if (!fetched.ok && fetched.status !== 206) {
      return new Response('Bad Gateway', { status: 502, headers: corsHeaders() });
    }

    return proxied;
  },
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,HEAD,OPTIONS',
    'Access-Control-Allow-Headers': 'Range,Content-Type,Accept',
    'Access-Control-Max-Age': '86400',
  };
}

function preflightHeaders() {
  return {
    ...corsHeaders(),
    'Content-Length': '0',
  };
}

function setProxyResponseHeaders(resp, fromCache = false) {
  resp.headers.set('Access-Control-Allow-Origin', '*');
  resp.headers.set('Access-Control-Expose-Headers', 'Content-Length,Content-Range,ETag,Accept-Ranges,Cache-Control');
  resp.headers.set('Accept-Ranges', 'bytes');

  // Let browsers cache responses and Cloudflare honor s-maxage
  // If the origin provides Cache-Control, we do not overwrite it, otherwise we set a default
  if (!resp.headers.get('Cache-Control')) {
    resp.headers.set('Cache-Control', `public, max-age=3600, s-maxage=${DEFAULT_CACHE_TTL}, stale-while-revalidate=${DEFAULT_CACHE_TTL}`);
  }

  // Optional: mark if served from edge cache
  if (fromCache) resp.headers.set('X-Edge-Cache', 'HIT');
}

/*
Example wrangler.toml snippet to deploy with an env variable:

name = "my-audio-proxy"
main = "worker.js"
compatibility_date = "2026-01-01"

[vars]
TARGET_ORIGIN = "https://m801.music.126.net"

# Then deploy:
# npm i -g wrangler
# wrangler publish

*/