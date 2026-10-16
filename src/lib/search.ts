/**
 * 站内搜索。
 *
 * 构建期由 scripts/build-search-pages.mjs 把每个页面的正文抽成 search/<locale>.json，
 * 浏览器里按需拉取并用 MiniSearch 建索引（约 100 ms，只在第一次搜索时做一次）。
 *
 * 中文没有词边界，按词典切词再逐词匹配的做法会让大量正常关键词搜不到（例如
 * 「扣上」搜不到页面里的「被扣上」）。这里用 CJK 逐字 + 相邻二元组分词，
 * 字面上出现过的字符串都能命中；拉丁文按词处理并允许前缀匹配。
 */
import MiniSearch from "minisearch";
import type { SearchResult } from "@/global";

/** 索引里的一页：u=url，t=标题，x=正文 */
export interface SearchPage {
	u: string;
	t: string;
	x: string;
}

export type SearchLocale = "zh" | "en";

const CJK = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
const WORD = /[A-Za-z0-9_]/;

/** 摘要窗口的字符数与命中点前的留白 */
const EXCERPT_LENGTH = 140;
const EXCERPT_MARGIN = 30;

/** CJK 逐字加二元组，拉丁文按词（小写、去掉首尾标点） */
export function tokenize(text: string): string[] {
	const tokens: string[] = [];
	let i = 0;

	while (i < text.length) {
		const char = text[i];

		if (CJK.test(char)) {
			let end = i;
			while (end < text.length && CJK.test(text[end])) end++;
			const run = text.slice(i, end);
			for (let k = 0; k < run.length; k++) {
				tokens.push(run[k]);
				if (k + 1 < run.length) tokens.push(run.slice(k, k + 2));
			}
			i = end;
		} else if (WORD.test(char)) {
			let end = i;
			while (end < text.length && (WORD.test(text[end]) || "-'’.".includes(text[end]))) end++;
			const word = text
				.slice(i, end)
				.toLowerCase()
				.replace(/^[.'’\-]+|[.'’\-]+$/g, "");
			if (word) tokens.push(word);
			i = end;
		} else {
			i++;
		}
	}

	return tokens;
}

export function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 结果标题里标出关键词（摘要的高亮由 excerptFor 负责） */
export function highlightTitle(title: string, query: string): string {
	const terms = query
		.trim()
		.split(/\s+/)
		.filter(Boolean)
		.map(escapeRegExp);
	if (!terms.length) return escapeHtml(title);

	return escapeHtml(title).replace(
		new RegExp(`(${terms.join("|")})`, "gi"),
		"<mark>$1</mark>",
	);
}

/** 摘要：从第一个命中处截一段，命中词包 <mark>（先切段再转义，避免动到 HTML 实体） */
function excerptFor(text: string, tokens: string[]): string {
	const terms = [...new Set(tokens.filter((token) => token.length > 1))];
	if (!terms.length) return escapeHtml(text.slice(0, EXCERPT_LENGTH));

	const pattern = new RegExp(terms.map(escapeRegExp).join("|"), "gi");
	const firstHit = text.search(pattern);
	const start = Math.max(0, (firstHit < 0 ? 0 : firstHit) - EXCERPT_MARGIN);
	const window = text.slice(start, start + EXCERPT_LENGTH);

	let html = "";
	let cursor = 0;
	for (const match of window.matchAll(pattern)) {
		html += escapeHtml(window.slice(cursor, match.index));
		html += `<mark>${escapeHtml(match[0])}</mark>`;
		cursor = match.index + match[0].length;
	}
	html += escapeHtml(window.slice(cursor));

	return `${start > 0 ? "…" : ""}${html}${
		start + EXCERPT_LENGTH < text.length ? "…" : ""
	}`;
}

interface IndexedPages {
	locale: SearchLocale;
	pages: SearchPage[];
	index: MiniSearch<SearchPage>;
}

/** 当前页面对应的索引（同一时间只有一个语言在用） */
let indexed: IndexedPages | null = null;
const pending = new Map<SearchLocale, Promise<IndexedPages>>();

async function fetchIndexedPages(locale: SearchLocale): Promise<IndexedPages> {
	const response = await fetch(`/search/${locale}.json`);
	if (!response.ok) throw new Error(`search index: HTTP ${response.status}`);

	const pages = (await response.json()) as SearchPage[];
	const index = new MiniSearch<SearchPage>({
		fields: ["t", "x"],
		tokenize,
		searchOptions: { combineWith: "AND", prefix: true },
	});
	index.addAll(pages.map((page, id) => ({ ...page, id })));

	return { locale, pages, index };
}

/** 拉取并索引指定语言的页面。同一语言重复调用只生效一次，失败后可以重试。 */
export async function loadSearchIndex(locale: SearchLocale): Promise<void> {
	if (indexed?.locale === locale) return;

	let request = pending.get(locale);
	if (!request) {
		request = fetchIndexedPages(locale);
		pending.set(locale, request);
	}

	try {
		indexed = await request;
	} catch (error) {
		pending.delete(locale);
		throw error;
	}
}

export function search(query: string, limit = 8): SearchResult[] {
	const state = indexed;
	const tokens = tokenize(query);
	if (!state || !tokens.length) return [];

	const queryString = tokens.join(" ");
	const run = (combineWith: "AND" | "OR") =>
		state.index.search(queryString, { combineWith, prefix: true });

	// 先按「整串都命中」找，找不到再放宽成「任意词命中」，由 MiniSearch 按得分排序
	const hits = run("AND");
	const results = hits.length ? hits : run("OR");

	return results.slice(0, limit).map((hit) => {
		const page = state.pages[hit.id];
		return {
			url: page.u,
			meta: { title: page.t },
			excerpt: excerptFor(page.x, tokens),
		};
	});
}
