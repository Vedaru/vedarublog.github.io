<script lang="ts">
import "@/lib/iconify-offline";
import Icon from "@iconify/svelte";
import { onMount } from "svelte";
import I18nKey from "../i18n/i18nKey";
import { i18n } from "../i18n/translation";
import { navigateToPage } from "../utils/navigation-utils";
import { panelManager } from "../utils/panel-manager.js";
import {
	collectHomePostListItems,
	collectMobileTocItems,
	createHeadingScrollSpy,
	isHomePagePath,
	registerTocSwupReinit,
	scrollToTocHeading,
} from "../utils/toc-utils";

let tocItems: Array<{
	id: string;
	text: string;
	level: number;
	badge?: string;
}> = [];
let postItems: Array<{
	title: string;
	url: string;
	category?: string;
	pinned?: boolean;
}> = [];
let activeId = "";
let observer: IntersectionObserver;
let isHomePage = false;
let unregisterSwup: (() => void) | undefined;

const togglePanel = async () => {
	await panelManager.togglePanel("mobile-toc-panel");
};

const setPanelVisibility = async (show: boolean): Promise<void> => {
	await panelManager.togglePanel("mobile-toc-panel", show);
};

const generateTOC = () => {
	tocItems = collectMobileTocItems();
};

const generatePostList = () => {
	postItems = collectHomePostListItems();
};

const scrollToHeading = (id: string) => {
	if (scrollToTocHeading(id)) {
		setPanelVisibility(false);
	}
};

const navigateToPost = (url: string) => {
	setPanelVisibility(false);
	navigateToPage(url);
};

const setupIntersectionObserver = () => {
	if (observer) {
		observer.disconnect();
	}

	observer = createHeadingScrollSpy({
		onIntersect: (id) => {
			activeId = id;
		},
	});
};

const init = () => {
	isHomePage = isHomePagePath(window.location.pathname);
	if (isHomePage) {
		generatePostList();
	} else {
		generateTOC();
		setupIntersectionObserver();
	}
};

onMount(() => {
	const timeoutId = window.setTimeout(init, 100);
	unregisterSwup = registerTocSwupReinit(init);

	return () => {
		window.clearTimeout(timeoutId);
		if (observer) {
			observer.disconnect();
		}
		unregisterSwup?.();
	};
});

if (typeof window !== "undefined") {
	window.mobileTOCInit = init;
}
</script>

<!-- TOC toggle button for mobile -->
<button 
	on:click={togglePanel} 
	aria-label="Table of Contents" 
	id="mobile-toc-switch"
	class="btn-plain scale-animation rounded-lg h-11 w-11 active:scale-90 lg:!hidden theme-switch-btn"
>
	<Icon icon="material-symbols:format-list-bulleted" class="text-[1.25rem]" />
</button>

<!-- Mobile TOC Panel -->
<div 
	id="mobile-toc-panel" 
	class="float-panel float-panel-closed mobile-toc-panel absolute md:w-[20rem] w-[calc(100vw-2rem)]
		top-20 left-4 md:left-[unset] right-4 shadow-2xl rounded-2xl p-4"
>
	<div class="flex items-center justify-between mb-4">
		<h3 class="text-lg font-bold text-[var(--primary)]">{isHomePage ? i18n(I18nKey.postList) : i18n(I18nKey.tableOfContents)}</h3>
		<button 
			on:click={togglePanel}
			aria-label="Close TOC"
			class="btn-plain rounded-lg h-8 w-8 active:scale-90 theme-switch-btn"
		>
			<Icon icon="material-symbols:close" class="text-[1rem]" />
		</button>
	</div>

	{#if isHomePage}
		{#if postItems.length === 0}
			<div class="text-center py-8 text-black/50 dark:text-white/50">
				<Icon icon="material-symbols:article-outline" class="text-2xl mb-2" />
				<p>暂无文章</p>
			</div>
		{:else}
			<div class="post-content">
				{#each postItems as post}
					<button
						on:click={() => navigateToPost(post.url)}
						class="post-item"
					>
						<div class="post-title">
							{#if post.pinned}
								<Icon icon="mdi:pin" class="pinned-icon" />
							{/if}
							{post.title}
						</div>
						{#if post.category}
							<div class="post-category">{post.category}</div>
						{/if}
					</button>
				{/each}
			</div>
		{/if}
	{:else}
		{#if tocItems.length === 0}
			<div class="text-center py-8 text-black/50 dark:text-white/50">
				<p>{i18n(I18nKey.tocEmpty)}</p>
			</div>
		{:else}
			<div class="toc-content">
				{#each tocItems as item}
					<button
						on:click={() => scrollToHeading(item.id)}
						class="toc-item level-{item.level} {activeId === item.id ? 'active' : ''}"
						class:active={activeId === item.id}
					>
						{#if item.level === 1}
							<span class="badge">{item.badge}</span>
						{:else if item.level === 2}
							<span class="dot-square"></span>
						{:else}
							<span class="dot-small"></span>
						{/if}
						<span class="toc-text">{item.text}</span>
					</button>
				{/each}
			</div>
		{/if}
	{/if}
</div>
