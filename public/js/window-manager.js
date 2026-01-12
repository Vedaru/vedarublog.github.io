/**
 * Window Manager - Desktop Metaphor Style
 * 提供窗口拖拽、最小化、最大化功能
 */

class WindowManager {
	constructor() {
		this.windows = new Map();
		this.activeWindow = null;
		this.zIndexCounter = 100;
		this.init();
	}

	init() {
		this.bindWindowControls();
		this.bindTaskbarButtons();
		this.makeWindowsDraggable();
	}

	bindWindowControls() {
		document.addEventListener("click", (e) => {
			const target = e.target;
			if (!target.classList.contains("window-control-btn")) return;

			const action = target.dataset.action;
			const windowId = target.dataset.windowId;
			const windowEl = document.getElementById(windowId);

			if (!windowEl) return;

			switch (action) {
				case "minimize":
					this.minimizeWindow(windowEl);
					break;
				case "maximize":
					this.toggleMaximize(windowEl);
					break;
				case "close":
					this.closeWindow(windowEl);
					break;
			}
		});
	}

	bindTaskbarButtons() {
		document.addEventListener("click", (e) => {
			const target = e.target.closest(".taskbar-app-btn");
			if (!target) return;

			const windowId = target.dataset.windowId;
			const windowEl = document.getElementById(windowId);

			if (!windowEl) return;

			if (windowEl.classList.contains("minimized")) {
				this.restoreWindow(windowEl);
			} else if (windowEl.classList.contains("active")) {
				this.minimizeWindow(windowEl);
			} else {
				this.activateWindow(windowEl);
			}
		});
	}

	makeWindowsDraggable() {
		document.addEventListener("mousedown", (e) => {
			const titlebar = e.target.closest(".window-titlebar");
			if (!titlebar) return;

			const windowId = titlebar.dataset.windowId;
			const windowEl = document.getElementById(windowId);

			if (!windowEl || windowEl.classList.contains("maximized")) return;

			e.preventDefault();
			this.activateWindow(windowEl);

			const startX = e.clientX;
			const startY = e.clientY;
			const startLeft = windowEl.offsetLeft;
			const startTop = windowEl.offsetTop;

			const onMouseMove = (e) => {
				const deltaX = e.clientX - startX;
				const deltaY = e.clientY - startY;

				let newLeft = startLeft + deltaX;
				let newTop = startTop + deltaY;

				// 边界限制
				const maxX = window.innerWidth - windowEl.offsetWidth;
				const maxY = window.innerHeight - windowEl.offsetHeight - 60; // 60px for taskbar

				newLeft = Math.max(0, Math.min(newLeft, maxX));
				newTop = Math.max(0, Math.min(newTop, maxY));

				windowEl.style.left = `${newLeft}px`;
				windowEl.style.top = `${newTop}px`;
			};

			const onMouseUp = () => {
				document.removeEventListener("mousemove", onMouseMove);
				document.removeEventListener("mouseup", onMouseUp);
			};

			document.addEventListener("mousemove", onMouseMove);
			document.addEventListener("mouseup", onMouseUp);
		});

		// 点击窗口激活
		document.addEventListener("mousedown", (e) => {
			const windowEl = e.target.closest(".window");
			if (windowEl && !windowEl.classList.contains("active")) {
				this.activateWindow(windowEl);
			}
		});
	}

	activateWindow(windowEl) {
		// 取消其他窗口的激活状态
		document.querySelectorAll(".window.active").forEach((w) => {
			w.classList.remove("active");
		});

		// 激活当前窗口
		windowEl.classList.add("active");
		windowEl.style.zIndex = ++this.zIndexCounter;

		// 更新任务栏按钮
		this.updateTaskbarButtons();

		this.activeWindow = windowEl;
	}

	minimizeWindow(windowEl) {
		windowEl.classList.add("minimized");
		windowEl.classList.remove("active");
		this.updateTaskbarButtons();
	}

	restoreWindow(windowEl) {
		windowEl.classList.remove("minimized");
		this.activateWindow(windowEl);
	}

	toggleMaximize(windowEl) {
		if (windowEl.classList.contains("maximized")) {
			windowEl.classList.remove("maximized");
		} else {
			windowEl.classList.add("maximized");
		}
	}

	closeWindow(windowEl) {
		// 简单隐藏，可以根据需要改为删除
		windowEl.style.display = "none";
		this.updateTaskbarButtons();
	}

	updateTaskbarButtons() {
		const taskbarApps = document.getElementById("taskbar-apps");
		if (!taskbarApps) return;

		// 清空现有按钮
		taskbarApps.innerHTML = "";

		// 为每个窗口创建任务栏按钮
		document.querySelectorAll(".window").forEach((windowEl) => {
			if (windowEl.style.display === "none") return;

			const windowId = windowEl.id;
			const title =
				windowEl.querySelector(".window-title span")?.textContent ||
				"Window";
			const icon = windowEl.querySelector(".window-title-icon")?.src;

			const btn = document.createElement("button");
			btn.className = "taskbar-app-btn";
			btn.dataset.windowId = windowId;
			btn.title = title;

			if (windowEl.classList.contains("active")) {
				btn.classList.add("active");
			}

			if (icon) {
				const img = document.createElement("img");
				img.src = icon;
				img.alt = "";
				img.className = "window-title-icon";
				img.width = 16;
				img.height = 16;
				btn.appendChild(img);
			}

			const span = document.createElement("span");
			span.textContent = title;
			btn.appendChild(span);

			taskbarApps.appendChild(btn);
		});
	}
}

// 初始化窗口管理器
function initWindowManager() {
	if (window.windowManager) {
		return;
	}
	window.windowManager = new WindowManager();
	console.log("[Window Manager] Initialized");
}

// 页面加载时初始化
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initWindowManager);
} else {
	initWindowManager();
}

// Swup 页面切换后重新初始化
document.addEventListener("swup:contentReplaced", () => {
	// 重新绑定事件（因为 DOM 已更新）
	if (window.windowManager) {
		window.windowManager.init();
		window.windowManager.updateTaskbarButtons();
	}
});
