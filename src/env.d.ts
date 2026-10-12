/// <reference types="astro/client" />
/// <reference path="../.astro/types.d.ts" />

declare module "katex/dist/katex.min.css?url" {
	const href: string;
	export default href;
}

interface ImportMetaEnv {
	readonly UMAMI_API_KEY?: string;
	readonly PUBLIC_SITE_BUILD_ID?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

declare namespace App {
	interface Locals {
		/** 当前页面语言，由 src/middleware.ts 从 URL 前缀解析 */
		locale: import("./i18n/locales").Locale;
	}
}
