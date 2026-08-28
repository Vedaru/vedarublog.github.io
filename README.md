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

## 自建 Meting API（音乐源）

本站歌曲元数据、封面、播放 URL 通过自建的 [Meting API](https://github.com/xizeyoupan/Meting-API) 兼容接口获取，地址：`https://meting.vedaru.cn`。

第三方 Meting 镜像（`api.i-meto.com`、`metingapi.nanorocky.top` 等）经常 404、限流（418）或者返回失效的 CDN 签名链接。自建实例可控、稳定，且支持通过密钥隔离公共访问。

### 架构

```text
GitHub Actions（CI）
  ↓ HTTPS + X-Meting-Key
Cloudflare Tunnel（ssh.vedaru.cn）
  ↓ HTTP
自建 meting-api 容器（127.0.0.1:3300）
  ├─ wrapper.js（auth + rate limit + 日志）
  └─ upstream Meting 应用（从网易云获取元数据）
       ↓ 服务端代理（不再 302）
       网易云 CDN
```

### 关键点

- **服务端代理播放 URL**：上游 Meting 默认 `?type=url` 返回 302 跳转到网易云带签名的 CDN URL，跨区域（GitHub Actions runner 在美/欧）访问时偶尔返回 104 KB 错误页。`wrapper.js` 改为服务端 fetch 后流式返回（带 `X-Proxied-By` 头），稳定拿到完整 MP3。
- **认证**：`X-Meting-Key` 请求头，密钥从 Forgejo / GitHub Secrets 注入。仅对 `meting.vedaru.cn` 域名附加，不影响其他 Meting 镜像。
- **限流**：内存内令牌桶，60 req/min/IP（`RATE_LIMIT_PER_MIN` 可调）。日志输出每条请求的 IP、密钥状态、状态码、耗时。
- **隧道独占入口**：容器只监听 `127.0.0.1:3300`，外部只能通过 `https://meting.vedaru.cn`（Cloudflare Tunnel）访问，无直连。
- **失败关闭**：未配置 `METING_KEY` 时返回 503，避免误用。
- **资源上限**：128 MiB 内存硬限、PID 64、max-old-images 自动清理。

### 仓库与 CI

| 组件 | 位置 |
|------|------|
| 源码 | `git.vedaru.cn/Vedaru/meting-api`（自建 Forgejo） |
| 镜像构建 | `.forgejo/workflows/deploy.yml`，跑在已有的 `forgejo-runner`（host backend，无需 docker-in-docker） |
| Dockerfile | `src/Dockerfile`（多阶段：先在 PC 端 `podman build` 出一个 `meting-api-deps` 侧车镜像预装 `node_modules`，再由 runner 复用以避免 runner 沙箱内 `npm ci` 崩溃） |
| 部署目录 | `~/docker/meting-api/`（服务器上的 `docker compose up -d`） |

### Secrets

| Secret | 在哪 | 用途 |
|--------|-----|------|
| `METING_KEY` | Forgejo `Vedaru/meting-api` + GitHub `Vedaru/vedarublog.github.io` | API 鉴权 |
| `REGISTRY_USER` / `REGISTRY_TOKEN` | Forgejo | 镜像推送到本地 registry（备用，当前未用） |

本地生成新密钥：

```bash
openssl rand -hex 32
# 然后更新 .env、重启容器、再同步到 Forgejo/GitHub Secrets
```

---

# 修改内容

优化了Musicplayer，取消了进度条动画，添加了显示进度条时长和音量百分比的卡片。
转换了歌曲的加载策略，只在workflow运行时通过meting api获取歌曲url与封面，并将音频文件转化成opus之后保存到本地，加载速度更快。

优化了日记界面的TOC卡片，现在可以直接点击TOC跳转到相应月份的日记。

在pio组件中添加了聊天的功能，后端由Cloudflare Workers AI提供AI模块支持。

番剧从local模式改为调用bangumi api
