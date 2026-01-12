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
    // 示例欢迎语
    pushMessage("assistant", "来和雪初音聊天吧~");
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

      // Read sessionId from response header
      const headerSessionId = res.headers.get("X-Session-Id");
      if (headerSessionId) {
        sessionId = headerSessionId;
        localStorage.setItem(SESSION_KEY, sessionId);
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
</script>

<div class="chat-window-content">
  <div class="chat-header">
    <h2 class="chat-title">AI 聊天</h2>
    <p class="chat-intro">在这里与 AI 聊天，由 Cloudflare AI 提供技术支持。</p>
  </div>

  <div class="chat-container">
    <div class="messages-container">
      {#each messages as m (m.id)}
        <div class="message-wrapper {m.role}">
          <div class="bubble {m.role}">
            <strong class="role-label">{m.role === 'user' ? '你' : 'AI'}:</strong>
            <span class="message-text">{m.text}</span>
          </div>
        </div>
      {/each}
    </div>

    <div class="input-container">
      <textarea
        class="chat-input"
        rows="2"
        bind:value={input}
        on:keydown={onKey}
        placeholder="输入消息，按 Enter 发送（Shift+Enter 换行）"
      ></textarea>
      <button class="chat-send-btn" on:click={send} disabled={loading}>
        {#if loading}
          发送中...
        {:else}
          发送
        {/if}
      </button>
    </div>
  </div>
</div>

<style>
  .chat-window-content {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--card-bg);
    overflow: hidden;
  }

  .chat-header {
    padding: 20px 24px;
    border-bottom: 1px solid var(--border-color, #e5e7eb);
    flex-shrink: 0;
  }

  .chat-title {
    margin: 0 0 8px 0;
    font-size: 24px;
    font-weight: 700;
    color: var(--text-color);
  }

  .chat-intro {
    margin: 0;
    color: var(--text-secondary, #6b7280);
    font-size: 14px;
  }

  .chat-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 16px 24px 24px;
    gap: 16px;
  }

  .messages-container {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    background: var(--bg-color, #ffffff);
    border: 1px solid var(--border-color, #e5e7eb);
    border-radius: 12px;
    min-height: 200px;
  }

  .message-wrapper {
    display: flex;
    width: 100%;
  }

  .message-wrapper.user {
    justify-content: flex-end;
  }

  .message-wrapper.assistant {
    justify-content: flex-start;
  }

  .bubble {
    max-width: 80%;
    padding: 10px 14px;
    border-radius: 12px;
    font-size: 14px;
    line-height: 1.5;
    word-wrap: break-word;
  }

  .bubble.user {
    background: rgba(59, 130, 246, 0.12);
    color: var(--text-color);
  }

  .bubble.assistant {
    background: rgba(156, 163, 175, 0.12);
    color: var(--text-color);
  }

  .role-label {
    font-weight: 600;
    margin-right: 8px;
  }

  .message-text {
    white-space: pre-wrap;
  }

  .input-container {
    display: flex;
    gap: 12px;
    align-items: flex-end;
    flex-shrink: 0;
  }

  .chat-input {
    flex: 1;
    padding: 10px 14px;
    border-radius: 8px;
    resize: none;
    font-size: 14px;
    line-height: 1.5;
    background: var(--card-bg);
    color: var(--text-color);
    border: 1px solid var(--border-color, #e5e7eb);
    transition: border-color 0.2s ease;
    font-family: inherit;
  }

  .chat-input:focus {
    outline: none;
    border-color: var(--primary-color, #3b82f6);
  }

  .chat-input::placeholder {
    color: var(--text-secondary, #6b7280);
  }

  .chat-send-btn {
    padding: 10px 20px;
    background: var(--primary-color, #3b82f6);
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
    height: fit-content;
  }

  .chat-send-btn:hover:not(:disabled) {
    filter: brightness(0.95);
    transform: translateY(-1px);
  }

  .chat-send-btn:active:not(:disabled) {
    filter: brightness(0.9);
    transform: translateY(0);
  }

  .chat-send-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* Dark mode styles */
  :global(.dark) .chat-window-content {
    background: var(--card-bg);
  }

  :global(.dark) .chat-header {
    border-color: var(--border-color);
  }

  :global(.dark) .chat-title {
    color: var(--text-color);
  }

  :global(.dark) .chat-intro {
    color: var(--text-secondary);
  }

  :global(.dark) .messages-container {
    background: var(--card-bg);
    border-color: var(--border-color);
  }

  :global(.dark) .bubble {
    color: var(--text-color);
  }

  :global(.dark) .chat-input {
    background: var(--card-bg);
    color: var(--text-color);
    border-color: var(--border-color);
  }

  :global(.dark) .chat-input::placeholder {
    color: var(--text-secondary);
  }

  /* Responsive styles */
  @media (max-width: 768px) {
    .chat-header {
      padding: 16px 20px;
    }

    .chat-container {
      padding: 12px 20px 20px;
    }

    .messages-container {
      padding: 12px;
    }

    .bubble {
      max-width: 90%;
      font-size: 13px;
    }
  }

  /* Scrollbar styles */
  .messages-container::-webkit-scrollbar {
    width: 8px;
  }

  .messages-container::-webkit-scrollbar-track {
    background: transparent;
  }

  .messages-container::-webkit-scrollbar-thumb {
    background: var(--border-color, #e5e7eb);
    border-radius: 4px;
  }

  .messages-container::-webkit-scrollbar-thumb:hover {
    background: var(--text-secondary, #6b7280);
  }

  :global(.dark) .messages-container::-webkit-scrollbar-thumb {
    background: var(--border-color);
  }

  :global(.dark) .messages-container::-webkit-scrollbar-thumb:hover {
    background: var(--text-secondary);
  }
</style>
