## Quick orientation for AI coding agents ✅

**Short summary:** This repository is a personal projects workspace. The primary web project is `vedarublog.github.io` (an Astro-based static site). Other folders contain various unrelated personal projects (YOLOv5 training, Python scripts, C++ exercises) — focus on `vedarublog.github.io` unless the task explicitly targets another subproject.

---

### High-level architecture 🔧
- `vedarublog.github.io` is an **Astro** site with Svelte islands and an optional Cloudflare Worker deployment (see `astro.config.mjs` and `@astrojs/cloudflare` in `package.json`).
- Client-side behavior uses Swup for single-page-like transitions. Many client scripts reinitialize via Swup hooks (`content:replace`, `page:view`); see `src/layouts/Layout.astro` and many `src/components/*` files for examples.
- Comments use **Twikoo** (`src/components/comment/Twikoo.astro`) and rely on dynamic path handling + reinit on page swaps.
- Content can be stored in a separate content repository and synced into this codebase using `scripts/sync-content.js` (controlled by `.env` flags).

### Developer workflows & commands ▶️
- Use pnpm (required): `pnpm install` (project enforces `npx only-allow pnpm`).
- Local dev: `pnpm dev` → runs `astro dev` (predev runs image generation & content sync if enabled).
- Build: `pnpm build` → `astro build` + `pagefind` index + font compression. Use `pnpm preview` to serve the built site.
- Useful scripts:
  - `pnpm run sync-content` — clone / update content repo and create symlinks (Windows falls back to copy).
  - `pnpm run generate:images` — generate responsive images (depends on `sharp`).
  - `pnpm run compress-fonts` — font subsetting used in production build.
  - `pnpm run deploy` — deploy with `gh-pages` (or follow docs in `docs/DEPLOYMENT.md` for CI-triggered deploys).
- Formatting & linting: `pnpm run format` / `pnpm run lint` (uses Biome).

### Conventions & patterns to follow 💡
- Path alias: `@/` maps to `src/` (see `tsconfig.json`) — use this for imports in new files.
- Keep client-side logic resilient to Swup transitions: when adding client behavior, register for `swup` hooks and/or listen for `mizuki:page:loaded` (site uses this custom event after swaps).
- Configuration is centralized in `src/config.ts`. Update types in `src/types/config.ts` when adding new config keys.
- Content separation: content may live in a separate repo. Prefer editing content there when `ENABLE_CONTENT_SYNC` is enabled in `.env`.

### Integrations & important files 🔗
- Key files to reference:
  - `package.json` — scripts & dependencies (pnpm required)
  - `astro.config.mjs` — Astro + adapter and Swup plugin config
  - `src/config.ts` & `src/types/config.ts` — site configuration & types
  - `src/components/comment/Twikoo.astro` — comment component + dynamic init example
  - `scripts/sync-content.js`, `scripts/generate-responsive-images.js`, `scripts/compress-fonts.js` — build helpers
  - `docs/DEPLOYMENT.md`, `docs/CONTENT_SEPARATION.md`, `docs/AUTO_BUILD_TRIGGER.md` — deployment and CI workflow docs
  - `pnpm-lock.yaml` — shows Node engine compatibility (prefer Node >=18/20)

### Testing & CI notes 🧪
- Playwright is present (`@playwright/test`) but no site-specific tests were detected; use `npx playwright test` if tests are added.
- CI/deployment workflows are documented in `docs/DEPLOYMENT.md` and hook into GitHub Actions in `.github/workflows` for automatic builds.

### Do / Don't (actionable) ✅ / ❌
- ✅ When changing client JS, search for Swup hooks and add re-init logic (or trigger `mizuki:page:loaded`).
- ✅ When adding site config, update types in `src/types/config.ts` so TypeScript stays correct.
- ✅ Use `pnpm` and a Node >=18 runtime.
- ❌ Don’t assume dynamic behavior persists across page-swap events without re-initialization.
- ❌ Do not directly modify generated code in `dist/` or in `content` when content separation is enabled — update upstream content repo instead.
- ✅ Always fix all errors in repository before finishing a task (lint, typecheck, build).

---

### PR checklist for changes (use before opening a PR) ✅
- **Build:** Run `pnpm build` and verify the site builds without errors and `dist/` is created.
- **Format & Lint:** `pnpm run format` then `pnpm run lint` (Biome). Fix reported issues.
- **Type check:** If touching configs or types, run `pnpm run type-check`.
- **Swup / client scripts:** Run `pnpm dev` and navigate internal links (or use Playwright) to ensure interactive components reinitialize after Swup transitions. Look for `mizuki:page:loaded` custom events for comment or widget re-initialization.
- **Content sync (if relevant):** Test `pnpm run sync-content` with `ENABLE_CONTENT_SYNC` set appropriately (Windows will copy instead of symlink); verify `src/content`, `src/data`, and `public/images` are correct.
- **Tests:** Add or run Playwright tests for interactive flows: `npx playwright test` (optional but recommended for UI changes).
- **Docs:** Update `docs/DEPLOYMENT.md` or `docs/CONTENT_SEPARATION.md` if your change affects deployment/content workflows.

### Additional Insights from Documentation 📚

#### Album Feature in Mizuki Theme
- The `public/images/albums/` directory supports an **auto-scan mechanism** for album creation. To create a new album:
  1. Create a folder under `public/images/albums/` (folder name = album ID).
  2. Add a `cover.webp` (cover image) and other photos to the folder.
  3. Create an `info.json` configuration file in the folder with metadata (e.g., title, description, date, location, tags, layout, etc.).
  4. The album will automatically appear in the album list page.
- Example `info.json` structure:
  ```json
  {
    "title": "My Travel Album",
    "description": "Memories from Summer 2024",
    "date": "2024-08-01",
    "location": "Tokyo, Japan",
    "tags": ["travel", "landscape", "summer"],
    "layout": "masonry",
    "columns": 3,
    "hidden": false
  }
  ```

#### Content Separation
- Refer to `docs/CONTENT_SEPARATION.md` for detailed guidance on managing content in a separate repository.
- Key environment variables:
  - `ENABLE_CONTENT_SYNC`: Controls whether content is synced from an external repository.
  - Ensure `.env` is correctly configured for content synchronization.

#### Deployment
- Deployment options include GitHub Pages, Vercel, Netlify, and Cloudflare Pages.
- For CI-triggered deployments, refer to `docs/DEPLOYMENT.md`.
- Use `pnpm run deploy` for manual deployment with `gh-pages`.

#### Responsive Images
- Use `pnpm run generate:images` to create responsive images. This script depends on the `sharp` library.

#### Font Compression
- Use `pnpm run compress-fonts` to subset fonts for production builds.

#### Key Directories
- `docs/`: Contains detailed documentation for deployment, content separation, and CI workflows.
- `public/images/albums/`: Album feature configuration and images.
- `src/`: Main source code directory for the Astro site.
- `scripts/`: Helper scripts for content sync, image generation, and font compression.