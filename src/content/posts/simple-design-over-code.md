---
title: 给工作区加占用指示：一次差点改 Hyprland 的返工
published: 2026-09-26
pinned: false
description: 记录一次返工：为了在 Waybar 上区分「有窗口 / 没有窗口」的工作区，最初打算在 Hyprland 里加一套 API，最终只加了一条 CSS 规则；顺带退役的 WindowSwitcher 自研工具及其全部配套。
tags: [Hyprland, Waybar, CSS, 重构]
category: 编程
draft: false
---

# 给工作区加占用指示：一次差点改 Hyprland 的返工

这篇记录一次返工：想给 Waybar 的工作区加一个「有窗口」的标记。最初的方案是在 Hyprland 里加一套 API，最后落地的是一条款 CSS 规则。同一轮里还退役了一个 2.6 KB 的自研工具，连带删掉了它的全部配套。

## 需求

Waybar 的 `hyprland/workspaces` 配置里设了常驻工作区：

```jsonc
"persistent-workspaces": { "*": 5 }
```

所以 1–5 号工作区一直显示在状态栏上。问题是每个数字外观完全一样，看不出哪个工作区里真的有窗口。需要的只是一个视觉标记：有窗口的工作区，和空占位的工作区，看起来不一样。

## 最初的方案：在 Hyprland 里加一套 API

当时的想法是：Hyprland 没有直接暴露「每个工作区里有哪些窗口、当前聚焦的是哪个」这样一个接口，那就在合成器里加一个。改 C++，把窗口树按工作区聚合，序列化成 JSON，再让 Waybar 去读。

这条路要付出的东西是明确的：

- 这台机器上的 Hyprland 已经是一个本地 fork（`git.vedaru.cn/Vedaru/Hyprland`，分支 `vedaru/v0.56.2-ime-popup`，tag `v0.56.2-vedaru1`，上游 `v0.56.2` 加一个 IME popup 补丁），新的改动要再叠一层；
- 上游每次发版都要处理一次 rebase；
- 引入一个两端需要一起演进的数据契约。

而这一切，是为了在状态栏上一块 24 像素高的区域里多一处颜色。

## 实际的做法：Waybar 已经提供了这个信号

转折点不是更聪明的架构，而是先读了一遍 Waybar 的手册。

Waybar 的 `hyprland/workspaces` 模块本来就给每个工作区按钮打了 CSS 类：`.active`、`.visible`、`.urgent`，以及 `.empty`——一个工作区没有窗口时，模块自己会加上这个类。也就是说「哪个工作区里有窗口」这个信息一直都在，只是没被用过。

于是不需要新 API，不需要改合成器，也不需要改模块配置，只改样式表。`private_dot_config/waybar/style.css` 那次是 +15 / −5：

```css
/* 有窗口的工作区：在数字背后垫一块比状态栏表面更亮一级的色块。
   空的工作区占位符保持平铺。Waybar 自己会加 `empty` 类，所以不需要额外的模块配置。
   这条规则放在 :hover 之后，指针划过时占用状态不会跟着变。 */
#workspaces button:not(.empty) {
  background-color: @surface-container-highest;
}
```

聚焦工作区的 `.active` / `.focused` 沿用了原有的 `@primary-container` / `@on-primary-container` 色块，那次没有改动，只是把 `:hover` 规则移到了 `:not(.empty)` 前面，避免悬停覆盖占用色。

## 一处纠正：占用是按钮的状态，不是数字的样式

第一版实现改的是工作区数字的颜色。这是错的。

占用是按钮（工作区）的状态，不是数字的属性，所以应该由按钮的表面（背景色块）来表达，数字本身保持安静。色阶上，「有窗口」只比状态栏底色亮一级（`@surface-container-highest`），聚焦再上一层（`@primary-container`）。这也是 GNOME 46+ 的强调色体系和 Material 3 的做法：层级由明度台阶区分，而不是给文字上色。

改到背景之后，规则反而更短了。

## 顺带退役：WindowSwitcher

同一轮清理里还有一件事。

之前为了让 `Alt+Tab` 弹出一个窗口切换面板，写过一个叫 `WindowSwitcher` 的 Python 脚本，装在 `~/.local/bin/WindowSwitcher`，2656 字节。这条需求本身现在没了：工作区色块已经能把「哪里有窗口」说清楚，`Alt+Tab` 的绑定在 `977622a` 里删掉。绑定一删，脚本就没有调用方了。

这个脚本很小，但它牵出来的东西是这些：

| 位置 | 内容 | 现状 |
| --- | --- | --- |
| `git.vedaru.cn/Vedaru/WindowSwitcher` | 独立仓库（无 GitHub upstream，本地起家；公开） | 已删 |
| 该仓库的 `.forgejo/workflows/package.yml` | 每次 push `main` 打包，并把脚本装到 `~/.local/bin/WindowSwitcher`（Python，755） | 已删 |
| registry | 包 `window-switcher-1.0.tar.zst` | 已删 |
| `ansible/group_vars/all.yml` | `vendored_components` 里的登记条目（name / version / sentinel） | 已删 |
| `ansible/vendored/publish.sh` | selector、version 表、`comps` 数组三处接线 | 已删 |
| `ansible/vendored/MANIFEST.md` | 一节说明（仓库、打包方式、绑定来源） | 已删 |
| `README.md` | vendored 清单里的名字 | 已删 |
| `private_dot_config/hypr/private_hyprland.lua` | `ALT + Tab` 绑定 | 已删（`977622a`） |
| `~/.local/bin/WindowSwitcher` | 2656 字节的脚本本体 | 已删 |

退役分两步。chezmoi 里的提交是 `24311fa`，动了 4 个文件（+18 / −51），另外删掉了那个二进制。仓库外的两份资源（Forgejo 仓库和 registry 包）不在这个 git 仓库里，不会被一起删掉，需要单独通过 Forgejo API 清理，这一步是后来补的。

还有一点背景值得记下来：这些本地工具原本打包在一个叫 `vedaru-tools` 的单体 bundle 里，后来被拆成每个工具一个独立组件，理由写在 MANIFEST 里——每个工具有自己的仓库和 registry 包，就能在它自己的代码变化时单独重发，不必重新打包整套。拆分的动机没问题，但副作用是每个小工具的固定开销从「bundle 里的一行」变成了「一个仓库 + 一条 CI + 一个 registry 包 + 一处 ansible 登记」。一个 2656 字节的脚本被拆出来之后，就自动背上了这一整套。

## 可以带走的几点

1. **先确认系统有没有现成的原语。** 这个案例里就是 Waybar 自己打的 `.empty` 类。在动手加一层之前，先确认系统是否已经暴露了你需要的最小信号；多数「要扩展系统」的情况，其实是系统没读全。

2. **状态用表面表达。** 占用是按钮的状态，放在背景色上；不要改写内容（数字颜色）。语义落在正确的层级，规则也随之变短。

3. **给自研工具按总成本计价。** 代码行数不是成本，成本是它牵出的仓库、CI、包、分发、文档和心智负担。写之前先问：它会不会长出自己的仓库、CI 和文档。如果会，它就不是小工具。

4. **删除要删干净。** 只删二进制而留着 registry 登记，下次部署会把它重新拉回来；只删绑定而留着文档，下一个人会以为它还在用。（这一条在本例里是推论，不是已经踩过的坑。）

5. **仓库外的资源要单独处理。** 删掉 chezmoi 仓库里的引用，不会动到 Forgejo 上的 `WindowSwitcher` 仓库和 registry 里的 `window-switcher-1.0.tar.zst`——它们不在这个 git 仓库里。清理 git 仓库只是退役的一半，另一半得走 Forgejo API。

## 结语

这次返工之后，合成器没有被改，分支没有变长，也没有新增接口；改动只有样式表里的一条规则，以及删掉一整套已经没人用的配套。

回到最初的判断：一个看起来需要「扩展系统」的需求，先花十分钟把系统读完，可能就只剩一条规则要写。这个结论不新鲜，但每次的第一反应仍然容易是「我要造一个」——因为写代码有即时反馈，读文档没有产出。这一点本身也是需要留意的地方。
