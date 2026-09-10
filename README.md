# 个人博客

自己做的个人博客，使用的是Mizuki博客模板。

## 部署架构

本站部署在 **Cloudflare Pages**（Astro 构建 + 静态托管），域名 `vedaru.cn` / `www.vedaru.cn` 通过 **Cloudflare DNS 橙云（proxied）** 直连 Pages，TLS 由 Cloudflare 边缘证书统一终结。

```text
访客 → www.vedaru.cn（Cloudflare 橙云，自动 HTTPS）
     → vedarublog-github-io.pages.dev（Cloudflare Pages 源站）
```

| 组件 | 职责 |
|------|------|
| **Cloudflare Pages** | Astro 构建、托管 `dist`、CDN 边缘 |
| **Cloudflare DNS** | `www` / apex 记录指向 Pages（橙云 proxied） |
| **GitHub Actions** | 内容更新与构建（`CI.yml`），不再改 DNS |
| **GitHub Pages** | 备用镜像（`CI.yml` 顺带部署） |

> **历史**：早期采用「Netlify 回源代理 + Actions 自动切换 Netlify / Cloudflare」的双层 CDN。该方案已废弃 —— Netlify 始终拿不到 `vedaru.cn` 的自定义域名证书（DNS 常驻 Cloudflare，Let's Encrypt 的 HTTP-01 校验无法回源到 Netlify），叠加 Netlify 下发的 HSTS 后，脚本一旦把流量切到 Netlify，整站会直接以 `ERR_CERT_COMMON_NAME_INVALID` 打不开且无法跳过。详见博客：[Cloudflare + Netlify 双层部署的改造](https://www.vedaru.cn/posts/cloudflare-netlify-traffic-switch)。

### 为什么不再做自动切换

- Cloudflare Pages 本身已是完整 CDN；Netlify 只是它前面的一层回源代理，没有额外能力，却引入了一整类证书故障。
- 切换依赖改 DNS，传播与缓存期间新旧源并存，回滚不可靠。
- 单层后 `www`、apex、IPv4、IPv6 由同一张橙云证书覆盖，不会再出现「A 记录已切、AAAA 仍指向旧源」这种半切换状态。

### Netlify 残留文件

`netlify.toml`、`scripts/netlify-proxy-build.js`、`scripts/netlify-should-build.mjs` 目前仍保留，但不参与线上流量。**在 Netlify 控制台删除该站点后**即可一并删除；保留期间 ignore 脚本会让 Netlify 跳过构建，不消耗 credits。

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
