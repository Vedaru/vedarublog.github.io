<script lang="ts">
import type { DevicesPanelProps } from "./types";

let { brands, containerId = "devices-container" }: DevicesPanelProps = $props();

let currentBrand = $state(brands[0] ?? "");

// 卡片是服务端渲染的 Astro 组件（保留 astro-icon 的构建期内联），不在本组件内，
// 因此按品牌切换 .filtered-out。$effect 在挂载/换品牌时重跑；Swup 导航后
// 岛屿会重新挂载，无需再手工重绑 DOM 监听器或重新查询按钮。
$effect(() => {
	const brand = currentBrand;
	const container = document.getElementById(containerId);
	if (!container) return;
	for (const card of container.querySelectorAll<HTMLElement>(".device-card")) {
		card.classList.toggle("filtered-out", card.dataset.brand !== brand);
	}
});
</script>

<div class="devices-filter-container mb-6">
	{#each brands as brand (brand)}
		<button
			type="button"
			class={`filter-tag${currentBrand === brand ? " active" : ""}`}
			data-brand={brand}
			aria-pressed={currentBrand === brand ? "true" : "false"}
			onclick={() => (currentBrand = brand)}
		>
			{brand}
		</button>
	{/each}
</div>

<style>
	/* 品牌筛选标签配色对齐主题 .filter-tag（friends.astro / skills / anime.css）：
	   未选中 --btn-regular-bg + --btn-content，选中 --primary + 白字。
	   原页面里的 --btn-hover-bg 全文无定义（主题只有 --btn-regular-bg-hover），
	   已改为真实变量；rgba(var(--color-primary-rgb), …) 的 box-shadow 同样是
	   未定义变量（全文无 --color-primary-rgb / --primary-rgb），整条声明会被
	   浏览器丢弃，已删除以消除死代码。 */
	.devices-filter-container {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.filter-tag {
		padding: 0.625rem 1.25rem;
		border: 1px solid var(--line-divider);
		border-radius: var(--radius-large);
		background: var(--btn-regular-bg);
		color: var(--btn-content);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		white-space: nowrap;
	}

	.filter-tag:hover:not(.active) {
		background: var(--btn-regular-bg-hover);
		border-color: var(--primary);
		transform: translateY(-2px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
	}

	.filter-tag.active {
		background: var(--primary);
		color: white;
		border-color: var(--primary);
		transform: translateY(-1px);
	}

	.filter-tag.active:hover {
		transform: translateY(-2px);
	}

	@media (max-width: 640px) {
		.devices-filter-container {
			gap: 0.5rem;
		}

		.filter-tag {
			padding: 0.5rem 1rem;
			font-size: 0.8rem;
		}
	}
</style>
