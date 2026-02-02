# 音乐播放器手机端拖动修复

## 问题描述

手机端进度条无法实现连续拖动，且拖动音量条时进度条会跟着动，导致播放位置错误。

## 根本原因

1. **进度条没有正确使用 Pointer Capture**：
   - 进度条的 `pointerdown` 事件只设置了 `isProgressDragging = true`，但没有调用 `setPointerCapture`
   - 这导致在手机上手指移出条形时，指针事件会被其他元素捕获

2. **事件处理逻辑混乱**：
   - 全局 `svelte:window` 的 `pointermove` 和 `pointerup` 事件会同时处理进度条和音量条
   - 没有正确的状态隔离，拖动音量条时也会触发进度条的更新逻辑

3. **缺少 `touch-none` 样式**：
   - 进度条没有添加 `touch-none` CSS 类，导致浏览器的默认触摸行为可能干扰

## 修复方案

### 1. 添加进度条拖动函数

```javascript
function startProgressDrag(event: PointerEvent) {
	if (!progressBar) return;
	event.preventDefault();
	progressBar.setPointerCapture(event.pointerId);  // 关键：捕获指针
	isProgressDragging = true;
	showProgressTooltip = true;
	handleProgressHover(event);
}

function stopProgressDrag(event: PointerEvent) {
	if (!isProgressDragging) return;
	isProgressDragging = false;
	
	if (progressBar) {
		try {
			progressBar.releasePointerCapture(event.pointerId);
		} catch (e) {
			// 忽略异常
		}
	}
	
	// 拖拽结束时更新音频位置
	if (audio) {
		audio.currentTime = tooltipTime;
		currentTime = tooltipTime;
		if (isPlaying) audio.play().catch(() => {});
	}
	showProgressTooltip = false;
}
```

### 2. 更新进度条 HTML 绑定

```svelte
<!-- 旧方式：直接在 on:pointerdown 内联处理 -->
on:pointerdown={(e) => {
    e.preventDefault();
    isProgressDragging = true;
    ...
}}

<!-- 新方式：调用专门的处理函数 -->
on:pointerdown={startProgressDrag}
```

### 3. 完善全局事件处理

```svelte
<svelte:window 
    on:pointermove={(e) => { 
        if (isVolumeDragging) {
            handleVolumeMove(e);
        }
        if (isProgressDragging) {
            handleProgressHover(e);
        }
    }} 
    on:pointerup={(e) => { 
        if (isVolumeDragging) {
            stopVolumeDrag(e);
        }
        if (isProgressDragging) {
            stopProgressDrag(e);
        }
    }} 
/>
```

**关键改进**：
- 用 `if` 语句分别处理两个拖动状态，避免相互干扰
- 只有在对应的拖动标志为 true 时才处理事件

### 4. 添加 CSS 隔离

进度条添加 `touch-none` 类：
```svelte
<div class="progress-bar relative flex-1 h-2 bg-[var(--btn-regular-bg)] rounded-full cursor-pointer group touch-none"
```

这个 CSS 类会设置 `touch-action: none`，防止浏览器对触摸事件的默认处理。

### 5. 改进 Pointer Capture 释放

在 `stopVolumeDrag` 和 `stopProgressDrag` 中都添加了 try-catch，处理释放时的异常：
```javascript
if (volumeBar) {
    try {
        volumeBar.releasePointerCapture(event.pointerId);
    } catch (e) {
        // 忽略异常
    }
}
```

## 修复效果

✅ 进度条可以连续拖动  
✅ 拖动音量条不再影响进度条  
✅ 手机端和桌面端都能正常工作  
✅ 拖动结束后音频正确跳转到指定位置  

## 技术细节

### Pointer Capture 的作用

`setPointerCapture` 确保即使指针移出元素，该元素仍然会接收指针事件。这对触摸设备特别重要，因为用户的手指可能会意外移出条形元素的边界。

### 状态隔离的重要性

通过分别检查 `isProgressDragging` 和 `isVolumeDragging`，确保：
- 只有进度条被拖动时才更新进度
- 只有音量条被拖动时才更新音量
- 两个操作不会相互干扰

### touch-action: none 的作用

防止浏览器对触摸事件的默认处理（如滚动、平移等），让我们完全控制触摸交互。

## 测试建议

1. **桌面端**：用鼠标拖动进度条和音量条，确保都能平滑拖动
2. **手机端**：
   - 用手指拖动进度条，确保能连续拖动到任意位置
   - 拖动音量条时，进度条不应有任何反应
   - 快速拖动然后松手，音频应该跳到正确的位置
3. **边界情况**：
   - 在条形边界外拖动，确保仍然正常工作
   - 快速切换拖动（从进度条切换到音量条），确保无混乱
