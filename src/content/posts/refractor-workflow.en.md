---
title: Rebuilding my workflow
published: 2026-07-05
description: Migrating from a Cursor IDE + GitHub Copilot setup to an all-terminal Neovim + tmux + Hermes Agent workflow.
tags: [Neovim, WSL2, tmux, Hermes, Git, workflow]
category: Programming
draft: false
---

# From Cursor to the terminal: rebuilding my GitHub workflow

Over the past few months my development environment has moved completely: from Windows with Cursor IDE and GitHub Copilot as a GUI workflow, to an all-terminal Neovim + tmux environment running inside WSL2.

## Why move

**1. WSL disk "bloat" anxiety**

WSL2's virtual disk (`ext4.vhdx`) only grows, never shrinks. After a while, `node_modules`, Docker images and Git objects push the VHDX into the tens of gigabytes. Even though pnpm's hard links mean `node_modules` does not really take extra space, the number `du` reports is still unsettling.

The fix was to pin the disk ceiling: set a hard limit with `Resize-VHD`, plus a scheduled compact. WSL's disk then becomes a predictable space that will not grow without bound.

**2. Cursor is too heavy**

Cursor is essentially VS Code with a full Electron runtime. On a 16 GB laptop, Windows itself takes 4 GB and Docker Desktop another 2-4 GB, leaving only 3-4 GB for WSL. Adding Cursor's LSP and Copilot processes puts too much pressure on memory.

Neovim's tsserver LSP peaks around 1.5 GB, Hermes Agent around 500 MB, and the rest is system buffer: 4 GB is just enough. Lightweight is not only about saving resources; it is about making every component earn its place under a hard hardware constraint.

**3. I needed a partner in the terminal**

Cursor's agent is genuinely good, but it is heavy and expensive.
I have also tried plenty of terminal CLI agents. GitHub Copilot's free tier is small and mostly does completion; it is useful but cut off from my workflow. What I want is a partner that can run commands, read files, edit code and verify a deploy, not just complete a function.

Hermes Agent fills that role: an AI agent running in the terminal that can operate the filesystem, execute commands, read build output and then iterate on a fix. It does not replace Copilot's completion; it replaces the whole loop of me alt-tabbing, hunting for the error by hand, editing code and running it again.

## Key decisions

### Package management: npm to pnpm

pnpm's hard links are a natural fit for WSL's ext4: the tens of thousands of files in `node_modules` are almost all links into a global store, and the real disk usage is one copy in the store. Sharing one store across projects is an order of magnitude lighter than the per-project `node_modules` I had on Windows.

```bash
# Install once
corepack enable
corepack prepare pnpm@latest --activate
# Every project then shares the global store
pnpm install
```

### Building: staying in WSL after all

I considered throwing builds into Docker to save disk, but did the arithmetic:

- `node_modules` is needed during development anyway (LSP, dev server, lint), so it cannot be removed
- The build output `dist/` is only 62 MB; not worth a Docker layer
- Docker images themselves take disk, so moving out may not save anything

Conclusion: running `pnpm run build` directly in WSL is the most sensible option right now.

### Git: drop the GUI, embrace the terminal

VS Code's Git panel is intuitive, but a few pain points pushed me fully to the terminal:

- `git stash` accidentally stashed the whole worktree when I only wanted one file; in the terminal `git stash push -- <file>` is precise
- Clicking through merge conflicts in a GUI is worse than `git mergetool` plus editing in nvim
- Complex rebase / cherry-pick / bisect is nearly impossible in a GUI

All Git work now happens in a tmux pane, with `gh` CLI for PR management.

I started with Windows Terminal, but tmux and nvim had a bizarre "SIXEL IMAGE" rendering bug there, so I switched to WezTerm. Trust me, it is good.

### Whole-disk file search: Everything inside Neovim

Everything (voidtools) on Windows is the only instant whole-disk filename search. I bound it to nvim's `<leader>fF`, going through the `es.exe` command-line interface with snacks picker's live finder for real-time queries.

> Pitfall: Everything 1.5 alpha uses the named instance `1.5a`, and `es` connecting to the unnamed instance by default reports `IPC window not found`. You must add `-instance 1.5a`.

The other big pitfall is UAC. Everything needs administrator rights to read the NTFS MFT, but nvim runs as a normal process. Starting it directly pops a UAC prompt every time.

The way out: **scheduled tasks**. Create a scheduled task with "run with highest privileges", and have nvim trigger it with `schtasks /run`, which Windows does not gate behind UAC. A second scheduled task handles exiting. So both are startable and stoppable without UAC.

## WSL2 tuning

### A carefully tuned `.wslconfig`

```ini
[wsl2]
networkingMode=mirrored
memory=4GB
swap=2GB
processors=6
autoMemoryReclaim=gradual
```

A few points:

- `autoMemoryReclaim=gradual` (WSL 2.6+) replaces the old `pageReporting`, letting Windows gradually reclaim memory pages WSL no longer uses
- `localhostForwarding` has no effect under `mirrored` networking, so it is removed to avoid a warning
- 4 GB is the balance I arrived at by repeatedly testing between tsserver (~1.5 GB), Hermes (~500 MB) and system buffer

## The current toolchain

| Layer | Old (Cursor) | New (Terminal) |
|---|---|---|
| Editor | Cursor IDE (VS Code) | Neovim + LazyVim |
| AI assistance | GitHub Copilot (sidebar completion) | Hermes Agent (terminal agent) |
| Terminal | Windows Terminal (occasionally) | tmux 3.4 + Windows Terminal |
| Package manager | npm | pnpm 10.x |
| Git | VS Code Git panel | terminal `git` + `gh` CLI |
| Environment | native Windows | WSL2 Ubuntu 24.04 |
| File search | Everything (manual) | Everything via nvim `<leader>fF` |

## What is still missing

1. **CI/CD**: GitHub Actions is currently hand-written. I want to explore whether Hermes can take part in CI, for example triaging issues or reviewing PR diffs automatically.

2. **Docker builds**: for projects needing a specific build environment (an Android APK, say) Docker is still worth it, but I need to sort out Docker Desktop's memory limit and disk usage first so it does not eat WSL's disk.

3. **Multi-machine sync**: everything lives on one laptop, and I have no need for remote development or continuing on another terminal. But tmux + nvim + Hermes should in principle be SSH-friendly, so I can try it later.

## Takeaways

- **Subtracting under a hard constraint** tests judgement more than stacking features. 4 GB of memory and a 1 TB virtual disk are not shackles; they force me to understand what each component is actually doing.
- **The terminal is not a step backwards.** The convenience of a GUI sometimes hides the underlying mechanism: precise control of `git stash`, the space saved by pnpm's hard links, WSL's `autoMemoryReclaim`. Going back to the terminal made me understand what I am operating.
- **Find a partner that can run commands**, which is more useful than a tool that completes code. Copilot completes a line; Hermes completes the whole edit-test-fix loop. The two paradigms are not substitutes, but for my current projects the terminal agent fits better.

