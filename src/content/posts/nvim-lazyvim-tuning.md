---
title: 把 Neovim 调教成现代编辑器
published: 2026-06-17
description: 记录在 LazyVim 基础上把 Neovim 打磨成高效现代编辑器的全过程——核心选项与键位增强、语言支持、纯黑主题、blink.cmp 补全键位改造，以及用 Everything 实现全盘文件名秒搜并通过计划任务绕过 UAC 的踩坑与解法。
tags: [Neovim, LazyVim, 配置, Windows, Everything]
category: 编程
draft: false
---

# 把 Neovim 调教成现代编辑器

这篇博客记录我在 **LazyVim** 基础上，把 Neovim（NVIM 0.13，Windows）一步步打磨成一个顺手的现代代码编辑器的全过程。内容包括核心选项与键位增强、通用语言支持、纯黑主题、补全键位改造，以及最折腾也最有意思的一段——**用 Everything 做全盘文件名秒搜，并通过计划任务彻底绕过 UAC 弹窗**。

整个过程踩了不少坑（导入顺序、`fillchars` 报错、神秘竖黑条、UAC 反复弹窗……），所以与其说是「配置教程」，不如说是一份带弯路的实录。

## 起点：一份 LazyVim 配置

初始配置是标准的 LazyVim 脚手架，已有：tokyonight 主题、snacks（picker / explorer / dashboard）、oil 文件管理、基础 LSP，以及一组全模式统一的窗口导航键 `Ctrl-h/j/k/l`。目标是「保留合理的部分，补齐现代编辑器该有的体验」。

## 一、核心选项增强

在 `lua/config/options.lua` 里只追加对 LazyVim 默认值的增强，避免大改：

```lua
local opt = vim.opt

-- 编辑体验
opt.scrolloff = 8          -- 光标上下保留 8 行
opt.cursorline = true      -- 高亮当前行
opt.signcolumn = "yes"     -- 始终显示符号列，避免抖动
opt.virtualedit = "block"  -- 块选择可超出行尾

-- 缩进 / 搜索
opt.expandtab = true
opt.shiftwidth = 2
opt.smartcase = true       -- 含大写时区分大小写
opt.inccommand = "split"   -- :s 实时预览替换

-- 文件 / 性能
opt.undofile = true        -- 持久化撤销
opt.updatetime = 200
opt.confirm = true         -- 退出未保存时提示而非报错
```

> 一个小教训：原本我还设了 Windows 下把内置终端 `shell` 改成 PowerShell，但这需要同时正确设置 `shellcmdflag` / `shellredir` / `shellpipe` 一整套，否则会悄悄破坏 `:!`、Mason 和部分插件的进程调用。权衡之下直接放弃，保持默认 shell 最稳。

## 二、键位与自动命令

`keymaps.lua` 里补了一批不与 LazyVim 默认冲突的高效键位：

```lua
local map = vim.keymap.set

-- 保存
map({ "n", "i", "x", "s" }, "<C-s>", "<cmd>w<cr><esc>", { desc = "保存文件" })

-- 可视模式缩进后保持选区
map("x", "<", "<gv")
map("x", ">", ">gv")

-- 折行友好的上下移动 + 居中滚动
map({ "n", "x" }, "j", "v:count == 0 ? 'gj' : 'j'", { expr = true })
map({ "n", "x" }, "k", "v:count == 0 ? 'gk' : 'k'", { expr = true })
map("n", "<C-d>", "<C-d>zz")
map("n", "n", "nzzzv")
```

`autocmds.lua` 则加了两个轻量、非破坏性的自动命令：进入插入模式时关闭当前行高亮以减少干扰，以及对超过 1MB 的大文件降级（关闭折叠/拼写检查）保持流畅。

> 我一度想加「失焦自动保存」，但它会与保存时格式化、LSP、文件监听产生意外交互，比较激进，最终砍掉。

## 三、通用语言支持（以及导入顺序的坑）

LazyVim 自带了大量官方语言扩展，直接 `import` 即可获得对应的 LSP、格式化和 Treesitter。我选了通用基础包：JSON / YAML / TOML / Markdown / Docker / Git（Lua 已由 LazyVim 默认内置）。

第一次我把这些 `import` 放进了自己的 `plugins/` 目录下的一个文件，结果 LazyVim 直接报错：

> The order of your `lazy.nvim` imports is incorrect: `lazyvim.plugins` should be first, followed by any `lazyvim.plugins.extras`, and finally your own `plugins`.

原来扩展必须排在「LazyVim 之后、你自己的 plugins 之前」。正确做法是放进 `lua/config/lazy.lua` 的 spec 中间：

```lua
spec = {
  { "LazyVim/LazyVim", import = "lazyvim.plugins" },
  -- 语言扩展：必须在自定义 plugins 之前
  { import = "lazyvim.plugins.extras.lang.json" },
  { import = "lazyvim.plugins.extras.lang.yaml" },
  { import = "lazyvim.plugins.extras.lang.toml" },
  { import = "lazyvim.plugins.extras.lang.markdown" },
  { import = "lazyvim.plugins.extras.lang.docker" },
  { import = "lazyvim.plugins.extras.lang.git" },
  -- 你自己的插件
  { import = "plugins" },
},
```

## 四、外观：纯黑主题与做旧 banner

### `fillchars` 的一个小报错

我想用 `opt.fillchars = { eob = " ", foldopen = "...", ... }` 隐藏行尾 `~` 并自定义折叠图标，结果启动报：

```text
E1511: Wrong number of characters for field "foldclose"
```

原因是某些 Nerd Font 图标写入后字符数不对。LazyVim 默认已经设好了漂亮的折叠图标，所以最稳的写法是只**追加**自己要的那个，别整体覆盖：

```lua
opt.fillchars:append({ eob = " " }) -- 隐藏行尾的 ~
```

### 神秘的竖黑条

启动后画面里时不时出现一条贯穿上下的竖黑条，排查发现是我加的 `colorcolumn = "100"`——在 tokyonight 下 `ColorColumn` 是深色背景，于是变成一条「竖黑条」，窗口够宽时才出现，所以看着像「偶尔」才有。直接删掉了事。

### 纯黑背景

把 tokyonight 的各类背景统一改成纯黑 `#000000`：

```lua
opts = {
  style = "night",
  on_colors = function(c)
    c.bg = "#000000"; c.bg_dark = "#000000"; c.bg_float = "#000000"
    c.bg_sidebar = "#000000"; c.bg_statusline = "#000000"; c.bg_popup = "#000000"
    c.bg_highlight = "#0e0e0e" -- 当前行稍微提亮，避免纯黑下看不见
  end,
  on_highlights = function(hl, c)
    hl.Normal = { bg = "#000000" }
    hl.NormalFloat = { bg = "#000000" }
    -- dashboard 的 VEDARU banner：深色泛黄旧纸张色
    hl.SnacksDashboardHeader = { fg = "#c2a86b", bold = true }
  end,
}
```

顺手把 dashboard 的 banner 改成一种深色泛黄的旧纸张色 `#c2a86b`。这里有个细节：snacks 设置自己的高亮时用的是 `default = true`，**不会覆盖已存在的定义**，所以把 `SnacksDashboardHeader` 写进 tokyonight 的 `on_highlights` 就能稳稳生效。

## 五、补全键位：Tab 确认、Enter 就是 Enter

LazyVim 现在默认用 **blink.cmp**，其默认是「Enter 接受补全」。我更习惯 **Tab 确认、Enter 只换行**，命令行里则希望「上下方向键选择、Tab 确认」。

读了 blink 的预设源码后发现 `super-tab` 预设正好满足主补全需求（Tab 接受、上下键选择、不绑定 `<CR>`）。新建 `lua/plugins/blink.lua`：

```lua
return {
  "saghen/blink.cmp",
  opts = {
    keymap = {
      preset = "super-tab", -- Tab 接受、上下选择、Enter 回归换行
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

一个关键认知：blink 对 `live = true` 的源会把输入文字放进 `filter.search`、而 `pattern` 为空（**不会二次过滤**），这一点在下一节自定义全盘搜索时正好用得上。

## 六、`<leader>fg` 为什么能快速全局搜索

顺带理解了一下 `<leader>fg`（snacks 的 live grep）为什么快：它不是用 Lua 自己遍历文件，而是后台 spawn **ripgrep**（多线程、自动遵守 `.gitignore`、异步流式返回），你每改一次关键词就用新词**带防抖地重启查询**，再由 snacks 的快速 matcher 做排序高亮。本质是「ripgrep + 自动忽略无关文件 + 异步流式 + 实时查询」。

注意 `<leader>fg` 搜的是**文件内容**，搜**文件名**是 `<leader>ff`。

## 七、`<leader>fF`：全盘文件名秒搜（Everything）

接着想要一个能搜**整台电脑**文件名的入口。直接用 `fd`/`rg` 扫整个 `C:\` 既慢又吃内存，Windows 上的正解是 **Everything（voidtools）** 的命令行 `es.exe`——它有全盘文件名索引，毫秒级返回。

利用上一节「live 源不二次过滤」的特性，写一个自定义 finder，把输入实时丢给 `es`：

```lua
{
  "<leader>fF",
  function()
    local instance = "1.5a" -- Everything 1.5 alpha 使用命名实例
    local es = vim.fn.exepath("es")
    -- ... 省略：未找到 es 的提示、自动启动逻辑见下文 ...
    Snacks.picker.pick({
      source = "everything",
      live = true,        -- 输入即重新查询 es
      supports_live = true,
      finder = function(_, ctx)
        local search = vim.trim(ctx.filter.search or "")
        if search == "" then return function() end end
        local args = { "-instance", instance, "-n", "500" } -- 限 500 条保证流畅
        for _, term in ipairs(vim.split(search, " ", { plain = true, trimempty = true })) do
          args[#args + 1] = term
        end
        return require("snacks.picker.source.proc").proc({
          cmd = es, args = args, notify = false,
          transform = function(item) item.file = item.text end, -- es 输出完整路径
        }, ctx)
      end,
      formatters = { file = { filename_first = true } },
    })
  end,
  desc = "Find files on whole PC (Everything)",
}
```

这里踩了两个坑：

1. **Error 8: Everything IPC window not found** —— `es` 只是客户端，必须有 `Everything.exe` 在后台运行。
2. 我装的是 **Everything 1.5 alpha**，它用**命名实例 `1.5a`**，而 `es` 默认连无名实例，所以必须加 `-instance 1.5a` 才连得上。

## 八、自动启动与退出关闭

为了不用手动开 Everything，给 `<leader>fF` 加了逻辑：**没运行就启动、且仅当是本次启动的才在 picker 关闭时退出**（用 es 能否连上来判断是否在运行，snacks picker 支持 `on_close` 回调）。

但实测发现：用 `Everything.exe -startup` 拉起的实例是**管理员权限**的（进程 Path 读不到、`taskkill` 拒绝访问、`-exit` 也关不掉）。Everything 1.5a 默认会以服务级权限常驻做 NTFS 索引——这部分非管理员的 nvim 根本动不了。

## 九、最后的硬骨头：绕过 UAC

调整后 Everything 能以普通权限运行、可被 `-exit` 关闭了，但又冒出新问题：**每次 `<leader>fF` 都弹一次 UAC**（因为 Everything 启动需要管理员去读 NTFS 主文件表）。

这里有个本质矛盾：

- 要**无 UAC** → 必须提权常驻；
- 要**能被 nvim 关闭** → 必须普通权限运行，但启动又要管理员 → 弹 UAC。

破局点是 **Windows 计划任务**：创建一个勾选「最高权限」的任务，普通权限进程用 `schtasks /run` **触发**它时，Windows **不会弹 UAC**。再建一个「退出」任务，这样**免 UAC 和退出关闭两者兼得**。

一次性（管理员）创建两个任务：

```powershell
$exe = "D:\Everything\Everything.exe"
$p = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest
$s = New-ScheduledTaskSettingsSet
Register-ScheduledTask -TaskName "EverythingStart" -Action (New-ScheduledTaskAction -Execute $exe -Argument "-startup") -Principal $p -Settings $s -Force
Register-ScheduledTask -TaskName "EverythingExit"  -Action (New-ScheduledTaskAction -Execute $exe -Argument "-instance 1.5a -exit") -Principal $p -Settings $s -Force
```

> 小提示：创建这种「最高权限」任务本身需要管理员。最省事的是在普通 PowerShell 里用 `Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile','-NoExit','-EncodedCommand',<base64>` 自提权执行一次——`-EncodedCommand` 能彻底避免引号/换行问题，`-NoExit` 让窗口停留以便看到结果。

然后 nvim 侧改成通过计划任务来启停：

```lua
-- 未运行则用计划任务无 UAC 启动
if not es_ready() then
  vim.fn.jobstart({ "schtasks", "/run", "/tn", "EverythingStart" }, { detach = true })
  started_by_us = true
  vim.wait(6000, es_ready, 200)
end

-- 仅当是本次启动的，picker 关闭时退出（同样无 UAC）
on_close = started_by_us and function()
  vim.fn.jobstart({ "schtasks", "/run", "/tn", "EverythingExit" }, { detach = true })
end or nil,
```

最终效果：`<leader>fF` 全盘秒搜文件名，**不再弹任何 UAC**；本来就开着 Everything 时不动它，是 nvim 自己拉起的就在关闭时收尾。

## 十、Session 管理：把 `%` 路径改回 `/`

LazyVim 用 `persistence.nvim` 自动保存/恢复 session。这东西在 Linux 上没什么存在感，但在 **Windows 上文件名不能用 `\`、`/`、`:`**，所以它会把路径编码成 `%`：

```
sessions/D%Personal_Files%Projects%Github%krita-master.vim
```

我用 Oil 浏览 session 目录时，文件名全是这种鬼东西，根本没法看。

### 排查

翻 `persistence.nvim` 源码，罪魁祸首在 `lua/persistence/init.lua` 第 13 行：

```lua
local name = vim.fn.getcwd():gsub("[\\/:]+", "%%")
```

`\`、`/`、`:` 全部被替换成 `%`。这在 Windows 上无可避免——这些字符就是不能出现在文件名里。

最初试了嵌套目录方案（`sessions/D/Personal_Files/Projects/Github/krita-master.vim`），结果 Oil 里变成一棵要层层展开的目录树，找个 session 得点四五层。**我需要的是平铺列表**，每个文件名直接展示完整路径。

### 解法：换一个编码字符

思路很简单：既然 `%` 看着像乱码、`/` 又不合法，那就换一个合法的、视觉上不那么扎眼的字符。选了 `+`，在 Windows 文件名里完全合法，看着也干净：

```lua
-- lua/plugins/persistence.lua
return {
  "folke/persistence.nvim",
  config = function(_, opts)
    require("persistence").setup(opts)
    local P = require("persistence")
    local Config = require("persistence.config")

    -- 覆盖 current()：用 + 替掉原来的 %
    P.current = function(opts_arg)
      opts_arg = opts_arg or {}
      local name = vim.fn.getcwd():gsub("[\\/:]+", "+")
      if Config.options.branch and opts_arg.branch ~= false then
        local branch = P.branch()
        if branch and branch ~= "main" and branch ~= "master" then
          name = name .. "+" .. branch:gsub("[\\/:]+", "+")
        end
      end
      return Config.options.dir .. name .. ".vim"
    end

    -- 覆盖 select()：解码 + → / 用于显示
    P.select = function()
      -- ... 遍历 session 文件，把 + 转回 / ...
      -- 用 vim.ui.select 展示解码后的路径
    end
  end,
}
```

效果对比：

| 之前 (`%`) | 之后 (`+`) |
|---|---|
| `D%Personal_Files%Projects%Github%krita-master.vim` | `D+Personal_Files+Projects+Github+krita-master.vim` |

### Oil 侧的配合

光是文件名改了还不够——加载 session 时的通知、`gy` 复制路径，都应该展示真正的 `/` 而非 `+`。在 `oil.lua` 的 `<CR>` 和 `gy` 里加一层解码：

```lua
-- 加载 session 时的通知
local display_name = entry.name:gsub("%.vim$", ""):gsub("%+", "/")
display_name = display_name:gsub("^([A-Za-z])/", "%1:/")
vim.notify("Loaded session: " .. display_name)

-- gy 复制路径
local display_path = abs_path:gsub("\\", "/"):gsub("%+", "/")
display_path = display_path:gsub("^([A-Za-z])/", "%1:/")
vim.fn.setreg("+", display_path)
```

这样通知显示的是 `D:/Personal_Files/Projects/Github/krita-master`，而不是一坨 `%`。

### 顺手修了俩 Bug

追 session 编码的过程中还修了两个 Oil 的小问题：

1. **`-` 回上级目录偶尔失灵**——默认 keymap 写的是 `{ "actions.parent", mode = "n" }`，格式不严谨会掉 mode，补上就好了。
2. **`E5108: attempt to call field 'select'`**——`oil.actions.select` 是个 action 定义 table，不是函数。需要用 `oil.select()` 而不是 `oil.actions.select()`。

### 收获

- Windows 文件名限制是绕不过去的物理定律，能做的只是挑一个视觉上不那么恶心的编码字符。
- 改 persistence 的编码要同时改 select 的解码，否则 LazyVim 的 `<leader>qS` 选 session 界面也是乱码。
- 嵌套目录方案在理论上更「干净」，但在 Oil 这种文件管理器里反而变成坏体验——**平铺列表 + 编码字符**才是正确权衡。

### 补全操作：添加、手动保存、任意 Oil 确认

编码问题解决后，顺手把 session 的日常操作补全了：

**`<leader>qa` — 选目录添加 session**。打开 Oil 让你浏览文件系统，找到项目目录后按 `ga` 即保存 session。代码很简单——Oil buffer 里加一个 keymap，取光标所在目录 `chdir` 后调 `persistence.save()`：

```lua
-- oil.lua keymaps
["ga"] = {
  mode = "n",
  callback = function()
    local entry = require("oil").get_cursor_entry()
    local dir = require("oil").get_current_dir()
    -- 如果光标在目录上，保存那个目录而不是当前目录
    if entry and entry.type == "directory" then
      dir = dir .. entry.name
    end
    dir = dir:gsub("\\", "/"):gsub("/+$", "")
    require("oil").close()
    vim.fn.chdir(dir)
    require("persistence").save()
    vim.notify("Session saved: " .. dir)
  end,
},
```

这里踩了两个坑：

1. **`<leader>a` 被其他插件占用了**，换了 `ga`。虽然 `ga` 在 vim 里是「显示字符编码」的内置命令，但在 Oil buffer 里 buffer-local 映射会覆盖它，完全没有影响。

2. **保存的是当前目录而不是光标所在的目录**。最初只取 `get_current_dir()`，用户把光标移到 `.android` 目录上按 `ga`，结果保存的是 `C:/Users/lenovo`。加了一行判断——光标在 directory 类型条目上时，拼上 `entry.name` 作为目标路径。这样浏览到隐藏目录（如 `.android`）也能直接保存了。

而且 `ga` 不只在 `qa` 里用——**任何 Oil 窗口都能用**。开着 `<leader>qS` 浏览 session 时想存当前目录？`ga` 直接搞定。

**`<leader>qw` — 手动保存当前 session**。persistence.nvim 默认只在退出时自动存，中间想存一下得手动：

```lua
{ "<leader>qw", function()
    require("persistence").save()
    vim.notify("Session saved")
  end, desc = "Save Current Session" },
```

**`<leader>qd` — 不保存直接退出**。原来只调 `persistence.stop()` 阻止自动保存，但还是得手动 `:qa`。改成一步到位：

```lua
{ "<leader>qd", function()
    require("persistence").stop()
    vim.cmd("qa")
  end, desc = "Quit Without Saving Session" },
```

### 键位冲突：LazyVim 的默认 key 偷偷覆盖

调试时发现一个诡异现象：`<leader>qS` 在 dashboard 能打开 Oil，进了文件缓冲区就失效。

翻了一圈发现是 LazyVim 默认的 persistence 配置里绑了 `keys = { { "<leader>qS", persistence.select } }`。lazy.nvim 的 `keys` 机制会在这个插件加载时（`BufReadPre`，即打开第一个文件）注册键位，**后注册的覆盖先注册的**。所以 dashboard 里我写在 `keymaps.lua` 的绑定生效，一开文件就被 LazyVim 默认值覆盖。

解决方式：把自己的所有 session 键位写进 `plugins/persistence.lua` 的 `keys` 字段里，**替换掉 LazyVim 原始的 keys**，而不是放在 `config/keymaps.lua`。这样加载顺序就对了：

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
  -- ...
}
```

规律是：凡是要覆盖 LazyVim 插件自带的 keymap，别写 `keymaps.lua`，写进对应插件的 `keys` 里。

## 收获小结

- **在 LazyVim 上增强**远比从零搭好维护：只覆盖默认值、用官方扩展补语言，注意 `import` 顺序。
- 视觉问题往往来自某个不起眼的选项（`colorcolumn` 的竖黑条、`fillchars` 的字符数）。
- 读插件源码（blink 的 keymap 预设、snacks 的 live 机制）能让定制事半功倍。
- Windows 上「以管理员运行但不弹 UAC」的通用解法就是**最高权限计划任务 + `schtasks /run` 触发**——这个套路远不止用于 Everything。

至此，这套 Neovim 配置基本满足我对「高效现代编辑器」的全部期待了。
