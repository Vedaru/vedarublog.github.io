/** Mermaid 图表：全局初始化，Swup 换页后重新渲染 */

let currentTheme = null;
let isRendering = false;
let retryCount = 0;
let swupListenersRegistered = false;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// 检查主题是否真的发生了变化
function hasThemeChanged() {
	const isDark = document.documentElement.classList.contains("dark");
	const newTheme = isDark ? "dark" : "default";

	if (currentTheme !== newTheme) {
		currentTheme = newTheme;
		return true;
	}
	return false;
}

// 等待 Mermaid 库加载完成
function waitForMermaid(timeout = 10000) {
	return new Promise((resolve, reject) => {
		const startTime = Date.now();

		function check() {
			if (
				window.mermaid &&
				typeof window.mermaid.initialize === "function"
			) {
				resolve(window.mermaid);
			} else if (Date.now() - startTime > timeout) {
				reject(
					new Error("Mermaid library failed to load within timeout"),
				);
			} else {
				setTimeout(check, 100);
			}
		}

		check();
	});
}

// 设置 MutationObserver 监听 html 元素的 class 属性变化
function setupMutationObserver() {
	const observer = new MutationObserver((mutations) => {
		mutations.forEach((mutation) => {
			if (
				mutation.type === "attributes" &&
				mutation.attributeName === "class"
			) {
				// 检查是否是 dark 类的变化
				const target = mutation.target;
				const wasDark = mutation.oldValue
					? mutation.oldValue.includes("dark")
					: false;
				const isDark = target.classList.contains("dark");

				if (wasDark !== isDark) {
					if (hasThemeChanged()) {
						setTimeout(
							() =>
								renderMermaidDiagrams({
									forceThemeRefresh: true,
								}),
							150,
						);
					}
				}
			}
		});
	});

	// 开始观察 html 元素的 class 属性变化
	observer.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ["class"],
		attributeOldValue: true,
	});
}

// 缩放平移
function attachZoomControls(element, svgElement) {
	if (element.__zoomAttached) return;
	element.__zoomAttached = true;

	const wrapper = document.createElement("div");
	wrapper.className = "mermaid-zoom-wrapper";

	const svgParent = svgElement.parentNode;
	wrapper.appendChild(svgElement);
	svgParent.appendChild(wrapper);

	let scale = 1;
	let tx = 0;
	let ty = 0;
	const MIN_SCALE = 0.2;
	const MAX_SCALE = 6;

	function applyTransform() {
		wrapper.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
	}
	const controls = document.createElement("div");
	controls.className = "mermaid-zoom-controls";
	controls.innerHTML = `
			<button class="btn-regular rounded-lg h-10 w-10 active:scale-90" data-action="zoom-in" title="Zoom in">+</button>
			<button class="btn-regular rounded-lg h-10 w-10 active:scale-90" data-action="zoom-out" title="Zoom out">−</button>
			<button class="btn-regular rounded-lg h-10 w-10 active:scale-90" data-action="reset" title="Reset">⤾</button>
		`;
	element.appendChild(controls);

	controls.addEventListener("click", (ev) => {
		const action =
			ev.target.getAttribute && ev.target.getAttribute("data-action");
		if (!action) return;

		switch (action) {
			case "zoom-in":
				scale = Math.min(MAX_SCALE, +(scale * 1.2).toFixed(3));
				applyTransform();
				break;
			case "zoom-out":
				scale = Math.max(MIN_SCALE, +(scale / 1.2).toFixed(3));
				applyTransform();
				break;
			case "reset":
				scale = 1;
				tx = 0;
				ty = 0;
				applyTransform();
				break;
		}
	});

	let isPanning = false;
	let startX = 0;
	let startY = 0;
	let startTx = 0;
	let startTy = 0;

	wrapper.style.touchAction = "none";

	wrapper.addEventListener("pointerdown", (ev) => {
		if (ev.button !== 0) return; // 仅左键
		isPanning = true;
		wrapper.setPointerCapture(ev.pointerId);
		startX = ev.clientX;
		startY = ev.clientY;
		startTx = tx;
		startTy = ty;
	});

	wrapper.addEventListener("pointermove", (ev) => {
		if (!isPanning) return;
		const dx = ev.clientX - startX;
		const dy = ev.clientY - startY;
		tx = startTx + dx / scale; // 根据当前缩放调整灵敏度
		ty = startTy + dy / scale;
		applyTransform();
	});

	wrapper.addEventListener("pointerup", (ev) => {
		isPanning = false;
		try {
			wrapper.releasePointerCapture(ev.pointerId);
		} catch (e) {}
	});

	wrapper.addEventListener("pointercancel", () => {
		isPanning = false;
	});

	// 鼠标滚轮缩放
	element.addEventListener(
		"wheel",
		(ev) => {
			ev.preventDefault();
			const delta = -ev.deltaY;
			const zoomFactor = delta > 0 ? 1.12 : 1 / 1.12;
			const prevScale = scale;
			scale = Math.min(
				MAX_SCALE,
				Math.max(MIN_SCALE, +(scale * zoomFactor).toFixed(3)),
			);

			const rect = wrapper.getBoundingClientRect();
			const cx = ev.clientX - rect.left;
			const cy = ev.clientY - rect.top;

			const worldX = cx / prevScale - tx;
			const worldY = cy / prevScale - ty;

			tx = cx / scale - worldX;
			ty = cy / scale - worldY;

			applyTransform();
		},
		{ passive: false },
	);

	// 双击重置
	wrapper.addEventListener("dblclick", () => {
		scale = 1;
		tx = 0;
		ty = 0;
		applyTransform();
	});
	applyTransform();
	let resizeTimer = null;
	window.addEventListener("resize", () => {
		clearTimeout(resizeTimer);
		resizeTimer = setTimeout(() => {
			applyTransform();
		}, 200);
	});
}

function setupEventListeners() {
	document.addEventListener("astro:page-load", () => {
		currentTheme = null;
		retryCount = 0;
		scheduleMermaidRender(100);
	});

	document.addEventListener("visibilitychange", () => {
		if (!document.hidden) {
			scheduleMermaidRender(200);
		}
	});
}

function scheduleMermaidRender(delay = 150) {
	setTimeout(() => renderMermaidDiagrams(), delay);
}

function registerSwupListeners() {
	if (swupListenersRegistered || !window.swup?.hooks) return;
	swupListenersRegistered = true;

	window.swup.hooks.on("content:replace", () => {
		isRendering = false;
		currentTheme = null;
		if (!hasMermaidDiagrams()) return;
		loadMermaid()
			.catch((error) =>
				console.warn(
					"Mermaid lazy load after navigation failed:",
					error,
				),
			)
			.finally(() => scheduleMermaidRender(200));
	});
	window.swup.hooks.on("page:view", () => {
		if (hasMermaidDiagrams()) scheduleMermaidRender(300);
	});
	window.swup.hooks.on("animation:in:end", () => {
		if (hasMermaidDiagrams()) scheduleMermaidRender(100);
	});
}

async function initializeMermaid() {
	try {
		await waitForMermaid();

		// 初始化 Mermaid 配置
		window.mermaid.initialize({
			startOnLoad: false,
			theme: "default",
			themeVariables: {
				fontFamily: "inherit",
				fontSize: "16px",
			},
			securityLevel: "loose",
			// 添加错误处理配置
			errorLevel: "warn",
			logLevel: "error",
		});

		// 渲染所有 Mermaid 图表
		await renderMermaidDiagrams();
	} catch (error) {
		console.error("Failed to initialize Mermaid:", error);
		// 如果初始化失败，尝试重新加载
		if (retryCount < MAX_RETRIES) {
			retryCount++;
			setTimeout(() => initializeMermaid(), RETRY_DELAY * retryCount);
		}
	}
}

async function renderMermaidDiagrams(options = {}) {
	const { forceThemeRefresh = false } = options;

	if (isRendering) {
		return;
	}

	if (!window.mermaid || typeof window.mermaid.render !== "function") {
		try {
			await loadMermaid();
			await waitForMermaid();
		} catch (error) {
			console.warn("Mermaid not available, skipping render", error);
			return;
		}
	}

	const mermaidElements = document.querySelectorAll(
		".mermaid[data-mermaid-code]",
	);
	const pending = forceThemeRefresh
		? Array.from(mermaidElements)
		: Array.from(mermaidElements).filter(
				(el) =>
					el.querySelector(".mermaid-loading") ||
					!el.querySelector("svg"),
			);

	if (pending.length === 0) {
		return;
	}

	isRendering = true;

	try {
		// 延迟检测主题，确保 DOM 已经更新
		await new Promise((resolve) => setTimeout(resolve, 100));

		const htmlElement = document.documentElement;
		const isDark = htmlElement.classList.contains("dark");
		const theme = isDark ? "dark" : "default";

		// 更新 Mermaid 主题（只需要更新一次）
		window.mermaid.initialize({
			startOnLoad: false,
			theme: theme,
			themeVariables: {
				fontFamily: "inherit",
				fontSize: "16px",
				// 强制应用主题变量
				primaryColor: isDark ? "#ffffff" : "#000000",
				primaryTextColor: isDark ? "#ffffff" : "#000000",
				primaryBorderColor: isDark ? "#ffffff" : "#000000",
				lineColor: isDark ? "#ffffff" : "#000000",
				secondaryColor: isDark ? "#333333" : "#f0f0f0",
				tertiaryColor: isDark ? "#555555" : "#e0e0e0",
			},
			securityLevel: "loose",
			errorLevel: "warn",
			logLevel: "error",
		});

		// 批量渲染待处理图表，添加重试机制
		const renderPromises = pending.map(async (element, index) => {
			let attempts = 0;
			const maxAttempts = 3;

			while (attempts < maxAttempts) {
				try {
					const code = element.getAttribute("data-mermaid-code");

					if (!code) {
						break;
					}

					// 显示加载状态
					element.innerHTML =
						'<div class="mermaid-loading">Rendering diagram...</div>';

					// 渲染图表
					const { svg } = await window.mermaid.render(
						`mermaid-${Date.now()}-${index}-${attempts}`,
						code,
					);

					const parser = new DOMParser();
					const doc = parser.parseFromString(svg, "image/svg+xml");
					const svgElement = doc.documentElement;

					element.innerHTML = "";
					element.__zoomAttached = false;
					element.appendChild(svgElement);

					// 添加响应式支持
					const insertedSvg = element.querySelector("svg");
					if (insertedSvg) {
						insertedSvg.setAttribute("width", "100%");
						insertedSvg.removeAttribute("height");
						insertedSvg.style.maxWidth = "100%";
						insertedSvg.style.height = "auto";
						//Todo 需要根据实际情况
						insertedSvg.style.minHeight = "300px";

						// 强制应用样式
						if (isDark) {
							svgElement.style.filter =
								"brightness(0.9) contrast(1.1)";
						} else {
							svgElement.style.filter = "none";
						}
						attachZoomControls(element, insertedSvg);
					}

					// 渲染成功，跳出重试循环
					break;
				} catch (error) {
					attempts++;
					console.warn(
						`Mermaid rendering attempt ${attempts} failed for element ${index}:`,
						error,
					);

					if (attempts >= maxAttempts) {
						console.error(
							`Failed to render Mermaid diagram after ${maxAttempts} attempts:`,
							error,
						);
						element.innerHTML = `
									<div class="mermaid-error">
										<p>Failed to render diagram after ${maxAttempts} attempts.</p>
										<button onclick="location.reload()" style="margin-top: 8px; padding: 4px 8px; background: var(--primary); color: white; border: none; border-radius: 4px; cursor: pointer;">
											Retry Page
										</button>
									</div>
								`;
					} else {
						// 等待一段时间后重试
						await new Promise((resolve) =>
							setTimeout(resolve, 500 * attempts),
						);
					}
				}
			}
		});

		// 等待所有渲染完成
		await Promise.all(renderPromises);
		retryCount = 0; // 重置重试计数
	} catch (error) {
		console.error("Error in renderMermaidDiagrams:", error);

		// 如果渲染失败，尝试重新渲染
		if (retryCount < MAX_RETRIES) {
			retryCount++;
			setTimeout(() => renderMermaidDiagrams(), RETRY_DELAY * retryCount);
		}
	} finally {
		isRendering = false;
	}
}

// 初始化主题状态
function initializeThemeState() {
	const isDark = document.documentElement.classList.contains("dark");
	currentTheme = isDark ? "dark" : "default";
}

// 通过 Vite 动态导入 ESM 版本，避免 CDN UMD 包中的旧版 polyfill
async function loadMermaid() {
	if (window.mermaid && typeof window.mermaid.initialize === "function") {
		return;
	}

	const mod = await import("mermaid");
	window.mermaid = mod.default;
}

function hasMermaidDiagrams() {
	return document.querySelector(".mermaid[data-mermaid-code]") !== null;
}

function bootstrapMermaid() {
	if (!hasMermaidDiagrams()) {
		registerSwupListeners();
		setupEventListeners();
		return;
	}

	registerSwupListeners();
	setupMutationObserver();
	setupEventListeners();
	initializeThemeState();
	loadMermaid()
		.then(() => initializeMermaid())
		.catch((error) => {
			console.error("Failed to bootstrap Mermaid:", error);
		});
}

window.renderMermaidDiagrams = renderMermaidDiagrams;

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", bootstrapMermaid);
} else {
	bootstrapMermaid();
}

document.addEventListener("swup:enable", registerSwupListeners);
