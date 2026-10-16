<script lang="ts">
import { highlightTitle, loadSearchIndex, search as searchDocuments } from "@/lib/search";
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
let isDesktopSearchExpanded = $state(false);
let debounceTimer: NodeJS.Timeout;
let windowJustFocused = false;
let focusTimer: NodeJS.Timeout;
let blurTimer: NodeJS.Timeout;

/** 搜索防抖：输入停顿后再查，避免每敲一个字都查一遍 */
const SEARCH_DEBOUNCE_MS = 300;

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

// 产生当前结果列表的查询词：高亮标题时用它，避免猜是哪个输入框触发
let lastQuery = $state("");

/** 预热：悬停或聚焦搜索框时先把索引拉下来，正式搜索就不用等 */
const warmSearchIndex = () => {
	if (import.meta.env.DEV) return;
	loadSearchIndex(isLocale).catch((error) => {
		console.error("Search index failed to load:", error);
	});
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
	lastQuery = keyword;

	if (import.meta.env.DEV) {
		result = fakeResult;
	} else {
		try {
			await loadSearchIndex(isLocale);
			result = searchDocuments(keyword);
		} catch (error) {
			console.error("Search failed:", error);
			result = [];
		}
	}
	setPanelVisibility(result.length > 0, isDesktop);
};

onMount(() => {
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
	const keyword = keywordDesktop || keywordMobile;
	const isDesktop = !!keywordDesktop || isDesktopSearchExpanded;

	clearTimeout(debounceTimer);
	if (keyword) {
		debounceTimer = setTimeout(() => {
			void search(keyword, isDesktop);
		}, SEARCH_DEBOUNCE_MS);
	} else {
		result = [];
		setPanelVisibility(false, isDesktop);
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
{#snippet searchIcon(className: string)}
    <!-- 放大镜直接内联，不依赖图标运行时，避免搜索入口的图标因为 icon 数据缺失而不显示 -->
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" viewBox="0 0 24 24" width="1em" height="1em" class={className}>
        <path fill="currentColor" d="m19.6 21l-6.3-6.3q-.75.6-1.725.95T9.5 16q-2.725 0-4.612-1.888T3 9.5t1.888-4.612T9.5 3t4.613 1.888T16 9.5q0 1.1-.35 2.075T14.7 13.3l6.3 6.3zM9.5 14q1.875 0 3.188-1.312T14 9.5t-1.312-3.187T9.5 5T6.313 6.313T5 9.5t1.313 3.188T9.5 14"></path>
    </svg>
{/snippet}

<div
    id="search-bar"
    class="hidden lg:flex transition-all items-center h-11 rounded-lg relative shrink-0 {isDesktopSearchExpanded ? 'bg-black/[0.04] hover:bg-black/[0.06] focus-within:bg-black/[0.06] dark:bg-white/5 dark:hover:bg-white/10 dark:focus-within:bg-white/10' : 'btn-plain active:scale-90'} {isDesktopSearchExpanded ? 'w-48' : 'w-11'}"
    role="button"
    tabindex="0"
    aria-label="Search"
    onmouseenter={() => {if (!isDesktopSearchExpanded) toggleDesktopSearch()}}
    onmouseleave={collapseDesktopSearch}
    onclick={() => {
        warmSearchIndex();
        const input = document.getElementById("search-input-desktop") as HTMLInputElement;
        input?.focus();
    }}
    onkeydown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            warmSearchIndex();
            if (!isDesktopSearchExpanded) toggleDesktopSearch();
            const input = document.getElementById("search-input-desktop") as HTMLInputElement;
            input?.focus();
        }
    }}
>
    {@render searchIcon(`absolute text-[1.25rem] pointer-events-none ${isDesktopSearchExpanded ? 'left-3' : 'left-1/2 -translate-x-1/2'} transition top-1/2 -translate-y-1/2 ${isDesktopSearchExpanded ? 'text-black/30 dark:text-white/30' : ''}`)}
    <input id="search-input-desktop" placeholder={i18n(I18nKey.search, locale)} bind:value={keywordDesktop}
        tabindex={isDesktopSearchExpanded ? 0 : -1}
        aria-hidden={!isDesktopSearchExpanded}
        class:pointer-events-none={!isDesktopSearchExpanded}
        onfocus={() => {
            warmSearchIndex();
            clearTimeout(blurTimer);
            if (!isDesktopSearchExpanded) toggleDesktopSearch();
            void search(keywordDesktop, true);
        }}
        onblur={handleBlur}
        class="transition-all pl-10 text-sm bg-transparent outline-0 h-full {isDesktopSearchExpanded ? 'w-36' : 'w-0'} text-black/50 dark:text-white/50"
    >
</div>

<!-- toggle btn for phone/tablet view -->
<button onclick={() => { warmSearchIndex(); togglePanel(); }} aria-label="Search Panel" id="search-switch"
        class="btn-plain scale-animation lg:!hidden rounded-lg w-11 h-11 active:scale-90">
    {@render searchIcon("text-[1.25rem]")}
</button>

<!-- search panel -->
<div id="search-panel" class="float-panel float-panel-closed absolute md:w-[30rem] top-20 left-4 md:left-[unset] right-4 z-50 search-panel shadow-2xl rounded-2xl p-2">
    <!-- search bar inside panel for phone/tablet -->
    <div id="search-bar-inside" class="flex relative lg:hidden transition-all items-center h-11 rounded-xl bg-black/[0.04] hover:bg-black/[0.06] focus-within:bg-black/[0.06] dark:bg-white/5 dark:hover:bg-white/10 dark:focus-within:bg-white/10">
        {@render searchIcon("absolute text-[1.25rem] pointer-events-none ml-3 transition my-auto text-black/30 dark:text-white/30")}
        <input placeholder={i18n(I18nKey.search, locale)} bind:value={keywordMobile}
               onfocus={warmSearchIndex}
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