<script lang="ts">
import { loadPagefind } from "@/lib/pagefind-loader";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import "@/lib/iconify-offline";
import Icon from "@iconify/svelte";
import { navigateToPage } from "@utils/navigation-utils";
import { url } from "@utils/url-utils";
import { onMount, onDestroy } from "svelte";
import type { SearchResult } from "@/global";

// 语言由 .astro 父组件传入（Astro.currentLocale），保证 SSR 与 hydration 一致
let { locale = "" } = $props();

// 语言可能是 "en" 或 "zh" / "zh-CN" 等写法，统一成两种之一
const isLocale = locale.toLowerCase().startsWith("en") ? "en" : "zh";

let keywordDesktop = $state("");
let keywordMobile = $state("");
let result: SearchResult[] = $state([]);
let pagefindLoaded = false;
let initialized = $state(false);
let isDesktopSearchExpanded = $state(false);
let debounceTimer: NodeJS.Timeout;
let windowJustFocused = false;
let focusTimer: NodeJS.Timeout;
let blurTimer: NodeJS.Timeout;

const fakeResult: SearchResult[] = [
	{
		url: url("/"),
		meta: {
			title: "This Is a Fake Search Result",
		},
		excerpt:
			"Because the search cannot work in the <mark>dev</mark> environment.",
	},
	{
		url: url("/"),
		meta: {
			title: "If You Want to Test the Search",
		},
		excerpt: "Try running <mark>npm build && npm preview</mark> instead.",
	},
];

/**
 * 结果标题的高亮。
 *
 * Pagefind 只对摘要做高亮（`excerpt` 里带 <mark>），标题是以 meta 原样返回的，
 * 所以标题命中了也看不出来 —— 看起来像"搜不到标题"。这里按关键词自己标一遍。
 * 中文不分词，直接按整词做子串匹配；英文忽略大小写。
 */
function highlightTitle(title: string, query: string): string {
	const escapeHtml = (text: string): string =>
		text
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;");

	const terms = query
		.trim()
		.split(/\s+/)
		.filter((term) => term.length > 0)
		.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

	if (terms.length === 0) return escapeHtml(title);

	// 先转义再接回高亮标签，避免把标题里的 HTML 当结构
	return escapeHtml(title).replace(
		new RegExp(`(${terms.join("|")})`, "gi"),
		"<mark>$1</mark>",
	);
}

// 产生当前结果列表的查询词：高亮标题时用它，避免猜是哪个输入框触发
let lastQuery = $state("");

let pagefindLoadStarted = false;

async function ensurePagefindLoaded() {
	if (import.meta.env.DEV) return;
	if (pagefindLoadStarted && initialized) return;
	pagefindLoadStarted = true;
	await loadPagefind();
	if (!initialized) {
		initialized = true;
		pagefindLoaded =
			typeof window !== "undefined" &&
			!!window.pagefind &&
			typeof window.pagefind.search === "function";
	}
}

const handleSearchInteraction = () => {
	void ensurePagefindLoaded();
};

const togglePanel = () => {
	const panel = document.getElementById("search-panel");
	panel?.classList.toggle("float-panel-closed");
};

const toggleDesktopSearch = () => {
	// 如果窗口刚获得焦点，不自动展开搜索框
	if (windowJustFocused) {
		return;
	}
	isDesktopSearchExpanded = !isDesktopSearchExpanded;
	if (isDesktopSearchExpanded) {
		setTimeout(() => {
			const input = document.getElementById("search-input-desktop") as HTMLInputElement;
			input?.focus();
		}, 0);
	}
};

// 折叠搜索栏前先 blur 输入框，避免 aria-hidden 施加于已聚焦的元素
const collapseSearchBar = () => {
	clearTimeout(blurTimer);
	const input = document.getElementById("search-input-desktop") as HTMLInputElement;
	input?.blur();
	isDesktopSearchExpanded = false;
};

const collapseDesktopSearch = () => {
	if (!keywordDesktop) {
		collapseSearchBar();
	}
};

const handleBlur = () => {
	// 延迟处理以允许搜索结果的点击事件先于折叠逻辑执行
	blurTimer = setTimeout(() => {
		collapseSearchBar();
		// 仅隐藏面板并折叠，保留搜索关键词和结果以便下次展开时查看
		setPanelVisibility(false, true);
	}, 200);
};

const setPanelVisibility = (show: boolean, isDesktop: boolean): void => {
	const panel = document.getElementById("search-panel");
	if (!panel || !isDesktop) return;
	if (show) {
		panel.classList.remove("float-panel-closed");
	} else {
		panel.classList.add("float-panel-closed");
	}
};

const closeSearchPanel = (): void => {
	const panel = document.getElementById("search-panel");
	if (panel) {
		panel.classList.add("float-panel-closed");
	}
	// 清空搜索关键词和结果
	keywordDesktop = "";
	keywordMobile = "";
	result = [];
	// 立即折叠桌面搜索框，避免空搜索栏保持展开状态造成 jitter
	collapseSearchBar();
};

const handleResultClick = (event: Event, url: string): void => {
	event.preventDefault();
	closeSearchPanel();
	navigateToPage(url);
};

const search = async (keyword: string, isDesktop: boolean): Promise<void> => {
	if (!keyword) {
		setPanelVisibility(false, isDesktop);
		result = [];
		return;
	}
	if (!initialized) {
		if (import.meta.env.PROD) {
			await ensurePagefindLoaded();
			if (initialized) {
				return search(keyword, isDesktop);
			}
		}
		return;
	}
	lastQuery = keyword;

	try {
		let searchResults: SearchResult[] = [];
		if (import.meta.env.PROD && window.pagefind) {
			const response = await window.pagefind.search(keyword);
			searchResults = await Promise.all(
				response.results.map((item) => item.data()),
			);
			// 索引里两种语言是在一起的，按当前页面语言过滤，
			// 否则英文页面的搜索结果会混进中文文章。
			searchResults = searchResults.filter((item) =>
				isLocale === "en"
					? item.url.startsWith("/en/")
					: !item.url.startsWith("/en/"),
			);
		} else if (import.meta.env.DEV) {
			searchResults = fakeResult;
		} else {
			searchResults = [];
			console.error("Pagefind is not available in production environment.");
		}
		result = searchResults;
		setPanelVisibility(result.length > 0, isDesktop);
	} catch (error) {
		console.error("Search error:", error);
		result = [];
		setPanelVisibility(false, isDesktop);
	}
};

onMount(() => {
	const initializeSearch = () => {
		initialized = true;
		pagefindLoaded =
			typeof window !== "undefined" &&
			!!window.pagefind &&
			typeof window.pagefind.search === "function";
	};
	if (import.meta.env.DEV) {
		initializeSearch();
	} else {
		document.addEventListener("pagefindready", () => {
			initializeSearch();
		});
		document.addEventListener("pagefindloaderror", () => {
			initializeSearch();
		});
	}

	// 监听窗口焦点事件，防止切换窗口时自动展开搜索框
	const handleFocus = () => {
		windowJustFocused = true;
		clearTimeout(focusTimer);
		focusTimer = setTimeout(() => {
			windowJustFocused = false;
		}, 500); // 500ms 后才允许 mouseenter 触发展开
	};

	window.addEventListener('focus', handleFocus);

	return () => {
		window.removeEventListener('focus', handleFocus);
	};
});

$effect(() => {
	if (initialized) {
		const keyword = keywordDesktop || keywordMobile;
		const isDesktop = !!keywordDesktop || isDesktopSearchExpanded;

		clearTimeout(debounceTimer);
		if (keyword) {
			debounceTimer = setTimeout(() => {
				search(keyword, isDesktop);
			}, 300);
		} else {
			result = [];
			setPanelVisibility(false, isDesktop);
		}
	}
});

$effect(() => {
	if (typeof document !== 'undefined') {
		const navbar = document.getElementById('navbar');
		if (isDesktopSearchExpanded) {
			navbar?.classList.add('is-searching');
		} else {
			navbar?.classList.remove('is-searching');
		}
	}
});

onDestroy(() => {
	if (typeof document !== 'undefined') {
		const navbar = document.getElementById('navbar');
		navbar?.classList.remove('is-searching');
	}
	clearTimeout(debounceTimer);
	clearTimeout(focusTimer);
});
</script>

<!-- search bar for desktop view (collapsed by default) -->
<div
    id="search-bar"
    class="hidden lg:flex transition-all items-center h-11 rounded-lg relative shrink-0 {isDesktopSearchExpanded ? 'bg-black/[0.04] hover:bg-black/[0.06] focus-within:bg-black/[0.06] dark:bg-white/5 dark:hover:bg-white/10 dark:focus-within:bg-white/10' : 'btn-plain active:scale-90'} {isDesktopSearchExpanded ? 'w-48' : 'w-11'}"
    role="button"
    tabindex="0"
    aria-label="Search"
    onmouseenter={() => {if (!isDesktopSearchExpanded) toggleDesktopSearch()}}
    onmouseleave={collapseDesktopSearch}
    onclick={() => {
        handleSearchInteraction();
        const input = document.getElementById("search-input-desktop") as HTMLInputElement;
        input?.focus();
    }}
    onkeydown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleSearchInteraction();
            if (!isDesktopSearchExpanded) toggleDesktopSearch();
            const input = document.getElementById("search-input-desktop") as HTMLInputElement;
            input?.focus();
        }
    }}
>
    <Icon icon="material-symbols:search" class="absolute text-[1.25rem] pointer-events-none {isDesktopSearchExpanded ? 'left-3' : 'left-1/2 -translate-x-1/2'} transition top-1/2 -translate-y-1/2 {isDesktopSearchExpanded ? 'text-black/30 dark:text-white/30' : ''}"></Icon>
    <input id="search-input-desktop" placeholder={i18n(I18nKey.search, locale)} bind:value={keywordDesktop}
        tabindex={isDesktopSearchExpanded ? 0 : -1}
        aria-hidden={!isDesktopSearchExpanded}
        class:pointer-events-none={!isDesktopSearchExpanded}
        onfocus={() => {
            handleSearchInteraction();
            clearTimeout(blurTimer);
            if (!isDesktopSearchExpanded) toggleDesktopSearch();
            search(keywordDesktop, true);
        }}
        onblur={handleBlur}
        class="transition-all pl-10 text-sm bg-transparent outline-0 h-full {isDesktopSearchExpanded ? 'w-36' : 'w-0'} text-black/50 dark:text-white/50"
    >
</div>

<!-- toggle btn for phone/tablet view -->
<button onclick={() => { handleSearchInteraction(); togglePanel(); }} aria-label="Search Panel" id="search-switch"
        class="btn-plain scale-animation lg:!hidden rounded-lg w-11 h-11 active:scale-90">
    <Icon icon="material-symbols:search" class="text-[1.25rem]"></Icon>
</button>

<!-- search panel -->
<div id="search-panel" class="float-panel float-panel-closed absolute md:w-[30rem] top-20 left-4 md:left-[unset] right-4 z-50 search-panel shadow-2xl rounded-2xl p-2">
    <!-- search bar inside panel for phone/tablet -->
    <div id="search-bar-inside" class="flex relative lg:hidden transition-all items-center h-11 rounded-xl bg-black/[0.04] hover:bg-black/[0.06] focus-within:bg-black/[0.06] dark:bg-white/5 dark:hover:bg-white/10 dark:focus-within:bg-white/10">
        <Icon icon="material-symbols:search" class="absolute text-[1.25rem] pointer-events-none ml-3 transition my-auto text-black/30 dark:text-white/30"></Icon>
        <input placeholder={i18n(I18nKey.search, locale)} bind:value={keywordMobile}
               onfocus={handleSearchInteraction}
               class="pl-10 absolute inset-0 text-sm bg-transparent outline-0 focus:w-60 text-black/50 dark:text-white/50"
        >
    </div>
    <!-- search results -->
    {#each result as item}
        <a href={item.url}
           onclick={(e) => handleResultClick(e, item.url)}
           class="transition first-of-type:mt-2 lg:first-of-type:mt-0 group block rounded-xl text-lg px-3 py-2 hover:bg-[var(--btn-plain-bg-hover)] active:bg-[var(--btn-plain-bg-active)]">
            <div class="transition text-90 inline-flex font-bold group-hover:text-[var(--primary)]">
                {@html highlightTitle(item.meta.title ?? "", lastQuery)}<Icon icon="fa6-solid:chevron-right" class="transition text-[0.75rem] translate-x-1 my-auto text-[var(--primary)]"></Icon>
            </div>
            <div class="transition text-sm text-50">
                {@html item.excerpt}
            </div>
        </a>
    {/each}
</div>