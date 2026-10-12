---
title: How simple design beats stacking up code
published: 2026-09-26
pinned: false
description: The rework from "write an API" to "change three lines of CSS", and the whole self-built tooling infrastructure that saved.
tags: [Hyprland, Waybar, design, refactoring, reflection]
category: Programming
draft: false
---

# I almost patched Hyprland

It started with a tiny need: I wanted to know at a glance whether any window was still open in a given Hyprland workspace.

A very plain idea, right?

## First reaction: add an API

Earlier, to make Alt+Tab pop up a window switcher, I had written a small tool called `WindowSwitcher`, a **2.6 KB Python script**. That little thing dragged along:

- its own Forgejo repository;
- a `.forgejo/workflows/package.yml` packaging pipeline;
- a registry package (`window-switcher-1.0.tar.zst`);
- an Ansible vendored-component registration with a `sentinel` verification path;
- a whole section in MANIFEST.md plus an entry in the README checklist;
- and a keybinding in `hyprland.lua`.

The reasoning at the time was: Hyprland does not directly expose "which windows are in each workspace and which is focused", so I shall add one. Modify C++, aggregate the window tree by workspace, serialise it to JSON, and let Waybar read it.

That route sounds thorough, but it means:

- maintaining a private Hyprland branch (already `vedaru/v0.56.2-ime-popup`, and this would add another layer);
- handling rebase conflicts on every upstream release;
- introducing a new data contract that both ends must evolve together;
- all of it, just to add a few words to a 24-pixel-tall status bar.

The code could be written. The question was whether it was **worth it**.

## First ask whether the system already has the primitive

What actually overturned the whole plan was not a cleverer architecture but stopping to read the Waybar manual.

The fact is: Waybar's `hyprland/workspaces` module **already** adds CSS classes to each workspace button — `.active`, `.visible`, `.urgent`, and one almost nobody notices, `.empty`: a class applied automatically when a workspace has no windows.

In other words, the information "which workspace has windows" was there all along, simply never used. I did not need a new API, did not need to touch the compositor, did not even need to touch Waybar's config. All I needed was:

```css
/* Workspaces with windows: put a brighter surface behind the number */
#workspaces button:not(.empty) {
  background-color: @surface-container-highest;
}

/* The focused workspace: one level up again */
#workspaces button.active,
#workspaces button.focused {
  background-color: @primary-container;
  color: @on-primary-container;
}
```

Three lines. No branch, no data contract, no interface to keep up with. However upstream changes, this CSS never needs to move.

There is a detail I only figured out halfway: at first I expressed "has windows" by **changing the colour of the number**, which was wrong. Occupancy should be expressed by the button's **surface** (its background block), while the number itself stays quiet. That is exactly what GNOME 46+'s accent system and Material 3 do: hierarchy conveyed through tonal steps rather than coloured text. With the design right, the code actually got shorter.

Once the need itself was superseded by a better answer (the workspace blocks already said clearly where things were happening), I retired the whole self-built tool, and the Alt+Tab binding in `hyprctl -j binds` went to zero. What got deleted: the binary, the selector function, a line in the version table, a name in the comps array, a section in the docs — **six accompanying pieces, for one 2.6 KB script**.

That is the truth about complexity: it is never billed by lines of code. The real cost of a self-built tool is the total of the repositories, CI, packages, distribution, documentation and mental load it drags behind it. While writing you see the 2.6 KB; while maintaining you face the six.

## Why "add" always comes before "subtract"

Looking back, there was a very practical reason the first instinct was to patch the compositor rather than read the manual: **writing code gives instant feedback, and subtraction does not.**

Add an API and you see it compile, see data flow, see the interface light up; every step rewards you. But "read the docs first, discover it already exists" produces no artefact, only a judgement — it can even look like doing nothing at all. So we slide instinctively towards "I will build one", because building has a concrete feel to it.

Yet that very feel is what most easily hides a fact: **the part that can be deleted is often the real solution.**

## A few takeaways

1. **Find the primitive before building the wheel.** Before adding a layer, check whether the system already exposes the minimal signal you need — it might be a CSS class you never used, an environment variable that already exists, a hook already in place. Most of the time you think you need to "extend the system" because you have not finished reading it.

2. **Express state on the surface, not by rewriting content.** "Has windows" is a property of the button, not of the number. Put it on the background and the semantics land at the right level, and the style rules get shorter and more stable.

3. **Price a "small tool" by its total cost.** The weight of a script equals the pipeline it brings. Before writing it, ask: will it grow its own repo, CI and docs? If yes, it is not a small tool.

4. **Delete early, and delete completely.** Delete only the binary and leave the registry entry and the next deploy will pull it back; delete only the binding and leave the docs and the next person will think it is still in use. Retiring the whole set is cheaper than leaving half.

## Closing

After that rework, nothing on the Waybar got bigger — the compositor was untouched, the branch no longer, no new interface, and the line count actually went down. Yet the light and shade of the workspace blocks had already said everything that needed saying.

We tend to think a "stronger system" means more code. In this case, stronger design meant less: no patch, no API, not even the self-built tool that existed for three weeks.

**The best engineering decision is sometimes a successful deletion.**

