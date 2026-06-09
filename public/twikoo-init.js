/** Twikoo 评论（静态脚本，data-cfasync 绕过 Rocket Loader） */

let debounceTimer = null;
let initRunning = false;
let lastInitPath = "";
let swupListenersRegistered = false;

const TWIKOO_SCRIPT = "/assets/js/twikoo.all.min.js";

function getCurrentPath() {
	const pathname = window.location.pathname;
	return pathname.endsWith("/") && pathname.length > 1
		? pathname.slice(0, -1)
		: pathname;
}

function getTwikooConfig() {
	const el = document.getElementById("tcomment");
	if (!el?.dataset.twikooEnv) return null;

	return {
		envId: el.dataset.twikooEnv,
		lang: el.dataset.twikooLang || "zh-CN",
		el: "#tcomment",
		path: getCurrentPath(),
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
			".twikoo .tk-meta-input, .twikoo .tk-input, .twikoo .tk-comments",
		),
	);
}

async function runTwikooInit() {
	const commentEl = document.getElementById("tcomment");
	if (!commentEl) return;

	const path = getCurrentPath();
	const config = getTwikooConfig();
	if (!config) return;

	if (path === lastInitPath && isTwikooRendered(commentEl)) {
		commentEl.classList.add("twikoo-ready");
		return;
	}

	if (initRunning) return;
	initRunning = true;
	lastInitPath = path;

	try {
		showTwikooLoading(commentEl);

		const scriptReady = await ensureTwikooScript();
		if (!scriptReady || !isTwikooScriptReady()) {
			showTwikooError(commentEl, "评论服务不可用。");
			return;
		}

		commentEl.innerHTML = "";
		commentEl.classList.remove("twikoo-error-state", "twikoo-ready");

		await Promise.resolve(
			twikoo.init({ ...config, path: getCurrentPath() }),
		);

		// 等待 Twikoo 挂载（最多 5s）
		const deadline = Date.now() + 5000;
		while (Date.now() < deadline) {
			if (isTwikooRendered(commentEl)) break;
			await new Promise((r) => setTimeout(r, 100));
		}

		if (!commentEl.querySelector(".twikoo")) {
			showTwikooError(commentEl, "评论加载失败，请稍后再试。");
			return;
		}

		commentEl.classList.add("twikoo-ready");
		window.scrollProtectionManager?.observeTwikoo?.();
	} catch (error) {
		console.error("[Twikoo] 初始化失败:", error);
		showTwikooError(commentEl, "评论加载失败，请稍后再试。");
	} finally {
		initRunning = false;
	}
}

function scheduleTwikooInit(delay = 80) {
	if (!document.getElementById("tcomment")) return;
	clearTimeout(debounceTimer);
	debounceTimer = setTimeout(runTwikooInit, delay);
}

function registerTwikooSwupListeners() {
	if (swupListenersRegistered || !window.swup?.hooks) return;
	swupListenersRegistered = true;

	window.swup.hooks.on("visit:start", () => {
		clearTimeout(debounceTimer);
	});

	window.swup.hooks.on("content:replace", () => {
		lastInitPath = "";
		scheduleTwikooInit(120);
	});

	window.swup.hooks.on("page:view", () => scheduleTwikooInit(150));
	window.swup.hooks.on("animation:in:end", () => scheduleTwikooInit(100));
}

function observeSwupContainer() {
	const root =
		document.getElementById("swup-container") ||
		document.getElementById("content-wrapper") ||
		document.body;

	const observer = new MutationObserver(() => {
		if (document.getElementById("tcomment")) {
			scheduleTwikooInit(80);
		}
	});

	observer.observe(root, { childList: true, subtree: true });
}

function bootstrapTwikoo() {
	registerTwikooSwupListeners();
	observeSwupContainer();
	scheduleTwikooInit(0);
}

window.initTwikooPage = () => scheduleTwikooInit(0);

document.addEventListener("swup:enable", registerTwikooSwupListeners);

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", bootstrapTwikoo);
} else {
	bootstrapTwikoo();
}
