/** Twikoo 评论：Swup 切换后可靠初始化，避免重复渲染与容器溢出 */

let initTimer = null;
let initGeneration = 0;
let swupListenersRegistered = false;
let scriptLoadPromise = null;

const TWIKOO_SCRIPT = "/assets/js/twikoo.all.min.js";
/** Swup 换页后等待 head/样式就绪再 init */
const SWUP_INIT_DELAY = 320;

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

function ensureTwikooScript() {
	if (typeof twikoo !== "undefined") return Promise.resolve(true);

	if (scriptLoadPromise) return scriptLoadPromise;

	scriptLoadPromise = new Promise((resolve) => {
		const existing = document.querySelector("script[data-twikoo-loader]");
		if (existing) {
			if (typeof twikoo !== "undefined") {
				resolve(true);
				return;
			}
			existing.addEventListener("load", () =>
				resolve(typeof twikoo !== "undefined"),
			);
			existing.addEventListener("error", () => resolve(false));
			return;
		}

		const script = document.createElement("script");
		script.src = TWIKOO_SCRIPT;
		script.dataset.twikooLoader = "1";
		script.onload = () => resolve(typeof twikoo !== "undefined");
		script.onerror = () => resolve(false);
		document.head.appendChild(script);
	});

	return scriptLoadPromise;
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

	if (!scriptReady || typeof twikoo === "undefined") {
		showTwikooError(commentEl, "评论服务不可用。");
		return;
	}

	commentEl.innerHTML = "";
	commentEl.classList.remove("twikoo-error-state", "twikoo-ready");

	try {
		await twikoo.init({ ...config, path: getCurrentPath() });
		if (generation !== initGeneration) return;

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
		// 不在 content:replace 立即 init，等 page:view / mizuki:page:loaded
		setTimeout(
			() => window.scrollProtectionManager?.observeTwikoo?.(),
			SWUP_INIT_DELAY,
		);
	});
	window.swup.hooks.on("page:view", () =>
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

document.addEventListener("mizuki:page:loaded", () =>
	scheduleTwikooInit(SWUP_INIT_DELAY),
);
document.addEventListener("swup:enable", registerTwikooSwupListeners);

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", bootstrapTwikoo);
} else {
	bootstrapTwikoo();
}
