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

/** 日语片假名字符集（用于 TOC 序号徽章） */
export const JAPANESE_KATAKANA = [
	"ア",
	"イ",
	"ウ",
	"エ",
	"オ",
	"カ",
	"キ",
	"ク",
	"ケ",
	"コ",
	"サ",
	"シ",
	"ス",
	"セ",
	"ソ",
	"タ",
	"チ",
	"ツ",
	"テ",
	"ト",
	"ナ",
	"ニ",
	"ヌ",
	"ネ",
	"ノ",
	"ハ",
	"ヒ",
	"フ",
	"ヘ",
	"ホ",
	"マ",
	"ミ",
	"ム",
	"メ",
	"モ",
	"ヤ",
	"ユ",
	"ヨ",
	"ラ",
	"リ",
	"ル",
	"レ",
	"ロ",
	"ワ",
	"ヲ",
	"ン",
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

/** 是否为文章/日记等需要显示 TOC 的页面 */
export function isPostPagePath(pathname?: string): boolean {
	const path = pathname ?? getCurrentPath();
	return (
		path.includes("/posts/") ||
		path.includes("/diary") ||
		(typeof document !== "undefined" &&
			document.querySelector(MARKDOWN_SELECTOR) !== null)
	);
}

/** 是否应在当前路径初始化侧边栏 TOC（与 swup-lifecycle 共用） */
export function shouldInitTocForPath(pathname?: string): boolean {
	return isPostPagePath(pathname);
}

export { isHomePagePath };

/** 计算标题集合的最小层级 */
export function computeMinHeadingDepth(headings: TocHeading[]): number {
	if (headings.length === 0) return 1;
	return Math.min(...headings.map((h) => h.depth));
}

/** 从 DOM 收集带 id 的标题 */
export function collectHeadingsFromDocument(
	container?: Element | Document | null,
): TocHeading[] {
	let root: Element | Document = container ?? document;
	if (!container) {
		const path = getCurrentPath();
		if (path.includes("/diary")) {
			root =
				document.querySelector(".moments-timeline") ??
				document.querySelector("#swup-container") ??
				document;
		} else if (isPostPagePath(path)) {
			root =
				document.querySelector(MARKDOWN_SELECTOR) ??
				document.querySelector("#swup-container") ??
				document;
		}
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

/** 相对最小层级过滤（侧边栏 / 浮动 TOC） */
export function filterHeadingsByRelativeDepth(
	headings: TocHeading[],
	minDepth: number,
	maxLevel: number,
): TocHeading[] {
	return headings.filter((h) => h.depth < minDepth + maxLevel);
}

/** 绝对层级过滤（移动端 TOC） */
export function filterHeadingsByAbsoluteDepth(
	headings: TocHeading[],
	maxLevel: number,
): TocHeading[] {
	return headings.filter((h) => h.depth <= maxLevel);
}

/** 获取一级标题徽章文本 */
export function getPrimaryBadgeText(
	index: number,
	useJapaneseBadge: boolean,
): string {
	if (useJapaneseBadge && index < JAPANESE_KATAKANA.length) {
		return JAPANESE_KATAKANA[index];
	}
	return String(index + 1);
}

/** 生成移动端 TOC 条目 */
export function collectMobileTocItems(
	container?: Element | Document | null,
	config?: TocConfig,
): TocItem[] {
	const { maxLevel, useJapaneseBadge } = config ?? getTocConfig();
	const headings = filterHeadingsByAbsoluteDepth(
		collectHeadingsFromDocument(container),
		maxLevel,
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

/** 生成侧边栏 TOC HTML */
export function buildSidebarTocMarkup(
	headings: TocHeading[],
	config?: TocConfig,
): string {
	const { maxLevel, useJapaneseBadge } = config ?? getTocConfig();
	if (headings.length === 0) return "";

	const minDepth = computeMinHeadingDepth(headings);
	const filtered = filterHeadingsByRelativeDepth(
		headings,
		minDepth,
		maxLevel,
	);
	let heading1Count = 1;

	const tocHTML = filtered
		.map((heading) => {
			const depthClass =
				heading.depth === minDepth
					? ""
					: heading.depth === minDepth + 1
						? "ml-4"
						: "ml-8";

			let badgeContent = "";
			if (heading.depth === minDepth) {
				badgeContent = getPrimaryBadgeText(
					heading1Count - 1,
					useJapaneseBadge,
				);
				heading1Count++;
			} else if (heading.depth === minDepth + 1) {
				badgeContent =
					'<div class="transition w-2 h-2 rounded-[0.1875rem] bg-[var(--toc-badge-bg)]"></div>';
			} else {
				badgeContent =
					'<div class="transition w-1.5 h-1.5 rounded-sm bg-black/5 dark:bg-white/10"></div>';
			}

			const textClass =
				heading.depth <= minDepth + 1 ? "text-50" : "text-30";

			return `<a href="#${heading.slug}" class="px-2 flex gap-2 relative transition w-full min-h-9 rounded-xl hover:bg-[var(--toc-btn-hover)] active:bg-[var(--toc-btn-active)] py-2">
                    <div class="transition w-5 h-5 shrink-0 rounded-lg text-xs flex items-center justify-center font-bold ${depthClass} ${heading.depth === minDepth ? "bg-[var(--toc-badge-bg)] text-[var(--btn-content)]" : ""}">
                        ${badgeContent}
                    </div>
                    <div class="transition text-sm ${textClass}">${heading.text}</div>
                </a>`;
		})
		.join("");

	return (
		tocHTML +
		'<div id="active-indicator" style="opacity: 0" class="-z-10 absolute bg-[var(--toc-btn-hover)] left-0 right-0 rounded-xl transition-all group-hover:bg-transparent border-2 border-[var(--toc-btn-hover)] group-hover:border-[var(--toc-btn-active)] border-dashed"></div>'
	);
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

/** 是否为 TOC 或页内锚点链接（不应触发换页级 TOC 隐藏） */
export function isTocOrInPageAnchorLink(
	el: Element | null | undefined,
): boolean {
	if (!el || !(el instanceof HTMLAnchorElement)) return false;
	const href = el.getAttribute("href") || "";
	if (href.startsWith("#")) return true;
	return !!el.closest(
		"#toc, table-of-contents, #mobile-toc-panel, .floating-toc-wrapper, .floating-toc-panel",
	);
}

/** 平滑滚动到标题 */
export function scrollToTocHeading(
	id: string,
	offset = 80,
	duration = 650,
): boolean {
	const element = document.getElementById(id);
	if (!element) return false;

	(window as Window & { tocClickTimestamp?: number }).tocClickTimestamp =
		Date.now();
	window.__smoothScrollToElement?.(element, offset, duration);
	return true;
}

/** Swup 过渡期间是否应跳过 TOC 布局计算 */
export function shouldSkipTocLayoutWork(): boolean {
	const html = document.documentElement;
	if (
		html.classList.contains("is-changing") ||
		html.classList.contains("is-animating") ||
		html.classList.contains("swup-perf-active") ||
		html.classList.contains("is-home-pre-scrolling") ||
		html.classList.contains("is-visit-pre-scrolling")
	) {
		return true;
	}
	const tocWrapper = document.getElementById("toc-wrapper");
	return tocWrapper?.classList.contains("toc-not-ready") ?? false;
}

/** 在 Swup 空闲或过渡就绪后执行回调 */
export function scheduleTocIdleWork(fn: () => void): void {
	if (typeof window.__scheduleSwupIdleWork === "function") {
		window.__scheduleSwupIdleWork(fn);
		return;
	}
	const schedule =
		window.requestIdleCallback ||
		((cb: () => void) => window.setTimeout(cb, 100));
	schedule(fn, { timeout: 500 } as IdleRequestOptions);
}

/** 创建「过渡结束后更新」调度器 */
export function createTransitionDeferredUpdater(runUpdate: () => void) {
	let pending = false;
	let handler: (() => void) | null = null;

	const schedule = () => {
		if (pending) return;
		pending = true;

		const runPending = () => {
			pending = false;
			if (handler) {
				document.removeEventListener("swup:transition-ready", handler);
				handler = null;
			}
			runUpdate();
		};

		if (typeof window.__scheduleSwupIdleWork === "function") {
			window.__scheduleSwupIdleWork(runPending);
			return;
		}

		handler = runPending;
		document.addEventListener("swup:transition-ready", handler, {
			once: true,
		});
	};

	const cleanup = () => {
		if (handler) {
			document.removeEventListener("swup:transition-ready", handler);
			handler = null;
		}
		pending = false;
	};

	return { schedule, cleanup };
}

/** 判断数值是否在开区间内 */
export function isValueInRange(
	value: number,
	min: number,
	max: number,
): boolean {
	return min < value && value < max;
}

/** 缓存章节区块的文档坐标 */
export function cacheSectionOffsets(
	sections: HTMLElement[],
): Array<{ top: number; bottom: number } | null> {
	const scrollY = window.scrollY;
	return sections.map((section) => {
		if (!section) return null;
		const rect = section.getBoundingClientRect();
		return {
			top: rect.top + scrollY,
			bottom: rect.bottom + scrollY,
		};
	});
}

/** 查找与视口相交的所有章节索引 */
export function findVisibleSectionIndices(
	offsets: Array<{ top: number; bottom: number } | null>,
	viewportTop: number,
	viewportBottom: number,
): number[] {
	const indices: number[] = [];
	for (let i = 0; i < offsets.length; i++) {
		const offset = offsets[i];
		if (!offset) continue;
		if (offset.bottom > viewportTop && offset.top < viewportBottom) {
			indices.push(i);
		}
	}
	return indices;
}

/** 根据滚动位置回退查找当前可见章节索引 */
export function findActiveSectionIndex(
	offsets: Array<{ top: number; bottom: number } | null>,
	scrollTop: number,
	_viewportBottom?: number,
	activationOffset = 120,
): number | null {
	let activeIdx: number | null = null;
	const activationLine = scrollTop + activationOffset;

	for (let i = 0; i < offsets.length; i++) {
		const offset = offsets[i];
		if (!offset) continue;

		if (offset.top <= activationLine) {
			activeIdx = i;
			continue;
		}
		break;
	}

	return activeIdx;
}

/** 根据滚动位置查找当前激活标题索引（浮动 TOC） */
export function findActiveHeadingByScroll(
	headings: HTMLElement[],
	scrollY = window.scrollY,
	offsetTop = 150,
): number {
	let activeIndex = -1;
	for (let i = 0; i < headings.length; i++) {
		const heading = headings[i];
		if (
			heading.getBoundingClientRect().top + scrollY <
			scrollY + offsetTop
		) {
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

/** 无 Swup 时延迟初始化 TOC（动画结束或超时兜底） */
export function scheduleTocDomInit(initFn: () => void): void {
	const element =
		document.querySelector(".custom-md") ||
		document.querySelector(".prose") ||
		document.querySelector(".markdown-content");
	let initialized = false;

	const tryInit = () => {
		if (initialized) return;
		initialized = true;
		initFn();
	};

	const scheduleTryInit = () => {
		if (
			document.documentElement.classList.contains("is-changing") ||
			document.documentElement.classList.contains("is-animating")
		) {
			document.addEventListener("swup:transition-ready", tryInit, {
				once: true,
			});
			return;
		}
		tryInit();
	};

	if (element) {
		element.addEventListener("animationend", scheduleTryInit, {
			once: true,
		});
		window.setTimeout(scheduleTryInit, 300);
	} else {
		scheduleTryInit();
		window.setTimeout(scheduleTryInit, 300);
	}
}

/** 注册 Swup 换页后重新初始化 TOC（onSwupReady 模式） */
export function registerTocSwupReinit(
	initFn: () => void,
	options?: { delay?: number; hook?: string },
): () => void {
	if (typeof window === "undefined") return () => {};

	const delay = options?.delay ?? 200;
	const hook = options?.hook ?? "page:view";
	let popstateHandler: (() => void) | null = null;
	let swupHandler: (() => void) | null = null;
	let registered = false;

	const runInit = () => {
		window.setTimeout(initFn, delay);
	};

	const attachToSwup = (swup: {
		hooks: {
			on: (name: string, fn: () => void) => void;
			off: (name: string, fn?: () => void) => void;
		};
	}) => {
		if (registered) return;
		registered = true;
		swupHandler = runInit;
		swup.hooks.on(hook, swupHandler);
	};

	if (window.onSwupReady) {
		window.onSwupReady(attachToSwup);
	} else if (window.swup?.hooks) {
		attachToSwup(window.swup);
	} else {
		popstateHandler = runInit;
		window.addEventListener("popstate", popstateHandler);
		registered = true;
	}

	return () => {
		if (swupHandler && window.swup?.hooks) {
			window.swup.hooks.off(hook, swupHandler);
			swupHandler = null;
		}
		if (popstateHandler) {
			window.removeEventListener("popstate", popstateHandler);
			popstateHandler = null;
		}
		registered = false;
	};
}
