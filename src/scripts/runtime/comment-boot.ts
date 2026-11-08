/**
 * Load the comment scripts only when the comment card approaches the viewport.
 *
 * twikoo.all.min.js is >1MB. Loading it during a page transition compiles and
 * evaluates the whole bundle on the main thread while the banner/grid glide is
 * running — the single largest source of perceived jank on post pages.
 */
let observer: IntersectionObserver | null = null;
let scriptsLoaded = false;

function loadCommentScripts(): void {
	if (scriptsLoaded) {
		window.initTwikooPage?.();
		return;
	}
	scriptsLoaded = true;
	for (const src of ["/js/scroll-protection.js", "/js/twikoo-init.js"]) {
		if (document.querySelector(`script[src="${src}"]`)) continue;
		const script = document.createElement("script");
		script.src = src;
		script.defer = true;
		script.setAttribute("data-cfasync", "false");
		document.body.appendChild(script);
	}
}

function observeComment(): void {
	observer?.disconnect();
	const comment = document.getElementById("tcomment");
	if (!comment) return;

	if (!("IntersectionObserver" in window)) {
		loadCommentScripts();
		return;
	}

	observer = new IntersectionObserver(
		(entries) => {
			if (!entries.some((entry) => entry.isIntersecting)) return;
			observer?.disconnect();
			observer = null;
			loadCommentScripts();
		},
		{ rootMargin: "400px 0px" },
	);
	observer.observe(comment);
}

document.addEventListener("astro:page-load", observeComment);
document.addEventListener("visit:start", () => {
	observer?.disconnect();
	observer = null;
});

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", observeComment, {
		once: true,
	});
} else {
	observeComment();
}

export {};
