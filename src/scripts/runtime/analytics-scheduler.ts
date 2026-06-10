/** GTM + Umami 延迟加载（用户交互或超时后） */

(function () {
	if (window.__analyticsSchedulerBootstrapped) return;
	window.__analyticsSchedulerBootstrapped = true;

	function loadGtm(): void {
		type GtmWindow = Window & { dataLayer?: Record<string, unknown>[] };
		(function (w, d, s, l, i) {
			const win = w as GtmWindow;
			win[l as "dataLayer"] = win[l as "dataLayer"] || [];
			win[l as "dataLayer"]!.push({
				"gtm.start": new Date().getTime(),
				event: "gtm.js",
			});
			const f = d.getElementsByTagName(s)[0];
			const j = d.createElement(s) as HTMLScriptElement;
			const dl = l !== "dataLayer" ? "&l=" + l : "";
			j.async = true;
			j.src = "https://www.googletagmanager.com/gtm.js?id=" + i + dl;
			f.parentNode?.insertBefore(j, f);
		})(window, document, "script", "dataLayer", "GTM-KRX3XGVH");
	}

	function loadUmamiFromTemplate(): void {
		const tpl = document.getElementById("umami-scripts-tpl") as
			| HTMLTemplateElement
			| null;
		if (!tpl?.content) return;
		document.head.appendChild(tpl.content);
		tpl.remove();
	}

	let loaded = false;
	function schedule(): void {
		if (loaded) return;
		loaded = true;
		loadGtm();
		loadUmamiFromTemplate();
	}

	(["scroll", "click", "keydown", "touchstart"] as const).forEach((evt) => {
		window.addEventListener(evt, schedule, { once: true, passive: true });
	});
	setTimeout(schedule, 5000);
})();

export {};
