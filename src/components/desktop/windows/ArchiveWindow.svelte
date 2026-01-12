<script lang="ts">
	import ArchivePanel from '../../ArchivePanel.svelte';
	import { getSortedPostsList } from '../../../utils/content-utils';
	
	// 异步加载文章列表
	let sortedPostsListPromise = getSortedPostsList();
</script>

<div class="archive-window-content">
	{#await sortedPostsListPromise}
		<div class="loading">加载中...</div>
	{:then sortedPosts}
		<ArchivePanel 
			sortedPosts={sortedPosts.map(post => ({
				...post,
				data: {
					...post.data,
					category: post.data.category || undefined
				}
			}))} 
			tags={[]} 
			categories={[]} 
		/>
	{:catch error}
		<div class="error">加载失败: {error.message}</div>
	{/await}
</div>

<style>
	.archive-window-content {
		width: 100%;
		height: 100%;
		overflow-y: auto;
		padding: 16px;
		background: var(--card-bg);
	}
	
	.loading, .error {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 400px;
		color: var(--text-color);
	}
	
	.error {
		color: var(--error-color, #ef4444);
	}
</style>
