/* Ideen: einzelne Karten mit Beschreibung, Filtern, Doppelbelichtung und Beispielbildern (z. B. von Social Media).
   Gespeichert in „meta“ unter der Kennung „ideas“, Bilder im normalen Bildspeicher. */
async function getIdeas() { return (await DB.get('meta', 'ideas'))?.list || []; }
async function saveIdeas(list) { await DB.put('meta', { id: 'ideas', list }); }

const IDEA_IC = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z"/></svg>';

async function ideasFoldHtml() {
  const list = await getIdeas();
  const filters = await getFilters();
  const tiles = await Promise.all(list.map(async i => {
    const u = i.imgIds?.[0] ? await U.imgUrl(i.imgIds[0], true) : null;
    const fs = (i.filterIds || []).map(id => filters.find(f => f.id === id)).filter(Boolean);
    return `<button type="button" class="ideatile${u ? ' hasimg' : ''}" data-idea="${i.id}">
      ${u ? `<img src="${u}" alt="">${(i.imgIds || []).length > 1 ? `<span class="ideamore">+${i.imgIds.length - 1}</span>` : ''}` : ''}
      <span class="ideatext">${U.esc((i.text || '').trim() || 'Ohne Beschreibung')}</span>
      ${fs.length || i.double ? `<span class="ideatags">${i.double ? `<span class="ideatag">${ART.double}</span>` : ''}${fs.map(f => `<span class="ideatag">${filterArt(f, 16)}${U.esc(filterCode(f) || filterName(f))}</span>`).join('')}</span>` : ''}
    </button>`;
  }));
  return `
    <section class="ideas fold${foldOpen('ideas') ? ' open' : ''}" data-fold="ideas">
      <div class="fridgetop foldhead">
        <span class="fridgeicon">${IDEA_IC}</span>
        <div><h2>Ideen</h2><span class="sub2">${list.length ? `${list.length} ${list.length === 1 ? 'Idee' : 'Ideen'}` : 'Noch leer'}</span></div>
        <button class="fridgeplus" id="addIdea" aria-label="Idee hinzufügen">+</button>
        <span class="foldchev" aria-hidden="true"></span>
      </div>
      <div class="foldbody">
        ${tiles.length ? `<div class="ideagrid">${tiles.join('')}</div>` : '<p class="hint">Halte hier fest, was du ausprobieren willst: ein Motiv, eine Technik, ein Bild aus Social Media. Lege mit dem Plus die erste Idee an.</p>'}
      </div>
    </section>`;
}

function setupIdeas(root) {
  root.querySelector('#addIdea')?.addEventListener('click', e => { e.stopPropagation(); U.haptic && U.haptic(); openIdeaEditor(null); });
  root.querySelectorAll('[data-idea]').forEach(b => b.addEventListener('click', async () => {
    const i = (await getIdeas()).find(x => x.id === b.dataset.idea); if (i) openIdeaEditor(i);
  }));
}

async function openIdeaEditor(idea) {
  const isNew = !idea;
  const ed = idea ? JSON.parse(JSON.stringify(idea)) : { id: U.uid(), text: '', filterIds: [], double: false, imgIds: [], createdAt: new Date().toISOString() };
  ed.filterIds = ed.filterIds || []; ed.imgIds = ed.imgIds || [];
  const added = [];      // in diesem Fenster neu hochgeladen, beim Abbrechen wieder löschen
  const removed = [];    // beim Speichern endgültig löschen
  const filters = await getFilters();
  const ov = document.createElement('div');
  ov.className = 'modalbg';
  ov.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="idTitle">
      <h2 id="idTitle">${isNew ? 'Neue Idee' : 'Idee'}</h2>
      <label class="fld"><span>Beschreibung</span><textarea id="idText" rows="5" placeholder="Motiv, Licht, Technik, wo du es gesehen hast …">${U.esc(ed.text || '')}</textarea></label>
      <div class="qlabel">Beispielbilder</div>
      <div class="dtgrid" id="idImgs"></div>
      <label class="btn ghost small" style="margin-top:8px">Bild hinzufügen<input type="file" accept="image/*" multiple hidden id="idUp"></label>
      <div class="qlabel">Filter</div>
      ${filters.length ? `<div class="filterpickrow" id="idFilters">${filters.map(f => `<button type="button" class="ffbtn${ed.filterIds.includes(f.id) ? ' on' : ''}" data-filter="${f.id}" aria-pressed="${ed.filterIds.includes(f.id)}">${filterArt(f, 30)}<span>${U.esc(filterCode(f) || filterName(f))}</span></button>`).join('')}</div>`
        : '<p class="hint">Noch keine Filter im Kameraschrank.</p>'}
      <div class="frametools" style="margin-top:6px"><button type="button" class="dblbtn${ed.double ? ' on' : ''}" id="idDbl" aria-pressed="${!!ed.double}" aria-label="Doppelbelichtung" title="Doppelbelichtung">${ART.double}</button><span class="sub2">Doppelbelichtung</span></div>
      ${isNew ? '' : '<button class="btn danger small" id="idDel" style="margin-top:12px">Idee löschen</button>'}
      <div class="modalfoot"><button class="closex" id="idNo" aria-label="Abbrechen">${ART.x}</button><button class="okbtn" id="idOk" aria-label="Speichern">${ART.check}</button></div>
    </div>`;
  document.body.appendChild(ov);
  const $ = id => ov.querySelector('#' + id);
  const drawImgs = async () => {
    const urls = await Promise.all(ed.imgIds.map(id => U.imgUrl(id, true)));
    $('idImgs').innerHTML = ed.imgIds.map((id, k) => urls[k] ? `<span class="dtph"><img src="${urls[k]}" alt="" data-img="${id}"><button type="button" class="dtdel" data-del="${id}" aria-label="Bild entfernen">×</button></span>` : '').join('');
  };
  drawImgs();
  $('idUp').addEventListener('change', async e => {
    const files = [...e.target.files]; if (!files.length) return;
    U.toast(files.length === 1 ? 'Bild wird gespeichert …' : `${files.length} Bilder werden gespeichert …`);
    for (const f of files) {
      try { const rec = await U.storeImage(f, 'idea'); ed.imgIds.push(rec.id); added.push(rec.id); }
      catch (_) { U.toast('Bild konnte nicht gelesen werden'); }
    }
    e.target.value = ''; drawImgs();
  });
  $('idImgs').addEventListener('click', async e => {
    const del = e.target.closest('[data-del]');
    if (del) { ed.imgIds = ed.imgIds.filter(x => x !== del.dataset.del); removed.push(del.dataset.del); drawImgs(); return; }
    const img = e.target.closest('img[data-img]'); if (img) zoom(await U.imgUrl(img.dataset.img) || img.src);
  });
  $('idFilters')?.addEventListener('click', e => {
    const b = e.target.closest('[data-filter]'); if (!b) return;
    const id = b.dataset.filter;
    ed.filterIds = ed.filterIds.includes(id) ? ed.filterIds.filter(x => x !== id) : [...ed.filterIds, id];
    b.classList.toggle('on', ed.filterIds.includes(id)); b.setAttribute('aria-pressed', ed.filterIds.includes(id));
  });
  $('idDbl').addEventListener('click', e => { ed.double = !ed.double; e.currentTarget.classList.toggle('on', ed.double); e.currentTarget.setAttribute('aria-pressed', ed.double); });
  const close = async () => { for (const id of added) await deleteImage(id); ov.remove(); };
  $('idNo').addEventListener('click', close);
  ov.addEventListener('click', e => { if (e.target === ov) close(); });
  $('idOk').addEventListener('click', async () => {
    ed.text = $('idText').value.trim();
    if (isNew && !ed.text && !ed.imgIds.length) { await close(); return; }
    ed.updatedAt = new Date().toISOString();
    const list = await getIdeas();
    const i = list.findIndex(x => x.id === ed.id);
    if (i >= 0) list[i] = ed; else list.unshift(ed);
    await saveIdeas(list);
    for (const id of removed) await deleteImage(id);
    ov.remove(); if (isNew) U.haptic && U.haptic([20, 60, 20]);
    U.toast(isNew ? 'Idee gespeichert' : 'Gespeichert');
    try { localStorage.setItem('kb-fold-ideas', '1'); } catch (_) {}
    route();
  });
  $('idDel')?.addEventListener('click', async () => {
    const before = await getIdeas(), imgs = [...(idea?.imgIds || []), ...added, ...removed];
    await saveIdeas(before.filter(x => x.id !== ed.id));
    ov.remove(); route();
    // Bilder erst nach Ablauf der Rückgängig-Zeit endgültig löschen
    U.undo('Idee gelöscht', async () => { await saveIdeas(before); route(); }, async () => { for (const id of new Set(imgs)) await deleteImage(id); });
  });
}
