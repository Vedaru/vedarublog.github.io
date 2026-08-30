// Wrapper around the upstream Meting app that adds:
//   1. shared-secret auth (X-Meting-Key header)
//   2. per-IP rate limit
//   3. structured access log
//
// We do NOT modify the vendored app.js so upstream syncs stay clean.

import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import upstreamApp from './app.js'

const PORT = Number(process.env.PORT || 3000)
const API_KEY = process.env.METING_KEY || ''  // shared secret
const RATE_LIMIT = Number(process.env.RATE_LIMIT_PER_MIN || 60)  // req/min/IP

// ---------- helpers ----------
const now = () => new Date().toISOString()

const clientIp = (c) => {
    // CF-Connecting-IP is set by Cloudflare; X-Forwarded-For is the fallback
    return (
        c.req.header('cf-connecting-ip') ||
        (c.req.header('x-forwarded-for') || '').split(',')[0].trim() ||
        c.req.header('x-real-ip') ||
        'unknown'
    )
}

// ---------- in-memory rate limit (good enough for one process, 128 MB cap) ----------
// Each entry: { count, resetAt }
const buckets = new Map()
const RL_WINDOW_MS = 60_000

function rateLimitMiddleware(limit) {
    return async (c, next) => {
        const ip = clientIp(c)
        const now_ms = Date.now()
        let b = buckets.get(ip)
        if (!b || b.resetAt <= now_ms) {
            b = { count: 0, resetAt: now_ms + RL_WINDOW_MS }
            buckets.set(ip, b)
        }
        b.count++
        const remaining = Math.max(0, limit - b.count)
        c.header('X-RateLimit-Limit', String(limit))
        c.header('X-RateLimit-Remaining', String(remaining))
        c.header('X-RateLimit-Reset', String(Math.ceil(b.resetAt / 1000)))
        if (b.count > limit) {
            c.header('Retry-After', String(Math.ceil((b.resetAt - now_ms) / 1000)))
            console.log(JSON.stringify({
                t: now(), ip, key: 'no', status: 429, path: c.req.path, why: 'rate_limit'
            }))
            return c.json({ error: 'rate_limited', limit, window_s: 60 }, 429)
        }
        await next()
    }
}

// periodic cleanup so the map doesn't grow forever
setInterval(() => {
    const cutoff = Date.now()
    for (const [ip, b] of buckets) {
        if (b.resetAt <= cutoff) buckets.delete(ip)
    }
}, 5 * 60_000).unref()

// ---------- the wrapper app ----------
const app = new Hono()

// CORS for any browser client (we set Access-Control-Allow-Origin: * in upstream too)
app.use('*', cors())

// Rate limit applies to everything
app.use('*', rateLimitMiddleware(RATE_LIMIT))

// Health endpoint — open, no key, exempt from rate limit
app.get('/healthz', (c) => c.json({ ok: true, ts: Date.now() }))

// Auth + log middleware for /api and /test
app.use('/api', async (c, next) => {
    if (!API_KEY) {
        // fail closed: if we didn't configure a key, refuse to serve the API
        console.log(JSON.stringify({ t: now(), ip: clientIp(c), key: 'missing', status: 503, path: c.req.path, why: 'server_misconfigured' }))
        return c.json({ error: 'server_misconfigured' }, 503)
    }
    const provided = c.req.header('x-meting-key') || ''
    if (provided !== API_KEY) {
        console.log(JSON.stringify({ t: now(), ip: clientIp(c), key: 'bad', status: 401, path: c.req.path }))
        return c.json({ error: 'unauthorized' }, 401)
    }
    await next()
})
app.use('/test', async (c, next) => {
    // /test can be open but still rate-limited and logged
    await next()
})

// Access log for /api and /test
app.use('/api', async (c, next) => {
    const t0 = Date.now()
    await next()
    console.log(JSON.stringify({
        t: now(), ip: clientIp(c), key: 'ok', status: c.res.status, path: c.req.path, ms: Date.now() - t0
    }))
})

// Intercept NetEase type=url requests and proxy the bytes instead of letting
// the upstream app emit a 302 redirect. Why: the upstream returns a 302 to a
// signed NetEase CDN URL that's short-lived. Clients in distant regions
// (GitHub Actions runners in us/eu) sometimes receive a 104 KB error page
// when following the redirect, while the URL is still valid. By fetching
// the bytes on this server (which sits close to NetEase's CDN) and streaming
// them back, every client gets a consistent, reliable response.
async function proxyNeteaseSong(c) {
    // Call the upstream app to get the 302 (we don't follow it).
    const upstreamResp = await upstreamApp.fetch(
        new Request(c.req.url, { method: 'GET', headers: c.req.raw.headers }),
        c.env,
    )
    if (upstreamResp.status >= 400) {
        return upstreamResp
    }
    const location = upstreamResp.headers.get('location')
    if (!location) {
        // upstream returned a text body (e.g. '@...' marker) — pass through
        return upstreamResp
    }

    // Fetch the actual audio from NetEase, server-side, with retries on
    // transient failure. NetEase often streams responses with
    // `Transfer-Encoding: chunked` and no `Content-Length` header, so we
    // can't use the header to judge success — we just check status.
    //
    // IMPORTANT: We impersonate a real browser User-Agent and send a Cookie
    // header. NetEase's CDN terminates connections that look like bots
    // (returning 200 then RST'ing mid-stream — manifests as "terminated" on
    // the client). This matches what the upstream Meting app does for its
    // own calls to interface.music.163.com.
    //
    // On retry we re-call upstreamApp.fetch() to get a FRESH signed URL.
    // NetEase's signed URLs are short-lived; if the first attempt was
    // ~expired we'd otherwise loop on the same dead URL.
    const browserHeaders = {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
        'Referer': 'https://music.163.com/',
        'Cookie': '__remember_me=true',
        'Accept': '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    }
    let netResp
    let lastErr
    for (let attempt = 0; attempt < 4; attempt++) {
        // Re-resolve the signed URL on every attempt — NetEase URLs expire.
        let freshLocation = location
        if (attempt > 0) {
            try {
                const retryUpstream = await upstreamApp.fetch(
                    new Request(c.req.url, { method: 'GET', headers: c.req.raw.headers }),
                    c.env,
                )
                const retryLoc = retryUpstream.headers.get('location')
                if (retryLoc) freshLocation = retryLoc
            } catch {
                // fall through with the stale URL — better than nothing
            }
        }
        try {
            netResp = await fetch(freshLocation, {
                headers: browserHeaders,
                signal: AbortSignal.timeout(60_000),
            })
            // NetEase returns a tiny (~104 KB) HTML/JSON error page when the
            // signed URL is expired or region-blocked. A real song is at
            // least 500 KB. When Content-Length is missing (chunked transfer),
            // trust netResp.ok and let the blog-side size check catch issues.
            const clHeader = netResp.headers.get('content-length')
            const cl = clHeader ? Number(clHeader) : null
            if (netResp.ok && (cl === null || cl >= 500_000)) {
                // Diagnostic: log what the upstream gave us so we can see
                // whether chunked (CL missing) responses are common.
                console.log(JSON.stringify({
                    t: now(), level: 'song_ok', attempt, url: c.req.path,
                    cl: clHeader ?? 'chunked', status: netResp.status,
                }))
                break
            }
            if (netResp.ok) {
                // Drain so the connection can be reused/closed cleanly
                try { await netResp.arrayBuffer() } catch {}
            }
            lastErr = `HTTP ${netResp?.status ?? 'unknown'} cl=${clHeader ?? '?'}`
            // Diagnostic: surface failed attempts so CI logs can show why a
            // song was eventually rejected after 4 retries.
            console.log(JSON.stringify({
                t: now(), level: 'song_retry', attempt, url: c.req.path,
                cl: clHeader ?? 'chunked', status: netResp?.status, lastErr,
            }))
        } catch (e) {
            lastErr = e.message
        }
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)))
        netResp = null
    }
    if (!netResp || !netResp.ok) {
        return new Response(`upstream net error: ${lastErr ?? 'unknown'}`, { status: 502 })
    }

    // Stream the bytes back to the client with pass-through headers.
    const headers = new Headers()
    const ct = netResp.headers.get('content-type')
    if (ct) headers.set('Content-Type', ct)
    const cl = netResp.headers.get('content-length')
    if (cl) headers.set('Content-Length', cl)
    headers.set('Cache-Control', 'public, max-age=300')
    headers.set('X-Proxied-By', 'meting-api-wrapper')
    return new Response(netResp.body, { status: 200, headers })
}

// Register a GET /api route that decides whether to proxy or delegate to upstream.
app.get('/api', async (c) => {
    const url = new URL(c.req.url)
    const server = url.searchParams.get('server') || 'tencent'
    const type = url.searchParams.get('type') || 'playlist'
    if (server === 'netease' && type === 'url') {
        return proxyNeteaseSong(c)
    }
    // Everything else: delegate to upstream
    return upstreamApp.fetch(c.req.raw, c.env)
})

// Mount upstream routes for non-/api paths (root /)
app.route('/', upstreamApp)

// ---------- start ----------
import { serve } from '@hono/node-server'
serve({ fetch: app.fetch, port: PORT })
console.log(JSON.stringify({ t: now(), msg: 'meting-api-wrapper started', port: PORT, rate_limit_per_min: RATE_LIMIT, key_set: API_KEY ? 'yes' : 'no' }))
