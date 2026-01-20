declare global {
	interface HTMLElementTagNameMap {
		"table-of-contents": HTMLElement & {
			init?: () => void;
		};
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

	interface Window {
		// Define swup type directly since @swup/astro doesn't export AstroIntegration
		swup: {
			hooks: {
				on: (
					event: string,
					callback: (args?: Record<string, unknown>) => void,
				) => void;
				off: (event: string) => void;
			};
		};
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
		iconifyLoaded?: boolean;
		__iconifyLoader?: {
			load: () => Promise<void>;
			addToPreloadQueue: (icons: string[]) => void;
			onLoad: (callback: () => void) => void;
			isLoaded: boolean;
		};
		siteConfig: {
			toc?: {
				useJapaneseBadge?: boolean;
				depth?: number;
			};
		};

		// Additional globals introduced by runtime scripts
		DEFAULT_THEME?: string;
		LIGHT_MODE?: string;
		DARK_MODE?: string;
		configHue?: number;

		// Sakura manager globals
		__toggleSakura?: () => void;
		__getSakuraStatus?: () => boolean;
		__sakuraManagerInitialized?: boolean;
		sakuraInitialized?: boolean;
	}
}

export interface SearchResult {
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
