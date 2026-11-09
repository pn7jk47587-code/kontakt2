/* Contact Sheet als PDF, hell oder dunkel: Filmstreifen mit echtem Filmnamen am Rand und Bildnummern.
   A4 hoch: alle Bilder auf einer Seite. Passen die Streifen nicht, werden die Bilder kleiner und der Block mittig gesetzt (v206).
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
      if (it.f?.rate !== 5) return;
      const x = L.x0 + pad + i * (fw + gap), cx = x + fw / 2, cy = y + edge + fh / 2;
      // v207: Mittelformat etwas weiter außen umkreisen, Strichstärke wächst mit der Bildgröße
      const grow = info.square ? 1.1 : 1, kk = Math.min(2, Math.max(1, fw / 85)), seed = (+String(it.f.index || 0) || 0) * 37 + (page + 1) * 101 + k * 13 + i;
      if (info.favMark === 'box') { drawFavBox(ctx, s, x - gap * 0.35, y + edge - gap * 0.35, fw + gap * 0.7, fh + gap * 0.7, seed, kk); return; }
      drawFavMark(ctx, s, cx, cy, (fw / 2 + gap * 0.9) * grow, (fh / 2 + edge * 0.55) * grow, (+String(it.f.index || 0) || 0) * 37 + (page + 1) * 101 + k * 13 + i, info.theme, Math.min(2, Math.max(1, fw / 85)));
    });
  });
}

// Favoriten (+5) auf dem Sheet markieren: dicker Wachsstift, von Hand umkreist.
// Jede Markierung bekommt eine eigene Form (Oval, eckige Schleife, doppelte Runde, Lasso mit Auslauf),
// Neigung, Größe und Zittern hängen vom Bild ab, damit keine zwei gleich aussehen.
// Roter Wachsstift auf hellem und dunklem Papier (v207).
function rnd(seed) { let x = (seed * 9301 + 49297) % 233280; return () => { x = (x * 9301 + 49297) % 233280; return x / 233280; }; }
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
  const col = light ? [206, 40, 30] : [232, 52, 40];
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
    ctx.setLineDash([]); path(); ctx.strokeStyle = 'rgba(168,66,52,.9)'; ctx.lineWidth = W * s; ctx.stroke();
    for (let n = 0; n < 9; n++) {
      const off = (R() - 0.5) * W * 0.9, bright = R() < 0.55;
      ctx.setLineDash([(6 + R() * 22) * k * s, (0.8 + R() * 4) * k * s, (3 + R() * 12) * k * s, (0.5 + R() * 2.5) * k * s]);
      ctx.lineDashOffset = R() * 30 * k * s;
      path(off); ctx.strokeStyle = bright ? `rgba(255,${60 + R() * 30 | 0},${40 + R() * 20 | 0},${.55 + R() * .4})` : `rgba(${120 + R() * 40 | 0},48,38,${.4 + R() * .4})`;
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
  const P = SHEET_PAPER[paper], L = sheetLayout(P, square, per, paper === 'a4' ? Math.ceil(items.length / per) : 0);
  const avail = P.h - L.topY - L.m;
  // so viele Streifen wie passen, lückenlos untereinander, der Reihe nach gefüllt. Rest bleibt unten frei.
  const perPage = Math.max(1, Math.floor(avail / L.sh));
  const pages = Math.ceil(strips.length / perPage);
  const slices = []; for (let p = 0; p < pages; p++) slices.push(strips.slice(p * perPage, (p + 1) * perPage));
  const sgap = 0;
  const dates = d.frames.map(f => f.date).filter(Boolean).sort();
  const range = (r?.loadedAt || dates[0]) ? [U.fmtDate(String(r?.loadedAt || dates[0]).slice(0, 10)), U.fmtDate(String(r?.finishedAt || dates[dates.length - 1] || '').slice(0, 10))].filter(Boolean).join('–') : '';
  const info = {
    title: r?.title || U.stockLabel(st), film: U.stockLabel(st), edge: edgeStyle(st), square, per, sgap, pages, theme, rows: paper === 'a4' ? strips.length : 0,
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
  const previews = [];
  for (let p = 0; p < pages; p++) {
    drawSheetPage(ctx, P, s, info, slices[p], p);
    pctx.drawImage(c, 0, 0, pv.width, pv.height); previews.push(pv.toDataURL('image/jpeg', 0.82));
    if (p) doc.addPage(paper === 'a4' ? 'a4' : [P.w, P.h], paper === 'a4' ? 'portrait' : 'landscape');
    doc.addImage(c.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, P.w, P.h, undefined, 'FAST');
  }
  imgs.forEach(x => x.src && x.src.close && x.src.close());
  const name = `Contact Sheet ${(info.title || 'Rolle').replace(/[\\/:*?"<>|]+/g, ' ').trim()} ${paper.toUpperCase()}.pdf`;
  return { blob: doc.output('blob'), name, pages, previews, ratio: P.w / P.h };
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
    <div class="seggroup cstheme" role="group" aria-label="Bilder je Reihe"><button type="button" class="seg" data-r="6">6 je Reihe</button><button type="button" class="seg" data-r="4">4 je Reihe</button></div>
    <div class="seggroup cstheme" role="group" aria-label="Papier"><button type="button" class="seg" data-t="light">Hell</button><button type="button" class="seg" data-t="dark">Dunkel</button></div>
    <div class="seggroup cstheme csfav" role="group" aria-label="Favoriten" hidden><button type="button" class="seg" data-fm="wax"><span class="favdot" aria-hidden="true"></span>Kreis</button><button type="button" class="seg" data-fm="box">Kasten</button><button type="button" class="seg" data-fm="">Ohne</button></div>
    <p class="sub2 csstate" id="csState"></p>
    <div class="modalfoot"><button class="closex" id="csNo" aria-label="Abbrechen">${ART.x}</button><button class="cspvshare csgo" id="csGo" aria-label="Contact Sheet erstellen" disabled>${ART.check}</button></div></div>`;
  document.body.appendChild(ov);
  ov.querySelector('#csNo').onclick = () => ov.remove();
  const get = k => { try { return localStorage.getItem(k); } catch (_) { return null; } };
  const put = (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} };
  const sel = { p: get('kb-cs-paper'), t: get('kb-cs-theme'), r: get('kb-cs-per') };
  // Favoriten umkreisen: freiwillig, nur sichtbar, wenn die Rolle Fotos mit +5 hat
  let fm = get('kb-cs-fav') || '';
  albumData(rollId).then(d => { if (d && d.frames.some(f => f.rate === 5)) { ov.querySelector('.csfav').hidden = false; paint(); } });
  ov.querySelectorAll('[data-fm]').forEach(x => x.onclick = () => { fm = x.dataset.fm; put('kb-cs-fav', fm); paint(); });
  const go = ov.querySelector('#csGo'), stEl = ov.querySelector('#csState');
  const paint = () => {
    ov.querySelectorAll('[data-p]').forEach(x => x.classList.toggle('on', x.dataset.p === sel.p));
    ov.querySelectorAll('[data-t]').forEach(x => x.classList.toggle('on', x.dataset.t === sel.t));
    ov.querySelectorAll('[data-r]').forEach(x => x.classList.toggle('on', x.dataset.r === sel.r));
    ov.querySelectorAll('[data-fm]').forEach(x => x.classList.toggle('on', x.dataset.fm === fm));
    ov.querySelector('.csopts').dataset.t = sel.t || 'dark';
    go.disabled = !(sel.p && sel.t && sel.r);
  };
  [['p', 'kb-cs-paper'], ['t', 'kb-cs-theme'], ['r', 'kb-cs-per']].forEach(([k, key]) =>
    ov.querySelectorAll(`[data-${k}]`).forEach(x => x.onclick = () => { sel[k] = x.dataset[k]; put(key, sel[k]); stEl.textContent = ''; paint(); }));
  paint();
  go.onclick = async () => {
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
  const { blob, name, pages, previews, ratio } = res;
  const ov = document.createElement('div'); ov.className = 'cspv';
  ov.innerHTML = `<div class="cspvpages">${previews.map((u, i) => `<img src="${u}" alt="Seite ${i + 1} von ${pages}" style="aspect-ratio:${ratio}">`).join('')}</div>
    <div class="cspvfoot"><button class="closex" id="pvBack" aria-label="Zurück">${ART.x}</button>
    <span class="sub2">${pages} ${pages === 1 ? 'Seite' : 'Seiten'}</span>
    <button class="cspvshare" id="pvShare" aria-label="Teilen oder sichern">${SHARE_IC}</button></div>`;
  document.body.appendChild(ov);
  ov.querySelector('#pvBack').onclick = () => ov.remove();
  ov.querySelector('#pvShare').onclick = async e => {
    const btn = e.currentTarget; FEEL && FEEL.burst && FEEL.burst(btn);
    const file = new File([blob], name, { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: name }); ov.remove(); onDone && onDone(); return; }
      catch (err) { if (err && err.name === 'AbortError') return; }
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 30000);
    ov.remove(); onDone && onDone();
  };
}
