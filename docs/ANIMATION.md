# Animation architecture

The page motion follows Fuwari's design, using upstream commit `6d39b0d` as
a reference. The goal is to understand its animation ownership and sequencing,
not to synchronize the entire blog with upstream or replace blog-specific
components and geometry. In particular, the main panel starts at the banner
boundary without Fuwari's 3.5rem overlap.

## Page lifecycle

Swup replaces only `#swup-container` and `#toc`. The navbar, banner, sidebars,
and other persistent chrome stay mounted. Head updates are enabled so page
metadata and page-specific head slots still follow navigation.

1. `link:click` resets `--content-delay` and applies Fuwari's navbar threshold
   check.
2. `visit:start` toggles `lg:is-home` for the destination, reveals the 300vh
   `#page-height-extend` tail, and marks the sidebar TOC `toc-not-ready`.
3. Fuwari's normal 200ms outgoing and incoming `transition-swup-fade` runs.
   Swup ScrollPlugin owns scrolling with `smoothScrolling: true`.
4. `page:view` keeps the temporary tail visible after content replacement.
5. `visit:end` schedules optional blog enhancements for idle time and starts
   Fuwari's 200ms cleanup timer.
6. Cleanup hides the tail, removes `toc-not-ready`, and refreshes scroll-driven
   chrome.

There is no `animation:in:await` transform wait, early-scroll override, custom
scroll acceleration, held outgoing fade, secondary scroll writer, or
`is-layout-moving` state.

## Animation ownership

| Area | Implementation |
| --- | --- |
| Content navigation | `src/styles/transition.css`, Fuwari's 200ms Swup fade and 300ms entrance keyframes |
| Banner and grid | Native `transition duration-700`; `lg:is-home` selects CSS transforms in `layout-stable.css` |
| Banner crop | `#banner` retains its 700ms transition and reveal from `opacity-0 scale-105` |
| Sticky sidebars | Native sticky elements with `transition-all duration-700`; no entrance class or identity transform on the sticky container |
| Widget entrances | Individual widgets and Fuwari's sidebar wrapper use `onload-animation` and the shared delay ladder |
| Navbar | `onload-animation`, native mask gradient, and Fuwari's scroll-threshold classes |
| Sidebar TOC | Fixed-height scrolling viewport, upstream-style active indicator, and native custom-element behavior |
| Cards and controls | Shared Fuwari `transition`, expansion, button, link, panel, and metadata rules in `main.css` |
| Back to top | Native `window.scroll({ top: 0, behavior: "smooth" })` |
| Optional enhancements | Idle-scheduled after `visit:end`; never a gate for content replacement or animation completion |

JavaScript does not write banner or grid transforms during a visit. Do not add
rAF transform drivers, geometry polling, layout-settled events, or another
page-transition coordinator.

## TOC contract

`src/scripts/toc-element.ts` follows Fuwari's observer and indicator design. It
waits for `.prose` to finish its entrance animation, observes heading sections,
positions `#active-indicator` with `top` and `height`, and scrolls
`#toc-inner-wrapper` to the active entries.

Keep the upstream spacer elements and `h-full` on `#toc`. Do not insert a
positioned ancestor between the fixed TOC viewport and its contents, and do
not compensate indicator geometry with wrapper-scroll transforms.

Local heading filtering, depth badges, right-sidebar support, and floating TOC
features may remain. They must not alter the vendored sidebar TOC behavior.

## Blog-only motion

`custom-animations.css` contains only blog feature keyframes and reduced-motion
rules. Feature-specific animation in albums, skills, music, comments, search,
and other custom components is outside the page-transition lifecycle. Shared
Fuwari components must not copy those custom timings or effects.

The reduced-motion block disables optional motion. It does not introduce a
second navigation lifecycle.

## Verification

For changes to Fuwari-owned animation code:

1. Compare the changed rules and lifecycle hooks with upstream `6d39b0d`.
2. Run `git diff --check` and `pnpm exec astro check`.
3. Run `pnpm build` and inspect generated home, post, and bilingual markup.
4. In a production browser build, exercise home-to-post, post-to-home,
   post-to-post, browser back/forward, bottom-of-home navigation, anchor links,
   sidebar TOC tracking, and mobile navigation.
5. Confirm the fade remains 200ms, banner/grid transforms remain 700ms, Swup
   remains the sole page-navigation scroll writer, and the TOC initializes and
   tracks after both initial load and Swup replacement.
