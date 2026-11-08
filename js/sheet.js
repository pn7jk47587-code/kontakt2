/* Contact Sheet als PDF, hell oder dunkel: Filmstreifen mit echtem Filmnamen am Rand und Bildnummern.
   A4 hoch: alle Bilder auf einer Seite. A5 quer: höchstens 3 Streifen zu je 6 Bildern pro Seite.
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
function sheetLayout(P, square, per) {
  const m = 16, pad = 5, gap = square ? 6 : 4, edge = 12;
  const fw = (P.w - 2 * m - 2 * pad - (per - 1) * gap) / per, fh = square ? fw : fw * 2 / 3;
  return { m, pad, gap, edge, fw, fh, sh: fh + 2 * edge, topY: m + 15 };
}

// Ein Blatt zeichnen. s = Skalierung Punkt → Pixel
function drawSheetPage(ctx, P, s, info, strips, page) {
  const W = P.w, H = P.h, th = SHEET_THEME[info.theme] || SHEET_THEME.dark;
  const L = sheetLayout(P, info.square, info.per), m = L.m;
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
    const sw = strip.length < info.per ? 2 * pad + strip.length * fw + (strip.length - 1) * gap + 6 : W - 2 * m;   // Reststück kürzer, wie abgeschnitten
    ctx.fillStyle = '#060606'; ctx.fillRect(m * s, y * s, sw * s, sh * s);
    // oberer Rand: Filmname in Abständen wiederholt
    const name = info.film.toUpperCase(), ty = y + edge - 4.2;
    for (let i = 0; i < strip.length; i += 2) E(name, m + pad + i * (fw + gap) + fw * 0.25, ty, 3.4);
    strip.forEach((it, i) => {
      const x = m + pad + i * (fw + gap), fy = y + edge;
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
}

async function makeContactSheet(rollId, paper, theme = 'dark') {
  await loadJsPdf();
  const d = await albumData(rollId);
  if (!d.frames.length) throw new Error('Keine Fotos im Album');
  const r = d.roll, st = d.stocks.get(r?.stockId), cam = d.cams.get(r?.cameraId);
  const square = r?.format === '120' || /6x6|120/.test(String(st?.format || r?.format || ''));
  const per = square ? 4 : 6;
  const imgs = await sheetImages(d.frames);
  const items = imgs.map(x => ({ ...x, n: frameLabel(x.f) }));
  const strips = []; for (let i = 0; i < items.length; i += per) strips.push(items.slice(i, i + per));
  const P = SHEET_PAPER[paper], L = sheetLayout(P, square, per);
  const avail = P.h - L.topY - L.m;
  // A4: alles auf eine Seite. A5: höchstens 3 Streifen je Seite, der Reihe nach gefüllt (36 Bilder auf 2, 37 auf 3 Seiten)
  const fit = Math.max(1, Math.floor((avail + 8) / (L.sh + 8)));
  const perPage = paper === 'a5' ? Math.min(3, fit) : fit;
  const pages = Math.ceil(strips.length / perPage);
  const slices = []; for (let p = 0; p < pages; p++) slices.push(strips.slice(p * perPage, (p + 1) * perPage));
  const rows = Math.min(perPage, strips.length);
  const sgap = Math.min(paper === 'a5' ? 14 : 18, Math.max(6, (avail - rows * L.sh) / Math.max(1, rows - 1)));
  const dates = d.frames.map(f => f.date).filter(Boolean).sort();
  const range = (r?.loadedAt || dates[0]) ? [U.fmtDate(String(r?.loadedAt || dates[0]).slice(0, 10)), U.fmtDate(String(r?.finishedAt || dates[dates.length - 1] || '').slice(0, 10))].filter(Boolean).join('–') : '';
  const info = {
    title: r?.title || U.stockLabel(st), film: U.stockLabel(st), edge: edgeStyle(st), square, per, sgap, pages, theme,
    sub: [U.stockLabel(st), r?.ei ? 'EI ' + r.ei : '', camLabel(cam) || r?.camera || '', range].filter(Boolean).join(' · '),
    count: `${d.frames.length} Bilder`
  };
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: paper === 'a4' ? 'a4' : [P.w, P.h], orientation: paper === 'a4' ? 'portrait' : 'landscape', compress: true });
  const s = 300 / 72;   // 300 dpi
  const c = document.createElement('canvas'); c.width = Math.round(P.w * s); c.height = Math.round(P.h * s);
  const ctx = c.getContext('2d'); ctx.imageSmoothingQuality = 'high';
  await loadEdgeFont();
  for (let p = 0; p < pages; p++) {
    drawSheetPage(ctx, P, s, info, slices[p], p);
    if (p) doc.addPage(paper === 'a4' ? 'a4' : [P.w, P.h], paper === 'a4' ? 'portrait' : 'landscape');
    doc.addImage(c.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, P.w, P.h, undefined, 'FAST');
  }
  imgs.forEach(x => x.src && x.src.close && x.src.close());
  const name = `Contact Sheet ${(info.title || 'Rolle').replace(/[\\/:*?"<>|]+/g, ' ').trim()} ${paper.toUpperCase()}.pdf`;
  return { blob: doc.output('blob'), name, pages };
}

// Auswahl A4 oder A5 quer, dann PDF teilen oder herunterladen
function openContactSheet(rollId) {
  const ov = document.createElement('div'); ov.className = 'modalbg';
  ov.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="Contact Sheet als PDF">
    <div class="csopts">
      <button type="button" class="csopt" data-p="a4"><span class="cspage a4"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span><b>A4 hoch</b><span class="sub2">alle Bilder auf einer Seite</span></button>
      <button type="button" class="csopt" data-p="a5"><span class="cspage a5"><i></i><i></i><i></i><i></i></span><b>A5 quer</b><span class="sub2">3 Streifen je Seite</span></button>
    </div>
    <div class="seggroup cstheme" role="group" aria-label="Papier"><button type="button" class="seg" data-t="light">Hell</button><button type="button" class="seg" data-t="dark">Dunkel</button></div>
    <p class="sub2 csstate" id="csState"></p>
    <div class="modalfoot"><button class="closex" id="csNo" aria-label="Abbrechen">${ART.x}</button><span></span></div></div>`;
  document.body.appendChild(ov);
  ov.querySelector('#csNo').onclick = () => ov.remove();
  let theme = 'dark'; try { theme = localStorage.getItem('kb-cs-theme') || 'dark'; } catch (_) {}
  const setTheme = t => { theme = t; ov.querySelector('.csopts').dataset.t = t; ov.querySelectorAll('[data-t]').forEach(x => x.classList.toggle('on', x.dataset.t === t)); try { localStorage.setItem('kb-cs-theme', t); } catch (_) {} };
  ov.querySelectorAll('[data-t]').forEach(x => x.onclick = () => setTheme(x.dataset.t)); setTheme(theme);
  ov.querySelectorAll('[data-p]').forEach(b => b.onclick = async () => {
    ov.querySelectorAll('[data-p]').forEach(x => x.disabled = true);
    const stEl = ov.querySelector('#csState'); stEl.textContent = 'PDF wird erstellt …';
    try {
      const { blob, name, pages } = await makeContactSheet(rollId, b.dataset.p, theme);
      const file = new File([blob], name, { type: 'application/pdf' });
      ov.remove();
      FEEL && FEEL.burst && FEEL.burst(b);
      if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: name }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 30000);
      U.toast(`Contact Sheet fertig (${pages} ${pages === 1 ? 'Seite' : 'Seiten'})`);
    } catch (e) { stEl.textContent = e.message || 'PDF konnte nicht erstellt werden'; ov.querySelectorAll('[data-p]').forEach(x => x.disabled = false); }
  });
}
