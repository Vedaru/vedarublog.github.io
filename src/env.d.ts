/// <reference types="astro/client" />
/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
	readonly UMAMI_API_KEY?: string;
	readonly PUBLIC_SITE_BUILD_ID?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
