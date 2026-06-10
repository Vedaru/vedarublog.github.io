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
		pagefind: {
			search: (query: string) => Promise<{
				results: Array<{
					data: () => Promise<SearchResult>;
				}>;
			}>;
			options?: (opts: { excerptLength?: number }) => Promise<void>;
		};

		mobileTOCInit?: () => void;
		initSemifullScrollDetection?: (initialScrollTop?: number) => void;
		applySemifullNavbarVisualState?: (
			scrollTop: number,
			isHomePage: boolean,
		) => void;
		__suppressSemifullNavbarReinit?: boolean;
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
		__archiveFilterBootstrapped?: boolean;
		initArchiveFilter?: () => void;
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
		__bannerSessionApplyDrift?: (root?: ParentNode | null) => void;
		__bannerDriftPause?: () => void;
		__bannerDriftResume?: () => void;
		__bannerDriftBootstrapped?: boolean;
		__homePreScrollActive?: boolean;
		__smoothScrollActive?: boolean;
		__smoothScrollBootstrapped?: boolean;
		__smoothScrollToY?: (
			targetY: number,
			duration?: number,
			easingFn?: (t: number) => number,
			onProgress?: (progress: number, scrollY: number) => void,
		) => Promise<void>;
		__smoothScrollToTop?: (
			duration?: number,
			easingFn?: (t: number) => number,
			onProgress?: (progress: number, scrollY: number) => void,
		) => Promise<void>;
		__easeInOutCubic?: (t: number) => number;
		__smoothScrollToElement?: (
			element: Element | null,
			offset?: number,
			duration?: number,
		) => Promise<void>;
		tocClickTimestamp?: number;
		__homePreScrollBootstrapped?: boolean;
		__homePreScrollCompleted?: boolean;
		__homePreScrollWasUsed?: boolean;
		__shouldHomePreScroll?: (visit: { to?: { url?: string } }) => boolean;
		__applyVisitStartLayout?: (
			visit: { to: { url: string } },
			options?: { deferBodyLayout?: boolean },
		) => void;
		__flushPendingVisitBodyLayout?: () => void;
		__pendingVisitBodyLayout?: { to: { url: string } };
		__pinPageScrollTop?: () => void;
		__lockSwupScroll?: () => void;
		__lockSwupScrollAndPin?: () => void;
		__unlockSwupScroll?: () => void;
		__resetHomePreScrollState?: () => void;
		__nativeScrollTo?: typeof window.scrollTo;
		__nativeScrollBy?: typeof window.scrollBy;
		__swupPerfBootstrapped?: boolean;
		__swupPerfPause?: () => void;
		__swupPerfResume?: () => void;
		__onSwupPageWritePhase?: (
			fn: (detail: { scrollTop: number }) => void,
		) => void;
		__onSwupPageLayoutPhase?: (
			fn: (detail: { scrollTop: number }) => void,
		) => void;
		__onSwupPageIdlePhase?: (fn: () => void) => void;
		__scheduleSwupIdleWork?: (fn: () => void) => void;
		__deferWallpaperNavbarSync?: () => void;
		__pendingWallpaperSync?: boolean;
		__runWallpaperNavbarSyncOnTransition?: (scrollTop?: number) => void;
		__swupPhaseScrollTop?: number;
		__swupPhaseInnerHeight?: number;
		__syncTocHideForScroll?: (
			scrollTop: number,
			innerHeight?: number,
		) => void;
		__applyWallpaperBodyClasses?: (mode: string) => void;
		__applyVisitBodyLayout?: (visit: { to: { url: string } }) => void;
		__applyVisitBannerLayout?: (visit: { to: { url: string } }) => void;
		__bootstrapWallpaperBodyClasses?: () => void;
		__themePageScaling?: { enable?: boolean; targetWidth?: number };
		__adjustPageScale?: () => void;
		__analyticsSchedulerBootstrapped?: boolean;
		__iconifyLoaderInitialized?: boolean;
		backToTop?: () => void;
		loadIconify?: () => Promise<void> | void;
		preloadIcons?: (icons: string | string[]) => void;
		onIconifyReady?: (callback: () => void) => void;
		__getScrollY?: () => number;
		__pinScrollTopWithFrames?: (count?: number) => void;
		__getNavbarHideThreshold?: () => number;
		__syncNavbarWrapperForScrollY?: (scrollY?: number) => void;
		__finalizeNavbarWrapperAfterScroll?: () => void;
		__clearNavbarWrapperInlineStyles?: () => void;
		__normalizePath?: (path: string) => string;
		__isHomePagePath?: (pathname: string) => boolean;
		__isMainHomePage?: (pathname: string) => boolean;
		__pathFromUrl?: (url: string) => string;
		__pathsEqual?: (path1: string, path2: string) => boolean;
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
	content?: string;
	word_count?: number;
	filters?: Record<string, unknown>;
	anchors?: Array<{
		element: string;
		id: string;
		text: string;
		location: number;
	}>;
	weighted_locations?: Array<{
		weight: number;
		balanced_score: number;
		location: number;
	}>;
	locations?: number[];
	raw_content?: string;
	raw_url?: string;
	sub_results?: SearchResult[];
}

export { SearchResult };
