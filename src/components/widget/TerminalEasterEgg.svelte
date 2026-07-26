<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  const CHARS = " `.-~:;!*+$@";
  const QUOTE = "強さには二種類ある。一つは守るものがあることによって得られる強さ、もう一つは失うものがないことによって得られる強さだ。";
  const TRIGGER = 'holo';
  const FONT_SIZE = 14;

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let frames: Uint8Array[] = [];
  let COLS = 0, ROWS = 0;
  let currentFrame = 0;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let visible = false;
  let cw = 0, ch = 0;
  let triggerBuf = '';
  let triggerTimer: ReturnType<typeof setTimeout> | null = null;
  let loading = false;
  let loaded = false;

  let winEl: HTMLDivElement;
  let dragging = false;
  let dragX = 0, dragY = 0;
  let posX = 20, posY = 20;

  // Precompute
  const cssLut: string[] = new Array(4096);
  const charLut: string[] = new Array(4096);
  for (let v = 0; v < 4096; v++) {
    const r = ((v >> 8) & 15) * 17, g = ((v >> 4) & 15) * 17, b = (v & 15) * 17;
    charLut[v] = CHARS[Math.min(CHARS.length - 1, Math.floor((0.299*r+0.587*g+0.114*b)/255*CHARS.length))];
    cssLut[v] = `rgb(${r},${g},${b})`;
  }

  function init() {
    if (loading || loaded) return;
    loading = true;
    import('./donut-frames').then(m => {
      const raw = Uint8Array.from(atob(m.DATA), c => c.charCodeAt(0));
      const ds = new DecompressionStream('gzip');
      const w = ds.writable.getWriter();
      w.write(raw); w.close();
      return new Response(ds.readable).arrayBuffer();
    }).then(bufRaw => {
      const buf = new Uint8Array(bufRaw);
      COLS = buf[0] | (buf[1] << 8);
      ROWS = buf[2] | (buf[3] << 8);
      const count = buf[4];
      const fb = ((COLS * ROWS + 1) >> 1) * 3;
      let off = 5;
      for (let i = 0; i < count; i++) {
        off += 2; // skip delay
        frames.push(buf.slice(off, off + fb));
        off += fb;
      }
      loaded = true;
      loading = false;
    });
  }

  function open() {
    if (!loaded) { init(); return; }
    if (visible) return;
    visible = true;

    requestAnimationFrame(() => {
      if (!visible || !canvas) return;
      ctx = canvas.getContext('2d')!;
      ctx.font = `${FONT_SIZE}px monospace`;
      cw = ctx.measureText('@').width;
      ch = FONT_SIZE * 1.0;
      canvas.width = Math.ceil(cw * COLS);
      canvas.height = Math.ceil(ch * (ROWS + 2));
      // Re-set font after canvas resize (resizing resets the context)
      ctx.font = `${FONT_SIZE}px monospace`;
      posX = Math.max(0, (innerWidth - canvas.width) / 2);
      posY = Math.max(0, (innerHeight - canvas.height) / 2);
      showFrame(0);
      scheduleNext();
    });
  }

  function close() {
    visible = false;
    if (timerId) { clearTimeout(timerId); timerId = null; }
    if (canvas) { canvas.width = 0; canvas.height = 0; }
    ctx = null;
  }

  function showFrame(fi: number) {
    if (!visible || !ctx) return;
    const d = frames[fi % frames.length];
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    let pi = 0;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x += 2) {
        const v1 = ((d[pi] & 0xF0) << 4) | ((d[pi] & 0x0F) << 4) | (d[pi+1] >> 4);
        ctx.fillStyle = cssLut[v1];
        ctx.fillText(charLut[v1], x * cw, (y + 1) * ch);
        if (x+1 < COLS) {
          const v2 = ((d[pi+1] & 0x0F) << 8) | (d[pi+2] & 0xF0) | (d[pi+2] & 0x0F);
          ctx.fillStyle = cssLut[v2];
          ctx.fillText(charLut[v2], (x + 1) * cw, (y + 1) * ch);
        }
        pi += 3;
      }
    }
    const qy = (ROWS + 1) * ch;
    ctx.fillStyle = '#9ece6a'; ctx.fillText('❯ ', 0, qy);
    ctx.fillStyle = '#c0caf5'; ctx.fillText(QUOTE, cw * 2, qy);
    currentFrame = fi;
  }

  function scheduleNext() {
    if (!visible) { timerId = null; return; }
    timerId = setTimeout(() => {
      if (!visible) { timerId = null; return; }
      showFrame((currentFrame + 1) % frames.length);
      scheduleNext();
    }, 120);
  }

  function onKeydown(e: KeyboardEvent) {
    if (visible) { if (e.key === 'Escape') close(); return; }
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    triggerBuf += e.key.toLowerCase();
    if (!TRIGGER.startsWith(triggerBuf)) { triggerBuf = ''; return; }
    if (triggerTimer) clearTimeout(triggerTimer);
    triggerTimer = setTimeout(() => { triggerBuf = ''; }, 2000);
    if (triggerBuf === TRIGGER) { triggerBuf = ''; open(); }
  }

  function startDrag(e: MouseEvent) {
    dragging = true; dragX = e.clientX - posX; dragY = e.clientY - posY;
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
    e.preventDefault();
  }
  function onDrag(e: MouseEvent) {
    if (!dragging) return;
    posX = e.clientX - dragX; posY = e.clientY - dragY;
    winEl.style.left = posX + 'px'; winEl.style.top = posY + 'px';
  }
  function stopDrag() {
    dragging = false;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
  }

  onMount(() => { document.addEventListener('keydown', onKeydown); });
  onDestroy(() => {
    document.removeEventListener('keydown', onKeydown);
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
    if (timerId) clearTimeout(timerId);
    if (triggerTimer) clearTimeout(triggerTimer);
  });
</script>

{#if visible}
<div class="win" bind:this={winEl} style="left:{posX}px;top:{posY}px;">
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="bar" on:mousedown={startDrag}>
    <span class="ctl"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 12h8"/><path d="M12 8v8"/></svg></span>
    <span class="title">🐺 Holo</span>
    <button class="ctl close" on:click={close} aria-label="Close"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
  </div>
  <canvas bind:this={canvas} class="c"></canvas>
</div>
{/if}

<style>
  .win {
    position:fixed;z-index:99999;border-radius:8px;overflow:hidden;
    background:#000;width:fit-content;
    box-shadow:0 0 0 1px rgba(255,255,255,0.08),0 16px 48px rgba(0,0,0,0.6);
  }
  .bar {
    display:flex;align-items:center;justify-content:space-between;
    padding:6px 10px;background:#0a0a0a;
    border-bottom:1px solid rgba(255,255,255,0.06);
    user-select:none;cursor:grab;
  }
  .bar:active{cursor:grabbing}
  .title{font-size:11px;color:rgba(255,255,255,0.45);font-family:system-ui,sans-serif}
  .ctl{display:flex;align-items:center;justify-content:center;width:22px;height:22px;border:none;border-radius:5px;background:transparent;color:rgba(255,255,255,0.35);cursor:pointer;padding:0}
  .ctl:hover{background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.6)}
  .close{border-radius:50%}
  .close:hover{background:#e81123;color:#fff}
  .c{display:block}
</style>
