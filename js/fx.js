/* Film-Effekte beim Einlegen eines Films oder beim Hineinlegen in den Kühlschrank.
   Kodak Gold: alles wird golden, bis man wieder tippt. Portra: Münzen regnen. CineStill: alle Leuchtelemente glühen rot (Halation).
   Schwarzweißfilm: alles kurz schwarzweiß. Harman Phoenix: ein Origami-Phönix (Lichtfaltung) steigt aus der Dose und fliegt quer über den Bildschirm. Bei „Bewegung reduzieren“ entfallen Bewegungen, Farbwechsel bleiben kurz. */
const FX = (() => {
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const html = document.documentElement;
  // Letzter Tipp: dort sitzt die Dose, aus der der Phönix steigt
  let lastTap = null;
  document.addEventListener('pointerdown', e => { lastTap = { x: e.clientX, y: e.clientY, t: Date.now() }; }, true);
  const kind = st => {
    if (!st) return null;
    const id = st.id || '', mk = (st.maker || '').toLowerCase(), nm = (st.name || '').toLowerCase();
    if (mk === 'harman' && nm.includes('phoenix')) return 'phoenix';
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

  /* ---------- Phönix: Origami-Vogel in Seitenansicht, Variante D „Lichtfaltung“ ----------
     Der Vogel ist ein 3D-Modell aus Dreiecken (Blick nach +x, oben +y, Flügel in ±z), pro Bild projiziert und je Fläche schattiert.
     Flugweg: aus der Dose kurz nach oben, dann im Bogen zur Bildschirmseite mit mehr Platz, damit er möglichst lange zu sehen ist. */
  const rotX = (p, piv, a) => { const y = p[1] - piv[1], z = p[2] - piv[2], c = Math.cos(a), s = Math.sin(a); return [p[0], piv[1] + y * c - z * s, piv[2] + y * s + z * c]; };
  const V = (x, y, z) => [x, y, z];
  function birdTris(t) {
    const fl = Math.sin(t * 5.4), fl2 = Math.sin(t * 5.4 - .8);
    const a1 = .05 + .8 * fl, a2 = .1 + .55 * fl2;
    const tris = [];
    const B = V(1.45, .42, 0), Ht = V(1.08, .62, 0), Hb = V(1.0, .36, 0), Hs = sd => V(1.08, .48, .09 * sd);
    const Nk = V(.62, .18, 0), Ns = sd => V(.66, .22, .12 * sd);
    const C = V(.42, -.2, 0), Bk = V(.1, .2, 0), U_ = V(-.05, -.22, 0), T = V(-.6, .02, 0);
    const S = sd => V(.25, .02, .2 * sd), P = sd => V(-.3, .02, .13 * sd);
    for (const sd of [1, -1]) {
      tris.push([B, Ht, Hs(sd), 0], [B, Hs(sd), Hb, 0], [Ht, Nk, Hs(sd), 0], [Hs(sd), Nk, Ns(sd), 0], [Hs(sd), Ns(sd), Hb, 0], [Hb, Ns(sd), C, 0],
        [Nk, Bk, S(sd), 0], [Ns(sd), Nk, S(sd), 0], [Ns(sd), S(sd), C, 0], [C, S(sd), U_, 0], [S(sd), Bk, P(sd), 0], [S(sd), P(sd), U_, 0], [Bk, T, P(sd), 0], [P(sd), T, U_, 0]);
      const piv = V(0, .1, .14 * sd);
      const R1 = V(.42, .12, .14 * sd), R2 = V(-.32, .1, .14 * sd), E1 = V(.3, .12, .95 * sd), E2 = V(-.55, .1, .9 * sd);
      const W1 = V(-.35, .12, 2.15 * sd), W2 = V(-.85, .1, 1.7 * sd);
      const ax = p => rotX(p, piv, a1 * sd), ox = p => ax(rotX(p, V(0, .1, .92 * sd), (a2 - a1) * .9 * sd));
      const e1 = ax(E1), e2 = ax(E2), w1 = ox(W1), w2 = ox(W2);
      tris.push([R1, R2, e1, 1], [R2, e2, e1, 1], [e1, e2, w1, 2], [e2, w2, w1, 2]);
    }
    for (let i = 0; i < 3; i++) {
      const z = (i - 1) * .14, wv = Math.sin(t * 3.6 - i * .8) * .14, len = i === 1 ? 2.5 : 2.0;
      const m = V(-.6 - len * .55, -.1 + wv, z * 1.6), e = V(-.6 - len, -.3 + wv * 1.8, z * 2.4);
      tris.push([T, V(-.7, .07, z), m, 3], [V(-.7, .07, z), m, e, 3], [T, V(-.7, -.06, z), m, 3]);
    }
    const cw = Math.sin(t * 3) * .03;
    tris.push([Ht, V(.82, .98 + cw, .02), V(.95, .6, 0), 4], [Ht, V(.68, .86 + cw, -.02), V(.92, .58, 0), 4]);
    return tris;
  }
  const PH_COL = [[255, 179, 71], [255, 138, 61], [255, 79, 110], [163, 92, 255], [255, 210, 122]];
  const mixc = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  function drawBird(ctx, t, { x, y, scale, yaw = -.3, pitch = .32, roll = 0, dir = 1, alpha = 1 }) {
    const cy_ = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
    const tf = p => {
      const x1 = p[0] * cy_ + p[2] * sy, z1 = -p[0] * sy + p[2] * cy_;
      const y2 = p[1] * cp - z1 * sp, z2 = p[1] * sp + z1 * cp;
      const x3 = x1 * cr - y2 * sr, y3 = x1 * sr + y2 * cr, f = 3.2 / (3.2 + z2);
      return [x + dir * x3 * scale * f, y - y3 * scale * f, z2];
    };
    const L = [.35, .8, -.48];
    const tris = birdTris(t).map(([a, b, c, part]) => {
      const A = tf(a), Bp = tf(b), Cp = tf(c);
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], l = Math.hypot(...n) || 1;
      return { A, B: Bp, C: Cp, part, lit: Math.abs((n[0] * L[0] + n[1] * L[1] + n[2] * L[2]) / l), z: (A[2] + Bp[2] + Cp[2]) / 3 };
    }).sort((p, q) => q.z - p.z);
    ctx.save();
    ctx.globalAlpha = alpha; ctx.globalCompositeOperation = 'lighter';
    ctx.shadowColor = 'rgba(255,120,80,.6)'; ctx.shadowBlur = 6; ctx.lineJoin = 'round'; ctx.lineWidth = .8; ctx.strokeStyle = 'rgba(255,255,255,.5)';
    for (const tr of tris) {
      const base = PH_COL[tr.part];
      const c = mixc(mixc(base, [20, 10, 20], .45), mixc(base, [255, 250, 235], .25), tr.lit).map(Math.round);
      ctx.beginPath(); ctx.moveTo(tr.A[0], tr.A[1]); ctx.lineTo(tr.B[0], tr.B[1]); ctx.lineTo(tr.C[0], tr.C[1]); ctx.closePath();
      ctx.fillStyle = `rgba(${c},.55)`; ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }
  function phoenix() {
    const W = innerWidth, H = innerHeight;
    const tap = lastTap && Date.now() - lastTap.t < 8000 ? lastTap : { x: W / 2, y: H * .7 };
    const x0 = Math.min(W - 30, Math.max(30, tap.x)), y0 = Math.min(H - 30, Math.max(60, tap.y));
    const c = document.createElement('canvas');
    c.className = 'fx-phoenix'; c.setAttribute('aria-hidden', 'true');
    document.body.appendChild(c);
    const dpr = devicePixelRatio || 1;
    c.width = W * dpr; c.height = H * dpr;
    const ctx = c.getContext('2d'); ctx.scale(dpr, dpr);
    const S = Math.min(W, 520) * .14;                          // Größe des Vogels
    // Richtung: zur Seite mit mehr Platz. Höhe: steigt aus der Dose, kreuzt dann in sanftem Bogen und verlässt den Bildschirm seitlich.
    const dir = x0 < W / 2 ? 1 : -1;
    const xEnd = dir > 0 ? W + S * 3.2 : -S * 3.2;
    const high = y0 < H * .35;                                  // Dose weit oben: kaum steigen, dann abwärts
    const yLift = high ? Math.max(S * 1.8, y0 - S * .8) : Math.max(S * 2.2, y0 - S * 2.4);
    const yEnd = high ? Math.min(H * .45, y0 + H * .15) : Math.max(S * 2.2, y0 - H * .32);
    const xLift = x0 + dir * S * .6;
    const rm = reduce();
    const dur = rm ? 1400 : 1100 + Math.abs(xEnd - xLift) * 3.4;  // je länger der Weg, desto länger der Flug
    const lift = rm ? 1 : 900 / dur;                             // Anteil des Aufstiegs
    let sp = [];
    const COLS = ['#ffd27a', '#ffb347', '#ff8a3d', '#ff4f6e', '#a35cff'];
    const emit = (x, y, n, up) => { for (let i = 0; i < n; i++) { const m = 28 + Math.random() * 28; sp.push({ x, y, vx: (Math.random() - .5) * 3, vy: -(.4 + Math.random() * 1.8) * up, r: 1 + Math.random() * 1.8, c: COLS[i % 5], life: m, max: m }); } };
    if (!rm) emit(x0, y0, 40, 1.5);
    const ease = q => q < .5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2;
    const t0 = performance.now();
    let px = x0, py = y0;
    const frame = now => {
      const k = Math.min(1, (now - t0) / dur), t = (now - t0) / 1000;
      ctx.clearRect(0, 0, W, H);
      let x, y, s, yaw, roll, a = 1;
      if (rm) { x = x0; y = y0 - S * 2; s = S; yaw = -.3; roll = 0; a = k < .2 ? k / .2 : k > .75 ? (1 - k) / .25 : 1; }
      else if (k < lift) { const q = ease(k / lift); x = x0 + (xLift - x0) * q; y = y0 + (yLift - y0) * q; s = S * (.3 + .7 * q); yaw = -1.2 + q * .9; roll = .6 - q * .45; }
      else {
        const q = (k - lift) / (1 - lift), e = q * q * (3 - 2 * q) * .35 + q * .65;
        x = xLift + (xEnd - xLift) * e;
        y = yLift + (yEnd - yLift) * e - Math.sin(q * Math.PI) * S * .8;   // leichter Bogen
        s = S; yaw = -.3 + q * .15;
        roll = Math.max(-.35, Math.min(.35, Math.atan2(py - y, Math.abs(x - px) + .01) * .8));
      }
      drawBird(ctx, rm ? .3 : t, { x, y, scale: s, yaw, roll, dir, alpha: a });
      if (!rm && k > .08 && k < .97) emit(x - dir * s * .9, y + s * .15, 2, .3);
      sp = sp.filter(p => p.life > 0);
      for (const p of sp) { p.x += p.vx; p.y += p.vy; p.vy += .03; p.life--; ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); }
      ctx.globalAlpha = 1;
      px = x; py = y;
      if (k < 1 || sp.length) requestAnimationFrame(frame); else c.remove();
    };
    requestAnimationFrame(frame);
    U.haptic && U.haptic([8, 40, 12]);
  }
  function timed(cls, ms) {
    html.classList.add(cls);
    setTimeout(() => html.classList.remove(cls), ms);
  }
  return {
    // stock: Filmeintrag; wird beim Einlegen und beim Hinzufügen zum Kühlschrank aufgerufen
    film(st) {
      const k = kind(st);
      if (k === 'phoenix') phoenix();
      else if (k === 'gold') gold();
      else if (k === 'coins') coins();
      else if (k === 'halation') { timed('fx-halation', 2600); U.haptic && U.haptic(20); }
      else if (k === 'bw') timed('fx-bw', 2400);
    },
    kind
  };
})();
