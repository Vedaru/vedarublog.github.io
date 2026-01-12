<script lang="ts">
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
	
	let posts: Post[] = [];
	let loading = true;
	let error: string | null = null;
	
	onMount(async () => {
		try {
			const response = await fetch('/api/posts');
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			posts = await response.json();
		} catch (err) {
			error = err instanceof Error ? err.message : '加载失败';
			console.error('Failed to load posts:', err);
		} finally {
			loading = false;
		}
	});
</script>

<div class="blog-window-content">
	{#if loading}
		<div class="loading">加载中...</div>
	{:else if error}
		<div class="error">加载失败: {error}</div>
	{:else}
		<div class="posts-list">
			{#each posts as post}
				<div class="post-item">
					<h3 class="post-title">{post.data.title}</h3>
					<div class="post-meta">
						<span class="post-date">{new Date(post.data.published).toLocaleDateString()}</span>
						{#if post.data.category}
							<span class="post-category">{post.data.category}</span>
						{/if}
					</div>
					{#if post.data.tags && post.data.tags.length > 0}
						<div class="post-tags">
							{#each post.data.tags as tag}
								<span class="tag">#{tag}</span>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.blog-window-content {
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
	
	.posts-list {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	
	.post-item {
		padding: 16px;
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 8px;
		background: var(--bg-color, #ffffff);
		transition: box-shadow 0.2s ease;
	}
	
	.post-item:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}
	
	.post-title {
		margin: 0 0 8px 0;
		font-size: 18px;
		font-weight: 600;
		color: var(--text-color);
	}
	
	.post-meta {
		display: flex;
		gap: 12px;
		margin-bottom: 8px;
		font-size: 14px;
		color: var(--text-secondary, #6b7280);
	}
	
	.post-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	
	.tag {
		padding: 4px 8px;
		background: var(--primary-bg, #f3f4f6);
		color: var(--primary-color, #3b82f6);
		border-radius: 4px;
		font-size: 12px;
		font-weight: 500;
	}
	
	:global(.dark) .post-item {
		background: var(--card-bg);
		border-color: var(--border-color);
	}
	
	:global(.dark) .post-title {
		color: var(--text-color);
	}
	
	:global(.dark) .post-meta {
		color: var(--text-secondary);
	}
</style>