---
title: Vim Cheatsheet
published: 2026-03-06
pinned: false
description: A compact reference for Vim cursor movements, editing, and commands
tags: [备忘]
category: 编程
draft: false
---

# Vim Cheatsheet

See helpful vim commands right from your editor, narrow down your list by toggling off the once you’ve memorised/mastered. Make sure you’ve installed the Vim extension (link).

## Cursor Movement

- `h` – move cursor left
- `j` – move cursor down
- `k` – move cursor up
- `l` – move cursor right
- `H` – move to top of screen
- `M` – move to middle of screen
- `L` – move to bottom of screen
- `w` – jump forwards to the start of a word
- `W` – jump forwards to the start of a word (words can contain punctuation)
- `e` – jump forwards to the end of a word
- `E` – jump forwards to the end of a word (words can contain punctuation)
- `b` – jump backwards to the start of a word
- `B` – jump backwards to the start of a word (words can contain punctuation)
- `0` – jump to the start of the line
- `^` – jump to the first non-blank character of the line
- `$` – jump to the end of the line
- `g_` – jump to the last non-blank character of the line
- `gg` – go to the first line of the document
- `G` – go to the last line of the document
- `5G` – go to line 5 (replace 5 with any line number)
- `f<x>` – jump to next occurrence of character `<x>`
- `t<x>` – jump to before next occurrence of character `<x>`
- `}` – jump to next paragraph (or function/block in code)
- `{` – jump to previous paragraph (or function/block in code)
- `zz` – center cursor on screen
- `Ctrl+b` – move back one full screen
- `Ctrl+f` – move forward one full screen
- `Ctrl+d` – move forward half a screen
- `Ctrl+u` – move back half a screen

**Tip:** Prefix a cursor movement command with a number to repeat it. For example, `4j` moves down 4 lines.

**Tip:** Instead of `b` or `B` you can also use `(` or `{` respectively to jump between words.

## Insert Mode – inserting/appending text

- `i` – insert before the cursor
- `I` – insert at beginning of the line
- `a` – insert (append) after the cursor
- `A` – insert (append) at the end of the line
- `o` – append (open) a new line below the current line
- `O` – append (open) a new line above the current line
- `ea` – insert (append) at the end of the word
- `Ctrl+h` – delete the character before the cursor during insert mode
- `Ctrl+w` – delete the word before the cursor during insert mode
- `Ctrl+j` – begin new line during insert mode
- `Ctrl+t` – indent (move right) one shiftwidth during insert mode
- `Ctrl+d` – de-indent (move left) one shiftwidth during insert mode
- `Ctrl+n` – insert (auto-complete) next match before the cursor
- `Ctrl+p` – insert (auto-complete) previous match before the cursor
- `Ctrl+rx` – insert the contents of register `x`
- `Ctrl+ox` – temporarily enter normal mode to issue one normal-mode command `x`
- `Esc` – exit insert mode

## Editing

- `r` – replace a single character
- `R` – replace more than one character until `Esc` is pressed
- `J` – join the line below to the current one with a space
- `gJ` – join the line below without a space
- `gwip` – reflow (format) paragraph
- `g~` + motion – switch case up to motion
- `gu` + motion – change to lowercase up to motion
- `gU` + motion – change to uppercase up to motion
- `cc` – change (replace) entire line
- `c$` or `C` – change (replace) to the end of the line
- `ciw` – change (replace) entire word
- `cw` or `ce` – change (replace) to the end of the word
- `s` – delete character and start insert (substitute)
- `S` – delete line and start insert (same as `cc`)
- `xp` – transpose two letters (delete then paste)
- `u` – undo
- `U` – restore (undo) last change on line
- `Ctrl+r` – redo
- `.` – repeat last command

## Visual Mode (marking text)

- `v` – start visual mode (character-wise)
- `V` – start linewise visual mode
- `o` – move to other end of marked area
- `Ctrl+v` – start visual block mode
- `O` – move to other corner of block
- `aw` – mark a word
- `ab` – mark a block with `()`
- `aB` – mark a block with `{}`
- `at` – mark a block with `<>` tags
- `ib` – inner block with `()`
- `iB` – inner block with `{}`
- `it` – inner block with `<>` tags
- `Esc` – exit visual mode

### Visual Commands

- `>` – shift text right
- `<` – shift text left
- `y` – yank (copy) marked text
- `d` – delete marked text
- `~` – switch case
- `u` – change marked text to lowercase
- `U` – change marked text to uppercase

## Registers

- `:reg[isters]` – show registers content
- `"xy` – yank into register `x`
- `"xp` – paste contents of register `x`
- `"+y` – yank into system clipboard register
- `"+p` – paste from system clipboard register

**Tip:** Registers are stored in `~/.viminfo` and reloaded next time vim starts.

### Special Registers

- `0` – last yank
- `"` – unnamed register (last delete or yank)
- `%` – current file name
- `#` – alternate file name
- `*` – clipboard contents (X11 primary)
- `+` – clipboard contents (X11 clipboard)
- `/` – last search pattern
- `:` – last command-line
- `.` – last inserted text
- `-` – last small (less than a line) delete
- `=` – expression register
- `_` – black hole register

## Marks and Positions

- `:marks` – list of marks
- `ma` – set mark `a` at current position
- `` `a`` – jump to position of mark `a`
- `y\'a` – yank text to position of mark `a`
- `` `0`` – go to position where Vim was previously exited
- `` `"`` – go to position when last editing this file
- `` `.` `` – go to position of last edit in this file
- `` `` `` – go to position before the last jump
- `:ju[mps]` – list of jumps
- `Ctrl+i` – go to newer position in jump list
- `Ctrl+o` – go to older position in jump list
- `:changes` – list of changes
- `g` – go to newer position in change list
- `g;` – go to older position in change list
- `Ctrl+]` – jump to tag under cursor

**Tip:** To jump to a mark use a backtick (`'`) or an apostrophe (`'`). Apostrophe jumps to the first non-blank of the line holding the mark.

## Macros

- `qa` – record macro into register `a`
- `q` – stop recording
- `@a` – run macro `a`
- `@@` – rerun last executed macro

## Cut and Paste

- `yy` – yank (copy) a line
- `2y` – yank two lines
- `yw` – yank to start of next word
- `yiw` – yank inner word
- `yaw` – yank word and surrounding space
- `y$` or `Y` – yank to end of line
- `p` – put (paste) after cursor
- `P` – put before cursor
- `gp` – put after cursor and leave cursor after text
- `gP` – put before cursor and leave cursor after text
- `dd` – delete (cut) a line
- `2dd` – delete two lines
- `diw` – delete inner word
- `daw` – delete word and surrounding space
- `d$` or `D` – delete to end of line
- `x` – delete character

## Indent Text

- `>>` – indent line one shiftwidth right
- `<<` – de-indent line one shiftwidth left
- `>%` – indent a block with `()` or `{}` (cursor on brace)
- `>ib` – indent inner block with `()`
- `>at` – indent a block with `<>` tags
- `3==` – re-indent three lines
- `=%` – re-indent a block with `()` or `{}`
- `=iB` – re-indent inner block with `{}`
- `gg=G` – re-indent entire buffer
- `]p` – paste and adjust indent to current line

## Exiting

- `:w` – write (save) the file without exiting
- `:w !sudo tee %` – save file with sudo
- `:wq`, `:x` or `ZZ` – write and quit
- `:q` – quit (fails if unsaved changes)
- `:q!` or `ZQ` – quit without saving
- `:wqa` – write and quit all tabs

## Search and Replace

- `/pattern` – search forward
- `?pattern` – search backward
- `\vpattern` – very magic pattern (regex shorthand)
- `n` – repeat search in same direction
- `N` – repeat search in opposite direction
- `:%s/old/new/g` – replace all occurrences in file
- `:%s/old/new/gc` – replace with confirmation
- `:nohlsearch` – clear search highlighting

## Folding and Diff

- `za` – toggle fold under cursor
- `zo` – open fold under cursor
- `zc` – close fold under cursor
- `zr` – reduce (open) all folds one level
- `zm` – fold more (close) all folds one level
- `zi` – toggle folding functionality
- `]c` – go to start of next change
- `[c` – go to start of previous change

**Tip:** Folding commands operate on one level; use uppercase (e.g. `zA`) to affect all levels.