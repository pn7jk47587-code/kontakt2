/* Film-Effekte beim Einlegen eines Films oder beim Hineinlegen in den Kühlschrank.
   Kodak Gold: alles wird golden, bis man wieder tippt. Portra: Münzen regnen. CineStill: alle Leuchtelemente glühen rot (Halation).
   Schwarzweißfilm: alles kurz schwarzweiß. Bei „Bewegung reduzieren“ entfallen Bewegungen, Farbwechsel bleiben kurz. */
const FX = (() => {
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const html = document.documentElement;
  const kind = st => {
    if (!st) return null;
    const id = st.id || '', mk = (st.maker || '').toLowerCase(), nm = (st.name || '').toLowerCase();
    if (id.startsWith('kodak-gold') || (mk === 'kodak' && nm.startsWith('gold'))) return 'gold';
    if (nm.includes('portra')) return 'coins';
    if (mk === 'cinestill' && st.type !== 'sw') return 'halation';
    if (st.type === 'sw' || (st.process || '').toUpperCase() === 'SW') return 'bw';
    return null;
  };
  function gold() {
    html.classList.add('fx-gold');
    U.haptic && U.haptic([10, 40, 10]);
    // Gold bleibt, bis man das nächste Mal tippt (kurze Schonfrist, damit der auslösende Tipp nicht zählt)
    setTimeout(() => {
      const off = () => { html.classList.remove('fx-gold'); document.removeEventListener('pointerdown', off, true); };
      document.addEventListener('pointerdown', off, true);
    }, 600);
  }
  function coins() {
    const c = document.createElement('canvas');
    c.className = 'fx-coins'; c.setAttribute('aria-hidden', 'true');
    document.body.appendChild(c);
    const dpr = devicePixelRatio || 1, W = innerWidth, H = innerHeight;
    c.width = W * dpr; c.height = H * dpr;
    const ctx = c.getContext('2d'); ctx.scale(dpr, dpr);
    const n = reduce() ? 0 : 26;
    const cs = Array.from({ length: n }, () => ({ x: Math.random() * W, y: -40 - Math.random() * H * .6, r: 11 + Math.random() * 8, vy: 3 + Math.random() * 3, a: Math.random() * 6.28, va: (Math.random() - .5) * .25 }));
    const t0 = performance.now();
    const draw = now => {
      ctx.clearRect(0, 0, W, H);
      let alive = false;
      for (const k of cs) {
        k.y += k.vy; k.vy += .12; k.a += k.va;
        if (k.y < H + 40) alive = true;
        const sx = Math.abs(Math.cos(k.a)) * k.r + 1.5;   // Münze dreht sich: Ellipse
        ctx.save(); ctx.translate(k.x, k.y);
        const g = ctx.createLinearGradient(-sx, -k.r, sx, k.r); g.addColorStop(0, '#fff2a8'); g.addColorStop(.5, '#f5c518'); g.addColorStop(1, '#b8860b');
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, sx, k.r, 0, 0, 6.283); ctx.fill();
        ctx.strokeStyle = 'rgba(120,80,0,.55)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, 0, sx * .72, k.r * .72, 0, 0, 6.283); ctx.stroke();
        if (sx > k.r * .5) { ctx.fillStyle = 'rgba(120,80,0,.7)'; ctx.font = `700 ${Math.round(k.r)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('€', 0, 1); }
        ctx.restore();
      }
      if (alive && now - t0 < 4000) requestAnimationFrame(draw); else c.remove();
    };
    if (n) requestAnimationFrame(draw); else c.remove();
    U.haptic && U.haptic([8, 30, 8, 30, 8]);
  }
  function timed(cls, ms) {
    html.classList.add(cls);
    setTimeout(() => html.classList.remove(cls), ms);
  }
  return {
    // stock: Filmeintrag; wird beim Einlegen und beim Hinzufügen zum Kühlschrank aufgerufen
    film(st) {
      const k = kind(st);
      if (k === 'gold') gold();
      else if (k === 'coins') coins();
      else if (k === 'halation') { timed('fx-halation', 2600); U.haptic && U.haptic(20); }
      else if (k === 'bw') timed('fx-bw', 2400);
    },
    kind
  };
})();
