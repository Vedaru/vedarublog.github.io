/** Twikoo 评论链：scroll-protection + twikoo-init */

export function bootCommentScripts(): void {
	if (!document.getElementById("tcomment")) return;
	loadCommentScript("/js/scroll-protection.js");
	loadCommentScript("/js/twikoo-init.js");
}

function loadCommentScript(src: string): void {
	if (document.querySelector(`script[src="${src}"]`)) return;
	const s = document.createElement("script");
	s.src = src;
	s.defer = true;
	s.setAttribute("data-cfasync", "false");
	document.body.appendChild(s);
}

function registerCommentSwupHooks(): void {
	if (typeof window.onSwupHook !== "function") return;
	window.onSwupHook("content:replace", () => {
		bootCommentScripts();
		window.initTwikooPage?.();
	});
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", () => {
		bootCommentScripts();
		registerCommentSwupHooks();
	});
} else {
	bootCommentScripts();
	registerCommentSwupHooks();
}
