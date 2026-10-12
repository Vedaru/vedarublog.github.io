/**
 * 语言模式（同一 URL 下的语言切换）。
 *
 * 用户选择英语后只写 cookie 并重载：URL 不变，由服务端按 cookie 返回对应
 * 语言的内容（Cloudflare Pages Function，见仓库根目录 functions/）。
 *
 * 这里只在服务端没有按 cookie 换语言时兜底：纯静态托管（GitHub Pages /
 * Netlify）上跑不出这个效果，于是退回带 /en 前缀的地址，至少保证英语可看。
 * 判据是文档自身声明的语言与 URL 推出的语言是否一致 —— Function 生效时
 * 英文文档挂在中文 URL 上，两者必然不同。
 */
import { resolveAlternatePath } from "../i18n/locale-paths";
import { getLocaleFromPath, localeHtmlLang } from "../i18n/locales";
import { readRememberedLocale } from "./locale-preference";

function run() {
	const data = document.getElementById("locale-coverage");
	if (!data) return;

	let coverage;
	try {
		coverage = JSON.parse(data.textContent || "{}");
	} catch {
		return;
	}
	if (!coverage.prefixes) return;

	const urlLocale = getLocaleFromPath(location.pathname);
	const mode = readRememberedLocale();

	if (!mode || mode === urlLocale) return;
	// 服务端已经按 cookie 返回目标语言：什么都不用做
	if (document.documentElement.lang === localeHtmlLang[mode as "zh_CN" | "en"]) {
		return;
	}

	const target = resolveAlternatePath(location.pathname, mode, coverage);
	if (target !== location.pathname) location.replace(target);
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", run);
} else {
	run();
}
