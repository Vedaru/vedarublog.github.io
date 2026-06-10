/** Twikoo 评论（静态脚本，data-cfasync 绕过 Rocket Loader） */

if (window.__twikooInitBootstrapped) {
	window.initTwikooPage?.();
} else {
	window.__twikooInitBootstrapped = true;

	let debounceTimer = null;
	let initRunning = false;
	let lastInitPath = "";
	let initGeneration = 0;
	let swupListenersRegistered = false;

	const TWIKOO_SCRIPT = "/assets/js/twikoo.all.min.js";

	function getNavDelay() {
		return window.matchMedia("(max-width: 768px)").matches ? 220 : 100;
	}

	function getCurrentPath() {
		const pathname = window.location.pathname;
		return pathname.endsWith("/") && pathname.length > 1
			? pathname.slice(0, -1)
			: pathname;
	}

	function getTwikooPath() {
		const el = document.getElementById("tcomment");
		return el?.dataset.twikooPath || getCurrentPath();
	}

	function getTwikooConfig() {
		const el = document.getElementById("tcomment");
		if (!el?.dataset.twikooEnv) return null;

		return {
			envId: el.dataset.twikooEnv,
			lang: el.dataset.twikooLang || "zh-CN",
			el: "#tcomment",
			path: getTwikooPath(),
		};
	}

	function isTwikooScriptReady() {
		return typeof twikoo !== "undefined" && typeof twikoo.init === "function";
	}

	function waitForTwikooGlobal(timeout = 15000) {
		if (isTwikooScriptReady()) return Promise.resolve(true);

		return new Promise((resolve) => {
			const started = Date.now();
			const tick = () => {
				if (isTwikooScriptReady()) {
					resolve(true);
					return;
				}
				if (Date.now() - started >= timeout) {
					resolve(false);
					return;
				}
				setTimeout(tick, 50);
			};
			tick();
		});
	}

	function ensureTwikooScript() {
		if (isTwikooScriptReady()) return Promise.resolve(true);

		return new Promise((resolve) => {
			const existing = document.querySelector(
				'script[src*="twikoo.all.min.js"]',
			);
			if (existing) {
				waitForTwikooGlobal().then(resolve);
				return;
			}

			const script = document.createElement("script");
			script.src = TWIKOO_SCRIPT;
			script.setAttribute("data-cfasync", "false");
			script.onload = () => waitForTwikooGlobal().then(resolve);
			script.onerror = () => resolve(false);
			document.head.appendChild(script);
		});
	}

	function showTwikooLoading(commentEl) {
		commentEl.classList.remove("twikoo-ready", "twikoo-error-state");
		commentEl.innerHTML =
			'<div class="twikoo-loading" aria-busy="true">加载评论中…</div>';
	}

	function showTwikooError(commentEl, message) {
		commentEl.classList.remove("twikoo-ready");
		commentEl.classList.add("twikoo-error-state");
		commentEl.innerHTML = `<div class="twikoo-error">${message}</div>`;
	}

	function isTwikooRendered(commentEl) {
		return Boolean(
			commentEl.querySelector(
				".twikoo .tk-input, .twikoo .tk-meta-input, .twikoo .tk-comments, .twikoo .tk-submit",
			),
		);
	}

	function prepareTwikooContainer(commentEl) {
		commentEl.classList.remove("twikoo-ready", "twikoo-error-state");
		if (commentEl.querySelector(".twikoo")) {
			commentEl.innerHTML = "";
		} else if (!commentEl.querySelector(".twikoo-loading")) {
			showTwikooLoading(commentEl);
		}
	}

	function isStaleInit(generation) {
		return generation !== initGeneration;
	}

	function abortIfStale(generation, commentEl) {
		if (!isStaleInit(generation)) return false;
		if (commentEl?.isConnected && !commentEl.querySelector(".twikoo")) {
			showTwikooLoading(commentEl);
		}
		return true;
	}

	async function runTwikooInit(retryCount = 0) {
		const generation = initGeneration;
		const commentEl = document.getElementById("tcomment");
		if (!commentEl || !commentEl.isConnected) return;

		const path = getTwikooPath();
		const config = getTwikooConfig();
		if (!config) return;

		if (
			path === lastInitPath &&
			commentEl.classList.contains("twikoo-ready") &&
			isTwikooRendered(commentEl)
		) {
			return;
		}

		if (initRunning) {
			scheduleTwikooInit(120);
			return;
		}

		initRunning = true;
		lastInitPath = path;

		try {
			prepareTwikooContainer(commentEl);
			if (abortIfStale(generation, commentEl)) return;

			const scriptReady = await ensureTwikooScript();
			if (abortIfStale(generation, commentEl)) return;

			if (!scriptReady || !isTwikooScriptReady()) {
				showTwikooError(commentEl, "评论服务不可用。");
				return;
			}

			// 仅清除旧实例，保留 loading 占位，避免空白卡片
			if (commentEl.querySelector(".twikoo")) {
				commentEl.innerHTML = "";
			}
			if (abortIfStale(generation, commentEl)) return;

			await Promise.resolve(
				twikoo.init({ ...config, path: getTwikooPath() }),
			);

			const deadline = Date.now() + 10000;
			while (Date.now() < deadline) {
				if (abortIfStale(generation, commentEl)) return;
				if (isTwikooRendered(commentEl)) break;
				await new Promise((r) => setTimeout(r, 100));
			}

			if (abortIfStale(generation, commentEl)) return;

			if (!isTwikooRendered(commentEl)) {
				if (retryCount < 1) {
					lastInitPath = "";
					initRunning = false;
					setTimeout(() => runTwikooInit(retryCount + 1), 200);
					return;
				}
				showTwikooError(commentEl, "评论加载失败，请稍后再试。");
				return;
			}

			commentEl.classList.add("twikoo-ready");
			window.scrollProtectionManager?.observeTwikoo?.();
		} catch (error) {
			if (abortIfStale(generation, commentEl)) return;
			console.error("[Twikoo] 初始化失败:", error);
			if (retryCount < 1) {
				lastInitPath = "";
				initRunning = false;
				setTimeout(() => runTwikooInit(retryCount + 1), 200);
				return;
			}
			showTwikooError(commentEl, "评论加载失败，请稍后再试。");
		} finally {
			initRunning = false;
		}
	}

	function scheduleTwikooInit(delay = getNavDelay()) {
		if (!document.getElementById("tcomment")) return;
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => runTwikooInit(0), delay);
	}

	function registerTwikooSwupListeners() {
		if (swupListenersRegistered || !window.swup?.hooks) return;
		swupListenersRegistered = true;

		window.swup.hooks.on("visit:start", () => {
			clearTimeout(debounceTimer);
			initGeneration += 1;
			initRunning = false;
			lastInitPath = "";
		});

		window.swup.hooks.on("content:replace", () => {
			scheduleTwikooInit(getNavDelay());
		});

		window.swup.hooks.on("page:view", () => scheduleTwikooInit(getNavDelay() + 80));
		window.swup.hooks.on("animation:in:end", () =>
			scheduleTwikooInit(getNavDelay()),
		);
		window.swup.hooks.on("visit:end", () =>
			scheduleTwikooInit(getNavDelay() + 120),
		);
	}

	function bootstrapTwikoo() {
		registerTwikooSwupListeners();

		const commentEl = document.getElementById("tcomment");
		if (!commentEl) return;

		const startTwikoo = () => scheduleTwikooInit(0);

		const runWhenIdle = () => {
			if ("requestIdleCallback" in window) {
				requestIdleCallback(startTwikoo, { timeout: 4000 });
			} else {
				setTimeout(startTwikoo, 1500);
			}
		};

		if ("IntersectionObserver" in window) {
			const observer = new IntersectionObserver(
				(entries) => {
					if (!entries.some((entry) => entry.isIntersecting)) return;
					observer.disconnect();
					runWhenIdle();
				},
				{ rootMargin: "120px 0px" },
			);
			observer.observe(commentEl);
			return;
		}

		runWhenIdle();
	}

	window.initTwikooPage = () => scheduleTwikooInit(getNavDelay());

	document.addEventListener("swup:enable", registerTwikooSwupListeners);
	document.addEventListener("mizuki:page:loaded", () =>
		scheduleTwikooInit(getNavDelay()),
	);
	window.addEventListener("pageshow", (event) => {
		if (event.persisted) {
			initGeneration += 1;
			lastInitPath = "";
			scheduleTwikooInit(0);
		}
	});

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", bootstrapTwikoo);
	} else {
		bootstrapTwikoo();
	}
}
