<script>
import { onDestroy, onMount } from "svelte";
import { pioConfig } from "@/config";

export let baseURL = "/";

// 将配置转换为 Pio 插件需要的格式
const pioOptions = {
	mode: pioConfig.mode,
	hidden: pioConfig.hiddenOnMobile,
	content: pioConfig.dialog || {},
	model: (pioConfig.models || ["/pio/models/pio/model.json"]).map(path => 
		path.startsWith('/') ? baseURL + path.replace(/^\//, '') : path
	),
};

// 全局Pio实例引用
let pioInstance = null;
let pioInitialized = false;
let pioContainer;
let pioCanvas;
let removeShowListener;

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

	// 加载JS脚本 - 检查是否已加载
	const checkAndLoadScript = (src, id) => {
		// 先检查全局对象或script标签
		if (document.querySelector(`script[src="${src}"]`) || document.querySelector(`#${id}`)) {
			return Promise.resolve();
		}
		
		return new Promise((resolve, reject) => {
			const script = document.createElement("script");
			script.id = id;
			script.src = src;
			script.async = true;
			script.onload = resolve;
			script.onerror = reject;
			document.body.appendChild(script);
		});
	};

	// 按顺序加载脚本
	const l2dPath = baseURL + "pio/static/l2d.js";
	const piojsPath = baseURL + "pio/static/pio.js";
	
	// 检查脚本是否已在加载
	if (!window._piL2dLoading && !window._pioPioLoading) {
		window._piL2dLoading = true;
		window._pioPioLoading = true;
		
		checkAndLoadScript(l2dPath, "pio-l2d-script")
			.then(() => {
				console.log("L2D script loaded");
				return checkAndLoadScript(piojsPath, "pio-main-script");
			})
			.then(() => {
				console.log("Pio script loaded");
				// 脚本加载完成后立即初始化
				initPio();
			})
			.catch((error) => {
				console.error("Failed to load Pio scripts:", error);
				window._piL2dLoading = false;
				window._pioPioLoading = false;
			});
	} else {
		// 脚本已在加载中，稍后初始化
		setTimeout(initPio, 200);
	}
}

// 样式已通过 Layout.astro 静态引入，无需页面切换监听

onMount(() => {
	if (!pioConfig.enable) return;

	// 确保默认显示，不受本地存储隐藏状态影响
	try {
		localStorage.setItem("posterGirl", "1");
	} catch (e) {
		console.warn("Unable to set posterGirl localStorage", e);
	}

	// 加载资源并初始化
	loadPioAssets();

	// 监听外部唤醒事件（如导航栏按钮）
	const handleShow = () => {
		try {
			localStorage.setItem("posterGirl", "1");
		} catch (e) {
			console.warn("Unable to set posterGirl localStorage", e);
		}
		if (pioContainer) {
			pioContainer.classList.remove("hidden");
		}
		if (typeof Paul_Pio !== "undefined") {
			try {
				pioInstance = new Paul_Pio(pioOptions);
				pioInitialized = true;
			} catch (e) {
				console.error("Pio re-init error:", e);
			}
		} else {
			// 若脚本未加载完，尝试再次加载
			loadPioAssets();
		}
	};
	window.addEventListener("pio:show", handleShow);
	removeShowListener = () => window.removeEventListener("pio:show", handleShow);
});

onDestroy(() => {
	// Svelte 组件销毁时不需要清理 Pio 实例
	// 因为我们希望它在页面切换时保持状态
	if (removeShowListener) removeShowListener();
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
  </div>
{/if}

<style>
  /* Pio 相关样式将通过外部CSS文件加载 */
</style>