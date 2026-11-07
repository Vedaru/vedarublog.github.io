export interface ConfigCarrierToc {
	enable: boolean;
	depth: number;
	useJapaneseBadge: boolean;
}

export function initConfigCarrier(toc: ConfigCarrierToc): void {
	window.siteConfig = window.siteConfig || {};
	window.siteConfig.toc = toc;
}
