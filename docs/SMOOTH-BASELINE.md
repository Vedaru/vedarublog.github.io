# Fuwari transition baseline

The current implementation uses Fuwari's motion design where it addresses
page-transition jitter. Upstream commit `6d39b0d` is a reference, not a target
for wholesale code or layout replacement. Older custom smooth-motion tags and
traces are historical references only.

## Required behavior

- Content uses Fuwari's normal 200ms Swup fade. No outgoing page is held while
  a transform completes.
- `lg:is-home` changes at `visit:start`. The banner and grid independently run
  their native 700ms CSS transforms.
- The temporary 300vh tail opens at `visit:start`, remains visible at
  `page:view`, and closes 200ms after `visit:end` together with TOC readiness
  cleanup.
- The main panel meets the banner at its boundary, without the upstream
  3.5rem overlap. Banner height and extension use shared variables so the edge
  remains aligned after responsive pixel rounding.
- ScrollPlugin uses `smoothScrolling: true` without custom acceleration,
  `doScrollingRightAway`, a second scroll writer, or transform-dependent waits.
- Banner reveal and resize calculations follow Fuwari. Mobile keeps the same
  banner and main-panel model instead of a separate motion layout.
- Sticky sidebars retain native sticky positioning and `transition-all
  duration-700`. Entrance animation belongs on widgets and the Fuwari sidebar
  wrapper, not on sticky containers.
- The sidebar TOC uses Fuwari's fixed-height scrolling viewport, mask,
  `top`/`height` indicator, spacers, and client class.
- Shared cards, controls, links, panels, post lists, and markdown controls use
  Fuwari's standard transitions.
- Optional blog enhancements are canceled when a visit starts and scheduled
  for idle time after the visit ends. They never gate Fuwari's lifecycle.
- `updateHead: true` keeps page metadata and head slots synchronized while
  Swup replaces only the main content and TOC containers.

## Regression checks

Use a production build rather than the development server for animation
checks. At minimum:

1. Scroll to the bottom of home and activate the bottommost post. Check both
   directions, including browser back and forward.
2. Check post-to-post navigation and a bilingual route.
3. Verify initial-load and Swup-load TOC initialization, active-heading
   tracking, indicator geometry, and internal TOC scrolling.
4. Check sidebar stickiness at rest and during home/post navigation.
5. Check mobile banner geometry and mobile menu/TOC interaction.
6. Run `git diff --check`, `pnpm exec astro check`, `pnpm build`, and the
   generated-markup assertions.

See `docs/ANIMATION.md` for ownership details and the lifecycle contract.
