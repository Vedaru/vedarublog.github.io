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

async function callCloudflareAI(prompt: string, ai: any, model: string, systemPrompt?: string): Promise<string> {
  console.log("[Cloudflare AI] Calling model:", model);
  
  // Build messages array with optional system prompt
  const messages: Array<{role: string, content: string}> = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });
  
  try {
    const response = await ai.run(model, {
      messages: messages,
      temperature: 0.7,
      max_tokens: 1024
    });
    
    if (response.response) {
      return response.response;
    }
    
    throw new Error("AI 返回了空响应");
  } catch (error: any) {
    throw new Error(`Cloudflare AI error: ${error.message}`);
  }
}

export const POST: APIRoute = async ({ request, locals }) => {
  // Get environment variables from Cloudflare runtime or Astro env
  const runtime = (locals as any)?.runtime;
  const env = runtime?.env || import.meta.env;
  
  // Cloudflare AI binding
  const AI = env.AI;
  const CF_AI_MODEL = env.CF_AI_MODEL || import.meta.env.CF_AI_MODEL || "@cf/meta/llama-3-8b-instruct";
  let SYSTEM_PROMPT = env.SYSTEM_PROMPT || import.meta.env.SYSTEM_PROMPT || "";

  // 强制使用中文回复：如果用户未在 SYSTEM_PROMPT 中指定语言，则追加中文回复要求
  try {
    const needsChinese = !/请用中文|用中文回答|中文/.test(SYSTEM_PROMPT);
    if (needsChinese) {
      const suffix = "请用中文回答。除非用户明确要求其他语言，否则始终使用简体中文回复。";
      SYSTEM_PROMPT = SYSTEM_PROMPT ? `${SYSTEM_PROMPT}\n\n${suffix}` : suffix;
    }
  } catch (e) {
    // 安全回退：若正则出错，仍追加中文要求
    SYSTEM_PROMPT = SYSTEM_PROMPT ? `${SYSTEM_PROMPT}\n\n请用中文回答。` : "请用中文回答。";
  }

  console.log("[API] Cloudflare AI available:", !!AI);
  console.log("[API] CF_AI_MODEL:", CF_AI_MODEL);
  console.log("[API] SYSTEM_PROMPT:", SYSTEM_PROMPT ? "已设置(含语言要求)" : "未设置");
  
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
  const key = `cf-ai:${CF_AI_MODEL}:` + prompt;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) {
    // return JSON wrapper for cached result
    const sess = clientSessionId || `s_${Math.random().toString(36).slice(2,9)}`;
    return new Response(JSON.stringify({ ok: true, text: cached.text, sessionId: sess }), { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" } });
  }

  if (!AI) {
    console.error("[API] Cloudflare AI binding not available!");
    return new Response(JSON.stringify({ 
      error: "Cloudflare AI not configured",
      hint: "请在 Cloudflare Pages 设置中添加 AI binding"
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const reply = await callCloudflareAI(prompt, AI, CF_AI_MODEL, SYSTEM_PROMPT);
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
