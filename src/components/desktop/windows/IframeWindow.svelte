<script lang="ts">
	export let url: string = '';
	export let title: string = '';
	
	let iframeElement: HTMLIFrameElement;
	let loading = true;
	let error = false;
	
	function handleLoad() {
		loading = false;
	}
	
	function handleError() {
		loading = false;
		error = true;
	}
</script>

<div class="iframe-window-content">
	{#if loading}
		<div class="loading-indicator">
			<div class="spinner"></div>
			<p>加载中...</p>
		</div>
	{/if}
	
	{#if error}
		<div class="error-message">
			<p>页面加载失败</p>
			<button on:click={() => { error = false; loading = true; iframeElement.src = url; }}>
				重试
			</button>
		</div>
	{/if}
	
	<iframe
		bind:this={iframeElement}
		src={url}
		{title}
		on:load={handleLoad}
		on:error={handleError}
		class:hidden={loading || error}
		frameborder="0"
		sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
	></iframe>
</div>

<style>
	.iframe-window-content {
		width: 100%;
		height: 100%;
		position: relative;
		background: var(--card-bg);
		overflow: hidden;
	}
	
	iframe {
		width: 100%;
		height: 100%;
		border: none;
		display: block;
	}
	
	iframe.hidden {
		display: none;
	}
	
	.loading-indicator,
	.error-message {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 16px;
		color: var(--text-color);
	}
	
	.spinner {
		width: 40px;
		height: 40px;
		border: 4px solid var(--border-color);
		border-top-color: var(--primary);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}
	
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	
	.error-message button {
		padding: 8px 16px;
		border-radius: 8px;
		border: 1px solid var(--border-color);
		background: var(--btn-plain-bg);
		color: var(--text-color);
		cursor: pointer;
		transition: all 0.2s;
	}
	
	.error-message button:hover {
		background: var(--btn-plain-bg-hover);
	}
</style>
