---
title: 工作流重构
published: 2026-07-05
description: 从 Cursor IDE + GitHub Copilot 迁移到 Neovim + tmux + Hermes Agent 的全终端工作流。
tags: [Neovim, WSL2, tmux, Hermes, Git, 工作流]
category: 编程
draft: false
---

# 从 Cursor 到终端：我的 GitHub 工作流重构

过去几个月，我的开发环境经历了一次彻底的迁移：从 Windows 上开着 Cursor IDE、点着 GitHub Copilot 的 GUI 工作流，搬到了一个全终端、跑在 WSL2 里的 Neovim + tmux 环境。

## 为什么要搬

**1. WSL 磁盘「肿胀」焦虑**

WSL2 的虚拟磁盘（ext4.vhdx）只会长不会缩。开发久了，`node_modules`、Docker 镜像、Git 对象会把 VHDX 撑到几十 GB。虽然 pnpm 的硬链接已经让 `node_modules` 实际不占额外空间，但 `du` 报告的数字看着还是让人不安。

解决办法是把磁盘上限写死——用 `Resize-VHD` 设一个硬上限，加上定时 compact。这样 WSL 的磁盘就成了一个可预期、不会无限膨胀的空间。

**2. Cursor 太重**

Cursor 本质是 VS Code，带了一整套 Electron 运行时。在 16GB 内存的笔记本上，Windows 本身占 4GB，Docker Desktop 占 2-4GB，留给 WSL 的只有 3-4GB。Cursor 的 LSP 和 Copilot 进程叠上去，内存压力太大。

Neovim 的 tsserver LSP 峰值约 1.5GB，Hermes Agent 约 500MB，剩下的给系统缓冲——4GB 刚好够用。轻量不只是「省资源」，而是在有限硬件的约束下，让每个组件都物有所值。

**3. 我需要一个「终端里的搭档」**

Cursor 的 agent 确实好用，但是又笨重又贵。
关于终端CLI类型的agent我也尝试过不少。Github 的 Copilot 免费的额度很少，主要的作用还是代码补全，好用但和我的工作流割裂——我需要的是能跑命令、读文件、改代码、部署验证的搭档，而不只是补全函数。

Hermes Agent 填补了这个位置：它是一个跑在终端里的 AI agent，能直接操作文件系统、执行命令、读取构建输出，然后迭代修复。它替代的不是 Copilot 的补全功能，而是「我在终端里来回切、手动查错、改代码、再跑一遍」的整个循环。

## 关键决策

### 包管理：从 npm 到 pnpm

pnpm 的硬链接机制在 WSL 的 ext4 上天然受益——`node_modules` 里几万个文件几乎全是到全局 store 的链接，真正占用磁盘的是 store 里的一份。多个项目共享同一个 store，比我之前在 Windows 上每个项目一份 `node_modules` 轻一个数量级。

```bash
# 只安装一次
corepack enable
corepack prepare pnpm@latest --activate
# 之后所有项目共享全局 store
pnpm install
```

### 构建：最终还是留在 WSL

曾想把编译扔进 Docker 省磁盘，但算了笔账：

- `node_modules` 开发时本来就需要（LSP、dev server、lint），删不掉
- 构建输出 `dist/` 才 62MB，不值得加一层 Docker
- Docker 镜像本身也要存磁盘，搬出去未必省

结论：在 WSL 里直接 `pnpm run build` 是当前最合理的方案。

### Git：放弃 GUI，拥抱终端

VS Code 的 Git 面板确实直观，但几个痛点让我彻底转向终端：

- `git stash` 不小心暂存了整个工作区（想只暂存一个文件的），终端里 `git stash push -- <file>` 更精确
- Merge conflict 在 GUI 里点来点去不如 `git mergetool` + nvim 直接编辑
- 复杂的 rebase / cherry-pick / bisect 在 GUI 里几乎不可能

现在的 Git 操作全部在 tmux 的 pane 里完成，配合 `gh` CLI 做 PR 管理。

我一开始使用的终端是Windows自带的Windows Terminal，但是tmux和nvim在渲染的时候会有离奇的“SIXEL IMAGE”渲染bug。所以我最后改用了Wezterm。相信我，真的好用。

### 全盘文件搜索：Everything 融入 Neovim

Windows 上的 Everything (voidtools) 是全盘文件名秒搜的唯一方案。我把它绑到了 nvim 的 `<leader>fF` 上，通过 `es.exe` 命令行接口，配合 snacks picker 的 live finder 实时查询。

> 踩的坑：Everything 1.5 alpha 用了命名实例 `1.5a`，`es` 默认连无名实例会报 `IPC window not found`。必须加 `-instance 1.5a`。

另一个大坑是 UAC。Everything 启动需要管理员权限读 NTFS MFT，但 nvim 是普通权限进程。直接启会每次弹 UAC 确认框。

破局方案：**计划任务**。创建一个勾选「最高权限」的计划任务，nvim 用 `schtasks /run` 触发它——Windows 不会弹 UAC。再用另一个计划任务做退出。这样免 UAC 启停两者兼得。

## WSL2 调优

### `.wslconfig` 精修

```ini
[wsl2]
networkingMode=mirrored
memory=4GB
swap=2GB
processors=6
autoMemoryReclaim=gradual
```

几个要点：

- `autoMemoryReclaim=gradual`（WSL 2.6+）替代了旧的 `pageReporting`，让 Windows 能逐渐回收 WSL 不再用的内存页
- `localhostForwarding` 在 `mirrored` 网络模式下无效，删掉避免 warning
- 4GB 是在 tsserver（~1.5GB）+ Hermes（~500MB）+ 系统缓冲 之间反复试出来的平衡点

## 当前的工具链总结

| 层 | 旧 (Cursor) | 新 (Terminal) |
|---|---|---|
| 编辑器 | Cursor IDE (VS Code) | Neovim + LazyVim |
| AI 辅助 | GitHub Copilot (侧栏补全) | Hermes Agent (终端 agent) |
| 终端 | Windows Terminal (偶尔) | tmux 3.4 + Windows Terminal |
| 包管理 | npm | pnpm 10.x |
| Git | VS Code Git 面板 | terminal `git` + `gh` CLI |
| 环境 | Windows 原生 | WSL2 Ubuntu 24.04 |
| 文件搜索 | Everything (手动) | Everything via nvim `<leader>fF` |

## 还缺什么

1. **CI/CD**：目前 GitHub Actions 是手写的，之后想探索能不能让 Hermes 参与 CI 流程——比如自动 triage Issue、review PR diff。

2. **Docker 构建**：对于需要特定编译环境的项目（比如 Android APK），Docker 还是有价值的，但要先把 Docker Desktop 的内存限制和磁盘空间理清，不能让它反噬 WSL 的磁盘。

3. **多机同步**：所有东西都在一台笔记本上，没有远程开发/多终端继续的需求。但这套 tmux + nvim + Hermes 的栈理论上对 SSH 友好，以后可以试试。

## 收获

- **在有限资源上做减法**比堆功能更考验判断。4GB 内存、1TB 虚拟盘不是枷锁，是逼迫我搞清楚每个组件到底在干什么。
- **终端不是退步**。GUI 的便利有时会掩盖底层机制——比如 `git stash` 的精确控制、pnpm 的硬链接空间节省、WSL 的 `autoMemoryReclaim`。回到终端反而让我更理解自己在操作什么。
- **找一个能跑命令的搭档**比找一个会补全代码的工具更有用。Copilot 帮你补全一行，Hermes 帮你完成整个改-测-修循环。两种 AI 辅助的范式不是替代关系，但对我现在的项目而言，终端 agent 更对位。
