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

// ── 渲染控制常量 ────────────────────────────────────────────────────────────
/** 固定渲染帧率（始终节流，不随鼠标交互改变） */
const IDLE_FPS = 20;

// 全局Pio实例引用
let pioInstance = null;
let pioInitialized = false;
let pioContainer;
let pioCanvas;
let visibilityHandler = null;

// ── 渲染控制辅助 ────────────────────────────────────────────────────────────
function setRenderMode(mode, fps) {
	if (typeof window === "undefined") return;
	const rc = window.__PIO_RENDER_CONTROL;
	if (!rc) return;
	if (fps !== undefined) rc.reduceFPS = fps;
	rc.mode = mode;
}

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
			// 全局单例守卫：若已有实例（如换页时组件重复挂载），复用而不再创建第二个，
			// 避免多套 Live2D rAF 抢画 canvas#pio 造成抽动与重复 banner。
			if (window.__pioInstance) {
				pioInstance = window.__pioInstance;
				pioInitialized = true;
				mountPioPortal();
				return;
			}
			// 确保DOM元素存在
			if (pioContainer && pioCanvas && !pioInitialized) {
				pioInstance = new Paul_Pio(pioOptions);
				pioInitialized = true;
				window.__pioInstance = pioInstance;
				mountPioPortal();
				window.__PIO_MOUSE_HOVER = false;
				// 初始化完成后确认为节流模式（l2d.js 初始化可能重置为 normal）
				setRenderMode("reduced", IDLE_FPS);
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

	// 在 l2d.js 加载之前预设节流模式，避免初始 60fps 开销
	window.__PIO_RENDER_CONTROL = window.__PIO_RENDER_CONTROL || {
		mode: "reduced",
		reduceFPS: IDLE_FPS,
		_lastRender: 0,
	};
	window.__PIO_RENDER_CONTROL.mode = "reduced";
	window.__PIO_RENDER_CONTROL.reduceFPS = IDLE_FPS;

	// 标签页隐藏时暂停渲染，可见时恢复 20fps 节流模式
	visibilityHandler = () => {
		if (!window.__PIO_RENDER_CONTROL) return;
		if (document.hidden) {
			setRenderMode("paused");
		} else {
			setRenderMode("reduced", IDLE_FPS);
		}
	};
	document.addEventListener("visibilitychange", visibilityHandler);

	await tick();
	mountPioPortal();

	// 延迟到浏览器空闲时再加载 Live2D 资源，减少对首屏渲染的影响
	const scheduleLoad = window.requestIdleCallback
		? (cb) => window.requestIdleCallback(cb, { timeout: 3000 })
		: (cb) => setTimeout(cb, 1500);
	scheduleLoad(loadPioAssets);
});

onDestroy(() => {
	if (visibilityHandler) {
		document.removeEventListener("visibilitychange", visibilityHandler);
		visibilityHandler = null;
	}
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
