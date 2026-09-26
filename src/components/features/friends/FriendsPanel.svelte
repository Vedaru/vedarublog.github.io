<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { onDestroy } from "svelte";
import type { FriendItem, FriendsPanelProps } from "./types";

let { friendsList = [] }: FriendsPanelProps = $props();

const allTags = Array.from(new Set(friendsList.flatMap((item) => item.tags)));

let searchTerm = $state("");
let currentTag = $state("all");
let copiedId = $state<number | null>(null);

let copyResetTimer: ReturnType<typeof setTimeout> | undefined;

const normalizedSearch = $derived(searchTerm.trim().toLowerCase());

function cardMatches(item: FriendItem): boolean {
	const matchesSearch =
		normalizedSearch === "" ||
		item.title.toLowerCase().includes(normalizedSearch) ||
		item.desc.toLowerCase().includes(normalizedSearch);
	const matchesTag = currentTag === "all" || item.tags.includes(currentTag);
	return matchesSearch && matchesTag;
}

const visibleCount = $derived(friendsList.filter(cardMatches).length);

function copyLink(item: FriendItem) {
	if (!navigator.clipboard?.writeText) return;
	void navigator.clipboard.writeText(item.siteurl).then(() => {
		copiedId = item.id;
		clearTimeout(copyResetTimer);
		copyResetTimer = setTimeout(() => {
			if (copiedId === item.id) copiedId = null;
		}, 2000);
	});
}

onDestroy(() => clearTimeout(copyResetTimer));

function hostnameOf(url: string): string {
	try {
		return new URL(url).hostname;
	} catch {
		return url;
	}
}
</script>

<!-- 搜索和筛选栏 -->
<div class="mb-6 space-y-3">
	<div class="w-full">
		<div class="relative">
			<input
				type="text"
				id="friend-search"
				bind:value={searchTerm}
				placeholder={i18n(I18nKey.friendsSearchPlaceholder)}
				class="w-full px-4 py-2 pl-10 rounded-lg bg-[var(--btn-regular-bg)]
						text-black/90 dark:text-white/90
						border border-black/10 dark:border-white/10
						focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50
						transition-all duration-200"
			/>
			<svg
				class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-black/40 dark:text-white/40"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
				></path>
			</svg>
		</div>
	</div>

	<!-- 标签筛选 -->
	<div class="filter-container flex flex-wrap gap-2">
		<button
			type="button"
			class="filter-tag"
			class:active={currentTag === "all"}
			onclick={() => (currentTag = "all")}
		>
			{i18n(I18nKey.friendsFilterAll)}
		</button>
		{#each allTags as tag (tag)}
			<button
				type="button"
				class="filter-tag"
				class:active={currentTag === tag}
				onclick={() => (currentTag = tag)}
			>
				{tag}
			</button>
		{/each}
	</div>
</div>

<!-- 友链卡片网格 -->
<div
	id="friends-grid"
	class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 mb-6"
	class:hidden={visibleCount === 0}
>
	{#each friendsList as item (item.id)}
		<div
			class="friend-card group relative bg-transparent rounded-xl border border-black/10 dark:border-white/10
					 overflow-hidden transition-all duration-300
					 hover:shadow-xl hover:-translate-y-1"
			class:hidden={!cardMatches(item)}
		>
			<!-- 卡片内容 -->
			<div class="p-6">
				<!-- 头像和标题区 -->
				<div class="flex items-start gap-4 mb-4">
					<!-- 网站图标 -->
					<div
						class="w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden
								bg-[var(--btn-regular-bg)]
								ring-2 ring-transparent
								transition-all duration-300"
					>
						<img
							src={item.imgurl}
							alt={item.title}
							class="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-300"
							loading="lazy"
						/>
					</div>

					<!-- 标题和链接 -->
					<div class="flex-1 min-w-0">
						<h3
							class="text-xl font-bold text-black/90 dark:text-white/90 mb-1 truncate
								 group-hover:text-[var(--primary)] transition-colors duration-200"
						>
							{item.title}
						</h3>
						<a
							href={item.siteurl}
							target="_blank"
							rel="noopener noreferrer"
							class="text-xs text-black/50 dark:text-white/50 hover:text-[var(--primary)]
								 truncate block transition-colors duration-200"
						>
							{hostnameOf(item.siteurl)}
						</a>
					</div>
				</div>

				<!-- 描述 -->
				<p
					class="text-sm text-black/60 dark:text-white/60 mb-4 line-clamp-2 min-h-[2.5rem]"
				>
					{item.desc}
				</p>

				<!-- 标签 -->
				<div class="flex flex-wrap gap-2 mb-4">
					{#each item.tags as tag (tag)}
						<span
							class="px-2 py-1 text-xs rounded-md
									bg-[var(--primary)]/10 text-[var(--primary)]
									font-medium"
						>
							{tag}
						</span>
					{/each}
				</div>

				<!-- 操作按钮 -->
				<div class="flex gap-2">
					<a
						href={item.siteurl}
						target="_blank"
						rel="noopener noreferrer"
						class="flex-1 flex items-center justify-center gap-2 px-4 py-2
							 rounded-lg bg-[var(--primary)] text-white
							 hover:bg-[var(--primary)]/90
							 active:scale-95 transition-all duration-200
							 font-medium text-sm"
					>
						<svg
							class="w-4 h-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
							></path>
						</svg>
						{i18n(I18nKey.friendsVisit)}
					</a>
					<button
						type="button"
						class="copy-link-btn px-3 py-2 rounded-lg
							 bg-[var(--btn-regular-bg)]
							 hover:bg-[var(--btn-regular-bg-hover)]
							 active:scale-95 transition-all duration-200
							 text-black/70 dark:text-white/70"
						title={i18n(I18nKey.friendsCopyLink)}
						onclick={() => copyLink(item)}
					>
						{#if copiedId === item.id}
							<div class="flex items-center gap-1 text-green-500">
								<svg
									class="w-4 h-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M5 13l4 4L19 7"
									></path>
								</svg>
								<span class="text-xs"
									>{i18n(I18nKey.friendsCopySuccess)}</span
								>
							</div>
						{:else}
							<svg
								class="w-4 h-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
								></path>
							</svg>
						{/if}
					</button>
				</div>
			</div>

			<!-- 悬停装饰效果 -->
			<div
				class="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/5 to-transparent
						opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
			>
			</div>
		</div>
	{/each}
</div>

<!-- 无结果提示 -->
<div id="no-results" class="text-center py-12" class:hidden={visibleCount !== 0}>
	<svg
		class="w-16 h-16 mx-auto mb-4 text-black/20 dark:text-white/20"
		fill="none"
		stroke="currentColor"
		viewBox="0 0 24 24"
	>
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-width="2"
			d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
		></path>
	</svg>
	<p class="text-black/50 dark:text-white/50 text-lg">
		{i18n(I18nKey.friendsNoResults)}
	</p>
</div>

<style>
	/* 友链卡片动画 */
	.friend-card {
		animation: fadeInUp 0.5s ease-out forwards;
		opacity: 0;
	}

	.friend-card:nth-child(1) {
		animation-delay: 0.05s;
	}
	.friend-card:nth-child(2) {
		animation-delay: 0.1s;
	}
	.friend-card:nth-child(3) {
		animation-delay: 0.15s;
	}
	.friend-card:nth-child(4) {
		animation-delay: 0.2s;
	}
	.friend-card:nth-child(5) {
		animation-delay: 0.25s;
	}
	.friend-card:nth-child(6) {
		animation-delay: 0.3s;
	}

	@keyframes fadeInUp {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* 搜索框焦点效果 */
	#friend-search:focus {
		box-shadow: 0 0 0 3px var(--primary) / 0.1;
	}

	/* 标签筛选按钮样式 - 与番剧页面一致 */
	.filter-container {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.filter-tag {
		padding: 0.5rem 1rem;
		border: 1px solid var(--line-divider);
		border-radius: var(--radius-large);
		background: var(--btn-regular-bg);
		color: var(--btn-content);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		white-space: nowrap;
	}

	.filter-tag:hover:not(.active) {
		background: var(--btn-regular-bg-hover);
		border-color: var(--primary);
		transform: translateY(-1px);
	}

	.filter-tag.active {
		background: var(--primary);
		color: white;
		border-color: var(--primary);
	}

	.filter-tag.active:hover {
		background: var(--primary) !important;
		color: white !important;
		border-color: var(--primary) !important;
		transform: translateY(-1px);
	}
</style>
