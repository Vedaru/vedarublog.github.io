<script lang="ts">
import { untrack } from "svelte";
import AnimeCard from "./AnimeCard.svelte";
import type { AnimePanelProps } from "./types";

/** 每次滚动揭示的条数，与首屏批量一致（对齐上游 Mizuki 的 BATCH_SIZE）。 */
const BATCH_SIZE = 24;

let {
	items,
	initialCount,
	tabs,
	statusMeta,
	labels,
	listId = "anime-list-container",
}: AnimePanelProps = $props();

// 全量数据由 island props 一次带下来（会随 SSR 标记写进 astro-island 属性），
// 因此揭示剩余卡片没有任何网络往返：滚动到底只是把切片范围调大，同步渲染。
// 这与上游 Mizuki 的 <template id="anime-lazy-store"> 惰性池等价 —— 上游手工把
// 节点从 template 搬进网格，这里交给 Svelte 按 visibleCount 渲染。
let visibleCount = $state(initialCount);
let currentStatus = $state("all");
let sentinel = $state<HTMLElement | null>(null);

const visibleItems = $derived(items.slice(0, visibleCount));
const allRevealed = $derived(visibleCount >= items.length);

function selectStatus(value: string) {
	currentStatus = value;
	// 筛选必须覆盖全部条目（命中的多半还在未渲染区间里），所以首次筛选就一次
	// 渲染完，哨兵随之消失。上游同样在筛选点击时 flush 整个 store。
	if (value !== "all") visibleCount = items.length;
}

// 哨兵进入视口（提前 200px）时追加一批。
// 只依赖 sentinel 本身：观察器在每批揭示后不重建，避免"哨兵仍在视口内→立刻
// 再触发"的连锁揭示；新渲染的卡片会把哨兵自然推远，从而由滚动节奏限速。
// 哨兵卸载（列表已全部渲染）或组件销毁时返回的清理函数会断开观察器。
$effect(() => {
	const el = sentinel;
	if (!el) return;

	const observer = new IntersectionObserver(
		(entries) => {
			if (!entries.some((entry) => entry.isIntersecting)) return;
			untrack(() => {
				visibleCount = Math.min(visibleCount + BATCH_SIZE, items.length);
			});
		},
		{ rootMargin: "200px" },
	);

	observer.observe(el);
	return () => observer.disconnect();
});
</script>

<div class="anime-filter-container flex flex-wrap gap-2 mb-6">
	{#each tabs as tab (tab.value)}
		<button
			type="button"
			class={`anime-filter-tag${currentStatus === tab.value ? " anime-active" : ""}`}
			data-status={tab.value}
			aria-pressed={currentStatus === tab.value ? "true" : "false"}
			onclick={() => selectStatus(tab.value)}
		>
			{tab.label}
		</button>
	{/each}
</div>

<div class="mb-8">
	<div id={listId} class="anime-grid-container grid gap-4 md:gap-6">
		{#each visibleItems as anime, index (index)}
			<AnimeCard
				{anime}
				statusMeta={statusMeta[anime.status] ??
					{ ...statusMeta.default, text: anime.status }}
				{labels}
				hidden={currentStatus !== "all" && anime.status !== currentStatus}
			/>
		{/each}
	</div>

	{#if !allRevealed}
		<div
			id="infinite-scroll-sentinel"
			bind:this={sentinel}
			class="w-full h-20 flex items-center justify-center mt-8"
		>
			<div
				class="anime-loading-spinner w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin"
			></div>
		</div>
	{/if}
</div>
