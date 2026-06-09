export {};

declare global {
	interface HTMLElementTagNameMap {
		"table-of-contents": HTMLElement & {
			init?: () => void;
		};
	}

	interface Window {
		// Define swup type directly since @swup/astro doesn't export AstroIntegration
		swup: any;
		closeAnnouncement: () => void;
		pagefind: {
			search: (query: string) => Promise<{
				results: Array<{
					data: () => Promise<SearchResult>;
				}>;
			}>;
		};

		mobileTOCInit?: () => void;
		initSemifullScrollDetection?: () => void;
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
		__smoothScrollToY?: (targetY: number, duration?: number) => Promise<void>;
		__smoothScrollToTop?: (
			duration?: number,
			easingFn?: (t: number) => number,
		) => Promise<void>;
		__easeInOutCubic?: (t: number) => number;
		__smoothScrollToElement?: (
			element: Element | null,
			offset?: number,
			duration?: number,
		) => Promise<void>;
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

