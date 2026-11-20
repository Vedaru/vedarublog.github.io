export {};

declare global {
	interface HTMLElementTagNameMap {
		"table-of-contents": HTMLElement;
	}

	interface Window {
		hljs?: {
			highlightElement: (element: HTMLElement) => void;
		};
		renderMermaidDiagrams?: () => void;
		Fancybox?: {
			bind: (selector: string, options?: object) => void;
			unbind: (selector: string) => void;
		};
		// Define swup type directly since @swup/astro doesn't export AstroIntegration
		swup: any;
		closeAnnouncement: () => void;

		mobileTOCInit?: () => void;
		iconifyLoaded?: boolean;
		__iconifyLoader?: {
			load: () => Promise<void>;
			addToPreloadQueue: (icons: string[]) => void;
			onLoad: (callback: () => void) => void;
			isLoaded: boolean;
		};
		siteConfig: any;
		__lastModifiedBootstrapped?: boolean;
		initLastModifiedPage?: () => void;
		__twikooInitBootstrapped?: boolean;
		initTwikooPage?: () => void;
		__pioInstance?: {
			pauseRendering?: () => void;
			resumeRendering?: () => void;
			reduceRendering?: (fps?: number) => void;
		};
		__PIO_RENDER_CONTROL?: {
			mode: string;
			reduceFPS?: number;
			_lastRender?: number;
			_wasPaused?: boolean;
			_softResumeUntil?: number;
		};
		__PIO_RESET_ANIMATION_DELTA?: () => void;
		tocClickTimestamp?: number;
		__themePageScaling?: { enable?: boolean; targetWidth?: number };
		__adjustPageScale?: () => void;
		__analyticsSchedulerBootstrapped?: boolean;
		__iconifyLoaderInitialized?: boolean;
		backToTop?: () => void;
		loadIconify?: () => Promise<void> | void;
		preloadIcons?: (icons: string | string[]) => void;
		onIconifyReady?: (callback: () => void) => void;
		scrollProtectionManager?: {
			observeTwikoo?: () => void;
		};
	}
}

interface SearchResult {
	url: string;
	meta: {
		title: string;
	};
	excerpt: string;
}

export { SearchResult };
