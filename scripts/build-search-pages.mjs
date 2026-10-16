/**
 * 站内搜索索引：把每个页面里 [data-search-body] 区域的正文抽出来，
 * 写成 dist/search/<locale>.json，供 src/lib/search.ts 在浏览器里建索引。
 *
 * 页面用 data-search-body 标记正文、data-search-ignore 标记其中不该被搜到的
 * 装饰内容（如标题旁的 # 锚点），没有标记的页面根本不进索引。
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "node-html-parser";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(root, "dist");
const outDir = path.join(distDir, "search");

/** 语言按 <html lang> 取前缀，其余页面（404 等）不进索引 */
const LOCALES = ["zh", "en"];

function* htmlFiles(dir) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			if (full !== outDir) yield* htmlFiles(full);
		} else if (entry.name === "index.html") {
			yield full;
		}
	}
}

const pages = new Map(LOCALES.map((locale) => [locale, []]));

for (const file of htmlFiles(distDir)) {
	const document = parse(readFileSync(file, "utf-8"));
	const lang = document.querySelector("html")?.getAttribute("lang")?.toLowerCase() ?? "";
	const locale = LOCALES.find((key) => lang.startsWith(key));
	if (!locale) continue;

	const regions = document.querySelectorAll("[data-search-body]");
	if (!regions.length) continue;
	for (const region of regions) {
		for (const ignored of region.querySelectorAll("[data-search-ignore]")) ignored.remove();
	}

	const title =
		document.querySelector('[data-search-meta="title"]')?.textContent.trim() ||
		document.querySelector("title")?.textContent.trim() ||
		"";
	const text = regions
		.map((region) => region.textContent.replace(/\s+/g, " ").trim())
		.filter(Boolean)
		.join(" ");

	const url = `/${path.relative(distDir, path.dirname(file)).split(path.sep).join("/")}/`;
	pages.get(locale).push({ u: url, t: title, x: text });
}

mkdirSync(outDir, { recursive: true });
for (const [locale, entries] of pages) {
	const out = path.join(outDir, `${locale}.json`);
	const json = JSON.stringify(entries);
	writeFileSync(out, json);
	console.log(
		`✓ search/${locale}.json: ${entries.length} pages, ${(json.length / 1024).toFixed(0)} KB`,
	);
}
