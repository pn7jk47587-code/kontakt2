/* Bewertung von −5 bis +5 und Personen auf Fotos */

// ---------- Bewertung ----------
// Darstellung: Lichtpunkte (Lichtleiste und Belichtungsmesser sind seit v178 entfernt)
const fmtRate = v => v == null ? '–' : v > 0 ? '+' + v : String(v).replace('-', '−');
function rateHtml(v, id = 'rate') {
  const cells = [];
  for (let k = -5; k <= 5; k++) {
    const on = v != null && (k === 0 ? true : (v > 0 ? k > 0 && k <= v : v < 0 ? k < 0 && k >= v : false));
    const cur = v != null && k === v;
    cells.push(`<button type="button" class="rc${on ? ' on' : ''}${cur ? ' cur' : ''}${k === 0 ? ' zero' : k > 0 ? ' pos' : ' neg'}" data-v="${k}" style="--i:${Math.abs(k)}" role="radio" aria-checked="${cur}" aria-label="${fmtRate(k)}"></button>`);
  }
  return `<div class="ratewrap"><div class="rate rate-dots${v == null ? ' unset' : ''}" id="${id}" role="radiogroup" aria-label="Bewertung von −5 bis +5">${cells.join('')}</div><span class="ratev" id="${id}V">${v == null ? '' : fmtRate(v)}</span></div>`;
}
function wireRate(root, id, get, set) {
  const el = root.querySelector('#' + id); if (!el) return;
  el.addEventListener('click', async e => {
    const b = e.target.closest('[data-v]'); if (!b) return;
    const k = +b.dataset.v, cur = get();
    const v = cur === k ? null : k;   // gleiche Stufe nochmal: Bewertung entfernen
    await set(v);
    const wrap = el.closest('.ratewrap'); wrap.outerHTML = rateHtml(v, id);
    wireRate(root, id, get, set);
    U.haptic && U.haptic(v == null ? 8 : v >= 4 ? [12, 40, 12] : 10);
  });
}

// ---------- Personen ----------
async function getPeople() { return (await DB.get('meta', 'people'))?.list || []; }
async function savePeople(list) { await DB.put('meta', { id: 'people', list }); }
const PERSON_IC = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="10" cy="8" r="3.5"/><path d="M3.5 19.5c.8-3.4 3.4-5.2 6.5-5.2s5.7 1.8 6.5 5.2"/><path d="M18.5 7.5v5M16 10h5"/></svg>';
async function peopleChips(ids) {
  const all = await getPeople();
  return (ids || []).map(id => all.find(p => p.id === id)).filter(Boolean).map(p => `<span class="pchip">${U.esc(p.name)}</span>`).join('');
}
// Auswahl (v199): ein Feld zum Suchen und Anlegen. Tippen filtert die Namen, ein neuer Name erscheint als „+ Name“.
// Antippen wählt aus, Enter oder der Haken übernehmen auch einen gerade getippten neuen Namen.
async function openPeoplePicker(chosen, onDone) {
  const counts = new Map();
  (await DB.all('frames')).forEach(f => (f.people || []).forEach(id => counts.set(id, (counts.get(id) || 0) + 1)));
  let list = (await getPeople()).sort((a, b) => (counts.get(b.id) || 0) - (counts.get(a.id) || 0) || a.name.localeCompare(b.name, 'de'));
  const sel = new Set(chosen || []);
  const ov = document.createElement('div'); ov.className = 'modalbg';
  ov.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="Personen auf dem Foto">
      <form class="ppnew" id="ppForm"><input id="ppName" maxlength="40" autocomplete="off" enterkeyhint="done" placeholder="Name" aria-label="Name suchen oder neu anlegen"></form>
      <div class="pplist" id="ppList"></div>
      <div class="modalfoot"><button class="closex" id="ppNo" aria-label="Abbrechen">${ART.x}</button><button class="okbtn" id="ppOk" aria-label="Übernehmen">${ART.check}</button></div></div>`;
  const inp = ov.querySelector('#ppName'), box = ov.querySelector('#ppList');
  const norm = t => t.trim().toLowerCase();
  const draw = () => {
    const q = norm(inp.value);
    const shown = list.filter(p => !q || sel.has(p.id) || p.name.toLowerCase().includes(q));
    const isNew = q && !list.some(p => p.name.toLowerCase() === q);
    box.innerHTML = (isNew ? `<button type="button" class="chip pp ppadd" data-new="1">+ ${U.esc(inp.value.trim())}</button>` : '')
      + shown.map(p => `<button type="button" class="chip pp${sel.has(p.id) ? ' on' : ''}" data-p="${p.id}" aria-pressed="${sel.has(p.id)}">${U.esc(p.name)}${counts.get(p.id) ? `<span class="sub2"> ${counts.get(p.id)}</span>` : ''}</button>`).join('');
  };
  // Getippten Namen übernehmen: vorhandene Person auswählen oder neu anlegen
  const commit = async () => {
    const name = inp.value.trim(); if (!name) return false;
    let p = list.find(x => x.name.toLowerCase() === name.toLowerCase());
    if (!p) { p = { id: U.uid(), name }; list.push(p); await savePeople(list); }
    sel.add(p.id); inp.value = ''; draw(); U.haptic && U.haptic(8); return true;
  };
  inp.addEventListener('input', draw);
  ov.querySelector('#ppForm').onsubmit = async e => { e.preventDefault(); await commit(); inp.focus(); };
  box.addEventListener('click', async e => {
    if (e.target.closest('[data-new]')) { await commit(); return; }
    const b = e.target.closest('[data-p]'); if (!b) return;
    const id = b.dataset.p; sel.has(id) ? sel.delete(id) : sel.add(id); inp.value = ''; U.haptic && U.haptic(8); draw();
  });
  ov.querySelector('#ppNo').onclick = () => ov.remove();
  // Haken: ein getippter Name, zu dem es noch niemanden gibt, wird mit angelegt. Passt er zu vorhandenen Namen, bleibt es bei der Auswahl.
  ov.querySelector('#ppOk').onclick = async () => { const q = norm(inp.value); if (q && !list.some(p => p.name.toLowerCase().includes(q))) await commit(); ov.remove(); onDone([...sel]); };
  draw(); document.body.appendChild(ov);
  if (!list.length) inp.focus();
}
