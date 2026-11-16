# Page transition architecture

This site follows Fuwari's motion model. The goal is one continuous glide from
click to settled page, with optional work kept off the main thread until the
glide is over.

## Why Fuwari feels smoother

Fuwari's transition is not a special animation library. It is three decisions:

1. **The layout flip happens at `visit:start`, not after the content swap.**
   The body's `is-home` class changes on the click. The 700ms banner/grid
   `transform` starts on the compositor immediately. On a layout slide the
   outgoing fade is held for the whole 700ms transform, so `content:replace`
   lands after the transform; ordinary visits keep the 200ms fade.
2. **Only `main` and the TOC are swapped.** Everything else (navbar, sidebar,
   music player) is persistent. There is no per-visit re-init of the shell.
3. **Optional work runs after the motion.** Fuwari's TOC is server-rendered and
   a custom element waits for the content entrance animation. No comments,
   diagrams, lightboxes or analytics are loaded during the transition.

This site keeps the 700ms banner/grid transform and runs the custom scroll
tween on the same clock. Layout slides use a slide-length outgoing fade; the
transform starts on the click frame.

## Measured results (2026-11-15)

Production build (`pnpm build` + `astro preview`), 1440x900 dpr2, 4x CPU
throttle. The same external harness was used before and after. Fuwari is the
reference measured on the same machine.

| Path / metric | Before (`2808426`) | After (`486b9cb`, intermediate) | Fuwari |
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

Three home → post repeats gave p95 16.8 / 33.3 / 16.8ms; the middle repeat is
33.3ms because the residual 70ms content task crossed the 5% sample boundary.
The animation itself is one-frame cadence; the p99 is the content task.

At 120Hz (`--disable-frame-rate-limit`), frame gaps during the 0-900ms
transition are the relevant number. Overall p95 is not: after the transform
ends the browser returns to a 60Hz idle cadence (idle p95 17.8ms).

| Uncapped (intermediate, `486b9cb`) | Before | After |
| --- | ---: | ---: |
| home → post during-slide p95 | 10.6ms | **7.2ms** |
| home → post during-slide p99 | 51.7ms | **33.9ms** |
| home → post during-slide max | 163.7ms | **97.2ms** |
| post → home during-slide p95 | 7.9ms | **7.8ms** |
| post → home during-slide p99 | 37.0ms | **40.5ms** |
| whole-window p95 | 17.5ms | 17.4ms |

The remaining stall is the eager first viewport of the destination, not
repeated transition work. In a measurement-only run with the navbar and both
sidebars `display:none`, the destination content alone still has a 52ms long
task at 4x (p99 66.6ms). Fuwari's destination has 77ms/60ms/76ms tasks of the
same class. A single 4x-throttled layout of the first viewport is larger than
the 2-frame budget; avoiding it requires deferring above-fold content, which
is explicitly not allowed.

### Navbar raster: negative result

At 1x uncapped the per-frame raster source is the navbar's transparent text
and icons composited over the moving banner. Hiding `#top-row` in a control
probe dropped RasterTask from ~360 to 32. The navbar has 368 DOM elements
against Fuwari's 100. The banner layer itself is only 3-4 tasks.

The pixel requirement cannot be met by a colour-preserving navbar change.
With no navigation, the top 120 CSS px is 0.0 mean / 1 max channel difference
after 120ms. With the unmodified transparent navbar, the moving banner alone
produces:

| Band vs pre-click | 0ms | 60ms | 120ms | 200ms | 320ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| home → post mean abs | 1.37 | 4.15 | **7.09** | 12.8 | 14.5 |
| home → post max channel | 106 | 120 | **120** | 118 | 112 |
| post → home mean abs | 2.12 | 3.31 | **4.25** | 5.08 | 6.84 |
| post → home max channel | 150 | 151 | **158** | 138 | 138 |

The solid slide surface was rejected: at 120ms it measured mean 29.1 / max
133 and regressed home → post 1x p95 from 1.6 to 16.9ms. It is reverted.

A colour-preserving `will-change: transform` layer on `#navbar-wrapper` kept
the settled pixels and the slide band identical to the transparent control
(same mean 7.09 at 120ms), and reduced home → post RasterTask from 388 / 26.6ms
to 294 / 26.2ms with 1x p95 1.9ms. Post → home was 280-347 / 20ms across two
runs. It cannot satisfy mean <2 while the banner moves under a transparent
navbar; only a solid or frozen navbar band can, and both are visible changes.
The layer was therefore not merged. Restored control: home → post 1x p95
1.6ms, Raster 388 / 26.6ms; post → home 1.8ms, Raster 250 / 20.8ms.

### Final article and comment policy

Article content is eager. There is no `content-visibility` or
`contain-intrinsic-size` on markdown sections or code blocks. The code font
is part of the initial CSS so code blocks never swap metrics. The comment
card reserves its mounted 512px height, so Twikoo can still initialize on
approach without growing the page.

Final production numbers, 1440x900 dpr2:

| Metric | home → post | post → home |
| --- | ---: | ---: |
| 60Hz 4x p95 | 16.8 / 33.3 / 33.3ms | 16.8ms in 4/5 runs; one 33.2ms |
| 60Hz 4x p99 | 166.7-183.4ms | 50-66ms |
| long tasks | 131-142ms at ~315ms, 85-89ms at ~452ms | 51-67ms click only |
| 1x uncapped p95 | 1.1ms | 1.7ms |

The single 33.2ms post → home p95 run is the known 66ms click task crossing
the 5% sample boundary; its p99 is 50ms. Home → post p95 is Fuwari parity
(33.3ms). The p99 tail is the eager code-block layout; improving it would
require deferring article content, so it is accepted. No transition long
task exceeds 150ms.

Scroll audit: `scrollHeight` is a single value, 4698, for the full
120px-step scroll; CLS is 0.000 and there are no layout-shift entries.
Twikoo still has a 260ms initialization task when the comment card is
approached; that is outside the transition and its space is reserved.
Twikoo still has a 260ms initialization task when the comment card is
approached; that is outside the transition and its space is reserved.

### Mobile residual

Mobile 390x844 dpr2, 4x CPU, home → post:

| Metric | Before | After head-script skip |
| --- | ---: | ---: |
| p95 | 16.8ms | **16.8ms** |
| p99 | 249.9ms | 199.9-216.7ms |
| longest tasks | 177ms at ~259ms | 123-136ms at ~261ms |

Marking the global head shell script `[data-swup-ignore-script]` removes its
duplicate evaluation on SPA visits. The remaining 123-136ms task is the
harness tick forcing the article's style/layout: 73.7ms style + 53.4ms
layout, 1013 dirty of 1535 objects. Fuwari at the same point is 119ms with
52ms style + 41.6ms layout of 471/735 objects. The local article has about
2x the layout objects and 1.7x the text, so the residual is
content-proportional.

The target max long <=120ms / p99 <=150ms is not met. Attempts: hiding the
closed mobile menu/TOC panels saved ~6ms; merging adjacent code spans found
no mergeable pairs; ignoring the bottom module script reduced p99 to 166ms
but broke the mobile resize check in `verify.mjs`, so it was reverted.
Desktop remains p95 16.8ms both ways and 1x 1.2/1.3ms. No article content is
deferred.

What changed:

- All article content is eager. The section/code-block
  `content-visibility` and intrinsic-size priming were removed, and the code
  font is in the initial CSS.
- The comment card reserves its mounted 512px height, so Twikoo's
  approach-time initialization no longer changes `scrollHeight` or CLS.
- Closed mobile menu/TOC panels were 147 laid-out elements on desktop even
  though their triggers are hidden; they are `display:none` at those
  breakpoints now.
- Closed desktop dropdowns leave layout only while `is-layout-moving`.
  Hovered, focused, or expanded menus stay visible for a click inside them.
- The fade duration is scoped to `#swup-container`; the layout-slide path no
  longer writes inherited custom properties on `#main-grid`.

### Load path

The initial CSS bundle is the only render-blocking resource. Inlining it
removes that request; Fancybox and KaTeX keep their separate lazy CSS files.
Cold load, Fast 3G + 4x CPU:

| Cold load | Before | After |
| --- | ---: | ---: |
| render-blocking requests | 1 (73KB, 1.9s) | **0** |
| first contentful paint | 2236ms | **1320ms** |
| largest contentful paint | 4164ms | **3456ms** |
| load | 7094ms | **6038ms** |

The 341KB Microsoft YaHei WOFF2 remains a bandwidth competitor for the banner
on the first load, but it is `font-display: swap` and does not block FCP. The
banner stays eager, `fetchpriority=high`, with a matching `<link rel=preload
as=image>`; no content is lazy-loaded.

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
      flip is-home now; the banner/grid and sidebar-top 700ms transitions start
  → content fade out (700ms on a layout slide, 200ms otherwise)
  → content:replace (main + #toc), after the slide on a layout slide
      swap the containers
      comment space reserved; code font already in the initial CSS
      sync the mobile banner
      start the incoming fade
  → animation:in:await
      returns the 700ms transform-end promise
  → animation:in:end (after the transform)
      remove is-layout-moving and the TOC defer
      sync the navbar/chrome; schedule idle enhancements
      requestIdleCallback → fancybox / mermaid / fonts / comments
```

On a layout slide the swap and the destination's first style/layout run after
the 700ms transform, so the sidebar's `top` animation is never underneath that
layout task. Ordinary visits still swap during the scroll tween. All article
content is laid out eagerly; no content-visibility priming is used. The
destination's code-block layout is the remaining tail and is accepted at
Fuwari p95 parity.

`is-layout-moving` stays on `<html>` until the grid's `transitionend`. It
keeps the navbar blur disabled and tells `runAfterLayoutSettled` that the
layout is still moving. Swup's `animation:in:await` returns the transform-end
promise, so `animation:in:end` and `visit:end` also happen after the slide.

The grid subtree now matches Fuwari's shape: `#main-grid` has four direct
children, `#sidebar`, `.right-sidebar-container`, `#swup-container` and the
mobile footer. The old `<div class="contents">` wrapper was removed. At
1440x900 the subtree went from 723 to 722 elements; the wrapper was the only
removed node. `#sidebar`, `.right-sidebar-container` and `#content-wrapper`
carry Fuwari's identity `translate(0px, 0px)` transform, which keeps their
paint in their own containing block while the grid moves.

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

The home offset is `top: calc(1rem - var(--banner-height-extend))`, which is
-252px at a 900px viewport; content pages use `1rem`. The sidebars are inside
the transformed grid, so at scroll 0 home is banner 0..584, sidebar column
584, `#sidebar-sticky` 1038; content is 316/316/770. Those are 9424c48's
exact rects.

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
  arrive after the content. Keep all article content eager.
- Do not add `content-visibility` or `contain-intrinsic-size` to article
  markdown. Keep article content eager. If code-block layout needs its tail
  reduced, do it without render deferral.
- Keep the comment card's reserved height equal to the mounted Twikoo card
  (currently 512px) so comment initialization cannot shift the page.
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

### Sidebar ownership: 9424c48 restored; native sticky rejected

The native-sticky experiment (e92947c/2c086a6) removed the `top` transition
and transformed only the content column. It fixed the swap-time jerk, but the
sidebar column's home and content tops differ by the 268px banner extension.
Any static placement therefore has to switch at the class flip: measured at
scroll 0, `#sidebar-sticky` went 1038 -> 770 in one frame (and 770 -> 1038 in
reverse); at scroll 900 home -> post it went 138 -> 16 in one frame. A static
margin, padding, row or relative offset can only change on that class flip, so
it must snap. The one-frame delta was 268px, above the 20px acceptance bound.
That architecture was rejected and is no longer in the tree.

The restored implementation is 9424c48's: `#main-grid` carries the 700ms
transform, both sidebars are inside it, and their `top` compensation runs on
the same 700ms curve. The home offset is the static per-page value above.
`html.is-layout-moving.is-animating .transition-swup-fade` holds the outgoing
fade for the whole slide, so `content:replace` lands after the transform and
its layout task is not underneath the sidebar's `top` animation. The custom
scroll tween, cached scroll read, inline stylesheet, eager content, comment
space reservation and head-script skip are unchanged.

Trace at 4x against 9424c48 (max sidebar frame delta, 1440x900):

| Direction / start | 9424c48 | Restored |
| --- | ---: | ---: |
| Home -> post, scroll 0 | 17.4px | 17.4px |
| Home -> post, scroll 900 | 40.9px | 40.7px |
| Home -> post, scroll 1200 | 60.9px | 60.9px |
| Post -> home, scroll 0 | 17.3px | 17.4px |
| Post -> home, scroll 900 | 75.2px | 75.2px |
| Post -> home, scroll 1200 | 95.2px | 95.2px |

Deltas are continuous, with no one-frame jump; the pinned sidebar stays at
16px and the unpinned sidebar follows the grid/scroll continuously. Pacing is
60Hz 4x p95 16.8ms home -> post and 16.8ms post -> home; 1x uncapped p95
1.1/1.1ms. `verify.mjs` is back on the `top + gridTransform = 16` invariant,
keeps the pinned back/forward check, and adds the home/post column-top check
(584/584 home, 316/316 post). All checks pass.

### Compositor tail: grid is subpixel; the integer edge is the scroll path

The moving `#main-grid` layer is composited and translates fractionally.
A compositor screencast with a magenta marker inside `#content-wrapper`,
sampled at 60fps during the class-flip tail, measured:

| Frame tail | Marker top |
| --- | ---: |
| 29 | 319.28 |
| 30 | 318.00 |
| 31 | 317.48 |
| 32 | 316.49 |
| 33 | 316.28 |
| 34 | 316.10 |
| 35 | 316.00 |

That is 0.1-0.5px steps, monotonic, with no one-frame jump. Measurements of a
white card edge against the banner image quantize to whole rows because the
card's painted top edge is sampled against an image backdrop, not because the
grid transform snaps. The moving grid layer has no filter, backdrop-filter or
paint containment on its ancestors; its only transform is the 268px
`translateY`.

The whole-pixel tail that remains on the list edge comes from the custom rAF
scroll tween. The tween targets fractional `window.scrollTo` positions, but
the rendered scroll offset advances in whole pixels and ends with a 0.03px
content-swap correction. Fuwari's Swup ScrollPlugin uses a spring with a
longer fractional deceleration, so its edge decays differently. Changing that
requires changing scroll ownership/curve or the swap geometry, both outside
the "no timers/rAF nudges/duration games" constraint for this pass. No mask
was added; the grid layer and DOM cleanup are shipped, the scroll tail is
recorded here as the remaining cause.

### Sub-pixel scroll residual rejected: exact conflict

The sub-pixel residual was implemented twice. `cb01495` put it on
`#content-wrapper`; DOM sampling of home@900 -> post showed 813 tween frames,
17 direction reversals, and a tail velocity spike of 0.2733px/ms. The
replacement put the remainder on `#main-grid` via the separate `translate`
property and derived it from the scroll position actually in effect. Sampling
uncapped at 1x still found 189 reversals in 1,324 frames home -> post and 258
in 3,363 frames post -> home.

The conflict is the two independent 700ms clocks. At the tail of home@900 ->
post the grid transform still has about 1.0px left while the scroll is almost
at 0: the grid edge goes 316.577 -> 315.639 (-0.938px) as scrollY goes 1 -> 0
and the residual goes 0.564 -> -0.364. The scroll residual cancels the scroll
quantization, but it cannot cancel the grid transform's remaining upward
motion. The rendered edge is `layout(t) - desiredScroll(t)`; near the tail the
layout derivative exceeds the scroll derivative, so the sum reverses.

Making this continuous requires one of:

- one clock for both motions, which means moving the scroll into a transform
  and committing scrollTop at the swap (option a). That either translates the
  sidebar with the document or forces a sidebar jump at the commit.
- removing the scroll animation from the slide, as Fuwari does, which
  reintroduces the sidebar jump we are required not to copy.
- changing the relative duration/easing of the grid and scroll, which is a
  duration/curve game.

The residual mechanism was therefore reverted. The tree keeps the flat
`677ef6a` DOM, the identity layer transforms, the 9424c48 sidebar semantics,
and the original custom scroll. `verify.mjs` remains ALL PASS and pacing stays
33.3/16.8ms at 60Hz 4x, but the tail reversal is not fixed.

### Single-clock scroll attempt: reverted

A single-clock version derived the scroll target from the grid transform's
matrix and applied the residual with the `translate` property. It still could
not pass the handoff: the Swup scroll reset landed before the first transform
sample, producing a one-frame 900px step home -> post and a 1200px step
post -> home at 1x. With the scroll held through the start gate, the first
transform sample and residual still lagged the committed scroll; DOM sampling
found 1 reversal in 2,443 home -> post frames and 0 in 3,584 post -> home
frames, but with a 900/1200px initial step. The tail was monotonic once
started, but the initial handoff violates the no-step budget. The mechanism
was reverted to 743f2be; no single-clock code is shipped.

### Single-clock handoff: target polarity fixed

The earlier single-clock loop was started before `setBodyHome`, so it read the
outgoing home flag as the destination and immediately resolved to scroll 0.
The loop now starts after the class flip, with `startScrollY` cached at the top
of `visit:start`, and `visit.scroll.reset` disabled for the layout visit. It
reads the grid transform matrix each frame, derives the eased fraction from
that same value, writes both `scrollTop = startY * (1 - eased)` and the residual
`translateY = actualScrollY - desiredScrollY` on `#main-grid`, and clears at
the final transform value. No independent scroll clock remains.

Handoff data at 1x: the first frames stay at 900/1200, with no 900/1200 one-
frame step. The largest observed step is 8.46px home -> post; post -> home
sampling is 0 direction reversals. Tail motion is fractional and monotonic
after scroll reaches 0. Home -> post still shows 20 small reversals at scroll-
commit frames (largest 0.68px), not at the tail; this is the remaining
sub-pixel boundary, recorded rather than masked. `verify.mjs` ALL PASS; 60Hz
4x p95 33.2/16.8ms; 1x p95 1.1/1.1ms.

### Single-clock handoff and single banner layer

The handoff failure was a target-polarity bug: the single-clock loop started
before `setBodyHome`, so it read the outgoing home flag as the destination and
resolved to scroll 0. The loop now starts after the class flip, uses the
click-frame cached scroll, keeps `visit.scroll.reset` disabled for the layout
visit, and derives one eased value from the grid transform matrix. Scroll and
the grid residual are written from that same value.

The seam had a second cause: `#banner-wrapper` and `#banner` were two promoted
transform layers. The content-page crop offset is now a static
`top: var(--banner-offset)` on `#banner`; only `#banner-wrapper` animates. The
same residual `translate` is applied to the wrapper, so the banner bottom,
grid top, content top and sidebar sticky all share one fractional position.

Tail DOM frames after scroll reaches 0 (1x, home@900 -> post):

```
315.781, 315.801, 315.815, 315.835, 315.855, 315.869, 315.884, 315.887,
315.903, 315.923, 315.934, 315.941, 315.949, 315.955, 315.961, 315.967,
315.976, 315.984, 315.988, 315.992, 315.994, 315.995
```

All four series are identical and monotonic through the tail; the previous
banner-bottom sawtooth (17 reversals, ±1px) is gone. Settled pixels are
unchanged: home 0..584 and content -268..316, with the same image framing.
`verify.mjs` ALL PASS; 60Hz 4x p95 16.8/16.8ms; 1x p95 1.1/1.2ms; DOM stays
flat at 722 elements.

### Single JS loop: teleport and handoff fixed; style-recalc limit

The layout slide now writes grid transform, banner-wrapper transform, banner
top, sidebar top, and scroll from one `p` with no CSS transitions on those
properties. The banner teleport is gone: the first frame keeps `#banner` top at
0 and eases it continuously; the handoff keeps scroll at 900/1200 on the first
frames. At the tail, banner bottom, grid top, content top and sidebar top are
the same series with 0 reversals; the banner sawtooth remains gone.

Performance still misses the target. At 1x uncapped over the transition:
TaskDuration 899.2ms, RecalcStyleDuration 281.5ms, LayoutDuration 33.7ms,
ScriptDuration 117.2ms, with one 66ms task. The five per-frame style writes
include the two layout offsets (`#banner` top and sidebar top); they force the
same style-recalc class of work the old per-frame `getComputedStyle` did. The
loop no longer reads style or layout, but style recalculation from writes
remains.

Getting RecalcStyle below 20ms requires compositor-only properties for the
banner inner offset and sidebar compensation (or no continuous inner/sidebar
offset), which reintroduces the second animated banner layer or removes the
9424 sidebar transition. That conflicts with this task's seam and sidebar
constraints; the code is committed with the measured performance miss recorded
rather than masked.

### Fuwari spring adopted; performance target still blocked by layout offsets

The custom bezier scroll and all JS transform/residual writes are gone. The
scroll loop is the SwupScrollPlugin integrator: velocity += delta * 0.04,
velocity *= 0.7, position += velocity, one float scrollTo per frame, snap at
the crossed target; no reads inside the loop. Grid and banner-wrapper
transforms are CSS transitions again. The inner banner offset is a continuous
`top` CSS transition on the single banner layer, not a second transform layer.

Results at 1x uncapped:
- TaskDuration 751.1ms home -> post / 660.9ms post -> home.
- RecalcStyle 188.9 / 142.3ms; Layout 82.9 / 52.4ms.
- 1x p95 1.8 / 1.7ms; verify.mjs ALL PASS.
- 60Hz 4x home -> post p95 33.3ms, not the requested 16.7ms.

The remaining cost is the two continuous layout offsets (`#banner` top and the
sidebar `top` transition). They must be layout properties to keep one banner
layer and 9424 sidebar semantics. Moving them to transforms would restore the
second banner layer/seam or change sticky behavior; removing them snaps the
crop/sidebar. The performance target (<20ms recalc, <30ms layout, no >50ms long
task) is therefore not met by this composition; the metrics are recorded
instead of masking it.
