# Animation investigation and Chrome recorder evidence (2026-11-16)

## Scope

The investigation covered the home/post layout slide, the announcement widget's gap, the inner banner crop, the banner wrapper, both sticky sidebars, and history interruption behavior. The constraints were to preserve the sidebar's animation and rendered behavior and to avoid timers, blanket `will-change`, wrapper layers, deferred rendering, and per-widget offsets.

The useful reference was Fuwari's live demo and source at `https://github.com/saicaca/fuwari`.

## Recorder method

I used a headed Chromium window on the owner's 240Hz display, DPR 1.25, with real pointer input for the Chinese `思考` category link and a post → home navigation. Chrome DevTools Protocol `Tracing.start` recorded thread and event streams, not just screenshots:

- `Animation` targets and properties, including `compositeFailed` and `unsupportedProperties`.
- `UpdateLayoutTree`, `Layout`, `Paint`, `Layerize`, `RasterTask`, `RasterizerTaskImpl::RunOnWorkerThread`.
- `DirectRenderer::DrawFrame`, `Display::FrameDisplayed`, `FramePresented`, `JankV3`, and compositor commit events.
- Swup hook traces, `content:scroll`, `swup.scrollTo`, and the ScrollPlugin's cached history offsets.

Recorder helper: `/home/vedaru/.jcode/scratch/hermes-eval/chrome-recorder.mjs`.
Raw trace directories: `/home/vedaru/.jcode/scratch/hermes-eval/recorder-*`.

The recorder also waits for Swup initialization. Astro creates Swup from `requestIdleCallback`, which was not reliable in the test window, so the harness invokes idle callbacks during setup only. This is measurement setup, not a site change.

## Findings

### 1. Entrance fill mode caused the announcement gap

`src/styles/transition.css` used `animation: 300ms fade-in-up backwards`. During the delay, backwards fill applied the keyframe's `translateY(2rem)` to the announcement. Native geometry measured a 48px gap before it settled to the intended 16px.

`animation-fill-mode: forwards` was tested because Fuwari uses it. It removes the pre-delay offset, but the recorder showed a severe regression from retained animated layers. It is not suitable for this site's larger widget/content set.

The shipped correction is `animation: 300ms fade-in-up`, i.e. no fill mode. Before the delay, the card remains at its settled position. After the entrance, the animation layer is released. This preserves the entrance motion without retaining layers or changing sticky behavior.

Initial-load geometry:

- Backwards fill: first measured gap 48px, settled gap 16px.
- No fill mode: first measured gap 16px, settled gap 16px. The entrance's intentional 2rem transform still produces the normal animation displacement while it runs.

### 2. The sticky gap was a scroll/sticky interaction, not a reason to change sidebar animation

The real category click at scrollY 900 showed the announcement gap increasing transiently from 16px to 62px when the frozen scroll offset was carried inside `#main-grid` while the sticky `top` transition ran. This was a sticky constraint, not a request to remove or rewrite the sidebar's animation.

The existing scroll/history implementation at `516c2bd` already passed the complete regression suite. It was retained rather than replaced with another scroll architecture.

### 3. Banner ownership had to match Fuwari

Fuwari's live structure uses transform transitions on both `#banner-wrapper` and the inner `#banner` div. The older local implementation used a main-thread `top` transition for the inner crop and a persistent `will-change: transform` on the wrapper.

The banner ownership correction already present in `516c2bd` is retained:

- `#banner-wrapper` uses `transform` for its slide/clip.
- `#banner` uses `transform: translateY(var(--banner-offset))` for its crop.
- The wrapper's persistent `will-change` was removed, so both layers use the active animation compositor lifetime.

The recorder confirms `transform` on the grid and both banner layers. The remaining `top` transitions are the intentional sticky sidebar transitions; there is no longer a `top` transition on `#banner`.

### 4. Scroll experiments that were rejected

Several alternative scroll models were implemented and measured, not assumed correct:

- Native smooth scrolling with history restoration through Swup's cache: `window.scrollTo({ top: 0, behavior: "smooth" })` continued after history restoration and caused the offset to drift after `content:scroll`.
- `history.scrollRestoration = "manual"`: by itself it did not stop the old smooth-scroll animation.
- A late capture-phase `popstate` cancellation: it ran after Swup's restore and canceled the restored animation.
- Swup's `scrl` spring at `content:scroll`: it continued for seconds after the 700ms layout slide.
- A second bounded spring at `content:scroll`: history was correct but reverse `JankV3` rose to 58, so it was rejected.
- `contain: layout` on sticky containers: it changed final scroll/banner geometry and was rejected.
- Disabling the right sticky transition as a diagnostic: `JankV3` dropped from 24 to 14, identifying the extra sticky transition as a major remaining cost. It was only a probe and was not shipped because the sidebar animation must remain unchanged.

### 5. Final thread/event measurements

The final candidate uses no entrance fill mode and the already validated scroll/banner implementation.

Chrome recorder, native DPR 1.25, 240Hz:

| Direction | Earlier `JankV3` | Final `JankV3` |
| --- | ---: | ---: |
| home → category archive | 44 | 20 |
| post → home | 36 | 16 |
| Fuwari post → home reference | 12 | 12 |

These are separate recorder runs, so the numbers are evidence of the change rather than a strict laboratory benchmark. The final traces contain `Animation`, `UpdateLayoutTree`, `Layout`, `Paint`, `RasterTask`, compositor commits, and frame/dropped-frame events.

Final transition regression harness: **ALL PASS (8/8)**, including:

- Forward rendered grid, content, sidebar, and banner edges stay in lockstep.
- Pinned sidebar remains at the 1rem offset.
- Home and post sidebar column positions match.
- Mobile resize does not snap `.main-panel` before content replacement.
- Post → post sticky offset remains stable.
- A second visit 100ms into the first leaves a clean committed page.
- Back 100ms into a move restores `scrollY 900` and sidebar top `16px`.

`pnpm exec astro build` passed. `pnpm check` reported 0 errors and only the repository's existing 8 hints.

## Final source change

`src/styles/transition.css`: change `.onload-animation` from `animation: 300ms fade-in-up backwards` to `animation: 300ms fade-in-up` (no fill mode).

No scroll engine replacement, no timer, no wrapper, no blanket `will-change`, no deferred rendering, and no sidebar animation change was shipped.

## Reproduction for the next agent

1. Build and serve the production site on port 4322.
2. Start the isolated Chromium recorder at port 9333.
3. Run `node /home/vedaru/.jcode/scratch/hermes-eval/chrome-recorder.mjs home-post <tag>`.
4. Run `node /home/vedaru/.jcode/scratch/hermes-eval/chrome-recorder.mjs post-home <tag>`.
5. Inspect `trace.json` in the corresponding recorder directory. Filter `Animation` for `top`, `transform`, `compositeFailed`, and `unsupportedProperties`; compare `JankV3`, frame gaps, and `content:scroll` before making another change.
6. Run `BASE=http://127.0.0.1:4322 node /home/vedaru/.jcode/scratch/vedaru-cdp/verify.mjs` before pushing.

Do not use `animation-fill-mode: forwards` as a shortcut. It removes the pre-delay gap but causes a substantial recorder-measured regression from retained animation layers.

## Correction after the first push: scroll must stay frozen

The first pushed fix (`6e75d30`) removed the entrance fill offset but left the
layout scroll spring from `516c2bd` running alongside the 700ms CSS transform.
That was the wrong motion model. At 240Hz the spring settled in roughly
310-410ms, so the visible banner moved on two clocks: a fast integer scroll
plus the slower transform. The result was the reported "too fast" motion and
banner jitter. The scroll steps were also integer, which is visibly coarse at
240Hz against a fractional compositor transform.

The approved model from `docs/ANIMATION.md` is restored: real scroll is frozen
at its start value, the grid and banner transforms carry that offset, and the
scroll is committed once in the same frame as the base transform. No JS scroll
animation participates in a layout slide. CSS remains the only writer during
the move, so a main-thread stall cannot desynchronise the banner from the grid.

### Sticky correction without repainting the sidebar

Freezing scroll exposed a second-order issue: sticky still clamps against the
live scrollport. With real scroll frozen at `S`, the sticky box must carry `-S`
in its `top` while the transformed layout carries `+S`. Without that
compensation the announcement starts correctly, then drifts up to 46px away
from the profile card near the end of the slide and snaps back at commit.

Turning sticky off with `position: static` did remove the gap, but it made the
sidebar part of the moving grid layer and regressed forward `JankV3` from 6 to
58 in the same-environment A/B. It was rejected.

The shipped correction keeps `position: sticky` and subtracts the frozen
scroll from the sticky `top` for both sidebars, including the home banner
offset. The delta and compensation are swapped atomically with the scroll
commit. Sticky never leaves the compositor path and its rendered resting
position is unchanged.

### Same-environment A/B traces

All runs used the same headed Chromium on the owner's 240Hz display, DPR 1.25,
`Tracing.start` with timeline/CC/benchmark categories, `NO_SCREENSHOT=1`, a
real `思考` category click at `scrollY 900` for forward, and post -> home for
reverse. The window must be focused; an occluded Chromium window pauses CSS
animations and produces invalid zero-time traces.

| Variant | Forward `JankV3` | Reverse `JankV3` |
| --- | ---: | ---: |
| `6e75d30` scroll spring + inner transform | 24 | 94 |
| Frozen scroll + inner `top` crop | 94 | 86 |
| Frozen scroll + sticky `position: static` | 58 | 6 |
| Frozen scroll + sticky `-S` compensation | **10** | **4** |

Final geometry with the compensation:

- Forward announcement gap: 16.0000px minimum and maximum across all moving
  frames. No 62px transient.
- Reverse announcement gap: 16px after the first 100ms. The initial 62px
  reading is the post page already scrolled 900px with the profile card
  offscreen, not a visible gap between rendered cards.
- Grid and banner reversals: 0 in both directions.
- Banner bottom minus grid top: within 0.00013px in both directions.
- Active transition properties during the move: `transform` only. No JS
  scroll writes, no animation prop on the scroll position.

Final regression harness: **ALL PASS (8/8)**. `astro check`: 0 errors, 0
warnings, 8 existing hints. `astro build` passed.

### Final source changes

- `src/scripts/transitions.ts`: layout slides use `frozenLayout`, no
  `startScrollToTop`; transform deltas are cleared and scroll is committed in
  one frame with layout transitions disabled.
- `src/styles/layout-stable.css`:
  - grid and banner transforms include `--layout-scroll-delta`;
  - `is-layout-committing` disables transitions for the atomic commit;
  - both sticky sidebars subtract the frozen delta in `top`;
  - banner wrapper and inner crop both use transform transitions.

The earlier no-fill entrance fix remains required and unchanged.
