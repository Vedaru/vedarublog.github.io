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

This site keeps Fuwari's 200ms fade and 700ms banner/grid transform, but does
not let the between-page scroll run at the same time. Fuwari can overlap those
two motions; here the scroll position is committed first and the transform is
the only motion the user sees.

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
      content fade out begins
      outgoing layout and scroll position stay exactly where they are
  → content:replace (main + #toc)
      new markup is in the DOM, still under the outgoing body layout
      TOC re-upgrades automatically
  → content:scroll
      the target scroll position is committed immediately
      (between-page scroll animation is disabled, not delayed)
  → scroll:end
      apply the target body layout, once, here
      #banner-wrapper and #main-grid start their single 700ms transform
  → animation:in:start / animation:in:end
      new content fades in while the transform is the only motion
  → after the transform
      requestIdleCallback → fancybox / mermaid / fonts / comments
```

The order is deliberate: **replace → commit scroll → apply layout → slide**.
Starting the reset at `visit:start` made the outgoing content slide while it
faded, then the incoming content replaced it mid-scroll. Applying the layout
at `visit:start` started the transform before the scroll was committed, so
the two motions competed. Now the outgoing page fades in place, the incoming
page starts at the target scroll position, and the 700ms transform carries it
from the outgoing layout to the new one.

If the incoming page is shorter, the browser clamps the scroll position at
`content:replace` while the new container is still at opacity 0, then the
next frame commits the target scroll. There is no visible jump. There is also
no `#page-height-extend`: a 300vh tail kept the old scroll alive but added
thousands of pixels of blank scroll below the footer on a tall viewport, then
the browser snapped back when the tail was removed. `overscroll-behavior-y:
none` on `html, body` keeps wheel and touch input from moving past the real
document boundary.

Key files:

| File | Responsibility |
| --- | --- |
| `src/scripts/transitions.ts` | All Swup hooks, body layout class, scroll chrome |
| `src/scripts/scroll-plugin.ts` | Instant between-page scroll, smooth same-page anchors |
| `src/scripts/page-enhancements.ts` | Idle-time enhancement loading |
| `src/scripts/runtime/after-transition.ts` | Wait for the 700ms transform |
| `src/scripts/toc-element.ts` | TOC custom element (observers only) |
| `src/components/widget/TOC.astro` | Server-rendered TOC markup |
| `src/styles/transition.css` | 200ms fade and 300ms entrance animation |
| `src/styles/layout-stable.css` | Banner/grid geometry and the single 700ms transform |
| `src/styles/main.css` | Cards, buttons, panels (no banner overrides) |

Rules for future changes:

- Do not flip the body's home class at `visit:start`. It starts the 700ms
  transform before the scroll is committed. Apply it from `scroll:end`.
- Do not animate the between-page scroll. Same-page anchors may still use the
  smooth scroll.
- Do not re-introduce a page-height spacer or a timer that removes it. The
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
