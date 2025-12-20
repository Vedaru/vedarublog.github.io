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
