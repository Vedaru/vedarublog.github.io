# 个人博客

自己做的个人博客，使用的是Mizuki博客模板。

## 部署架构

本站采用 **Cloudflare Pages + Netlify 回源代理** 的双层 CDN，并通过 GitHub Actions 实现 **省 credits** 与 **自动故障切换**。

```text
正常模式：
  访客 → www.vedaru.cn（Netlify CDN）
       → 200 回源 → vedarublog-github-io.pages.dev（Cloudflare Pages）

故障 / credits 不足时（Actions 自动切换）：
  访客 → www.vedaru.cn（Cloudflare 橙云直连 Pages）
```

| 组件 | 职责 |
|------|------|
| **Cloudflare Pages** | 源站：Astro 构建、托管 `dist` |
| **Netlify** | CDN 入口：仅生成全站回源代理规则 |
| **Cloudflare DNS** | 域名解析，由 Actions 脚本自动切换 |
| **GitHub Actions** | 定时巡检 credits / HTTPS，自动改 DNS + 注册 Pages 域名 |

### 减少 Netlify deploy

Netlify 只是代理层，博客内容更新**不需要**重新 deploy。`netlify.toml` 配置了 ignore 脚本，仅当以下文件变更时才构建（每次 production deploy 约消耗 15 credits）：

- `netlify.toml`
- `scripts/netlify-proxy-build.js`
- `scripts/netlify-should-build.mjs`

改文章、前端、CI 等 → **跳过 deploy**。手动更新代理配置可用 Netlify Build Hook 或 UI 重试 deploy。

### 自动切换流量（Netlify ↔ Cloudflare）

Workflow：`.github/workflows/netlify-traffic.yml`（每 2 小时 cron + 可手动触发）

脚本：`scripts/netlify-traffic-switch.mjs`

**auto 模式**（定时任务默认）满足任一条件即切到 Cloudflare 直连：

- 本月 Netlify credits 估算剩余 ≤ 45
- Netlify 站点 paused / 不可用
- `https://www.vedaru.cn` HTTPS 探测失败

切到 Cloudflare 时会自动：

1. 在 Pages 项目注册 `www.vedaru.cn`（及 apex）
2. 将 `www` CNAME 指向 `vedarublog-github-io.pages.dev` 并开启**橙云**
3. 同步 apex 记录

credits 恢复充足后（剩余 > 105）自动切回 Netlify。

本地调试：

```bash
pnpm netlify-traffic
# 或
DRY_RUN=1 node scripts/netlify-traffic-switch.mjs
```

### GitHub Secrets

| Secret | 用途 |
|--------|------|
| `CF_API_TOKEN` | Zone DNS Edit（vedaru.cn） |
| `CF_PAGES_API_TOKEN` | 可选；Account Cloudflare Pages Edit |
| `CF_ZONE_ID` | vedaru.cn 的 Zone ID |
| `CF_ACCOUNT_ID` | 可选 |
| `NETLIFY_AUTH_TOKEN` | credits 检测 |
| `NETLIFY_SITE_ID` | credits 检测 |
| `NETLIFY_CNAME_TARGET` | 如 `xxx.netlify.app` |

`CF_API_TOKEN` 也可合并 Pages 权限；若 Pages API 报 `Authentication error`，需为 Token 添加 **Account → Cloudflare Pages → Edit**。

切换状态记录在 `.github/netlify-traffic-state.json`。

更详细的背景与踩坑记录见博客：[Cloudflare + Netlify 双层部署的改造](https://www.vedaru.cn/posts/cloudflare-netlify-traffic-switch)。

---

## 音乐源（CI 自带 wrapper）

歌曲元数据、封面、播放 URL 在 CI 构建时通过 Meting API 拉取并落到 `public/assets/music/`，运行时**完全不依赖**外部 API。

### 工作流

1. **CI runner 临时启动 wrapper**：每次构建在 `ubuntu-latest` runner 上 clone [`Vedaru/meting-api`](https://git.vedaru.cn/Vedaru/meting-api)，`npm install` 后 `node wrapper.js` 在 `127.0.0.1:3300` 跑后台。
2. **下载脚本连本地 API**：`scripts/download-music.js` 读 `METING_API_BASE=http://127.0.0.1:3300/api` 环境变量，把这首歌单的元数据/封面/音频流式写入 `public/assets/music/`。
3. **提交到仓库**：所有 `.opus` + `.webp` + `playlist.json` 都作为静态资源进 git。运行时直接从 GitHub Pages / Cloudflare Pages 加载，零外部依赖。
4. **runner 结束自毁**：job 完成后 wrapper 进程随 runner 一起消失，无需维护。

### 为什么不直接连网易云

- **跨区域 CD**N：GitHub Actions runner 在美/欧，网易云 CDN 偶发返回 104 KB 错误页。`wrapper.js` 服务端代理 + 失败重试 + 重新解析签名 URL 解决。
- **地理封禁**：某些歌（如 夜明けと蛍 arrange ver.）对中国大陆 IP 不返回，导致自建服务器版 wrapper 漏歌。CI runner 的 US/EU IP 不受这个限制。
- **机器人检测**：伪装 `User-Agent` + `Cookie` 头，匹配 upstream Meting 自身调用 `music.163.com` 用的浏览器指纹。

### 关键文件

| 位置 | 作用 |
|------|------|
| `.github/workflows/CI.yml` | 启 wrapper + 下载 + 提交 |
| `scripts/download-music.js` | Meting 客户端，含"不删除成功歌曲"回归保护 |
| `src/wrapper.js`（在 meting-api 仓库） | Hono 服务：auth、限流、NetEase 服务端代理、签名 URL 重新解析 |

### Secrets

| Secret | 在哪 | 用途 |
|--------|-----|------|
| `METING_KEY` | GitHub `Vedaru/vedarublog.github.io` | CI 内部给 wrapper 鉴权用，本地 `127.0.0.1` |

本地生成新密钥：

```bash
openssl rand -hex 32
# 然后更新 GitHub repo Settings → Secrets → Actions → METING_KEY
```

---

# 修改内容

优化了Musicplayer，取消了进度条动画，添加了显示进度条时长和音量百分比的卡片。
转换了歌曲的加载策略，只在workflow运行时通过meting api获取歌曲url与封面，并将音频文件转化成opus之后保存到本地，加载速度更快。

优化了日记界面的TOC卡片，现在可以直接点击TOC跳转到相应月份的日记。

在pio组件中添加了聊天的功能，后端由Cloudflare Workers AI提供AI模块支持。

番剧从local模式改为调用bangumi api
