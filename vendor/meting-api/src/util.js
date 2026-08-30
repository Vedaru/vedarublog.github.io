export function format(lyric, tlyric) {
  const lyricArray = trimLyric(lyric)
  const tlyricArray = trimLyric(tlyric)
  if (tlyricArray.length === 0) {
    return lyric
  }
  const result = []
  for (let i = 0, j = 0; i < lyricArray.length && j < tlyricArray.length; i += 1) {
    const time = lyricArray[i].time
    let text = lyricArray[i].text
    while (time > tlyricArray[j].time && j + 1 < tlyricArray.length) {
      j += 1
    }
    if (time === tlyricArray[j].time && tlyricArray[j].text.length) {
      text = `${text} (${tlyricArray[j].text})`
    }
    result.push({
      time,
      text
    })
  }
  return result
    .map(x => {
      const minus = Math.floor(x.time / 60000).toString().padStart(2, '0')
      const second = Math.floor((x.time % 60000) / 1000).toString().padStart(2, '0')
      const millisecond = Math.floor((x.time % 1000)).toString().padStart(3, '0')
      return `[${minus}:${second}.${millisecond}]${x.text}`
    })
    .join('\n')
}

const trimLyric = (lyric) => {
  const result = []
  const lines = lyric.split('\n')
  for (const line of lines) {
    // 匹配两种格式：[mm:ss.xx] 或 [mm:ss:xx]
    const match = line.match(/^\[(\d{2}):(\d{2})[.:](\d+)\](.*)$/)
    if (match) {
      const minutes = parseInt(match[1], 10)
      const seconds = parseInt(match[2], 10)
      const milliseconds = parseInt(match[3].padEnd(3, '0').slice(0, 3), 10)
      result.push({
        time: minutes * 60000 + seconds * 1000 + milliseconds,
        text: match[4]
      })
    }
  }
  return result.sort((a, b) => a.time - b.time)
}

export const getPathFromURL = (url, strict = true) => {
  const queryIndex = url.indexOf("?");
  const result = url.substring(url.indexOf("/", 8), queryIndex === -1 ? url.length : queryIndex);
  if (strict === false && result.endsWith("/")) {
    return result.slice(0, -1);
  }
  return result;
};

export const get_runtime = () => {

  if (globalThis?.process?.env?.RUNTIME) {
    return globalThis?.process?.env?.RUNTIME
  }

  if (globalThis?.Deno !== undefined) {
    return 'deno'
  }

  if (globalThis?.Bun !== undefined) {
    return 'bun'
  }

  if (typeof globalThis?.WebSocketPair === 'function') {
    return 'cloudflare'
  }

  if (globalThis?.fastly !== undefined) {
    return 'fastly'
  }

  if (typeof globalThis?.EdgeRuntime === 'string') {
    return 'vercel'
  }

  if (globalThis?.process?.release?.name === 'node') {
    return 'node'
  }

  if (globalThis?.__lagon__ !== undefined) {
    return 'lagon'
  }

  return 'other'
}

export const get_url = (ctx) => {
  const runtime = get_runtime()
  const perfix = ctx.req.header('X-Forwarded-Host') || ctx.req.header('X-Forwarded-Url')
  let req_url = perfix ? perfix + getPathFromURL(ctx.req.url.split('?')[0]) : ctx.req.url.split('?')[0]
  if (!req_url.startsWith('http')) req_url = 'http://' + req_url
  if (runtime === 'vercel') req_url = req_url.replace('http://', 'https://')
  return req_url
}
