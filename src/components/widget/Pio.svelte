<script>
import { onDestroy, onMount } from "svelte";
import { pioConfig } from "@/config";

// 将配置转换为 Pio 插件需要的格式
const pioOptions = {
	mode: pioConfig.mode,
	hidden: pioConfig.hiddenOnMobile,
	content: pioConfig.dialog || {},
	model: pioConfig.models || ["/pio/models/pio/model.json"],
};

// 全局Pio实例引用
let pioInstance = null;
let pioInitialized = false;
let pioContainer;
let pioCanvas;
let userInput = "";
let isThinking = false;
let isChatting = false; // 添加聊天状态变量
let pioText = "你好呀！想和我聊聊天吗？"; // 这里的变量名参考你组件原有的文本变量
  
  // 替换成你刚才部署的 Worker 地址
  const AI_API = "https://ai.vedaru.cn";

  async function handleChat() {
    if (!userInput) return;
    isThinking = true;
    const tempInput = userInput;
    userInput = "";
    
    try {
      const res = await fetch(AI_API, {
        method: "POST",
        body: JSON.stringify({ prompt: tempInput })
      });
      const data = await res.json();
      // 调用原生 Pio 展示消息的方法，或者直接修改文本变量
      showPioMessage(data.response); 
    } catch (err) {
      showPioMessage("哎呀，网络好像出错了...");
    } finally {
      isThinking = false;
    }
  }

  function showPioMessage(message) {
    pioText = message;
    // 如果 Pio 实例存在，可以调用其消息显示方法
    if (typeof window !== "undefined" && window.Paul_Pio && window.Paul_Pio.prototype) {
      // 假设有一个全局实例或方法来显示消息
      // 这里可以调用 pio.js 的 message 方法
    }
  }

// 样式已通过 Layout.astro 静态引入，无需动态加载

// 等待 DOM 加载完成后再初始化 Pio
function initPio() {
	if (typeof window !== "undefined" && typeof Paul_Pio !== "undefined") {
		try {
			// 确保DOM元素存在
			if (pioContainer && pioCanvas && !pioInitialized) {
				pioInstance = new Paul_Pio(pioOptions);
				pioInitialized = true;
				console.log("Pio initialized successfully (Svelte)");
			} else if (!pioContainer || !pioCanvas) {
				console.warn("Pio DOM elements not found, retrying...");
				setTimeout(initPio, 100);
			}
		} catch (e) {
			console.error("Pio initialization error:", e);
		}
	} else {
		// 如果 Paul_Pio 还未定义，稍后再试
		setTimeout(initPio, 100);
	}
}

// 样式已通过 Layout.astro 静态引入，无需动态加载函数

// 加载必要的脚本
function loadPioAssets() {
	if (typeof window === "undefined") return;

	// 样式已通过 Layout.astro 静态引入

	// 加载JS脚本
	const loadScript = (src, id) => {
		return new Promise((resolve, reject) => {
			if (document.querySelector(`#${id}`)) {
				resolve();
				return;
			}
			const script = document.createElement("script");
			script.id = id;
			script.src = src;
			script.onload = resolve;
			script.onerror = reject;
			document.head.appendChild(script);
		});
	};

	// 按顺序加载脚本
	loadScript("/pio/static/l2d.js", "pio-l2d-script")
		.then(() => loadScript("/pio/static/pio.js", "pio-main-script"))
		.then(() => {
			// 脚本加载完成后初始化
			setTimeout(initPio, 100);
		})
		.catch((error) => {
			console.error("Failed to load Pio scripts:", error);
		});
}

// 样式已通过 Layout.astro 静态引入，无需页面切换监听

onMount(() => {
	if (!pioConfig.enable) return;

	// 如果配置了手机端隐藏，且当前屏幕宽度小于 1280px (平板/手机)，则直接终止，不加载脚本
    if (pioConfig.hiddenOnMobile && window.matchMedia("(max-width: 1280px)").matches) {
        return;
    }

	// 加载资源并初始化
	loadPioAssets();

	// 监听 Pio 聊天切换事件
	const handleToggleChat = () => {
		isChatting = !isChatting;
	};
	window.addEventListener('togglePioChat', handleToggleChat);

	// 在组件销毁时移除监听器
	return () => {
		window.removeEventListener('togglePioChat', handleToggleChat);
	};
});

onDestroy(() => {
	// Svelte 组件销毁时不需要清理 Pio 实例
	// 因为我们希望它在页面切换时保持状态
	console.log("Pio Svelte component destroyed (keeping instance alive)");
});
</script>

{#if pioConfig.enable}
  <div class={`pio-container ${pioConfig.position || 'right'}`} bind:this={pioContainer}>
    <div class="pio-action"></div>
    <canvas 
      id="pio" 
      bind:this={pioCanvas}
      width={pioConfig.width || 280} 
      height={pioConfig.height || 250}
    ></canvas>  
  	{#if isChatting}
    <div class="pio-chat-container">
      {#if pioText}
        <div class="pio-chat-message">{pioText}</div>
      {/if}
      <div class="pio-chat-input-area">
        <input 
          bind:value={userInput} 
          on:keydown={(e) => e.key === 'Enter' && handleChat()}
          placeholder="输入内容..." 
        />
        <button on:click={handleChat} disabled={isThinking}>
          {isThinking ? '...' : '发送'}
        </button>
      </div>
    </div>
  	{/if}
  </div>
{/if}

<style>
.pio-chat-container {
    position: absolute;
    bottom: 100%;
    left: 0;
    right: 0;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 1em;
    padding: 1em;
    margin-bottom: 0.5em;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }

  .pio-chat-message {
    margin-bottom: 0.5em;
    font-size: 0.9em;
    color: #333;
  }

  .pio-chat-input-area {
    display: flex;
    gap: 4px;
    margin-top: 0.5em;
    align-items: center;
  }
  .pio-chat-input-area input {
    flex: 1;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 4px 8px;
    outline: none;
    font-size: 12px;
  }
  .pio-chat-input-area button {
    border: none;
    background: var(--primary);
    color: white;
    border-radius: 4px;
    padding: 4px 8px;
    cursor: pointer;
    font-size: 12px;
    white-space: nowrap;
  }
  .pio-chat-input-area button:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
</style>