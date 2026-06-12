import sitemap from "@astrojs/sitemap";
import svelte, { vitePreprocess } from "@astrojs/svelte";
import tailwind from "@astrojs/tailwind";
import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import swup from "@swup/astro";
import { defineConfig } from "astro/config";
import expressiveCode from "astro-expressive-code";
import icon from "astro-icon";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeComponents from "rehype-components";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import remarkDirective from "remark-directive";
import remarkGithubAdmonitionsToDirectives from "remark-github-admonitions-to-directives";
import remarkMath from "remark-math";
import remarkSectionize from "remark-sectionize";
import { siteConfig } from "./src/config.ts";
import compress from "@playform/compress";
import { pluginCustomCopyButton } from "./src/plugins/expressive-code/custom-copy-button.js";
import { pluginLanguageBadge } from "./src/plugins/expressive-code/language-badge.ts";
import { AdmonitionComponent } from "./src/plugins/rehype-component-admonition.mjs";
import { GithubCardComponent } from "./src/plugins/rehype-component-github-card.mjs";
import { rehypeMermaid } from "./src/plugins/rehype-mermaid.mjs";
import { rehypeWrapTable } from "./src/plugins/rehype-wrap-table.mjs";
import { parseDirectiveNode } from "./src/plugins/remark-directive-rehype.js";
import { remarkMermaid } from "./src/plugins/remark-mermaid.js";
import { remarkContent } from "./src/plugins/remark-content.mjs";
import { rehypeImageWidth } from "./src/plugins/rehype-image-width.mjs";

const SITE_BUILD_ID =
	process.env.CF_PAGES_COMMIT_SHA ||
	process.env.GITHUB_SHA ||
	String(Date.now());

// https://astro.build/config
export default defineConfig({
	site: siteConfig.siteURL,
	base: "/",
	trailingSlash: "always",

	output: "static",

	build: {
		// auto：大 CSS 外链并可跨页缓存；always 会撑大 HTML，且破坏 fancybox/katex 动态 CSS
		inlineStylesheets: "auto",
	},

	integrations: [
		tailwind({
			nesting: true,
		}),
		swup({
			theme: false,
			animationClass: "transition-swup-",
			containers: ["main"],
			smoothScrolling: false,
			cache: true,
			// 仅悬停预加载，避免首屏拉取 archive 等页面的脚本链
			preload: { hover: true, visible: false },
			loadOnIdle: false,
			accessibility: true,
			// 各页 CSS head 一致；关闭 head 交换避免换页/切壁纸时外链样式短暂卸载导致线框 FOUC
			updateHead: false,
			updateBodyClass: false,
			globalInstance: true,
			// 滚动相关配置优化
			resolveUrl: (url) => url,
			animateHistoryBrowsing: false,
			skipPopStateHandling: (event) => {
				// 跳过锚点链接的处理，让浏览器原生处理
				return (
					event.state &&
					event.state.url &&
					event.state.url.includes("#")
				);
			},
		}),
		icon(),
		expressiveCode({
			themes: ["github-light", "github-dark"],
			plugins: [
				pluginCollapsibleSections(),
				pluginLineNumbers(),
				pluginLanguageBadge(),
				pluginCustomCopyButton(),
			],
			defaultProps: {
				wrap: true,
				overridesByLang: {
					shellsession: { showLineNumbers: false },
					bash: { frame: "code" },
					shell: { frame: "code" },
					sh: { frame: "code" },
					zsh: { frame: "code" },
				},
			},
			styleOverrides: {
				codeBackground: "var(--codeblock-bg)",
				borderRadius: "0.75rem",
				borderColor: "none",
				codeFontSize: "0.875rem",
				codeFontFamily:
					"'JetBrains Mono Variable', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
				codeLineHeight: "1.5rem",
				frames: {
					editorBackground: "var(--codeblock-bg)",
					terminalBackground: "var(--codeblock-bg)",
					terminalTitlebarBackground: "var(--codeblock-bg)",
					editorTabBarBackground: "var(--codeblock-bg)",
					editorActiveTabBackground: "none",
					editorActiveTabIndicatorBottomColor: "var(--primary)",
					editorActiveTabIndicatorTopColor: "none",
					editorTabBarBorderBottomColor: "var(--codeblock-bg)",
					terminalTitlebarBorderBottomColor: "none",
				},
				textMarkers: {
					delHue: 0,
					insHue: 180,
					markHue: 250,
				},
			},
			frames: {
				showCopyToClipboardButton: false,
			},
		}),
		svelte({
			preprocess: vitePreprocess(),
		}),
		sitemap(),
		compress({
			Image: false,
			SVG: false,
			Exclude: [
				(file) => /\.min\.(js|css)$/i.test(file.replace(/\\/g, "/")),
				(file) => /\/pio\//.test(file.replace(/\\/g, "/")),
			],
			HTML: {
				"html-minifier-terser": {
					removeAttributeQuotes: false,
					collapseWhitespace: false,
					removeComments: false,
					// 关闭属性/类名排序：会重排 SSR HTML 里 island 的 class 与属性顺序，
					// 导致 Svelte 5 水合时与客户端按源码顺序渲染的结果不一致（hydration_mismatch）。
					sortAttributes: false,
					sortClassName: false,
				},
			},
		}),
	],
	markdown: {
		remarkPlugins: [
			remarkMath,
			remarkContent,
			remarkGithubAdmonitionsToDirectives,
			remarkDirective,
			remarkSectionize,
			parseDirectiveNode,
			remarkMermaid,
		],
		rehypePlugins: [
			rehypeKatex,
			rehypeSlug,
			rehypeWrapTable,
			rehypeMermaid,
			rehypeImageWidth,
			[
				rehypeComponents,
				{
					components: {
						github: GithubCardComponent,
						note: (x, y) => AdmonitionComponent(x, y, "note"),
						tip: (x, y) => AdmonitionComponent(x, y, "tip"),
						important: (x, y) =>
							AdmonitionComponent(x, y, "important"),
						caution: (x, y) => AdmonitionComponent(x, y, "caution"),
						warning: (x, y) => AdmonitionComponent(x, y, "warning"),
					},
				},
			],
			[
				rehypeAutolinkHeadings,
				{
					behavior: "append",
					properties: {
						className: ["anchor"],
					},
					content: {
						type: "element",
						tagName: "span",
						properties: {
							className: ["anchor-icon"],
							"data-pagefind-ignore": true,
						},
						children: [{ type: "text", value: "#" }],
					},
				},
			],
		],
	},
	vite: {
		define: {
			"import.meta.env.PUBLIC_SITE_BUILD_ID": JSON.stringify(SITE_BUILD_ID),
		},
		build: {
			// 面向现代浏览器，减少不必要的 legacy polyfill
			target: "es2022",
			// 全站单 CSS：Swup updateHead 换页时不卸载侧栏/shell 仍依赖的样式，避免切页线框 FOUC
			cssCodeSplit: false,
			// 静态资源处理优化，防止小图片转 base64 导致 HTML 体积过大（可选，根据需要调整）
			assetsInlineLimit: 4096,
			// 减少 modulepreload 与 script 的 credentials mode 不一致警告
			modulePreload: { polyfill: false },

			rollupOptions: {
				onwarn(warning, warn) {
					if (
						warning.message.includes(
							"is dynamically imported by",
						) &&
						warning.message.includes(
							"but also statically imported by",
						)
					) {
						return;
					}
					warn(warning);
				},
			},
		},
	},
});
