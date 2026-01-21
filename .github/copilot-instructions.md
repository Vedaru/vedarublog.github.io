## 快速上手（给 AI 代码协助代理）✅

**简要说明：** 这个仓库是个人项目集合，主要关注点是根目录下的 `vedarublog.github.io`（基于 Astro 的静态站点，集成 Svelte/Swup/Cloudflare Worker）。其他文件夹（YOLO、Python、C++ 等）是独立项目，除非任务明确指定，否则把工作重点放在 `vedarublog.github.io`。

---

## 关键概览（要点）🔧
- 平台：**Astro (v5.x)** + Svelte 组件为交互岛（查看 `astro.config.mjs` 和 `package.json` 的插件配置）。
- 客户端路由/过渡：使用 **Swup** 做页面切换，很多客户端脚本在 `content:replace` / `page:view` 等事件里重初始化 — 参考 `src/layouts/Layout.astro` 与 `src/components/*`。
- 评论：使用 **Twikoo**（`src/components/comment/Twikoo.astro`），注意需在页面 swap 后重新 init。
- 内容分离：支持将内容放到单独仓库并通过 `scripts/sync-content.js` 同步（控制开关为 `.env` 中的 `ENABLE_CONTENT_SYNC`）。Windows 上会回退为复制而非符号链接。
- 样式/工具链：`biome` 做格式化与 lint，TypeScript 做类型检查，`sharp` 负责图片处理（构建时需要 `libvips`）。

---

## 常用命令与开发工作流 ▶️
- 安装（必须使用 pnpm）：
  - `pnpm install --frozen-lockfile`（CI 推荐）或 `pnpm install`。
  - 项目强制 `preinstall` 为 `npx only-allow pnpm`。
- 本地开发：
  - `pnpm dev`（内部有 `predev`，会尝试执行 `generate-responsive-images` 和 `sync-content`，但这些步骤可被环境变量控制）。
- 构建与预览：
  - `pnpm build`（会执行 `astro build`、`pagefind` 索引与字体子集压缩）。
  - `pnpm preview` 查看生产构建。
- 常用脚本示例：
  - `pnpm run sync-content` — 同步/克隆内容仓库（Windows 回退为复制）。
  - `pnpm run generate:images` — 生成响应式图片（依赖 `sharp` 与系统库 `libvips`）。
  - `pnpm run compress-fonts` — 字体压缩/子集化。
  - `pnpm run download-music` — 运行 `scripts/download-music.js`（CI 有对应的 workflow）。
- lint/format/type-check：
  - `pnpm run format`、`pnpm run lint`（biome）
  - `pnpm run type-check`（tsc --noEmit）

---

## CI / 工作流 要点（重要）🛠️
- 关键工作流目录：`.github/workflows/`。
  - `CI.yml`（Deploy Astro to GitHub Pages）：使用 Node 20、pnpm v10.x，CI 会安装 `libvips-dev`（sharp 依赖）并运行 `pnpm build`。
  - `download-music.yml`（Download and Commit Music）：可由手动触发（`workflow_dispatch`）或 `push` 触发。此 workflow 使用 `GH_PAT`（`secrets.GH_PAT`）来允许在运行器中 push 文件（`public/assets/music/**`）。
- 常见 CI 调试点与陷阱：
  - CI 有时会使用 `pnpm config set bin-links false` 作为 workaround（见 `download-music.yml`）。
  - 若构建产物缺失，CI `build` job 有一段会创建临时 `dist/index.html`，以便快速诊断 — 如看到这个页面，说明生产内容未生成。
  - Node/PNPM 版本需与 CI 保持一致（推荐 Node 20、pnpm 10.22.0）。

---

## 项目惯例与实践（注意具体实现）💡
- 路径别名：`@/` 映射到 `src/`（查看 `tsconfig.json`）。新文件使用该别名导入。
- 客户端脚本：所有涉及页面内交互或第三方 widget（Twikoo、PhotoSwipe 等）的 JS，都必须对 Swup 页面切换做重初始化（监听 `swup` 事件或 `window` 上的 `mizuki:page:loaded` 自定义事件）。
- 配置集中：主配置在 `src/config.ts`；新增配置需同步更新 `src/types/config.ts` 的类型定义。
- 内容来源：若 `ENABLE_CONTENT_SYNC` 生效，优先修改内容仓库而非本仓库中的生成内容。

---

## 常见任务示例（可直接执行）🔎
- 测试下载音乐并提交（本地）：
  - `pnpm run download-music` → 检查 `public/assets/music/` 是否有变更。
- 生成图片以调试构建：
  - `pnpm run generate:images`（需 `sharp` & `libvips` 在本机可用）。
- 模拟 CI 环境：
  - `PNPM_HOME` 与 `corepack enable` 在本机启用 corepack，保持 `pnpm install --frozen-lockfile` 行为一致。

---

## PR 检查清单（提交前务必验证）✅
1. Build: 本地或 CI 上成功执行 `pnpm build`，`dist/` 包含预期页面（检查 `dist/index.html` 与主要页面）。
2. Format / Lint: `pnpm run format` && `pnpm run lint`（修复所有警告/错误）。
3. Type check: 如改动类型或 config，执行 `pnpm run type-check`。
4. 功能回归：运行 `pnpm dev` 并在站内点击内链，确保 Swup 切换后的组件均能正确重初始化（例如评论、相册、懒加载等）。
5. 若改动与 `download-music` 或静态资源相关，运行 `pnpm run download-music` 并验证 `public/assets/music/` 或 `public/images/` 的最终状态。
6. 文档：对变更影响到部署、内容分离或构建流程的，更新 `docs/DEPLOYMENT.md` / `docs/CONTENT_SEPARATION.md` 等。

---

> 如果你（或我）在某个部分没覆盖到你关心的具体实现或文件，请指出要我补充哪部分（例如：某个脚本的运行细节、CI 的 Secret、或某个组件的重初始化流程）。我会根据你的反馈迭代这份 `copilot-instructions.md`。 ✅