/** Calendar widget */

interface CalendarPost {
	id: string;
	date: string;
	title?: string;
	updated?: string;
}

export function initCalendar(config: { monthNames: string[]; yearSuffix: string }) {
  const monthNames = config.monthNames;
  const yearSuffix = config.yearSuffix;

const CALENDAR_DATA_CACHE_KEY = "__calendarWidgetPostsData";

	let allPostsData: CalendarPost[] = [];
	const postDateMap = {};
	const postsByMonth = {};
	const stats = {
		hasPostInYear: {},
		hasPostInMonth: {},
		minYear: new Date().getFullYear(),
		maxYear: new Date().getFullYear() + 5,
	};

	function resetProcessedData() {
		Object.keys(postDateMap).forEach((key) => delete postDateMap[key]);
		Object.keys(postsByMonth).forEach((key) => delete postsByMonth[key]);
		Object.keys(stats.hasPostInYear).forEach(
			(key) => delete stats.hasPostInYear[key],
		);
		Object.keys(stats.hasPostInMonth).forEach(
			(key) => delete stats.hasPostInMonth[key],
		);
		stats.minYear = new Date().getFullYear();
		stats.maxYear = new Date().getFullYear() + 5;
	}

	function applyPostsData(posts: CalendarPost[]) {
		allPostsData = Array.isArray(posts) ? posts : [];
		resetProcessedData();
		processPostsData(allPostsData);
		const currentPostId = getCurrentPostId();
		if (currentPostId) {
			const matchedPost = allPostsData.find((p) => p.id === currentPostId);
			if (matchedPost) {
				const [y, m] = matchedPost.date.split("-");
				currentYear = parseInt(y);
				currentMonth = parseInt(m) - 1;
			}
		}
	}

	function arePostsEqual(oldPosts: CalendarPost[], newPosts: CalendarPost[]) {
		if (oldPosts.length !== newPosts.length) return false;
		for (let i = 0; i < oldPosts.length; i++) {
			const a = oldPosts[i];
			const b = newPosts[i];
			if (
				a.id !== b.id ||
				a.date !== b.date ||
				a.title !== b.title ||
				a.updated !== b.updated
			) {
				return false;
			}
		}
		return true;
	}

	async function fetchCalendarData(): Promise<CalendarPost[] | null> {
		try {
			const res = await fetch("/api/calendar-data.json");
			const data = await res.json();
			return Array.isArray(data) ? (data as CalendarPost[]) : [];
		} catch (error) {
			console.error("Failed to fetch calendar data:", error);
			return null;
		}
	}

	function processPostsData(posts: CalendarPost[]) {
		if (!posts || posts.length === 0) return;
		posts.forEach((post) => {
			const [yStr, mStr] = post.date.split("-");
			const year = parseInt(yStr);
			const month = parseInt(mStr); // 1-12
			stats.hasPostInYear[year] = true;
			stats.hasPostInMonth[`${year}-${month}`] = true;

			if (year < stats.minYear) stats.minYear = year;

			const dateKey = post.date;
			const monthKey = `${year}-${month - 1}`; // JS Month is 0-11

			if (!postDateMap[dateKey]) postDateMap[dateKey] = [];
			postDateMap[dateKey].push(post);

			if (!postsByMonth[monthKey]) postsByMonth[monthKey] = [];
			postsByMonth[monthKey].push(post);
		});
	}

	const now = new Date();
	const todayYear = now.getFullYear();
	const todayMonth = now.getMonth();
	const todayDate = now.getDate();

	let currentYear = todayYear;
	let currentMonth = todayMonth;
	let selectedDateKey: string | null = null;
	let currentView = "day";

	const dom = {
		titleContainer: document.getElementById("calendar-title-container")!,
		title: document.getElementById("calendar-title")!,
		prevBtn: document.getElementById("prev-month-btn")!,
		nextBtn: document.getElementById("next-month-btn")!,
		backTodayBtn: document.getElementById("back-to-today-btn")!,
		calendarView: document.getElementById("calendar-view")!,
		selectionPanel: document.getElementById("selection-panel")!,
		selectionContent: document.getElementById("selection-content")!,
		grid: document.getElementById("calendar-grid")!,
		postsList: document.getElementById("calendar-posts-list")!,
		divider: document.getElementById("calendar-posts-divider")!,
	};

	function getCurrentPostId() {
		const path = window.location.pathname;
		if (!allPostsData || allPostsData.length === 0) return null;
		const decodedPath = decodeURIComponent(path);
		const normalizedPath = decodedPath.endsWith("/")
			? decodedPath.slice(0, -1)
			: decodedPath;

		const matchedPost = allPostsData.find((post) => {
			return normalizedPath.endsWith(`/${post.id}`);
		});
		return matchedPost ? matchedPost.id : null;
	}

	let remoteDataLoaded = false;
	let remoteDataLoading = false;

	async function loadRemoteCalendarData() {
		if (remoteDataLoaded || remoteDataLoading) return;
		remoteDataLoading = true;
		try {
			const remoteData = await fetchCalendarData();
			if (!Array.isArray(remoteData)) return;

			if (!arePostsEqual(allPostsData, remoteData)) {
				applyPostsData(remoteData);
				renderCalendar();
			}
			window[CALENDAR_DATA_CACHE_KEY] = remoteData;
			remoteDataLoaded = true;
		} finally {
			remoteDataLoading = false;
		}
	}

	function onCalendarInteraction() {
		void loadRemoteCalendarData();
	}

	async function init() {
		const widgetRoot = document.getElementById("calendar-widget");
		if (widgetRoot?.dataset.calendarInitialized === "true") return;
		if (widgetRoot) widgetRoot.dataset.calendarInitialized = "true";

		setupEventListeners();

		const cachedData = window[CALENDAR_DATA_CACHE_KEY] as
			| CalendarPost[]
			| undefined;
		if (Array.isArray(cachedData) && cachedData.length > 0) {
			applyPostsData(cachedData);
			remoteDataLoaded = true;
		}
		renderCalendar();
	}

	function setupEventListeners() {
		dom.titleContainer.addEventListener("click", (e) => {
			onCalendarInteraction();
			e.stopPropagation();
			if (currentView === "day") showMonthPicker();
			else if (currentView === "month") showYearPicker();
			else closeSelectionPanel();
		});

		dom.prevBtn.addEventListener("click", () => {
			onCalendarInteraction();
			currentMonth--;
			if (currentMonth < 0) {
				currentMonth = 11;
				currentYear--;
			}
			renderCalendar();
		});

		dom.nextBtn.addEventListener("click", () => {
			onCalendarInteraction();
			currentMonth++;
			if (currentMonth > 11) {
				currentMonth = 0;
				currentYear++;
			}
			renderCalendar();
		});

		dom.backTodayBtn.addEventListener("click", () => {
			onCalendarInteraction();
			currentYear = todayYear;
			currentMonth = todayMonth;
			selectedDateKey = null;
			if (currentView !== "day") closeSelectionPanel();
			else renderCalendar();
		});

		dom.grid.addEventListener("click", (e) => {
			onCalendarInteraction();
			const target = e.target;
			if (!(target instanceof Element)) return;
			const cell = target.closest(".calendar-day");
			if (!cell) return;
			const dateKey = cell.getAttribute("data-date");

			if (selectedDateKey === dateKey) selectedDateKey = null;
			else selectedDateKey = dateKey;

			renderCalendar();
			if (selectedDateKey && postDateMap[selectedDateKey]) {
				renderPostList(postDateMap[selectedDateKey]);
			} else {
				showMonthlyPosts();
			}
		});

		dom.selectionContent.addEventListener("click", (e) => {
			onCalendarInteraction();
			const target = e.target;
			if (!(target instanceof Element)) return;
			const monthItem = target.closest(".month-item");
			const yearItem = target.closest(".year-item");

			if (monthItem) {
				e.stopPropagation();
				const monthRaw = monthItem.getAttribute("data-month");
				if (monthRaw) {
					currentMonth = parseInt(monthRaw, 10);
				}
				closeSelectionPanel();
			} else if (yearItem) {
				e.stopPropagation();
				const yearRaw = yearItem.getAttribute("data-year");
				if (yearRaw) {
					currentYear = parseInt(yearRaw, 10);
				}
				showMonthPicker();
			}
		});

		document.addEventListener("click", (e) => {
			if (currentView === "day") return;
			const widget = document.getElementById("calendar-widget");
			const target = e.target;
			if (
				widget &&
				(!(target instanceof Node) || !widget.contains(target))
			) {
				closeSelectionPanel();
			}
		});
	}

	function updateHeader() {
		dom.title.textContent = `${currentYear}${yearSuffix} ${monthNames[currentMonth]}`;
		const isCurrentRealMonth =
			currentYear === todayYear && currentMonth === todayMonth;
		const shouldShowReset = !isCurrentRealMonth || selectedDateKey !== null;

		if (shouldShowReset) dom.backTodayBtn.classList.remove("invisible");
		else dom.backTodayBtn.classList.add("invisible");

		const isDayView = currentView === "day";
		dom.prevBtn.style.visibility = isDayView ? "visible" : "hidden";
		dom.nextBtn.style.visibility = isDayView ? "visible" : "hidden";
	}

	function renderCalendar() {
		updateHeader();
		const firstDayOfMonth =
			(new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;
		const daysInMonth = new Date(
			currentYear,
			currentMonth + 1,
			0,
		).getDate();

		let html = "";
		if (firstDayOfMonth > 0) {
			html += `<div class="aspect-square"></div>`.repeat(firstDayOfMonth);
		}

		for (let day = 1; day <= daysInMonth; day++) {
			const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
			const posts = postDateMap[dateKey] || [];
			const hasPost = posts.length > 0;
			const count = posts.length;
			const isToday =
				currentYear === todayYear &&
				currentMonth === todayMonth &&
				day === todayDate;
			const isSelected = selectedDateKey === dateKey;

			let bgClass =
				"hover:bg-[var(--btn-plain-bg-hover)] text-neutral-700 dark:text-neutral-300";

			if (isSelected) {
				bgClass =
					"is-selected bg-[var(--primary)] text-white shadow-md";
			} else if (isToday) {
				bgClass =
					"is-today text-[var(--primary)] font-bold bg-[var(--primary)]/10 ring-1 ring-[var(--primary)] ring-inset";
			} else if (hasPost) {
				bgClass =
					"has-post font-bold text-neutral-900 dark:text-neutral-100 hover:bg-[var(--btn-plain-bg-hover)]";
			}

			const attrs = [
				`class="calendar-day aspect-square flex items-center justify-center rounded-md cursor-pointer relative transition-colors duration-200 ${bgClass}"`,
				`data-date="${dateKey}"`,
			];
			if (hasPost && !isSelected) attrs.push('data-has-post="true"');
			if (hasPost && count > 1) attrs.push(`data-count="${count}"`);

			html += `<div ${attrs.join(" ")}>${day}</div>`;
		}

		dom.grid.innerHTML = html;
		if (selectedDateKey && postDateMap[selectedDateKey]) {
			renderPostList(postDateMap[selectedDateKey]);
		} else {
			showMonthlyPosts();
		}
	}

	function showMonthlyPosts() {
		const key = `${currentYear}-${currentMonth}`; // Month is 0-11
		const posts = postsByMonth[key] || [];
		renderPostList(posts);
	}

	function renderPostList(posts) {
		if (!dom.postsList) return;
		if (posts.length === 0) {
			dom.divider.classList.add("hidden");
			dom.postsList.innerHTML = "";
			return;
		}

		dom.divider.classList.remove("hidden");
		const currentPostId = getCurrentPostId();

		const listHtml = posts
			.map((post) => {
				const [, m, d] = post.date.split("-");
				const dateStr = `${parseInt(m)}-${parseInt(d)}`;

				const isCurrentPost = post.id === currentPostId;
				let containerClass =
					"flex items-center justify-between text-sm transition-colors px-2 py-2 rounded-lg group border border-transparent";
				let titleClass = "truncate flex-1 font-bold transition-colors";
				let dateClass =
					"text-xs ml-2 whitespace-nowrap transition-colors";

				if (isCurrentPost) {
					containerClass +=
						" bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/10";
					dateClass += " text-[var(--primary)]/80";
				} else {
					containerClass +=
						" text-neutral-700 dark:text-neutral-300 hover:text-[var(--primary)] dark:hover:text-[var(--primary)] hover:bg-[var(--btn-plain-bg-hover)]";
					dateClass +=
						" text-neutral-400 group-hover:text-[var(--primary)]/70";
				}

				return `
            <a href="/posts/${post.id}/" class="${containerClass}">
                <span class="${titleClass}">${post.title}</span>
                <span class="${dateClass}">${dateStr}</span>
            </a>
        `;
			})
			.join("");

		if (dom.postsList.innerHTML !== listHtml) {
			dom.postsList.innerHTML = listHtml;
		}
	}

	function showMonthPicker() {
		currentView = "month";
		updateHeader();
		dom.selectionPanel.classList.remove("hidden");
		requestAnimationFrame(() => {
			dom.selectionPanel.classList.remove("opacity-0");
		});

		dom.selectionContent.className =
			"w-full h-full p-4 grid grid-cols-3 gap-3 content-center";

		let html = "";
		monthNames.forEach((name, index) => {
			const isCurrentMonth = index === currentMonth;
			const hasPost = stats.hasPostInMonth[`${currentYear}-${index + 1}`];
			let cls =
				"month-item cursor-pointer rounded-lg flex items-center justify-center p-2 transition-colors hover:bg-[var(--btn-plain-bg-hover)] relative text-sm font-bold";
			if (isCurrentMonth)
				cls +=
					" border border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/5";
			else cls += " text-neutral-700 dark:text-neutral-300 border border-transparent";
			if (hasPost) cls += " has-post";

			html += `<div class="${cls}" data-month="${index}">${name}</div>`;
		});
		dom.selectionContent.innerHTML = html;
	}

	function showYearPicker() {
		currentView = "year";
		updateHeader();
		dom.selectionContent.className =
			"w-full h-full p-2 grid grid-cols-4 gap-2 content-start overflow-y-auto";

		let html = "";
		for (let y = stats.minYear; y <= stats.maxYear; y++) {
			const isCurrent = y === currentYear;
			const hasPost = stats.hasPostInYear[y];
			let cls =
				"year-item cursor-pointer rounded-lg flex items-center justify-center py-3 transition-colors hover:bg-[var(--btn-plain-bg-hover)] relative text-sm font-bold";
			if (isCurrent)
				cls +=
					" border border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/5";
			else cls += " text-neutral-700 dark:text-neutral-300 border border-transparent";
			if (hasPost) cls += " has-post";

			html += `<div class="${cls}" data-year="${y}" id="year-${y}">${y}</div>`;
		}
		dom.selectionContent.innerHTML = html;

		setTimeout(() => {
			const el = document.getElementById(`year-${currentYear}`);
			if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
		}, 50);
	}

	function closeSelectionPanel() {
		dom.selectionPanel.classList.add("opacity-0");
		setTimeout(() => {
			dom.selectionPanel.classList.add("hidden");
			currentView = "day";
			renderCalendar();
		}, 200);
	}

	function scheduleInit() {
		const widgetRoot = document.getElementById("calendar-widget");
		if (!widgetRoot || widgetRoot.dataset.calendarInitialized === "true") {
			return;
		}

		const run = () => init();

		const runWhenIdle = () => {
			if ("requestIdleCallback" in window) {
				requestIdleCallback(run, { timeout: 2500 });
			} else {
				setTimeout(run, 200);
			}
		};

		if ("IntersectionObserver" in window) {
			const observer = new IntersectionObserver(
				(entries) => {
					if (!entries.some((entry) => entry.isIntersecting)) return;
					observer.disconnect();
					runWhenIdle();
				},
				{ rootMargin: "120px 0px" },
			);
			observer.observe(widgetRoot);
			return;
		}

		runWhenIdle();
	}

	scheduleInit();
	document.addEventListener("swup:content:replace", scheduleInit);
}
