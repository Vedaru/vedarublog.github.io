<script lang="ts">
  import { onMount } from "svelte";

  type Message = { id: number; role: "user" | "assistant"; text: string };

  let messages: Message[] = [];
  let input = "";
  let loading = false;
  let idCounter = 1;

  function pushMessage(role: "user" | "assistant", text: string) {
    messages = [...messages, { id: idCounter++, role, text }];
  }

  // session id persisted in localStorage to carry conversation context
  const SESSION_KEY = "chat:sessionId";
  let sessionId: string | null = null;
  onMount(() => {
    sessionId = localStorage.getItem(SESSION_KEY);
  });

  async function send() {
    const text = input.trim();
    if (!text) return;
    pushMessage("user", text);
    input = "";
    loading = true;
    // create assistant placeholder message and keep its index
    const assistantId = idCounter;
    pushMessage("assistant", "");
    try {
      const wantStream = true; // enable streaming for better UX
      const res = await fetch("/api/chat/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, sessionId, stream: wantStream }),
      });

      if (!res.ok) {
        // try parse JSON error
        let errText = await res.text();
        try {
          const j: any = JSON.parse(errText);
          errText = j?.error ?? JSON.stringify(j);
        } catch {}
        // replace assistant placeholder
        messages = messages.map(m => (m.id === assistantId ? { ...m, text: `出错：${errText}` } : m));
        return;
      }

      const contentType = res.headers.get("content-type") || "";
      // If server returned JSON (non-stream)
      if (contentType.includes("application/json")) {
        const j: any = await res.json();
        // update sessionId if returned
        if (j?.sessionId) {
          sessionId = String(j.sessionId);
          localStorage.setItem(SESSION_KEY, sessionId);
        }
        const textReply = j?.text ?? "(空响应)";
        messages = messages.map(m => (m.id === assistantId ? { ...m, text: textReply } : m));
        return;
      }

      // Otherwise treat as a stream (text chunks). Use reader to progressively append
      const reader = res.body?.getReader();
      if (!reader) {
        const full = await res.text();
        messages = messages.map(m => (m.id === assistantId ? { ...m, text: full } : m));
        return;
      }

      const decoder = new TextDecoder();
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        // server may send initial JSON meta (sessionId) in the first line
        if (!sessionId) {
          // if accumulated starts with { and contains }, try parse
          accumulated += chunk;
          const newlineIndex = accumulated.indexOf('\n');
          if (newlineIndex !== -1) {
            const firstLine = accumulated.slice(0, newlineIndex).trim();
            if (firstLine.startsWith('{') && firstLine.endsWith('}')) {
              try {
                const meta: any = JSON.parse(firstLine);
                if (meta?.sessionId) {
                  sessionId = String(meta.sessionId);
                  localStorage.setItem(SESSION_KEY, sessionId);
                }
                // remove meta from accumulated
                accumulated = accumulated.slice(newlineIndex + 1);
              } catch {}
            }
          }
          // set partial text
          messages = messages.map(m => (m.id === assistantId ? { ...m, text: accumulated } : m));
          continue;
        }

        // append normally
        accumulated += chunk;
        messages = messages.map(m => (m.id === assistantId ? { ...m, text: accumulated } : m));
      }
    } catch (e) {
      messages = messages.map(m => (m.id === assistantId ? { ...m, text: `请求失败：${e}` } : m));
    } finally {
      loading = false;
    }
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  // 示例欢迎语
  onMount(() => {
    pushMessage("assistant", "你好！这是一个 AI 聊天页面示例。输入消息并回车发送。");
  });
</script>

<style>
  .chat-container { max-width: 800px; }
  .bubble { padding: 0.5rem 0.75rem; border-radius: 0.5rem; }
  .bubble.user { background: rgba(59,130,246,0.12); align-self: flex-end; }
  .bubble.assistant { background: rgba(156,163,175,0.12); align-self: flex-start; }

  /* Ensure chat input and bubbles adapt to theme via CSS variables */
  .chat-input {
    background: var(--card-bg);
    color: var(--text-foreground, inherit);
    border: 1px solid var(--line-divider);
  }

  .chat-send-btn {
    background: var(--primary);
    color: #000; /* light theme: black text */
    border: none;
    cursor: pointer;
  }

  .chat-send-btn:hover {
    filter: brightness(0.95);
  }

  .chat-send-btn:active {
    filter: brightness(0.9);
  }

  /* Dark theme: ensure send button text is white */
  :global(.dark) .chat-send-btn,
  :global([data-theme="dark"]) .chat-send-btn {
    color: #fff;
  }
</style>

<div class="chat-container mx-auto flex flex-col gap-4">
  <div class="flex flex-col gap-3 min-h-[200px] p-4 card-base">
    {#each messages as m}
      <div class="flex">
        <div class="max-w-[80%]">
          <div class={"bubble " + m.role + " text-sm"}>
            <strong class="mr-2">{m.role === 'user' ? '你' : 'AI'}:</strong>
            {m.text}
          </div>
        </div>
      </div>
    {/each}
  </div>

  <div class="flex items-center gap-3">
    <textarea
      class="flex-1 p-2 rounded-md resize-none chat-input"
      rows="2"
      bind:value={input}
      on:keydown={onKey}
      placeholder="输入消息，按 Enter 发送（Shift+Enter 换行）"></textarea>
    <button class="px-4 py-2 rounded-md chat-send-btn" on:click={send} disabled={loading}>
      {#if loading}
        发送中...
      {:else}
        发送
      {/if}
    </button>
  </div>
</div>
