---
title: Fixing the visible cursor on a blacked-out GNOME lock screen
published: 2026-07-31
pinned: false
description: Fixing a GNOME Wayland bug where the cursor stays visible after the lock screen fades to black on Intel integrated graphics
tags: [linux, gnome, wayland, intel, bugfix, extension]
category: Tech
draft: false
---

# Fixing the visible cursor on a blacked-out GNOME lock screen

## The problem

On GNOME Wayland with Intel integrated graphics, after locking the screen and letting the idle timeout fade it to black, the mouse cursor stays visible on the fully black screen. With the NVIDIA discrete GPU there is no such problem.

The issue appears in Intel + NVIDIA hybrid mode (Intel drives the primary output, NVIDIA renders). Because the NVIDIA driver has a [VRAM leak](https://gitlab.gnome.org/GNOME/mutter/-/issues) under GNOME, hybrid mode is the only workable configuration.

## Root cause

GNOME Shell's screen shield (ScreenShield) has two different mechanisms for going black:

**Desktop idle blanking**: `gnome-settings-daemon` asks Mutter for `PowerSaveMode=1` (DPMS off), cutting the display signal outright. With no signal there is naturally no cursor.

**Lock-screen idle blanking**: ScreenShield uses a Lightbox overlay, rendering a software fade to black on the primary DRM plane. On Intel integrated graphics, however, the cursor sits on a separate hardware cursor plane, and that plane is **above** the primary plane. The fade covers the primary plane, but the cursor plane is untouched, so the cursor is left on the black screen.

With NVIDIA, `MUTTER_DEBUG_FORCE_KMS_MODE=simple` is forced, so the cursor is rendered inside the compositor scene and the Lightbox naturally covers it. Intel uses native KMS mode, so the hardware cursor plane bypasses the Clutter scene graph entirely.

This is tracked in [GNOME Shell issue #6165](https://gitlab.gnome.org/GNOME/gnome-shell/-/issues/6165) and has been unfixed from GNOME 43 through 50.

## The fix

GNOME Shell's `screenShield.js` already has a `_hidePointerUntilMotion()` method that hides the cursor and attaches a motion listener to bring it back. It is called when the lock screen first appears. But `_activateFade()`, the method that starts the fade animation, never calls it.

The fix is one line inside `_activateFade`:

```javascript
_activateFade(lightbox, time) {
    Main.uiGroup.set_child_above_sibling(lightbox, null);
    this._hidePointerUntilMotion();  // <- add this line
    lightbox.lightOn(time);
    ...
}
```

Because GNOME Shell compiles its JS into the binary, the source cannot simply be edited. The workaround is a minimal GNOME Shell extension that monkey-patches the method at runtime.

## Installation

1. Create the extension directory:

```bash
mkdir -p ~/.local/share/gnome-shell/extensions/fix-cursor-blank@local
```

2. Create `metadata.json`:

```json
{
  "name": "Fix Cursor on Blank Screen",
  "description": "Hides cursor when lock screen fades to black",
  "uuid": "fix-cursor-blank@local",
  "shell-version": ["49", "50"]
}
```

3. Create `extension.js`:

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

4. Log out and back in, then enable it:

```bash
gnome-extensions enable fix-cursor-blank@local
```

## How it works

1. The lock screen appears, and the existing `_hidePointerUntilMotion()` hides the cursor
2. Move the mouse, and `_showPointer()` restores it (existing behaviour)
3. The fade starts, and the extension calls `_hidePointerUntilMotion()` again, so the cursor is hidden during the fade
4. Moving the mouse to wake it triggers the motion listener, `_showPointer()` runs, and the cursor returns on the lock screen

The extension uses ScreenShield's own API. No DPMS hacks, no side effects, no double cursor.

## Environment

- Ubuntu 26.04 LTS
- GNOME Shell 50.1 (Wayland)
- Intel Arrow Lake integrated graphics + NVIDIA RTX 5060 discrete GPU (hybrid mode)

