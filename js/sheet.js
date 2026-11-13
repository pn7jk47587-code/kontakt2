/* Contact Sheet als PDF, hell oder dunkel: Filmstreifen mit echtem Filmnamen am Rand und Bildnummern.
   A4 hoch: alle Bilder auf einer Seite. A5 quer bei Mittelformat: zwei Seiten. Passen die Streifen nicht, werden die Bilder kleiner und der Block mittig gesetzt (v206).
   Jede Seite wird in hoher Auflösung auf ein Canvas gezeichnet und als JPEG ins PDF gelegt (jsPDF 2.5.1, MIT). */
const SHEET_IC = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="1.6"/><path d="M7 7h4v3H7zM13 7h4v3h-4zM7 12.5h4v3H7zM13 12.5h4v3h-4z"/></svg>';
let JSPDF_P = null;
function loadJsPdf() {
  if (window.jspdf) return Promise.resolve();
  if (JSPDF_P) return JSPDF_P;
  JSPDF_P = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'vendor/jspdf/jspdf.umd.min.js'; s.onload = res; s.onerror = () => { JSPDF_P = null; rej(new Error('PDF-Werkzeug konnte nicht geladen werden')); }; document.head.appendChild(s); });
  return JSPDF_P;
}
const PT = 72 / 25.4;   // Punkte je Millimeter
const SHEET_PAPER = { a4: { w: 210 * PT, h: 297 * PT }, a5: { w: 210 * PT, h: 148 * PT } };   // A5 quer: 210 × 148 mm

async function sheetImages(frames) {
  const out = [];
  for (const f of frames) {
    const rec = await DB.get('images', f.imgId);
    const blob = rec && U.recBlob(rec, false);
    let src = null;
    if (blob) { try { src = (await U.decode(blob)).src; } catch (_) {} }
    out.push({ f, src });
  }
  return out;
}

// Randschrift: schmale fette Grotesk wie die Kodak-Randbelichtung (Barlow Condensed, OFL)
let EDGE_P = null;
function loadEdgeFont() {
  if (EDGE_P) return EDGE_P;
  EDGE_P = (async () => {
    try { const f = new FontFace('LLEdge', 'url(vendor/fonts/barlow-condensed-latin-700-normal.woff2)', { weight: '700' }); await f.load(); document.fonts.add(f); return true; }
    catch (_) { EDGE_P = null; return false; }
  })();
  return EDGE_P;
}
// Punktmatrix 5×7 wie bei LED-belichteter Randschrift (Spalten, Bit 0 = oben)
const DOT5x7 = {
  A:[0x7C,0x12,0x11,0x12,0x7C],B:[0x7F,0x49,0x49,0x49,0x36],C:[0x3E,0x41,0x41,0x41,0x22],D:[0x7F,0x41,0x41,0x22,0x1C],E:[0x7F,0x49,0x49,0x49,0x41],
  F:[0x7F,0x09,0x09,0x09,0x01],G:[0x3E,0x41,0x49,0x49,0x7A],H:[0x7F,0x08,0x08,0x08,0x7F],I:[0x00,0x41,0x7F,0x41,0x00],J:[0x20,0x40,0x41,0x3F,0x01],
  K:[0x7F,0x08,0x14,0x22,0x41],L:[0x7F,0x40,0x40,0x40,0x40],M:[0x7F,0x02,0x0C,0x02,0x7F],N:[0x7F,0x04,0x08,0x10,0x7F],O:[0x3E,0x41,0x41,0x41,0x3E],
  P:[0x7F,0x09,0x09,0x09,0x06],Q:[0x3E,0x41,0x51,0x21,0x5E],R:[0x7F,0x09,0x19,0x29,0x46],S:[0x46,0x49,0x49,0x49,0x31],T:[0x01,0x01,0x7F,0x01,0x01],
  U:[0x3F,0x40,0x40,0x40,0x3F],V:[0x1F,0x20,0x40,0x20,0x1F],W:[0x3F,0x40,0x38,0x40,0x3F],X:[0x63,0x14,0x08,0x14,0x63],Y:[0x07,0x08,0x70,0x08,0x07],
  Z:[0x61,0x51,0x49,0x45,0x43],0:[0x3E,0x51,0x49,0x45,0x3E],1:[0x00,0x42,0x7F,0x40,0x00],2:[0x42,0x61,0x51,0x49,0x46],3:[0x21,0x41,0x45,0x4B,0x31],
  4:[0x18,0x14,0x12,0x7F,0x10],5:[0x27,0x45,0x45,0x45,0x39],6:[0x3C,0x4A,0x49,0x49,0x30],7:[0x01,0x71,0x09,0x05,0x03],8:[0x36,0x49,0x49,0x49,0x36],
  9:[0x06,0x49,0x49,0x29,0x1E],'-':[0x08,0x08,0x08,0x08,0x08],'.':[0x00,0x60,0x60,0x00,0x00],'/':[0x20,0x10,0x08,0x04,0x02],' ':[0,0,0,0,0]
};
// Randschrift je Marke. dot: Punktmatrix, block: schmale fette Grotesk.
// Farbe: Schwarzweiß hellgrau, Farbe gedämpftes Bernstein.
const EDGE_DOT_MAKERS = /cinestill/i;   // Kodak Vision3, Kinofilm-Basis von CineStill
function edgeStyle(st) {
  const bw = /^(sw|ir)/.test(String(st?.type || ''));
  return { kind: EDGE_DOT_MAKERS.test(String(st?.maker || '')) ? 'dot' : 'block', color: bw ? '#cfcfcc' : '#9a7444' };
}
const SHEET_THEME = {
  dark: { paper: '#0d0d0f', text: '#d9d5cc', dim: '#8f8a80', line: '#3a3833' },
  light: { paper: '#f7f5f0', text: '#1b1b1b', dim: '#6b675f', line: '#c9c4b8' }
};
// Maße einer Seite: schmaler Rand, eine kleine Kopfzeile, Streifen über die volle Breite
function sheetLayout(P, square, per, rows = 0) {
  const m = 16, pad = 5, gap = square ? 6 : 4, edge = 12, topY = m + 15;
  let fw = (P.w - 2 * m - 2 * pad - (per - 1) * gap) / per;
  const ratio = square ? 1 : 2 / 3;
  // v206: rows gesetzt (A4), dann werden die Bilder so weit verkleinert, dass alle Streifen auf eine Seite passen
  if (rows) { const maxFh = (P.h - topY - m) / rows - 2 * edge; if (fw * ratio > maxFh) fw = maxFh / ratio; }
  const fh = fw * ratio, full = 2 * pad + per * fw + (per - 1) * gap;
  return { m, pad, gap, edge, fw, fh, sh: fh + 2 * edge, topY, full, x0: m + (P.w - 2 * m - full) / 2 };
}

// Ein Blatt zeichnen. s = Skalierung Punkt → Pixel
function drawSheetPage(ctx, P, s, info, strips, page) {
  const W = P.w, H = P.h, th = SHEET_THEME[info.theme] || SHEET_THEME.dark;
  const L = sheetLayout(P, info.square, info.per, info.rows), m = L.m;
  ctx.fillStyle = th.paper; ctx.fillRect(0, 0, W * s, H * s);
  const sans = '-apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif', edgeF = 'LLEdge, "Arial Narrow", ' + sans;
  const T = (txt, x, y, size, color, font = sans, weight = '400', align = 'left', track = 0) => {
    ctx.font = `${weight} ${size * s}px ${font}`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
    if ('letterSpacing' in ctx) ctx.letterSpacing = track ? `${track * s}px` : '0px';
    ctx.fillText(txt, x * s, y * s);
  };
  // Kopfzeile: eine kleine Zeile, kein großer Titel
  T(info.sub, m, m + 6.5, 6.5, th.text);
  T(info.pages > 1 ? `${info.count} · ${page + 1}/${info.pages}` : info.count, W - m, m + 6.5, 6.5, th.dim, sans, '400', 'right');
  ctx.fillStyle = th.line; ctx.fillRect(m * s, (m + 10) * s, (W - 2 * m) * s, 0.5 * s);
  const { pad, gap, edge, fw, fh, sh } = L, sgap = info.sgap, ink = info.edge.color;
  const deaccent = t => t.toUpperCase().replace(/Ä/g, 'AE').replace(/Ö/g, 'OE').replace(/Ü/g, 'UE').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // Randtext in der Schrift der Marke; size = Versalhöhe in Punkt
  const E = (txt, x, y, size, align = 'left') => {
    if (info.edge.kind !== 'dot') { T(txt, x, y, size * 1.4, ink, edgeF, '700', align, 0.35); return; }
    const t = deaccent(txt), c = size / 7, w = t.length * 6 * c - c;
    let x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    ctx.fillStyle = ink;
    for (const ch of t) {
      const g = DOT5x7[ch] || DOT5x7[' '];
      g.forEach((col, ci) => { for (let r = 0; r < 7; r++) if (col >> r & 1) { ctx.beginPath(); ctx.arc((x0 + ci * c + c / 2) * s, (y - size + r * c + c / 2) * s, c * 0.42 * s, 0, 7); ctx.fill(); } });
      x0 += 6 * c;
    }
  };
  const tri = (x, y, h) => { ctx.fillStyle = ink; ctx.beginPath(); ctx.moveTo(x * s, (y - h) * s); ctx.lineTo((x + h * 0.9) * s, (y - h / 2) * s); ctx.lineTo(x * s, y * s); ctx.closePath(); ctx.fill(); };
  strips.forEach((strip, k) => {
    const y = L.topY + k * (sh + sgap);
    const sw = strip.length < info.per ? 2 * pad + strip.length * fw + (strip.length - 1) * gap + 6 : (info.rows ? L.full : W - 2 * m);   // Reststück kürzer, wie abgeschnitten
    ctx.fillStyle = '#060606'; ctx.fillRect(L.x0 * s, y * s, sw * s, sh * s);
    // oberer Rand: Filmname in Abständen wiederholt
    const name = info.film.toUpperCase(), ty = y + edge - 4.2;
    for (let i = 0; i < strip.length; i += 2) E(name, L.x0 + pad + i * (fw + gap) + fw * 0.25, ty, 3.4);
    strip.forEach((it, i) => {
      const x = L.x0 + pad + i * (fw + gap), fy = y + edge;
      ctx.fillStyle = '#16140f'; ctx.fillRect(x * s, fy * s, fw * s, fh * s);
      if (it.src) {
        const iw = it.src.width, ih = it.src.height;
        ctx.save(); ctx.beginPath(); ctx.rect(x * s, fy * s, fw * s, fh * s); ctx.clip();
        // Hochkantbilder liegen wie auf dem Negativ quer im Streifen
        const rot = !info.square && ih > iw;
        const bw = rot ? ih : iw, bh = rot ? iw : ih;
        const sc = Math.max(fw * s / bw, fh * s / bh);
        ctx.translate((x + fw / 2) * s, (fy + fh / 2) * s);
        if (rot) ctx.rotate(-Math.PI / 2);
        ctx.drawImage(it.src, -iw * sc / 2, -ih * sc / 2, iw * sc, ih * sc);
        ctx.restore();
      }
      // unterer Rand: Bildnummer mittig, dazwischen Pfeil und Halbbildnummer wie „▸12A“
      const by = y + edge + fh + 7.6, n = String(it.n);
      E(n, x + fw / 2, by, 3.6, 'center');
      if (/^\d+$/.test(n)) {
        const ax = x + fw * 0.82;
        tri(ax, by - 0.2, 3.2); E(n + 'A', ax + 4.2, by, 3.6);
      }
    });
  });
  // Favoriten markieren, nach allen Streifen, damit Kreise über Nachbarstreifen reichen dürfen
  if (info.favMark) strips.forEach((strip, k) => {
    const y = L.topY + k * (sh + sgap);
    strip.forEach((it, i) => {
      // v210: +5 rot, +4 blau, −4 und −5 ein Kreuz durchs Bild
      const rate = it.f?.rate;
      if (rate !== 5 && rate !== 4 && !(rate <= -4)) return;
      FAVPAL = rate === 4 ? PAL.blue : PAL.red;
      const x = L.x0 + pad + i * (fw + gap), cx = x + fw / 2, cy = y + edge + fh / 2;
      // v207: Mittelformat etwas weiter außen umkreisen, Strichstärke wächst mit der Bildgröße
      const grow = info.square ? 1.03 : 1, kk = Math.min(2, Math.max(1, fw / 85)), seed = (+String(it.f.index || 0) || 0) * 37 + (page + 1) * 101 + k * 13 + i;
      // v210: jedes markierte Bild bekommt zufällig eine der Formen Kasten, fein oder wild (fest je Bild, damit das Sheet beim nächsten Mal gleich aussieht)
      const mode = ['box', 'fine', 'wild'][Math.floor(rnd(seed + 3)() * 3)];   // v211: ohne Kreis
      if (rate <= -4) { drawCross(ctx, s, x, y + edge, fw, fh, seed, kk, mode); return; }
      if (mode === 'box') { drawFavBox(ctx, s, x - gap * 0.35, y + edge - gap * 0.35, fw + gap * 0.7, fh + gap * 0.7, seed, kk); return; }
      if (mode === 'fine') { drawFavFine(ctx, s, x - gap * 0.3, y + edge - gap * 0.3, fw + gap * 0.6, fh + gap * 0.6, seed, kk); return; }
      if (mode === 'wild') { drawFavWild(ctx, s, x, y + edge, fw, fh, seed, kk, gap, edge); return; }
      drawFavMark(ctx, s, cx, cy, (fw / 2 + gap * 0.9) * grow, (fh / 2 + edge * 0.55) * grow, (+String(it.f.index || 0) || 0) * 37 + (page + 1) * 101 + k * 13 + i, info.theme, Math.min(2, Math.max(1, fw / 85)));
    });
  });
}

// Markierungen auf dem Sheet (+5 rot, +4 blau, −4/−5 Kreuz): dicker Wachsstift, von Hand umkreist.
// Jede Markierung bekommt eine eigene Form (Oval, eckige Schleife, doppelte Runde, Lasso mit Auslauf),
// Neigung, Größe und Zittern hängen vom Bild ab, damit keine zwei gleich aussehen.
// Roter Wachsstift auf hellem und dunklem Papier (v207).
function rnd(seed) { let x = (seed * 9301 + 49297) % 233280; return () => { x = (x * 9301 + 49297) % 233280; return x / 233280; }; }
// Farben der Markierung. Rot für +5 und für das Kreuz, Blau für +4
const PAL = {
  red: { solid: [226, 46, 38], base: 'rgba(176,64,48,.92)', hi: [255, 72, 48], lo: [140, 40, 32] },
  blue: { solid: [36, 108, 228], base: 'rgba(42,90,176,.92)', hi: [80, 160, 255], lo: [22, 46, 118] }
};
let FAVPAL = PAL.red;
const PAL_STREAK = R => R() < 0.6 ? `rgba(${FAVPAL.hi.map(v => Math.min(255, v + (R() * 30 | 0)))},${.55 + R() * .4})` : `rgba(${FAVPAL.lo},${.4 + R() * .4})`;
const PAL_BASE = (a = .88) => `rgba(${FAVPAL.solid},${a})`;
function drawFavMark(ctx, s, cx, cy, rx, ry, seed, theme, k = 1) {
  const R = rnd(seed + 7), shape = Math.floor(R() * 4), tilt = (R() - 0.5) * 0.3, size = 0.96 + R() * 0.12;
  const a0 = R() * Math.PI * 2, wob = [R() * 0.07, R() * 0.05, R() * 6, R() * 6];
  rx *= size; ry *= size;
  const pts = [];
  const add = (x, y) => { const xr = x * Math.cos(tilt) - y * Math.sin(tilt), yr = x * Math.sin(tilt) + y * Math.cos(tilt); pts.push([cx + xr, cy + yr]); };
  const N = 140;
  if (shape === 1) {   // eckige Schleife: abgerundetes Rechteck, etwas mehr als eine Runde
    const turns = 1.08 + R() * 0.1;
    for (let i = 0; i <= N; i++) { const t = a0 + i / N * turns * Math.PI * 2, c = Math.cos(t), sn = Math.sin(t), g = 1 + i / N * 0.06;
      add(Math.sign(c) * Math.pow(Math.abs(c), 0.55) * rx * 0.97 * g, Math.sign(sn) * Math.pow(Math.abs(sn), 0.55) * ry * 0.93 * g); }
  } else if (shape === 2) {   // doppelte Runde, die zweite etwas kleiner und versetzt
    const turns = 1.85 + R() * 0.2;
    for (let i = 0; i <= N * 1.6; i++) { const u = i / (N * 1.6), t = a0 + u * turns * Math.PI * 2, g = 1.04 - u * 0.1, w = 1 + wob[0] * Math.sin(t * 2 + wob[2]);
      add(Math.cos(t) * rx * g * w + u * 2, Math.sin(t) * ry * g * w - u * 1.5); }
  } else if (shape === 3) {   // Lasso: eine Runde, dann ein Auslauf nach außen
    for (let i = 0; i <= N; i++) { const t = a0 + i / N * Math.PI * 2, w = 1 + wob[0] * Math.sin(t * 2 + wob[2]) + wob[1] * Math.sin(t * 3 + wob[3]); add(Math.cos(t) * rx * w, Math.sin(t) * ry * w); }
    const tEnd = a0 + Math.PI * 2;
    for (let i = 1; i <= 18; i++) { const t = tEnd + i * 0.03, g = 1 + i * 0.018; add(Math.cos(t) * rx * g, Math.sin(t) * ry * g); }
  } else {   // Oval mit Überlauf
    const turns = 1.12 + R() * 0.12;
    for (let i = 0; i <= N; i++) { const t = a0 + i / N * turns * Math.PI * 2, g = 1 + i / N * 0.08, w = 1 + wob[0] * Math.sin(t * 2 + wob[2]) + wob[1] * Math.sin(t * 3 + wob[3]); add(Math.cos(t) * rx * g * w, Math.sin(t) * ry * g * w); }
  }
  // v207: immer roter Wachsstift, dick und deckend, auch auf dunklem Papier
  const light = theme === 'light';
  const col = FAVPAL.solid;
  const path = () => { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x * s, y * s) : ctx.moveTo(x * s, y * s)); };
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // Wachs: breiter, deckender Strich, darüber ein körniger Strich, dann helle Lücken, die das Wachs auf dem Film ungleichmäßig wirken lassen
  path(); ctx.strokeStyle = `rgba(${col},.88)`; ctx.lineWidth = 6.2 * k * s; ctx.stroke();
  path(); ctx.setLineDash([0.8 * k * s, 1.6 * k * s, 2.2 * k * s, 1.1 * k * s]); ctx.strokeStyle = `rgba(${col},1)`; ctx.lineWidth = 4.4 * k * s; ctx.stroke();
  path(); ctx.setLineDash([0.5 * k * s, 2.8 * k * s]); ctx.strokeStyle = light ? 'rgba(255,255,255,.22)' : 'rgba(0,0,0,.25)'; ctx.lineWidth = 6.6 * k * s; ctx.stroke();
  ctx.restore();
}

// v208 Entwurf: Kasten mit dem Fettstift wie auf alten Magnum-Kontaktbögen. Vier einzelne, leicht schiefe Striche,
// die an den Ecken überstehen. Auf Schwarz wirkt das Rot ziegelbraun, wo der Stift fester aufsetzt, leuchtet es.
function drawFavBox(ctx, s, x, y, w, h, seed, k = 1) {
  const R = rnd(seed + 11), j = () => (R() - 0.5) * 1.6 * k, over = () => (0.6 + R() * 2.2) * k;
  const sides = [[x, y, x + w, y, 'h'], [x + w, y, x + w, y + h, 'v'], [x + w, y + h, x, y + h, 'h'], [x, y + h, x, y, 'v']];
  ctx.save(); ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
  const line = (x1, y1, x2, y2, d) => {
    const o1 = over(), o2 = over(), L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L;
    const a = [x1 - ux * o1 + j(), y1 - uy * o1 + j()], b = [x2 + ux * o2 + j(), y2 + uy * o2 + j()];
    const mid = [(a[0] + b[0]) / 2 + j() * 0.6, (a[1] + b[1]) / 2 + j() * 0.6];
    const W = 5.6 * k, nx = -uy, ny = ux;
    const path = (off = 0) => { ctx.beginPath(); ctx.moveTo((a[0] + nx * off) * s, (a[1] + ny * off) * s); ctx.quadraticCurveTo((mid[0] + nx * off) * s, (mid[1] + ny * off) * s, (b[0] + nx * off) * s, (b[1] + ny * off) * s); };
    // Grundstrich ziegelrot, darüber trockene Längsstreifen in Hellrot und Braunrot wie Pastell auf glattem Papier
    ctx.setLineDash([]); path(); ctx.strokeStyle = FAVPAL.base; ctx.lineWidth = W * s; ctx.stroke();
    for (let n = 0; n < 9; n++) {
      const off = (R() - 0.5) * W * 0.9, bright = R() < 0.55;
      ctx.setLineDash([(6 + R() * 22) * k * s, (0.8 + R() * 4) * k * s, (3 + R() * 12) * k * s, (0.5 + R() * 2.5) * k * s]);
      ctx.lineDashOffset = R() * 30 * k * s;
      path(off); ctx.strokeStyle = bright ? `rgba(${FAVPAL.hi.map(v => Math.min(255, v + (R() * 30 | 0)))},${.55 + R() * .4})` : `rgba(${FAVPAL.lo},${.4 + R() * .4})`;
      ctx.lineWidth = W * (0.12 + R() * 0.2) * s; ctx.stroke();
    }
    ctx.setLineDash([]); ctx.lineDashOffset = 0;
  };
  sides.forEach(([x1, y1, x2, y2, d]) => line(x1, y1, x2, y2, d));
  // ein zweiter, kürzerer Strich an einer Seite, wie nachgezogen
  const t = sides[Math.floor(R() * 4)], f = 0.25 + R() * 0.3;
  line(t[0], t[1], t[0] + (t[2] - t[0]) * (f + 0.4), t[1] + (t[3] - t[1]) * (f + 0.4), t[4]);
  ctx.restore();
}

// v209 Entwürfe nach Magnum-Kontaktbögen.
// Strich aus Wachs oder Kreide entlang einer Punktfolge: deckender Grundstrich, darüber unregelmäßige Längsstreifen
function waxLine(ctx, s, pts, W, R, base, streak, n = 8, k = 1) {
  const path = (dx = 0, dy = 0) => { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo((x + dx) * s, (y + dy) * s) : ctx.moveTo((x + dx) * s, (y + dy) * s)); };
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  path(); ctx.strokeStyle = base; ctx.lineWidth = W * s; ctx.stroke();
  for (let i = 0; i < n; i++) {
    const o = (R() - 0.5) * W * 0.8;
    ctx.setLineDash([(5 + R() * 20) * k * s, (0.8 + R() * 4) * k * s, (3 + R() * 10) * k * s, (0.6 + R() * 3) * k * s]);
    ctx.lineDashOffset = R() * 40 * k * s;
    path(o * 0.7, o * 0.7); ctx.strokeStyle = streak(R); ctx.lineWidth = W * (0.12 + R() * 0.22) * s; ctx.stroke();
  }
  ctx.restore();
}
// gerundetes Rechteck als Punktfolge, mit Zittern, Start an zufälliger Stelle, etwas mehr als eine Runde
function looseRect(cx, cy, rx, ry, R, turns = 1.1, wob = 0.05, sharp = 0.5) {
  const pts = [], a0 = R() * Math.PI * 2, N = 120, p1 = R() * 6, p2 = R() * 6, tilt = (R() - 0.5) * 0.12;
  for (let i = 0; i <= N * turns; i++) {
    const t = a0 + i / N * Math.PI * 2, c = Math.cos(t), sn = Math.sin(t), w = 1 + wob * Math.sin(t * 2 + p1) + wob * 0.6 * Math.sin(t * 5 + p2);
    const x = Math.sign(c) * Math.pow(Math.abs(c), sharp) * rx * w, y = Math.sign(sn) * Math.pow(Math.abs(sn), sharp) * ry * w;
    pts.push([cx + x * Math.cos(tilt) - y * Math.sin(tilt), cy + x * Math.sin(tilt) + y * Math.cos(tilt)]);
  }
  return pts;
}

// „Fein“: dünner roter Stift wie bei René Burri, Che Guevara 1963. Kasten zweimal gezogen, oben ein schneller Zickzack
function drawFavFine(ctx, s, x, y, w, h, seed, k = 1) {
  const R = rnd(seed + 23), j = () => (R() - 0.5) * 1.4 * k;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = PAL_BASE(.95);
  for (let pass = 0; pass < 2; pass++) {
    ctx.lineWidth = (pass ? 0.9 : 1.3) * k * s;
    [[x, y, x + w, y], [x + w, y, x + w, y + h], [x + w, y + h, x, y + h], [x, y + h, x, y]].forEach(([x1, y1, x2, y2]) => {
      const ox = Math.sign(x2 - x1) * (0.5 + R() * 2.5) * k, oy = Math.sign(y2 - y1) * (0.5 + R() * 2.5) * k;
      ctx.beginPath(); ctx.moveTo((x1 - ox * 0.4 + j()) * s, (y1 - oy * 0.4 + j()) * s); ctx.lineTo((x2 + ox + j()) * s, (y2 + oy + j()) * s); ctx.stroke();
    });
  }
  // Zickzack an der oberen Kante, wie nachgekritzelt
  const zx = x + w * (0.45 + R() * 0.3), zw = w * 0.22, zh = h * 0.12;
  ctx.lineWidth = 1.1 * k * s; ctx.beginPath(); ctx.moveTo(zx * s, (y + 1) * s);
  for (let i = 1; i <= 4; i++) ctx.lineTo((zx + zw * i / 4) * s, (y + (i % 2 ? zh : 1 + R() * 2)) * s);
  ctx.stroke(); ctx.restore();
}

// „Wild“: mehrere lose rote Runden übereinander, dazu ein langer Strich quer, wie Paris 1968
function drawFavWild(ctx, s, x, y, w, h, seed, k = 1, gap = 4, edge = 12) {
  const R = rnd(seed + 41), cx = x + w / 2, cy = y + h / 2, W = 4.6 * k;
  const loops = 2 + Math.floor(R() * 2);
  for (let i = 0; i < loops; i++) {
    const sc = 1 + i * 0.07 + R() * 0.06;
    waxLine(ctx, s, looseRect(cx + (R() - 0.5) * 3 * k, cy + (R() - 0.5) * 3 * k, (w / 2 + gap) * sc, (h / 2 + edge * 0.4) * sc, R, 1.02 + R() * 0.15, 0.04, 0.35), W * (i ? 0.7 : 1), R, PAL_BASE(.85), PAL_STREAK, 7, k);
  }
  // langer Strich von unten links nach oben rechts, über den Rand hinaus
  const a = [x - w * (0.2 + R() * 0.15), y + h + edge * (0.6 + R() * 0.6)], b = [x + w * (0.55 + R() * 0.25), y - edge * (0.8 + R() * 0.8)];
  const pts = []; for (let i = 0; i <= 20; i++) { const t = i / 20; pts.push([a[0] + (b[0] - a[0]) * t + Math.sin(t * 3 + R()) * 1.5 * k, a[1] + (b[1] - a[1]) * t]); }
  waxLine(ctx, s, pts, W * 0.65, R, PAL_BASE(.8), PAL_STREAK, 4, k);
}


// v210: Kreuz durchs Bild für −4 und −5, im Strich der gewählten Markierung
function drawCross(ctx, s, x, y, w, h, seed, k, mode) {
  const R = rnd(seed + 71), j = () => (R() - 0.5) * 2.4 * k, o = () => (1 + R() * 3) * k;
  const lines = [[[x - o(), y - o()], [x + w + o(), y + h + o()]], [[x + w + o(), y - o()], [x - o(), y + h + o()]]];
  lines.forEach(([a, b]) => {
    const pts = []; for (let i = 0; i <= 16; i++) { const t = i / 16, bow = Math.sin(t * Math.PI) * (R() - 0.5) * 0.6 * k; pts.push([a[0] + (b[0] - a[0]) * t + bow + (i === 0 || i === 16 ? j() : 0), a[1] + (b[1] - a[1]) * t + bow]); }
    if (mode === 'fine') { ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = PAL_BASE(.95); ctx.lineWidth = 1.4 * k * s; ctx.beginPath(); pts.forEach(([px, py], i) => i ? ctx.lineTo(px * s, py * s) : ctx.moveTo(px * s, py * s)); ctx.stroke(); ctx.restore(); }
    else waxLine(ctx, s, pts, (mode === 'wax' ? 5.2 : 4.6) * k, R, PAL_BASE(.88), PAL_STREAK, 8, k);
  });
}

async function makeContactSheet(rollId, paper, theme = 'dark', perRow = 6, favMark = '') {
  await loadJsPdf();
  const d = await albumData(rollId);
  if (!d.frames.length) throw new Error('Keine Fotos im Album');
  const r = d.roll, st = d.stocks.get(r?.stockId), cam = d.cams.get(r?.cameraId);
  const square = r?.format === '120' || r?.format === 'gross' || /6x6|120/.test(String(st?.format || r?.format || ''));
  const per = square ? (perRow === 4 ? 3 : 4) : (perRow === 4 ? 4 : 6);
  const imgs = await sheetImages(d.frames);
  const items = imgs.map(x => ({ ...x, n: frameLabel(x.f) }));
  const strips = []; for (let i = 0; i < items.length; i += per) strips.push(items.slice(i, i + per));
  // v215: A4 alle Streifen auf eine Seite. A5 bei Mittelformat auf höchstens zwei Seiten, gleichmäßig verteilt.
  const rows = paper === 'a4' ? strips.length : square ? Math.ceil(strips.length / 2) : 0;
  const P = SHEET_PAPER[paper], L = sheetLayout(P, square, per, rows);
  const avail = P.h - L.topY - L.m;
  // so viele Streifen wie passen, lückenlos untereinander, der Reihe nach gefüllt. Rest bleibt unten frei.
  const perPage = Math.max(1, Math.floor(avail / L.sh + 1e-6));
  const pages = Math.ceil(strips.length / perPage);
  const slices = []; for (let p = 0; p < pages; p++) slices.push(strips.slice(p * perPage, (p + 1) * perPage));
  const sgap = 0;
  const dates = d.frames.map(f => f.date).filter(Boolean).sort();
  const range = (r?.loadedAt || dates[0]) ? [U.fmtDate(String(r?.loadedAt || dates[0]).slice(0, 10)), U.fmtDate(String(r?.finishedAt || dates[dates.length - 1] || '').slice(0, 10))].filter(Boolean).join('–') : '';
  const info = {
    title: r?.title || U.stockLabel(st), film: U.stockLabel(st), edge: edgeStyle(st), square, per, sgap, pages, theme, rows,
    favMark,
    sub: [U.stockLabel(st), r?.ei ? 'EI ' + r.ei : '', camLabel(cam) || r?.camera || '', range].filter(Boolean).join(' · '),
    count: `${d.frames.length} Bilder`
  };
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: paper === 'a4' ? 'a4' : [P.w, P.h], orientation: paper === 'a4' ? 'portrait' : 'landscape', compress: true });
  const s = 300 / 72;   // 300 dpi
  const c = document.createElement('canvas'); c.width = Math.round(P.w * s); c.height = Math.round(P.h * s);
  const ctx = c.getContext('2d'); ctx.imageSmoothingQuality = 'high';
  await loadEdgeFont();
  // kleine Vorschaubilder der Seiten für die Ansicht vor dem Teilen
  const pv = document.createElement('canvas'); pv.width = 1100; pv.height = Math.round(1100 * P.h / P.w);
  const pctx = pv.getContext('2d'); pctx.imageSmoothingQuality = 'high';
  const previews = [], pngs = [];
  for (let p = 0; p < pages; p++) {
    drawSheetPage(ctx, P, s, info, slices[p], p);
    pctx.drawImage(c, 0, 0, pv.width, pv.height); previews.push(pv.toDataURL('image/jpeg', 0.82));
    // v217: jede Seite zusätzlich als PNG in 300 dpi, schon jetzt erzeugt, damit das Teilen sofort startet
    pngs.push(await new Promise(r => c.toBlob(r, 'image/png')));
    if (p) doc.addPage(paper === 'a4' ? 'a4' : [P.w, P.h], paper === 'a4' ? 'portrait' : 'landscape');
    doc.addImage(c.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, P.w, P.h, undefined, 'FAST');
  }
  imgs.forEach(x => x.src && x.src.close && x.src.close());
  const name = `Contact Sheet ${(info.title || 'Rolle').replace(/[\\/:*?"<>|]+/g, ' ').trim()} ${paper.toUpperCase()}.pdf`;
  return { blob: doc.output('blob'), name, pages, previews, pngs, ratio: P.w / P.h };
}

// v221: Instagram Story. Ausgewählte Bilder als kurze Filmstreifen im Raster, 1080 × 1920 Pixel.
// Gezeichnet mit drawSheetPage auf einer Seite von 270 pt Breite in vierfacher Auflösung,
// danach mittig auf die Story gesetzt. Oben und unten bleibt Platz für die Bedienelemente von Instagram.
async function makeStorySheet(rollId, frameIds, theme = 'dark', favMark = '') {
  const d = await albumData(rollId);
  const pick = d.frames.filter(f => frameIds.includes(f.id));
  if (!pick.length) throw new Error('Keine Bilder gewählt');
  const r = d.roll, st = d.stocks.get(r?.stockId), cam = d.cams.get(r?.cameraId);
  const square = r?.format === '120' || r?.format === 'gross' || /6x6|120/.test(String(st?.format || r?.format || ''));
  const n = pick.length;
  const imgs = await sheetImages(pick);
  const items = imgs.map(x => ({ ...x, n: frameLabel(x.f) }));
  const SW = 1080, SH = 1920, s = 4, Wpt = SW / s, maxH = SH / s - 2 * 62;   // 62 pt ≈ 250 px frei oben und unten
  // 1 bis 3 Bilder je Reihe: genommen wird die Aufteilung mit den größten Bildern
  const fit = per => {
    const k = Math.ceil(n / per);
    let L = sheetLayout({ w: Wpt, h: 9999 }, square, per, 0), Hpt = L.topY + k * L.sh + L.m, rows = 0;
    if (Hpt > maxH) { Hpt = maxH; rows = k; L = sheetLayout({ w: Wpt, h: Hpt }, square, per, rows); }
    return { per, L, Hpt, rows };
  };
  const { per, Hpt, rows } = [1, 2, 3].map(fit).reduce((a, b) => b.L.fw > a.L.fw + 0.5 ? b : a);
  const strips = []; for (let i = 0; i < items.length; i += per) strips.push(items.slice(i, i + per));
  const P = { w: Wpt, h: Hpt };
  const info = {
    title: r?.title || U.stockLabel(st), film: U.stockLabel(st), edge: edgeStyle(st), square, per, sgap: 0, pages: 1, theme, rows,
    favMark,
    sub: [U.stockLabel(st), camLabel(cam) || r?.camera || ''].filter(Boolean).join(' · '),
    count: n === 1 ? '1 Bild' : `${n} Bilder`
  };
  await loadEdgeFont();
  const c = document.createElement('canvas'); c.width = SW; c.height = SH;
  const ctx = c.getContext('2d'); ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = (SHEET_THEME[theme] || SHEET_THEME.dark).paper; ctx.fillRect(0, 0, SW, SH);
  ctx.save(); ctx.translate(0, Math.round((SH - Hpt * s) / 2));
  drawSheetPage(ctx, P, s, info, strips, 0);
  ctx.restore();
  imgs.forEach(x => x.src && x.src.close && x.src.close());
  const png = await new Promise(res => c.toBlob(res, 'image/png'));
  const name = `Story ${(info.title || 'Rolle').replace(/[\\/:*?"<>|]+/g, ' ').trim()}.pdf`;
  return { blob: png, name, pages: 1, previews: [c.toDataURL('image/jpeg', 0.85)], pngs: [png], ratio: SW / SH, story: true };
}

// v229: Story direkt aus dem Album (Teilen). Hell oder Dunkel und Markieren wie zuletzt beim Contact Sheet.
async function openStoryFlow(rollId) {
  let theme = 'dark', fav = '';
  try { theme = localStorage.getItem('kb-cs-theme') || 'dark'; fav = localStorage.getItem('kb-cs-fav') ? 'mix' : ''; } catch (_) {}
  openStoryPicker(rollId, async ids => {
    const res = await makeStorySheet(rollId, ids, theme, fav);
    res.theme = theme;
    res.retheme = async t => { try { localStorage.setItem('kb-cs-theme', t); } catch (_) {} return makeStorySheet(rollId, ids, t, fav); };
    openSheetPreview(res);
  });
}

// Bilder für die Story antippen. Vorgewählt sind die mit +4 und +5, höchstens 12.
// v227: auch für den Instagram-Beitrag (opts.max, opts.preset: schon gewählte Bild-IDs)
async function openStoryPicker(rollId, onPick, opts = {}) {
  const d = await albumData(rollId);
  const frames = d.frames.filter(f => f.imgId), MAX = opts.max || 12;
  const chosen = new Set(opts.preset ? opts.preset.filter(id => frames.some(f => f.id === id)) : frames.filter(f => f.rate >= 4).slice(0, MAX).map(f => f.id));
  const own = [];
  const urls = await Promise.all(frames.map(async f => { const rec = await DB.get('images', f.imgId); const b = rec && U.recBlob(rec, true); if (!b) return ''; const u = URL.createObjectURL(b); own.push(u); return u; }));
  const ov = document.createElement('div'); ov.className = 'cspv storypick';
  ov.innerHTML = `<div class="spgrid">${frames.map((f, i) => `<button type="button" class="spph" data-f="${f.id}"><img src="${urls[i]}" alt="" draggable="false"><span class="spnum">${U.esc(String(frameLabel(f)))}</span><span class="spck" aria-hidden="true">${ART.check}</span></button>`).join('')}</div>
    <div class="matchbar spbar"><button type="button" class="btn ghost small" id="spAll">Alle</button><button type="button" class="btn ghost small" id="spNone">Keine</button><span class="sub2" id="spN"></span></div>
    <div class="sptray" id="spTray" hidden></div>
    <div class="cspvfoot"><button class="closex" id="spX" aria-label="Abbrechen">${ART.x}</button>
    <button class="cspvshare" id="spOk" aria-label="Story erstellen">${ART.check}</button></div>`;
  document.body.appendChild(ov);
  const close = () => { ov.remove(); setTimeout(() => own.forEach(u => URL.revokeObjectURL(u)), 1000); };
  const draw = () => {
    ov.querySelectorAll('.spph').forEach(b => b.classList.toggle('on', chosen.has(b.dataset.f)));
    ov.querySelector('#spN').textContent = `${chosen.size} von ${MAX}`;
    // v226: gewählte Bilder klein über der Fußleiste, in der Reihenfolge der Story
    const tray = ov.querySelector('#spTray'), sel = frames.map((f, i) => [f, urls[i]]).filter(([f]) => chosen.has(f.id));
    tray.hidden = !sel.length;
    tray.innerHTML = sel.map(([f, u]) => `<button type="button" class="sptr" data-t="${f.id}" aria-label="Bild ${U.esc(String(frameLabel(f)))} zeigen"><img src="${u}" alt="" draggable="false"></button>`).join('');
    ov.querySelector('#spOk').disabled = !chosen.size;
    ov.querySelector('#spNone').disabled = !chosen.size;
    ov.querySelector('#spAll').disabled = chosen.size >= Math.min(MAX, frames.length);
  };
  ov.querySelector('.spgrid').addEventListener('click', e => {
    const b = e.target.closest('.spph'); if (!b) return;
    const id = b.dataset.f;
    if (chosen.has(id)) chosen.delete(id);
    else if (chosen.size < MAX) chosen.add(id);
    else { U.toast(`Höchstens ${MAX} Bilder`); return; }
    U.haptic && U.haptic(8); draw();
  });
  // Antippen in der Leiste holt das Bild in der Liste ins Bild
  ov.querySelector('#spTray').addEventListener('click', e => {
    const t = e.target.closest('.sptr'); if (!t) return;
    const b = ov.querySelector(`.spph[data-f="${t.dataset.t}"]`);
    if (b) { b.scrollIntoView({ block: 'center', behavior: 'smooth' }); b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash'); }
  });
  // v226: alle (höchstens 12, der Reihe nach) oder keine
  ov.querySelector('#spAll').onclick = () => {
    for (const f of frames) { if (chosen.size >= MAX) break; chosen.add(f.id); }
    if (frames.length > MAX) U.toast(`Höchstens ${MAX} Bilder`);
    U.haptic && U.haptic(10); draw();
  };
  ov.querySelector('#spNone').onclick = () => { chosen.clear(); U.haptic && U.haptic(8); draw(); };
  ov.querySelector('#spX').onclick = close;
  ov.querySelector('#spOk').onclick = async e => {
    const btn = e.currentTarget; btn.disabled = true;
    const ids = opts.preset ? [...opts.preset.filter(id => chosen.has(id)), ...frames.filter(f => chosen.has(f.id) && !opts.preset.includes(f.id)).map(f => f.id)] : frames.filter(f => chosen.has(f.id)).map(f => f.id);
    try { await onPick(ids); close(); }
    catch (err) { U.toast(err.message || 'Story konnte nicht erstellt werden'); btn.disabled = false; }
  };
  draw();
}

// Auswahl: Format, Hell/Dunkel und Bilder je Reihe antippen, erst der Haken erstellt das Sheet.
// Die letzte Wahl wird vorausgewählt, beim ersten Mal ist nichts gewählt.
function openContactSheet(rollId) {
  const ov = document.createElement('div'); ov.className = 'modalbg';
  ov.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="Contact Sheet als PDF">
    <div class="csopts">
      <button type="button" class="csopt" data-p="a4"><span class="cspage a4"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span><b>A4 hoch</b></button>
      <button type="button" class="csopt" data-p="a5"><span class="cspage a5"><i></i><i></i><i></i><i></i></span><b>A5 quer</b></button>
    </div>
    <div class="seggroup cstheme csper" role="group" aria-label="Bilder je Reihe"><button type="button" class="seg" data-r="6">6 je Reihe</button><button type="button" class="seg" data-r="4">4 je Reihe</button></div>
    <div class="seggroup cstheme" role="group" aria-label="Papier"><button type="button" class="seg" data-t="light">Hell</button><button type="button" class="seg" data-t="dark">Dunkel</button></div>
    <div class="seggroup cstheme csfav" role="group" aria-label="Markierungen" hidden><button type="button" class="seg" data-fm="mix"><span class="favdot" aria-hidden="true"></span>Markieren</button><button type="button" class="seg" data-fm="">Ohne</button></div>
    <p class="sub2 csstate" id="csState"></p>
    <div class="modalfoot"><button class="closex" id="csNo" aria-label="Abbrechen">${ART.x}</button><button class="cspvshare csgo" id="csGo" aria-label="Contact Sheet erstellen" disabled>${ART.check}</button></div></div>`;
  document.body.appendChild(ov);
  ov.querySelector('#csNo').onclick = () => ov.remove();
  const get = k => { try { return localStorage.getItem(k); } catch (_) { return null; } };
  const put = (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} };
  const sel = { p: get('kb-cs-paper'), t: get('kb-cs-theme'), r: get('kb-cs-per') };
  if (sel.p === 'story') sel.p = null;   // v229: Story liegt jetzt unter Teilen im Album
  // Favoriten umkreisen: freiwillig, nur sichtbar, wenn die Rolle Fotos mit +5 hat
  let fm = get('kb-cs-fav') ? 'mix' : '';   // frühere Werte (wax, box …) gelten als „Markieren“
  albumData(rollId).then(d => {
    if (!d) return;
    // Mittelformat: die Knöpfe nennen die echte Zahl je Reihe (4 oder 3 statt 6 oder 4)
    const r = d.roll, st = d.stocks.get(r?.stockId);
    if (r?.format === '120' || r?.format === 'gross' || /6x6|120/.test(String(st?.format || r?.format || ''))) { ov.querySelector('[data-r="6"]').textContent = '4 je Reihe'; ov.querySelector('[data-r="4"]').textContent = '3 je Reihe'; }
    if (d.frames.some(f => f.rate === 5 || f.rate === 4 || f.rate <= -4)) { ov.querySelector('.csfav').hidden = false; paint(); }
  });
  ov.querySelectorAll('[data-fm]').forEach(x => x.onclick = () => { fm = x.dataset.fm; put('kb-cs-fav', fm); paint(); });
  const go = ov.querySelector('#csGo'), stEl = ov.querySelector('#csState');
  const paint = () => {
    ov.querySelectorAll('[data-p]').forEach(x => x.classList.toggle('on', x.dataset.p === sel.p));
    ov.querySelectorAll('[data-t]').forEach(x => x.classList.toggle('on', x.dataset.t === sel.t));
    ov.querySelectorAll('[data-r]').forEach(x => x.classList.toggle('on', x.dataset.r === sel.r));
    ov.querySelectorAll('[data-fm]').forEach(x => x.classList.toggle('on', x.dataset.fm === fm));
    ov.querySelector('.csopts').dataset.t = sel.t || 'dark';
    const story = sel.p === 'story';
    ov.querySelector('.csper').hidden = story;
    go.disabled = !(sel.p && sel.t && (sel.r || story));
  };
  [['p', 'kb-cs-paper'], ['t', 'kb-cs-theme'], ['r', 'kb-cs-per']].forEach(([k, key]) =>
    ov.querySelectorAll(`[data-${k}]`).forEach(x => x.onclick = () => { sel[k] = x.dataset[k]; put(key, sel[k]); stEl.textContent = ''; paint(); }));
  paint();
  go.onclick = async () => {
    const favm = ov.querySelector('.csfav').hidden ? '' : fm;
    const all = ov.querySelectorAll('button'); all.forEach(x => x.disabled = true);
    stEl.textContent = 'PDF wird erstellt …';
    try {
      const res = await makeContactSheet(rollId, sel.p, sel.t, +sel.r, ov.querySelector('.csfav').hidden ? '' : fm);
      stEl.textContent = '';
      openSheetPreview(res, () => ov.remove());
    } catch (e) { stEl.textContent = e.message || 'PDF konnte nicht erstellt werden'; }
    all.forEach(x => x.disabled = false); paint();
  };
}

const SHARE_IC = '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5"/><path d="M8 11H6.5A1.5 1.5 0 0 0 5 12.5v7A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-7a1.5 1.5 0 0 0-1.5-1.5H16"/></svg>';
// Vorschau aller Seiten. X führt zurück zur Auswahl, der Teilen-Knopf öffnet Teilen bzw. Sichern.
// Das Teilen startet erst auf diesen Tipp hin, so bleibt die Nutzergeste für navigator.share frisch.
function openSheetPreview(res, onDone) {
  let { blob, name, pages, previews, pngs, ratio, story } = res;
  let fmt = 'pdf';
  try { if (localStorage.getItem('kb-cs-fmt') === 'png') fmt = 'png'; } catch (_) {}
  if (story) fmt = 'png';
  const ov = document.createElement('div'); ov.className = 'cspv' + (story ? ' storypv' : '');
  ov.innerHTML = `<div class="cspvpages">${previews.map((u, i) => `<img src="${u}" alt="Seite ${i + 1} von ${pages}" style="aspect-ratio:${ratio}">`).join('')}</div>
    <div class="cspvfoot"><button class="closex" id="pvBack" aria-label="Zurück">${ART.x}</button>
    ${story ? (res.retheme ? `<div class="seggroup cspvfmt" role="group" aria-label="Papier"><button type="button" class="seg" data-st="light">Hell</button><button type="button" class="seg" data-st="dark">Dunkel</button></div>` : '') : '<div class="seggroup cspvfmt" role="group" aria-label="Dateiformat"><button type="button" class="seg" data-x="pdf">PDF</button><button type="button" class="seg" data-x="png">PNG</button></div>'}
    <button class="cspvshare" id="pvShare" aria-label="Teilen oder sichern">${SHARE_IC}</button></div>`;
  document.body.appendChild(ov);
  const paint = () => ov.querySelectorAll('[data-x]').forEach(x => x.classList.toggle('on', x.dataset.x === fmt));
  // v229: Story hell oder dunkel, neu gezeichnet
  let th = res.theme;
  const paintSt = () => ov.querySelectorAll('[data-st]').forEach(x => x.classList.toggle('on', x.dataset.st === th));
  ov.querySelectorAll('[data-st]').forEach(x => x.onclick = async () => {
    if (x.dataset.st === th) return; th = x.dataset.st; paintSt();
    const r2 = await res.retheme(th);
    ({ blob, pngs, previews } = r2); ov.querySelector('.cspvpages img').src = previews[0];
  });
  paintSt();
  ov.querySelectorAll('[data-x]').forEach(x => x.onclick = () => { fmt = x.dataset.x; try { localStorage.setItem('kb-cs-fmt', fmt); } catch (_) {} paint(); });
  paint();
  ov.querySelector('#pvBack').onclick = () => ov.remove();
  ov.querySelector('#pvShare').onclick = async e => {
    const btn = e.currentTarget; FEEL && FEEL.burst && FEEL.burst(btn);
    const base = name.replace(/\.pdf$/, '');
    const files = fmt === 'png' && pngs && pngs.every(Boolean)
      ? pngs.map((b, i) => new File([b], pages > 1 ? `${base} ${i + 1}.png` : base + '.png', { type: 'image/png' }))
      : [new File([blob], name, { type: 'application/pdf' })];
    if (navigator.canShare && navigator.canShare({ files })) {
      try { await navigator.share({ files, title: base }); ov.remove(); onDone && onDone(); return; }
      catch (err) { if (err && err.name === 'AbortError') return; }
    }
    files.forEach((f, i) => setTimeout(() => {
      const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 30000);
    }, i * 400));
    ov.remove(); onDone && onDone();
  };
}
