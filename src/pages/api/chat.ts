import type { APIRoute } from "astro";

// Mark this route as server-rendered to handle POST requests
export const prerender = false;

// Simple in-memory rate limiter and cache.
// Note: serverless may not preserve memory between invocations; this is best-effort protection.
const ipRateMap = new Map<string, { count: number; resetAt: number }>();
const cache = new Map<string, { text: string; expiresAt: number }>();

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 120; // max requests per IP per window
const CACHE_TTL_MS = 30 * 1000; // cache identical prompt for 30s

async function callGroq(prompt: string, apiKey: string, model: string, timeout: number, systemPrompt?: string): Promise<string> {
  // Groq uses OpenAI-compatible API
  const url = "https://api.groq.com/openai/v1/chat/completions";
  
  console.log("[Groq] Calling model:", model);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  // Build messages array with optional system prompt
  const messages: Array<{role: string, content: string}> = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });
  
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1024
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Groq API error ${res.status}: ${txt}`);
    }

    const json: any = await res.json();
    
    if (json.error) {
      throw new Error(String(json.error.message || json.error));
    }

    if (json.choices && json.choices.length > 0) {
      return json.choices[0].message.content || "(空响应)";
    }

    return JSON.stringify(json);
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`请求超时（${timeout}ms）。`);
    }
    throw error;
  }
}

export const POST: APIRoute = async ({ request, locals }) => {
  // Get environment variables from Cloudflare runtime or Astro env
  const runtime = (locals as any)?.runtime;
  const env = runtime?.env || import.meta.env;
  
  const GROQ_API_KEY = env.GROQ_API_KEY || import.meta.env.GROQ_API_KEY;
  const GROQ_MODEL = env.GROQ_MODEL || import.meta.env.GROQ_MODEL || "llama3-8b-8192";
  const API_TIMEOUT = parseInt(env.API_TIMEOUT || import.meta.env.API_TIMEOUT || "30000");
  const SYSTEM_PROMPT = env.SYSTEM_PROMPT || import.meta.env.SYSTEM_PROMPT || "";
  
  console.log("[API] GROQ_API_KEY available:", !!GROQ_API_KEY);
  console.log("[API] GROQ_MODEL:", GROQ_MODEL);
  console.log("[API] SYSTEM_PROMPT:", SYSTEM_PROMPT ? "已设置" : "未设置");
  
  // More lenient content-type check for development
  const ct = request.headers.get("content-type") || "";
  console.log("[API] Received Content-Type:", ct);
  console.log("[API] Request method:", request.method);
  
  // Accept requests without strict content-type check in case of proxy/dev issues
  // but still try to parse JSON body

  let body: any;
  try {
    // Clone request before reading to allow debugging
    const clonedRequest = request.clone();
    body = await request.json();
    console.log("[API] Parsed body:", JSON.stringify(body));
  } catch (e: any) {
    console.error("[API] JSON parse error:", e.message);
    // Try to read raw body for debugging
    try {
      const rawBody = await request.text();
      console.error("[API] Raw body was:", rawBody || "(empty)");
    } catch {}
    return new Response(JSON.stringify({ 
      error: "Invalid JSON", 
      detail: e.message 
    }), { 
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
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
  const key = `groq:${GROQ_MODEL}:` + prompt;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) {
    // return JSON wrapper for cached result
    const sess = clientSessionId || `s_${Math.random().toString(36).slice(2,9)}`;
    return new Response(JSON.stringify({ ok: true, text: cached.text, sessionId: sess }), { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" } });
  }

  if (!GROQ_API_KEY) {
    console.error("[API] GROQ_API_KEY is undefined!");
    console.error("[API] import.meta.env.GROQ_API_KEY:", import.meta.env.GROQ_API_KEY);
    return new Response(JSON.stringify({ 
      error: "GROQ_API_KEY not configured on server",
      hint: "请检查 .env 文件是否存在且包含 GROQ_API_KEY，并重启开发服务器"
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const reply = await callGroq(prompt, GROQ_API_KEY, GROQ_MODEL, API_TIMEOUT, SYSTEM_PROMPT);
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

      return new Response(stream, { 
        status: 200, 
        headers: { 
          "Content-Type": "text/plain; charset=utf-8", 
          "Cache-Control": "no-store",
          "X-Session-Id": sessionId
        } 
      });
    }

    // default: return JSON
    return new Response(JSON.stringify({ ok: true, text: reply, sessionId }), { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" } });
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ ok: false, error: msg }), { status: 502, headers: { "Content-Type": "application/json; charset=utf-8" } });
  }
};
