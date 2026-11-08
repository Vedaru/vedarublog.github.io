---
title: Chat Transcript Demo
published: 2026-11-08
description: Telegram-style :::chat rendering and syntax
tags: [Demo, Markdown]
category: Testing
draft: true
---

# Chat Transcript Demo

A draft preview of the `:::chat` container. Everything below is rendered at build time, with no client JavaScript.

:::chat
((Mira joined the chat))

[[2026-02-23]]

[Tess|14:02]
That was blocked by Palo Alto's **URL Filtering**. The domain is probably filed under Adult by every major vendor.

[Owen|14:02]
Maybe he just dislikes you.

[Priya|14:03]
Could it be the TLD?

[Mira|14:05|right|Tess]
Okay, I stand corrected...

[Mira|14:05|right]
That TLD is common on adult sites, and school networks usually block that category outright. So yes, the site was blocked by the school's RADIUS on day one...

[Owen|14:06]
Who told you to pick that name 🤣

[Priya|14:07]
Does the URL contain "WTF"?

[Mira|14:09|right|Priya]
No, it is the TLD itself.

[Tess|14:10]
Just use a normal domain name.

((Tess left the chat))
:::

## Grouping and inline Markdown

Messages from the same sender, on the same side, within two minutes are merged into one group. The name appears once, the gap shrinks, and the bubbles share a continuous corner. The clock sits inside the bubble on the last line.

:::chat
[[Yesterday]]

[Alice|09:12]
Good morning. Are we still meeting **today**? Here is the agenda:

- Project status
- Next week's schedule
- Risks

[Bob|09:13]
Yes. The [agenda](https://example.com) is already sent.

> Room changed to the third floor

[Alice|09:14|right|Bob]
Got it, I will be there in ten minutes.

[Alice|09:15|right]
I will bring the document we discussed, too.
:::

## Both-side names

By default the name appears only on the incoming side, once per group. Add `{names=both}` to label your own side too.

:::chat{names=both}
[[Today]]

[Mira|10:00|right]
My name is visible on the right now.

[Mira|10:01|right]
Only once per group, though.

[Alice|10:02]
The incoming side is unchanged.
:::

## Peer colors

Names and reply quotes use a seven-color peer palette. The same name keeps the same color everywhere, and a quote uses the color of the message it quotes on both sides. Outgoing bubbles adjust the same hue's lightness for contrast. Bubble backgrounds stay two-tone.

## Syntax

```markdown
:::chat
((System note))

[[2026-10-03]]

[Alice|10:00]
Message text, with **Markdown**.

[Bob|10:01|right|Alice]
An outgoing message that replies to Alice.
:::
```

- Header: `[name|time]`, `[name|time|right]`, `[name|time|right|replyTo]`
- `[[date]]` alone in a paragraph: date divider
- `((text))` alone in a paragraph: centered system note
- Time formats: `HH:mm`, `YYYY-MM-DD`, `YYYY-MM-DD HH:mm`
- Container options: `{names=both}`, `{names=none}`
