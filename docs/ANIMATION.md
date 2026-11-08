# Page transition architecture

This site follows Fuwari's motion model. The goal is one continuous glide from
click to settled page, with optional work kept off the main thread until the
glide is over.

## Why Fuwari feels smoother

Fuwari's transition is not a special animation library. It is three decisions:

1. **The layout flip happens at `visit:start`, not after the content swap.**
   The body's `is-home` class changes on the click. The 700ms banner/grid
   `transform` starts on the compositor immediately, then Swup's 200ms content
   fade runs *inside* that movement. The user sees one motion.
2. **Only `main` and the TOC are swapped.** Everything else (navbar, sidebar,
   music player) is persistent. There is no per-visit re-init of the shell.
3. **Optional work runs after the motion.** Fuwari's TOC is server-rendered and
   a custom element waits for the content entrance animation. No comments,
   diagrams, lightboxes or analytics are loaded during the transition.

## What this site did instead

Measured with Chrome for Testing at 4x CPU throttle (a mid-range phone):

| Symptom | Cause |
| --- | --- |
| The old page faded, then the grid slid | `is-home` was flipped at `page:view`, ~270ms after the click |
| A 239ms long task right after the swap | Twikoo (1.1MB) was initialized on every post visit, even though the comment box was below the fold |
| A 60-100ms task after the slide | `mermaid.core` (662KB), fancybox, KaTeX CSS, code-collapse and font CSS were all imported at 220/800ms |
| A full-width blur repaint every frame | The navbar and panels used `backdrop-filter` on top of the moving banner |
| Extra layout work inside the transformed grid | Sticky sidebars animated `top` with `transition-all`, the typewriter wrote text during visits, and the iconify runtime upgraded icons on scroll/click |
| Repeated banner-layout bugs | Banner rules were spread over five files with `!important` overrides |

## Current model

```
click
  → visit:start
      body.is-home toggled
      #banner-wrapper and #main-grid start 700ms transform
      sticky sidebar top frozen for the visit
  → content fade out (200ms) while the old page stays at its scroll position
  → content:replace (main + #toc)
      TOC is already server-rendered; custom element re-upgrades
  → smooth scroll to top (Fuwari's scroll plugin, after the swap)
  → content fade in (200ms)
  → animation:in:end
      wait for the grid transform end event (or 900ms fallback)
      then requestIdleCallback → fancybox / mermaid / fonts / comments
  → scroll:end
      release the sticky sidebar top
```

The old page is deliberately not scrolled during its fade-out. Starting the
reset at `visit:start` made the outgoing content slide while it faded, then
the incoming content replaced it mid-scroll: that was the "interrupted"
transition. Swup's scroll plugin now starts the reset from `content:scroll`,
after the swap, exactly like Fuwari.

There is no `#page-height-extend` tail. A 300vh tail kept the old scroll
position alive, but on a tall viewport it also gave the page thousands of
pixels of empty scrollable space below the footer. Instead the browser clamps
the scroll position at `content:replace`, while both the outgoing and incoming
containers are at opacity 0, then the reset animates from the new page's
natural maximum. The clamp is invisible and the document always ends at the
real footer.

Key files:

| File | Responsibility |
| --- | --- |
| `src/scripts/transitions.ts` | All Swup hooks, body layout class, scroll chrome |
| `src/scripts/scroll-plugin.ts` | Swup scroll plugin with Fuwari's timing |
| `src/scripts/page-enhancements.ts` | Idle-time enhancement loading |
| `src/scripts/runtime/after-transition.ts` | Wait for the 700ms transform |
| `src/scripts/toc-element.ts` | TOC custom element (observers only) |
| `src/components/widget/TOC.astro` | Server-rendered TOC markup |
| `src/styles/transition.css` | 200ms fade and 300ms entrance animation |
| `src/styles/layout-stable.css` | Banner/grid geometry and the single 700ms transform |
| `src/styles/main.css` | Cards, buttons, panels (no banner overrides) |

Rules for future changes:

- Do not add layout timers that re-apply the home class. Flip it once at
  `visit:start`.
- Do not start the scroll reset at `visit:start`. It belongs after
  `content:replace`; the outgoing page must finish its fade before the page
  moves.
- Do not re-introduce a tall spacer to "protect" the scroll position. The
  clamp happens while the content is invisible; a spacer becomes a scrollable
  blank region and makes the page look endless.
- Do not load third-party scripts during a visit. Use
  `scheduleEnhancements()` or an `IntersectionObserver`.
- Do not animate layout properties (`top`, `height`, `width`) inside
  `#main-grid` while the grid is transformed.
- Keep the grid's `top` derived from
  `calc(var(--banner-height-home) - var(--banner-height-extend))`, never a
  separate `35vh`. The extend variable is rounded to a 4px grid, so `35vh`
  drifts by 1-4px and the seam becomes visible.
- The banner is two layers: `#banner-wrapper` translates by the extend value
  and `#banner` translates by `--bannerOffset` (15vh for centre) on content
  pages. Both use the same 700ms curve as `#main-grid`. Do not give the image
  its own duration or easing.
- `backdrop-filter` on the navbar is allowed only when the page is idle
  (`html:not(.is-changing):not(.is-animating)`) and on desktop. The navbar
  transparency itself is CSS-only in `src/styles/navbar.css`; the transition
  script only toggles `data-is-home`, `.scrolled` and `--semifull-fade`.
- New heavy features belong in `page-enhancements.ts`, not in `Layout.astro`.
