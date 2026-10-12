/**
 * 语言偏好的记忆（cookie）。
 *
 * URL 决定当前页面语言，cookie 只用来记住「上次主动选了哪种语言」，
 * 让回访者落到语言首页时直接被带到自己那一边。参考 VitePress 的
 * 多语言文档：默认语言在根路径、其它语言带前缀，偏好持久化在 cookie 里
 * （他们把这个 cookie 交给 CDN 做跳转，我们这里只跳语言首页）。
 *
 * 两条刻意的边界：
 * - 只在语言首页（"/" 与 "/en/"）生效，不会把从搜索结果点进来读某篇文章
 *   的读者拽到别处；
 * - 只在有 cookie 时生效，爬虫没有 cookie，因此不会影响收录。
 */

export const LOCALE_COOKIE = "vedaru_lang";

const ONE_YEAR = 60 * 60 * 24 * 365;

/** 记住用户主动选择的语言。 */
export function rememberLocale(locale: string): void {
	if (typeof document === "undefined") return;
	document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(locale)}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
}
