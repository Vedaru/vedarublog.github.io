// 番剧图片预加载管理器
// 使用 Intersection Observer 预加载即将进入视口的图片

class AnimeImagePreloader {
	private observer: IntersectionObserver;
	private preloadedImages: Set<string> = new Set();
	private preloadDistance = 400; // 预加载距离（像素），增加到400px以提前加载

	constructor() {
		this.observer = new IntersectionObserver(
			this.handleIntersection.bind(this),
			{
				rootMargin: `${this.preloadDistance}px 0px`,
				threshold: 0.01 // 降低阈值，更早触发预加载
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

		// 使用 Image() 对象预加载，避免阻塞主线程
		const preloadImg = new Image();
		preloadImg.decoding = 'async';
		preloadImg.onload = () => {
			// 图片加载完成后才设置到实际的 img 元素
			img.src = src;
			card.setAttribute('data-preload', 'true');
		};
		preloadImg.onerror = () => {
			// 即使失败也设置 src，让浏览器尝试直接加载
			img.src = src;
		};
		preloadImg.src = src;
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