/**
 * 站点语言 / Locales.
 *
 * URL 策略：中文（默认语言）保持在根路径，英文挂在 `/en/` 前缀下。
 * 这样既保住了现有中文 URL（不丢已有索引与链接），又让英文拥有独立
 * URL，可以被搜索引擎单独收录。切换语言时只替换前缀。
 */
export const locales = ["zh_CN", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "zh_CN";

/** 语言切换器与 <html lang> 用的显示名 / 标签 */
export const localeLabels: Record<Locale, string> = {
	zh_CN: "中文",
	en: "English",
};

export const localeHtmlLang: Record<Locale, string> = {
	zh_CN: "zh-CN",
	en: "en",
};

/** hreflang 值（用于 <link rel="alternate" hreflang>） */
export const localeHreflang: Record<Locale, string> = {
	zh_CN: "zh-CN",
	en: "en",
};

export function isLocale(value: string): value is Locale {
	return (locales as readonly string[]).includes(value);
}

/** 英文所在的路径前缀，例如 "en" -> /en/。默认语言无前缀。 */
const LOCALE_PREFIX: Partial<Record<Locale, string>> = {
	en: "en",
};

/** URL 前缀字符串：默认语言为 ""，其它语言为 "/en"。 */
export function localePrefix(locale: Locale): string {
	const prefix = LOCALE_PREFIX[locale];
	return prefix ? `/${prefix}` : "";
}

/** 由 URL 路径推断语言。 */
export function getLocaleFromPath(pathname: string): Locale {
	for (const locale of locales) {
		const prefix = LOCALE_PREFIX[locale];
		if (prefix && (pathname === `/${prefix}` || pathname.startsWith(`/${prefix}/`))) {
			return locale;
		}
	}
	return defaultLocale;
}

/**
 * 给根路径加上目标语言前缀。
 * localizePath("/posts/a/", "en") -> "/en/posts/a/"
 * localizePath("/posts/a/", "zh_CN") -> "/posts/a/"
 */
export function localizePath(path: string, locale: Locale): string {
	const clean = path.startsWith("/") ? path : `/${path}`;
	const prefix = LOCALE_PREFIX[locale];
	if (!prefix) return clean;
	if (clean === "/") return `/${prefix}/`;
	return `/${prefix}${clean}`;
}

/** 去掉语言前缀，得到默认语言下的路径。 */
export function stripLocalePrefix(pathname: string): string {
	for (const locale of locales) {
		const prefix = LOCALE_PREFIX[locale];
		if (!prefix) continue;
		if (pathname === `/${prefix}`) return "/";
		if (pathname.startsWith(`/${prefix}/`)) return pathname.slice(prefix.length + 1);
	}
	return pathname;
}

/** 当前页在另一种语言下的地址（语言切换器用）。 */
export function alternatePathFor(pathname: string, target: Locale): string {
	return localizePath(stripLocalePrefix(pathname), target);
}
