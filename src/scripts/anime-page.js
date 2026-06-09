/** 番剧页客户端逻辑（Swup 切换后需重新初始化） */

let animeLazyObserver = null;
let animeSwupListenersRegistered = false;

function updateAnimeListLayout(layout, shouldAnimate = true) {
	const animeListContainer = document.getElementById("anime-list-container");
	if (!animeListContainer) return;
	animeListContainer.dataset.currentLayout = layout;

	const animeItems = Array.from(
		document.querySelectorAll("[data-anime-status]"),
	);
	const visibleItems = animeItems.filter((item) => item.offsetParent !== null);
	const firstPositions = new Map();
	if (shouldAnimate) {
		visibleItems.forEach((item) => {
			const rect = item.getBoundingClientRect();
			firstPositions.set(item, {
				left: rect.left,
				top: rect.top,
				width: rect.width,
				height: rect.height,
			});
		});
	}

	const style = document.createElement("style");
	style.innerHTML = `.anime-grid-container .group { transition: none !important; }`;
	document.head.appendChild(style);
	animeListContainer.classList.remove("anime-list-mode", "anime-grid-mode");
	animeListContainer.classList.remove("grid-cols-1", "md:grid-cols-2", "lg:grid-cols-3");

	if (layout === "grid") {
		animeListContainer.classList.add("anime-grid-mode");
		const rightSidebar = document.querySelector(".right-sidebar-container");
		if (rightSidebar) {
			rightSidebar.style.display = "none";
			rightSidebar.classList.add("hidden-in-grid-mode");
		}
	} else {
		animeListContainer.classList.add("anime-list-mode");
		animeListContainer.classList.add("grid-cols-1", "lg:grid-cols-2");
		const rightSidebar = document.querySelector(".right-sidebar-container");
		if (rightSidebar) {
			rightSidebar.style.display = "";
			rightSidebar.classList.remove("hidden-in-grid-mode");
		}
	}

	void animeListContainer.offsetHeight;
	if (!shouldAnimate) {
		if (style.parentNode) style.parentNode.removeChild(style);
		return;
	}

	requestAnimationFrame(() => {
		if (style.parentNode) style.parentNode.removeChild(style);

		visibleItems.forEach((item) => {
			const first = firstPositions.get(item);
			if (!first) return;
			const last = item.getBoundingClientRect();

			const deltaX = Math.round(first.left - last.left);
			const deltaY = Math.round(first.top - last.top);
			const deltaW = first.width / last.width;
			const deltaH = first.height / last.height;

			if (
				Math.abs(deltaX) < 1 &&
				Math.abs(deltaY) < 1 &&
				Math.abs(deltaW - 1) < 0.01 &&
				Math.abs(deltaH - 1) < 0.01
			)
				return;

			item.style.willChange = "transform";
			item.style.transition = "none";
			item.style.transformOrigin = "top left";
			item.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${deltaW}, ${deltaH})`;
		});

		void animeListContainer.offsetHeight;
		requestAnimationFrame(() => {
			visibleItems.forEach((item) => {
				item.style.transition =
					"transform 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)";
				item.style.transform = "";
			});
			setTimeout(() => {
				visibleItems.forEach((item) => {
					item.style.transition = "";
					item.style.transformOrigin = "";
					item.style.transform = "";
					item.style.willChange = "";
				});
			}, 500);
		});
	});
}

function initAnimePageLayout() {
	const animeListContainer = document.getElementById("anime-list-container");
	if (!animeListContainer) return false;

	const currentLayout = localStorage.getItem("postListLayout") || "list";
	updateAnimeListLayout(currentLayout, false);
	requestAnimationFrame(() => {
		animeListContainer.classList.remove("opacity-0");
	});
	return true;
}

function initAnimeFilterButtons() {
	const filterTags = document.querySelectorAll(".anime-filter-tag");
	const sentinel = document.getElementById("infinite-scroll-sentinel");
	const listContainer = document.getElementById("anime-list-container");
	const lazyStore = document.getElementById("anime-lazy-store");

	if (!listContainer) return;

	if (!window.animeFilterEventListeners) {
		window.animeFilterEventListeners = [];
	}

	window.animeFilterEventListeners.forEach((listener) => {
		const [element, type, handler] = listener;
		element.removeEventListener(type, handler);
	});
	window.animeFilterEventListeners = [];

	if (animeLazyObserver) {
		animeLazyObserver.disconnect();
		animeLazyObserver = null;
	}

	filterTags.forEach((tag) => {
		const clickHandler = function () {
			if (this.classList.contains("anime-active")) return;

			filterTags.forEach((t) => t.classList.remove("anime-active"));
			this.classList.add("anime-active");

			if (lazyStore && lazyStore.content.children.length > 0 && listContainer) {
				const fragment = document.createDocumentFragment();
				while (lazyStore.content.firstChild) {
					fragment.appendChild(lazyStore.content.firstChild);
				}
				listContainer.appendChild(fragment);
			}

			if (sentinel) sentinel.style.display = "none";
			listContainer.querySelectorAll(".initial-hidden").forEach((el) => {
				el.classList.remove("hidden", "initial-hidden");
			});

			const status = this.getAttribute("data-status");
			const animeItems = Array.from(listContainer.children).filter((item) =>
				item.hasAttribute("data-anime-status"),
			);
			const itemsToHide = [];
			const itemsToShow = [];
			const itemsToKeep = [];

			animeItems.forEach((item) => {
				const itemStatus = item.getAttribute("data-anime-status");
				const shouldShow = status === "all" || itemStatus === status;
				const isCurrentlyVisible = !item.classList.contains("anime-hidden");

				if (shouldShow) {
					(isCurrentlyVisible ? itemsToKeep : itemsToShow).push(item);
				} else if (isCurrentlyVisible) {
					itemsToHide.push(item);
				}
			});

			const firstPositions = new Map();
			itemsToKeep.forEach((item) => {
				const rect = item.getBoundingClientRect();
				firstPositions.set(item, { left: rect.left, top: rect.top });
			});

			const runAnimation = () => {
				itemsToHide.forEach((item) => {
					item.classList.add("anime-hidden");
					item.classList.remove("anime-fade-out");
				});
				itemsToShow.forEach((item) => {
					item.classList.remove("anime-hidden");
					item.classList.add("anime-fade-in");
					item.style.transition = "none";
				});
				itemsToKeep.forEach((item) => {
					const first = firstPositions.get(item);
					if (!first) return;
					const rect = item.getBoundingClientRect();
					const deltaX = Math.round(first.left - rect.left);
					const deltaY = Math.round(first.top - rect.top);
					if (deltaX !== 0 || deltaY !== 0) {
						item.style.willChange = "transform";
						item.style.transition = "none";
						item.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
					}
				});

				requestAnimationFrame(() => {
					itemsToKeep.forEach((item) => {
						item.style.transition =
							"transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)";
						item.style.transform = "";
					});

					const STAGGER_LIMIT = 20;
					itemsToShow.forEach((item, index) => {
						item.style.transition = "";
						item.style.willChange = "opacity, transform";
						item.style.transitionDelay = `${
							index < STAGGER_LIMIT ? index * 30 : 0
						}ms`;
						requestAnimationFrame(() => {
							item.classList.remove("anime-fade-in");
							item.classList.add("anime-fade-in-active");
						});
					});

					setTimeout(
						() => {
							[...itemsToKeep, ...itemsToShow].forEach((item) => {
								item.classList.remove("anime-fade-in-active");
								item.style.transition = "";
								item.style.transform = "";
								item.style.opacity = "";
								item.style.willChange = "";
								item.style.transitionDelay = "";
							});
						},
						600 +
							(itemsToShow.length > 0
								? Math.min(itemsToShow.length, 20) * 30
								: 0),
					);
				});
			};

			if (itemsToHide.length > 0) {
				itemsToHide.forEach((item) => item.classList.add("anime-fade-out"));
				setTimeout(runAnimation, 200);
			} else {
				runAnimation();
			}
		};

		tag.addEventListener("click", clickHandler);
		window.animeFilterEventListeners.push([tag, "click", clickHandler]);
	});

	if (sentinel && lazyStore && listContainer) {
		animeLazyObserver = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					const BATCH_SIZE = 24;
					if (lazyStore.content.children.length === 0) {
						sentinel.style.display = "none";
						animeLazyObserver?.disconnect();
						return;
					}

					const fragment = document.createDocumentFragment();
					let movedCount = 0;
					while (lazyStore.content.firstChild && movedCount < BATCH_SIZE) {
						const node = lazyStore.content.firstChild;
						if (node.nodeType === 1) {
							node.classList.add("anime-fade-in-active");
						}
						fragment.appendChild(node);
						movedCount++;
					}

					requestAnimationFrame(() => {
						listContainer.appendChild(fragment);
						if (lazyStore.content.children.length === 0) {
							sentinel.style.display = "none";
							animeLazyObserver?.disconnect();
						}
					});
				}
			},
			{ rootMargin: "200px" },
		);
		animeLazyObserver.observe(sentinel);
	} else if (sentinel) {
		sentinel.style.display = "none";
	}
}

function initAnimePage() {
	if (!document.getElementById("anime-list-container")) return;
	initAnimePageLayout();
	initAnimeFilterButtons();
}

function scheduleAnimePageInit() {
	setTimeout(initAnimePage, 150);
}

function registerAnimeSwupListeners() {
	if (animeSwupListenersRegistered || !window.swup?.hooks) return;
	animeSwupListenersRegistered = true;

	window.swup.hooks.on("content:replace", scheduleAnimePageInit);
	window.swup.hooks.on("page:view", scheduleAnimePageInit);
}

function bootstrapAnimePage() {
	if (document.getElementById("anime-list-container")) {
		initAnimePage();
	}
	registerAnimeSwupListeners();
}

window.updateAnimeListLayout = updateAnimeListLayout;
window.initAnimePage = initAnimePage;

window.addEventListener("layoutChange", (event) => {
	if (document.getElementById("anime-list-container")) {
		updateAnimeListLayout(event.detail.layout);
	}
});

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", bootstrapAnimePage);
} else {
	bootstrapAnimePage();
}

document.addEventListener("swup:enable", registerAnimeSwupListeners);
