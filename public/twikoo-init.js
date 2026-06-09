/** Twikoo 评论：Swup 切换后可靠初始化（静态脚本，绕过 Cloudflare Rocket Loader） */

let initTimer = null;
let initGeneration = 0;
let swupListenersRegistered = false;

const TWIKOO_SCRIPT = "/assets/js/twikoo.all.min.js";
const SWUP_INIT_DELAY = 150;
const SCRIPT_POLL_INTERVAL = 50;
const SCRIPT_POLL_TIMEOUT = 15000;

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

function isScriptElementLoaded(scriptEl) {
	if (!scriptEl) return false;
	return (
		scriptEl.getAttribute("data-tw-loaded") === "1" ||
		scriptEl.readyState === "complete" ||
		scriptEl.readyState === "loaded"
	);
}

function waitForTwikooGlobal(timeout = SCRIPT_POLL_TIMEOUT) {
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
			setTimeout(tick, SCRIPT_POLL_INTERVAL);
		};
		tick();
	});
}

function ensureTwikooScript() {
	if (isTwikooScriptReady()) return Promise.resolve(true);

	return new Promise((resolve) => {
		let settled = false;
		const settle = (value) => {
			if (settled) return;
			settled = true;
			resolve(value);
		};

		const waitReady = async () => {
			settle(await waitForTwikooGlobal());
		};

		const existing = document.querySelector(
			'script[src*="twikoo.all.min.js"]',
		);
		if (existing) {
			if (isScriptElementLoaded(existing)) {
				waitReady();
				return;
			}
			existing.addEventListener("load", () => waitReady(), {
				once: true,
			});
			existing.addEventListener("error", () => settle(false), {
				once: true,
			});
			waitReady();
			return;
		}

		const script = document.createElement("script");
		script.src = TWIKOO_SCRIPT;
		script.setAttribute("data-cfasync", "false");
		script.dataset.twikooLoader = "1";
		script.onload = () => {
			script.setAttribute("data-tw-loaded", "1");
			waitReady();
		};
		script.onerror = () => settle(false);
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

function isTwikooMounted(commentEl) {
	const root = commentEl.querySelector(".twikoo");
	if (!root) return false;
	if (root.querySelector(".el-loading-mask, .tk-loading")) return false;
	return Boolean(
		root.querySelector(".tk-meta-input, .tk-comments, .tk-input"),
	);
}

function waitForTwikooMount(commentEl, timeout = 10000) {
	return new Promise((resolve) => {
		if (isTwikooMounted(commentEl)) {
			resolve(true);
			return;
		}

		const started = Date.now();
		const observer = new MutationObserver(() => {
			if (isTwikooMounted(commentEl)) {
				observer.disconnect();
				resolve(true);
			} else if (Date.now() - started > timeout) {
				observer.disconnect();
				resolve(false);
			}
		});

		observer.observe(commentEl, { childList: true, subtree: true });

		setTimeout(() => {
			observer.disconnect();
			resolve(isTwikooMounted(commentEl));
		}, timeout);
	});
}

function markTwikooReady(commentEl) {
	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			commentEl.classList.add("twikoo-ready");
		});
	});
}

async function initTwikooPage(generation) {
	const commentEl = document.getElementById("tcomment");
	if (!commentEl || generation !== initGeneration) return;

	const config = getTwikooConfig();
	if (!config) return;

	showTwikooLoading(commentEl);

	const scriptReady = await ensureTwikooScript();
	if (generation !== initGeneration) return;

	if (!scriptReady || !isTwikooScriptReady()) {
		showTwikooError(commentEl, "评论服务不可用。");
		return;
	}

	commentEl.innerHTML = "";
	commentEl.classList.remove("twikoo-error-state", "twikoo-ready");

	try {
		await twikoo.init({ ...config, path: getCurrentPath() });
		if (generation !== initGeneration) return;

		const mounted = await waitForTwikooMount(commentEl);
		if (generation !== initGeneration) return;

		if (!mounted) {
			showTwikooError(commentEl, "评论加载失败，请稍后再试。");
			return;
		}

		markTwikooReady(commentEl);
		window.scrollProtectionManager?.observeTwikoo?.();
	} catch (error) {
		console.error("[Twikoo] 初始化失败:", error);
		if (generation !== initGeneration) return;
		showTwikooError(commentEl, "评论加载失败，请稍后再试。");
	}
}

function scheduleTwikooInit(delay = 0) {
	if (!document.getElementById("tcomment")) return;

	if (initTimer) clearTimeout(initTimer);
	initGeneration += 1;
	const generation = initGeneration;

	initTimer = setTimeout(() => {
		initTimer = null;
		initTwikooPage(generation);
	}, delay);
}

function cancelTwikooInit() {
	initGeneration += 1;
	if (initTimer) {
		clearTimeout(initTimer);
		initTimer = null;
	}
}

function registerTwikooSwupListeners() {
	if (swupListenersRegistered || !window.swup?.hooks) return;
	swupListenersRegistered = true;

	window.swup.hooks.on("visit:start", cancelTwikooInit);
	window.swup.hooks.on("content:replace", () => {
		if (document.getElementById("tcomment")) {
			scheduleTwikooInit(200);
		}
		setTimeout(
			() => window.scrollProtectionManager?.observeTwikoo?.(),
			200,
		);
	});
	window.swup.hooks.on("page:view", () => {
		if (document.getElementById("tcomment")) {
			scheduleTwikooInit(250);
		}
	});
	window.swup.hooks.on("animation:in:end", () =>
		scheduleTwikooInit(SWUP_INIT_DELAY),
	);
}

function bootstrapTwikoo() {
	registerTwikooSwupListeners();
	if (document.getElementById("tcomment")) {
		scheduleTwikooInit(0);
	}
}

window.initTwikooPage = () => scheduleTwikooInit(0);

document.addEventListener("swup:enable", registerTwikooSwupListeners);
document.addEventListener("mizuki:page:loaded", () => {
	if (document.getElementById("tcomment")) {
		scheduleTwikooInit(100);
	}
});

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", bootstrapTwikoo);
} else {
	bootstrapTwikoo();
}

