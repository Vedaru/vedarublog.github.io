/**
 * 动画工具类 - 参考 yukina 主题的动画系统
 * 提供页面切换和组件动画的统一管理
 */

export interface AnimationConfig {
	duration?: number;
	delay?: number;
	easing?: string;
	direction?: "up" | "down" | "left" | "right";
}

export class AnimationManager {
	private static instance: AnimationManager;
	private isAnimating = false;
	private animationQueue: (() => void)[] = [];

	static getInstance(): AnimationManager {
		if (!AnimationManager.instance) {
			AnimationManager.instance = new AnimationManager();
		}
		return AnimationManager.instance;
	}

	/**
	 * 初始化动画系统
	 */
	init(): void {
		this.setupSwupIntegration();
		this.setupScrollAnimations();
		this.setupPointerFocusCleanup(); // 清理指针后残留焦点导致的伪元素残留问题
		this.setupPointerFocusCleanupRobust(); // 更强力的全局清理，处理 pointercancel/visibility/scroll 等异常场景
		this.setupForceHideOnPointerUp(); // 在 pointerup 时基于计算样式做最终的强制隐藏
		console.log("🎨 Animation Manager initialized");
	}

	/**
	 * 设置 Swup 集成
	 */
	private setupSwupIntegration(): void {
		if (typeof window !== "undefined" && (window as any).swup) {
			const swup = (window as any).swup;

			// 页面离开动画
			swup.hooks.on("animation:out:start", () => {
				this.triggerPageLeaveAnimation();
			});

			// 页面进入动画
			swup.hooks.on("animation:in:start", () => {
				this.triggerPageEnterAnimation();
			});

			// 内容替换后重新初始化动画
			swup.hooks.on("content:replace", () => {
				setTimeout(() => {
					this.initializePageAnimations();
				}, 50);
			});
		}
	}

	/**
	 * 触发页面离开动画
	 */
	private triggerPageLeaveAnimation(): void {
		this.isAnimating = true;
		document.documentElement.classList.add("is-leaving");

		// 移动端优化：减少动画延迟，避免闪烁
		const isMobile = window.innerWidth <= 768;
		const delay = isMobile ? 10 : 30;

		// 添加离开动画类到主要元素
		const mainElements = document.querySelectorAll(".transition-leaving");
		mainElements.forEach((element, index) => {
			setTimeout(() => {
				element.classList.add("animate-leave");
			}, index * delay);
		});
	}

	/**
	 * 触发页面进入动画
	 */
	private triggerPageEnterAnimation(): void {
		document.documentElement.classList.remove("is-leaving");
		document.documentElement.classList.add("is-entering");

		// 移除离开动画类
		const elements = document.querySelectorAll(".animate-leave");
		elements.forEach((element) => {
			element.classList.remove("animate-leave");
		});

		setTimeout(() => {
			document.documentElement.classList.remove("is-entering");
			this.isAnimating = false;
			this.processAnimationQueue();
		}, 300);
	}

	/**
	 * 初始化页面动画
	 */
	private initializePageAnimations(): void {
		// 重新应用加载动画（支持 reduced-motion，使用 rAF 调度以减少布局抖动）
		const animatedElements = document.querySelectorAll(".onload-animation");
		const prefersReducedMotion =
			typeof window !== "undefined" &&
			window.matchMedia &&
			window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
		const baseDuration = prefersReducedMotion ? 0 : isMobile ? 200 : 320;

		animatedElements.forEach((element, index) => {
			const htmlElement = element as HTMLElement;
			const delay =
				Number.parseInt(htmlElement.style.animationDelay, 10) || index * (isMobile ? 30 : 50);

			// 若用户偏好减少动画，直接显示最终状态
			if (prefersReducedMotion) {
				htmlElement.style.opacity = "1";
				htmlElement.style.transform = "translateY(0)";
				return;
			}

			// 重置初始状态并提示会更改的属性
			htmlElement.style.opacity = "0";
			htmlElement.style.transform = "translateY(1.5rem)";
			htmlElement.style.willChange = "transform, opacity";

			setTimeout(() => {
				requestAnimationFrame(() => {
					htmlElement.style.transition = `opacity ${baseDuration}ms cubic-bezier(0.4,0,0.2,1), transform ${baseDuration}ms cubic-bezier(0.4,0,0.2,1)`;
					htmlElement.style.opacity = "1";
					htmlElement.style.transform = "translateY(0)";
					const cleanup = () => {
						htmlElement.style.willChange = "";
						htmlElement.removeEventListener("transitionend", cleanup);
					};
					htmlElement.addEventListener("transitionend", cleanup);
				});
			}, delay);
		});

		// 重新初始化侧边栏组件
		this.initializeSidebarComponents();
	}

	/**
	 * 初始化侧边栏组件
	 */
	private initializeSidebarComponents(): void {
		// 查找页面中的侧边栏元素
		const sidebar = document.getElementById("sidebar");
		if (sidebar) {
			// 触发自定义事件，通知侧边栏重新初始化
			const event = new CustomEvent("sidebar:init");
			sidebar.dispatchEvent(event);
		}

		// 触发全局事件，通知所有组件重新初始化
		const globalEvent = new CustomEvent("page:reinit");
		document.dispatchEvent(globalEvent);
	}

	/**
	 * 清理 pointer 触发后残留的 focus（避免伪元素阴影残留）
	 */
	private setupPointerFocusCleanup(): void {
		if (typeof window === "undefined") return;

		// 在 pointerdown 时监听，如果点击的是具有扩张伪元素的按钮，
		// 在 pointerup 时移除焦点（仅限指针触发，不影响键盘焦点）
		document.addEventListener(
			"pointerdown",
			(e: PointerEvent) => {
				const el = (e.target as Element).closest?.(".expand-animation, .btn-plain") as HTMLElement | null;
				if (!el) return;

				const onUp = () => {
					// 放在微任务之后执行，以让 :active 状态能稍微显现（更自然）
					setTimeout(() => {
						if (document.activeElement === el) {
							// 如果是通过指针触发的焦点，则移除焦点以避免残留伪元素
							(el as HTMLElement).blur();
						}
					}, 50);

				window.removeEventListener("pointerup", onUp);
				};

			window.addEventListener("pointerup", onUp, { once: true });
			},
			{ passive: true },
		);
	}

	/**
	 * 设置滚动动画
	 */
	private setupForceHideOnPointerUp(): void {
		if (typeof window === "undefined") return;

		document.addEventListener(
			"pointerup",
			(e: PointerEvent) => {
				const el = (e.target as Element).closest?.(".expand-animation, .btn-plain") as HTMLElement | null;
				if (!el) return;

				const check = () => {
					try {
						const comp = window.getComputedStyle(el, "::before");
						const opa = parseFloat(comp.getPropertyValue("opacity") || "0");
						if (opa > 0.01) {
							el.classList.add("no-shadow");
							el.style.setProperty("--btn-plain-bg-hover", "transparent");
							void el.offsetWidth;
							setTimeout(check, 60);
							return;
						}
						setTimeout(() => {
							el.classList.remove("no-shadow");
							el.style.removeProperty("--btn-plain-bg-hover");
						}, 80);
					} catch (err) {
						setTimeout(() => el.classList.remove("no-shadow"), 150);
					}
				};

				setTimeout(check, 40);
			},
			{ passive: true },
		);
	}

	private setupScrollAnimations(): void {
		if (typeof window === "undefined") return;

		const observerOptions = {
			root: null,
			rootMargin: "0px 0px -100px 0px",
			threshold: 0.1,
		};

		const observer = new IntersectionObserver((entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					entry.target.classList.add("in-view");
					observer.unobserve(entry.target);
				}
			});
		}, observerOptions);

		// 观察所有需要滚动动画的元素
		const scrollElements = document.querySelectorAll(".animate-on-scroll");
		scrollElements.forEach((element) => {
			observer.observe(element);
		});
	}

	/**
	 * 全局强力清理：在更多异常场景（pointercancel/visibility/scroll/click 等）下也清理可能残留的阴影和焦点
	 */
	private setupPointerFocusCleanupRobust(): void {
		if (typeof window === "undefined") return;

		const doCleanup = (maybeTarget?: EventTarget | null) => {
			try {
				const focused = document.activeElement as HTMLElement | null;
				if (focused && (focused.matches?.(".expand-animation") || focused.matches?.(".btn-plain"))) {
					focused.blur();
					focused.classList.add("no-shadow");
					setTimeout(() => focused.classList.remove("no-shadow"), 200);
				}

				if (maybeTarget && (maybeTarget as Element).closest) {
					const el = (maybeTarget as Element).closest(".expand-animation, .btn-plain") as HTMLElement | null;
					if (el) {
						el.classList.add("no-shadow");
						setTimeout(() => el.classList.remove("no-shadow"), 200);
					}
				}
			} catch (e) {
				/* ignore */
			}
		};

		["pointerup", "pointercancel", "touchend", "touchcancel", "click"].forEach((ev) => {
			document.addEventListener(ev, (e) => doCleanup(e.target), { passive: true });
		});

		window.addEventListener("scroll", () => doCleanup(null), { passive: true });
		document.addEventListener("visibilitychange", () => {
			if (document.visibilityState !== "visible") doCleanup(null);
		});
	}

	/**
	 * 添加动画到队列
	 */
	queueAnimation(callback: () => void): void {
		if (this.isAnimating) {
			this.animationQueue.push(callback);
		} else {
			callback();
		}
	}

	/**
	 * 处理动画队列
	 */
	private processAnimationQueue(): void {
		while (this.animationQueue.length > 0) {
			const callback = this.animationQueue.shift();
			if (callback) {
				callback();
			}
		}
	}

	/**
	 * 创建自定义动画
	 */
	createAnimation(element: HTMLElement, config: AnimationConfig): void {
		const {
			duration = 300,
			delay = 0,
			easing = "cubic-bezier(0.4, 0, 0.2, 1)",
			direction = "up",
		} = config;

		const transforms = {
			up: "translateY(1.5rem)",
			down: "translateY(-1.5rem)",
			left: "translateX(1.5rem)",
			right: "translateX(-1.5rem)",
		};

		// 设置初始状态
		element.style.opacity = "0";
		element.style.transform = transforms[direction];
		element.style.transition = `opacity ${duration}ms ${easing}, transform ${duration}ms ${easing}`;

		setTimeout(() => {
			element.style.opacity = "1";
			element.style.transform = "translate(0)";
		}, delay);
	}

	// batchAnimate is deprecated, use staggerAnimations instead
	// batchAnimate(
	// 	elements: NodeListOf<Element> | Element[],
	// 	config: AnimationConfig & { stagger?: number } = {},
	// ): void {
	// 	const { stagger = 50, ...animationConfig } = config;
	//
	// 	elements.forEach((element, index) => {
	// 		this.createAnimation(element as HTMLElement, {
	// 			...animationConfig,
	// 			delay: (animationConfig.delay || 0) + index * stagger,
	// 		});
	// 	});
	// }

	/**
	 * 批量动画
	 */
	staggerAnimations(
		elements: NodeListOf<Element> | HTMLElement[],
		config: AnimationConfig & { stagger?: number } = {},
	): void {
		const { stagger = 50, ...animationConfig } = config;

		elements.forEach((element: Element | HTMLElement, index: number) => {
			this.createAnimation(element as HTMLElement, {
				...animationConfig,
				delay: (animationConfig.delay || 0) + index * stagger,
			});
		});
	}

	/**
	 * 检查是否正在动画
	 */
	isCurrentlyAnimating(): boolean {
		return this.isAnimating;
	}
}

// 导出单例实例
export const animationManager = AnimationManager.getInstance();

// 自动初始化
if (typeof window !== "undefined") {
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", () => {
			animationManager.init();
		});
	} else {
		animationManager.init();
	}
}
