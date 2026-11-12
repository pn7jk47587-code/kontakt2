// v218: Scans den richtigen Beschreibungen zuordnen.
// Die Beschreibungen (Nummer, Blende, Zeit, Objektiv, Notiz, Ort, Handyfoto) bleiben stehen, nur die Scans wandern.
// Bedienung: Scan antippen, dann die Zeile, zu der er gehört. Ist dort schon ein Scan, tauschen beide den Platz.
// Für verrutschte Reihen schiebt „ab hier“ den ganzen zusammenhängenden Block um eine Zeile.

// Diese Felder gehören zum Scan selbst und wandern mit ihm
const MATCH_KEYS = ['imgId', 'rate', 'leak', 'people', 'title', 'info'];
const MATCH_IC = '<svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4" width="8" height="7" rx="1.5"/><path d="M14 6h7.5M14 9h5"/><rect x="2.5" y="14" width="8" height="7" rx="1.5"/><path d="M14 16h7.5M14 19h5"/><path d="M12 11.2 9.6 13.2M12 11.2l2.4 2"/></svg>';

async function openMatcher(roll, onDone) {
  const frames = await framesOf(roll.id);
  if (!frames.length) return;
  const lenses = new Map((await DB.all('lenses')).map(l => [l.id, l]));
  const pick = f => { const o = {}; MATCH_KEYS.forEach(k => { if (f[k] !== undefined) o[k] = f[k]; }); return o.imgId ? o : null; };
  // rows[i] = Beschreibung (fester Frame), slot[i] = Scan, der gerade dort liegt
  const rows = frames.slice();
  const orig = rows.map(pick);
  let slot = orig.slice();
  let sel = -1;
  const urls = new Map();
  await Promise.all(orig.filter(Boolean).map(async b => urls.set(b.imgId, await U.imgUrl(b.imgId, true))));
  const phones = new Map();
  await Promise.all(rows.filter(f => f.phoneId).map(async f => phones.set(f.id, await U.imgUrl(f.phoneId, true))));

  const imgEls = new Map();
  const imgEl = id => { if (!imgEls.has(id)) { const im = new Image(); im.src = urls.get(id); im.alt = ''; im.draggable = false; imgEls.set(id, im); } return imgEls.get(id); };
  const desc = f => {
    if (f.virtual) return '';
    const l = lenses.get(f.lensId);
    const tech = [f.aperture ? 'f/' + String(f.aperture).replace('.', ',') : '', f.shutter || '', l ? (l.focal ? l.focal + ' mm' : lensLabel(l)) : '', f.flash ? 'Blitz' : '', f.double ? 'Doppelbelichtung' : ''].filter(Boolean).join(' · ');
    const where = [f.place || '', f.date ? U.fmtDate(String(f.date).slice(0, 10)) : ''].filter(Boolean).join(' · ');
    return `${tech ? `<span class="mtech">${U.esc(tech)}</span>` : ''}${f.note ? `<span class="mnote">${U.esc(f.note)}</span>` : ''}${where ? `<span class="mwhere">${U.esc(where)}</span>` : ''}`;
  };

  const ov = document.createElement('div'); ov.className = 'cspv matchov';
  ov.innerHTML = `<div class="matchlist" id="mList"></div>
    <div class="matchbar" id="mBar" hidden><button type="button" class="btn small" id="mUp">Ab hier eins hoch</button><button type="button" class="btn small" id="mDown">Ab hier eins runter</button></div>
    <div class="cspvfoot"><button class="closex" id="mX" aria-label="Abbrechen">${ART.x}</button>
    <span class="sub2" id="mHint">Scan antippen, dann seine Zeile</span>
    <button class="cspvshare" id="mOk" aria-label="Zuordnung speichern">${ART.check}</button></div>`;
  document.body.appendChild(ov);
  const list = ov.querySelector('#mList'), bar = ov.querySelector('#mBar'), hint = ov.querySelector('#mHint');

  const draw = () => {
    list.innerHTML = rows.map((f, i) => {
      const b = slot[i], moved = (b?.imgId || null) !== (orig[i]?.imgId || null);
      const ph = phones.get(f.id);
      return `<div class="mrow${i === sel ? ' sel' : ''}${sel >= 0 && i !== sel ? ' target' : ''}${moved ? ' moved' : ''}" data-i="${i}">
        <button type="button" class="mscan${b ? '' : ' empty'}" data-i="${i}" aria-label="${b ? 'Scan in Zeile ' + frameLabel(f) : 'leer'}"></button>
        <span class="mnum">${f.virtual ? '+' : frameLabel(f)}</span>
        <span class="mdesc">${desc(f) || '<span class="mwhere">ohne Angaben</span>'}</span>
        ${ph ? `<img class="mphone" src="${ph}" alt="Handyfoto" draggable="false">` : ''}
      </div>`;
    }).join('');
    // Die Bild-Elemente bleiben dieselben und wandern nur, so muss nichts neu geladen werden und nichts flackert
    list.querySelectorAll('.mscan').forEach(btn => { const b = slot[+btn.dataset.i]; if (b) btn.appendChild(imgEl(b.imgId)); });
    bar.hidden = sel < 0;
    if (sel >= 0) {
      ov.querySelector('#mUp').disabled = !(sel > 0 && !slot[sel - 1]);
    }
    hint.textContent = sel >= 0 ? 'Jetzt die richtige Zeile antippen' : 'Scan antippen, dann seine Zeile';
  };

  // Ende des zusammenhängenden Blocks ab i (letzte Zeile mit Scan vor der nächsten Lücke)
  const blockEnd = i => { let j = i; while (j + 1 < slot.length && slot[j + 1]) j++; return j; };
  const addRow = () => {
    const max = Math.max(...rows.map(r => r.index));
    rows.push({ id: U.uid(), rollId: roll.id, index: max + 1, virtual: true }); slot.push(null); orig.push(null);
  };

  list.addEventListener('click', e => {
    const row = e.target.closest('.mrow'); if (!row) return;
    const i = +row.dataset.i;
    if (sel < 0) { if (slot[i]) { sel = i; U.haptic && U.haptic(8); draw(); } return; }
    if (i === sel) { sel = -1; draw(); return; }
    [slot[sel], slot[i]] = [slot[i], slot[sel]];
    sel = -1; U.haptic && U.haptic([10, 30, 10]); draw();
  });
  ov.querySelector('#mDown').onclick = () => {
    if (sel < 0) return;
    const end = blockEnd(sel);
    if (end + 1 >= slot.length) addRow();
    for (let k = end; k >= sel; k--) slot[k + 1] = slot[k];
    slot[sel] = null; sel = -1; U.haptic && U.haptic(10); draw();
  };
  ov.querySelector('#mUp').onclick = () => {
    if (sel <= 0 || slot[sel - 1]) return;
    const end = blockEnd(sel);
    for (let k = sel; k <= end; k++) slot[k - 1] = slot[k];
    slot[end] = null; sel = -1; U.haptic && U.haptic(10); draw();
  };
  ov.querySelector('#mX').onclick = () => ov.remove();
  ov.querySelector('#mOk').onclick = async () => {
    let n = 0;
    for (let i = 0; i < rows.length; i++) {
      const b = slot[i];
      if ((b?.imgId || null) === (orig[i]?.imgId || null)) continue;
      if (rows[i].virtual && !b) continue;
      const f = rows[i].virtual ? { id: rows[i].id, rollId: roll.id, index: rows[i].index } : await DB.get('frames', rows[i].id);
      MATCH_KEYS.forEach(k => delete f[k]);
      if (b) { Object.assign(f, b); f.shot = true; }
      await DB.put('frames', f); n++;
    }
    const maxIdx = Math.max(...(await framesOf(roll.id)).map(f => f.index));
    if (maxIdx > (roll.exposures || 0)) { roll.exposures = maxIdx; await DB.put('rolls', roll); }
    ov.remove();
    if (n) { U.toast(n === 1 ? '1 Scan neu zugeordnet' : `${n} Scans neu zugeordnet`); U.haptic && U.haptic([12, 40, 12]); }
    onDone && onDone();
  };
  window.addEventListener('hashchange', () => ov.remove(), { once: true });
  draw();
}
