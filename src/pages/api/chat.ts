import type { APIRoute } from "astro";

// Simple in-memory rate limiter and cache.
// Note: serverless may not preserve memory between invocations; this is best-effort protection.
const ipRateMap = new Map<string, { count: number; resetAt: number }>();
const cache = new Map<string, { text: string; expiresAt: number }>();

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 120; // max requests per IP per window
const CACHE_TTL_MS = 30 * 1000; // cache identical prompt for 30s

const HF_API_KEY = process.env.HF_API_KEY || process.env.HF_TOKEN; // support two common names
const HF_MODEL = process.env.HF_MODEL || "google/flan-t5-base"; // override in env
const HF_TIMEOUT = parseInt(process.env.HF_TIMEOUT || "30000"); // 30s default timeout

async function callHuggingFace(prompt: string): Promise<string> {
  const url = `https://api-inference.huggingface.co/models/${HF_MODEL}`;
  
  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HF_TIMEOUT);
  
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        inputs: prompt, 
        options: { wait_for_model: true },
        parameters: { max_length: 512, temperature: 0.7 }
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`HF API error ${res.status}: ${txt}`);
    }

    const json: any = await res.json();
    // HF inference may return { error } or array or object with generated_text
    if (json.error) throw new Error(String(json.error));

    if (Array.isArray(json) && json.length > 0) {
      // text-generation models often return [{generated_text: '...'}]
      const item = json[0] as any;
      return String(item.generated_text ?? item[0] ?? JSON.stringify(item));
    }

    if (typeof json === "object" && json !== null) {
      if (typeof (json as any).generated_text === "string") return (json as any).generated_text;
      return JSON.stringify(json);
    }

    return String(json);
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`请求超时（${HF_TIMEOUT}ms）。可能需要配置代理或尝试其他模型。`);
    }
    if (error.cause?.code === 'UND_ERR_CONNECT_TIMEOUT') {
      throw new Error('网络连接超时。请检查网络连接或配置 HTTP 代理（设置 HTTP_PROXY 环境变量）。');
    }
    throw error;
  }
}

export const POST: APIRoute = async ({ request }) => {
  // Basic content-type check
  const ct = request.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    return new Response(JSON.stringify({ error: "Expected application/json" }), { status: 400 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const prompt: string = (body?.message || body?.prompt || "").toString();
  const wantStream = Boolean(body?.stream === true || body?.stream === "true");
  const clientSessionId = typeof body?.sessionId === "string" && body.sessionId.trim() ? body.sessionId.trim() : undefined;
  if (!prompt || prompt.trim().length === 0) {
    return new Response(JSON.stringify({ error: "message is required" }), { status: 400 });
  }

  if (prompt.length > 3000) {
    return new Response(JSON.stringify({ error: "message too long" }), { status: 413 });
  }

  // Rate limiting by IP (best-effort)
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("cf-connecting-ip") || "unknown";
  const now = Date.now();
  const stat = ipRateMap.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
  if (now > stat.resetAt) {
    stat.count = 0;
    stat.resetAt = now + RATE_LIMIT_WINDOW_MS;
  }
  stat.count += 1;
  ipRateMap.set(ip, stat);
  if (stat.count > RATE_LIMIT_MAX) {
    return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429 });
  }

  // Cache lookup
  const key = `hf:${HF_MODEL}:` + prompt;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) {
    // return JSON wrapper for cached result
    const sess = clientSessionId || `s_${Math.random().toString(36).slice(2,9)}`;
    return new Response(JSON.stringify({ ok: true, text: cached.text, sessionId: sess }), { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" } });
  }

  if (!HF_API_KEY) {
    return new Response(JSON.stringify({ error: "HF_API_KEY not configured on server" }), { status: 500 });
  }

  try {
    const reply = await callHuggingFace(prompt);
    // cache short-lived
    cache.set(key, { text: reply, expiresAt: Date.now() + CACHE_TTL_MS });

    // determine session id
    const sessionId = clientSessionId || `s_${Math.random().toString(36).slice(2,9)}`;

    // If client asked for stream, stream the reply in small chunks (best-effort). Note: HF inference API may not stream.
    if (wantStream) {
      const encoder = new TextEncoder();
      const chunkSize = 64;
      const stream = new ReadableStream({
        async start(controller) {
          // send an initial small JSON meta event with sessionId
          controller.enqueue(encoder.encode(JSON.stringify({ sessionId }) + "\n"));
          // stream the text in chunks with small delay to simulate incremental streaming
          for (let i = 0; i < reply.length; i += chunkSize) {
            const part = reply.slice(i, i + chunkSize);
            controller.enqueue(encoder.encode(part));
            // small delay to make it feel streaming-y
            await new Promise((r) => setTimeout(r, 40));
          }
          controller.close();
        },
      });

      return new Response(stream, { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
    }

    // default: return JSON
    return new Response(JSON.stringify({ ok: true, text: reply, sessionId }), { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" } });
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ ok: false, error: msg }), { status: 502, headers: { "Content-Type": "application/json; charset=utf-8" } });
  }
};
