export interface ConfigCarrierToc {
	enable: boolean;
	depth: number;
	useJapaneseBadge: boolean;
}

export function initConfigCarrier(toc: ConfigCarrierToc): void {
	window.siteConfig = window.siteConfig || {};
	window.siteConfig.toc = toc;
}

export function scheduleUmamiShareScript(): void {
	const load = (): void => {
		if (document.querySelector('script[src="/js/umami-share.js"]')) return;
		const s = document.createElement("script");
		s.src = "/js/umami-share.js";
		s.async = true;
		document.head.appendChild(s);
	};

	if ("requestIdleCallback" in window) {
		requestIdleCallback(load, { timeout: 3000 });
	} else {
		setTimeout(load, 3000);
	}
}
