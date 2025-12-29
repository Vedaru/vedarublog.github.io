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

  async function send() {
    const text = input.trim();
    if (!text) return;
    pushMessage("user", text);
    input = "";
    loading = true;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) {
        const err = await res.text();
        pushMessage("assistant", `出错：${err}`);
      } else {
        const data = await res.text();
        pushMessage("assistant", data || "(空响应)");
      }
    } catch (e) {
      pushMessage("assistant", `请求失败：${e}`);
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
</style>

<div class="chat-container mx-auto flex flex-col gap-4">
  <div class="flex flex-col gap-3 min-h-[200px] p-4 border border-gray-200 rounded-md bg-white/60 dark:bg-[#0b1220]/60">
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
      class="flex-1 p-2 border rounded-md resize-none"
      rows="2"
      bind:value={input}
      on:keydown={onKey}
      placeholder="输入消息，按 Enter 发送（Shift+Enter 换行）"></textarea>
    <button class="px-4 py-2 bg-blue-600 text-white rounded-md" on:click={send} disabled={loading}>
      {#if loading}
        发送中...
      {:else}
        发送
      {/if}
    </button>
  </div>
</div>
