/* Filmtagebuch: eigene Erfahrungen je Film, mit Notizen und Beispielfotos nach Lichtsituation.
   Gespeichert in „meta“ unter der Kennung diary:<Film-ID>, damit keine neue Datenbank-Tabelle nötig ist. */
const DIARY_TAGS = [
  ['box', 'Box Speed'], ['unter', 'Unterbelichtet'], ['ueber', 'Überbelichtet'], ['tag', 'Tageslicht'],
  ['innen', 'Innen'], ['kunst', 'Kunstlicht'], ['blitz', 'Blitz'], ['nacht', 'Nacht']
];
const DIARY_BACK = '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M19 12H6M11.5 6 5.5 12l6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const diaryKey = stockId => 'diary:' + stockId;
async function getDiary(stockId) { return (await DB.get('meta', diaryKey(stockId))) || { id: diaryKey(stockId), stockId, notes: '', photos: [] }; }
async function allDiaries() { return (await DB.all('meta')).filter(m => String(m.id).startsWith('diary:')); }
const diaryHas = d => !!(d && ((d.notes || '').trim() || (d.photos || []).length));

function diaryBackBtn(hash, label) {
  const b = document.createElement('button');
  b.className = 'donebtn'; b.setAttribute('aria-label', label); b.innerHTML = DIARY_BACK;
  document.body.appendChild(b);
  b.addEventListener('click', () => { location.hash = hash; });
}

/* Übersicht: alle Filme mit Tagebuch */
async function viewDiaryList() {
  setHeader('Filmtagebuch', {});
  const stocks = new Map((await DB.all('stocks')).map(s => [s.id, s]));
  const list = (await allDiaries()).filter(diaryHas).sort((a, b) => U.stockLabel(stocks.get(a.stockId)).localeCompare(U.stockLabel(stocks.get(b.stockId))));
  const rows = await Promise.all(list.map(async d => {
    const st = stocks.get(d.stockId);
    const n = (d.photos || []).length;
    return `<a class="item diaryrow" href="#/tagebuch/${d.stockId}"><span class="stockart">${await filmArt(st, 44)}</span>
      <span><b>${U.esc(U.stockLabel(st) || 'Unbekannter Film')}</b><br><span class="sub2">${n} ${n === 1 ? 'Foto' : 'Fotos'}${(d.notes || '').trim() ? ' · mit Notizen' : ''}</span></span><span class="chev">›</span></a>`;
  }));
  view.innerHTML = `
    <p class="hint pad">Halte fest, wie sich ein Film bei dir verhält: Notizen und Beispielfotos nach Lichtsituation. Liegt der Film in der Kamera, siehst du das im Reiter „Rolle“.</p>
    <button type="button" class="newfilm small" id="diaryNew"><span class="plusbox">+</span><span><b>Film zum Tagebuch hinzufügen</b><span class="sub2"></span></span></button>
    ${rows.length ? `<div class="list">${rows.join('')}</div>` : '<p class="hint pad">Noch keine Einträge.</p>'}`;
  view.querySelector('#diaryNew').addEventListener('click', () => openStockPicker(id => { location.hash = '#/tagebuch/' + id; }));
  diaryBackBtn('#/profil', 'Zurück zum Profil');
}

/* Ein Film: Notizen und Fotos nach Lichtsituation */
async function viewDiary(stockId) {
  const stock = await DB.get('stocks', stockId);
  if (!stock) { location.replace('#/tagebuch'); return; }
  const d = await getDiary(stockId);
  d.photos = d.photos || [];
  setHeader(U.stockLabel(stock), {});
  const save = () => DB.put('meta', d);
  const thumbs = {};
  for (const p of d.photos) thumbs[p.imgId] = await U.imgUrl(p.imgId, true);
  const card = ([k, label]) => {
    const ps = d.photos.filter(p => p.tag === k);
    return `<section class="card diarytag" data-tag="${k}">
      <div class="dthead"><h3>${label}</h3><label class="fridgeplus dtadd" aria-label="Foto hinzufügen: ${label}">+<input type="file" accept="image/*" multiple hidden data-tag="${k}"></label></div>
      ${ps.length ? `<div class="dtgrid">${ps.map(p => `<span class="dtph"><img src="${thumbs[p.imgId] || ''}" alt="" data-img="${p.imgId}"><button type="button" class="dtdel" data-del="${p.imgId}" aria-label="Foto entfernen">×</button></span>`).join('')}</div>` : '<p class="hint dtempty">Noch kein Foto. Wie sieht der Film hier aus?</p>'}
    </section>`;
  };
  view.innerHTML = `
    <div class="diaryhead"><span class="stockart">${await filmArt(stock, 56)}</span><div><b>${U.esc(U.stockLabel(stock))}</b><br><span class="sub2">ISO ${U.esc(stock.isoLabel || stock.boxIso || '?')}</span></div></div>
    <div class="card"><label class="fld"><span>Deine Erfahrungen</span><textarea id="dNotes" rows="5" placeholder="Wie verhält sich der Film? Welche ISO, welches Licht, welches Labor?">${U.esc(d.notes || '')}</textarea></label></div>
    <p class="hint pad">Lade für jede Lichtsituation Fotos hoch, die du mit diesem Film gemacht hast.</p>
    ${DIARY_TAGS.map(card).join('')}`;
  let tmr = null;
  view.querySelector('#dNotes').addEventListener('input', e => { d.notes = e.target.value; clearTimeout(tmr); tmr = setTimeout(save, 400); });
  view.addEventListener('change', async e => {
    const inp = e.target.closest('input[type=file][data-tag]'); if (!inp) return;
    const files = [...inp.files]; if (!files.length) return;
    U.toast(files.length === 1 ? 'Foto wird gespeichert …' : `${files.length} Fotos werden gespeichert …`);
    for (const f of files) {
      try { const rec = await U.storeImage(f, 'diary'); d.photos.push({ imgId: rec.id, tag: inp.dataset.tag, at: new Date().toISOString() }); }
      catch (err) { U.toast('Bild konnte nicht gelesen werden'); }
    }
    clearTimeout(tmr); d.notes = view.querySelector('#dNotes').value;
    await save(); U.toast('Im Filmtagebuch gespeichert'); route();
  });
  view.addEventListener('click', async e => {
    const del = e.target.closest('[data-del]');
    if (del) { d.photos = d.photos.filter(p => p.imgId !== del.dataset.del); await deleteImage(del.dataset.del); await save(); route(); return; }
    const img = e.target.closest('img[data-img]');
    if (img) zoom(await U.imgUrl(img.dataset.img) || img.src);
  });
  diaryBackBtn('#/tagebuch', 'Zurück zum Filmtagebuch');
}

/* Karte im Reiter „Rolle“: deine Erfahrungen mit diesem Film */
async function diaryCardHtml(stock) {
  if (!stock) return '';
  const d = await getDiary(stock.id);
  const photos = d.photos || [];
  const groups = DIARY_TAGS.map(([k, label]) => [label, photos.filter(p => p.tag === k)]).filter(([, ps]) => ps.length);
  const th = {};
  for (const p of photos) th[p.imgId] = await U.imgUrl(p.imgId, true);
  return `<section class="diarycard">
    <h3>Deine Erfahrungen mit ${U.esc(U.stockLabel(stock))}</h3>
    ${(d.notes || '').trim() ? `<p class="dnotes">${U.esc(d.notes).replace(/\n/g, '<br>')}</p>` : ''}
    ${groups.map(([label, ps]) => `<div class="dgroup"><span class="sub2">${label}</span><div class="dtgrid small">${ps.map(p => `<img src="${th[p.imgId] || ''}" alt="" data-img="${p.imgId}">`).join('')}</div></div>`).join('')}
    ${diaryHas(d) ? '' : '<p class="hint">Noch nichts notiert.</p>'}
    <a class="btn ghost small" href="#/tagebuch/${stock.id}">${diaryHas(d) ? 'Im Filmtagebuch öffnen' : 'Im Filmtagebuch anlegen'}</a>
  </section>`;
}
