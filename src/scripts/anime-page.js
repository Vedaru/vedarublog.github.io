/** 番剧页客户端逻辑（Swup 切换后需重新初始化） */

let animeLazyObserver = null;
let animeSwupListenersRegistered = false;
let hiddenAnimeItems = null;
let hiddenAnimeLoaded = false;
let hiddenAnimeLoading = false;

const STATUS_CLASS_MAP = {
	watching:
		"bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
	completed:
		"bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
	planned:
		"bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
	onhold:
		"bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
	dropped:
		"bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};
const STATUS_ICON_MAP = {
	watching: "▶",
	completed: "✓",
	planned: "❤",
	onhold: "⏸",
	dropped: "✗",
};

async function loadHiddenAnimeItems() {
	if (hiddenAnimeLoaded || hiddenAnimeLoading) return hiddenAnimeItems;
	hiddenAnimeLoading = true;
	try {
		const res = await fetch("/api/anime-list.json");
		if (!res.ok) {
			hiddenAnimeItems = [];
		} else {
			const data = await res.json();
			hiddenAnimeItems = Array.isArray(data?.items) ? data.items : [];
		}
	} catch {
		hiddenAnimeItems = [];
	}
	hiddenAnimeLoaded = true;
	hiddenAnimeLoading = false;
	return hiddenAnimeItems;
}

function buildAnimeCard(anime) {
	const tpl = document.getElementById("anime-card-template");
	if (!tpl) return null;
	const node = tpl.content.firstElementChild.cloneNode(true);
	node.setAttribute("data-anime-status", anime.status);

	const a = node.querySelector("a");
	a.href = anime.link;

	const img = node.querySelector("img");
	if (img) {
		img.src = anime.cover;
		img.alt = anime.title;
	}

	const statusBadge = node.querySelector(".status-badge");
	if (statusBadge) {
		statusBadge.className = `status-badge absolute top-2 left-2 px-2 py-1 rounded-md text-xs font-medium ${STATUS_CLASS_MAP[anime.status] || ""}`;
		const spans = statusBadge.querySelectorAll("span");
		if (spans[0]) spans[0].textContent = STATUS_ICON_MAP[anime.status] || "?";
		if (spans[1]) spans[1].textContent = anime.status;
	}

	const ratingEl = node.querySelector(".rating");
	if (ratingEl) ratingEl.textContent = String(anime.rating ?? "");

	node.querySelector(".title").textContent = anime.title;
	const descEl = node.querySelector(".desc");
	descEl.textContent = anime.description;
	descEl.setAttribute("title", anime.description);

	const labels = node.querySelectorAll(
		".space-y-1 .flex > span.text-black\\/50, .space-y-1 .flex > span.text-black\\/50",
	);
	const fields = node.querySelectorAll(".space-y-1 .flex");
	if (fields[0]) {
		const labelSpan = fields[0].querySelector("span:first-child");
		const yearEl = fields[0].querySelector(".year");
		if (labelSpan) labelSpan.textContent = window.__animeI18n?.year || "Year";
		if (yearEl) yearEl.textContent = anime.year || "";
	}
	if (fields[1]) {
		const labelSpan = fields[1].querySelector("span:first-child");
		const studioEl = fields[1].querySelector(".studio");
		if (labelSpan)
			labelSpan.textContent = window.__animeI18n?.studio || "Studio";
		if (studioEl) {
			studioEl.textContent = anime.studio || "";
			studioEl.setAttribute("title", anime.studio || "");
		}
	}

	const genresEl = node.querySelector(".genres");
	if (genresEl) {
		genresEl.innerHTML = "";
		(anime.genre || []).forEach((g) => {
			const span = document.createElement("span");
			span.className =
				"px-1.5 py-0.5 bg-[var(--btn-regular-bg)] text-black/70 dark:text-white/70 rounded text-xs";
			span.textContent = g;
			genresEl.appendChild(span);
		});
	}

	const progressEl = node.querySelector(".progress");
	if (progressEl) {
		if (anime.status === "watching") {
			progressEl.hidden = false;
			const total = Number(anime.totalEpisodes) || 0;
			const progress = Number(anime.progress) || 0;
			const pct = total > 0 ? (progress / total) * 100 : 0;
			const bar = progressEl.querySelector(".progress-bar");
			const label = progressEl.querySelector(".progress-label");
			if (bar) bar.style.width = `${pct}%`;
			if (label)
				label.textContent = `${progress}/${total} (${Math.round(pct)}%)`;
		} else {
			progressEl.hidden = true;
		}
	}

	return node;
}

function updateAnimeListLayout(layout, shouldAnimate = true) {
	const animeListContainer = document.getElementById("anime-list-container");
	if (!animeListContainer) return;
	animeListContainer.dataset.currentLayout = layout;

	const animeItems = Array.from(
		document.querySelectorAll("[data-anime-status]"),
	);
	const visibleItems = animeItems.filter(
		(item) => item.offsetParent !== null,
	);
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
	animeListContainer.classList.remove(
		"grid-cols-1",
		"md:grid-cols-2",
		"lg:grid-cols-3",
	);

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
	return true;
}

function initAnimeFilterButtons() {
	const filterTags = document.querySelectorAll(".anime-filter-tag");
	const sentinel = document.getElementById("infinite-scroll-sentinel");
	const listContainer = document.getElementById("anime-list-container");

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

			listContainer.querySelectorAll(".initial-hidden").forEach((el) => {
				el.classList.remove("hidden", "initial-hidden");
			});

			const status = this.getAttribute("data-status");
			const animeItems = Array.from(listContainer.children).filter(
				(item) => item.hasAttribute("data-anime-status"),
			);
			const itemsToHide = [];
			const itemsToShow = [];
			const itemsToKeep = [];

			animeItems.forEach((item) => {
				const itemStatus = item.getAttribute("data-anime-status");
				const shouldShow = status === "all" || itemStatus === status;
				const isCurrentlyVisible =
					!item.classList.contains("anime-hidden");

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
				itemsToHide.forEach((item) =>
					item.classList.add("anime-fade-out"),
				);
				setTimeout(runAnimation, 200);
			} else {
				runAnimation();
			}
		};

		tag.addEventListener("click", clickHandler);
		window.animeFilterEventListeners.push([tag, "click", clickHandler]);
	});

	if (sentinel && listContainer) {
		animeLazyObserver = new IntersectionObserver(
			async (entries) => {
				if (!entries[0].isIntersecting) return;
				const BATCH_SIZE = 24;
				if (!hiddenAnimeLoaded) {
					await loadHiddenAnimeItems();
				}
				const remaining = (hiddenAnimeItems || []).filter(
					(item) =>
						!listContainer.querySelector(
							`[data-anime-id="${CSS.escape(String(item.link))}"]`,
						),
				);
				if (remaining.length === 0) {
					sentinel.style.display = "none";
					animeLazyObserver?.disconnect();
					return;
				}

				const batch = remaining.slice(0, BATCH_SIZE);
				const fragment = document.createDocumentFragment();
				for (const anime of batch) {
					const node = buildAnimeCard(anime);
					if (!node) continue;
					node.setAttribute("data-anime-id", String(anime.link));
					node.classList.add("anime-fade-in-active");
					fragment.appendChild(node);
				}

				requestAnimationFrame(() => {
					listContainer.appendChild(fragment);
					if (remaining.length <= BATCH_SIZE) {
						sentinel.style.display = "none";
						animeLazyObserver?.disconnect();
					}
				});
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

export {};
