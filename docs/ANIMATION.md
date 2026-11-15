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
      if home <-> content and scrolled: scroll to top, await scroll:end
      add is-layout-moving for a desktop layout slide
  → content fade out (200ms)
      the outgoing page is at scroll 0 before the fade starts
  → content:replace (main + #toc)
      swap the containers
      flush the incoming layout while it is invisible
      sync the mobile banner
      start the incoming fade (remove is-animating)
      flip is-home / navbar
      #banner-wrapper, #banner and #main-grid start their 700ms transforms
      flush the class-flip styles
      the pre-scroll marks the visit as reset; the content-scroll pass is skipped
  → animation:in:start
      no-op for layout and fade; both already started at content:replace
  → animation:in:start / animation:in:end
      new content fades in while the transform continues
  → transform end
      remove is-layout-moving; let Swup finish the visit
      requestIdleCallback → fancybox / mermaid / fonts / comments
```

The scroll, the incoming content layout, the class-flip style recalculation
and the transform are serialized. For a home/non-home visit the `visit:start`
hook is asynchronous: it asks Swup's scroll plugin to animate to the top and
resolves on `scroll:end`. The outgoing document is still present at its real
height for the whole scroll, so no spacer is needed. At `content:replace`
the new article is flushed while it is invisible, the fade starts, then the
layout class flips and its styles are flushed again. All of that work happens
before the first transform frame, so the 700ms slide has no large layout or
style task under it.

`is-layout-moving` stays on `<html>` until the grid's `transitionend`. It
keeps the navbar blur disabled and tells `runAfterLayoutSettled` that the
layout is still moving. Swup's `animation:in:await` returns the transform-end
promise, so `animation:in:end` and `visit:end` also happen after the slide.
The early `is-animating` removal makes Swup's later removal a no-op and avoids
a full-document style recalculation in the middle of the transform.

Both sidebars stay sticky and visible, outside the Swup fade container. Their
only animated property is the sticky `top` compensation. It is declared
unconditionally with the same 700ms curve as the grid and banner, because it
is compensation for the grid's own translate and changes on exactly the frames
the transform changes. Snapping it is wrong: a transform on `#main-grid` makes
sticky clamp in the grid's local space, so a snapped offset clamps an unpinned
sidebar into the new offset's band for a frame and its top edge visibly jumps.
Animating both properties on the same clock keeps `top + translate` - the
rendered pin position - constant for pinned sidebars, on normal visits and
back/forward alike. The sidebars are never switched to static positioning and
never receive opacity or content-fade animations.

There is no `#page-height-extend`. A 300vh tail kept the old scroll alive but
added thousands of pixels of blank scroll below the footer on a tall
viewport, then the browser snapped back when the tail was removed. The
transform starts only after the scroll and content layout are done.
`overscroll-behavior-y: none` on `html, body` keeps wheel and touch input
from moving past the real document boundary.

Key files:

| File | Responsibility |
| --- | --- |
| `src/scripts/transitions.ts` | All Swup hooks, body layout class, scroll chrome |
| `src/scripts/page-enhancements.ts` | Idle-time enhancement loading |
| `src/scripts/runtime/after-transition.ts` | Wait for the 700ms transform |
| `src/scripts/toc-element.ts` | TOC custom element (observers only) |
| `src/components/widget/TOC.astro` | Server-rendered TOC markup |
| `src/styles/transition.css` | 200ms fade and 300ms entrance animation |
| `src/styles/layout-stable.css` | Banner/grid geometry and the single 700ms transform |
| `src/styles/main.css` | Cards, buttons, panels (no banner overrides) |

Rules for future changes:

- Apply the body's home class at `content:replace`, after flushing the
  incoming layout and starting the fade. Flush the class styles again before
  returning. Do not flip at `visit:start` or `animation:in:start`: the new
  article's layout or the class style recalculation would run in the middle
  of the transform.
- Keep `is-layout-moving` until the grid transform ends, and make
  `animation:in:await` wait for that transform. Do not remove Swup's root
  classes or enable the navbar blur while the slide is running.
- For a home/non-home visit, finish `swup.scrollTo(0, true)` and await
  `scroll:end` before flipping the body class. Run after the scroll plugin's
  position cache so back navigation keeps the outgoing scroll position. Do
  not add a timeout or a second scroll loop.
- Keep `smoothScrolling: true`. The ordered pre-scroll in `transitions.ts` is
  the only scroll call. Do not add another `scroll:top` override, a timeout,
  or a custom scroll loop.
- After a layout pre-scroll, set `visit.scroll.reset = false` so the scroll
  plugin does not force layout of the new article just to scroll to 0 again.
- Do not re-introduce a page-height spacer or a timer that removes it. The
  clamp happens while the content is invisible; a spacer becomes a scrollable
  blank region and makes the page look endless.
- Do not load third-party scripts during a visit. Use
  `scheduleEnhancements()` or an `IntersectionObserver`.
- Do not animate layout properties (`top`, `height`, `width`) inside
  `#main-grid` while the grid is transformed, except the two sticky sidebars'
  deliberate `top` compensation.
- The sticky `top` transition invalidates the root paint on every frame. Keep
  `html.is-layout-moving #top-row { contain: paint }` so that repaint cannot
  touch the navbar; its panels are absolutely positioned inside that box and
  their rects do not move.
- Keep the mobile banner / `.main-panel` swap (`setBannerVisibility`) on the
  committed content state, not on `body.is-home`. The body class flips at
  `visit:start` for the transform, but a `resize` during the visit (the mobile
  address bar) would then move the outgoing page's top edge mid-fade.
- Entrance animations use `animation-fill-mode: backwards`, never `forwards`.
  A forwards fill leaves `transform: translateY(0)` (or the last keyframe) on
  the element for the life of the page: that promotes it to a compositor
  layer, costs subpixel text AA, and makes sticky descendants clamp in a
  transformed space. The base style must already be the 100% state.
- Do not add `transform: translateZ(0)` or `backface-visibility: hidden` to
  static icons. The sticky offset animation invalidates the root layer during
  a slide, and a promoted icon repaints on its own every frame (measured: 235
  of 333 paint events on the home transition, against 97 without the
  promotion). Plain DOM is enough for icons that never animate by themselves.
- Do not switch the sidebars to `position: static` or fade them during a
  visit. They remain sticky and visible; only their `top` transitions.
- Keep the grid's `top` derived from
  `calc(var(--banner-height-home) - var(--banner-height-extend) - 3.5rem)`,
  never a separate `35vh`. The `3.5rem` is Fuwari's
  `MAIN_PANEL_OVERLAPS_BANNER_HEIGHT`: the banner always continues behind the
  content card, so the shared edge cannot expose the page background or
  shimmer while it moves. Both variables are rounded to a 4px grid (the head
  script writes `--banner-height-home` in snapped pixels), so the edge lands
  on the same composited pixel row at 1x/1.25x/1.5x/2x.
- The banner is two layers: `#banner-wrapper` translates by the extend value
  and `#banner` translates by `--bannerOffset` (15vh for centre) on content
  pages. Both use the same 700ms curve as `#main-grid`. Do not give the image
  its own duration or easing. The wrapper's transition must include `opacity`
  for the mobile hide; without it the banner disappears in one frame while
  the transform animates. Do not add `backface-visibility` or `will-change`
  to these layers: Fuwari does not, and a forced 3D layer makes the browser
  resample the banner bitmap independently of the grid while it slides.
- `backdrop-filter` on the navbar is allowed only when the page is idle
  (`html:not(.is-changing):not(.is-animating)`) and on desktop. The navbar
  transparency itself is CSS-only in `src/styles/navbar.css`; the transition
  script only toggles `data-is-home`, `.scrolled` and `--semifull-fade`.
- New heavy features belong in `page-enhancements.ts`, not in `Layout.astro`.
