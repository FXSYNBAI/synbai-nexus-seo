/* SYNBAI Nexus · ambient motion layer for the Solana chrome theme.
 * An aurora layer (pure CSS) plus a lightweight particle network on one canvas.
 * Capped at ~30 fps, paused when the window is hidden, and off for reduced motion.
 */
(() => {
  'use strict';
  if (document.getElementById('snAurora')) return;
  const aurora = document.createElement('div');
  aurora.id = 'snAurora';
  aurora.setAttribute('aria-hidden', 'true');
  const canvas = document.createElement('canvas');
  canvas.id = 'snParticles';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  document.body.prepend(aurora);

  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => media.matches || document.documentElement.classList.contains('sn-reduce-motion') || document.body.classList.contains('sn-reduce-motion');
  const ctx = canvas.getContext('2d');
  const COLORS = ['153,69,255', '20,241,149', '0,194,255', '220,31,255'];
  let w = 0, h = 0, dpr = 1, parts = [], last = 0, raf = 0;

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round(Math.min(90, Math.max(36, (w * h) / 26000)));
    parts = Array.from({length: count}, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25,
      r: Math.random() * 1.8 + .6, c: COLORS[Math.floor(Math.random() * COLORS.length)], p: Math.random() * Math.PI * 2,
    }));
  }

  function frame(t) {
    raf = requestAnimationFrame(frame);
    if (t - last < 33) return;  // ~30 fps is plenty for ambient motion
    last = t;
    ctx.clearRect(0, 0, w, h);
    const link = 120;
    for (let i = 0; i < parts.length; i++) {
      const a = parts[i];
      a.x += a.vx; a.y += a.vy; a.p += .02;
      if (a.x < -10) a.x = w + 10; if (a.x > w + 10) a.x = -10;
      if (a.y < -10) a.y = h + 10; if (a.y > h + 10) a.y = -10;
      for (let j = i + 1; j < parts.length; j++) {
        const b = parts[j], dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
        if (d2 < link * link) {
          ctx.strokeStyle = `rgba(${a.c},${(1 - Math.sqrt(d2) / link) * .14})`;
          ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      const glow = .45 + .35 * Math.sin(a.p);
      ctx.fillStyle = `rgba(${a.c},${glow})`;
      ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill();
    }
  }

  function start() { if (!raf && !reduced() && !document.hidden) raf = requestAnimationFrame(frame); }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; ctx.clearRect(0, 0, w, h); }
  function update() { reduced() || document.hidden ? stop() : start(); }

  resize();
  window.addEventListener('resize', () => { resize(); });
  document.addEventListener('visibilitychange', update);
  media.addEventListener?.('change', update);
  new MutationObserver(update).observe(document.documentElement, {attributes: true, attributeFilter: ['class']});
  new MutationObserver(update).observe(document.body, {attributes: true, attributeFilter: ['class']});
  update();
})();
