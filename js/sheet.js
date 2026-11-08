/* Contact Sheet als PDF (Entwurf A, dunkel): Filmstreifen mit echtem Filmnamen am Rand und Bildnummern.
   A4 hoch: alle Bilder auf einer Seite. A5 quer: dieselben Streifen auf mehrere Seiten verteilt.
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

// Ein Blatt zeichnen. s = Skalierung Punkt → Pixel
function drawSheetPage(ctx, P, s, info, strips, page) {
  const W = P.w, H = P.h, m = 22;
  ctx.fillStyle = '#0d0d0f'; ctx.fillRect(0, 0, W * s, H * s);
  const sans = '-apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif', mono = '"Courier New", Courier, monospace';
  const T = (txt, x, y, size, color, font = sans, weight = '400', align = 'left') => { ctx.font = `${weight} ${size * s}px ${font}`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillText(txt, x * s, y * s); };
  // Kopf
  const big = P.h > P.w ? 19 : 15;
  T(info.title, m, m + big, big, '#f1eee8', '"Unbounded", ' + sans, '600');
  T(info.sub, m, m + big + 13, 7.5, '#a8a39a');
  T(info.count, W - m, m + big - 6, 7.5, '#a8a39a', mono, '400', 'right');
  T('lightleak', W - m, m + big + 6, 7.5, '#e9a24a', mono, '700', 'right');
  if (info.pages > 1) T(`Seite ${page + 1} von ${info.pages}`, W - m, m + big + 13 + 1, 6.5, '#a8a39a', mono, '400', 'right');
  const topY = m + big + 24;
  ctx.fillStyle = '#3a3833'; ctx.fillRect(m * s, (topY - 6) * s, (W - 2 * m) * s, 0.6 * s);
  // Streifen
  const per = info.per, gap = info.square ? 6 : 4, edge = 12, pad = 6;
  const fw = (W - 2 * m - 2 * pad - (per - 1) * gap) / per, fh = info.square ? fw : fw * 2 / 3;
  const sh = fh + 2 * edge, sgap = info.sgap;
  strips.forEach((strip, k) => {
    const y = topY + k * (sh + sgap);
    ctx.fillStyle = '#040404'; ctx.fillRect(m * s, y * s, (W - 2 * m) * s, sh * s);
    ctx.strokeStyle = '#26241f'; ctx.lineWidth = 0.6 * s; ctx.strokeRect(m * s, y * s, (W - 2 * m) * s, sh * s);
    // Randbeschriftung oben: echter Filmname
    const name = info.film.toUpperCase();
    T(name, m + pad, y + edge - 3.6, 5.6, '#e9a24a', mono, '700');
    T(name, W / 2, y + edge - 3.6, 5.6, '#e9a24a', mono, '700', 'center');
    T(name, W - m - pad, y + edge - 3.6, 5.6, '#e9a24a', mono, '700', 'right');
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
      // Bildnummer unten am Rand
      T(String(it.n), x + 1, y + edge + fh + 8.2, 6, '#e9a24a', mono, '700');
    });
  });
}

async function makeContactSheet(rollId, paper) {
  await loadJsPdf();
  const d = await albumData(rollId);
  if (!d.frames.length) throw new Error('Keine Fotos im Album');
  const r = d.roll, st = d.stocks.get(r?.stockId), cam = d.cams.get(r?.cameraId);
  const square = r?.format === '120' || /6x6|120/.test(String(st?.format || r?.format || ''));
  const per = square ? 4 : 6;
  const imgs = await sheetImages(d.frames);
  const items = imgs.map(x => ({ ...x, n: frameLabel(x.f) }));
  const strips = []; for (let i = 0; i < items.length; i += per) strips.push(items.slice(i, i + per));
  const P = SHEET_PAPER[paper];
  // Wie viele Streifen passen auf eine Seite?
  const m = 22, big = P.h > P.w ? 19 : 15, topY = m + big + 24, gap = square ? 6 : 4, pad = 6;
  const fw = (P.w - 2 * m - 2 * pad - (per - 1) * gap) / per, sh = (square ? fw : fw * 2 / 3) + 24;
  const avail = P.h - topY - 10;
  let perPage = Math.max(1, Math.floor((avail + 6) / (sh + 6)));
  const pages = Math.ceil(strips.length / perPage);
  // gleichmäßig verteilen: z. B. 7 Streifen auf 3 Seiten als 3, 2, 2
  const base = Math.floor(strips.length / pages), extra = strips.length % pages;
  const slices = []; let at = 0; for (let p = 0; p < pages; p++) { const n = base + (p < extra ? 1 : 0); slices.push(strips.slice(at, at + n)); at += n; }
  perPage = Math.max(...slices.map(x => x.length));
  const sgap = Math.min(26, Math.max(4, (avail - perPage * sh) / Math.max(1, perPage - 1)));
  const dates = d.frames.map(f => f.date).filter(Boolean).sort();
  const range = (r?.loadedAt || dates[0]) ? [U.fmtDate(String(r?.loadedAt || dates[0]).slice(0, 10)), U.fmtDate(String(r?.finishedAt || dates[dates.length - 1] || '').slice(0, 10))].filter(Boolean).join('–') : '';
  const info = {
    title: r?.title || U.stockLabel(st), film: U.stockLabel(st), square, per, sgap, pages,
    sub: [U.stockLabel(st), r?.ei ? 'EI ' + r.ei : '', camLabel(cam) || r?.camera || '', range].filter(Boolean).join(' · '),
    count: `${d.frames.length} Bilder`
  };
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: paper === 'a4' ? 'a4' : [P.w, P.h], orientation: paper === 'a4' ? 'portrait' : 'landscape', compress: true });
  const s = 300 / 72;   // 300 dpi
  const c = document.createElement('canvas'); c.width = Math.round(P.w * s); c.height = Math.round(P.h * s);
  const ctx = c.getContext('2d'); ctx.imageSmoothingQuality = 'high';
  try { await document.fonts.load(`600 ${19 * s}px Unbounded`); } catch (_) {}
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
      <button type="button" class="csopt" data-p="a5"><span class="cspage a5"><i></i><i></i><i></i><i></i></span><b>A5 quer</b><span class="sub2">auf mehrere Seiten verteilt</span></button>
    </div>
    <p class="sub2 csstate" id="csState"></p>
    <div class="modalfoot"><button class="closex" id="csNo" aria-label="Abbrechen">${ART.x}</button><span></span></div></div>`;
  document.body.appendChild(ov);
  ov.querySelector('#csNo').onclick = () => ov.remove();
  ov.querySelectorAll('[data-p]').forEach(b => b.onclick = async () => {
    ov.querySelectorAll('[data-p]').forEach(x => x.disabled = true);
    const stEl = ov.querySelector('#csState'); stEl.textContent = 'PDF wird erstellt …';
    try {
      const { blob, name, pages } = await makeContactSheet(rollId, b.dataset.p);
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
