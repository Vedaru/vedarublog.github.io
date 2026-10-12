<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { formatDateToYYYYMMDD } from "@utils/date-utils";
import { comparePublishedDatesDescending } from "@utils/post-date-utils";
import { onMount } from "svelte";
import type { ArchivePanelProps, Group, Post } from "./types";

let { sortedPosts = [], locale = "" }: ArchivePanelProps = $props();

// 筛选条件来自 URL（侧边栏的分类/标签链接）。URL 只有浏览器才有，所以
// 不能在组件初始化时读取：那会让组件无法 SSR，只能用 client:only，
// 列表要等 JS 加载后才被插入 DOM —— 这正是归档页在入场动画结束后整体
// 下移/跳动的原因。
//
// 改为：SSR 先用全量数据渲染出列表（首屏即有内容、利于 SEO），挂载后
// 再按 URL 参数收敛到筛选结果。
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

/** 把文章按发布年份分组，年份倒序。 */
function buildGroups(posts: Post[]): Group[] {
	const grouped = posts.reduce(
		(acc, post) => {
			const year = postYear(post.data.published);
			(acc[year] ||= []).push(post);
			return acc;
		},
		{} as Record<number, Post[]>,
	);

	return Object.keys(grouped)
		.map((yearStr) => ({
			year: Number.parseInt(yearStr, 10),
			posts: grouped[Number.parseInt(yearStr, 10)],
		}))
		.sort((a, b) => b.year - a.year);
}

/** 按 URL 查询参数筛出文章（无参数时即全量）。 */
function filterByParams(posts: Post[], params: URLSearchParams): Post[] {
	const tags = params.getAll("tag");
	const categories = params.getAll("category");
	const uncategorized = params.has("uncategorized");

	let filtered = posts;

	if (tags.length > 0) {
		filtered = filtered.filter(
			(post) =>
				Array.isArray(post.data.tags) &&
				post.data.tags.some((tag) => tags.includes(tag)),
		);
	}

	if (categories.length > 0) {
		filtered = filtered.filter(
			(post) => post.data.category && categories.includes(post.data.category),
		);
	}

	if (uncategorized) {
		filtered = filtered.filter((post) => !post.data.category);
	}

	// 按发布时间倒序排序，确保不受置顶影响
	return filtered
		.slice()
		.sort((a, b) =>
			comparePublishedDatesDescending(
				a.data.published,
				b.data.published,
				a.id,
				b.id,
			),
		);
}

// 服务端先渲染全量列表，保证首屏就有内容。
groups = buildGroups(sortedPosts);

onMount(() => {
	// 挂载后按 URL 参数收敛；普通访问（无参数）结果不变，因此不会位移。
	groups = buildGroups(
		filterByParams(sortedPosts, new URLSearchParams(window.location.search)),
	);
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
						locale,
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
