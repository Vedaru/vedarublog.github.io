
This website is built with the **Astro** framework using the [Mizuki](https://github.com/matsuzaka-yuki/mizuki) theme.

::github{repo="matsuzaka-yuki/Mizuki"}

# 🌟 About Me

## 🎨 Nice to meet you
- **Who I am** — A second-year medical student. Programming and servers are purely a personal hobby.
- **Interests** — Anime, manga and games. A beginner at guitar arrangement, currently learning music production.
- **Status** — Perpetually a beginner, always learning, happy to share and chat.
- **Style** — A heavy "vibe coding" user (lots of AI assistance). If you spot a landmine in my code, please be gentle 🙏

## 📝 What is on this site
Mostly a record of my learning and my hobbies:

## 🎵 Music
- Notes and tips on using VOCALOID
- Cubase arrangement experience and troubleshooting
- Original tracks and behind-the-scenes production notes
- Guitar arrangement and music theory in practice

## 🎨 Anime & ACG
- Impressions and recommendations for new seasons
- Ramblings about ACG culture

## 💻 Tech
- Notes and summaries from learning to program
- Records of web development practice
- Write-ups of technical problems and how I solved them
- Small side projects (the snow Miku in the bottom-left corner is cute, right?)

## ❤️ Why I started this
- **Track progress** — Document the road from beginner to (hopefully) competent
- **Organise knowledge** — Turn scattered notes into something coherent
- **Find kindred spirits** — Meet people who also like programming, music and anime
- **Share** — I hope my experience helps someone with the same interests
- **Keep myself honest** — Writing in public forces me to keep learning QWQ

## 🗓️ Update schedule
- **Every Sunday** — Regular updates
- **Irregularly** — Diary entries and anime progress

## 🛠️ Self-hosted infrastructure

Besides hosting this blog on Cloudflare Pages, I run a full homelab: an old laptop (Lenovo Xiaoxin Air 13, i5-6200U + 8 GB RAM) running Ubuntu 26.04 headless, with the GUI, audio, Bluetooth and anything else unnecessary stripped out, managed entirely over SSH. Everything runs in Docker, web ports bind only to `127.0.0.1`, and all external traffic goes through a **Cloudflare Tunnel** (no inbound ports open on the server, fully automatic SSL).

### 🔧 Self-hosted Git
I run a [Forgejo](https://git.vedaru.cn) instance at [git.vedaru.cn](https://git.vedaru.cn). It is a custom build of my own, with two additions over upstream:
- **Git Annex** — manage large files such as audio, assets and model weights with git-annex
- **Project API** — exposes project-related APIs for scripts and automation

Maintenance works by forking upstream and rebasing on each release, rather than patching tarballs. Sometimes I develop here first and push to GitHub once things settle, so a few projects may show up on my own server first.

### 🧰 Other self-hosted services
| Service | Purpose |
| --- | --- |
| **Portainer** | Visual Docker container management |
| **Beszel** | Lightweight server monitoring (Hub + Agent) |

### 🌐 Service map
| Domain | Service |
| --- | --- |
| `git.vedaru.cn` | Forgejo Git hosting |
| `portainer.vedaru.cn` | Docker management panel |
| `monitor.vedaru.cn` | Beszel system monitoring |

### 🧪 Things I am tinkering with
- **kuro** — a native Linux installer/updater for Kuro Games titles (Rust)
- **bili-tui** — a Bilibili live-stream client for the terminal (Rust)
- **aniko** — a Tauri 2 + Svelte, Linux-first anime client
- **Hyprland / Ardour / Forgejo** — upstream patches and custom forks

### 🚧 Planned
- **Minecraft server** (PaperMC, memory already reserved)
- **NapCat QQ bot**

## 📬 Get in touch
Always happy to talk:
- Leave a comment under any post
- Follow my projects on [GitHub](https://github.com/Vedaru)

### Looking forward to meeting more people with the same interests!
---

*Built with ❤️ using Astro and inspired by modern web design principles.*
