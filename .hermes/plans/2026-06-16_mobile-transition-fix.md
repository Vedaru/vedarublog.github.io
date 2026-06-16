# Mobile Page Transition — Simple Crossfade (No Scroll/Position Animation)

> **For Hermes:** Two surgical reverts. Implement directly.

**Goal:** Mobile page transitions use pure CSS crossfade (like desktop) — no JS-driven position animation, no scroll animation. Click article card → content fades to article.

**Architecture:** The CSS `.transition-main` system (Mizuki-style) already provides content fade-in/fade-out. We just need to stop our JS from fighting it and stop mobile classes from snapping the container during the transition. Two changes, both deletions.

---

## Current Problem

Multiple layers of JS animation (added in previous attempts) create timing conflicts with the CSS transition system. The Mizuki `.transition-main` fade already works — we need to get out of its way.

## Root Cause

1. `main-grid-swup.ts` has JS code that captures `.main-panel` top and animates it — this fights the CSS transition system
2. `applyVisitBannerLayout` adds `mobile-main-no-banner` during `visit:start`, instantly changing `.main-panel` top from `70vh` to `6.5rem` before content replacement — this is the snap

## Fix (2 changes)

### Task 1: Suppress mobile class effects during Swup transitions

**File:** `src/styles/mobile-fixes.css`

**Objective:** During Swup transition phases (`is-changing` / `is-animating`), prevent `mobile-hide-banner` and `mobile-main-no-banner` from changing layout. After transition ends, classes take effect naturally.

Find the block at ~line 474:
```css
  html.is-changing #banner-wrapper,
  html.is-animating #banner-wrapper {
    transition: none !important;
  }
```

Replace with:
```css
  /* Swup 换页期间：冻结 banner + 抑制 mobile-* 类的布局效果，
     让容器像桌面端一样稳定；换页结束后 CSS 过渡自然接管 */
  html.is-changing #banner-wrapper,
  html.is-animating #banner-wrapper {
    transition: none !important;
  }

  html.is-changing #banner-wrapper.mobile-hide-banner,
  html.is-animating #banner-wrapper.mobile-hide-banner {
    height: auto !important;
    min-height: auto !important;
    overflow: visible !important;
    visibility: visible !important;
  }

  html.is-changing .main-panel.mobile-main-no-banner,
  html.is-animating .main-panel.mobile-main-no-banner {
    top: auto !important;
    min-height: auto !important;
  }
```

**What this does:**
- During transition: banner stays visible, `.main-panel` top stays at homepage position (wherever CSS would put it without `mobile-main-no-banner`)
- After `is-animating` is removed: classes take effect → banner hides via CSS transition, `.main-panel` slides up via `transition: top 380ms`
- Content crossfade (`.transition-main`) plays during the stable phase

**Step 1:** Apply the patch above  
**Step 2:** Build: `pnpm run build`  
**Step 3:** Verify build succeeds

---

### Task 2: Remove all JS position animation from main-grid-swup.ts

**File:** `src/scripts/widgets/main-grid-swup.ts`

**Objective:** Remove every line of JS animation code added in previous attempts. Revert `setupSwupLayoutSync` to its original form — it should only handle grid/list layout sync, nothing about position animation.

Read the current file, find `setupSwupLayoutSync` (around line 222), and replace the entire function body with:

```ts
function setupSwupLayoutSync() {
    // @ts-ignore
    if (typeof window !== "undefined" && window.swup) {
        // animation:out:start — 准备布局
        // @ts-ignore
        window.swup.hooks.on("animation:out:start", function () {
            var pendingLayout = getPostListLayout();
            if (pendingLayout) {
                // @ts-ignore
                window.__pendingLayoutMode = pendingLayout;
            }
        });

        // content:replace — 立即应用布局
        // @ts-ignore
        window.swup.hooks.on("content:replace", function () {
            const mainGrid = document.getElementById("main-grid");
            if (mainGrid) {
                // @ts-ignore
                const currentLayout =
                    window.__pendingLayoutMode || getPostListLayout();
                setMainGridLayout(mainGrid, currentLayout);
                syncPostListDataset(currentLayout);
                const postListContainer = document.getElementById(
                    "post-list-container",
                );
                if (postListContainer) {
                    postListContainer.classList.remove("list-mode", "grid-mode");
                    if (currentLayout === "grid") {
                        postListContainer.classList.add("grid-mode");
                        postListContainer.classList.add(
                            "grid", "grid-cols-1", "lg:grid-cols-2", "gap-6",
                        );
                        postListContainer.classList.remove("flex", "flex-col");
                    } else {
                        postListContainer.classList.add("list-mode");
                        postListContainer.classList.add("flex", "flex-col");
                        postListContainer.classList.remove(
                            "grid", "grid-cols-1", "lg:grid-cols-2", "gap-6",
                        );
                    }
                }
                // @ts-ignore
                delete window.__pendingLayoutMode;
            }
        });

        return true;
    }
    return false;
}
```

Verify the function contains NO references to:
- `__mobileOldPanelTop`
- `.absolute.w-full.z-30`
- `newPanel.style.transition`
- `newPanel.style.top`
- `animDuration`
- `shiftEasing`
- `transitionend`

**Step 1:** Read the current file: `read_file src/scripts/widgets/main-grid-swup.ts offset=222`  
**Step 2:** Apply the patch to remove all animation code  
**Step 3:** Build: `pnpm run build`  
**Step 4:** Verify build succeeds

---

### Task 3: Revert `shell-bootstrap.ts` applyVisitBannerLayout

**File:** `src/scripts/runtime/shell-bootstrap.ts`

**Objective:** If `applyVisitBannerLayout` was modified in previous attempts (deferring `mobile-main-no-banner`), revert it to the original. The CSS suppression in Task 1 handles everything — no JS changes needed here.

Read the function at ~line 376. If it contains `applyAfterTransition` or `requestAnimationFrame` or any mobile-specific logic, revert to:

```js
window.__applyVisitBannerLayout = function applyVisitBannerLayout(visit) {
    const pathsEqual = window.__pathsEqual;
    if (!pathsEqual) return;

    const targetPath = window.__pathFromUrl?.(visit.to.url) ?? visit.to.url;
    const isHomePage = window.__isMainHomePage?.(targetPath) ?? false;

    const bannerTextOverlay = document.querySelector(".banner-text-overlay");
    if (bannerTextOverlay) {
        if (isHomePage) {
            bannerTextOverlay.classList.remove("hidden");
        } else {
            bannerTextOverlay.classList.add("hidden");
        }
    }

    const bannerWrapper = document.getElementById("banner-wrapper");
    const mainContentWrapper = document.querySelector(".absolute.w-full.z-30");

    if (bannerWrapper && mainContentWrapper) {
        if (isHomePage) {
            bannerWrapper.classList.remove("mobile-hide-banner");
            mainContentWrapper.classList.remove("mobile-main-no-banner");
        } else {
            bannerWrapper.classList.add("mobile-hide-banner");
            mainContentWrapper.classList.add("mobile-main-no-banner");
        }
    }
};
```

If the function already matches this (no animation code added), skip this task.

**Step 1:** Read: `read_file src/scripts/runtime/shell-bootstrap.ts offset=376 limit=35`  
**Step 2:** If modified, patch to revert; otherwise skip  
**Step 3:** Build: `pnpm run build`

---

## Verification

1. `pnpm run build` — must succeed
2. `pnpm run preview` — open in browser
3. Mobile viewport (375px): click article card on homepage → content should cleanly crossfade to article page. No teleport, no scroll jump, no double animation.
4. Desktop: all transitions unchanged — no regression.

## Complete Diff Summary

| File | Expected change |
|------|----------------|
| `src/styles/mobile-fixes.css` | +12 lines (CSS suppression rules) |
| `src/scripts/widgets/main-grid-swup.ts` | -80 lines (remove JS animation), back to original |
| `src/scripts/runtime/shell-bootstrap.ts` | 0 lines (already correct) |
