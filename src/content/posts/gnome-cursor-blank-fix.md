---
title: 修复 GNOME 锁屏变黑后光标依然可见的问题
published: 2026-07-31
pinned: false
description: 修复 GNOME Wayland 下 Intel 核显锁屏渐黑后光标依然可见的 bug
tags: [linux, gnome, wayland, intel, bugfix, extension]
category: 技术
draft: false
---

# 修复 GNOME 锁屏变黑后光标依然可见的问题

## 问题

在 GNOME Wayland + Intel 核显的环境下，锁屏后经过空闲超时屏幕渐黑，但鼠标光标依然会留在纯黑的屏幕上。用 NVIDIA 独显就没有这个问题。

这个问题出现在 Intel+NVIDIA 混合模式下（Intel 核显做主输出、NVIDIA 做渲染）。由于 NVIDIA 驱动在 GNOME 下存在[显存泄漏](https://gitlab.gnome.org/GNOME/mutter/-/issues)的问题，混合模式成了唯一可用的配置。

## 根因

GNOME Shell 的锁屏模块（ScreenShield）有两套不同的变黑机制：

**桌面空闲变黑**：`gnome-settings-daemon` 调用 Mutter 的 `PowerSaveMode=1`（DPMS 关闭），直接切断显示信号。信号都没了，光标自然不显示。

**锁屏空闲变黑**：ScreenShield 使用 Lightbox 叠加层 —— 在 primary DRM plane 上渲染一个软件渐黑动画。但在 Intel 核显上，光标被放在一个独立的硬件光标 plane 上，这个 plane 位于 primary plane **上方**。渐黑动画覆盖了 primary plane，但光标 plane 毫无影响 —— 所以光标留在了黑屏上。

用 NVIDIA 的时候，因为强制使用了 `MUTTER_DEBUG_FORCE_KMS_MODE=simple`，光标被合并在合成场景里渲染，Lightbox 可以自然覆盖。但 Intel 用原生 KMS 模式，硬件光标 plane 完全绕过了 Clutter 场景图。

这个问题被记录在 [GNOME Shell issue #6165](https://gitlab.gnome.org/GNOME/gnome-shell/-/issues/6165)，从 GNOME 43 到 50 一直未修复。

## 修复

GNOME Shell 的 `screenShield.js` 里已经有一个 `_hidePointerUntilMotion()` 方法，它隐藏光标并挂载一个动作监听器以便光标恢复。锁屏初次显示时会调用这个方法。但 `_activateFade()` —— 也就是启动渐黑动画的方法 —— 从来没有调用过它。

修复只需要在 `_activateFade` 里加一行：

```javascript
_activateFade(lightbox, time) {
    Main.uiGroup.set_child_above_sibling(lightbox, null);
    this._hidePointerUntilMotion();  // ← 加这一行
    lightbox.lightOn(time);
    ...
}
```

由于 GNOME Shell 把 JS 编译进了二进制文件里，不能直接改源码。解决办法是写一个极简的 GNOME Shell 扩展，在运行时 monkey-patch 这个方法。

## 安装

1. 创建扩展目录：

```bash
mkdir -p ~/.local/share/gnome-shell/extensions/fix-cursor-blank@local
```

2. 创建 `metadata.json`：

```json
{
  "name": "Fix Cursor on Blank Screen",
  "description": "Hides cursor when lock screen fades to black",
  "uuid": "fix-cursor-blank@local",
  "shell-version": ["49", "50"]
}
```

3. 创建 `extension.js`：

```javascript
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export default class FixCursorBlank extends Extension {
    enable() {
        const shield = Main.screenShield;
        if (!shield || !shield._activateFade) return;

        this._shield = shield;
        this._orig = shield._activateFade.bind(shield);

        shield._activateFade = (lightbox, time) => {
            shield._hidePointerUntilMotion();
            this._orig(lightbox, time);
        };
    }

    disable() {
        if (!this._shield) return;
        this._shield._activateFade = this._orig;
        this._shield = null;
        this._orig = null;
    }
}
```

4. 注销后重新登录，然后启用：

```bash
gnome-extensions enable fix-cursor-blank@local
```

## 原理

1. 锁屏出现 → 已有的 `_hidePointerUntilMotion()` 隐藏光标
2. 移动鼠标 → `_showPointer()` 恢复光标（原有行为）
3. 渐黑动画开始 → 扩展再次调用 `_hidePointerUntilMotion()` → 光标在渐黑期间隐藏
4. 移动鼠标唤醒 → 动作监听器触发 → `_showPointer()` → 光标在锁屏上恢复

扩展用的是 ScreenShield 自己的 API，不涉及 DPMS hack，无副作用，无双光标。

## 环境

- Ubuntu 26.04 LTS
- GNOME Shell 50.1 (Wayland)
- Intel Arrow Lake 核显 + NVIDIA RTX 5060 独显（混合模式）
