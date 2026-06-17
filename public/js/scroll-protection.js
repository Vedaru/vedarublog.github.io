/**
 * 强力滚动保护脚本
 * 通过劫持 window.scrollTo 和相关滚动方法来阻止意外的滚动跳转
 * 专门解决 Twikoo 评论系统的滚动问题
 */

(() => {
	if (window.__scrollProtectionBootstrapped) {
		window.scrollProtectionManager?.observeTwikoo?.();
		return;
	}
	window.__scrollProtectionBootstrapped = true;

	// 保存原始的滚动方法（供预滚动等需要绕过劫持的场景使用）
	const originalScrollTo = window.scrollTo.bind(window);
	const originalScrollBy = window.scrollBy.bind(window);
	const originalScrollIntoView = Element.prototype.scrollIntoView;
	window.__nativeScrollTo = originalScrollTo;
	window.__nativeScrollBy = originalScrollBy;

	// 滚动保护状态
	const scrollProtection = {
		enabled: false,
		allowedY: null,
		startTime: 0,
		duration: 0,
		timeout: null,
	};

	// 检测是否为TOC导航触发的滚动
	function checkIsTOCNavigation() {
		// 检查调用堆栈，看是否来自TOC组件
		const stack = new Error().stack;
		if (
			stack &&
			(stack.includes("handleAnchorClick") ||
				stack.includes("TOC.astro") ||
				stack.includes("MobileTOC") ||
				stack.includes("FloatingTOC") ||
				stack.includes("__smoothScrollToElement") ||
				stack.includes("__smoothScrollToTop") ||
				stack.includes("__smoothScrollToY"))
		) {
			return true;
		}

		// 检查最近是否有TOC点击事件
		if (
			window.tocClickTimestamp &&
			Date.now() - window.tocClickTimestamp < 1000
		) {
			return true;
		}

		// 检查是否在TOC元素上
		const activeElement = document.activeElement;
		if (activeElement && activeElement.closest("#toc, .table-of-contents")) {
			return true;
		}

		return false;
	}

	// 启动滚动保护
	function enableScrollProtection(duration = 3000, currentY = null) {
		// Swup 换页期间不启动保护，避免阻止换页后的 scrollTo(0) 恢复
		var html = document.documentElement;
		if (
			html.classList.contains("is-changing") ||
			html.classList.contains("is-animating") ||
			html.classList.contains("swup-perf-active")
		) {
			return;
		}

		scrollProtection.enabled = true;
		scrollProtection.allowedY =
			currentY !== null ? currentY : window.scrollY || window.pageYOffset;
		scrollProtection.startTime = Date.now();
		scrollProtection.duration = duration;

		// 清除之前的定时器
		if (scrollProtection.timeout) {
			clearTimeout(scrollProtection.timeout);
		}

		// 设置保护结束时间
		scrollProtection.timeout = setTimeout(() => {
			scrollProtection.enabled = false;
			console.log("[强力滚动保护] 保护期结束");
		}, duration);

		console.log(
			`[强力滚动保护] 启动保护 ${duration}ms，允许Y位置:`,
			scrollProtection.allowedY,
		);
	}

	// 检查滚动是否被允许
	function isScrollAllowed(x, y) {
		if (!scrollProtection.enabled) {
			return true;
		}

		// Swup 换页阶段：放行所有滚动，避免换页后的回顶滚动被旧的 allowedY 拦截/重定向，
		// 造成"先跳回底部再纠正"的界面抽动（典型：文章底部 Twikoo 触发保护 → 回到顶端 → 主页）
		var html = document.documentElement;
		if (
			html.classList.contains("is-changing") ||
			html.classList.contains("is-animating") ||
			html.classList.contains("swup-perf-active")
		) {
			return true;
		}

		// 换页预滚动 / 平滑回顶组件自行驱动 scrollTop
		if (window.__homePreScrollActive) {
			return true;
		}

		// 检查是否是TOC或MD导航触发的滚动
		const isTOCNavigation = checkIsTOCNavigation();
		if (isTOCNavigation) {
			console.log("[强力滚动保护] 检测到TOC导航，允许滚动");
			return true;
		}

		// 允许小幅度的滚动调整（±50像素）
		const tolerance = 50;
		const allowedY = scrollProtection.allowedY;

		if (Math.abs(y - allowedY) <= tolerance) {
			return true;
		}

		// 如果尝试滚动到顶部（y < 100）而当前位置在更下方，阻止
		if (y < 100 && allowedY > 100) {
			console.log(
				"[强力滚动保护] 阻止滚动到顶部，目标Y:",
				y,
				"允许Y:",
				allowedY,
			);
			return false;
		}

		return true;
	}

	function getScrollTargetY(x, y) {
		if (typeof x === "object" && x !== null) {
			return typeof x.top === "number" ? x.top : window.scrollY || 0;
		}
		return typeof y === "number" ? y : window.scrollY || 0;
	}

	// 劫持 window.scrollTo
	window.scrollTo = (x, y) => {
		const targetY = getScrollTargetY(x, y);

		if (typeof x === "object" && x !== null) {
			if (isScrollAllowed(x.left || 0, targetY)) {
				originalScrollTo(x);
			} else {
				console.log("[强力滚动保护] 阻止 scrollTo:", x);
				originalScrollTo({
					...x,
					top: scrollProtection.allowedY,
				});
			}
			return;
		}

		if (isScrollAllowed(x, targetY)) {
			originalScrollTo(x, y);
		} else {
			console.log("[强力滚动保护] 阻止 scrollTo:", x, y);
			originalScrollTo(x, scrollProtection.allowedY);
		}
	};

	// 劫持 window.scrollBy
	window.scrollBy = (x, y) => {
		if (typeof x === "object" && x !== null) {
			const currentY = window.scrollY || window.pageYOffset;
			const targetY = currentY + (typeof x.top === "number" ? x.top : 0);

			if (isScrollAllowed(x.left || 0, targetY)) {
				originalScrollBy(x);
			} else {
				console.log("[强力滚动保护] 阻止 scrollBy:", x);
			}
			return;
		}

		const currentY = window.scrollY || window.pageYOffset;
		const targetY = currentY + y;

		if (isScrollAllowed(x, targetY)) {
			originalScrollBy(x, y);
		} else {
			console.log("[强力滚动保护] 阻止 scrollBy:", x, y);
		}
	};

	// 劫持 Element.scrollIntoView
	Element.prototype.scrollIntoView = function (options) {
		if (!scrollProtection.enabled) {
			originalScrollIntoView.call(this, options);
			return;
		}

		// 在保护期内，尝试阻止 scrollIntoView
		const rect = this.getBoundingClientRect();
		const currentY = window.scrollY || window.pageYOffset;
		const targetY = currentY + rect.top;

		if (isScrollAllowed(0, targetY)) {
			originalScrollIntoView.call(this, options);
		} else {
			console.log("[强力滚动保护] 阻止 scrollIntoView");
		}
	};

	// 监听 Twikoo 相关的交互事件
	document.addEventListener(
		"click",
		(event) => {
			const target = event.target;

			// 检查是否点击了TOC导航
			if (
				target.closest("#toc, .table-of-contents") &&
				target.closest('a[href^="#"]')
			) {
				window.tocClickTimestamp = Date.now();
				console.log("[强力滚动保护] 检测到TOC导航点击");
				return; // 不启动保护，允许TOC正常工作
			}

			// 检查是否点击了 Twikoo 相关元素
			if (
				target.closest("#tcomment") ||
				target.matches(
					".tk-action-icon, .tk-submit, .tk-cancel, .tk-preview, .tk-owo, .tk-admin, .tk-edit, .tk-delete, .tk-reply, .tk-expand",
				) ||
				target.closest(
					".tk-action-icon, .tk-submit, .tk-cancel, .tk-preview, .tk-owo, .tk-admin, .tk-edit, .tk-delete, .tk-reply, .tk-expand",
				)
			) {
				// 立即启动保护
				enableScrollProtection(4000); // 增加保护时间到4秒
				console.log("[强力滚动保护] 检测到 Twikoo 交互，启动保护");
			}

			// 特别检查管理面板相关操作（包括关闭操作）
			if (
				target.matches(
					".tk-admin-panel, .tk-admin-overlay, .tk-modal, .tk-dialog, .tk-admin-close, .tk-close",
				) ||
				target.closest(
					".tk-admin-panel, .tk-admin-overlay, .tk-modal, .tk-dialog, .tk-admin-close, .tk-close",
				) ||
				target.classList.contains("tk-admin") ||
				target.closest(".tk-admin")
			) {
				enableScrollProtection(6000); // 管理面板操作保护更长时间
				console.log("[强力滚动保护] 检测到 Twikoo 管理面板操作，启动长期保护");
			}

			// 检查是否点击了遮罩层（通常用于关闭模态框）
			if (
				target.classList.contains("tk-overlay") ||
				target.classList.contains("tk-mask") ||
				target.matches('[class*="overlay"]') ||
				target.matches('[class*="mask"]') ||
				target.matches('[class*="backdrop"]')
			) {
				// 检查是否在 Twikoo 区域内
				const tcommentEl = document.querySelector("#tcomment");
				if (
					tcommentEl &&
					(target.closest("#tcomment") || tcommentEl.contains(target))
				) {
					enableScrollProtection(4000);
					console.log("[强力滚动保护] 检测到 Twikoo 遮罩层点击，启动保护");
				}
			}
		},
		true,
	); // 使用捕获阶段

	// 监听表单提交
	document.addEventListener(
		"submit",
		(event) => {
			if (event.target.closest("#tcomment")) {
				enableScrollProtection(4000);
				console.log("[强力滚动保护] 检测到 Twikoo 表单提交，启动保护");
			}
		},
		true,
	);

	// 监听键盘事件（特别是 ESC 键，用于关闭管理面板）
	document.addEventListener(
		"keydown",
		(event) => {
			if (event.key === "Escape" || event.keyCode === 27) {
				// 检查是否在 Twikoo 区域内有活动的管理面板
				const tcommentEl = document.querySelector("#tcomment");
				if (tcommentEl) {
					// 检查是否有可见的管理面板或模态框
					const adminPanel = tcommentEl.querySelector(
						".tk-admin-panel, .tk-modal, .tk-dialog, [class*='admin'], [class*='modal']",
					);
					if (adminPanel && adminPanel.offsetParent !== null) {
						// 面板可见，启动保护
						enableScrollProtection(3000);
						console.log(
							"[强力滚动保护] 检测到 ESC 键关闭 Twikoo 管理面板，启动保护",
						);
					}
				}
			}
		},
		true,
	);

	// 监听 DOM 变化 - 仅观察 #tcomment 元素（缩小范围减少 INP 影响）
	var domChangeDebounce = null;
	const observer = new MutationObserver((mutations) => {
		// 防抖：合并短时间内的多次 DOM 变化
		if (domChangeDebounce) return;
		domChangeDebounce = setTimeout(function() {
			domChangeDebounce = null;
		}, 300);

		for (var i = 0; i < mutations.length; i++) {
			var mutation = mutations[i];
			if (mutation.removedNodes.length > 0 ||
				(mutation.type === "attributes" && mutation.attributeName === "style")) {
				enableScrollProtection(2000);
				console.log("[强力滚动保护] 检测到 Twikoo DOM 变化，启动保护");
				break;
			}
		}
	});

	// 开始监听 DOM 变化 - 仅观察 #tcomment 而非整个 body
	function startObserver() {
		if (observerTarget) {
			observer.disconnect();
			observerTarget = null;
		}

		const tcommentEl = document.querySelector("#tcomment");
		if (!tcommentEl) return;

		observerTarget = tcommentEl;
		observer.observe(tcommentEl, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ["style"],
		});
	}

	let observerTarget = null;

	if (document.body) {
		startObserver();
	} else {
		document.addEventListener("DOMContentLoaded", startObserver);
	}

	// Swup 换页开始时关闭滚动保护：导航属于跨页行为，
	// 不应让上一页（如文章底部 Twikoo 交互）遗留的保护拦截换页滚动。
	// 换页结束后若新页面再次发生 Twikoo 交互，会由观察器重新启用。
	function disableProtectionForNavigation() {
		scrollProtection.enabled = false;
		if (scrollProtection.timeout) {
			clearTimeout(scrollProtection.timeout);
			scrollProtection.timeout = null;
		}
	}

	function registerSwupNavGuard() {
		if (window.swup && window.swup.hooks) {
			window.swup.hooks.on("visit:start", disableProtectionForNavigation);
		}
	}

	document.addEventListener("swup:enable", () => {
		registerSwupNavGuard();
		setTimeout(startObserver, 200);
	});

	registerSwupNavGuard();

	// 提供全局接口
	window.scrollProtectionManager = {
		enable: enableScrollProtection,
		observeTwikoo: startObserver,
		disable: () => {
			scrollProtection.enabled = false;
			if (scrollProtection.timeout) {
				clearTimeout(scrollProtection.timeout);
			}
			console.log("[强力滚动保护] 手动停止保护");
		},
		isEnabled: () => scrollProtection.enabled,
		getStatus: () => ({ ...scrollProtection }),
		// 新增：强制保护模式（用于调试）
		forceProtect: (duration = 10000) => {
			enableScrollProtection(duration);
			console.log(`[强力滚动保护] 强制保护模式启动 ${duration}ms`);
		},
		// 新增：获取当前滚动位置
		getCurrentScroll: () => {
			return {
				x: window.scrollX || window.pageXOffset,
				y: window.scrollY || window.pageYOffset,
			};
		},
		// 新增：检测 Twikoo 状态
		checkTwikooStatus: () => {
			const tcomment = document.querySelector("#tcomment");
			if (!tcomment) return { exists: false };

			const adminPanels = tcomment.querySelectorAll(
				".tk-admin-panel, .tk-modal, .tk-dialog, [class*='admin'], [class*='modal']",
			);
			const visiblePanels = Array.from(adminPanels).filter(
				(panel) => panel.offsetParent !== null,
			);

			return {
				exists: true,
				adminPanelsCount: adminPanels.length,
				visiblePanelsCount: visiblePanels.length,
				hasVisiblePanels: visiblePanels.length > 0,
			};
		},
	};

	console.log("[强力滚动保护] 初始化完成");
})();
