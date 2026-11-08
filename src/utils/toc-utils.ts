import { getCurrentPath, isHomePagePath } from "./route-utils";

/** 页面标题节点信息 */
export interface TocHeading {
	depth: number;
	slug: string;
	text: string;
	element?: HTMLElement;
}

/** 移动端 TOC 条目 */
export interface TocItem {
	id: string;
	text: string;
	level: number;
	badge?: string;
}

/** TOC 配置（来自 siteConfig） */
export interface TocConfig {
	maxLevel: number;
	useJapaneseBadge: boolean;
}

/** 首页文章列表条目 */
export interface PostListItem {
	title: string;
	url: string;
	category?: string;
	pinned?: boolean;
}

const KATAKANA = [
	"ア", "イ", "ウ", "エ", "オ", "カ", "キ", "ク", "ケ", "コ",
	"サ", "シ", "ス", "セ", "ソ", "タ", "チ", "ツ", "テ", "ト",
	"ナ", "ニ", "ヌ", "ネ", "ノ", "ハ", "ヒ", "フ", "ヘ", "ホ",
	"マ", "ミ", "ム", "メ", "モ", "ヤ", "ユ", "ヨ", "ラ", "リ",
	"ル", "レ", "ロ", "ワ", "ヲ", "ン",
] as const;

const HEADING_SELECTOR = "h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]";
const MARKDOWN_SELECTOR = ".custom-md, .markdown-content";

/** 读取运行时 TOC 配置 */
export function getTocConfig(): TocConfig {
	const siteConfig = (
		window as Window & { siteConfig?: { toc?: Partial<TocConfig> } }
	).siteConfig;
	return {
		maxLevel: siteConfig?.toc?.maxLevel ?? siteConfig?.toc?.depth ?? 3,
		useJapaneseBadge: siteConfig?.toc?.useJapaneseBadge ?? false,
	};
}

/** 清理标题文本末尾的 Markdown 井号 */
export function cleanHeadingText(text: string): string {
	return text.replace(/#+\s*$/, "");
}

/** 是否为文章等需要显示 TOC 的页面 */
export function isPostPagePath(pathname?: string): boolean {
	const path = pathname ?? getCurrentPath();
	return (
		path.includes("/posts/") ||
		(typeof document !== "undefined" &&
			document.querySelector(MARKDOWN_SELECTOR) !== null)
	);
}

export { isHomePagePath };

/** 从 DOM 收集带 id 的标题 */
export function collectHeadingsFromDocument(
	container?: Element | Document | null,
): TocHeading[] {
	let root: Element | Document = container ?? document;
	if (!container && isPostPagePath()) {
		root =
			document.querySelector(MARKDOWN_SELECTOR) ??
			document.querySelector("#swup-container") ??
			document;
	}
	const nodes = root.querySelectorAll(HEADING_SELECTOR);
	const headings: TocHeading[] = [];

	nodes.forEach((node) => {
		if (!(node instanceof HTMLElement) || !node.id) return;
		headings.push({
			depth: Number.parseInt(node.tagName.substring(1), 10),
			slug: node.id,
			text: cleanHeadingText(node.textContent || ""),
			element: node,
		});
	});

	return headings;
}

/** 获取一级标题徽章文本 */
export function getPrimaryBadgeText(
	index: number,
	useJapaneseBadge: boolean,
): string {
	if (useJapaneseBadge && index < KATAKANA.length) {
		return KATAKANA[index];
	}
	return String(index + 1);
}

/** 生成移动端 TOC 条目 */
export function collectMobileTocItems(
	container?: Element | Document | null,
	config?: TocConfig,
): TocItem[] {
	const { maxLevel, useJapaneseBadge } = config ?? getTocConfig();
	const headings = collectHeadingsFromDocument(container).filter(
		(heading) => heading.depth <= maxLevel,
	);
	const items: TocItem[] = [];
	let h1Count = 0;

	headings.forEach((heading) => {
		let badge: string | undefined;
		if (heading.depth === 1) {
			badge = getPrimaryBadgeText(h1Count, useJapaneseBadge);
			h1Count++;
		}
		items.push({
			id: heading.slug,
			text: heading.text,
			level: heading.depth,
			badge,
		});
	});

	return items;
}

/** 浮动 TOC 生成结果 */
export interface FloatingTocBuildResult {
	html: string;
	headings: HTMLElement[];
}

/** 生成浮动 TOC HTML */
export function buildFloatingTocMarkup(
	container: Element,
	config?: TocConfig,
): FloatingTocBuildResult {
	const { maxLevel, useJapaneseBadge } = config ?? getTocConfig();
	const allHeadings = Array.from(
		container.querySelectorAll(HEADING_SELECTOR),
	) as HTMLElement[];

	if (allHeadings.length === 0) {
		return { html: "", headings: [] };
	}

	let minLevel = 6;
	allHeadings.forEach((h) => {
		const level = Number.parseInt(h.tagName[1], 10);
		if (level < minLevel) minLevel = level;
	});

	let html = "";
	let h1Count = 0;
	const headings: HTMLElement[] = [];

	allHeadings.forEach((heading) => {
		const level = Number.parseInt(heading.tagName[1], 10);
		if (level >= minLevel + maxLevel) return;

		headings.push(heading);
		const indent = (level - minLevel) * 1;
		let badge = "";

		if (level === minLevel) {
			h1Count++;
			const badgeText = getPrimaryBadgeText(
				h1Count - 1,
				useJapaneseBadge,
			);
			badge = `<span class="floating-toc-badge">${badgeText}</span>`;
		} else if (level === minLevel + 1) {
			badge = '<span class="floating-toc-dot"></span>';
		} else {
			badge = '<span class="floating-toc-dot-small"></span>';
		}

		const text = cleanHeadingText(heading.textContent || "");
		html += `<a href="#${heading.id}" class="floating-toc-item" style="padding-left: ${0.5 + indent}rem" data-level="${level - minLevel}">${badge}<span class="floating-toc-text">${text}</span></a>`;
	});

	return { html, headings };
}

/** 收集首页文章卡片列表 */
export function collectHomePostListItems(): PostListItem[] {
	const items: PostListItem[] = [];
	document.querySelectorAll(".card-base").forEach((card) => {
		const titleLink = card.querySelector(
			'a[href*="/posts/"].transition.group',
		);
		const categoryLink = card.querySelector(
			'a[href*="/categories/"].link-lg',
		);
		const pinnedIcon = titleLink?.querySelector('svg[data-icon="mdi:pin"]');

		if (!titleLink) return;

		const href = titleLink.getAttribute("href");
		const title = titleLink.textContent?.replace(/\s+/g, " ").trim() || "";
		const category = categoryLink?.textContent?.trim() || "";

		if (href && title) {
			items.push({
				title,
				url: href,
				category: category || undefined,
				pinned: !!pinnedIcon,
			});
		}
	});
	return items;
}

/** 平滑滚动到标题（原生合成器滚动，避免 JS 驱动的 forced reflow） */
export function scrollToTocHeading(id: string): boolean {
	const element = document.getElementById(id);
	if (!element) return false;
	element.scrollIntoView({ block: "start", behavior: "smooth" });
	return true;
}

/** 缓存标题元素的文档级 top 坐标（避免每帧 getBoundingClientRect） */
export function cacheHeadingTopOffsets(headings: HTMLElement[]): number[] {
	const sy = window.scrollY;
	return headings.map((h) => h.getBoundingClientRect().top + sy);
}

/** 根据缓存 offset 查找当前激活标题索引（浮动 TOC，零 layout 查询） */
export function findActiveHeadingByScrollCached(
	offsets: number[],
	scrollY: number,
	offsetTop = 150,
): number {
	let activeIndex = -1;
	const threshold = scrollY + offsetTop;
	for (let i = 0; i < offsets.length; i++) {
		if (offsets[i] < threshold) {
			activeIndex = i;
		} else {
			break;
		}
	}
	return activeIndex;
}

export interface ScrollSpyObserverOptions {
	rootMargin?: string;
	threshold?: number | number[];
	onIntersect: (activeId: string) => void;
	container?: Element | Document;
}

/** 创建标题 IntersectionObserver 滚动监听 */
export function createHeadingScrollSpy(
	options: ScrollSpyObserverOptions,
): IntersectionObserver {
	const {
		rootMargin = "-80px 0px -80% 0px",
		threshold = 0,
		onIntersect,
		container,
	} = options;

	const observer = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting && entry.target.id) {
					onIntersect(entry.target.id);
				}
			});
		},
		{ rootMargin, threshold },
	);

	const root = container ?? document;
	root.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((heading) => {
		if (heading.id) observer.observe(heading);
	});

	return observer;
}
