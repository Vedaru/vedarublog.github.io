// 番剧图片预加载管理器
// 使用 Intersection Observer 预加载即将进入视口的图片

class AnimeImagePreloader {
	private observer: IntersectionObserver;
	private preloadedImages: Set<string> = new Set();
	private preloadDistance = 200; // 预加载距离（像素）

	constructor() {
		this.observer = new IntersectionObserver(
			this.handleIntersection.bind(this),
			{
				rootMargin: `${this.preloadDistance}px 0px`,
				threshold: 0.1
			}
		);
	}

	// 观察番剧卡片
	observe(card: Element) {
		this.observer.observe(card);
	}

	// 停止观察
	unobserve(card: Element) {
		this.observer.unobserve(card);
	}

	// 处理交叉观察事件
	private handleIntersection(entries: IntersectionObserverEntry[]) {
		entries.forEach(entry => {
			const card = entry.target as HTMLElement;

			if (entry.isIntersecting) {
				// 图片进入视口，标记为预加载
				this.preloadImage(card);
			}
		});
	}

	// 预加载图片
	private preloadImage(card: HTMLElement) {
		// 优化逻辑：仅当图片使用 data-src 时才在接近视口时设置真实 src
		const img = card.querySelector('img[data-src]') as HTMLImageElement | null;
		if (!img) return;

		const src = img.dataset.src;
		if (!src) return;
		if (this.preloadedImages.has(src)) return;

		// 标记为已预加载，避免重复触发
		this.preloadedImages.add(src);

		// 提高加载优先级并设置真实源
		try {
			img.loading = 'eager';
			img.setAttribute('fetchpriority', 'high');
		} catch (e) {
			// 某些环境可能不支持直接设置属性，忽略错误
		}

		img.src = src;

		// 尝试使用 decode() 平滑渲染（不可用时忽略）
		if (typeof img.decode === 'function') {
			img.decode().catch(() => {});
		}

		// 添加预加载标记
		card.setAttribute('data-preload', 'true');
	}

	// 销毁观察器
	destroy() {
		this.observer.disconnect();
		this.preloadedImages.clear();
	}
}

// 全局预加载管理器实例
let globalPreloader: AnimeImagePreloader | null = null;

// 初始化预加载器
export function initAnimeImagePreloader() {
	if (globalPreloader) return globalPreloader;

	globalPreloader = new AnimeImagePreloader();
	return globalPreloader;
}

// 获取预加载器实例
export function getAnimeImagePreloader() {
	return globalPreloader;
}

// 销毁预加载器
export function destroyAnimeImagePreloader() {
	if (globalPreloader) {
		globalPreloader.destroy();
		globalPreloader = null;
	}
}