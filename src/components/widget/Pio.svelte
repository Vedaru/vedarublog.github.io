<script>
import { onDestroy, onMount } from "svelte";
import { pioConfig } from "../../config";

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
let pioReady = false;
let pioCanvas;
let removeShowListener;
let _revealInterval = null;
let _menuObserver = null;

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
				pioReady = true;
				pioContainer?.classList.add('pio-ready');
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
		pioContainer.style.minHeight = (pioConfig.height || 250) + 'px';
		pioContainer.style.minWidth = (pioConfig.width || 280) + 'px';
		if ((pioConfig.position || 'right') === 'left') {
			pioContainer.style.left = '0';
			pioContainer.style.right = 'auto';
		} else {
			pioContainer.style.right = '0';
			pioContainer.style.left = 'auto';
		}
	}

	// 读取本地存储中用户的显示偏好；如果未设置则默认不自动显示（即收起）
	let posterGirlPersist = '0';
	try {
		posterGirlPersist = localStorage.getItem("posterGirl") || '0';
	} catch (e) {
		console.warn("Unable to read posterGirl localStorage", e);
	}

	// 立即在后台开始加载并初始化 Pio（在加载屏幕期间保持隐藏），
	// 这样首页出现时 Pio 已经准备好，不会出现卡顿弹入。
	console.log("Pio onMount: starting script load...");
	// 在开始前先把容器保持不可见状态，防止渲染到加载画面上
	try {
		if (pioContainer) {
            pioContainer.style.display = 'none';
            pioContainer.style.opacity = '0';
            pioContainer.style.pointerEvents = 'none';
            pioContainer.style.transition = 'opacity 240ms ease';
        }
    } catch (e) {}

    waitForScripts().then(() => {
        console.log("Pio scripts ready, initializing immediately...");
        // 确保 DOM 已经渲染再初始化（微任务）
        Promise.resolve().then(() => initPio());
		// 移除或隐藏看板娘自带的关闭按钮，交由导航栏控制显示/隐藏
		try {
			// 立即尝试移除已存在的 close 按钮
			const menu = document.querySelector('.pio-container .pio-action');
			if (menu) {
				const closeEl = menu.querySelector('.pio-close');
				if (closeEl && closeEl.parentNode) closeEl.parentNode.removeChild(closeEl);
			}
			// 观察 menu，如果后续脚本再次添加 close 按钮则自动移除
			const menuEl = document.querySelector('.pio-container .pio-action');
			if (menuEl && typeof MutationObserver !== 'undefined') {
				_menuObserver = new MutationObserver((mutations) => {
					for (const m of mutations) {
						for (const n of m.addedNodes) {
							try {
								if (n instanceof HTMLElement && n.classList.contains('pio-close')) {
									n.remove();
								}
							} catch (e) {}
						}
					}
				});
				_menuObserver.observe(menuEl, { childList: true });
			}
		} catch (e) {
			// ignore
		}
    }).catch((err) => {
        console.error("Failed to wait for Pio scripts:", err);
    });

	// 在后台轮询加载屏幕状态，加载完成或超时后显示 Pio 容器
	// 仅在本地存储已标记为 '1'（用户选择显示）时才自动 reveal
	function revealWhenLoadingDone(timeoutMs = 5000) {
		try {
			if (posterGirlPersist !== '1') {
				// 用户未标记为显示，保持收起状态
				return;
			}
			const start = Date.now();
			_revealInterval = setInterval(() => {
				try {
					if (window.__loadingScreenDone || Date.now() - start > timeoutMs) {
						if (pioContainer) {
							pioContainer.style.display = '';
							pioContainer.style.opacity = '1';
							pioContainer.style.pointerEvents = 'auto';
						}
						clearInterval(_revealInterval);
						_revealInterval = null;
					}
				} catch (e) {
					// ignore
				}
			}, 100);
		} catch (e) {}
	}

	revealWhenLoadingDone(5000);

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
			// 标记为手动可见，覆盖默认的 :not(.pio-ready) 隐藏样式
			pioContainer.classList.add('visible-manual');
			try {
				pioContainer.style.display = '';
				pioContainer.style.opacity = '1';
				pioContainer.style.pointerEvents = 'auto';
			} catch (e) {}
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
	// 监听隐藏事件（导航栏切换时触发）
	const handleHide = () => {
		try {
			try { localStorage.setItem("posterGirl", "0"); } catch (e) {}
			if (pioContainer) {
				pioContainer.classList.add('hidden');
				pioContainer.classList.remove('visible-manual');
				try {
					pioContainer.style.display = 'none';
					pioContainer.style.opacity = '0';
					pioContainer.style.pointerEvents = 'none';
				} catch (e) {}
			}
			if (pioInstance && typeof pioInstance.destroy === 'function') {
				try { pioInstance.destroy(); } catch (e) {}
			}
		} catch (e) {
			// ignore
		}
	};
	window.addEventListener("pio:hide", handleHide);
	removeShowListener = () => {
		window.removeEventListener("pio:show", handleShow);
		window.removeEventListener("pio:hide", handleHide);
		window.removeEventListener('resize', handleResize);
	};
});

onDestroy(() => {
	// Svelte 组件销毁时不需要清理 Pio 实例
	// 因为我们希望它在页面切换时保持状态
	if (removeShowListener) removeShowListener();
	// 清理 reveal 定时器
	if (_revealInterval) {
		clearInterval(_revealInterval);
		_revealInterval = null;
	}
	// 清理 menu 观察器
	try {
		if (_menuObserver) {
			_menuObserver.disconnect();
			_menuObserver = null;
		}
	} catch (e) {}
});
</script>

{#if pioConfig.enable}
	<div
		class={`pio-container ${pioConfig.position || 'right'}`}
		bind:this={pioContainer}
		style={`position:fixed;bottom:0;z-index:9999;pointer-events:auto;${(pioConfig.position || 'right') === 'left' ? 'left:0;right:auto;' : 'right:0;left:auto;'}min-height:${(pioConfig.height||250)}px;min-width:${(pioConfig.width||280)}px;`}
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