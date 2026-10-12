---
title: Turning Neovim into a modern editor
published: 2026-06-17
description: The full process of polishing Neovim into an efficient, modern editor on top of LazyVim
tags: [Neovim, LazyVim, config, Windows, Everything]
category: Programming
draft: false
---

# Turning Neovim into a modern editor

This post records how I polished Neovim (NVIM 0.13 on Windows) step by step into a comfortable modern code editor, starting from **LazyVim**. It covers core options and keybinding enhancements, general language support, an all-black theme, reworking the completion keys, and the most fiddly and most interesting part: **using Everything for instant whole-disk filename search, with a scheduled task to dodge the UAC prompt entirely**.

Plenty of pitfalls along the way (import order, a `fillchars` error, a mysterious vertical black bar, the UAC prompt firing every time...), so this is less a configuration tutorial and more a record of the detours.

# Starting point: a LazyVim config

The initial setup was the standard LazyVim scaffold: the tokyonight theme, snacks (picker / explorer / dashboard), oil for file management, basic LSP, and a consistent set of window navigation keys `Ctrl-h/j/k/l` across modes. The goal was to keep what made sense and fill in the modern editor experience.

# 1. Core option enhancements

In `lua/config/options.lua` I only appended enhancements over LazyVim's defaults, avoiding big changes:

```lua
local opt = vim.opt

-- editing experience
opt.scrolloff = 8          -- keep 8 lines above and below the cursor
opt.cursorline = true      -- highlight the current line
opt.signcolumn = "yes"     -- always show the sign column, avoiding jitter
opt.virtualedit = "block"  -- block selection can extend past end of line

-- indentation / search
opt.expandtab = true
opt.shiftwidth = 2
opt.smartcase = true       -- case sensitive when the pattern has capitals
opt.inccommand = "split"   -- live preview of :s substitutions

-- files / performance
opt.undofile = true        -- persistent undo
opt.updatetime = 200
opt.confirm = true         -- prompt instead of erroring when quitting unsaved
```

> A small lesson: I originally also set the built-in terminal `shell` to PowerShell on Windows, but that requires correctly setting `shellcmdflag` / `shellredir` / `shellpipe` as a set, otherwise it silently breaks `:!`, Mason and some plugins' process calls. I gave up on it; leaving the default shell is the safest.

# 2. Keymaps and autocommands

In `keymaps.lua` I added a set of efficient bindings that do not clash with LazyVim's defaults:

```lua
local map = vim.keymap.set

-- saving
map({ "n", "i", "x", "s" }, "<C-s>", "<cmd>w<cr><esc>", { desc = "Save file" })

-- keep the selection after indenting in visual mode
map("x", "<", "<gv")
map("x", ">", ">gv")

-- wrap-friendly vertical movement plus centred scrolling
map({ "n", "x" }, "j", "v:count == 0 ? 'gj' : 'j'", { expr = true })
map({ "n", "x" }, "k", "v:count == 0 ? 'gk' : 'k'", { expr = true })
map("n", "<C-d>", "<C-d>zz")
map("n", "n", "nzzzv")
```

`autocmds.lua` gained two lightweight, non-destructive autocommands: turning off current-line highlight while in insert mode to reduce distraction, and downgrading for large files over 1 MB (disabling folding and spell check) to keep things smooth.

> I briefly wanted "save on focus lost", but it interacts surprisingly with format-on-save, LSP and file watchers, and is fairly aggressive, so I cut it.

# 3. General language support (and the import-order trap)

LazyVim ships a large set of official language extras; importing them gives you the matching LSP, formatter and Treesitter. I picked the general basics: JSON / YAML / TOML / Markdown / Docker / Git (Lua is already built in by LazyVim).

The first time I put these `import`s in a file under my own `plugins/` directory, LazyVim errored immediately:

> The order of your `lazy.nvim` imports is incorrect: `lazyvim.plugins` should be first, followed by any `lazyvim.plugins.extras`, and finally your own `plugins`.

So extras must come after LazyVim but before your own plugins. The right place is in the middle of the spec in `lua/config/lazy.lua`:

```lua
spec = {
  { "LazyVim/LazyVim", import = "lazyvim.plugins" },
  -- language extras: must come before your own plugins
  { import = "lazyvim.plugins.extras.lang.json" },
  { import = "lazyvim.plugins.extras.lang.yaml" },
  { import = "lazyvim.plugins.extras.lang.toml" },
  { import = "lazyvim.plugins.extras.lang.markdown" },
  { import = "lazyvim.plugins.extras.lang.docker" },
  { import = "lazyvim.plugins.extras.lang.git" },
  -- your own plugins
  { import = "plugins" },
},
```

# 4. Appearance: pure black and a weathered banner

## A small `fillchars` error

I wanted `opt.fillchars = { eob = " ", foldopen = "...", ... }` to hide the trailing `~` and customise the fold icons, and got this at start-up:

```text
E1511: Wrong number of characters for field "foldclose"
```

The cause was that some Nerd Font icons did not write the expected number of characters. LazyVim already sets nice fold icons, so the safest approach is to **append** just the one field you want rather than overriding the whole table:

```lua
opt.fillchars:append({ eob = " " }) -- hide the trailing ~
```

## A mysterious vertical black bar

After start-up a vertical black bar occasionally appeared down the screen. It turned out to be my `colorcolumn = "100"`: under tokyonight `ColorColumn` has a dark background, so it became a "vertical black bar", and it only appeared when the window was wide enough, which made it look intermittent. Deleted.

## Pure black background

Set all of tokyonight's backgrounds to pure black `#000000`:

```lua
opts = {
  style = "night",
  on_colors = function(c)
    c.bg = "#000000"; c.bg_dark = "#000000"; c.bg_float = "#000000"
    c.bg_sidebar = "#000000"; c.bg_statusline = "#000000"; c.bg_popup = "#000000"
    c.bg_highlight = "#0e0e0e" -- slightly lighter current line, invisible on pure black otherwise
  end,
  on_highlights = function(hl, c)
    hl.Normal = { bg = "#000000" }
    hl.NormalFloat = { bg = "#000000" }
    -- dashboard VEDARU banner: a dark, yellowed old-paper colour
    hl.SnacksDashboardHeader = { fg = "#c2a86b", bold = true }
  end,
}
```

While I was there I changed the dashboard banner to a dark, yellowed old-paper colour `#c2a86b`. One detail: when snacks sets its own highlights it uses `default = true`, which **does not override an existing definition**, so putting `SnacksDashboardHeader` into tokyonight's `on_highlights` takes effect reliably.

# 5. Completion keys: Tab accepts, Enter is Enter

LazyVim now defaults to **blink.cmp**, where Enter accepts completion. I prefer **Tab to accept and Enter just to insert a newline**, and on the command line I want up/down to select and Tab to accept.

Reading blink's preset source, the `super-tab` preset matches the main completion needs exactly (Tab accepts, up/down selects, no `<CR>` binding). New file `lua/plugins/blink.lua`:

```lua
return {
  "saghen/blink.cmp",
  opts = {
    keymap = {
      preset = "super-tab", -- Tab accepts, up/down selects, Enter inserts a newline again
    },
    cmdline = {
      keymap = {
        preset = "cmdline",
        ["<Up>"] = { "select_prev", "fallback" },
        ["<Down>"] = { "select_next", "fallback" },
        ["<Tab>"] = { "show", "select_and_accept", "fallback" },
      },
    },
  },
}
```

One crucial insight: for sources with `live = true`, blink puts the typed text in `filter.search` and leaves `pattern` empty (**no second filtering pass**). That is exactly what the custom whole-disk search below relies on.

# 6. Why `<leader>fg` searches everything so fast

I also wanted to understand why `<leader>fg` (snacks live grep) is fast: it does not walk files in Lua, it spawns **ripgrep** in the background (multi-threaded, respects `.gitignore`, streams asynchronously), and each keystroke **restarts the query, debounced**, with snacks' fast matcher doing ranking and highlighting. In essence: "ripgrep + automatic ignore + async streaming + live query".

Note that `<leader>fg` searches **file contents**; searching **file names** is `<leader>ff`.

# 7. `<leader>fF`: whole-PC filename search (Everything)

Next I wanted an entry point that searches filenames across **the entire computer**. Scanning all of `C:\` with `fd`/`rg` is slow and memory-hungry; the right answer on Windows is **Everything (voidtools)** and its command-line client `es.exe`, which has a whole-disk filename index and returns in milliseconds.

Using the "live sources are not filtered twice" behaviour from the previous section, I wrote a custom finder that feeds input to `es` in real time:

```lua
{
  "<leader>fF",
  function()
    local instance = "1.5a" -- Everything 1.5 alpha uses a named instance
    local es = vim.fn.exepath("es")
    -- ... omitted: the "es not found" hint and auto-start logic, see below ...
    Snacks.picker.pick({
      source = "everything",
      live = true,        -- re-query es on every keystroke
      supports_live = true,
      finder = function(_, ctx)
        local search = vim.trim(ctx.filter.search or "")
        if search == "" then return function() end end
        local args = { "-instance", instance, "-n", "500" } -- cap at 500 results for smoothness
        for _, term in ipairs(vim.split(search, " ", { plain = true, trimempty = true })) do
          args[#args + 1] = term
        end
        return require("snacks.picker.source.proc").proc({
          cmd = es, args = args, notify = false,
          transform = function(item) item.file = item.text end, -- es prints full paths
        }, ctx)
      end,
      formatters = { file = { filename_first = true } },
    })
  end,
  desc = "Find files on whole PC (Everything)",
}
```

Two pitfalls here:

1. **Error 8: Everything IPC window not found** — `es` is only a client, so `Everything.exe` must be running in the background.
2. I had installed **Everything 1.5 alpha**, which uses the **named instance `1.5a`**, while `es` connects to the unnamed instance by default. You must pass `-instance 1.5a` to connect.

# 8. Auto-start and exit-on-close

So I would not have to start Everything by hand, I added logic to `<leader>fF`: **start it if it is not running, and only quit it on picker close if this session started it** (using whether `es` can connect to decide if it is running; snacks picker supports an `on_close` callback).

In practice, though, an instance started with `Everything.exe -startup` runs with **administrator privileges** (its process path is unreadable, `taskkill` is denied, and `-exit` will not close it). Everything 1.5a runs resident at service privilege to index NTFS by default, and none of that can be touched by a non-admin nvim.

# 9. The last hard part: dodging UAC

After some adjusting Everything could run with normal privileges and be closed by `-exit`, but a new problem appeared: **every `<leader>fF` popped a UAC prompt**, because Everything needs administrator rights to read the NTFS master file table.

There is a fundamental tension here:

- To be **UAC-free**, it must run elevated and resident.
- To be **closeable by nvim**, it must run with normal privileges, but starting it needs admin, which pops UAC.

The way out is **Windows scheduled tasks**: create a task with "run with highest privileges", and when a normal-privilege process **triggers** it with `schtasks /run`, Windows **does not show a UAC prompt**. Add a second "exit" task, and you get both UAC-free start and closeable shutdown.

Create both tasks once, from an administrator shell:

```powershell
$exe = "D:\Everything\Everything.exe"
$p = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest
$s = New-ScheduledTaskSettingsSet
Register-ScheduledTask -TaskName "EverythingStart" -Action (New-ScheduledTaskAction -Execute $exe -Argument "-startup") -Principal $p -Settings $s -Force
Register-ScheduledTask -TaskName "EverythingExit"  -Action (New-ScheduledTaskAction -Execute $exe -Argument "-instance 1.5a -exit") -Principal $p -Settings $s -Force
```

> Tip: creating a highest-privilege task itself requires admin. The least fuss is to self-elevate once from a normal PowerShell using `Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile','-NoExit','-EncodedCommand',<base64>`; `-EncodedCommand` avoids all quoting and newline problems, and `-NoExit` keeps the window open so you can see the result.

Then the nvim side starts and stops it through the scheduled tasks:

```lua
-- if not running, start it UAC-free via the scheduled task
if not es_ready() then
  vim.fn.jobstart({ "schtasks", "/run", "/tn", "EverythingStart" }, { detach = true })
  started_by_us = true
  vim.wait(6000, es_ready, 200)
end

-- only quit on picker close if this session started it (also UAC-free)
on_close = started_by_us and function()
  vim.fn.jobstart({ "schtasks", "/run", "/tn", "EverythingExit" }, { detach = true })
end or nil,
```

The result: `<leader>fF` searches filenames across the whole disk instantly with **no UAC prompt at all**; if Everything was already running it is left alone, and if nvim started it, nvim tidies up on close.

# 10. Session management: back to `%` encoding

LazyVim uses `persistence.nvim` to save and restore sessions. On **Windows filenames cannot contain `\`, `/` or `:`**, so it encodes the path with `%`:

```
sessions/D%Personal_Files%Projects%Github%krita-master.vim
```

At first I found this ugly and spent several rounds trying to replace it.

## Failed attempts

**Option one: nested directories.** Split `D%Personal_Files%...%krita-master.vim` into `sessions/D/Personal_Files/.../Github/krita-master.vim`. In Oil this becomes a directory tree unfolding level by level; finding a session means walking through four or five levels. **Completely unusable.**

**Option two: replace `%` with `+`.** `+` is legal in Windows filenames and looks more like a path separator than `%`. I overrode `M.current()` in `persistence.lua` to encode the separator as `+`, and decoded `+` back to `/` in `oil.lua`. It looked clean, until one day I wanted to save a session for a `C++` project directory.

`D:/Personal_Files/Projects/C++/exe` encoded to `D+Personal_Files+Projects+C+++exe.vim`: the `+` inside `C++` is **indistinguishable** from the separator `+`, and decoding produced `D/Personal_Files/Projects/C///exe`. Any project with `+` in its path was broken.

**Conclusion: revert to the default `%` encoding.** `%` almost never appears in a path, it is Vim's convention of decades, and persistence.nvim's `select()` UI decodes it itself (`gsub("%%", "/")`) for display. No need to invent a wheel.

On the Oil side I only do one thing: decode `%` to `/` when browsing sessions.

```lua
-- oil.lua: load notification + gy copy
local display_name = entry.name:gsub("%.vim$", ""):gsub("%%", "/")
display_name = display_name:gsub("^([A-Za-z])/", "%1:/")
```

## Two bugs fixed along the way

1. **`-` to go up a directory occasionally failed** — the default keymap format was not strict enough and dropped the mode; adding `{ "actions.parent", mode = "n" }` fixed it.
2. **`E5108: attempt to call field 'select'`** — `oil.actions.select` is an action definition table, not a function. You need `oil.select()`, not `oil.actions.select()`.

## Extra operations: `ga`, `qw`, `qd`

**`<leader>qa` — pick a directory and add a session.** Open Oil, browse to the target directory, press `ga` to save. `ga` works in every Oil window, so you can also save while browsing sessions in `qS`.

```lua
-- oil.lua keymaps
["ga"] = {
  mode = "n",
  callback = function()
    local entry = require("oil").get_cursor_entry()
    local dir = require("oil").get_current_dir()
    if entry and entry.type == "directory" then
      dir = dir .. entry.name  -- save the directory under the cursor
    end
    dir = dir:gsub("\\", "/"):gsub("/+$", "")
    require("oil").close()
    vim.fn.chdir(dir)
    require("persistence").save()
    vim.notify("Session saved: " .. dir)
  end,
},
```

Pitfall: I first used `<leader>a`, which was taken by another plugin; and I originally only read `get_current_dir()`, so with the cursor on `.android` it saved `C:/Users/lenovo`. Adding the `entry.type == "directory"` check fixed it.

**`<leader>qw`** — save the current session manually; persistence only auto-saves on exit.

**`<leader>qd`** — `persistence.stop()` plus `:qa`, quitting without saving.

## Cleaning up the dashboard

The snacks dashboard has a "Restore Session" entry (`s`) by default, but the dashboard's cwd is the home directory, which almost never holds a session, so pressing it silently fails. Disabled:

```lua
dashboard = { sections = { session = { enabled = false } } },
```

## Keymap conflict: LazyVim defaults overriding mine

While debugging I found `<leader>qS` worked on the dashboard but stopped working as soon as a file was open. The reason is that LazyVim's default persistence config binds `keys = { { "<leader>qS", persistence.select } }`, registered on `BufReadPre`, and **the later registration overrides the earlier one**.

Solution: put all my session keys into `plugins/persistence.lua`'s `keys`, replacing LazyVim's originals:

```lua
return {
  "folke/persistence.nvim",
  keys = {
    { "<leader>qS", function() ... end, desc = "Manage Sessions (Oil)" },
    { "<leader>qs", function() require("persistence").load() end },
    { "<leader>ql", function() require("persistence").load({ last = true }) end },
    { "<leader>qw", function() require("persistence").save() end },
    { "<leader>qd", function() require("persistence").stop(); vim.cmd("qa") end },
  },
}
```

The rule: to override a keymap a LazyVim plugin ships, do not write it in `keymaps.lua`; write it in that plugin's `keys`.

# Takeaways

- **Enhancing LazyVim** is far easier to maintain than building from scratch: only override defaults, add languages via official extras, and mind the `import` order.
- Visual problems often come from an innocuous option (the vertical bar from `colorcolumn`, the character-count error from `fillchars`).
- Reading plugin source (blink's keymap presets, snacks' live mechanism) makes customisation far more effective.
- The general solution for "run as administrator without a UAC prompt" on Windows is **a highest-privilege scheduled task triggered with `schtasks /run`**, and that trick goes well beyond Everything.
- **Do not invent your own encoding scheme**: a `C++` project wrecked the `+` encoding, and going back to Vim's decades-old `%` convention was the right answer.

At this point the Neovim setup meets essentially all my expectations for an efficient modern editor.

::github{repo="Vedaru/nvim"}
