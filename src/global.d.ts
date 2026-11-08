export {};

declare global {
	interface HTMLElementTagNameMap {
		"table-of-contents": HTMLElement & {
			init?: () => void;
			regenerateTOC?: () => void;
		};
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
		initSemifullScrollDetection?: (initialScrollTop?: number) => void;
		applySemifullNavbarVisualState?: (
			scrollTop: number,
			isHomePage: boolean,
		) => void;
		iconifyLoaded?: boolean;
		__iconifyLoader?: {
			load: () => Promise<void>;
			addToPreloadQueue: (icons: string[]) => void;
			onLoad: (callback: () => void) => void;
			isLoaded: boolean;
		};
		siteConfig: any;
		__pendingLayoutMode?: string;
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
		__onSwupPageIdlePhase?: (fn: () => void) => void;
		__scheduleSwupIdleWork?: (fn: () => void) => void;
		__wallpaperSwitchTimer?: number;
		__syncTocHideForScroll?: (
			scrollTop: number,
			innerHeight?: number,
		) => void;
		__applyWallpaperBodyClasses?: (mode: string) => void;
		__applyVisitBodyLayout?: (visit: { to?: { url?: string } }) => void;
		__applyVisitBannerLayout?: (visit: { to?: { url?: string } }) => void;
		__bootstrapWallpaperBodyClasses?: () => void;
		__themePageScaling?: { enable?: boolean; targetWidth?: number };
		__adjustPageScale?: () => void;
		__analyticsSchedulerBootstrapped?: boolean;
		__iconifyLoaderInitialized?: boolean;
		backToTop?: () => void;
		loadIconify?: () => Promise<void> | void;
		preloadIcons?: (icons: string | string[]) => void;
		onIconifyReady?: (callback: () => void) => void;
		__syncNavbarWrapperForScrollY?: (
			scrollY?: number,
			options?: { forceHomeBanner?: boolean },
		) => void;
		__finalizeNavbarWrapperAfterScroll?: () => void;
		__clearNavbarWrapperInlineStyles?: () => void;
		__scrollSyncBootstrapped?: boolean;
		__cachedInnerWidth?: number; // pre-read by flushScrollSync to avoid inter-callback forced reflow
		__scheduleScrollSync?: (
			fn: (scrollTop: number, innerHeight: number) => void,
		) => void;
		onSwupReady?: (
			registerFn: (swup: any) => void,
			options?: { retryMs?: number; timeoutMs?: number },
		) => void;
		onSwupHook?: (
			hook: string,
			fn: (...args: any[]) => void,
			options?: { retryMs?: number; timeoutMs?: number },
		) => void;
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
