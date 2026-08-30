# Vendored Meting API

This is a snapshot of <https://git.vedaru.cn/Vedaru/meting-api> (commit
`b867910`) used by the blog's CI to download music. The source repo has
been taken offline, so the code is vendored here to keep the CI working
without external dependencies.

## What's here

- `wrapper.js` — Hono server: API-key auth, IP rate-limit, NetEase
  song-bytes proxy with retry on expired signed URLs and rejection of
  tiny error pages.
- `app.js` — vendored upstream Meting app.
- `src/` — Meting providers (netease, tencent, spotify, ytmusic) plus
  crypto utilities, config, and the `/test` HTML page.
- `package.json` — only the runtime deps the wrapper needs.

Excluded vs. upstream: `Dockerfile*`, `docker-compose.yml`, `deno.js`,
`node.js`, `vercel.json`, `esbuild.config.js`, `api/` (alternative
listener adapter, unused by `wrapper.js`).

## How the CI uses it

`.github/workflows/CI.yml` runs:

```sh
cd vendor/meting-api
npm install
PORT=3300 nohup node wrapper.js > /tmp/meting.log 2>&1 &
```

The blog's `scripts/download-music.js` then talks to
`http://127.0.0.1:3300/api` (via the `METING_API_BASE` env var). The
wrapper fetches the real NetEase URLs server-side, so the runner never
talks to `music.163.com` directly.

## Updating

If a bug fix is needed here, edit the files in this directory and
commit. The vendor copy will diverge from upstream — that's
intentional, since the upstream is no longer maintained. Keep a record
in the commit message of what was changed and why.
