/**
 * 语言切换时的目标地址解析。
 *
 * 单纯的「换前缀」在双语站里会有一类 404：中文文章未必有英文版
 * （`.en.md`），在中文文章页切到英文就会得到 /en/posts/xxx/ 这个不存在的
 * 页面。这里在构建期确认目标地址确实存在，不存在就退回目标语言首页，
 * 保证语言选择器永远不会把人送进 404。
 *
 * 判断分三层（全部在构建期完成，无运行时开销）：
 * 1. 静态页面：由 src/pages 的文件结构推导出的路由表；
 * 2. 动态路由：编译成正则匹配（分页 /en/2/、相册 /albums/x/ 等）；
 * 3. 文章：直接查内容集合，与 getPostUrl 生成的真实地址比对。
 */
import {
	getLocaleFromPath,
	localizePath,
	localePrefix,
	stripLocalePrefix,
	type Locale,
} from "@i18n/locales";
import { PAGE_SIZE } from "@constants";
import { getSortedPosts } from "@utils/content-utils";
import { getPostUrl } from "@utils/url-utils";

const pageModules = import.meta.glob("/src/pages/**/*.astro");

interface RouteEntry {
	/** 规范化路径，动态段原样保留，例如 "/en/posts/[...slug]/" */
	path: string;
	/** 动态路由编译出的匹配正则；静态页面为 null */
	pattern: RegExp | null;
}

/** [id] 匹配一段；[...slug] 匹配多段。 */
function segmentToPattern(segment: string): string {
	if (/^\[\.\.\..+\]$/.test(segment)) return ".+";
	if (/^\[.+\]$/.test(segment)) return "[^/]+";
	return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toRoute(key: string): RouteEntry {
	let segments = key
		.replace(/^\/src\/pages/, "")
		.replace(/\.astro$/, "")
		.split("/")
		.filter(Boolean);

	// index.astro 与同级目录同址（相册的 [id]/index.astro 也算）
	if (segments[segments.length - 1] === "index") {
		segments = segments.slice(0, -1);
	}

	const base = segments.join("/");
	const dynamic = segments.some((s) => s.includes("["));

	return {
		path: base ? `/${base}/` : "/",
		pattern: dynamic
			? new RegExp(`^/${segments.map(segmentToPattern).join("/")}/$`)
			: null,
	};
}

const routes: RouteEntry[] = Object.keys(pageModules)
	.map(toRoute)
	// 404 是站点级页面（构建为 /404.html，不分语言），语言选择器对它没有
	// 意义，当作不存在，让切换退回各自语言的首页。
	.filter((r) => r.path !== "/404/");

const staticPaths = new Set(routes.filter((r) => !r.pattern).map((r) => r.path));

const dynamicPatterns = routes
	.filter((r) => {
		if (!r.pattern) return false;
		// 分页路由（[...page]）由内容数量精确算出，见 pageUrls
		if (r.path.includes("[...page]")) return false;
		// 文章路由：只对已翻译的文章成立，交给内容集合判断
		if (r.path.includes("/posts/")) return false;
		// 根目录 catch-all（[permalink].astro）几乎匹配任意单段地址，无法在
		// 构建期确认，宁可不用
		if (/^\/\[/.test(r.path)) return false;
		return true;
	})
	.map((r) => r.pattern as RegExp);

/** 构建期收集的「各语言下的真实地址」，Promise 缓存避免重复扫描。 */
const postUrlsCache = new Map<Locale, Promise<Set<string>>>();
const pageUrlsCache = new Map<Locale, Promise<Set<string>>>();

function normalize(path: string): string {
	const clean = path.split("?")[0].split("#")[0];
	return clean.endsWith("/") ? clean : `${clean}/`;
}

function postUrls(locale: Locale): Promise<Set<string>> {
	let cached = postUrlsCache.get(locale);
	if (!cached) {
		cached = getSortedPosts(locale).then(
			(posts) => new Set(posts.map((p) => normalize(getPostUrl(p)))),
		);
		postUrlsCache.set(locale, cached);
	}
	return cached;
}

/** 分页地址（第 1 页即语言首页，这里只列 /2/ 之后的）。 */
function pageUrls(locale: Locale): Promise<Set<string>> {
	let cached = pageUrlsCache.get(locale);
	if (!cached) {
		cached = getSortedPosts(locale).then((posts) => {
			const total = Math.ceil(posts.length / PAGE_SIZE);
			const prefix = localePrefix(locale);
			const urls = new Set<string>();
			for (let page = 2; page <= total; page++) {
				urls.add(`${prefix}/${page}/`);
			}
			return urls;
		});
		pageUrlsCache.set(locale, cached);
	}
	return cached;
}

/** 该地址是否真的会被构建出来。 */
export async function routeExists(pathname: string): Promise<boolean> {
	const target = normalize(pathname);
	const locale = getLocaleFromPath(target);

	if (stripLocalePrefix(target).startsWith("/posts/")) {
		return (await postUrls(locale)).has(target);
	}

	if (staticPaths.has(target)) {
		return true;
	}

	if ((await pageUrls(locale)).has(target)) {
		return true;
	}

	return dynamicPatterns.some((pattern) => pattern.test(target));
}

/**
 * 解析切换到 `target` 语言后应去的地址。
 * 目标页面不存在时退回目标语言首页。
 */
export async function resolveAlternatePath(
	pathname: string,
	target: Locale,
): Promise<string> {
	const candidate = localizePath(stripLocalePrefix(pathname), target);
	return (await routeExists(candidate)) ? candidate : localizePath("/", target);
}
