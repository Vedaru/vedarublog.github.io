
This website is built with the **Astro** framework using the [Mizuki](https://github.com/matsuzaka-yuki/mizuki) theme.

::github{repo="matsuzaka-yuki/Mizuki"}

# 🌟 关于我

## 🎨 请多指教
- **身份** - 医学专业大二学生，编程、服务器这些折腾纯属个人爱好
- **兴趣** - 二次元文化爱好者，热爱动画、漫画与游戏，吉他编曲新手，正在学习音乐制作
- **状态** - 永远在学习路上的萌新，乐于分享与交流
- **风格** - 重度 Vibe Coding 玩家（大量 AI 辅助），代码有雷请轻喷🙏

## 📝 本站内容
这里主要记录我的学习成长和兴趣分享：

## 🎵 音乐创作
- VOCALOID 使用心得与技巧分享
- Cubase 编曲经验与问题探讨
- 原创音乐作品与幕后制作过程
- 吉他编配与音乐理论实践

## 🎨 二次元文化
- 新番观后感与推荐
- ACG 文化现象杂谈

## 💻 技术学习
- 编程学习过程中的笔记与总结
- 网站开发技术实践记录
- 技术问题解决方案分享
- 有趣的小项目展示（左下角雪初音可爱捏~）

## ❤️ 创建初衷
- **记录成长** - 记录从编程小白到进阶的学习历程
- **知识整理** - 将零散的知识系统化，加深理解
- **寻找同好** - 结识同样喜欢编程、音乐和二次元的朋友
- **分享交流** - 希望我的经验能帮助到有相同兴趣的人
- **自我督促** - 通过公开写作倒逼自己持续学习QWQ

## 🗓️ 更新时间
- **每周日** - 固定更新
- **不定期** - 更新日记和追番内容

## 🛠️ 自建基础设施

除了把博客放在 Cloudflare Pages 上，我自己还折腾了一整套 Homelab——一台旧笔记本（Lenovo 小新 Air 13，i5-6200U + 8GB 内存）装 Ubuntu 26.04 headless，去掉 GUI、音频、蓝牙等一切多余的东西，全程通过 SSH 管理。所有服务都跑在 Docker 里，Web 端口只绑定 `127.0.0.1`，对外统一走 **Cloudflare Tunnel**（服务器零开放入站端口，SSL 全自动）。

### 🔧 自建 Git 服务
我在这里跑了一套 [Forgejo](https://git.vedaru.cn)（[git.vedaru.cn](https://git.vedaru.cn)）。这是我自行构建的定制版本，相比官方版本额外支持：
- **Git Annex** - 可以用 git-annex 管理音频、素材、模型权重等大文件
- **Project API** - 开放了项目相关的 API，方便脚本与自动化调用

维护方式也改成了 fork 上游、跟着 release rebase，而不是给 tarball 打补丁。有时候我会先在这里开发、折腾，等差不多稳定了再推送到 GitHub，所以有些项目可能会先在自建服务上出现～

### 🧰 其他自建服务
| 服务 | 用途 |
| --- | --- |
| **Portainer** | Docker 容器可视化管理 |
| **Beszel** | 轻量服务器监控（Hub + Agent） |

### 🌐 服务地图
| 域名 | 服务 |
| --- | --- |
| `git.vedaru.cn` | Forgejo Git 托管 |
| `portainer.vedaru.cn` | Docker 管理面板 |
| `monitor.vedaru.cn` | Beszel 系统监控 |

### 🧪 在折腾的项目
- **kuro** - Kuro Games 的 Linux 原生安装/更新器（Rust）
- **bili-tui** - 终端里的 B 站直播工具（Rust）
- **aniko** - Tauri 2 + Svelte、Linux 优先的动漫客户端
- **Hyprland / Ardour / Forgejo** - 给上游打的补丁与定制 fork

### 🚧 接下来想做的
- **Minecraft 服务端**（PaperMC，已预留内存）
- **NapCat QQ 机器人**

## 📬 与我联系
欢迎通过以下方式交流：
- 在文章下方留言评论
- 通过[GitHub](https://github.com/Vedaru)关注我的项目

### 期待与更多同好成为朋友！
---

*Built with ❤️ using Astro and inspired by modern web design principles.*
