# Desktop Transition Bugs Fix Plan

> **For Hermes:** Two surgical fixes. Implement directly.

**Goal:** Fix two desktop-only bugs: (1) clicking article card without scrolling first → teleport no animation, (2) clicking navbar "主页" → flicker.

**Architecture:** Bug 1 happens because `__lockSwupScrollAndPin` makes body `position:fixed` even when `scrollY === 0`, triggering a synchronous layout that kills the CSS transition start frame. Bug 2 is a same-page transition — clicking "主页" on `/` or `/1/` fires an unnecessary Swup transition. Both are desktop-only. No mobile code touched.

---

## Bug 1: Desktop no-scroll click → no animation

### Root Cause

When `scrollY === 0`, `__lockSwupScrollAndPin` does:
1. `body.style.position = "fixed"` → body collapses, triggers sync reflow
2. `body.style.top = "0px"` → no visual change since already at top

The synchronous reflow from step 1 can prevent the browser from capturing the "before" state of the CSS transition on `.transition-main`. The transition needs two clean frames (before → after) to animate; the forced reflow collapses them into one.

### Fix

In `swup-lifecycle.ts` `applyVisitStartLayout`: on desktop, skip the scroll lock when `scrollY === 0`. The page is already at top — locking is unnecessary.

**File:** `src/scripts/swup-lifecycle.ts` ~line 225-230

**Current:**
```ts
} else if (!window.__homePreScrollWasUsed) {
    if (window.innerWidth <= 1279) {
        window.__lockSwupScroll?.();
    } else {
        window.__lockSwupScrollAndPin?.();
    }
}
```

**Replace with:**
```ts
} else if (!window.__homePreScrollWasUsed) {
    if (window.innerWidth <= 1279) {
        window.__lockSwupScroll?.();
    } else {
        // 桌面端：scrollY=0 时跳过锁屏（已在顶部），避免 fixed 布局
        // 触发的同步重排打断 CSS transition 起始帧
        var scrollY = window.scrollY || document.documentElement.scrollTop || 0;
        if (scrollY > 0) {
            window.__lockSwupScrollAndPin?.();
        }
    }
}
```

**Verification:** Desktop, fresh load, don't scroll, click article card → content fades smoothly (no teleport). Desktop, scroll down, click card → same behavior as before (lock + fade).

---

## Bug 2: Navbar "主页" button flicker

### Root Cause

When user is already on homepage (`/` or `/1/`) and clicks "主页", Swup fires a page transition to the same URL. Content is replaced with identical content, causing a visual flash.

### Fix

In `swup-lifecycle.ts` `visit:start` hook: before firing the transition, check if the target URL is the same as current and skip.

**File:** `src/scripts/swup-lifecycle.ts` ~line 417-440

**Current (visit:start hook):**
```ts
window.swup.hooks.on(
    "visit:start",
    (visit: { to: { url: string }; scroll?: { reset?: boolean } }) => {
        cleanupFancybox();

        if (shouldSmoothScrollSamePage(visit)) {
            if (visit.scroll) {
                visit.scroll.reset = false;
            }
            return;
        }
        // ...
    }
);
```

`shouldSmoothScrollSamePage` only matches pagination pages (`/` ↔ `/2/`). Need broader check.

**Replace the early-return block with:**
```ts
window.swup.hooks.on(
    "visit:start",
    (visit: { to: { url: string }; scroll?: { reset?: boolean } }) => {
        cleanupFancybox();

        // 同页跳转或回到已加载的相同 URL：跳过换页
        if (shouldSmoothScrollSamePage(visit)) {
            if (visit.scroll) {
                visit.scroll.reset = false;
            }
            return;
        }

        // 桌面端首页重入（/ 或 /1/ → /）：跳过不必要的换页
        var currentPath = window.location.pathname.replace(/\/$/, "") || "/";
        var targetPath = (function () {
            try { return new URL(visit.to.url, window.location.origin).pathname; }
            catch (_) { return visit.to.url; }
        })().replace(/\/$/, "") || "/";
        if (currentPath === targetPath || window.__pathsEqual?.(currentPath, targetPath)) {
            if (visit.scroll) visit.scroll.reset = false;
            return;
        }

        // ...
    }
);
```

**Verification:** On homepage, click "主页" in navbar → no flicker. On article page, click "主页" → normal transition to homepage.

---

## Summary

| File | Change |
|------|--------|
| `swup-lifecycle.ts` | Bug 1: skip scroll lock on desktop when scrollY=0 |
| `swup-lifecycle.ts` | Bug 2: skip Swup transition when navigating to current URL |
