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

更详细的背景与踩坑记录见博客：[Cloudflare + Netlify 双层部署的改造](/posts/cloudflare-netlify-traffic-switch)。

---

# 修改内容

优化了Musicplayer，取消了进度条动画，添加了显示进度条时长和音量百分比的卡片。
转换了歌曲的加载策略，只在workflow运行时通过meting api获取歌曲url与封面，并将音频文件转化成opus之后保存到本地，加载速度更快。

优化了日记界面的TOC卡片，现在可以直接点击TOC跳转到相应月份的日记。

在pio组件中添加了聊天的功能，后端由Cloudflare Workers AI提供AI模块支持。

番剧从local模式改为调用bangumi api