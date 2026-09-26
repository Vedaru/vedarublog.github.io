<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { formatDateToYYYYMMDD } from "@utils/date-utils";
import { comparePublishedDatesDescending } from "@utils/post-date-utils";
import { onMount } from "svelte";
import type { ArchivePanelProps, Group, Post } from "./types";

let { sortedPosts = [] }: ArchivePanelProps = $props();

// 筛选条件全部来自 URL（侧边栏的分类/标签链接），换页时组件重建即为重新读取
const params = new URLSearchParams(window.location.search);
const tags = params.getAll("tag");
const categories = params.getAll("category");
const uncategorized = params.has("uncategorized");

let groups = $state<Group[]>([]);

// 纯日期只保留 UTC 年月日：不读浏览器本地时区，静态构建与客户端渲染才一致
function formatDate(date: Date) {
	return formatDateToYYYYMMDD(date).slice(5);
}

function postYear(date: Date) {
	return Number.parseInt(formatDateToYYYYMMDD(date).slice(0, 4), 10);
}

function formatTag(tagList: string[]) {
	return tagList.map((t) => `#${t}`).join(" ");
}

onMount(() => {
	let filteredPosts: Post[] = sortedPosts;

	if (tags.length > 0) {
		filteredPosts = filteredPosts.filter(
			(post) =>
				Array.isArray(post.data.tags) &&
				post.data.tags.some((tag) => tags.includes(tag)),
		);
	}

	if (categories.length > 0) {
		filteredPosts = filteredPosts.filter(
			(post) => post.data.category && categories.includes(post.data.category),
		);
	}

	if (uncategorized) {
		filteredPosts = filteredPosts.filter((post) => !post.data.category);
	}

	// 按发布时间倒序排序，确保不受置顶影响
	filteredPosts = filteredPosts
		.slice()
		.sort((a, b) =>
			comparePublishedDatesDescending(
				a.data.published,
				b.data.published,
				a.id,
				b.id,
			),
		);

	const grouped = filteredPosts.reduce(
		(acc, post) => {
			const year = postYear(post.data.published);
			if (!acc[year]) {
				acc[year] = [];
			}
			acc[year].push(post);
			return acc;
		},
		{} as Record<number, Post[]>,
	);

	groups = Object.keys(grouped)
		.map((yearStr) => ({
			year: Number.parseInt(yearStr, 10),
			posts: grouped[Number.parseInt(yearStr, 10)],
		}))
		.sort((a, b) => b.year - a.year);
});
</script>

<div class="card-base px-8 py-6">
	{#each groups as group (group.year)}
		<div>
			<div class="flex flex-row w-full items-center h-[3.75rem]">
				<div
					class="w-[15%] md:w-[10%] transition text-2xl font-bold text-right text-75"
				>
					{group.year}
				</div>
				<div class="w-[15%] md:w-[10%]">
					<div
						class="h-3 w-3 bg-none rounded-full outline outline-[var(--primary)] mx-auto -outline-offset-[2px] z-50 outline-3"
					></div>
				</div>
				<div class="w-[70%] md:w-[80%] transition text-left text-50">
					{group.posts.length}
					{i18n(
						group.posts.length === 1
							? I18nKey.postCount
							: I18nKey.postsCount,
					)}
				</div>
			</div>

			{#each group.posts as post (post.id)}
				<a
					href={post.url || `/posts/${post.id}/`}
					aria-label={post.data.title}
					class="group btn-plain !block h-10 w-full rounded-lg hover:text-[initial]"
				>
					<div class="flex flex-row justify-start items-center h-full">
						<!-- date -->
						<div
							class="w-[15%] md:w-[10%] transition text-sm text-right text-50"
						>
							{formatDate(post.data.published)}
						</div>

						<!-- dot and line -->
						<div
							class="w-[15%] md:w-[10%] relative dash-line h-full flex items-center"
						>
							<div
								class="transition-all mx-auto w-1 h-1 rounded group-hover:h-5 bg-[oklch(0.5_0.05_var(--hue))] group-hover:bg-[var(--primary)] outline outline-4 z-50 outline-[var(--card-bg)] group-hover:outline-[var(--btn-plain-bg-hover)] group-active:outline-[var(--btn-plain-bg-active)]"
							></div>
						</div>

						<!-- post title -->
						<div
							class="w-[70%] md:max-w-[65%] md:w-[65%] text-left font-bold group-hover:translate-x-1 transition-all group-hover:text-[var(--primary)] text-75 pr-8 whitespace-nowrap overflow-ellipsis overflow-hidden"
						>
							{post.data.title}
						</div>

						<!-- tag list -->
						<div
							class="hidden md:block md:w-[15%] text-left text-sm transition whitespace-nowrap overflow-ellipsis overflow-hidden text-30"
						>
							{formatTag(post.data.tags)}
						</div>
					</div>
				</a>
			{/each}
		</div>
	{/each}
</div>
