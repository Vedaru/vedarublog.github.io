<script lang="ts">
import type { SkillsPanelProps } from "./types";

let { tabs, gridId = "skills-grid" }: SkillsPanelProps = $props();

let currentCategory = $state("all");

// 卡片是服务端渲染的 Astro 组件（保留 Icon.astro 的图标行为），不在本组件内，
// 因此按分类切换 .filtered-out。$effect 在挂载/换分类时重跑；Swup 导航后
// 岛屿会重新挂载，无需再手工监听 swup/astro 事件或 MutationObserver。
$effect(() => {
	const category = currentCategory;
	const grid = document.getElementById(gridId);
	if (!grid) return;
	for (const card of grid.querySelectorAll<HTMLElement>(".skill-card")) {
		card.classList.toggle(
			"filtered-out",
			category !== "all" && card.dataset.category !== category,
		);
	}
});
</script>

<div class="flex flex-wrap justify-center gap-2 mb-8">
	{#each tabs as tab (tab.value)}
		<button
			type="button"
			class={`skill-filter-tab inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-colors duration-200${currentCategory === tab.value ? " is-active" : ""}`}
			data-category={tab.value}
			aria-pressed={currentCategory === tab.value ? "true" : "false"}
			onclick={() => (currentCategory = tab.value)}
		>
			<svg
				class="skill-filter-icon"
				viewBox="0 0 24 24"
				aria-hidden="true"
				focusable="false"
			>
				<path fill="currentColor" d={tab.path} />
			</svg>
			<span>{tab.label}</span>
			<span class="skill-filter-count">{tab.count}</span>
		</button>
	{/each}
</div>

<style>
	/* 筛选标签配色对齐主题 .filter-tag（friends.astro / anime.css / devices.astro）：
	   未选中 --btn-regular-bg + --btn-content，选中 --primary + 可读前景色。
	   选中态前景色不能用 --btn-content —— 它与 --primary 同色相、亮度又接近，
	   实测默认 hue 下仅 1.81:1（浅色）/ 1.01:1（深色），
	   文字、图标（currentColor）和计数徽章会一起"消失"。
	   --deep-text 是主题既有的 primary 前景色（twikoo.css 也在用），
	   全色相区间实测 ≥5.63:1（浅色）/ ≥6.78:1（深色）。 */
	.skill-filter-tab {
		background-color: var(--btn-regular-bg);
		border-color: var(--line-divider);
		color: var(--btn-content);
	}

	.skill-filter-tab:hover:not(.is-active) {
		background-color: var(--btn-regular-bg-hover);
		border-color: var(--primary);
	}

	.skill-filter-tab.is-active {
		background-color: var(--primary);
		border-color: var(--primary);
		color: var(--deep-text);
	}

	/* 内联 SVG 图标：1em 随字号缩放，currentColor 跟随标签前景色 */
	.skill-filter-icon {
		width: 1em;
		height: 1em;
		flex: none;
	}

	.skill-filter-count {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.25rem;
		height: 1.25rem;
		padding: 0 0.3rem;
		border-radius: 9999px;
		font-size: 0.7rem;
		line-height: 1;
		background-color: rgb(0 0 0 / 0.08);
	}

	.skill-filter-tab.is-active .skill-filter-count {
		background-color: rgb(255 255 255 / 0.25);
	}

	:global(.dark) .skill-filter-tab.is-active .skill-filter-count {
		background-color: rgb(255 255 255 / 0.25);
	}

	:global(.dark) .skill-filter-count {
		background-color: rgb(255 255 255 / 0.12);
	}
</style>
