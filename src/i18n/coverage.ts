/**
 * 双语覆盖范围：哪些路径只存在于一种语言。
 *
 * 语言切换器只做「换前缀」是不够的 —— 中文文章未必有英文版（反之亦然），
 * 换过去就是 404。这里在构建期把两边不对称的路径算出来（本站目前只有
 * 少数几条），交给切换器在点击时判断目标是否存在。
 *
 * 只输出「不对称」的部分，因此体积很小（对称的页面无需上线任何数据）。
 */
import { PAGE_SIZE } from "@constants";
import { getSortedPosts } from "@utils/content-utils";
import { getPostUrl } from "@utils/url-utils";
import { stripLocalePath, type LocaleCoverage } from "./locale-paths";
import { defaultLocale, localePrefixTable, locales, type Locale } from "./locales";

const pageModules = import.meta.glob("/src/pages/**/*.astro");

/** 静态页面（不含动态路由，它们两边对称或由内容决定） */
function staticPaths(): Map<Locale, Set<string>> {
	const byLocale = new Map<Locale, Set<string>>(
		locales.map((locale) => [locale, new Set<string>()]),
	);

	for (const key of Object.keys(pageModules)) {
		const segments = key
			.replace(/^\/src\/pages/, "")
			.replace(/\.astro$/, "")
			.split("/")
			.filter(Boolean);

		if (segments.some((s) => s.includes("["))) continue;
		if (segments[segments.length - 1] === "index") segments.pop();

		const path = segments.length ? `/${segments.join("/")}/` : "/";
		// 404 是站点级页面，不分语言
		if (path === "/404/") continue;

		const owner =
			locales.find((locale) => localePrefixTable()[locale] === `/${segments[0]}`) ??
			defaultLocale;
		byLocale
			.get(owner)
			?.add(stripLocalePath(path, localePrefixTable()));
	}

	return byLocale;
}

/** 各语言下真实存在的地址集合（静态页面 + 文章 + 分页） */
async function pathSets(): Promise<Map<Locale, Set<string>>> {
	const prefixes = localePrefixTable();
	const byLocale = staticPaths();

	await Promise.all(
		locales.map(async (locale) => {
			const set = byLocale.get(locale);
			if (!set) return;

			const posts = await getSortedPosts(locale);
			for (const post of posts) {
				set.add(stripLocalePath(getPostUrl(post), prefixes));
			}

			const pages = Math.ceil(posts.length / PAGE_SIZE);
			for (let page = 2; page <= pages; page++) set.add(`/${page}/`);
		}),
	);

	return byLocale;
}

let cached: Promise<LocaleCoverage> | null = null;

/**
 * 语言切换器需要的数据：
 * - prefixes：各语言的路径前缀；
 * - oneSided：只存在于一种语言的路径 → 拥有它的语言。
 */
export function getLocaleCoverage(): Promise<LocaleCoverage> {
	if (!cached) {
		cached = (async () => {
			const sets = await pathSets();
			const oneSided: Record<string, string> = {};
			const allPaths = new Set<string>();
			for (const set of sets.values()) {
				for (const path of set) allPaths.add(path);
			}
			for (const path of allPaths) {
				const owners = locales.filter((locale) => sets.get(locale)?.has(path));
				if (owners.length === 1) oneSided[path] = owners[0];
			}
			return { prefixes: localePrefixTable(), oneSided };
		})();
	}
	return cached;
}
