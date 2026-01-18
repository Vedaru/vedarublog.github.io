<script lang="ts">
  import Icon from "@iconify/svelte";
  import { onMount, onDestroy, tick } from "svelte";
  import { slide } from "svelte/transition";

  // --- 1. 配置与数据 ---
  // 这里简化了配置导入，你可以根据你的实际路径 import { musicPlayerConfig } ...
  const musicPlayerConfig = { enable: true, autoplay: false }; 
  
  // 模拟播放列表（实际项目中可替换为 props 或 API 获取）
  export let playlist = [
    {
      id: 1,
      title: "示例歌曲 1",
      artist: "艺术家 A",
      cover: "https://placehold.co/100",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      duration: 0
    },
    {
      id: 2,
      title: "示例歌曲 2",
      artist: "艺术家 B",
      cover: "https://placehold.co/100",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
      duration: 0
    }
  ];

  // --- 2. 状态变量 ---
  let audio: HTMLAudioElement;
  let isPlaying = false;
  let isExpanded = false;
  let isHidden = false; // 默认是否隐藏
  let showPlaylist = false;
  
  let currentIndex = 0;
  $: currentSong = playlist[currentIndex];

  let duration = 0;
  let currentTime = 0; // 音频实际播放时间
  let volume = 0.5;
  let isMuted = false;
  let isLoading = false;

  // Computed property for paused state (opposite of isPlaying)
  $: paused = !isPlaying;

  // --- 3. 核心修复：进度条拖拽逻辑 ---
  
  // 专门用于 UI 显示的进度百分比 (0 - 1)
  let displayProgress = 0;
  // 标记是否正在拖拽
  let isDraggingProgress = false;

  // 响应式声明：如果不处于拖拽状态，进度条跟随音频时间更新
  $: if (!isDraggingProgress && duration > 0) {
    displayProgress = currentTime / duration;
  }

  // 3.1 开始拖拽 (on:pointerdown)
  function startProgressDrag(e: PointerEvent) {
    isDraggingProgress = true;
    updateDragPosition(e); // 立即更新一下位置
  }

  // 3.2 拖拽中 (on:pointermove，绑定在 window 上)
  function handleProgressMove(e: PointerEvent) {
    if (!isDraggingProgress) return;
    e.preventDefault(); // 防止选中文字
    updateDragPosition(e);
  }

  // 3.3 结束拖拽 (on:pointerup，绑定在 window 上)
  function stopProgressDrag(e: PointerEvent) {
    if (!isDraggingProgress) return;
    
    // 1. 计算最终的目标时间
    const newTime = displayProgress * duration;
    
    // 2. 将时间应用到音频 (这是唯一的“同步点”)
    if (audio && Number.isFinite(newTime)) {
      audio.currentTime = newTime;
      currentTime = newTime; // 手动同步一次，防止闪烁
    }

    // 3. 结束拖拽状态
    isDraggingProgress = false;

    // 4. 如果之前暂停，或者你希望拖拽后自动播放
    if (!isPlaying) {
      audio.play().catch(() => {});
    }
  }

  // 辅助函数：根据鼠标位置计算百分比
  let progressBar: HTMLElement;
  function updateDragPosition(e: { clientX: number }) {
    if (!progressBar) return;
    const rect = progressBar.getBoundingClientRect();
    // 计算 0 到 1 之间的比例
    const percent = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    displayProgress = percent;
  }

  // 点击跳转（非拖拽的点击）
  function handleProgressClick(e: MouseEvent) {
    // 如果已经在拖拽中，click 事件可能会触发，需要忽略
    if (isDraggingProgress) return;
    
    updateDragPosition(e);
    const newTime = displayProgress * duration;
    if (audio) {
        audio.currentTime = newTime;
    }
  }

  // --- 4. 其它控制逻辑 (播放、暂停、切歌) ---

  function togglePlay() {
    if (!audio) return;
    if (isPlaying) audio.pause();
    else audio.play().catch(() => {});
  }

  function nextSong() {
    currentIndex = (currentIndex + 1) % playlist.length;
    // 切歌后，audio 标签的 src 会变，自动触发 loadstart
  }

  function prevSong() {
    currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
  }

  function formatTime(seconds: number) {
    if (!seconds || isNaN(seconds)) return "00:00";
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' + sec : sec}`;
  }

  // 处理音频事件
  function onLoadedMetadata() {
    duration = audio.duration;
    if (isPlaying) audio.play().catch(()=>{});
  }
  
  function onEnded() {
    nextSong();
  }

  // --- 5. 生命周期 ---
  onMount(() => {
    // 可以在这里恢复音量设置等
  });

</script>

<!-- 全局窗口事件监听：这对拖拽体验至关重要 -->
<svelte:window 
  on:pointermove={handleProgressMove}
  on:pointerup={stopProgressDrag}
/>

<!-- 隐藏的 Audio 元素 -->
<!-- 注意：bind:currentTime 仍然保留，用于非拖拽时的自动更新 -->
<audio
  bind:this={audio}
  src={currentSong.url}
  bind:paused={paused}
  bind:currentTime={currentTime}
  bind:duration={duration}
  bind:volume={volume}
  on:ended={onEnded}
  on:loadedmetadata={onLoadedMetadata}
  on:play={() => isPlaying = true}
  on:pause={() => isPlaying = false}
></audio>

{#if musicPlayerConfig.enable}
<div class="music-player fixed bottom-4 right-4 z-50" class:expanded={isExpanded} class:hidden-mode={isHidden}>
  
  <!-- 1. 隐藏模式的小球 (Orb) -->
  <div class="orb-player" 
       class:visible={!isHidden} 
       on:click={() => isHidden = false}
       role="button" tabindex="0">
       {#if isPlaying}
         <Icon icon="eos-icons:bubble-loading" class="text-white text-2xl" />
       {:else}
         <Icon icon="material-symbols:music-note" class="text-white text-2xl" />
       {/if}
  </div>

  <!-- 2. 迷你播放器 (Mini Player) -->
  <div class="mini-player card-base" class:visible={!isExpanded && !isHidden}>
    <div class="flex items-center gap-3">
      <!-- 封面 & 播放按钮 -->
      <div class="cover-container" on:click={togglePlay} role="button" tabindex="0">
        <img src={currentSong.cover} alt="cover" class:spinning={isPlaying} />
        <div class="overlay">
          <Icon icon={isPlaying ? "material-symbols:pause" : "material-symbols:play-arrow"} class="text-white text-xl" />
        </div>
      </div>
      
      <!-- 信息 & 展开按钮 -->
      <div class="info flex-1 cursor-pointer" on:click={() => isExpanded = true} role="button" tabindex="0">
        <div class="title truncate">{currentSong.title}</div>
        <div class="artist truncate">{currentSong.artist}</div>
      </div>
      
      <button class="btn-icon" on:click={() => isHidden = true}>
        <Icon icon="material-symbols:close" />
      </button>
    </div>
  </div>

  <!-- 3. 展开播放器 (Expanded Player) -->
  <div class="expanded-player card-base" class:visible={isExpanded && !isHidden}>
    <!-- 头部 -->
    <div class="flex items-center gap-4 mb-4">
        <img src={currentSong.cover} alt="cover" class="w-16 h-16 rounded-lg object-cover" class:spinning={isPlaying} />
        <div class="flex-1 overflow-hidden">
            <div class="title text-lg font-bold truncate">{currentSong.title}</div>
            <div class="artist text-sm opacity-70 truncate">{currentSong.artist}</div>
        </div>
        <button class="btn-icon" on:click={() => isExpanded = false}>
            <Icon icon="material-symbols:expand-more" class="text-xl" />
        </button>
    </div>

    <!-- 进度条区域 (核心修改部分) -->
    <div class="progress-section mb-2">
        <div class="time-info flex justify-between text-xs opacity-60 mb-1">
            <!-- 拖拽时显示计算出的时间，否则显示当前播放时间 -->
            <span>{formatTime(isDraggingProgress ? displayProgress * duration : currentTime)}</span>
            <span>{formatTime(duration)}</span>
        </div>
        
        <!-- 进度条容器 -->
        <div 
            class="progress-bar-container h-4 flex items-center cursor-pointer touch-none"
            bind:this={progressBar}
            on:pointerdown={startProgressDrag}
            on:click={handleProgressClick}
            role="slider" tabindex="0" aria-valuenow={displayProgress * 100}
        >
            <!-- 背景轨道 -->
            <div class="track w-full h-1.5 bg-gray-600 rounded-full overflow-hidden relative">
                <!-- 已播放进度 -->
                <div class="fill h-full bg-[var(--primary)] absolute top-0 left-0"
                     style="width: {displayProgress * 100}%">
                </div>
            </div>
            <!-- 拖拽滑块 (可选，增加视觉反馈) -->
            <div class="thumb w-3 h-3 bg-white rounded-full shadow-md absolute pointer-events-none"
                 style="left: calc({displayProgress * 100}% - 6px)">
            </div>
        </div>
    </div>

    <!-- 控制按钮 -->
    <div class="controls flex justify-between items-center mb-4 px-2">
        <button class="btn-icon" on:click={prevSong}><Icon icon="material-symbols:skip-previous" class="text-2xl" /></button>
        <button class="btn-play" on:click={togglePlay}>
            <Icon icon={isPlaying ? "material-symbols:pause" : "material-symbols:play-arrow"} class="text-3xl" />
        </button>
        <button class="btn-icon" on:click={nextSong}><Icon icon="material-symbols:skip-next" class="text-2xl" /></button>
    </div>

    <!-- 底部功能区 (音量/列表) -->
    <div class="flex items-center gap-2">
        <Icon icon={volume === 0 ? "material-symbols:volume-off" : "material-symbols:volume-up"} />
        <input type="range" min="0" max="1" step="0.01" bind:value={volume} class="flex-1 h-1 bg-gray-600 appearance-none rounded-lg" />
        <button class="btn-icon" on:click={() => showPlaylist = !showPlaylist}>
            <Icon icon="material-symbols:queue-music" />
        </button>
    </div>
  </div>

  <!-- 播放列表弹窗 (简化) -->
  {#if showPlaylist && isExpanded}
    <div class="playlist-panel">
       <!-- 列表内容... -->
       <div class="p-2 border-b">播放列表</div>
       {#each playlist as song, i}
         <div class="p-2 cursor-pointer hover:bg-gray-700" 
              class:text-primary={i === currentIndex}
              on:click={() => { currentIndex = i; }}>
            {song.title}
         </div>
       {/each}
    </div>
  {/if}

</div>
{/if}

<style>
    /* 基础变量 */
    :root {
        --primary: #3b82f6; /* 主题色 */
        --bg-panel: rgba(30, 30, 30, 0.95);
    }

    .music-player {
        font-family: system-ui, sans-serif;
        color: white;
    }

    /* 状态切换的 CSS */
    .mini-player, .expanded-player, .orb-player {
        display: none; /* 默认隐藏 */
        opacity: 0;
        transition: opacity 0.3s ease, transform 0.3s ease;
    }
    
    .visible {
        display: block; /* Svelte class directive 控制 */
        opacity: 1;
        animation: fadeIn 0.3s ease forwards;
    }

    /* Orb 小球 */
    .orb-player {
        width: 48px;
        height: 48px;
        background: var(--primary);
        border-radius: 50%;
        display: flex; /* flex for center icon */
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }

    /* 卡片基础样式 */
    .card-base {
        background: var(--bg-panel);
        backdrop-filter: blur(10px);
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        overflow: hidden;
    }

    /* 迷你播放器 */
    .mini-player {
        width: 280px;
        padding: 12px;
    }
    .cover-container {
        width: 48px;
        height: 48px;
        position: relative;
        border-radius: 50%;
        overflow: hidden;
    }
    .cover-container img { width: 100%; height: 100%; object-fit: cover; }
    .cover-container .overlay {
        position: absolute; inset: 0; background: rgba(0,0,0,0.3);
        display: flex; align-items: center; justify-content: center; opacity: 0;
        transition: opacity 0.2s;
    }
    .cover-container:hover .overlay { opacity: 1; }

    /* 展开播放器 */
    .expanded-player {
        width: 320px;
        padding: 20px;
        bottom: 0; right: 0; /* 调整位置 */
    }

    /* 动画 */
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .spinning { animation: spin 8s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }

    /* 按钮样式 */
    .btn-icon { background: none; border: none; color: #ccc; cursor: pointer; padding: 4px; }
    .btn-icon:hover { color: white; }
    .btn-play {
        width: 50px; height: 50px; background: var(--primary); border-radius: 50%;
        display: flex; align-items: center; justify-content: center; border: none; color: white; cursor: pointer;
    }

    /* 列表面板 */
    .playlist-panel {
        position: absolute; bottom: 100%; right: 0;
        width: 100%; max-height: 200px;
        background: var(--bg-panel);
        border-radius: 12px;
        margin-bottom: 10px;
        overflow-y: auto;
        font-size: 0.9rem;
    }
    
    /* 进度条特定样式 */
    .progress-bar-container {
        position: relative;
    }
    /* 确保滑块在轨道上方 */
    .thumb { z-index: 10; }
</style>