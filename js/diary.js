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
const diaryHas = d => !!(d && ((d.notes || '').trim() || (d.photos || []).length || d.rate != null));
// v220: Kurzzeile unter dem Filmnamen, mit Bewertung auf der Lichtpunkte-Skala
const diarySub = d => { const n = (d.photos || []).length; return [d.rate != null ? fmtRate(d.rate) : '', n ? `${n} ${n === 1 ? 'Foto' : 'Fotos'}` : '', (d.notes || '').trim() ? 'mit Notizen' : ''].filter(Boolean).join(' · '); };

// Zurück geht jetzt über den Pfeil oben links in der Kopfzeile
function diaryBackBtn() {}

/* Übersicht: alle Filme mit Tagebuch */
async function viewDiaryList() {
  setHeader('Filmtagebuch', {});
  const stocks = new Map((await DB.all('stocks')).map(s => [s.id, s]));
  const list = (await allDiaries()).filter(diaryHas).sort((a, b) => U.stockLabel(stocks.get(a.stockId)).localeCompare(U.stockLabel(stocks.get(b.stockId))));
  const rows = await Promise.all(list.map(async d => {
    const st = stocks.get(d.stockId);
    const n = (d.photos || []).length;
    return `<a class="item diaryrow" href="#/tagebuch/${d.stockId}"><span class="stockart">${await filmArt(st, 44)}</span>
      <span><b>${U.esc(U.stockLabel(st) || 'Unbekannter Film')}</b><br><span class="sub2">${diarySub(d)}</span></span><span class="chev">›</span></a>`;
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
  setHeader(U.stockLabel(stock), { action: diaryHas(d) ? `<button class="trashbtn" id="dDel" aria-label="Tagebucheintrag löschen" title="Tagebucheintrag löschen">${TRASH_BTN('').match(/<svg[\s\S]*<\/svg>/)[0]}</button>` : '' });
  const save = () => DB.put('meta', d);
  // Ganzen Eintrag löschen (Notizen und Fotos), mit Rückgängig
  document.getElementById('dDel')?.addEventListener('click', async () => {
    const before = JSON.parse(JSON.stringify(d));
    await DB.del('meta', d.id); location.hash = '#/tagebuch';
    U.undo('Tagebucheintrag gelöscht', async () => { await DB.put('meta', before); location.hash = '#/tagebuch/' + stockId; }, async () => { for (const p of before.photos || []) if (!p.ref) await deleteImage(p.imgId); });
  });
  const thumbs = {};
  for (const p of d.photos) thumbs[p.imgId] = await U.imgUrl(p.imgId, true);
  const gone = d.photos.filter(p => p.ref && !thumbs[p.imgId]);
  if (gone.length) { d.photos = d.photos.filter(p => !gone.includes(p)); await save(); }
  const card = ([k, label]) => {
    const ps = d.photos.filter(p => p.tag === k);
    return `<section class="card diarytag" data-tag="${k}">
      <div class="dthead"><h3>${label}</h3><button type="button" class="fridgeplus dtadd" data-add="${k}" aria-label="Foto auswählen: ${label}">+</button></div>
      ${ps.length ? `<div class="dtgrid">${ps.map(p => `<span class="dtph"><img src="${thumbs[p.imgId] || ''}" alt="" data-img="${p.imgId}"><button type="button" class="dtdel" data-del="${p.imgId}" aria-label="Foto entfernen">×</button></span>`).join('')}</div>` : '<p class="hint dtempty">Noch kein Foto.</p>'}
    </section>`;
  };
  view.innerHTML = `
    <div class="diaryhead"><span class="stockart">${await filmArt(stock, 56)}</span><div><b>${U.esc(U.stockLabel(stock))}</b><br><span class="sub2">ISO ${U.esc(stock.isoLabel || stock.boxIso || '?')}</span></div></div>
    <div class="card"><div class="titlefld raterow"><span>Bewertung</span>${rateHtml(d.rate ?? null, 'dRate')}</div>
      <label class="fld"><span>Deine Erfahrungen</span><textarea id="dNotes" rows="5">${U.esc(d.notes || '')}</textarea></label></div>
    <p class="hint pad">Wähle für jede Lichtsituation Fotos aus deinen Rollen mit diesem Film.</p>
    <div class="diarytags">${DIARY_TAGS.map(card).join('')}</div>`;
  let tmr = null;
  wireRate(view, 'dRate', () => d.rate ?? null, async v => { if (v == null) delete d.rate; else d.rate = v; d.notes = view.querySelector('#dNotes').value; await save(); });
  view.querySelector('#dNotes').addEventListener('input', e => { d.notes = e.target.value; clearTimeout(tmr); tmr = setTimeout(save, 400); });
  view.addEventListener('click', async e => {
    const add = e.target.closest('[data-add]');
    if (add) {
      const tag = add.dataset.add;
      clearTimeout(tmr); d.notes = view.querySelector('#dNotes').value;
      openDiaryPicker(stockId, d.photos.filter(p => p.tag === tag).map(p => p.imgId), async ids => {
        // v222: nur verknüpfen, kein zweites Bild. Abgewählte verknüpfte Fotos fallen aus dieser Lichtsituation heraus.
        d.photos = d.photos.filter(p => p.tag !== tag || !p.ref || ids.includes(p.imgId));
        const have = new Set(d.photos.filter(p => p.tag === tag).map(p => p.imgId));
        ids.filter(id => !have.has(id)).forEach(id => d.photos.push({ imgId: id, tag, ref: true, at: new Date().toISOString() }));
        await save(); route();
      });
      return;
    }
    const del = e.target.closest('[data-del]');
    if (del) {
      const before = [...d.photos], id = del.dataset.del;
      d.photos = d.photos.filter(p => p.imgId !== id); await save(); route();
      const ref = before.find(p => p.imgId === id)?.ref;
      U.undo('Foto entfernt', async () => { d.photos = before; await save(); route(); }, () => { if (!ref) return deleteImage(id); });
      return;
    }
    const img = e.target.closest('img[data-img]');
    if (img) zoom(await U.imgUrl(img.dataset.img) || img.src);
  });
  diaryBackBtn('#/profil', 'Zurück zum Profil');
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
    ${d.rate != null ? `<p class="sub2">Bewertung ${fmtRate(d.rate)}</p>` : ''}
    ${(d.notes || '').trim() ? `<p class="dnotes">${U.esc(d.notes).replace(/\n/g, '<br>')}</p>` : ''}
    ${groups.map(([label, ps]) => `<div class="dgroup"><span class="sub2">${label}</span><div class="dtgrid small">${ps.map(p => `<img src="${th[p.imgId] || ''}" alt="" data-img="${p.imgId}">`).join('')}</div></div>`).join('')}
    ${diaryHas(d) ? '' : '<p class="hint">Noch nichts notiert.</p>'}
    <a class="btn ghost small" href="#/tagebuch/${stock.id}">${diaryHas(d) ? 'Im Filmtagebuch öffnen' : 'Im Filmtagebuch anlegen'}</a>
  </section>`;
}

/* Karte im Profil nach dem Kameraschrank: alle Filme mit Tagebuch, Plus legt einen neuen Eintrag an */
async function diaryFoldHtml() {
  const stocks = new Map((await DB.all('stocks')).map(s => [s.id, s]));
  const list = (await allDiaries()).filter(diaryHas).sort((a, b) => U.stockLabel(stocks.get(a.stockId)).localeCompare(U.stockLabel(stocks.get(b.stockId))));
  const rows = await Promise.all(list.map(async d => {
    const st = stocks.get(d.stockId), n = (d.photos || []).length;
    return `<a class="crow diaryrow" href="#/tagebuch/${d.stockId}"><span class="frowart">${await filmArt(st, 42)}</span>
      <span class="frowmain"><span class="frowname">${U.esc(U.stockLabel(st) || 'Unbekannter Film')}</span><span class="frowsub">${diarySub(d)}</span></span><span class="chev">›</span></a>`;
  }));
  return `
    <section class="diaryfold fold${foldOpen('diary') ? ' open' : ''}" data-fold="diary">
      <div class="fridgetop foldhead">
        <span class="fridgeicon diaryicon">${ART.diary}</span>
        <div><h2>Filmtagebuch</h2><span class="sub2">${list.length ? `${list.length} ${list.length === 1 ? 'Film' : 'Filme'}` : 'Noch leer'}</span></div>
        <button class="fridgeplus" id="addDiary" aria-label="Film zum Tagebuch hinzufügen">+</button>
        <span class="foldchev" aria-hidden="true"></span>
      </div>
      <div class="foldbody">
        <p class="hint" style="margin:0 2px 10px">Wie verhält sich ein Film bei dir? Notizen und Beispielfotos nach Lichtsituation.</p>
        <div class="flist">${rows.length ? rows.join('') : '<p class="hint">Lege mit dem Plus den ersten Film an.</p>'}</div>
      </div>
    </section>`;
}
function setupDiaryFold(root) {
  root.querySelector('#addDiary')?.addEventListener('click', () => openStockPicker(id => { location.hash = '#/tagebuch/' + id; }));
}

/* v222: Fotos aus den eigenen Rollen mit diesem Film auswählen. Das Tagebuch speichert nur einen Verweis (ref) auf das Bild. */
async function openDiaryPicker(stockId, chosenIds, onDone) {
  const rolls = (await DB.all('rolls')).filter(r => r.stockId === stockId).sort((a, b) => String(b.loadedAt || '').localeCompare(String(a.loadedAt || '')));
  const groups = [];
  for (const r of rolls) { const fs = (await framesOf(r.id)).filter(f => f.imgId); if (fs.length) groups.push([r, fs]); }
  if (!groups.length) { U.toast('Noch keine Fotos mit diesem Film'); return; }
  const chosen = new Set(chosenIds), own = [], urls = new Map();
  await Promise.all(groups.flatMap(([, fs]) => fs).map(async f => { const rec = await DB.get('images', f.imgId); const b = rec && U.recBlob(rec, true); if (b) { const u = URL.createObjectURL(b); own.push(u); urls.set(f.imgId, u); } }));
  const ov = document.createElement('div'); ov.className = 'cspv storypick diarypick';
  ov.innerHTML = `<div class="spgrid">${groups.map(([r, fs]) => `<div class="sproll">${U.esc(r.title || U.fmtDate(String(r.loadedAt || '').slice(0, 10)) || 'Rolle')}</div>${fs.filter(f => urls.has(f.imgId)).map(f => `<button type="button" class="spph" data-i="${f.imgId}"><img src="${urls.get(f.imgId)}" alt="" draggable="false"><span class="spnum">${U.esc(String(frameLabel(f)))}</span><span class="spck" aria-hidden="true">${ART.check}</span></button>`).join('')}`).join('')}</div>
    <div class="cspvfoot"><button class="closex" id="dpX" aria-label="Abbrechen">${ART.x}</button>
    <span class="sub2 mcount" id="dpN"></span>
    <button class="cspvshare" id="dpOk" aria-label="Übernehmen">${ART.check}</button></div>`;
  document.body.appendChild(ov);
  const close = () => { ov.remove(); setTimeout(() => own.forEach(u => URL.revokeObjectURL(u)), 1000); };
  const draw = () => {
    ov.querySelectorAll('.spph').forEach(b => b.classList.toggle('on', chosen.has(b.dataset.i)));
    ov.querySelector('#dpN').textContent = chosen.size ? `${chosen.size} gewählt` : '';
  };
  ov.querySelector('.spgrid').addEventListener('click', e => {
    const b = e.target.closest('.spph'); if (!b) return;
    const id = b.dataset.i; chosen.has(id) ? chosen.delete(id) : chosen.add(id);
    U.haptic && U.haptic(8); draw();
  });
  ov.querySelector('#dpX').onclick = close;
  ov.querySelector('#dpOk').onclick = async () => { await onDone([...chosen]); close(); };
  window.addEventListener('hashchange', close, { once: true });
  draw();
}
