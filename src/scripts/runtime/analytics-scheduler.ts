/** Umami 延迟加载（用户交互或超时后） */

(function () {
	if (window.__analyticsSchedulerBootstrapped) return;
	window.__analyticsSchedulerBootstrapped = true;

	function loadUmamiFromTemplate(): void {
		const tpl = document.getElementById(
			"umami-scripts-tpl",
		) as HTMLTemplateElement | null;
		if (!tpl?.content) return;
		document.head.appendChild(tpl.content);
		tpl.remove();
	}

	let loaded = false;
	function schedule(): void {
		if (loaded) return;
		loaded = true;
		loadUmamiFromTemplate();
	}

	(["scroll", "click", "keydown", "touchstart"] as const).forEach((evt) => {
		window.addEventListener(evt, schedule, { once: true, passive: true });
	});
	setTimeout(schedule, 5000);
})();

export {};
