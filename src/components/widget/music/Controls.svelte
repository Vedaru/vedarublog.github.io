<script lang="ts">
import "@/lib/iconify-offline";
import Icon from "@iconify/svelte";
import { musicPlayerConfig } from "@/config";
import Key from "@/i18n/i18nKey";
import { i18n } from "@/i18n/translation";
import type { AudioPlayer } from "@/lib/audio/useAudioPlayer";

export let player: AudioPlayer;

const { stores, actions } = player;
const {
	isPlaying,
	isLoading,
	isShuffled,
	isRepeating,
	currentTime,
	duration,
	volume,
	isMuted,
	playlist,
	isProgressDragging,
	showProgressTooltip,
	progressTooltipPercent,
	tooltipTime,
	isVolumeDragging,
	showVolumeTooltip,
	volumeTooltipPercent,
	volumeHoverValue,
} = stores;

const {
	bindProgressBar,
	bindVolumeBar,
	togglePlay,
	toggleExpanded,
	toggleShuffle,
	toggleRepeat,
	previousSong,
	nextSong,
	formatTime,
	setProgress,
	handleProgressHover,
	startProgressDrag,
	toggleMute,
	handleVolumeHover,
	startVolumeDrag,
} = actions;
</script>

<!-- 进度条区域 -->
<div class="progress-section mb-4">
	<div
		class="progress-bar relative flex-1 h-2 bg-[var(--btn-regular-bg)] rounded-full cursor-pointer group touch-none"
		use:bindProgressBar
		on:click={setProgress}
		on:pointerenter={(e) => {
			showProgressTooltip.set(true);
			handleProgressHover(e);
		}}
		on:pointerleave={() => {
			if (!$isProgressDragging) showProgressTooltip.set(false);
		}}
		on:pointerdown={startProgressDrag}
		on:pointermove={handleProgressHover}
		role="slider"
		tabindex="0"
		aria-label={i18n(Key.musicPlayerProgress)}
		aria-valuemin={0}
		aria-valuemax={100}
		aria-valuenow={$duration > 0 ? ($currentTime / $duration) * 100 : 0}
	>
		<div
			class="h-full bg-[var(--primary)] rounded-full pointer-events-none transition-none"
			style="width: {$isProgressDragging ? $progressTooltipPercent : $duration > 0 ? ($currentTime / $duration) * 100 : 0}%"
		></div>

		{#if $showProgressTooltip}
			<div
				class="progress-tooltip absolute transition-none"
				style="left: {$progressTooltipPercent}%;"
			>
				<div class="tooltip-card">
					{formatTime($tooltipTime)}
				</div>
			</div>
		{/if}
	</div>
</div>

<div class="controls flex items-center justify-center gap-2 mb-4">
	<button
		class="w-10 h-10 rounded-lg"
		class:btn-regular={$isShuffled}
		class:btn-plain={!$isShuffled}
		on:click={toggleShuffle}
		disabled={$playlist.length <= 1}
		aria-label={i18n(Key.musicPlayerShuffle)}
	>
		<Icon icon="material-symbols:shuffle" class="text-lg" />
	</button>
	<button
		class="btn-plain w-10 h-10 rounded-lg"
		on:click={previousSong}
		disabled={$playlist.length <= 1}
		aria-label={i18n(Key.musicPlayerPrevious)}
	>
		<Icon icon="material-symbols:skip-previous" class="text-xl" />
	</button>
	<button
		class="btn-regular w-12 h-12 rounded-full"
		class:opacity-50={$isLoading}
		disabled={$isLoading}
		on:click={togglePlay}
		aria-label={$isPlaying ? i18n(Key.musicPlayerPause) : i18n(Key.musicPlayerPlay)}
	>
		{#if $isLoading}
			<Icon icon="material-symbols:progress-activity" class="text-xl" />
		{:else if $isPlaying}
			<Icon icon="material-symbols:pause" class="text-xl" />
		{:else}
			<Icon icon="material-symbols:play-arrow" class="text-xl" />
		{/if}
	</button>
	<button
		class="btn-plain w-10 h-10 rounded-lg"
		on:click={() => nextSong()}
		disabled={$playlist.length <= 1}
		aria-label={i18n(Key.musicPlayerNext)}
	>
		<Icon icon="material-symbols:skip-next" class="text-xl" />
	</button>
	<button
		class="w-10 h-10 rounded-lg"
		class:btn-regular={$isRepeating > 0 ||
			($isRepeating === 0 && musicPlayerConfig.autoplayContinuous)}
		class:btn-plain={$isRepeating === 0 && !musicPlayerConfig.autoplayContinuous}
		on:click={toggleRepeat}
		aria-label={$isRepeating === 1
			? i18n(Key.musicPlayerRepeatOne)
			: i18n(Key.musicPlayerRepeat)}
	>
		{#if $isRepeating === 1}
			<Icon icon="material-symbols:repeat-one" class="text-lg" />
		{:else if $isRepeating === 2}
			<Icon icon="material-symbols:repeat" class="text-lg" />
		{:else if musicPlayerConfig.autoplayContinuous}
			<Icon icon="material-symbols:repeat" class="text-lg" />
		{:else}
			<Icon icon="material-symbols:repeat" class="text-lg opacity-50" />
		{/if}
	</button>
</div>

<div class="bottom-controls flex items-center gap-2">
	<button class="btn-plain w-8 h-8 rounded-lg" on:click={toggleMute} aria-label={i18n(Key.musicPlayerVolume)}>
		{#if $isMuted || $volume === 0}
			<Icon icon="material-symbols:volume-off" class="text-lg" />
		{:else if $volume < 0.5}
			<Icon icon="material-symbols:volume-down" class="text-lg" />
		{:else}
			<Icon icon="material-symbols:volume-up" class="text-lg" />
		{/if}
	</button>

	<div
		class="relative flex-1 h-2 bg-[var(--btn-regular-bg)] rounded-full cursor-pointer touch-none group"
		use:bindVolumeBar
		on:pointerenter={(e) => {
			showVolumeTooltip.set(true);
			handleVolumeHover(e);
		}}
		on:pointerleave={() => {
			if (!$isVolumeDragging) showVolumeTooltip.set(false);
		}}
		on:pointerdown={startVolumeDrag}
		on:pointermove={handleVolumeHover}
		role="slider"
		tabindex="0"
		aria-label={i18n(Key.musicPlayerVolume)}
		aria-valuemin={0}
		aria-valuemax={100}
		aria-valuenow={$volume * 100}
	>
		<div
			class="h-full bg-[var(--primary)] rounded-full pointer-events-none transition-none"
			style="width: {$isVolumeDragging ? $volumeTooltipPercent : $volume * 100}%"
		></div>

		{#if $showVolumeTooltip}
			<div
				class="volume-tooltip absolute transition-none"
				style="left: {$volumeTooltipPercent}%;"
			>
				<div class="tooltip-card">
					{Math.round(
						($isVolumeDragging ? $volumeTooltipPercent / 100 : $volumeHoverValue) *
							100,
					)}%
				</div>
			</div>
		{/if}
	</div>

	<button
		class="btn-plain w-8 h-8 rounded-lg flex items-center justify-center"
		on:click={toggleExpanded}
		aria-label={i18n(Key.musicPlayerCollapse)}
	>
		<Icon icon="material-symbols:expand-more" class="text-lg" />
	</button>
</div>
