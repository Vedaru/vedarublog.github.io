<script lang="ts">
import Icon from "@iconify/svelte";
import { onDestroy, onMount } from "svelte";
import { slide } from "svelte/transition";
// 从配置文件中导入音乐播放器配置
import { musicPlayerConfig } from "../../config";
// 导入国际化相关的 Key 和 i18n 实例
import Key from "../../i18n/i18nKey";
import { i18n } from "../../i18n/translation";

// 音乐播放器模式，固定为 "local"，使用本地播放列表
let mode = "local";

// 播放状态，默认为 false (未播放)
let isPlaying = false;
// 播放器是否展开，默认为 false
let isExpanded = false;
// 播放器是否隐藏，默认为 false
let isHidden = false;
// 是否显示播放列表，默认为 false
let showPlaylist = false;
// 当前播放时间，默认为 0
let currentTime = 0;
// 歌曲总时长，默认为 0
let duration = 0;
// 音量，默认为 0.7
let volume = 0.7;
// 是否静音，默认为 false
let isMuted = false;
// 是否正在加载，默认为 false
let isLoading = false;
// 是否随机播放，默认为 false
let isShuffled = false;
// 循环模式，0: 不循环, 1: 单曲循环, 2: 列表循环，默认为 0
let isRepeating = 0;
// 错误信息，默认为空字符串
let errorMessage = "";
// 是否显示错误信息，默认为 false
let showError = false;

// 当前歌曲信息
let currentSong = {
	title: "Sample Song",
	artist: "Sample Artist",
	cover: "/favicon/favicon.ico",
	url: "",
	duration: 0,
};

type Song = {
	id: number;
	title: string;
	artist: string;
	cover: string;
	url: string;
	duration: number;
};

let playlist: Song[] = [];
let currentIndex = 0;
let audio: HTMLAudioElement;
let progressBar: HTMLElement;
let volumeBar: HTMLElement;

async function fetchMetingPlaylist() {
	isLoading = true;
	try {
		const res = await fetch('/assets/music/playlist.json');
		if (!res.ok) throw new Error("playlist.json not found");
		const list: any[] = await res.json();
		playlist = list.map((song: any, index: number) => {
			let title = song.name ?? song.title ?? i18n(Key.unknownSong);
			let artist = song.artist ?? song.author ?? i18n(Key.unknownArtist);
			let dur = song.duration ?? 0;
			if (dur > 10000) dur = Math.floor(dur / 1000);
			if (!Number.isFinite(dur) || dur <= 0) dur = 0;
			return {
				id: index,
				title,
				artist,
				cover: song.cover ?? `/assets/music/cover/${index}-default.jpg`,
				url: song.url ?? `/assets/music/url/${index}-meting.opus`,
				duration: dur,
			};
		});
		if (playlist.length > 0) {
			loadSong(playlist[0]);
		}
		isLoading = false;
	} catch (e) {
		showErrorMessage(i18n(Key.musicPlayerErrorPlaylist));
		isLoading = false;
	}
}

function togglePlay() {
	if (!audio || !currentSong.url) return;
	if (isPlaying) {
		audio.pause();
	} else {
		audio.play().catch(() => {});
	}
}

function toggleExpanded() {
	isExpanded = !isExpanded;
	if (isExpanded) {
		showPlaylist = false;
		isHidden = false;
	}
}

function toggleHidden() {
	isHidden = !isHidden;
	if (isHidden) {
		isExpanded = false;
		showPlaylist = false;
	}
}

function togglePlaylist() {
	showPlaylist = !showPlaylist;
}

function toggleShuffle() {
    isShuffled = !isShuffled;
	if (isShuffled) {
        isRepeating = 0;
	}
}

function toggleRepeat() {
    isRepeating = (isRepeating + 1) % 3;
	if (isRepeating !== 0) {
        isShuffled = false;
	}
}

function previousSong() {
	if (playlist.length <= 1) return;
	const newIndex = currentIndex > 0 ? currentIndex - 1 : playlist.length - 1;
	playSong(newIndex);
}

function nextSong(autoPlay: boolean = true) {
	if (playlist.length <= 1) return;
	
	let newIndex: number;
	if (isShuffled) {
		do {
			newIndex = Math.floor(Math.random() * playlist.length);
		} while (newIndex === currentIndex && playlist.length > 1);
	} else {
		newIndex = currentIndex < playlist.length - 1 ? currentIndex + 1 : 0;
	}
	playSong(newIndex, autoPlay);
}

// 记录切歌时的播放意图
let willAutoPlay = false;

function playSong(index: number, autoPlay = true) {
	if (index < 0 || index >= playlist.length) return;
	
    willAutoPlay = autoPlay;
	currentIndex = index;
	loadSong(playlist[currentIndex]);
}

function getAssetPath(path: string): string {
	if (path.startsWith("http://") || path.startsWith("https://")) return path;
	if (path.startsWith("/")) return path;
	return `/${path}`;
}

function loadSong(song: typeof currentSong) {
	if (!song) return;
	if (song.url !== currentSong.url) {
		currentSong = { ...song };
		if (song.url) {
			isLoading = true;
		} else {
			isLoading = false;
		}
	}
}

let autoplayFailed = false;

function handleLoadSuccess() {
	isLoading = false;
	if (audio?.duration && audio.duration > 1) {
		duration = Math.floor(audio.duration);
		if (playlist[currentIndex]) playlist[currentIndex].duration = duration;
		currentSong.duration = duration;
	}

	if (willAutoPlay || isPlaying) {
        const playPromise = audio.play();
		if (playPromise !== undefined) {
            playPromise.catch((error) => {
                console.warn("自动播放被拦截，等待用户交互:", error);
                autoplayFailed = true;
				isPlaying = false;
            });
		}
    }
}

function handleUserInteraction() {
    if (autoplayFailed && audio) {
        const playPromise = audio.play();
		if (playPromise !== undefined) {
            playPromise.then(() => {
                autoplayFailed = false;
            }).catch(() => {});
		}
    }
}

function handleLoadError(_event: Event) {
	if (!currentSong.url) return;
	isLoading = false;
	showErrorMessage(i18n(Key.musicPlayerErrorSong));
	
    const shouldContinue = isPlaying || willAutoPlay;
	if (playlist.length > 1) {
		setTimeout(() => nextSong(shouldContinue), 1000);
	} else {
		showErrorMessage(i18n(Key.musicPlayerErrorEmpty));
	}
}

function handleLoadStart() {}

function handleAudioEnded() {
	if (isRepeating === 1) {
		audio.currentTime = 0;
		audio.play().catch(() => {});
	} else if (
		isRepeating === 2 ||
		isShuffled ||
		musicPlayerConfig.autoplayContinuous
	) {
		nextSong(true);
	} else {
		isPlaying = false;
	}
}

function showErrorMessage(message: string) {
	errorMessage = message;
	showError = true;
	setTimeout(() => {
		showError = false;
	}, 3000);
}
function hideError() {
	showError = false;
}

function setProgress(event: MouseEvent) {
	if (!audio || !progressBar) return;
	const rect = progressBar.getBoundingClientRect();
	const percent = (event.clientX - rect.left) / rect.width;
	const newTime = percent * duration;
	audio.currentTime = newTime;
	currentTime = newTime;
}

function startProgressDrag(event: PointerEvent) {
	if (!progressBar) return;
	event.preventDefault();
	progressBar.setPointerCapture(event.pointerId);
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
	
	// 拖拽结束时，将音频跳到最后计算出的时间
	if (audio) {
		audio.currentTime = tooltipTime;
		currentTime = tooltipTime;
		// 如果之前是播放状态，恢复播放
		if (isPlaying) audio.play().catch(() => {});
	}
	showProgressTooltip = false;
}

// 进度条相关变量
let isProgressDragging = false;
let showProgressTooltip = false;
let progressTooltipPercent = 0; // 0-100
let tooltipTime = 0;

// 音量条相关变量
let isVolumeDragging = false;
let isPointerDown = false;
let showVolumeTooltip = false;
let volumeTooltipPercent = 0; // 0-100
let volumeHoverValue = 0; // 0-1
let volumeBarRect: DOMRect | null = null;

// 处理进度条悬停移动
function handleProgressHover(e: PointerEvent) {
    if (!progressBar) return;
    const rect = progressBar.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    
    // 更新提示框位置
    progressTooltipPercent = percent * 100;
    
    // 无论是拖拽还是悬停，tooltipTime 都应该显示当前鼠标位置的时间
    tooltipTime = percent * (duration || 0);

    // 如果正在拖拽，我们只更新 tooltipTime 和 progressTooltipPercent (用于视觉跟随)
    // 实际的 currentTime 在 pointerup 时更新，或者你可以选择在拖拽时连续更新音频(会消耗性能且可能有杂音)
    // 这里我们选择视觉跟随，松手跳转
}

// 处理音量悬停移动
function handleVolumeHover(e: PointerEvent) {
    if (!volumeBar) return;
    const rect = volumeBar.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    volumeTooltipPercent = percent * 100;
    volumeHoverValue = percent;
}

function startVolumeDrag(event: PointerEvent) {
    if (!volumeBar) return;
	event.preventDefault();
    
    isPointerDown = true; 
    isVolumeDragging = true;
	volumeBar.setPointerCapture(event.pointerId);

    volumeBarRect = volumeBar.getBoundingClientRect();
    updateVolumeLogic(event.clientX);
    showVolumeTooltip = true;
    handleVolumeHover(event);
}

function handleVolumeMove(event: PointerEvent) {
    if (isPointerDown && isVolumeDragging) {
        event.preventDefault();
        // 拖拽时，音量实时更新逻辑
        updateVolumeLogic(event.clientX);
        handleVolumeHover(event); // 更新 Tooltip 位置
    }
}

function stopVolumeDrag(event: PointerEvent) {
    if (!isPointerDown) return;
	isPointerDown = false;
    isVolumeDragging = false;
    volumeBarRect = null;
    showVolumeTooltip = false;
	
	if (volumeBar) {
		try {
			volumeBar.releasePointerCapture(event.pointerId);
		} catch (e) {
			// 忽略异常
		}
	}
}

function updateVolumeLogic(clientX: number) {
    if (!audio || !volumeBar) return;

    const rect = volumeBarRect || volumeBar.getBoundingClientRect();
	const percent = Math.max(
        0,
        Math.min(1, (clientX - rect.left) / rect.width),
    );
	volume = percent;
}

function toggleMute() {
	isMuted = !isMuted;
}

function formatTime(seconds: number): string {
	if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const interactionEvents = ['click', 'keydown', 'touchstart'];
onMount(() => {
    interactionEvents.forEach(event => {
        document.addEventListener(event, handleUserInteraction, { capture: true });
    });

	if (!musicPlayerConfig.enable) {
		return;
	}
	fetchMetingPlaylist();
});

onDestroy(() => {
    if (typeof document !== 'undefined') {
        interactionEvents.forEach(event => {
            document.removeEventListener(event, handleUserInteraction, { capture: true });
        });
    }
});
</script>

<audio
	bind:this={audio}
	src={getAssetPath(currentSong.url)}
	bind:volume
	bind:muted={isMuted}
	on:play={() => isPlaying = true}
	on:pause={() => isPlaying = false}
	on:timeupdate={() => {
        // 只有当没有拖拽时，才更新 currentTime，避免拖拽时进度条跳动
        if (!isProgressDragging) {
            currentTime = audio.currentTime;
        }
    }}
	on:ended={handleAudioEnded}
	on:error={handleLoadError}
	on:loadeddata={handleLoadSuccess}
	on:loadstart={handleLoadStart}
	preload="auto"
></audio>

<!-- Window 监听器用于处理拖拽时的鼠标移动 -->
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

{#if musicPlayerConfig.enable}
{#if showError}
<div class="fixed bottom-20 right-4 z-[60] max-w-sm">
    <div class="bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-up">
        <Icon icon="material-symbols:error" class="text-xl flex-shrink-0" />
        <span class="text-sm flex-1">{errorMessage}</span>
        <button on:click={hideError} class="text-white/80 hover:text-white transition-colors">
            <Icon icon="material-symbols:close" class="text-lg" />
        </button>
    </div>
</div>
{/if}

<div class="music-player fixed bottom-4 right-4 z-50 transition-all duration-300 ease-in-out"
     class:expanded={isExpanded}
     class:hidden-mode={isHidden}>

    <!-- 隐藏状态的小圆球 -->
    <div class="orb-player w-12 h-12 bg-[var(--primary)] rounded-full shadow-lg cursor-pointer transition-all duration-500 ease-in-out flex items-center justify-center hover:scale-110 active:scale-95"
         class:opacity-0={!isHidden}
         class:scale-0={!isHidden}
         class:pointer-events-none={!isHidden}
         on:click={toggleHidden}
         role="button"
         tabindex="0">
        {#if isLoading}
            <Icon icon="eos-icons:loading" class="text-white text-lg" />
        {:else if isPlaying}
            <div class="flex space-x-0.5">
                <div class="w-0.5 h-3 bg-white rounded-full animate-pulse"></div>
                <div class="w-0.5 h-4 bg-white rounded-full animate-pulse" style="animation-delay: 150ms;"></div>
                <div class="w-0.5 h-2 bg-white rounded-full animate-pulse" style="animation-delay: 300ms;"></div>
            </div>
        {:else}
            <Icon icon="material-symbols:music-note" class="text-white text-lg" />
        {/if}
    </div>

    <!-- 收缩状态的迷你播放器 -->
    <div class="mini-player card-base bg-[var(--float-panel-bg)] shadow-xl rounded-2xl p-3 transition-all duration-500 ease-in-out"
         class:opacity-0={isExpanded || isHidden}
         class:scale-95={isExpanded || isHidden}
         class:pointer-events-none={isExpanded || isHidden}>
        <div class="flex items-center gap-3">
            <div class="cover-container relative w-12 h-12 rounded-full overflow-hidden cursor-pointer"
                 on:click={togglePlay}
                 role="button"
                 tabindex="0">
                <img src={getAssetPath(currentSong.cover)} alt={i18n(Key.musicPlayerCover)}
                     class="w-full h-full object-cover transition-transform duration-300"
                     class:spinning={isPlaying && !isLoading}
                     class:animate-pulse={isLoading} />
                <div class="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    {#if isLoading}
                        <Icon icon="eos-icons:loading" class="text-white text-xl" />
                    {:else if isPlaying}
                        <Icon icon="material-symbols:pause" class="text-white text-xl" />
                    {:else}
                        <Icon icon="material-symbols:play-arrow" class="text-white text-xl" />
                    {/if}
                </div>
            </div>
            <div class="flex-1 min-w-0 cursor-pointer" on:click={toggleExpanded} role="button" tabindex="0">
                <div class="text-sm font-medium text-90 truncate">{currentSong.title}</div>
                <div class="text-xs text-50 truncate">{currentSong.artist}</div>
            </div>
            <div class="flex items-center gap-1">
                <button class="btn-plain w-8 h-8 rounded-lg flex items-center justify-center"
                        on:click|stopPropagation={toggleHidden}>
                    <Icon icon="material-symbols:visibility-off" class="text-lg" />
                </button>
                <button class="btn-plain w-8 h-8 rounded-lg flex items-center justify-center"
                        on:click|stopPropagation={toggleExpanded}>
                    <Icon icon="material-symbols:expand-less" class="text-lg" />
                </button>
            </div>
        </div>
    </div>

    <!-- 展开状态的完整播放器 -->
    <div class="expanded-player card-base bg-[var(--float-panel-bg)] shadow-xl rounded-2xl p-4 transition-all duration-500 ease-in-out"
         class:opacity-0={!isExpanded}
         class:scale-95={!isExpanded}
         class:pointer-events-none={!isExpanded}>
        <div class="flex items-center gap-4 mb-4">
            <div class="cover-container relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                <img src={getAssetPath(currentSong.cover)} alt={i18n(Key.musicPlayerCover)}
                     class="w-full h-full object-cover transition-transform duration-300"
                     class:spinning={isPlaying && !isLoading}
                     class:animate-pulse={isLoading} />
            </div>
            <div class="flex-1 min-w-0">
                <div class="song-title text-lg font-bold text-90 truncate mb-1">{currentSong.title}</div>
                <div class="song-artist text-sm text-50 truncate">{currentSong.artist}</div>
                <div class="text-xs text-30 mt-1">
                    {formatTime(currentTime)} / {formatTime(duration)}
                </div>
            </div>
            <div class="flex items-center gap-1">
                <button class="btn-plain w-8 h-8 rounded-lg flex items-center justify-center"
                        on:click={toggleHidden}>
                    <Icon icon="material-symbols:visibility-off" class="text-lg" />
                </button>
                <button class="btn-plain w-8 h-8 rounded-lg flex items-center justify-center"
                        class:text-[var(--primary)]={showPlaylist}
                        on:click={togglePlaylist}>
                    <Icon icon="material-symbols:queue-music" class="text-lg" />
                </button>
            </div>
        </div>
        
        <!-- 进度条区域 -->
        <div class="progress-section mb-4">
            <div class="progress-bar relative flex-1 h-2 bg-[var(--btn-regular-bg)] rounded-full cursor-pointer group touch-none"
                 bind:this={progressBar}
                 on:click={setProgress}
                 on:pointerenter={(e) => {
                     showProgressTooltip = true;
                     handleProgressHover(e);
                 }}
                 on:pointerleave={() => { if (!isProgressDragging) showProgressTooltip = false; }}
                 on:pointerdown={startProgressDrag}
                 on:pointermove={handleProgressHover}
                 role="slider"
                 tabindex="0"
                 aria-label={i18n(Key.musicPlayerProgress)}
                 aria-valuenow={duration > 0 ? (currentTime / duration * 100) : 0}>
                
                <!-- 进度条填充：拖拽时使用 tooltipPercent，否则使用 currentTime 计算。
                     关键修改：添加 transition-none 强制取消动画 -->
                <div class="h-full bg-[var(--primary)] rounded-full pointer-events-none transition-none"
                     style="width: {isProgressDragging ? progressTooltipPercent : (duration > 0 ? (currentTime / duration) * 100 : 0)}%">
                </div>

                <!-- 进度条提示卡片：位置跟随 progressTooltipPercent -->
                {#if showProgressTooltip}
                    <div class="progress-tooltip absolute transition-none" style="left: {progressTooltipPercent}%;">
                        <div class="tooltip-card">
                            {formatTime(tooltipTime)}
                        </div>
                    </div>
                {/if}
            </div>
        </div>

        <div class="controls flex items-center justify-center gap-2 mb-4">
            <button class="w-10 h-10 rounded-lg"
                    class:btn-regular={isShuffled}
                    class:btn-plain={!isShuffled}
                    on:click={toggleShuffle}
                    disabled={playlist.length <= 1}>
                <Icon icon="material-symbols:shuffle" class="text-lg" />
            </button>
            <button class="btn-plain w-10 h-10 rounded-lg" on:click={previousSong}
                    disabled={playlist.length <= 1}>
                <Icon icon="material-symbols:skip-previous" class="text-xl" />
            </button>
            <button class="btn-regular w-12 h-12 rounded-full"
                    class:opacity-50={isLoading}
                    disabled={isLoading}
                    on:click={togglePlay}>
                {#if isLoading}
                    <Icon icon="eos-icons:loading" class="text-xl" />
                {:else if isPlaying}
                    <Icon icon="material-symbols:pause" class="text-xl" />
                {:else}
                    <Icon icon="material-symbols:play-arrow" class="text-xl" />
                {/if}
            </button>
            <button class="btn-plain w-10 h-10 rounded-lg" on:click={() => nextSong()}
                    disabled={playlist.length <= 1}>
                <Icon icon="material-symbols:skip-next" class="text-xl" />
            </button>
            <button class="w-10 h-10 rounded-lg"
                    class:btn-regular={isRepeating > 0 || (isRepeating === 0 && musicPlayerConfig.autoplayContinuous)}
                    class:btn-plain={isRepeating === 0 && !musicPlayerConfig.autoplayContinuous}
                    on:click={toggleRepeat}>
                {#if isRepeating === 1}
                    <Icon icon="material-symbols:repeat-one" class="text-lg" />
                {:else if isRepeating === 2}
                    <Icon icon="material-symbols:repeat" class="text-lg" />
                {:else if musicPlayerConfig.autoplayContinuous}
                    <Icon icon="material-symbols:repeat" class="text-lg" />
                {:else}
                    <Icon icon="material-symbols:repeat" class="text-lg opacity-50" />
                {/if}
            </button>
        </div>

        <!-- 底部控制栏 -->
        <div class="bottom-controls flex items-center gap-2">
            <button class="btn-plain w-8 h-8 rounded-lg" on:click={toggleMute}>
                {#if isMuted || volume === 0}
                    <Icon icon="material-symbols:volume-off" class="text-lg" />
                {:else if volume < 0.5}
                    <Icon icon="material-symbols:volume-down" class="text-lg" />
                {:else}
                    <Icon icon="material-symbols:volume-up" class="text-lg" />
                {/if}
            </button>

            <!-- 音量条区域 -->
            <div class="relative flex-1 h-2 bg-[var(--btn-regular-bg)] rounded-full cursor-pointer touch-none group"
                 bind:this={volumeBar}
                 on:pointerenter={(e) => {
                     showVolumeTooltip = true;
                     handleVolumeHover(e);
                 }}
                 on:pointerleave={() => { if(!isVolumeDragging) showVolumeTooltip = false; }}
                 on:pointerdown={startVolumeDrag}
                 on:pointermove={handleVolumeHover}
                 role="slider"
                 tabindex="0"
                 aria-label={i18n(Key.musicPlayerVolume)}
                 aria-valuenow={volume * 100}>
                 
                <!-- 音量条填充：拖拽时使用 volumeTooltipPercent，否则使用 volume。
                     关键修改：添加 transition-none 强制取消动画 -->
                <div class="h-full bg-[var(--primary)] rounded-full pointer-events-none transition-none"
                     style="width: {isVolumeDragging ? volumeTooltipPercent : (volume * 100)}%"></div>

                <!-- 音量条提示卡片：位置跟随 volumeTooltipPercent -->
                {#if showVolumeTooltip}
                    <div class="volume-tooltip absolute transition-none" style="left: {volumeTooltipPercent}%;">
                        <div class="tooltip-card">
                            {Math.round((isVolumeDragging ? (volumeTooltipPercent/100) : volumeHoverValue) * 100)}%
                        </div>
                    </div>
                {/if}
            </div>
            
            <button class="btn-plain w-8 h-8 rounded-lg flex items-center justify-center"
                    on:click={toggleExpanded}
                    title={i18n(Key.musicPlayerCollapse)}>
                <Icon icon="material-symbols:expand-more" class="text-lg" />
            </button>
        </div>
    </div>
    
    <!-- 播放列表 (保持不变) -->
    {#if showPlaylist}
        <div class="playlist-panel float-panel fixed bottom-20 right-4 w-80 max-h-96 overflow-hidden z-50"
             transition:slide={{ duration: 300, axis: 'y' }}>
            <div class="playlist-header flex items-center justify-between p-4 border-b border-[var(--line-divider)]">
                <h3 class="text-lg font-semibold text-90">{i18n(Key.musicPlayerPlaylist)}</h3>
                <button class="btn-plain w-8 h-8 rounded-lg" on:click={togglePlaylist}>
                    <Icon icon="material-symbols:close" class="text-lg" />
                </button>
            </div>
            <div class="playlist-content overflow-y-auto max-h-80 pb-2">
                {#each playlist as song, index}
                    <div class="playlist-item flex items-center gap-3 p-3 hover:bg-[var(--btn-plain-bg-hover)] cursor-pointer transition-colors"
                         class:bg-[var(--btn-plain-bg)]={index === currentIndex}
                         class:text-[var(--primary)]={index === currentIndex}
                         on:click={() => playSong(index)}
                         role="button"
                         tabindex="0">
                        <div class="w-6 h-6 flex items-center justify-center">
                            {#if index === currentIndex && isPlaying}
                                <Icon icon="material-symbols:graphic-eq" class="text-[var(--primary)] animate-pulse" />
                            {:else if index === currentIndex}
                                <Icon icon="material-symbols:pause" class="text-[var(--primary)]" />
                            {:else}
                                <span class="text-sm text-[var(--content-meta)]">{index + 1}</span>
                            {/if}
                        </div>
                        <div class="w-10 h-10 rounded-lg overflow-hidden bg-[var(--btn-regular-bg)] flex-shrink-0">
                            <img src={getAssetPath(song.cover)} alt={song.title} loading="lazy" class="w-full h-full object-cover" />
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="font-medium truncate" class:text-[var(--primary)]={index === currentIndex} class:text-90={index !== currentIndex}>
                                {song.title}
                            </div>
                            <div class="text-sm text-[var(--content-meta)] truncate" class:text-[var(--primary)]={index === currentIndex}>
                                {song.artist}
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    {/if}
</div>

<style>
/* CSS 类补充：确保没有 transition */
.transition-none {
    transition: none !important;
}

/* 现有样式 */
.orb-player {
	position: relative;
	backdrop-filter: blur(10px);
	-webkit-backdrop-filter: blur(10px);
}
.orb-player::before {
	content: '';
	position: absolute;
	inset: -2px;
	background: linear-gradient(45deg, var(--primary), transparent, var(--primary));
	border-radius: 50%;
	z-index: -1;
	opacity: 0;
	transition: opacity 0.3s ease;
}
.orb-player:hover::before {
	opacity: 0.3;
	animation: rotate 2s linear infinite;
}
.orb-player .animate-pulse {
	animation: musicWave 1.5s ease-in-out infinite;
}
@keyframes rotate {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}
@keyframes musicWave {
	0%, 100% { transform: scaleY(0.5); }
	50% { transform: scaleY(1); }
}
.music-player.hidden-mode {
	width: 48px;
	height: 48px;
}
.music-player {
    max-width: 320px;
    user-select: none;
}
.mini-player {
    width: 280px;
    position: absolute;
    bottom: 0;
	right: 0;
}
.expanded-player {
    width: 320px;
    position: absolute;
    bottom: 0;
    right: 0;
}

.animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}
.progress-section div:hover,
.bottom-controls > div:hover {
    transform: scaleY(1.2);
    transition: transform 0.2s ease;
}
@media (max-width: 768px) {
    .music-player {
        max-width: 280px;
        bottom: 8px !important;
        right: 8px !important;
	}
    .music-player.expanded {
        width: calc(100vw - 16px);
        max-width: none;
        right: 8px !important;
	}
    .playlist-panel {
        width: calc(100vw - 16px) !important;
        right: 8px !important;
        max-width: none;
	}
    .controls { gap: 8px; }
    .controls button { width: 36px; height: 36px; }
    .controls button:nth-child(3) { width: 44px; height: 44px; }
}
@media (max-width: 480px) {
    .music-player { max-width: 260px; }
    .song-title { font-size: 14px; }
    .song-artist { font-size: 12px; }
    .controls { gap: 6px; margin-bottom: 12px; }
    .controls button { width: 32px; height: 32px; }
    .controls button:nth-child(3) { width: 40px; height: 40px; }
    .playlist-item { padding: 8px 12px; }
    .playlist-item .w-10 { width: 32px; height: 32px; }
}
@keyframes slide-up {
    from { transform: translateY(100%); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
}
.animate-slide-up { animation: slide-up 0.3s ease-out; }
@media (hover: none) and (pointer: coarse) {
    .music-player button, .playlist-item { min-height: 44px; }
    .progress-section > div, .bottom-controls > div:nth-child(2) { height: 12px; }
}
@keyframes spin-continuous {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

.cover-container img {
    animation: spin-continuous 3s linear infinite;
    animation-play-state: paused;
}

.cover-container img.spinning {
    animation-play-state: running;
}

button.bg-\[var\(--primary\)\] {
    box-shadow: 0 0 0 2px var(--primary);
	border: none;
}

.progress-tooltip,
.volume-tooltip {
    bottom: 100%; 
    transform: translateX(-50%);
    pointer-events: none;
    padding-bottom: 8px; 
    z-index: 100;
}

.tooltip-card {
    background: var(--float-panel-bg);
    color: var(--content-meta);
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border: 1px solid var(--line-divider);
    position: relative;
}

.tooltip-card::after {
    content: '';
    position: absolute;
    bottom: -4px;
    left: 50%;
    transform: translateX(-50%) rotate(45deg);
    width: 8px;
    height: 8px;
    background: var(--float-panel-bg);
    border-right: 1px solid var(--line-divider);
    border-bottom: 1px solid var(--line-divider);
}
/* 隐藏播放列表最右侧滚动条，但保留滚动功能（兼容 WebKit、Firefox、IE/Edge） */
.playlist-content {
    -ms-overflow-style: none; /* IE and Edge */
    scrollbar-width: none; /* Firefox */
    /* padding-right removed to prevent highlight gap */
    padding-bottom: 0.75rem; /* 避免最后一项被遮挡，在移动端滚动到底时可以完整显示 */
    scroll-padding-bottom: 0.75rem; /* 在使用键盘或锚点滚动时保留底部空间 */
    box-sizing: border-box; /* 保证 w-full 包含 padding */
}
.playlist-content::-webkit-scrollbar {
    width: 0;
    height: 0;
    display: none;
}</style>
{/if}