/**
 * 站点语言 / Locales.
 *
 * URL 策略：中英各占一个前缀（/zh/ 与 /en/），两边完全对称。
 *
 * 曾经把中文放在根路径、只给英文加 /en 前缀。那种「默认语言没有前缀」的
 * 特例会在每一处路径处理里冒出来（首页判断、canonical、hreflang、sitemap、
 * 语言切换器），之前几个 bug 全都出在这里。对称前缀下这些都退化成同一条
 * 规则，根路径只负责把访客送到他该去的语言。
 *
 * 前缀的字符串处理在 ./locale-paths.ts（纯函数，浏览器端也用同一份）。
 */
import { joinLocalePath, stripLocalePath } from "./locale-paths";

export const locales = ["zh", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "zh";

/** 语言选择器用的显示名（各语言用自己的写法） */
export const localeLabels: Record<Locale, string> = {
	zh: "中文",
	en: "English",
};

/** <html lang> 用的 BCP-47 值 */
export const localeHtmlLang: Record<Locale, string> = {
	zh: "zh-CN",
	en: "en",
};

/** hreflang 值（用于 <link rel="alternate" hreflang>） */
export const localeHreflang: Record<Locale, string> = {
	zh: "zh-CN",
	en: "en",
};

export function isLocale(value: string): value is Locale {
	return (locales as readonly string[]).includes(value);
}

/** 各语言的路由前缀，如 "zh" -> "/zh"。 */
const LOCALE_PREFIX: Record<Locale, string> = {
	zh: "zh",
	en: "en",
};

/** URL 前缀字符串：/zh 或 /en。 */
export function localePrefix(locale: Locale): string {
	return `/${LOCALE_PREFIX[locale]}`;
}

/** 全部语言的路径前缀表，供纯路径计算与客户端脚本使用。 */
export function localePrefixTable(): Record<string, string> {
	const table: Record<string, string> = {};
	for (const locale of locales) table[locale] = localePrefix(locale);
	return table;
}

/** 由 URL 路径推断语言；不带前缀的路径算默认语言。 */
export function getLocaleFromPath(pathname: string): Locale {
	for (const locale of locales) {
		const prefix = LOCALE_PREFIX[locale];
		if (pathname === `/${prefix}` || pathname.startsWith(`/${prefix}/`)) {
			return locale;
		}
	}
	return defaultLocale;
}

/**
 * 给根路径加上目标语言前缀。
 * localizePath("/posts/a/", "en") -> "/en/posts/a/"
 * localizePath("/posts/a/", "zh") -> "/zh/posts/a/"
 */
export function localizePath(path: string, locale: Locale): string {
	return joinLocalePath(path, localePrefix(locale));
}

/** 去掉语言前缀，得到与语言无关的路径。 */
export function stripLocalePrefix(pathname: string): string {
	return stripLocalePath(pathname, localePrefixTable());
}
