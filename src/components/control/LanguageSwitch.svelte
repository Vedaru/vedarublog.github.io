<script lang="ts">
	import "@/lib/iconify-offline";
	import Icon from "@iconify/svelte";
	import { panelManager } from "../../utils/panel-manager.js";
	import { onMount } from "svelte";

	/**
	 * 语言选择器（导航栏控件）。
	 *
	 * 与 WallpaperSwitch / DisplaySettings 等保持一致：一个图标按钮 + 一个
	 * float-panel 下拉面板。之前这里是一个直接跳转的普通链接按钮，与导航栏
	 * 其它「选择器」的交互方式不一致。
	 *
	 * 选项由 .astro 侧计算好传入（需要 Astro.url 才能推出各语言的同页地址）。
	 *
	 * 选项链接带 data-no-swup，切换语言走整页加载：swup 只替换 <main>
	 * （astro.config 里 containers: ["main"]），若走客户端换页，导航栏、
	 * 侧栏和 <html lang> 都还停在旧语言，看起来就像“语言根本没切”。
	 */
	interface LanguageOption {
		code: string;
		label: string;
		href: string;
		active: boolean;
	}

	let { locale = "", options = [] }: {
		locale?: string;
		options: LanguageOption[];
	} = $props();

	let isPanelOpen = $state(false);

	onMount(() => {
		// 打开时同步一次状态（例如换页后组件重建）
		const panel = document.getElementById("language-panel");
		isPanelOpen = panel ? !panel.classList.contains("float-panel-closed") : false;
	});

	async function togglePanel() {
		await panelManager.closeAllPanelsExcept("language-panel");
		await panelManager.togglePanel("language-panel");
		const panel = document.getElementById("language-panel");
		isPanelOpen = panel
			? !panel.classList.contains("float-panel-closed")
			: false;
	}

	async function closePanel() {
		await panelManager.closePanel("language-panel");
		isPanelOpen = false;
	}
</script>

<div class="relative z-50">
	<button
		aria-label="Language"
		aria-haspopup="menu"
		aria-expanded={isPanelOpen}
		aria-controls="language-panel"
		class="relative btn-plain scale-animation rounded-lg h-11 w-11 active:scale-90 theme-switch-btn"
		id="language-switch"
		data-language-switcher
		data-current-locale={locale}
		onclick={togglePanel}
	>
		<Icon icon="material-symbols:translate" class="text-[1.25rem]"></Icon>
	</button>

	<div
		id="language-panel"
		role="menu"
		class="absolute transition float-panel-closed top-11 -right-2 pt-5"
	>
		<div class="card-base float-panel p-2">
			{#each options as option (option.code)}
				<a
					role="menuitem"
					href={option.href}
					hreflang={option.code}
					lang={option.code}
					data-no-swup
					class:list={[
						"flex transition whitespace-nowrap items-center !justify-start w-full btn-plain rounded-lg h-9 px-3 font-medium active:scale-95 theme-switch-btn mb-0.5 last:mb-0",
						{ "scale-animation": !option.active },
					]}
					data-active={option.active}
					aria-current={option.active ? "true" : undefined}
					onclick={closePanel}
				>
					<Icon
						icon={option.active
							? "material-symbols:check"
							: "material-symbols:translate"}
						class="text-[1.25rem] mr-3"
					></Icon>
					{option.label}
				</a>
			{/each}
		</div>
	</div>
</div>
