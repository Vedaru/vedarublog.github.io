<script>
import { onDestroy, onMount } from "svelte";
import { pioConfig } from "@/config";

export let baseURL = "/";
export let cdnBase = "";
const MOBILE_BREAKPOINT = 768;
let isMobileClient = false;

// 将配置转换为 Pio 插件需要的格式
function buildPioOptions(base) {
	const normalized = base.replace(/\/+$/, "/");
	return {
		mode: pioConfig.mode,
		hidden: pioConfig.hiddenOnMobile,
		content: pioConfig.dialog || {},
		model: (pioConfig.models || ["/pio/models/pio/model.json"]).map((path) => {
			if (/^https?:\/\//i.test(path)) return path; // 绝对路径直接返回
			const clean = path.replace(/^\//, "");
			return normalized + clean;
		}),
	};
}

const pioOptions = buildPioOptions(cdnBase || baseURL);

// 全局Pio实例引用
let pioInstance = null;
let pioInitialized = false;
let pioContainer;
let pioCanvas;
let removeShowListener;

// 设备像素比上限与网络状况自适应，降低首帧渲染压力
function getEffectivePixelRatio() {
	const pr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
	const conn = typeof navigator !== 'undefined' ? (navigator.connection || navigator.mozConnection || navigator.webkitConnection) : null;
	const save = conn && conn.saveData;
	const type = conn && conn.effectiveType;
	// 在省流或较差网络下，限制像素比为1；否则上限为1.25以兼顾清晰度与性能
	const cap = save || (type && (type.includes('2g') || type.includes('slow-2g'))) ? 1.0 : 1.25;
	return Math.min(pr, cap);
}

function sizeCanvas() {
	if (!pioCanvas) return;
	let cssW = pioConfig.width || 280;
	let cssH = pioConfig.height || 250;
	const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
	// 移动端稍微降低尺寸
	if (vw <= 768) {
		cssW = Math.round(cssW * 0.8);
		cssH = Math.round(cssH * 0.8);
	}
	const pr = getEffectivePixelRatio();
	pioCanvas.style.width = cssW + 'px';
	pioCanvas.style.height = cssH + 'px';
	pioCanvas.width = Math.round(cssW * pr);
	pioCanvas.height = Math.round(cssH * pr);
}

function throttle(fn, wait) {
	let ticking = false;
	return function(...args) {
		if (!ticking) {
			ticking = true;
			setTimeout(() => {
				ticking = false;
				fn.apply(this, args);
			}, wait);
		}
	};
}

// 样式已通过 Layout.astro 静态引入，无需动态加载

// 等待 DOM 加载完成后再初始化 Pio
function initPio() {
	if (typeof window !== "undefined" && typeof Paul_Pio !== "undefined") {
		try {
			// 确保DOM元素存在
			if (pioContainer && pioCanvas && !pioInitialized) {
				// 在初始化前根据设备情况设置画布尺寸
				sizeCanvas();
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

// 等待脚本加载完成（通过 Layout.astro 的 defer）
function waitForScripts() {
	if (typeof window === "undefined") return Promise.reject();
	
	return new Promise((resolve) => {
		const checkScripts = () => {
			// 检查全局对象是否加载
			if (typeof Paul_Pio !== "undefined") {
				resolve();
			} else {
				// 继续等待，最多等待 10 秒
				setTimeout(() => {
					if (typeof Paul_Pio !== "undefined") {
						resolve();
					} else {
						checkScripts();
					}
				}, 100);
			}
		};
		checkScripts();
	});
}

onMount(() => {
	if (!pioConfig.enable) return;

	// 运行时检测移动端
	try {
		isMobileClient = (typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT) ||
			(typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
	} catch {}

	// 移动端禁用：隐藏容器并跳过初始化与资源加载
	if (pioConfig.hiddenOnMobile && isMobileClient) {
		if (pioContainer) {
			pioContainer.classList.add('hidden');
		}
		return;
	}

	// 先锁定容器的定位与层级，避免页面切换瞬间错位
	if (pioContainer) {
		pioContainer.style.position = 'fixed';
		pioContainer.style.bottom = '0';
		pioContainer.style.zIndex = '9999';
		pioContainer.style.pointerEvents = 'auto';
		if ((pioConfig.position || 'right') === 'left') {
			pioContainer.style.left = '0';
			pioContainer.style.right = 'auto';
		} else {
			pioContainer.style.right = '0';
			pioContainer.style.left = 'auto';
		}
	}

	// 确保默认显示，不受本地存储隐藏状态影响
	try {
		localStorage.setItem("posterGirl", "1");
	} catch (e) {
		console.warn("Unable to set posterGirl localStorage", e);
	}

	// 立即开始初始化 Pio，避免加载屏幕覆盖问题
	// 脚本加载后立即初始化，不等加载屏幕移除
	console.log("Pio onMount: starting script load...");
	waitForScripts().then(() => {
		console.log("Pio scripts ready, initializing immediately...");
		// 确保 DOM 已经渲染再初始化（微任务）
		Promise.resolve().then(() => initPio());
	}).catch((err) => {
		console.error("Failed to wait for Pio scripts:", err);
	});

	// 初始画布尺寸与窗口变化自适应（节流）
	const handleResize = throttle(() => sizeCanvas(), 200);
	window.addEventListener('resize', handleResize);

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
			// 若脚本未加载完，等待后再初始化
			waitForScripts().then(() => initPio()).catch((err) => console.error("Error re-init:", err));
		}
	};
	window.addEventListener("pio:show", handleShow);
	removeShowListener = () => {
		window.removeEventListener("pio:show", handleShow);
		window.removeEventListener('resize', handleResize);
	};
});

onDestroy(() => {
	// Svelte 组件销毁时不需要清理 Pio 实例
	// 因为我们希望它在页面切换时保持状态
	if (removeShowListener) removeShowListener();
});
</script>

{#if pioConfig.enable}
	<div
		class={`pio-container ${pioConfig.position || 'right'}`}
		bind:this={pioContainer}
		style={`position:fixed;bottom:0;z-index:9999;pointer-events:auto;${(pioConfig.position || 'right') === 'left' ? 'left:0;right:auto;' : 'right:0;left:auto;'}`}
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

<style>
  /* Pio 相关样式将通过外部CSS文件加载 */
</style>