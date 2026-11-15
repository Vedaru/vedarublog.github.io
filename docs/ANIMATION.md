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

This site keeps Fuwari's 200ms fade and 700ms banner/grid transform, and runs
the custom scroll tween on the same clock. The transform starts on the click
frame.

## Measured results (2026-11-15)

Production build (`pnpm build` + `astro preview`), 1440x900 dpr2, 4x CPU
throttle. The same external harness was used before and after. Fuwari is the
reference measured on the same machine.

| Path / metric | Before (`2808426`) | After (`486b9cb`) | Fuwari |
| --- | ---: | ---: | ---: |
| home → post p95 gap | 49.9ms | **16.8ms** | 33.3ms |
| home → post p99 gap | 166.7ms | **100ms** | 116.6ms |
| home → post main task | 636ms | **462ms** | 518ms |
| home → post style | 271ms | **178ms** | 230ms |
| home → post layout | 108ms | **62ms** | 82ms |
| home → post long tasks | 52@23, 133@313, 53@790 | **50@20, 68@302** | 77/60/76 |
| post → home p95 gap | 16.8ms | **16.8ms** | n/a |
| post → home p99 gap | 83.3ms | **66.7ms** | n/a |
| post → home long tasks | 86 click, 56 swap | **70 click only** | n/a |

At 120Hz (`--disable-frame-rate-limit`), frame gaps during the 0-900ms
transition are the relevant number. Overall p95 is not: after the transform
ends the browser returns to a 60Hz idle cadence (idle p95 17.8ms).

| Uncapped | Before | After |
| --- | ---: | ---: |
| during-slide p95 | 10.6ms | **7.2ms** |
| during-slide p99 | 51.7ms | **33.9ms** |
| during-slide max | 163.7ms | **97.2ms** |
| whole-window p95 | 17.5ms | 17.4ms |

The remaining 97ms stall is one destination-content style/layout task.
Hiding the navbar and both sidebars still leaves a ~101ms content-only task
on the same page, and Fuwari's destination has 77ms/60ms/76ms tasks of the
same class. A single 4x-throttled layout of the new post is larger than the
2-frame budget; it is not repeated transition work.

The raster count is structural rather than a hot transition layer: the post
page has 1487 DOM elements against Fuwari's 564 (sidebar 270 vs 25, navbar
367 vs 100). Per-layer tracing shows the raster spread across content tiles
(largest 6.1ms) and no single repeated layer. Containment of the sidebar
paint reduced paint events 117→99 but left RasterTask at 105 events / 12.4ms.

What changed:

- The first viewport of markdown is eager. Below-viewport sections get
  `content-visibility: auto` with an estimated `contain-intrinsic-size` while
  the incoming document is detached. The direct-load and SPA first screens
  are pixel-identical (0 differing pixels), and a TOC click still lands at
  top=80.
- Closed mobile menu/TOC panels were 147 laid-out elements on desktop even
  though their triggers are hidden; they are `display:none` at those
  breakpoints now.
- Closed desktop dropdowns leave layout only while `is-layout-moving`.
  Hovered, focused, or expanded menus stay visible for a click inside them.
- The fade duration is scoped to `#swup-container`; the layout-slide path no
  longer writes inherited custom properties on `#main-grid`.

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
      read the scroll position before any class/style writes
      start the custom scroll-to-top tween (700ms lock on a layout slide)
      add is-layout-moving for a desktop layout slide
      flip is-home now; the banner/grid 700ms transforms start on this frame
  → content fade out (200ms)
  → content:replace (main + #toc), ~200ms into the slide
      swap the containers
      prime code blocks and below-viewport markdown while detached
      sync the mobile banner
      start the incoming 200ms fade while the transform continues
  → animation:in:await
      returns the 700ms transform-end promise
  → animation:in:end (after the transform)
      remove is-layout-moving and the TOC defer
      sync the navbar/chrome; schedule idle enhancements
      requestIdleCallback → fancybox / mermaid / fonts / comments
```

The swap and the destination's first style/layout run while the 700ms
transform is moving, matching Fuwari. The first viewport of markdown stays
eager. Sections whose estimated top is below the viewport are primed while
detached with `content-visibility: auto` and an estimated
`contain-intrinsic-size`; they render when approached, so the transition
does not lay out the whole article. This is what removed the end-of-slide
swap task. The remaining single destination layout is documented under
"Measured results".

`is-layout-moving` stays on `<html>` until the grid's `transitionend`. It
keeps the navbar blur disabled and tells `runAfterLayoutSettled` that the
layout is still moving. Swup's `animation:in:await` returns the transform-end
promise, so `animation:in:end` and `visit:end` also happen after the slide.

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
transform starts on the click frame; the custom scroll tween uses the slide
curve and finishes inside the same 700ms window. `overscroll-behavior-y:
none` on `html, body` keeps wheel and touch input from moving past the real
document boundary.

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

- Flip the body's home class at `visit:start`, on the click frame. The
  transform must start immediately; moving the flip later makes the banner
  arrive after the content. Keep the first viewport of markdown eager.
- Prime below-viewport markdown sections with `content-visibility: auto` and
  `contain-intrinsic-size` while the incoming document is detached. Do not
  apply it to blocks that start above the fold. Keep the size estimates
  close enough that TOC targets still land correctly.
- Keep `is-layout-moving` until the grid transform ends, and make
  `animation:in:await` wait for that transform. Do not remove Swup's root
  classes or enable the navbar blur while the slide is running.
- Keep the closed mobile menu/TOC panels `display:none` at breakpoints where
  their triggers are hidden; they were 147 laid-out elements on desktop.
- Closed desktop dropdowns may leave layout only while `is-layout-moving`.
  Hovered, focused and expanded menus must stay block.
- Scope the fade duration to `#swup-container`. Do not write inherited custom
  properties on `#main-grid` on the click path; they dirty every sidebar and
  content node.
- The custom tween in `startScrollToTop` owns the pre-scroll. Run it at
  `visit:start` after the scroll plugin's position cache; do not add another
  scroll plugin loop, timeout, or `scroll:top` override.
- Keep `smoothScrolling: true`. The pre-scroll in `transitions.ts` is the
  only scroll call.
- After a layout pre-scroll, set `visit.scroll.reset = false` so the scroll
  plugin does not force layout of the new article just to scroll to 0 again.
- During a layout slide the scroll tween uses the slide curve
  (`cubic-bezier(0.4, 0, 0.2, 1)`), not `easeOutCubic`. The scroll and the
  transform move the same card; two curves make its screen position a sum of
  two velocity profiles, so it lurches on the first frame while the transform
  trails.
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
  `calc(var(--banner-height-home) - var(--banner-height-extend))`, never a
  separate `35vh`. Both variables are rounded to a 4px grid (the head script
  writes `--banner-height-home` in snapped pixels), so the banner bottom and
  the grid top land on the same composited pixel row at 1x/1.25x/1.5x/2x.
- The banner is two layers: `#banner-wrapper` translates by the extend value
  and `#banner` translates by `--bannerOffset` (15vh for centre) on content
  pages. Both use the same 700ms curve as `#main-grid`. Do not give the image
  its own duration or easing. The wrapper's transition must include `opacity`
  for the mobile hide; without it the banner disappears in one frame while
  the transform animates. Keep `will-change: transform` on the two banner
  layers: our banner image is much larger than Fuwari's, and without the hint
  the compositor re-rasterizes them every frame of the slide (57 RasterTask
  events against Fuwari's 22; 32 with the hint). Do not add
  `backface-visibility`, and do not put the hint on the grid.
- `backdrop-filter` on the navbar is allowed only when the page is idle
  (`html:not(.is-changing):not(.is-animating)`) and on desktop. The navbar
  transparency itself is CSS-only in `src/styles/navbar.css`; the transition
  script only toggles `data-is-home`, `.scrolled` and `--semifull-fade`.
- New heavy features belong in `page-enhancements.ts`, not in `Layout.astro`.
