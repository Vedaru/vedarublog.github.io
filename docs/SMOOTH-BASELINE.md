# Owner-confirmed smooth transition baseline

**Do not replace this lifecycle with the literal Fuwari hooks.**

The owner confirmed this state smooth on 2026-11-16 at 22:11.

- Branch: `smooth-transition`
- Tag: `smooth-2026-11-16`
- Commit: `17b75c0`
- Recovered predecessor: `9a6cc5a`
- Local verification URL used: `http://localhost:4406/zh/`

## What makes this state smooth

- Fuwari banner subtree, banner transitions, and page fade are vendored.
- Layout state flips at `visit:start`, and the temporary 300vh tail is opened.
- `is-layout-moving` remains set until the grid transform actually ends.
- Scroll-driven navbar/TOC/back-to-top writes are suppressed during that time.
- Optional enhancements wait for the layout-settled event.
- The incoming page swap waits for the grid `transitionend`. The outgoing page
  stays visible during the slide; the new page fades in after the banner stops.
- The page-height tail is removed after the transform settles.

Literal Fuwari swaps content after the 200ms fade. On this site that runs the
destination page's full layout underneath the moving banner and reintroduces
jitter. Do not remove the transform wait or the `is-layout-moving` content
visibility override.

## Fragile pieces

- `src/scripts/transitions.ts`: `settle`, `waitForGridTransition`,
  `animation:in:await`, enhancement and tail timing.
- `src/styles/transition.css`: the
  `html.is-layout-moving.is-animating .transition-swup-fade` override.
- `src/styles/layout-stable.css`: home/grid transforms and sticky sidebar
  ownership.

Before changing any of these, build and verify the real category transition
with an actual pointer click at high refresh rate.
