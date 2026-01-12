<script lang="ts">
	import ArchivePanel from '../../ArchivePanel.svelte';
	import { onMount } from 'svelte';
	
	interface Post {
		id: string;
		data: {
			title: string;
			tags: string[];
			category?: string;
			published: string | Date;
			permalink?: string;
		};
	}
	
	let sortedPosts: Post[] = [];
	let loading = true;
	let error: string | null = null;
	
	onMount(async () => {
		try {
			const response = await fetch('/api/posts');
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			sortedPosts = await response.json();
		} catch (err) {
			error = err instanceof Error ? err.message : '加载失败';
			console.error('Failed to load posts:', err);
		} finally {
			loading = false;
		}
	});
</script>

<div class="archive-window-content">
	{#if loading}
		<div class="loading">加载中...</div>
	{:else if error}
		<div class="error">加载失败: {error}</div>
	{:else}
		<ArchivePanel {sortedPosts} tags={[]} categories={[]} />
	{/if}
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
