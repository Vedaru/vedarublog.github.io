<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import Icon from '@iconify/svelte';
	
	export let windowId: string;
	export let title: string;
	export let initialX: number = 100;
	export let initialY: number = 100;
	export let initialWidth: number = 800;
	export let initialHeight: number = 600;
	export let minimized: boolean = false;
	export let maximized: boolean = false;
	export let zIndex: number = 1000;
	
	const dispatch = createEventDispatcher();
	
	let windowEl: HTMLElement;
	let isDragging = false;
	let isResizing = false;
	let dragStartX = 0;
	let dragStartY = 0;
	let windowX = initialX;
	let windowY = initialY;
	let windowWidth = initialWidth;
	let windowHeight = initialHeight;
	let resizeDirection = '';
	
	// 存储最大化前的位置和尺寸
	let preMaximizeState = {
		x: windowX,
		y: windowY,
		width: windowWidth,
		height: windowHeight
	};
	
	onMount(() => {
		// 确保窗口不超出屏幕
		if (windowX + windowWidth > window.innerWidth) {
			windowX = window.innerWidth - windowWidth - 20;
		}
		if (windowY + windowHeight > window.innerHeight - 100) {
			windowY = window.innerHeight - windowHeight - 100;
		}
		if (windowX < 0) windowX = 20;
		if (windowY < 0) windowY = 20;
	});
	
	function handleTitleBarMouseDown(e: MouseEvent) {
		if ((e.target as HTMLElement).closest('.window-controls')) return;
		
		isDragging = true;
		dragStartX = e.clientX - windowX;
		dragStartY = e.clientY - windowY;
		dispatch('focus', { windowId });
	}
	
	function handleMouseMove(e: MouseEvent) {
		if (isDragging && !maximized) {
			windowX = e.clientX - dragStartX;
			windowY = e.clientY - dragStartY;
			
			// 限制窗口位置
			windowX = Math.max(0, Math.min(windowX, window.innerWidth - 100));
			windowY = Math.max(0, Math.min(windowY, window.innerHeight - 100));
		} else if (isResizing && !maximized) {
			handleResize(e);
		}
	}
	
	function handleMouseUp() {
		isDragging = false;
		isResizing = false;
		resizeDirection = '';
	}
	
	function handleResizeMouseDown(e: MouseEvent, direction: string) {
		e.stopPropagation();
		isResizing = true;
		resizeDirection = direction;
		dragStartX = e.clientX;
		dragStartY = e.clientY;
		dispatch('focus', { windowId });
	}
	
	function handleResize(e: MouseEvent) {
		const deltaX = e.clientX - dragStartX;
		const deltaY = e.clientY - dragStartY;
		
		if (resizeDirection.includes('e')) {
			windowWidth = Math.max(400, windowWidth + deltaX);
		}
		if (resizeDirection.includes('s')) {
			windowHeight = Math.max(300, windowHeight + deltaY);
		}
		if (resizeDirection.includes('w')) {
			const newWidth = Math.max(400, windowWidth - deltaX);
			const widthDiff = windowWidth - newWidth;
			windowX += widthDiff;
			windowWidth = newWidth;
		}
		if (resizeDirection.includes('n')) {
			const newHeight = Math.max(300, windowHeight - deltaY);
			const heightDiff = windowHeight - newHeight;
			windowY += heightDiff;
			windowHeight = newHeight;
		}
		
		dragStartX = e.clientX;
		dragStartY = e.clientY;
	}
	
	function handleClose() {
		dispatch('close', { windowId });
	}
	
	function handleMinimize() {
		minimized = !minimized;
		dispatch('minimize', { windowId, minimized });
	}
	
	function handleMaximize() {
		if (!maximized) {
			// 保存当前状态
			preMaximizeState = {
				x: windowX,
				y: windowY,
				width: windowWidth,
				height: windowHeight
			};
			// 最大化
			windowX = 0;
			windowY = 0;
			windowWidth = window.innerWidth;
			windowHeight = window.innerHeight - 60; // 留出任务栏空间
		} else {
			// 恢复
			windowX = preMaximizeState.x;
			windowY = preMaximizeState.y;
			windowWidth = preMaximizeState.width;
			windowHeight = preMaximizeState.height;
		}
		maximized = !maximized;
		dispatch('maximize', { windowId, maximized });
	}
	
	function handleFocus() {
		dispatch('focus', { windowId });
	}
</script>

<svelte:window on:mousemove={handleMouseMove} on:mouseup={handleMouseUp} />

{#if !minimized}
<div
	bind:this={windowEl}
	class="desktop-window"
	class:maximized
	style="
		left: {windowX}px;
		top: {windowY}px;
		width: {windowWidth}px;
		height: {windowHeight}px;
		z-index: {zIndex};
	"
	on:mousedown={handleFocus}
	role="dialog"
	aria-label={title}
>
	<!-- 标题栏 -->
	<div class="window-titlebar" on:mousedown={handleTitleBarMouseDown} on:dblclick={handleMaximize} role="toolbar" aria-label="Window controls">
		<div class="window-title">{title}</div>
		<div class="window-controls">
			<button class="window-control-btn minimize" on:click={handleMinimize} aria-label="Minimize">
				<Icon icon="mdi:window-minimize" />
			</button>
			<button class="window-control-btn maximize" on:click={handleMaximize} aria-label="Maximize">
				<Icon icon={maximized ? "mdi:window-restore" : "mdi:window-maximize"} />
			</button>
			<button class="window-control-btn close" on:click={handleClose} aria-label="Close">
				<Icon icon="mdi:close" />
			</button>
		</div>
	</div>
	
	<!-- 内容区域 -->
	<div class="window-content">
		<slot />
	</div>
	
	<!-- 调整大小手柄 -->
	{#if !maximized}
	<div class="resize-handle n" on:mousedown={(e) => handleResizeMouseDown(e, 'n')} role="separator" aria-label="Resize north"></div>
	<div class="resize-handle e" on:mousedown={(e) => handleResizeMouseDown(e, 'e')} role="separator" aria-label="Resize east"></div>
	<div class="resize-handle s" on:mousedown={(e) => handleResizeMouseDown(e, 's')} role="separator" aria-label="Resize south"></div>
	<div class="resize-handle w" on:mousedown={(e) => handleResizeMouseDown(e, 'w')} role="separator" aria-label="Resize west"></div>
	<div class="resize-handle ne" on:mousedown={(e) => handleResizeMouseDown(e, 'ne')} role="separator" aria-label="Resize northeast"></div>
	<div class="resize-handle se" on:mousedown={(e) => handleResizeMouseDown(e, 'se')} role="separator" aria-label="Resize southeast"></div>
	<div class="resize-handle sw" on:mousedown={(e) => handleResizeMouseDown(e, 'sw')} role="separator" aria-label="Resize southwest"></div>
	<div class="resize-handle nw" on:mousedown={(e) => handleResizeMouseDown(e, 'nw')} role="separator" aria-label="Resize northwest"></div>
	{/if}
</div>
{/if}

<style>
	.desktop-window {
		position: fixed;
		background: var(--card-bg);
		border: 1px solid rgba(0, 0, 0, 0.1);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
		border-radius: 8px;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		transition: box-shadow 0.2s;
	}
	
	:global(.dark) .desktop-window {
		border-color: rgba(255, 255, 255, 0.1);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
	}
	
	.desktop-window:hover {
		box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
	}
	
	:global(.dark) .desktop-window:hover {
		box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
	}
	
	.desktop-window.maximized {
		border-radius: 0;
	}
	
	.window-titlebar {
		height: 40px;
		background: var(--card-bg);
		border-bottom: 1px solid rgba(0, 0, 0, 0.05);
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 12px;
		cursor: move;
		user-select: none;
	}
	
	:global(.dark) .window-titlebar {
		border-bottom-color: rgba(255, 255, 255, 0.05);
	}
	
	.window-title {
		font-weight: 500;
		font-size: 14px;
		color: rgba(0, 0, 0, 0.85);
		flex: 1;
	}
	
	:global(.dark) .window-title {
		color: rgba(255, 255, 255, 0.85);
	}
	
	.window-controls {
		display: flex;
		gap: 8px;
	}
	
	.window-control-btn {
		width: 32px;
		height: 32px;
		border: none;
		background: transparent;
		border-radius: 4px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.2s;
		color: rgba(0, 0, 0, 0.6);
	}
	
	:global(.dark) .window-control-btn {
		color: rgba(255, 255, 255, 0.6);
	}
	
	.window-control-btn:hover {
		background: rgba(0, 0, 0, 0.05);
	}
	
	:global(.dark) .window-control-btn:hover {
		background: rgba(255, 255, 255, 0.05);
	}
	
	.window-control-btn.close:hover {
		background: #e81123;
		color: white;
	}
	
	.window-content {
		flex: 1;
		overflow: auto;
		padding: 20px;
		background: var(--card-bg);
	}
	
	.resize-handle {
		position: absolute;
		z-index: 10;
	}
	
	.resize-handle.n, .resize-handle.s {
		left: 0;
		right: 0;
		height: 4px;
		cursor: ns-resize;
	}
	
	.resize-handle.n { top: 0; }
	.resize-handle.s { bottom: 0; }
	
	.resize-handle.e, .resize-handle.w {
		top: 0;
		bottom: 0;
		width: 4px;
		cursor: ew-resize;
	}
	
	.resize-handle.e { right: 0; }
	.resize-handle.w { left: 0; }
	
	.resize-handle.ne, .resize-handle.se, .resize-handle.sw, .resize-handle.nw {
		width: 8px;
		height: 8px;
	}
	
	.resize-handle.ne { top: 0; right: 0; cursor: nesw-resize; }
	.resize-handle.se { bottom: 0; right: 0; cursor: nwse-resize; }
	.resize-handle.sw { bottom: 0; left: 0; cursor: nesw-resize; }
	.resize-handle.nw { top: 0; left: 0; cursor: nwse-resize; }
</style>
