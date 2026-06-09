<script>
import { onDestroy, onMount, tick } from "svelte";
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

function handlePioMouseEnter() {
	if (typeof window === "undefined") return;
	window.__PIO_MOUSE_HOVER = true;
}

function handlePioMouseLeave() {
	if (typeof window === "undefined") return;
	window.__PIO_MOUSE_HOVER = false;
	window.__PIO_RESET_GAZE?.();
}

function mountPioPortal() {
	if (!pioContainer || pioContainer.dataset.portalMounted === "true") return;
	document.body.appendChild(pioContainer);
	pioContainer.dataset.portalMounted = "true";
}

// 等待 DOM 加载完成后再初始化 Pio
function initPio() {
	if (typeof window !== "undefined" && typeof Paul_Pio !== "undefined") {
		try {
			// 确保DOM元素存在
			if (pioContainer && pioCanvas && !pioInitialized) {
				pioInstance = new Paul_Pio(pioOptions);
				pioInitialized = true;
				window.__pioInstance = pioInstance;
				mountPioPortal();
				window.__PIO_MOUSE_HOVER = false;
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

// 加载必要的脚本
function loadPioAssets() {
	if (typeof window === "undefined") return;

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

	loadScript("/pio/static/l2d.js", "pio-l2d-script")
		.then(() => loadScript("/pio/static/pio.js", "pio-main-script"))
		.then(() => {
			setTimeout(initPio, 100);
		})
		.catch((error) => {
			console.error("Failed to load Pio scripts:", error);
		});
}

onMount(async () => {
	if (!pioConfig.enable) return;

	if (pioConfig.hiddenOnMobile && window.matchMedia("(max-width: 1280px)").matches) {
		return;
	}

	window.__PIO_MOUSE_HOVER = false;

	await tick();
	mountPioPortal();
	loadPioAssets();
});

onDestroy(() => {
	console.log("Pio Svelte component destroyed (keeping instance alive)");
});
</script>

{#if pioConfig.enable}
  <div
    class={`pio-container ${pioConfig.position || 'right'}`}
    bind:this={pioContainer}
    role="complementary"
    aria-label="Live2D 看板娘"
    on:mouseenter={handlePioMouseEnter}
    on:mouseleave={handlePioMouseLeave}
  >
    <div class="pio-action"></div>
    <canvas
      id="pio"
      bind:this={pioCanvas}
      width={pioConfig.width || 280}
      height={pioConfig.height || 250}
    ></canvas>
  </div>
{/if}
