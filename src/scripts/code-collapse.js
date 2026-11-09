class CodeBlockCollapser {
	constructor() {
		this.processedBlocks = new WeakSet();
		this.isThemeChanging = false;
		this.debug = false; // 设置为 true 启用调试日志
		this.observer =
			"IntersectionObserver" in window
				? new IntersectionObserver(this.handleIntersection, {
						rootMargin: "200px 0px",
					})
				: null;
	}

	log(...args) {
		if (this.debug) {
			console.log("[CodeBlockCollapser]", ...args);
		}
	}

	setupThemeChangeListener() {
		// 监听主题切换，在切换期间暂停过渡以避免额外重绘
		const themeObserver = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				if (
					mutation.type === "attributes" &&
					(mutation.attributeName === "class" ||
						mutation.attributeName === "data-theme")
				) {
					const isTransitioning =
						document.documentElement.classList.contains(
							"is-theme-transitioning",
						);

					if (isTransitioning && !this.isThemeChanging) {
						this.isThemeChanging = true;

						// 性能优化：临时禁用代码块的动画和过渡
						document
							.querySelectorAll(".expressive-code")
							.forEach((block) => {
								block.style.transition = "none";
							});
					} else if (!isTransitioning && this.isThemeChanging) {
						this.isThemeChanging = false;

						// 等待主题切换完全结束后再恢复
						requestAnimationFrame(() => {
							// 恢复代码块的过渡效果
							document
								.querySelectorAll(".expressive-code")
								.forEach((block) => {
									block.style.transition = "";
								});
						});
					}
					break;
				}
			}
		});

		themeObserver.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class", "data-theme"],
		});
	}

	handleIntersection = (entries) => {
		for (const entry of entries) {
			if (!entry.isIntersecting) continue;
			this.observer?.unobserve(entry.target);
			if (this.processedBlocks.has(entry.target)) continue;
			this.enhanceCodeBlock(entry.target);
			this.processedBlocks.add(entry.target);
		}
	};

	setupCodeBlocks() {
		const codeBlocks = document.querySelectorAll(".expressive-code");
		this.log(`Found ${codeBlocks.length} code blocks to process`);

		codeBlocks.forEach((codeBlock) => {
			if (this.processedBlocks.has(codeBlock)) return;
			if (this.observer) {
				this.observer.observe(codeBlock);
			} else {
				this.enhanceCodeBlock(codeBlock);
				this.processedBlocks.add(codeBlock);
			}
		});
	}

	enhanceCodeBlock(codeBlock) {
		const frame = codeBlock.querySelector(".frame");
		if (!frame) {
			this.log("No frame found in code block, skipping");
			return;
		}

		if (frame.classList.contains("has-title")) {
			this.log("Code block has title, skipping collapse feature");
			return;
		}

		this.log("Adding collapse feature to code block");
		codeBlock.classList.add("collapsible", "expanded");

		const toggleBtn = this.createToggleButton();
		frame.appendChild(toggleBtn);

		this.bindToggleEvents(codeBlock, toggleBtn);
	}

	createToggleButton() {
		const button = document.createElement("button");
		button.className = "collapse-toggle-btn";
		button.type = "button";
		// 页面语言只有一个来源：<html data-locale>（由 Layout 按 URL 写入）
		const isZh = (
			document.documentElement.dataset.locale || "zh"
		).startsWith("zh");
		button.setAttribute(
			"aria-label",
			isZh ? "折叠/展开代码块" : "Collapse or expand code block",
		);

		button.innerHTML = `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <g fill="none">
          <path d="M24 0v24H0V0zM12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.019-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z"></path>
          <path fill="currentColor" d="m12 16.172l-4.95-4.95a1 1 0 1 0-1.414 1.414l5.657 5.657a1 1 0 0 0 1.414 0l5.657-5.657a1 1 0 0 0-1.414-1.414z"></path>
        </g>
      </svg>
    `;

		return button;
	}

	bindToggleEvents(codeBlock, button) {
		button.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.toggleCollapse(codeBlock);
		});

		button.addEventListener("keydown", (e) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				this.toggleCollapse(codeBlock);
			}
		});
	}

	toggleCollapse(codeBlock) {
		const isCollapsed = codeBlock.classList.contains("collapsed");

		requestAnimationFrame(() => {
			if (isCollapsed) {
				codeBlock.classList.remove("collapsed");
				codeBlock.classList.add("expanded");
			} else {
				codeBlock.classList.remove("expanded");
				codeBlock.classList.add("collapsed");
			}
		});

		const event = new CustomEvent("codeBlockToggle", {
			detail: { collapsed: !isCollapsed, element: codeBlock },
		});
		document.dispatchEvent(event);
	}

	destroy() {
		this.observer?.disconnect();
		this.observer = null;
		this.processedBlocks = new WeakSet();
	}

	// 公共API方法
	collapseAll() {
		const allBlocks = document.querySelectorAll(
			".expressive-code.expanded",
		);
		allBlocks.forEach((block) => {
			this.toggleCollapse(block);
		});
	}

	expandAll() {
		const allBlocks = document.querySelectorAll(
			".expressive-code.collapsed",
		);
		allBlocks.forEach((block) => {
			this.toggleCollapse(block);
		});
	}
}

const codeBlockCollapser = new CodeBlockCollapser();

window.CodeBlockCollapser = CodeBlockCollapser;
window.codeBlockCollapser = codeBlockCollapser;

let initialized = false;

/**
 * Enhance the current page's code blocks. `page-enhancements` owns the
 * lifecycle and calls this once per page, after the layout has settled.
 */
export function initCodeBlocks() {
	if (!initialized) {
		initialized = true;
		codeBlockCollapser.setupThemeChangeListener();
	}
	codeBlockCollapser.setupCodeBlocks();
}
