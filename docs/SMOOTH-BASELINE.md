# Fuwari transition baseline

The owner explicitly requested the literal Fuwari animation lifecycle on
2026-11-19. This supersedes the earlier custom `17b75c0` baseline, which held
the outgoing page and waited for the grid transform before completing the
incoming animation. The `smooth-2026-11-16` tag remains useful history, but it
is not the current implementation contract.

## Current behavior

- Fuwari's banner subtree, 700ms banner/grid transforms, and 200ms page fade
  are vendored.
- The home layout class flips at `visit:start`, and the temporary 300vh page
  tail opens immediately.
- Swup performs its normal content replacement after the outgoing 200ms fade.
  There is no `animation:in:await` transform wait and no CSS rule holding the
  outgoing page visible for the full layout slide.
- ScrollPlugin uses the standard `smoothScrolling: true` configuration with no
  custom acceleration, early-scroll setting, or second scroll writer.
- `visit:end` hides the temporary tail and restores the deferred TOC after
  200ms, matching Fuwari.
- Local chrome and enhancement hooks may use `is-layout-moving` to avoid
  unrelated work during the transform, but they must not change Fuwari's fade,
  swap, scroll, or cleanup sequence.

Verify changes with a real click on the bottommost visible post after scrolling
to the bottom, then run `pnpm exec astro check` and a production build.
