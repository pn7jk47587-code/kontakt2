/* Lichtstrahl nach Sonnenstand.
   Die Sonne sitzt am Bildschirmrand und wandert über den Tag: morgens rechts unten, mittags oben, abends links.
   Ein breiter Strahl fällt auf die Seite. Gläserne Bedienelemente im Vordergrund brechen ihn (Snellius, n = 1,5)
   und werfen hinter sich einen Spektralfächer auf den Hintergrund. Karten und Listen gelten als Hintergrund:
   über sie läuft das Licht nur hinweg. */
const BEAM = (() => {
  const N = 1.5;
  const SPECTRUM = [['#7a5cff', 1.535], ['#3f8cff', 1.522], ['#22d3c8', 1.510], ['#b9ef3a', 1.498], ['#ffd23c', 1.488], ['#ff7a3c', 1.478]];
  // Vordergrund: gläserne Knöpfe und Bedienelemente (ohne Kopfzeile, die liegt über dem Licht)
  const SELECTOR = 'main .btn, main .modebtn, .cardact, .nextarrow, .donebtn, main .chip, .dblbtn, main .lensbtn, main .fridgeplus, main .seggroup, main .heroav, main .sparkle.big, main .newfilm';
  const BAND = 96;          // Breite des Strahls in px
  let layer, front, raf = 0, lit = [];

  const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
  const mul = (a, k) => ({ x: a.x * k, y: a.y * k });
  const dot = (a, b) => a.x * b.x + a.y * b.y;
  function refract(d, n, eta) {
    const c = -dot(n, d), k = 1 - eta * eta * (1 - c * c);
    if (k < 0) return null;
    const t = add(mul(d, eta), mul(n, eta * c - Math.sqrt(k)));
    const l = Math.hypot(t.x, t.y); return { x: t.x / l, y: t.y / l };
  }
  function slabs(p, d, r) {
    const big = 1e9;
    const tx1 = d.x ? (r.x - p.x) / d.x : -big, tx2 = d.x ? (r.x + r.w - p.x) / d.x : big;
    const ty1 = d.y ? (r.y - p.y) / d.y : -big, ty2 = d.y ? (r.y + r.h - p.y) / d.y : big;
    return { nx: Math.min(tx1, tx2), fx: Math.max(tx1, tx2), ny: Math.min(ty1, ty2), fy: Math.max(ty1, ty2) };
  }
  function screenT(p, d, W, H) {
    const ts = [];
    if (d.x < 0) ts.push(-p.x / d.x); if (d.x > 0) ts.push((W - p.x) / d.x);
    if (d.y < 0) ts.push(-p.y / d.y); if (d.y > 0) ts.push((H - p.y) / d.y);
    return Math.max(0, Math.min(...ts));
  }
  function trace(p, d, rects, W, H) {
    const segs = [], fans = [], hitEls = new Set();
    let inside = null;
    for (let i = 0; i < 30; i++) {
      if (!inside) {
        let best = null;
        for (const r of rects) {
          const s = slabs(p, d, r), te = Math.max(s.nx, s.ny), tx = Math.min(s.fx, s.fy);
          if (te <= tx && te > 1e-3 && (!best || te < best.t)) best = { t: te, r, n: s.nx > s.ny ? { x: d.x > 0 ? -1 : 1, y: 0 } : { x: 0, y: d.y > 0 ? -1 : 1 } };
        }
        const ts = screenT(p, d, W, H);
        if (!best || best.t > ts) { segs.push({ a: p, b: add(p, mul(d, ts)), kind: segs.length ? 'after' : 'free' }); break; }
        const q = add(p, mul(d, best.t));
        segs.push({ a: p, b: q, kind: segs.length ? 'after' : 'free' });
        d = refract(d, best.n, 1 / N) || d; p = q; inside = best.r; hitEls.add(best.r.el);
      } else {
        const s = slabs(p, d, inside), t = Math.min(s.fx, s.fy);
        const n = s.fx < s.fy ? { x: d.x > 0 ? -1 : 1, y: 0 } : { x: 0, y: d.y > 0 ? -1 : 1 };
        const q = add(p, mul(d, t));
        segs.push({ a: p, b: q, kind: 'in', r: inside });
        const out = refract(d, n, N) || d;
        // Ein Rechteck wirkt wie eine planparallele Platte, die das Licht kaum auffächert.
        // Damit die Kanten wie Prismen wirken, wird die Streuung der Brechzahlen sichtbar verstärkt (rund 3° je Farbe).
        SPECTRUM.forEach(([c], k) => {
          const a = (k - (SPECTRUM.length - 1) / 2) * 0.052, ca = Math.cos(a), sa = Math.sin(a);
          fans.push({ p: q, d: { x: out.x * ca - out.y * sa, y: out.x * sa + out.y * ca }, c });
        });
        d = out; p = q; inside = null;
      }
    }
    return { segs, fans, hitEls };
  }
  function line(a, b, w, extra = '') {
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy), ang = Math.atan2(dy, dx) * 180 / Math.PI;
    return `left:${a.x.toFixed(1)}px;top:${a.y.toFixed(1)}px;width:${len.toFixed(1)}px;height:${w}px;margin-top:${-w / 2}px;transform:rotate(${ang.toFixed(2)}deg);${extra}`;
  }

  // Anteil des Tagbogens 0..1 (Sonnenaufgang bis -untergang), null nachts
  function dayPos() {
    const now = new Date();
    const sim = MOOD.clock();
    const m = sim !== null && !isNaN(sim) ? sim * 60 : now.getHours() * 60 + now.getMinutes();
    const t = MOOD.sunTimes(now);
    if (m < t.rise || m >= t.set) return null;
    return (m - t.rise) / (t.set - t.rise);
  }
  // Sonne auf dem Bildschirmrand: Strahl vom Bildmittelpunkt aus in Richtung Sonnenazimut, Schnitt mit dem Rand
  function sunOnEdge(s, W, H) {
    const c = { x: W / 2, y: H * 0.62 };
    const phi = Math.PI * s;                 // 0 rechts, π/2 oben, π links
    const lift = 0.18 + 0.82 * Math.sin(Math.PI * s);
    const d = { x: Math.cos(phi), y: -Math.max(0.12, Math.sin(phi)) * (H / W) * lift };
    const l = Math.hypot(d.x, d.y); d.x /= l; d.y /= l;
    const t = screenT(c, d, W, H);
    return { sun: add(c, mul(d, t)), dir: mul(d, -1), c };
  }

  function draw() {
    raf = 0;
    if (!layer) return;
    lit.forEach(el => { delete el.dataset.lit; }); lit = [];
    if (document.documentElement.dataset.mood !== 'sun' || document.body.classList.contains('albummode') || document.querySelector('.modalbg, .overlay')) { layer.innerHTML = ''; front.innerHTML = ''; return; }
    const s = dayPos();
    if (s === null) { layer.innerHTML = ''; front.innerHTML = ''; return; }
    const W = window.innerWidth, H = window.innerHeight;
    const els = [...document.querySelectorAll(SELECTOR)].filter(el => !el.hidden && el.offsetParent !== null);
    const outer = els.filter(el => !els.some(o => o !== el && o.contains(el)));
    const rects = outer.map(el => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, el }; })
      .filter(r => r.w > 8 && r.h > 8 && r.y + r.h > 56 && r.y < H);
    const { sun, dir } = sunOnEdge(s, W, H);
    const start = add(sun, mul(dir, 2));
    const tr = trace(start, dir, rects, W, H);
    // Hintergrundschicht (hinter den Inhalten): Sonne, Lichtband, Spektralfächer. Vordergrund: Lichtweg im Glas.
    let html = `<div class="beamsun" style="left:${(sun.x - 150).toFixed(0)}px;top:${(sun.y - 150).toFixed(0)}px"></div>`;
    let fhtml = '';
    for (const sg of tr.segs) {
      if (sg.kind === 'in') fhtml += `<div class="beamin" style="${line(sg.a, sg.b, 4)}"></div>`;
      else html += `<div class="beamband${sg.kind === 'after' ? ' after' : ''}" style="${line(sg.a, sg.b, BAND)}"></div>`;
    }
    // Spektralfächer: auf den Hintergrund projiziert, breit und weich
    tr.fans.forEach((f, i) => {
      html += `<div class="beamfan" style="${line(f.p, add(f.p, mul(f.d, 300)), 22, `--c:${f.c}`)}"></div>`;
    });
    layer.innerHTML = html;
    front.innerHTML = fhtml;
    tr.hitEls.forEach(el => { el.dataset.lit = '1'; lit.push(el); });
  }
  const update = () => { if (!raf) raf = requestAnimationFrame(draw); };

  function init() {
    layer = document.createElement('div');
    layer.className = 'beamlayer beamback';
    layer.setAttribute('aria-hidden', 'true');
    front = document.createElement('div');
    front.className = 'beamlayer front';
    front.setAttribute('aria-hidden', 'true');
    document.body.prepend(layer);
    document.body.appendChild(front);
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    document.addEventListener('scroll', update, { passive: true, capture: true });
    new MutationObserver(recs => { if (recs.some(r => !layer.contains(r.target) && !front.contains(r.target))) update(); }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class'] });
    new MutationObserver(update).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mood'] });
    setInterval(update, 60 * 1000);
    update();
  }
  return { init, update };
})();
BEAM.init();
