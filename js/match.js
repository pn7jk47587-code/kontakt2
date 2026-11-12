// v219: Scans den richtigen Beschreibungen zuordnen, in zwei Spalten.
// Links die Fotos, rechts die vorhandenen Beschreibungen. Jede Spalte scrollt für sich.
// Foto antippen, dann die Beschreibung (oder umgekehrt). Das Foto trägt danach die Nummer seiner Beschreibung,
// die Beschreibung zeigt das Foto klein. Hatte die Beschreibung schon ein anderes Foto, ist dieses danach ohne Zuordnung.

// Diese Felder gehören zum Scan selbst und wandern mit ihm
const MATCH_KEYS = ['imgId', 'rate', 'leak', 'people', 'title', 'info'];
const MATCH_IC = '<svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4" width="8" height="7" rx="1.5"/><path d="M14 6h7.5M14 9h5"/><rect x="2.5" y="14" width="8" height="7" rx="1.5"/><path d="M14 16h7.5M14 19h5"/><path d="M12 11.2 9.6 13.2M12 11.2l2.4 2"/></svg>';

// Hat das Bild eine Beschreibung, die man beim Zuordnen wiedererkennt?
const matchHasDesc = f => !!(f.note || f.aperture || f.shutter || f.lensId || f.place || f.phoneId || f.flash || f.double || (f.filterIds || []).length || f.dateSet);

async function openMatcher(roll, onDone) {
  const frames = await framesOf(roll.id);
  const lenses = new Map((await DB.all('lenses')).map(l => [l.id, l]));
  const bundle = f => { const o = {}; MATCH_KEYS.forEach(k => { if (f[k] !== undefined) o[k] = f[k]; }); return o; };
  const photos = frames.filter(f => f.imgId).map(f => ({ id: f.imgId, from: f.id, data: bundle(f) }));
  const descs = frames.filter(matchHasDesc);
  if (!photos.length) return;
  if (!descs.length) { U.toast('Zu diesen Bildern gibt es keine Beschreibungen'); return; }
  const descIds = new Set(descs.map(f => f.id));
  // link: Foto-ID → Frame-ID der Beschreibung (oder null)
  const link = new Map(photos.map(p => [p.id, descIds.has(p.from) ? p.from : null]));
  const start = new Map(link);
  // eigene Vorschau-URLs, damit sie nicht mit anderen Ansichten verfallen. Beim Schließen wieder freigeben.
  const own = [];
  const thumbUrl = async id => { const rec = await DB.get('images', id); const b = rec && U.recBlob(rec, true); if (!b) return ''; const u = URL.createObjectURL(b); own.push(u); return u; };
  const urls = new Map();
  await Promise.all(photos.map(async p => urls.set(p.id, await thumbUrl(p.id))));
  const phones = new Map();
  await Promise.all(descs.filter(f => f.phoneId).map(async f => phones.set(f.id, await thumbUrl(f.phoneId))));
  const close = () => { ov.remove(); setTimeout(() => own.forEach(u => URL.revokeObjectURL(u)), 1000); };
  const label = new Map(frames.map(f => [f.id, frameLabel(f)]));
  let selP = null, selD = null;

  const descHtml = f => {
    const l = lenses.get(f.lensId);
    const tech = [f.aperture ? 'f/' + String(f.aperture).replace('.', ',') : '', f.shutter || '', l ? (l.focal ? l.focal + ' mm' : lensLabel(l)) : '', f.flash ? 'Blitz' : '', f.double ? 'Doppelbelichtung' : ''].filter(Boolean).join(' · ');
    const where = [f.place || '', f.date ? U.fmtDate(String(f.date).slice(0, 10)) : ''].filter(Boolean).join(' · ');
    return `${tech ? `<span class="mtech">${U.esc(tech)}</span>` : ''}${f.note ? `<span class="mnote">${U.esc(f.note)}</span>` : ''}${where ? `<span class="mwhere">${U.esc(where)}</span>` : ''}`;
  };

  const ov = document.createElement('div'); ov.className = 'cspv matchov';
  ov.innerHTML = `<div class="mcols">
      <div class="mcol" id="mP"><div class="mhead">Fotos</div>${photos.map(p => `<button type="button" class="mph" data-p="${p.id}"><img src="${urls.get(p.id)}" alt="" draggable="false"><span class="mbadge"></span></button>`).join('')}</div>
      <div class="mcol" id="mD"><div class="mhead">Beschreibungen</div>${descs.map(f => `<button type="button" class="mds" data-d="${f.id}"><span class="mdtop"><span class="mnum">${label.get(f.id)}</span><span class="mthumb"></span>${phones.get(f.id) ? `<img class="mphone" src="${phones.get(f.id)}" alt="Handyfoto" draggable="false">` : ''}</span><span class="mdesc">${descHtml(f) || '<span class="mwhere">nur Handyfoto</span>'}</span></button>`).join('')}</div>
    </div>
    <div class="matchbar"><button type="button" class="btn ghost small" id="mClear">Alle lösen</button><span class="sub2" id="mHint"></span></div>
    <div class="cspvfoot"><button class="closex" id="mX" aria-label="Abbrechen">${ART.x}</button>
    <span class="sub2 mcount" id="mCount"></span>
    <button class="cspvshare" id="mOk" aria-label="Zuordnung speichern">${ART.check}</button></div>`;
  document.body.appendChild(ov);
  const $ = s => ov.querySelector(s);
  const photoOf = did => { for (const [p, d] of link) if (d === did) return p; return null; };

  const draw = () => {
    ov.querySelectorAll('.mph').forEach(b => {
      const d = link.get(b.dataset.p);
      b.classList.toggle('sel', selP === b.dataset.p);
      b.classList.toggle('free', !d);
      b.classList.toggle('changed', d !== start.get(b.dataset.p));
      b.querySelector('.mbadge').textContent = d ? label.get(d) : '?';
    });
    ov.querySelectorAll('.mds').forEach(b => {
      const p = photoOf(b.dataset.d), th = b.querySelector('.mthumb');
      b.classList.toggle('sel', selD === b.dataset.d || (selP && link.get(selP) === b.dataset.d));
      b.classList.toggle('free', !p);
      const want = p ? urls.get(p) : '';
      if (th.dataset.u !== want) { th.dataset.u = want; th.innerHTML = p ? `<img src="${want}" alt="" draggable="false">` : ''; }
    });
    ov.classList.toggle('picking', !!(selP || selD));
    const open = [...link.values()].filter(v => !v).length;
    $('#mHint').textContent = selP ? 'Jetzt die Beschreibung antippen' : selD ? 'Jetzt das Foto antippen' : open ? `${open} ${open === 1 ? 'Foto' : 'Fotos'} ohne Beschreibung` : 'Foto antippen, dann die Beschreibung';
    const n = [...link].filter(([p, d]) => d !== start.get(p)).length;
    $('#mCount').textContent = n ? `${n} geändert` : '';
  };
  const pair = (p, d) => {
    const old = photoOf(d);
    if (old && old !== p) link.set(old, null);
    link.set(p, d); selP = selD = null;
    U.haptic && U.haptic([10, 30, 10]); draw();
  };

  $('#mP').addEventListener('click', e => {
    const b = e.target.closest('.mph'); if (!b) return;
    const p = b.dataset.p;
    if (selD) return pair(p, selD);
    selP = selP === p ? null : p; U.haptic && U.haptic(8); draw();
    // die bisher verbundene Beschreibung ins Bild holen
    const d = selP && link.get(selP);
    if (d) ov.querySelector(`.mds[data-d="${d}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
  $('#mD').addEventListener('click', e => {
    const b = e.target.closest('.mds'); if (!b) return;
    const d = b.dataset.d;
    if (selP) return pair(selP, d);
    selD = selD === d ? null : d; U.haptic && U.haptic(8); draw();
    const p = selD && photoOf(selD);
    if (p) ov.querySelector(`.mph[data-p="${p}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
  $('#mClear').onclick = () => { link.forEach((_, k) => link.set(k, null)); selP = selD = null; draw(); };
  $('#mX').onclick = close;
  $('#mOk').onclick = async () => {
    // Zielplatz je Foto: die zugeordnete Beschreibung. Fotos ohne Beschreibung kommen auf Bilder ohne Beschreibung,
    // zuerst auf ihr bisheriges, sonst auf das nächste freie, sonst hinten an.
    const target = new Map();
    const taken = new Set([...link.values()].filter(Boolean));
    const spare = frames.filter(f => !descIds.has(f.id));
    let next = (frames[frames.length - 1]?.index || 0) + 1;
    for (const p of photos) { const d = link.get(p.id); if (d) target.set(p.id, d); }
    const rest = photos.filter(p => !target.has(p.id));
    for (const p of rest) if (!descIds.has(p.from) && !taken.has(p.from)) { target.set(p.id, p.from); taken.add(p.from); }
    for (const p of rest) {
      if (target.has(p.id)) continue;
      const f = spare.find(x => !taken.has(x.id));
      if (f) { target.set(p.id, f.id); taken.add(f.id); continue; }
      const nf = { id: U.uid(), rollId: roll.id, index: next++ }; await DB.put('frames', nf); target.set(p.id, nf.id); taken.add(nf.id);
    }
    let n = 0;
    const byFrame = new Map([...target].map(([p, fid]) => [fid, p]));
    for (const f of await framesOf(roll.id)) {
      const p = byFrame.get(f.id), had = f.imgId || null;
      if ((p || null) === had) continue;
      MATCH_KEYS.forEach(k => delete f[k]);
      if (p) { Object.assign(f, photos.find(x => x.id === p).data); f.shot = true; }
      await DB.put('frames', f); n++;
    }
    const maxIdx = Math.max(...(await framesOf(roll.id)).map(f => f.index));
    if (maxIdx > (roll.exposures || 0)) { roll.exposures = maxIdx; await DB.put('rolls', roll); }
    close();
    if (n) { U.toast(n === 1 ? '1 Bild neu zugeordnet' : `${n} Bilder neu zugeordnet`); U.haptic && U.haptic([12, 40, 12]); }
    onDone && onDone();
  };
  window.addEventListener('hashchange', close, { once: true });
  draw();
}
