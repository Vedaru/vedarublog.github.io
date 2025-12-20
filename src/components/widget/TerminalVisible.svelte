<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { DATA } from './donut-frames';

  const CHARS = " `.-~:;!*+$@";
  const QUOTE = "強さには二種類ある。一つは守るものがあることによって得られる強さ、もう一つは失うものがないことによって得られる強さだ。";
  const FONT = '"JetBrainsMono Nerd Font", "JetBrains Mono", "Fira Code", "Cascadia Code", "Consolas", monospace';

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let frames: { d: number; data: Uint8Array }[] = [];
  let COLS = 0, ROWS = 0;
  let currentFrame = 0;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let ready = false;
  let ch = 0, cw = 0;

  const cssLut: string[] = new Array(4096);
  const charLut: string[] = new Array(4096);
  for (let v = 0; v < 4096; v++) {
    const r = ((v >> 8) & 15) * 17;
    const g = ((v >> 4) & 15) * 17;
    const b = (v & 15) * 17;
    const bright = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    charLut[v] = CHARS[Math.min(CHARS.length - 1, Math.floor(bright * CHARS.length))];
    cssLut[v] = `rgb(${r},${g},${b})`;
  }

  async function init() {
    const compressed = Uint8Array.from(atob(DATA), c => c.charCodeAt(0));
    const ds = new DecompressionStream('gzip');
    const writer = ds.writable.getWriter();
    writer.write(compressed);
    writer.close();
    const buf = new Uint8Array(await new Response(ds.readable).arrayBuffer());

    COLS = buf[0] | (buf[1] << 8);
    ROWS = buf[2] | (buf[3] << 8);
    const count = buf[4];
    const pairs = ((COLS * ROWS) + 1) >> 1;
    const frameBytes = pairs * 3;
    let off = 5;
    for (let i = 0; i < count; i++) {
      const delay = buf[off] | (buf[off + 1] << 8);
      off += 2;
      frames.push({ d: delay, data: buf.slice(off, off + frameBytes) });
      off += frameBytes;
    }

    ctx = canvas.getContext('2d')!;
    const fontSize = getFontSize();
    ctx.font = `${fontSize}px ${FONT}`;
    const m = ctx.measureText('@');
    cw = m.width;
    ch = fontSize * 1.1;
    // +2 rows for the quote line
    canvas.width = Math.ceil(cw * COLS);
    canvas.height = Math.ceil(ch * (ROWS + 2));

    ready = true;
    showFrame(0);
    scheduleNext();
  }

  function getFontSize(): number {
    if (typeof window === 'undefined') return 13;
    if (window.innerWidth >= 1024) return 15;
    return 13;
  }

  function showFrame(fi: number) {
    const f = frames[fi % frames.length];
    const d = f.data;
    const fontSize = getFontSize();
    ctx.font = `${fontSize}px ${FONT}`;

    // Pure black background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw ASCII art
    let pi = 0;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x += 2) {
        const b0 = d[pi], b1 = d[pi + 1], b2 = d[pi + 2];
        pi += 3;
        const v1 = ((b0 & 0xF0) << 4) | ((b0 & 0x0F) << 4) | (b1 >> 4);
        ctx.fillStyle = cssLut[v1];
        ctx.fillText(charLut[v1], x * cw, (y + 1) * ch * 0.92);
        if (x + 1 < COLS) {
          const v2 = ((b1 & 0x0F) << 8) | (b2 & 0xF0) | (b2 & 0x0F);
          ctx.fillStyle = cssLut[v2];
          ctx.fillText(charLut[v2], (x + 1) * cw, (y + 1) * ch * 0.92);
        }
      }
    }

    // Draw quote at bottom, like terminal output
    const qy = (ROWS + 1) * ch * 0.92;
    ctx.fillStyle = '#9ece6a';
    ctx.fillText('❯ ', 0, qy);
    ctx.fillStyle = '#c0caf5';
    ctx.fillText(QUOTE, cw * 2, qy);

    currentFrame = fi;
  }

  function scheduleNext() {
    const f = frames[currentFrame % frames.length];
    timerId = setTimeout(() => {
      showFrame((currentFrame + 1) % frames.length);
      scheduleNext();
    }, Math.max(100, f.d * 2.5));
  }

  onMount(() => { init(); });
  onDestroy(() => { if (timerId) clearTimeout(timerId); });
</script>

<div class="page" class:hidden={!ready}>
  <div class="terminal-window">
    <div class="terminal-header">
      <div class="window-controls start">
        <button class="control" aria-label="New tab">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
        </button>
      </div>
      <p class="terminal-title">🐺 Holo</p>
      <div class="window-controls end">
        <button class="control" aria-label="Grid">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
        </button>
        <button class="control" aria-label="Menu">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5h16"/><path d="M4 12h16"/><path d="M4 19h16"/></svg>
        </button>
        <button class="control control-close" aria-label="Close">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
    </div>
    <div class="terminal-body">
      <canvas bind:this={canvas} class="ascii-canvas" />
    </div>
  </div>
</div>

<style>
  .page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #000;
    padding: 10px;
  }
  .page.hidden { visibility: hidden; }
  .terminal-window {
    display: inline-block;
    border-radius: 10px;
    overflow: hidden;
    background: #000;
    box-shadow: 0 0 0 1px rgba(255,255,255,0.06), 0 25px 60px rgba(0,0,0,0.5);
    max-width: 100vw;
  }
  .terminal-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 12px; background: #0a0a0a;
    border-bottom: 1px solid rgba(255,255,255,0.06); user-select: none;
  }
  .window-controls { display: flex; gap: 4px; align-items: center; }
  .control {
    display: flex; align-items: center; justify-content: center;
    width: 24px; height: 24px; border: none; border-radius: 5px;
    background: transparent; color: rgba(255,255,255,0.35); cursor: pointer; padding: 0;
  }
  .control:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.6); }
  .control-close { border-radius: 50%; }
  .control-close:hover { background: #e81123; color: #fff; }
  .terminal-title { margin: 0; font-size: 11px; color: rgba(255,255,255,0.45); font-weight: 500; }
  .terminal-body { padding: 8px 10px; line-height: 0; }
  .ascii-canvas { display: block; max-width: 100%; height: auto; }
</style>
