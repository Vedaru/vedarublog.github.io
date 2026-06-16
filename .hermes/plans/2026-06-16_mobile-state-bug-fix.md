# Mobile Transition State Bug Fix Plan

> **For Hermes:** Implement directly — 2 files, minimal surgical edits.

**Goal:** Fix two mobile bugs: (1) first article visit shows banner-sized gap before grid snaps, (2) returning to homepage overlays grid on banner.

**Architecture:** `.main-panel` is outside Swup's container — it persists across transitions. The `settlePageLayoutBeforeResume` sets inline styles (`top`, `minHeight`) for article pages, but never cleans them when returning to homepage. This causes stale inline styles to override CSS, breaking homepage layout and showing a flash frame on first article visit.

**Root Cause:** `settlePageLayoutBeforeResume` writes `style.top` / `style.minHeight` inline on `.main-panel` for article pages. These inline styles persist when navigating back to homepage. The homepage CSS (`top: 70vh`) can't override inline styles, so the grid stays at article position — covering the banner.

---

## Task 1: Clean inline styles in `settlePageLayoutBeforeResume` for homepage path

**File:** `src/scripts/runtime/swup-transition-performance.ts` ~line 58-75

**Current code:**
```ts
if (window.innerWidth <= 1279) {
    var mainPanel = document.querySelector(".absolute.w-full.z-30") as HTMLElement | null;
    if (mainPanel) {
        var isHome = document.body.classList.contains("is-home");
        if (!isHome) {
            mainPanel.style.transition = "none";
            mainPanel.style.top = "calc(5.5rem + 1rem)";
            mainPanel.style.minHeight = "calc(100vh - 6.5rem)";
            mainPanel.classList.add("mobile-main-no-banner");
        }
    }
    // ...
}
```

**Problem:** No `else` branch — when returning to homepage, the old inline styles from a previous article visit persist.

**Fix:** Add `else` branch to remove inline styles on homepage:

```ts
if (window.innerWidth <= 1279) {
    var mainPanel = document.querySelector(".absolute.w-full.z-30") as HTMLElement | null;
    if (mainPanel) {
        var isHome = document.body.classList.contains("is-home");
        if (!isHome) {
            mainPanel.style.transition = "none";
            mainPanel.style.top = "calc(5.5rem + 1rem)";
            mainPanel.style.minHeight = "calc(100vh - 6.5rem)";
            mainPanel.classList.add("mobile-main-no-banner");
        } else {
            // 回到首页：清理旧文章页遗留的 inline 样式，让 CSS 规则接管
            mainPanel.style.removeProperty("top");
            mainPanel.style.removeProperty("min-height");
            mainPanel.style.removeProperty("transition");
            mainPanel.classList.remove("mobile-main-no-banner");
        }
    }
    var nativeST = window.__nativeScrollTo || window.scrollTo.bind(window);
    nativeST(0, 0);
}
```

**Verification:** Navigate Home → Article → Home. Homepage grid should NOT overlay banner.

---

## Task 2: Fix first article visit gap (flash frame)

**File:** `src/scripts/runtime/swup-transition-performance.ts` — same area

**Problem:** Even after Task 1, the first article visit may show a brief frame where `.main-panel` is at 70vh (homepage position) before `settlePageLayoutBeforeResume` fires (~460ms after `animation:in:end`). The `transition: none` + inline `top` change is invisible, but the delay causes a flash.

**Fix:** Move the article-page style setting to `content:replace` instead of `settlePageLayoutBeforeResume`. At `content:replace` time, the new content is in the DOM, the scroll is locked, and the CSS suppression rules are active — the position change will be invisible.

Create a simple function in `swup-transition-performance.ts`:

```ts
function applyMobileArticleLayout() {
    if (window.innerWidth > 1279) return;
    var isHome = document.body.classList.contains("is-home");
    if (isHome) return;
    
    var mainPanel = document.querySelector(".absolute.w-full.z-30") as HTMLElement | null;
    if (!mainPanel) return;
    
    mainPanel.style.transition = "none";
    mainPanel.style.top = "calc(5.5rem + 1rem)";
    mainPanel.style.minHeight = "calc(100vh - 6.5rem)";
    mainPanel.classList.add("mobile-main-no-banner");
}
```

Then register it on the Swup `content:replace` hook:

```ts
window.swup.hooks.on("content:replace", applyMobileArticleLayout);
```

And remove the non-home branch from `settlePageLayoutBeforeResume` (keep only the homepage cleanup):

```ts
if (window.innerWidth <= 1279) {
    var mainPanel = document.querySelector(".absolute.w-full.z-30") as HTMLElement | null;
    if (mainPanel) {
        var isHome = document.body.classList.contains("is-home");
        if (isHome) {
            mainPanel.style.removeProperty("top");
            mainPanel.style.removeProperty("min-height");
            mainPanel.style.removeProperty("transition");
            mainPanel.classList.remove("mobile-main-no-banner");
        }
    }
    var nativeST = window.__nativeScrollTo || window.scrollTo.bind(window);
    nativeST(0, 0);
}
```

**Verification:** First article visit — no gap flash. Second article visit — same smooth behavior.

---

## Summary

| File | Lines | Change |
|------|-------|--------|
| `swup-transition-performance.ts` | +15 / -8 | Add `applyMobileArticleLayout` on `content:replace`; clean inline styles on homepage in `settlePageLayoutBeforeResume` |

**Result:**
- First article visit: `content:replace` sets article position before content appears → no gap
- Back to homepage: `settlePageLayoutBeforeResume` cleans inline styles → grid at correct position
- Desktop: zero changes — all guarded by `innerWidth <= 1279`
