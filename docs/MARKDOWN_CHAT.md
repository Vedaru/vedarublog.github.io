# `:::chat` transcripts

Telegram-style chat transcripts for Markdown posts. Rendered at build time:
no client JavaScript, no hydration, no scroll container.

## Syntax

```markdown
:::chat
((Alice joined the chat))

[[2026-10-03]]

[Alice|10:00]
Hello, **the agenda** is attached.

[Alice|10:01]
Second message from the same sender, grouped.

[Bob|10:02|right|Alice]
Reply on the right, quoting Alice.
:::
```

- `:::chat{names=both}` labels both sides; the default (`auto`/`start`) is
  Telegram's behavior. `names=none` hides every visible name.
- `[name|time]` opens a message. The optional third field is `left`/`right`,
  the fourth is the name of the message being replied to.
- `[[date]]` alone in a paragraph is a date separator.
- `((text))` alone in a paragraph is a centered system note.
- Message bodies keep full block and inline Markdown.

## Grouping

Consecutive messages from the same sender, on the same side, on the same day,
within 121 seconds (Telegram Web K's window) are merged into one visual group:

- the sender name is shown once, on the first message;
- the name is only shown on the incoming side unless `names=both` is set;
- in-group gap is 2px, after-group gap is 6px;
- the corner facing the avatar opens to 15px on the first message and the
  corner facing the tail is squared off on the last message.

Grouping is computed in `src/plugins/rehype-component-chat.mjs` and encoded as
`is-group-first` / `is-group-last` classes. CSS does the rest.

## Peer colours

Names use Telegram's seven-colour peer palette. The colour comes from a stable
hash of the NFC-normalized username, so a name keeps the same colour in every
block and every build, and equivalent Unicode spellings share a colour. A reply
quote uses the colour of the message it quotes, not the current sender's
colour, on both sides. Outgoing bubbles nudge the same hue's lightness so the
quote stays readable on the tinted bubble. The palette is expressed in
`oklch()` at 0.47 lightness in light mode and 0.78 in dark mode, which keeps
14px names and quotes readable.

Bubbles themselves stay two-tone, as in Telegram: incoming uses the surface,
outgoing uses the accent. Peer colours do not repaint the bubbles.

## Telegram metrics

The bubble styles mirror Telegram Web K rather than approximating it:

| Property | Value |
| --- | --- |
| message text | 16px / 21px |
| bubble padding | 4px 8px 5px |
| corners | 15px / 5px / 0 at the tail |
| in-group / after-group gap | 2px / 6px |
| bubble min-width | 56px |
| clock | 12px, floated at the end of the last line |
| sender name | 14px / 18px, bold, peer colour, first of group only |
| reply block | 42px min, 14px / 18px, 4px radius, 3px bar, 10% peer wash |
| service/date pill | 15px / 20px, 4.5px 10px, 14px radius |
| tail | 11 × 20px, clipped Telegram path |

Colors are theme-adaptive: the incoming bubble is a 6% state layer over the
card surface, and the outgoing bubble is a 30% primary tint. The layout does
not copy Telegram's fixed green.

## Files

- `src/plugins/rehype-component-chat.mjs` - parser and renderer
- `src/styles/markdown-chat.css` - bubble styles
- `src/components/misc/Markdown.astro` - imports the stylesheet, so every
  Markdown page (posts, about, friends) gets it
- `astro.config.mjs` - registers `chat: ChatComponent`
- `src/content/posts/chat-layout-demo.zh.md` - Chinese draft preview
- `src/content/posts/chat-layout-demo.en.md` - English draft preview
- `tests/chat-component.test.mjs` - renderer tests (`pnpm test:chat`)

After changing the renderer, Astro dev may serve cached Markdown. Delete
`.astro/data-store.json` and restart the dev server.

## Accessibility

- The name is visible only once per group; later messages carry a
  visually-hidden `Name:` prefix so screen readers keep the attribution.
- `<time datetime>` is emitted only for valid `HH:mm`, `YYYY-MM-DD` and
  `YYYY-MM-DD HH:mm` values.
- Reply quotes are links to the target message and flash it via `:target`.
- Date separators use `role="separator"`.
- The light-mode accent is `oklch(0.50 0.12 var(--hue))` rather than the
  theme's `--btn-content` so 14px names and reply titles clear 4.5:1.
