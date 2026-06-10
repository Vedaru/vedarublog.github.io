<script lang="ts">
import "@/lib/iconify-offline";
import Icon from "@iconify/svelte";
import { slide } from "svelte/transition";
import Key from "@/i18n/i18nKey";
import { i18n } from "@/i18n/translation";
import type { AudioPlayer } from "@/lib/audio/useAudioPlayer";

export let player: AudioPlayer;

const { stores, actions } = player;
const { playlist, currentIndex, isPlaying } = stores;
const { togglePlaylist, playSong, getAssetPath } = actions;
</script>

<div
	class="playlist-panel float-panel fixed bottom-20 right-4 w-80 max-h-96 overflow-hidden z-50"
	transition:slide={{ duration: 300, axis: "y" }}
>
	<div
		class="playlist-header flex items-center justify-between p-4 border-b border-[var(--line-divider)]"
	>
		<h3 class="text-lg font-semibold text-90">{i18n(Key.musicPlayerPlaylist)}</h3>
		<button class="btn-plain w-8 h-8 rounded-lg" on:click={togglePlaylist}>
			<Icon icon="material-symbols:close" class="text-lg" />
		</button>
	</div>
	<div class="playlist-content overflow-y-auto max-h-80 pb-2">
		{#each $playlist as song, index}
			<div
				class="playlist-item flex items-center gap-3 p-3 hover:bg-[var(--btn-plain-bg-hover)] cursor-pointer transition-colors"
				class:bg-[var(--btn-plain-bg)]={index === $currentIndex}
				class:text-[var(--primary)]={index === $currentIndex}
				on:click={() => playSong(index)}
				role="button"
				tabindex="0"
			>
				<div class="w-6 h-6 flex items-center justify-center">
					{#if index === $currentIndex && $isPlaying}
						<Icon
							icon="material-symbols:graphic-eq"
							class="text-[var(--primary)] animate-pulse"
						/>
					{:else if index === $currentIndex}
						<Icon icon="material-symbols:pause" class="text-[var(--primary)]" />
					{:else}
						<span class="text-sm text-[var(--content-meta)]">{index + 1}</span>
					{/if}
				</div>
				<div
					class="w-10 h-10 rounded-lg overflow-hidden bg-[var(--btn-regular-bg)] flex-shrink-0"
				>
					<img
						src={getAssetPath(song.cover)}
						alt={song.title}
						loading="lazy"
						class="w-full h-full object-cover"
					/>
				</div>
				<div class="flex-1 min-w-0">
					<div
						class="font-medium truncate"
						class:text-[var(--primary)]={index === $currentIndex}
						class:text-90={index !== $currentIndex}
					>
						{song.title}
					</div>
					<div
						class="text-sm text-[var(--content-meta)] truncate"
						class:text-[var(--primary)]={index === $currentIndex}
					>
						{song.artist}
					</div>
				</div>
			</div>
		{/each}
	</div>
</div>
