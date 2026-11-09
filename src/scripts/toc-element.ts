/**
 * Sidebar table of contents.
 *
 * The markup is server-rendered by `TOC.astro` and `#toc` is a Swup container,
 * so every visit swaps in a fresh element. The custom element only needs to
 * wire observers to the new headings; it never builds HTML.
 */
import { runAfterLayoutSettled } from "./runtime/after-transition";
import { isScrollTweening, onScrollTweenEnd } from "./runtime/motion-state";

class TableOfContents extends HTMLElement {
	tocEl: HTMLElement | null = null;
	visibleClass = "visible";
	observer: IntersectionObserver;
	anchorNavTarget: HTMLElement | null = null;
	headingIdxMap = new Map<string, number>();
	headings: HTMLElement[] = [];
	sections: HTMLElement[] = [];
	tocEntries: HTMLAnchorElement[] = [];
	active: boolean[] = [];
	activeIndicator: HTMLElement | null = null;
	indicatorFrame = 0;
	pendingUpdate = false;
	stopTweenListener: (() => void) | null = null;
	initialized = false;

	constructor() {
		super();
		this.observer = new IntersectionObserver(
			this.markVisibleSection.bind(this),
			{ threshold: 0 },
		);
	}

	markVisibleSection = (entries: IntersectionObserverEntry[]) => {
		entries.forEach((entry) => {
			const id =
				entry.target.getAttribute("id") ||
				entry.target.children[0]?.getAttribute("id");
			const idx = id ? this.headingIdxMap.get(id) : undefined;
			if (idx !== undefined) this.active[idx] = entry.isIntersecting;

			if (
				entry.isIntersecting &&
				this.anchorNavTarget === entry.target.firstChild
			) {
				this.anchorNavTarget = null;
			}
		});

		if (!this.active.includes(true)) this.fallback();
		this.update();
	};

	toggleActiveHeading = () => {
		let i = this.active.length - 1;
		while (i >= 0 && !this.active[i]) {
			this.tocEntries[i]?.classList.remove(this.visibleClass);
			i--;
		}
		while (i >= 0 && this.active[i]) {
			this.tocEntries[i]?.classList.add(this.visibleClass);
			i--;
		}
		while (i >= 0) {
			this.tocEntries[i]?.classList.remove(this.visibleClass);
			i--;
		}

		// The indicator is an absolutely positioned child of <table-of-contents>,
		// while the entries live in the scrolling #toc-inner-wrapper. Measure
		// against the indicator's own containing block: the rect already
		// includes any scroll of that wrapper, and the parent is the box the
		// transform is resolved in.
		this.positionIndicator();
	};

	/** Place the highlight behind the entries currently marked visible. */
	positionIndicator = () => {
		const indicator = this.activeIndicator;
		if (!indicator) return;

		let first: HTMLAnchorElement | null = null;
		let last: HTMLAnchorElement | null = null;
		for (const entry of this.tocEntries) {
			if (!entry.classList.contains(this.visibleClass)) continue;
			first ??= entry;
			last = entry;
		}

		if (!first || !last) {
			// Keep the last position while fading out: resetting the transform
			// would make the next highlight slide in from the top of the list.
			indicator.style.opacity = "0";
			return;
		}

		const origin = indicator.parentElement?.getBoundingClientRect().top ?? 0;
		const top = first.getBoundingClientRect().top - origin;
		const bottom = last.getBoundingClientRect().bottom - origin;

		indicator.style.opacity = "1";
		indicator.style.transform = `translateY(${Math.floor(top)}px)`;
		indicator.style.height = `${Math.ceil(bottom - top)}px`;
	};

	/**
	 * `scrollToActiveHeading` keeps the active entry visible by smooth-scrolling
	 * the wrapper, which moves the entries after the highlight was placed. Follow
	 * it, or the highlight trails the list by however far it scrolled.
	 */
	handleTocScroll = () => {
		if (this.indicatorFrame) return;
		this.indicatorFrame = requestAnimationFrame(() => {
			this.indicatorFrame = 0;
			if (isScrollTweening()) {
				this.pendingUpdate = true;
				return;
			}
			this.positionIndicator();
		});
	};

	scrollToActiveHeading = () => {
		if (this.anchorNavTarget || !this.tocEl) return;
		const activeEntries = this.tocEntries.filter((entry) =>
			entry.classList.contains(this.visibleClass),
		);
		if (activeEntries.length === 0) return;

		const topmost = activeEntries[0];
		const bottommost = activeEntries[activeEntries.length - 1];
		const tocHeight = this.tocEl.clientHeight;

		const top =
			bottommost.getBoundingClientRect().bottom -
				topmost.getBoundingClientRect().top <
			0.9 * tocHeight
				? topmost.offsetTop - 32
				: bottommost.offsetTop - tocHeight * 0.8;

		this.tocEl.scrollTo({ top, left: 0, behavior: "smooth" });
	};

	update = () => {
		requestAnimationFrame(() => {
			// While a scroll tween owns the scroll position, every measurement
			// forces a reflow of the freshly swapped document - on a long post
			// that was more than a second of Layout for a 400ms animation. Skip,
			// then run one pass when the tween ends.
			if (isScrollTweening()) {
				this.pendingUpdate = true;
				return;
			}
			this.pendingUpdate = false;
			this.toggleActiveHeading();
			this.scrollToActiveHeading();
		});
	};

	flushPendingUpdate = () => {
		if (this.pendingUpdate) this.update();
	};

	fallback = () => {
		if (!this.sections.length) return;
		for (let i = 0; i < this.sections.length; i++) {
			const rect = this.sections[i].getBoundingClientRect();
			if (
				(rect.top > 0 && rect.top < window.innerHeight) ||
				(rect.bottom > 0 && rect.bottom < window.innerHeight) ||
				(rect.top < 0 && rect.bottom > window.innerHeight)
			) {
				this.active[i] = true;
			} else if (rect.top > window.innerHeight) {
				break;
			}
		}
	};

	handleAnchorClick = (event: Event) => {
		const anchor = event
			.composedPath()
			.find((element) => element instanceof HTMLAnchorElement);
		if (!anchor) return;
		const id = decodeURIComponent(anchor.hash?.substring(1));
		const idx = this.headingIdxMap.get(id);
		this.anchorNavTarget = idx !== undefined ? this.headings[idx] : null;
	};

	connectedCallback() {
		// The content entrance animation ends while the 700ms grid glide is
		// still running. Initialising here would read section geometry and
		// start an IntersectionObserver in the middle of the slide, which
		// shows up as a dropped frame on wide screens.
		runAfterLayoutSettled(() => this.init());
	}

	init() {
		if (this.initialized || !this.isConnected) return;
		this.initialized = true;

		this.tocEl = document.getElementById("toc-inner-wrapper");
		if (!this.tocEl) return;

		this.tocEl.addEventListener("click", this.handleAnchorClick, {
			capture: true,
		});
		this.tocEl.addEventListener("scroll", this.handleTocScroll, {
			passive: true,
		});
		this.stopTweenListener = onScrollTweenEnd(this.flushPendingUpdate);

		this.activeIndicator = this.querySelector("#active-indicator");
		this.tocEntries = Array.from(
			this.querySelectorAll<HTMLAnchorElement>("a[href^='#']"),
		);
		if (this.tocEntries.length === 0) return;

		this.sections = new Array(this.tocEntries.length);
		this.headings = new Array(this.tocEntries.length);
		for (let i = 0; i < this.tocEntries.length; i++) {
			const id = decodeURIComponent(
				this.tocEntries[i].hash?.substring(1),
			);
			const heading = document.getElementById(id);
			const section = heading?.parentElement;
			if (
				heading instanceof HTMLElement &&
				section instanceof HTMLElement
			) {
				this.headings[i] = heading;
				this.sections[i] = section;
				this.headingIdxMap.set(id, i);
			}
		}
		this.active = new Array(this.tocEntries.length).fill(false);

		// Restore the indicator after the server-rendered (hidden) markup.
		this.activeIndicator?.classList.remove("hidden");

		this.sections.forEach((section) => {
			if (section) this.observer.observe(section);
		});
		this.fallback();
		this.update();
	}

	disconnectedCallback() {
		this.sections.forEach((section) => this.observer.unobserve(section));
		this.observer.disconnect();
		this.tocEl?.removeEventListener("click", this.handleAnchorClick);
		this.tocEl?.removeEventListener("scroll", this.handleTocScroll);
		this.stopTweenListener?.();
		this.stopTweenListener = null;
		if (this.indicatorFrame) cancelAnimationFrame(this.indicatorFrame);
	}
}

if (!customElements.get("table-of-contents")) {
	customElements.define("table-of-contents", TableOfContents);
}
