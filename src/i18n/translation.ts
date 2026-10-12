import { siteConfig } from "../config";
import type I18nKey from "./i18nKey";
import { en } from "./languages/en";
import { ja } from "./languages/ja";
import { zh_CN } from "./languages/zh_CN";
import { zh_TW } from "./languages/zh_TW";
import { defaultLocale, type Locale } from "./locales";

export type Translation = {
	[K in I18nKey]: string;
};

const defaultTranslation = en;

const map: { [key: string]: Translation } = {
	en: en,
	en_us: en,
	en_gb: en,
	en_au: en,
	zh: zh_CN,
	zh_cn: zh_CN,
	zh_tw: zh_TW,
	ja: ja,
	ja_jp: ja,
};

function getTranslation(lang: string): Translation {
	// 兼容 Astro i18n 的 BCP-47 写法（zh-CN / en）与站点内部写法（zh / zh_TW）。
	const key = lang.toLowerCase().replace(/-/g, "_");
	return map[key] || map[lang.toLowerCase()] || defaultTranslation;
}

/**
 * 把任意语言标识归一化为站点支持的 Locale。
 * 支持 "en" / "en-US" / "zh-CN" / "zh" 等。
 */
export function normalizeLocale(lang?: string | null): Locale {
	if (!lang) return defaultLocale;
	const key = lang.toLowerCase().replace(/-/g, "_");
	if (key.startsWith("zh")) {
		return key.includes("tw") || key.includes("hk") ? defaultLocale : "zh";
	}
	if (key.startsWith("en")) return "en";
	return defaultLocale;
}

/**
 * 取翻译文案。
 *
 * @param key    文案键
 * @param locale 目标语言。省略时回退到 siteConfig.lang（保持旧行为），
 *               双语页面应显式传入（如 `Astro.currentLocale`）。
 */
export function i18n(key: I18nKey, locale?: string | null): string {
	const lang = locale || siteConfig.lang || defaultLocale;
	return getTranslation(lang)[key];
}

/**
 * 数据文件里的双语字段（timeline、projects、config 等）。
 *
 * 这些不是 UI 文案，没有 i18n key，直接在数据里写中英两份，渲染时按语言挑。
 * 英文缺失时回退中文，避免漏译导致整块内容消失。
 */
export function localizedText(
	locale: string | null | undefined,
	zh: string,
	en?: string,
): string {
	return normalizeLocale(locale) === "en" && en ? en : zh;
}
