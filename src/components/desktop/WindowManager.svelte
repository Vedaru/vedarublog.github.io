<script lang="ts">
	import { onMount } from 'svelte';
	import DesktopWindow from './DesktopWindow.svelte';
	import AboutWindow from './windows/AboutWindow.svelte';
	import ArchiveWindow from './windows/ArchiveWindow.svelte';
	
	interface WindowConfig {
		id: string;
		title: string;
		component: string;
		x: number;
		y: number;
		width: number;
		height: number;
		minimized: boolean;
		maximized: boolean;
		zIndex: number;
	}
	
	let windows: WindowConfig[] = [];
	let maxZIndex = 1000;
	
	// 监听全局窗口打开事件
	onMount(() => {
		const handleOpenWindow = (e: CustomEvent) => {
			const { id, title, component, width, height } = e.detail;
			
			// 检查窗口是否已打开
			const existingWindow = windows.find(w => w.id === id);
			if (existingWindow) {
				// 如果已最小化，恢复窗口
				if (existingWindow.minimized) {
					existingWindow.minimized = false;
				}
				// 将窗口置于顶层
				focusWindow(id);
				windows = windows;
				return;
			}
			
			// 计算窗口位置（级联效果）
			const offset = windows.length * 30;
			const x = 100 + offset;
			const y = 80 + offset;
			
			// 创建新窗口
			maxZIndex++;
			windows = [...windows, {
				id,
				title,
				component,
				x,
				y,
				width: width || 800,
				height: height || 600,
				minimized: false,
				maximized: false,
				zIndex: maxZIndex
			}];
		};
		
		window.addEventListener('open-desktop-window', handleOpenWindow as EventListener);
		
		return () => {
			window.removeEventListener('open-desktop-window', handleOpenWindow as EventListener);
		};
	});
	
	function focusWindow(windowId: string) {
		maxZIndex++;
		windows = windows.map(w => 
			w.id === windowId ? { ...w, zIndex: maxZIndex } : w
		);
	}
	
	function closeWindow(windowId: string) {
		windows = windows.filter(w => w.id !== windowId);
	}
	
	function minimizeWindow(windowId: string, minimized: boolean) {
		windows = windows.map(w => 
			w.id === windowId ? { ...w, minimized } : w
		);
	}
	
	function maximizeWindow(windowId: string, maximized: boolean) {
		windows = windows.map(w => 
			w.id === windowId ? { ...w, maximized } : w
		);
	}
	
	// 从任务栏恢复窗口
	export function restoreWindow(windowId: string) {
		const window = windows.find(w => w.id === windowId);
		if (window && window.minimized) {
			minimizeWindow(windowId, false);
			focusWindow(windowId);
		}
	}
</script>

<div class="desktop-window-manager">
	{#each windows as window (window.id)}
		<DesktopWindow
			windowId={window.id}
			title={window.title}
			initialX={window.x}
			initialY={window.y}
			initialWidth={window.width}
			initialHeight={window.height}
			minimized={window.minimized}
			maximized={window.maximized}
			zIndex={window.zIndex}
			on:close={(e) => closeWindow(e.detail.windowId)}
			on:minimize={(e) => minimizeWindow(e.detail.windowId, e.detail.minimized)}
			on:maximize={(e) => maximizeWindow(e.detail.windowId, e.detail.maximized)}
			on:focus={(e) => focusWindow(e.detail.windowId)}
		>
			{#if window.component === 'about'}
				<AboutWindow />
			{:else if window.component === 'archive'}
				<ArchiveWindow />
			{:else if window.component === 'blog'}
				<div class="window-content-wrapper">
					<h2>博客文章</h2>
					<p>博客列表功能开发中...</p>
				</div>
			{:else if window.component === 'projects'}
				<div class="window-content-wrapper">
					<h2>项目展示</h2>
					<p>项目列表功能开发中...</p>
				</div>
			{:else if window.component === 'contact'}
				<div class="window-content-wrapper">
					<h2>联系方式</h2>
					<p>联系信息功能开发中...</p>
				</div>
			{:else}
				<div class="window-content-wrapper">
					<h2>{window.title}</h2>
					<p>内容加载中...</p>
				</div>
			{/if}
		</DesktopWindow>
	{/each}
</div>

<!-- 任务栏 -->
{#if windows.length > 0}
<div class="desktop-taskbar">
	<div class="taskbar-windows">
		{#each windows as window (window.id)}
			<button
				class="taskbar-window-btn"
				class:minimized={window.minimized}
				class:active={!window.minimized && window.zIndex === maxZIndex}
				on:click={() => restoreWindow(window.id)}
			>
				<span class="taskbar-window-title">{window.title}</span>
			</button>
		{/each}
	</div>
</div>
{/if}

<style>
	.desktop-window-manager {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 999;
	}
	
	.desktop-window-manager :global(.desktop-window) {
		pointer-events: all;
	}
	
	.window-content-wrapper {
		color: rgba(0, 0, 0, 0.85);
	}
	
	:global(.dark) .window-content-wrapper {
		color: rgba(255, 255, 255, 0.85);
	}
	
	.window-content-wrapper h2 {
		font-size: 24px;
		font-weight: 600;
		margin-bottom: 16px;
	}
	
	.desktop-taskbar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		height: 48px;
		background: var(--card-bg);
		border-top: 1px solid rgba(0, 0, 0, 0.1);
		display: flex;
		align-items: center;
		padding: 0 12px;
		z-index: 9999;
		backdrop-filter: blur(10px);
	}
	
	:global(.dark) .desktop-taskbar {
		border-top-color: rgba(255, 255, 255, 0.1);
	}
	
	.taskbar-windows {
		display: flex;
		gap: 8px;
		flex: 1;
	}
	
	.taskbar-window-btn {
		min-width: 160px;
		max-width: 200px;
		height: 36px;
		padding: 0 12px;
		background: rgba(0, 0, 0, 0.03);
		border: 1px solid rgba(0, 0, 0, 0.05);
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		justify-content: flex-start;
	}
	
	:global(.dark) .taskbar-window-btn {
		background: rgba(255, 255, 255, 0.03);
		border-color: rgba(255, 255, 255, 0.05);
	}
	
	.taskbar-window-btn:hover {
		background: rgba(0, 0, 0, 0.05);
	}
	
	:global(.dark) .taskbar-window-btn:hover {
		background: rgba(255, 255, 255, 0.05);
	}
	
	.taskbar-window-btn.active {
		background: rgba(var(--primary-rgb, 0, 122, 255), 0.1);
		border-color: rgba(var(--primary-rgb, 0, 122, 255), 0.3);
	}
	
	.taskbar-window-btn.minimized {
		opacity: 0.6;
	}
	
	.taskbar-window-title {
		font-size: 13px;
		color: rgba(0, 0, 0, 0.85);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	
	:global(.dark) .taskbar-window-title {
		color: rgba(255, 255, 255, 0.85);
	}
</style>
