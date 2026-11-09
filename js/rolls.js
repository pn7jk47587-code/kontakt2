/* Rollen: Assistent, Übersicht, Bildansicht, Entwicklung, Favoriten, Album, Kameras */

const APERTURES = ['1.4', '2', '2.8', '4', '5.6', '8', '11', '16', '22'];
// Zeiten von der kürzesten zur längsten. Ohne Kameradaten gilt die volle Reihe.
const SPEEDS = ['1/4000', '1/2000', '1/1000', '1/500', '1/250', '1/125', '1/60', '1/30', '1/15', '1/8', '1/4', '1/2', '1', '2', '4', '8', '15', '30', '40'];
const SHUTTERS = ['1/2000', '1/1000', '1/500', '1/250', '1/125', '1/60', '1/30', '1/15', '1/8', '1/4', '1/2', '1', '2', '4', '8', 'B'];
const STOPS = ['1', '1.4', '2', '2.8', '4', '5.6', '8', '11', '16', '22', '32', '45', '64'];
// Zahlen auch aus „f/16“, „f16“, „1:2.8“ oder „2,8“ lesen
const num = v => { const m = String(v ?? '').replace(',', '.').replace(/^\s*(f\s*\/?|1\s*:)\s*/i, '').match(/\d+(\.\d+)?/); return m ? parseFloat(m[0]) : NaN; };
// Blendenreihe eines Objektivs: Lichtstärke, dann volle Stufen bis zur kleinsten Blende.
// Ohne Lichtstärke beginnt die Reihe bei 1,4, ohne kleinste Blende endet sie bei 22.
function lensApertures(l) {
  let mx = num(l?.maxAp), mn = num(l?.minAp);
  if (!(mx > 0)) mx = null;
  if (!(mn > 0)) mn = 22;
  if (mx && mn < mx) [mx, mn] = [mn, mx];            // Felder vertauscht eingetragen
  const lo = mx || 1.4;
  const list = STOPS.filter(x => parseFloat(x) >= lo - 0.05 && parseFloat(x) <= mn + 0.05);
  if (mx && !list.some(x => Math.abs(parseFloat(x) - mx) < 0.05)) list.unshift(String(mx));
  if (!list.some(x => Math.abs(parseFloat(x) - mn) < 0.05)) list.push(String(mn));
  return list.length ? list : APERTURES;
}
// Zeiten einer Kamera: kürzeste Zeit zuerst, dann X, B, T (keine Zeitautomatik: keine Kamera im Schrank belichtet automatisch)
function camShutters(c) {
  if (!c) return SHUTTERS;
  if (!c.shutterFast) return SHUTTERS;
  const a = SPEEDS.indexOf(c.shutterFast), b = SPEEDS.indexOf(c.shutterSlow || '1');
  return [...SPEEDS.slice(a, b + 1), ...(c.shutterX ? ['X'] : []), ...(c.shutterB ? ['B'] : []), ...(c.shutterT ? ['T'] : [])];
}
const chipHtml = (list, cur, sec) => list.map(v => `<button type="button" class="chip${cur === v ? ' on' : ''}" data-v="${v}">${v.replace('.', ',')}${sec && /^\d+$/.test(v) ? ' s' : ''}</button>`).join('');
const FORMAT_LABEL = { '135': 'Kleinbild', '120': 'Mittelformat', half: 'Halbformat', gross: 'Großformat' };
// Film zum Aufnahmeformat: Halbformat belichtet Kleinbildfilm, Großformat Planfilm (im Kühlschrank als „gross“)
const filmFmt = f => f === 'half' ? '135' : f;
// Blitzsynchronzeit: kürzeste Zeit, bei der der Verschluss beim Zünden ganz offen ist
const FLASH_SYNC_OPTS = [['', 'keine Angabe'], ['alle', 'Alle Zeiten (Zentralverschluss)'], ['eingebaut', 'Eingebauter Blitz (Automatik)'], ...['1/250', '1/125', '1/100', '1/90', '1/80', '1/60', '1/50', '1/40', '1/30'].map(v => [v, v + ' s'])];
// „X“ am Zeitenrad steht für die Synchronzeit der Kamera
const shutterSec = (v, cam) => v === 'X' && cam && /^1\//.test(cam.flashSync || '') ? U.parseShutter(cam.flashSync) : U.parseShutter(v);
function flashSyncText(cam) {
  if (!cam) return 'Keine Kamera gewählt. Bei Schlitzverschlüssen meist 1/60 s oder länger.';
  const n = camLabel(cam), fs = cam.flashSync;
  if (fs === 'alle') return `${n}: Zentralverschluss, Blitz bei allen Zeiten.`;
  if (fs === 'eingebaut') return `${n}: eingebauter Blitz, die Kamera stellt alles selbst ein.`;
  if (fs) return `${n}: Blitz bei ${fs} s oder länger${cam.shutterX ? ', am Zeitenrad „X“' : ''}.`;
  return `${n}: Synchronzeit nicht hinterlegt. Im Kameraschrank eintragen.`;
}

function nowLocal() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 19);   // mit Sekunden
}
function frameLabel(f) { return f.index === 0 ? '0' : String(f.index); }
function camLabel(c) { return c ? `${c.maker} ${c.name}`.trim() : ''; }

async function filmArt(stock, size = 96) {
  if (stock?.photoId) {
    const u = await U.imgUrl(stock.photoId, true);
    if (u) return `<img class="artimg" src="${u}" alt="" style="width:${size}px;height:${size}px">`;
  }
  if (stock && SEED_IMG[stock.id]) return `<img class="artimg cut" src="${SEED_IMG[stock.id]}" alt="" style="width:${size}px;height:${size}px">`;
  return ART.film(stock, size);
}
async function camArt(cam, size = 120) {
  if (cam?.photoId) {
    const u = await U.imgUrl(cam.photoId, true);
    if (u) return `<img class="artimg" src="${u}" alt="" style="width:${size}px;height:${Math.round(size * 0.78)}px">`;
  }
  if (cam && SEED_IMG[cam.id]) return `<img class="artimg cut" src="${SEED_IMG[cam.id]}" alt="" style="width:${size}px;height:${Math.round(size * 0.78)}px">`;
  return ART.camera(cam, size);
}

/* ---------- Startseite: Film einlegen und die drei Stadien ---------- */
async function viewRolls() {
  setTimeout(() => { if ((location.hash || '#/') === '#/' || location.hash === '#') FX.homeShown(); }, 0);
  setHeader('');
  titleEl.innerHTML = WORDMARK;
  const [rolls, stocks, cams] = [await DB.all('rolls'), await stocksMap(), await DB.all('cameras')];
  const hero = await profileHero();
  const camMap = new Map(cams.map(c => [c.id, c]));
  const allFrames = await DB.all('frames');
  const allFilters = await getFilters();
  const peopleAll = await getPeople();
  rolls.sort((a, b) => (b.loadedAt || b.createdAt || '').localeCompare(a.loadedAt || a.createdAt || ''));
  let html = hero + `<a class="btn glass newroll" href="#/rolle/neu">Film einlegen</a>`;
  if (rolls.length) html += U.hintOnce('home-longpress', 'Halte eine Karte gedrückt, um Film, Kamera und Daten der Rolle zu sehen.');
  const order = [['entwurf', 'Film in der Kamera'], ['belichtet', 'In Entwicklung'], ['entwickelt', 'Fotoalbum']];
  for (const [g, label] of order) {
    const list = rolls.filter(r => (r.status || 'entwurf') === g);
    if (!list.length) continue;
    // „In Entwicklung“ und „Fotoalbum“ lassen sich einklappen, der Film in der Kamera bleibt immer sichtbar
    const foldable = g !== 'entwurf';
    html += foldable
      ? `<section class="homefold fold${foldOpen('home-' + g, true) ? ' open' : ''}" data-fold="home-${g}"><h2 class="sec sec-${g} foldhead"><i></i>${label}<span class="seccount">${list.length}</span><span class="foldchev" aria-hidden="true"></span></h2><div class="rolls foldbody">`
      : `<h2 class="sec sec-${g}"><i></i>${label}</h2><div class="rolls">`;
    for (const r of list) {
      const fr = allFrames.filter(f => f.rollId === r.id).sort((a, b) => a.index - b.index);
      const withImg = fr.filter(f => f.imgId).slice(0, 6);
      const thumbs = await Promise.all(withImg.map(f => U.imgUrl(f.imgId, true)));
      const st = stocks.get(r.stockId);
      const cam = camMap.get(r.cameraId);
      const devInfo = g === 'belichtet'
        ? `<div class="devline">${r.dev?.mode === 'selbst' ? 'Selbst entwickeln' : U.esc(r.dev?.lab || 'Labor')}${r.dev?.sentAt ? ' · seit ' + U.fmtDate(r.dev.sentAt) : ''}</div>` : '';
      const act = g === 'entwurf' ? `<button class="cardact to-dev" data-dev="${r.id}" aria-label="Film in Entwicklung geben">${ART.arrow}<span>Entwickeln</span></button>`
        : g === 'belichtet' ? `<button class="cardact to-album" data-pickup="${r.id}" aria-label="${r.dev?.mode === 'selbst' ? 'Scans hochladen' : 'Film abgeholt, Fotos hochladen'}">${ART.up}<span>${r.dev?.mode === 'selbst' ? 'Scans hochladen' : 'Fotos hochladen'}</span></button>`
        : `<a class="cardact open-album" href="#/album/${r.id}" aria-label="Fotoalbum öffnen">${ART.album}<span>Ansehen</span></a>`;
      const small = g === 'entwickelt' && (() => { try { return localStorage.getItem('kb-albumfold-' + r.id) === '1'; } catch (_) { return false; } })();
      html += `<div class="rollcard st-${g}${small ? ' small' : ''}" data-rc="${r.id}">${g === 'entwickelt' ? `<button type="button" class="rcfold" data-rcfold="${r.id}" aria-expanded="${!small}" aria-label="${small ? 'Album aufklappen' : 'Album einklappen'}"><span class="foldchev" aria-hidden="true"></span></button>` : ''}
        <a class="rc-link" href="#/${g === 'entwickelt' ? 'album' : 'rolle'}/${r.id}">
          <div class="strip">${thumbs.length ? thumbs.map(u => `<img src="${u}" alt="">`).join('') : `<div class="strip-art">${await filmArt(st, 44)}${cam ? await camArt(cam, 56) : ''}${rollIrFilters(r, fr, allFilters).map(f => `<span class="stripfilter" title="${U.esc(filterName(f))}">${filterArt(f, 34)}</span>`).join('')}</div>`}</div>
          <div class="rc-body">
            <div class="rc-title">${U.esc(r.title || U.stockLabel(st))}</div>
            <div class="rc-sub">${U.esc(camLabel(cam) || r.camera || '')}${r.loadedAt ? ' · ' + U.fmtDate(r.loadedAt) : ''}</div>
            ${devInfo}
          </div>
        </a>${act}</div>`;
    }
    html += (g !== 'entwurf') ? `</div></section>` : `</div>`;
  }
  view.innerHTML = html;
  setupFolds(view);
  view.querySelectorAll('[data-dev]').forEach(b => b.addEventListener('click', () => openDevModal(rolls.find(r => r.id === b.dataset.dev), () => route())));
  view.querySelectorAll('[data-pickup]').forEach(b => b.addEventListener('click', () => openPickupModal(rolls.find(r => r.id === b.dataset.pickup), () => route())));
  setupLongPress(view, { rolls, stocks, camMap, allFrames });
  view.querySelectorAll('[data-rcfold]').forEach(b => b.addEventListener('click', e => {
    e.preventDefault(); e.stopPropagation();
    const card = b.closest('.rollcard'), small = card.classList.toggle('small');
    b.setAttribute('aria-expanded', !small); b.setAttribute('aria-label', small ? 'Album aufklappen' : 'Album einklappen');
    try { localStorage.setItem('kb-albumfold-' + b.dataset.rcfold, small ? '1' : '0'); } catch (_) {}
    U.haptic && U.haptic(8);
  }));
  view.querySelector('.newroll').addEventListener('click', e => { e.preventDefault(); openLoadSheet(e.currentTarget); });
}

// „Film einlegen“ zieht sich aus dem Knopf zu einer abgerundeten Karte auf; Profilbild und Name bleiben oben sichtbar
async function openLoadSheet(btn) {
  window.scrollTo(0, 0);
  const head = view.querySelector('.homehead');
  const from = btn.getBoundingClientRect();
  const top = Math.round((head ? head.getBoundingClientRect().bottom : 120) + 8);
  const sheet = document.createElement('div');
  sheet.className = 'loadsheet';
  sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-label', 'Film einlegen');
  sheet.innerHTML = `<div class="lshead"><h2>Film einlegen</h2><button class="closex" id="lsClose" aria-label="Schließen">${ART.x}</button></div><div class="lsbody"><div class="lsinner"></div></div>`;
  const W = window.innerWidth, H = window.innerHeight;
  const to = { top, left: 10, width: W - 20, height: H - top - 10 };
  Object.assign(sheet.style, { top: from.top + 'px', left: from.left + 'px', width: from.width + 'px', height: from.height + 'px', borderRadius: Math.round(from.height / 2) + 'px' });
  document.body.appendChild(sheet);
  document.body.classList.add('sheetopen');
  const wiz = wizLoad();
  await wizardStep1(wiz, sheet.querySelector('.lsinner'));
  requestAnimationFrame(() => requestAnimationFrame(() => {
    sheet.classList.add('open');
    Object.assign(sheet.style, { top: to.top + 'px', left: to.left + 'px', width: to.width + 'px', height: to.height + 'px', borderRadius: '28px' });
  }));
  const close = () => {
    const r = btn.getBoundingClientRect();
    sheet.classList.remove('open', 'settled');
    Object.assign(sheet.style, { top: r.top + 'px', left: r.left + 'px', width: r.width + 'px', height: r.height + 'px', borderRadius: Math.round(r.height / 2) + 'px' });
    document.body.classList.remove('sheetopen');
    setTimeout(() => sheet.remove(), 320);
  };
  sheet.querySelector('#lsClose').addEventListener('click', close);
  // Beim Scrollen in der Karte wächst sie nach oben über Profilbild und Namen bis unter die Kopfzeile
  const bar = document.querySelector('.topbar').getBoundingClientRect().bottom + 6;
  // Sobald man in der Karte scrollt, gleitet sie ruhig nach oben bis unter die Kopfzeile; ganz oben angekommen gleitet sie zurück
  const bodyEl = sheet.querySelector('.lsbody');
  let big = false;
  const place = t => { sheet.style.top = t + 'px'; sheet.style.height = (window.innerHeight - t - 10) + 'px'; };
  setTimeout(() => sheet.classList.add('settled'), 360);
  // Nach oben erst nach etwas Weg, zurück erst ganz oben: so springt die Karte beim Hin- und Herscrollen nicht
  bodyEl.addEventListener('scroll', () => {
    if (!sheet.classList.contains('settled')) return;
    const y = bodyEl.scrollTop;
    const want = big ? y > 0 : y > 40;
    if (want === big) return;
    big = want; place(big ? bar : to.top);
  }, { passive: true });
}

// Langes Drücken auf eine Rolle: Karte hebt sich ab, „Löschen“ erscheint
function setupLongPress(root, data) {
  let timer = null, start = null, suppress = false;
  const drop = () => root.querySelectorAll('.rollcard.lifted').forEach(c => { c.classList.remove('lifted'); c.querySelector('.liftinfo')?.remove(); });
  // Details zur Rolle für das lange Drücken
  const details = id => {
    const r = data.rolls.find(x => x.id === id); if (!r) return '';
    const st = data.stocks.get(r.stockId), cam = data.camMap.get(r.cameraId);
    const fr = data.allFrames.filter(f => f.rollId === id && !f.bonus);
    const used = fr.filter(f => f.shot || f.imgId || f.note).length, scans = data.allFrames.filter(f => f.rollId === id && f.imgId).length;
    const cost = (Number(r.filmCost) || 0) + (Number(r.dev?.cost) || 0) + (Number(r.dev?.scanCost) || 0);
    const rows = [
      ['Film', `${U.stockLabel(st)}${st?.boxIso ? ' · ISO ' + (r.ei || st.boxIso) : ''}`],
      ['Kamera', camLabel(cam) || r.camera || ''],
      ['Format', FORMAT_LABEL[r.format] || ''],
      ['Eingelegt', r.loadedAt ? U.fmtDate(r.loadedAt) : ''],
      ['Bilder', (r.status || 'entwurf') === 'entwickelt' ? `${scans} Fotos` : `${used} von ${fr.length} notiert${r.bonus ? ' · mit Bonusbild' : ''}`],
      ['Entwicklung', r.dev?.sentAt && (r.status || 'entwurf') !== 'entwurf' ? `${r.dev.mode === 'selbst' ? 'selbst' : U.esc(r.dev.lab || 'Labor')} seit ${U.fmtDate(r.dev.sentAt)}${r.dev.scan ? ', mit Scan' : ''}` : ''],
      ['Kosten', cost ? euro(cost) : '']
    ].filter(([, v]) => v);
    return `<dl class="liftrows">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${U.esc(v)}</dd>`).join('')}</dl>`;
  };
  root.addEventListener('pointerdown', e => {
    const card = e.target.closest('.rollcard'); if (!card || card.classList.contains('lifted') || e.target.closest('.cardact, .liftinfo')) return;
    start = { x: e.clientX, y: e.clientY };
    timer = setTimeout(() => {
      timer = null; suppress = true; drop();
      card.classList.add('lifted');
      const id = card.querySelector('[data-dev], [data-pickup]')?.dataset.dev || card.querySelector('[data-pickup]')?.dataset.pickup || card.querySelector('.rc-link').getAttribute('href').split('/').pop();
      const info = document.createElement('div');
      info.className = 'liftinfo';
      info.innerHTML = `${details(id)}<button class="liftdel" data-delroll="${id}">${TRASH_BTN(id).match(/<svg[\s\S]*<\/svg>/)[0]}<span>Löschen</span></button>`;
      card.appendChild(info);
      U.haptic();
    }, 480);
  });
  const cancel = e => { if (timer && (!start || e.type !== 'pointermove' || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10)) { clearTimeout(timer); timer = null; } };
  root.addEventListener('pointermove', cancel);
  root.addEventListener('pointerup', cancel);
  root.addEventListener('pointercancel', cancel);
  root.addEventListener('contextmenu', e => { if (e.target.closest('.rollcard')) e.preventDefault(); });
  // Der Klick nach dem langen Drücken öffnet die Rolle nicht; ein Tipp daneben legt die Karte wieder ab
  root.addEventListener('click', e => {
    if (suppress) { suppress = false; if (!e.target.closest('.liftdel')) { e.preventDefault(); e.stopPropagation(); } return; }
    if (root.querySelector('.rollcard.lifted') && !e.target.closest('.liftdel, .liftinfo')) { e.preventDefault(); e.stopPropagation(); drop(); }
  }, true);
}

/* ---------- Fenster „Film abgeholt“: Fotos hochladen, danach Fotoalbum ---------- */
// „Fotos hochladen“ öffnet direkt die Fotoauswahl. Die Scans füllen die Platzhalter in der Reihenfolge der Dateinamen.
function openPickupModal(roll, done) {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true; inp.hidden = true;
  document.body.appendChild(inp);
  inp.addEventListener('change', async () => {
    const files = [...inp.files]; inp.remove();
    if (!files.length) return;
    const busy = document.createElement('div');
    busy.className = 'modalbg busy';
    busy.innerHTML = `<div class="busycard">${files.length} ${files.length === 1 ? 'Foto wird' : 'Fotos werden'} gespeichert …</div>`;
    document.body.appendChild(busy);
    try {
      const n = await assignScans(roll, files);
      roll.status = 'entwickelt';
      roll.dev = roll.dev || {};
      if (!roll.dev.backAt && !roll.dev.devDate) roll.dev[roll.dev.mode === 'selbst' ? 'devDate' : 'backAt'] = U.today();
      await DB.put('rolls', roll);
      U.toast(`${n} ${n === 1 ? 'Foto' : 'Fotos'} hochgeladen`);
      await queueLeakPick(roll);
      location.hash = '#/album/' + roll.id;
    } finally { busy.remove(); }
  });
  inp.addEventListener('cancel', () => inp.remove());
  inp.click();
}

/* ---------- Fenster „Film entwickeln“ ---------- */
async function openDevModal(roll, done) {
  const stock = await DB.get('stocks', roll.stockId);
  const labs = await getLabs();
  const ov = document.createElement('div');
  ov.className = 'modalbg';
  ov.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="devTitle">
      <h2 id="devTitle">Film entwickeln</h2>
      <div class="devopts">
        ${labs.map(l => `<button type="button" data-o="${l.id}">${U.esc(l.name)}</button>`).join('')}
        <button type="button" data-o="selbst">Selbst entwickeln</button>
      </div>
      <div id="labPart" hidden>
        <label class="check"><input type="checkbox" id="devScan"> Auch scannen</label>
        <h3 class="sub">Abholschein</h3>
        <div class="row gap" style="padding:0">
          <label class="btn ghost small">Foto aufnehmen<input type="file" accept="image/*" capture="environment" hidden class="slip"></label>
          <label class="btn ghost small">Aus Mediathek<input type="file" accept="image/*" hidden class="slip"></label>
        </div>
        <img id="slipPrev" class="slipprev" hidden alt="Abholschein">
      </div>
      <div class="modalfoot">
        <span></span>
        <button class="okbtn" id="devGo" disabled aria-label="Bestätigen">${ART.check}</button>
      </div>
    </div>`;
  document.body.appendChild(ov);
  let choice = null, slipFile = null;
  const go = ov.querySelector('#devGo');
  const lab = () => labs.find(l => l.id === choice);
  const calc = () => labPrice(roll, stock, ov.querySelector('#devScan').checked, lab());
  ov.querySelector('.devopts').addEventListener('click', e => {
    const b = e.target.closest('[data-o]'); if (!b) return;
    choice = b.dataset.o;
    ov.querySelectorAll('.devopts button').forEach(x => x.classList.toggle('on', x === b));
    ov.querySelector('#labPart').hidden = choice === 'selbst';
    ov.querySelector('#devScan').closest('label').hidden = lab()?.mode === 'flat';
    go.disabled = false;
  });
  ov.querySelectorAll('.slip').forEach(inp => inp.addEventListener('change', () => {
    slipFile = inp.files[0]; if (!slipFile) return;
    const img = ov.querySelector('#slipPrev'); U.fileToDataUrl(slipFile).then(u => { img.src = u; img.hidden = false; });
  }));
  const close = () => ov.remove();
  ov.addEventListener('click', e => { if (e.target === ov) close(); });
  go.addEventListener('click', async () => {
    go.disabled = true;
    roll.dev = roll.dev || {};
    if (choice !== 'selbst') {
      const p = calc();
      roll.dev.mode = 'labor'; roll.dev.lab = lab().name; roll.dev.labId = lab().id; roll.dev.sentAt = U.today();
      roll.dev.cost = p.dev; roll.dev.scanCost = p.scan; roll.dev.scan = p.scan > 0;
      if (slipFile) {
        const rec = await U.storeImage(slipFile, 'slip');
        await deleteImage(roll.dev.slipId); roll.dev.slipId = rec.id;
      }
    } else {
      roll.dev.mode = 'selbst'; roll.dev.sentAt = U.today(); roll.dev.cost = null; roll.dev.scanCost = null;
    }
    roll.status = 'belichtet';
    roll.finishedAt = roll.finishedAt || U.today();
    await DB.put('rolls', roll);
    close();
    U.toast('Film in Entwicklung gegeben');
    if (location.hash === '#/' || !location.hash) done && done(); else location.hash = '#/';
  });
}

/* ---------- Assistent: neue Rolle ---------- */
const WIZ_KEY = 'kb-wizard';
function wizLoad() { try { return JSON.parse(sessionStorage.getItem(WIZ_KEY)) || {}; } catch (_) { return {}; } }
function wizSave(w) { try { sessionStorage.setItem(WIZ_KEY, JSON.stringify(w)); } catch (_) {} }

async function viewNewRoll(step) {
  setTab('rollen');
  const wiz = wizLoad();
  if (step === 2 && !wiz.stockId) { location.replace('#/rolle/neu'); return; }
  if (step === 1) return wizardStep1(wiz);
  return wizardStep2(wiz);
}

function steps() { return ''; }
const NEXT_BTN = (id, label, disabled) => `<button class="nextarrow" id="${id}" aria-label="${label}" ${disabled ? 'disabled' : ''}>${ART.arrow}</button>`;

async function wizardStep1(wiz, root = view) {
  if (root === view) setHeader('Film einlegen');
  const stocks = (await DB.all('stocks')).sort((a, b) => U.stockLabel(a).localeCompare(U.stockLabel(b)));
  const cams = gearSort((await DB.all('cameras')).filter(c => !c.broken && !c.inactive), camSortFb);
  if (wiz.cameraId && !cams.some(c => c.id === wiz.cameraId)) wiz.cameraId = null;
  wiz.format = wiz.format || '135';
  if ((wiz.format === 'half' || wiz.format === 'gross') && !cams.some(c => c.format === wiz.format)) wiz.format = '135';
  const camCards = await Promise.all(cams.map(async c => `
    <button type="button" class="pick cam${wiz.cameraId === c.id ? ' on' : ''}" data-cam="${c.id}" data-format="${c.format}">
      <span class="pickart">${await camArt(c, 104)}</span>
      <span class="pickname">${U.esc(camLabel(c))}</span>
    </button>`));
  const fridge = sortFridge((await DB.all('fridge')).filter(e => (e.count || 0) > 0), new Map(stocks.map(x => [x.id, x])), 'expiry');
  const rows = await Promise.all(fridge.map(e => fridgeRow(e, stocks.find(x => x.id === e.stockId), { pick: true, on: wiz.fridgeId === e.id })));
  let chosenOther = wiz.stockId && !wiz.fridgeId ? stocks.find(x => x.id === wiz.stockId) : null;
  if (chosenOther && chosenOther.formats && wiz.format !== 'gross' && !chosenOther.formats.includes(filmFmt(wiz.format))) { chosenOther = null; wiz.stockId = null; }
  root.innerHTML = `
    ${steps(1)}
    <section class="wizsec">
      <h2 class="wiztitle">Kamera</h2>
      <div class="seggroup fmtpick" id="fmt">
        <button type="button" class="seg${wiz.format === '135' ? ' on' : ''}" data-fmt="135" aria-label="Kleinbild">${ART.fmt135}<span>135</span></button>
        <button type="button" class="seg${wiz.format === '120' ? ' on' : ''}" data-fmt="120" aria-label="Mittelformat">${ART.fmt120}<span>120</span></button>
        ${cams.some(c => c.format === 'half') ? `<button type="button" class="seg${wiz.format === 'half' ? ' on' : ''}" data-fmt="half" aria-label="Halbformat">${ART.fmtHalf}<span>Halb</span></button>` : ''}
        ${cams.some(c => c.format === 'gross') ? `<button type="button" class="seg${wiz.format === 'gross' ? ' on' : ''}" data-fmt="gross" aria-label="Großformat">${ART.fmtGross}<span>Groß</span></button>` : ''}
      </div>
      <div class="picks" id="cams">${camCards.join('')}</div>
    </section>
    <section class="wizsec" id="filmSec">
      <h2 class="wiztitle">Film</h2>
      <div class="fridgecard">
        <div class="fchead">
          <span class="fridgeicon" aria-hidden="true">${SNOW}</span>
          <span class="fctitle" id="fcTitle">${fridge.length ? 'Aus dem Filmkühlschrank' : 'Dein Filmkühlschrank ist leer.'}</span>
          ${fridge.length ? '<input type="search" placeholder=" " id="qFridge" aria-label="Filme im Kühlschrank durchsuchen" autocomplete="off">' : ''}
        </div>
        ${fridge.length ? `<div class="flist" id="fridgeList">${rows.join('')}</div>
        <p class="hint" id="fridgeNone" hidden>Kein passender Film im Kühlschrank für dieses Format.</p>` : ''}
      </div>
      <button type="button" class="newfilm small${chosenOther ? ' on' : ''}" id="newFilm">
        <span class="plusbox">${chosenOther ? await filmArt(chosenOther, 40) : '+'}</span>
        <span><b>${chosenOther ? U.esc(U.stockLabel(chosenOther)) : 'Neuen Film anlegen'}</b>${chosenOther ? '<br><span class="sub2">Nicht aus dem Kühlschrank</span>' : '<span class="sub2"></span>'}</span>
      </button>
    </section>
    <section class="wizsec" id="expSec">
      <h2 class="wiztitle">Anzahl Frames</h2>
      <div class="chips" id="exp"></div>
    </section>
    <section class="wizsec">
      <label class="fld"><span>Name der Rolle</span><input id="rollTitle" maxlength="80" value="${U.esc(wiz.title || '')}" enterkeyhint="done" required aria-required="true"></label>
      <label class="fld"><span>Eingelegt am</span><input type="date" id="loadedAt" value="${wiz.loadedAt || U.today()}"></label>
    </section>
    <div class="wizfoot"><p class="hint namehint" id="nameHint" hidden>Gib der Rolle noch einen Namen.</p>${NEXT_BTN('next', 'Film in die Kamera legen', true)}</div>`;
  const renderExp = () => {
    const cam = cams.find(c => c.id === wiz.cameraId);
    const options = expOptions(wiz, cam);
    // Mittelformat: Anzahl steht durch die Kamera fest, daher kein freies Feld
    root.querySelector('#exp').innerHTML = wiz.format === '120'
      ? (options.length ? options.map(n => `<button type="button" class="chip on" data-n="${n}">${n}</button>`).join('') : '<p class="hint">Wähle zuerst eine Kamera.</p>')
      : `${options.map(n => `<button type="button" class="chip${n === '36+1' ? ' bonuschip' : ''}${wiz.expChoice === n ? ' on' : ''}" data-n="${n}">${n}</button>`).join('')}
      <input type="number" id="expN" min="1" max="99" inputmode="numeric" class="chip-input" aria-label="Freie Anzahl" value="${!wiz.expChoice || options.includes(wiz.expChoice) ? '' : U.esc(wiz.expChoice)}">`;
  };
  renderExp();
  root.querySelector('#exp').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    wiz.expChoice = b.dataset.n; const en = root.querySelector('#expN'); if (en) en.value = '';
    root.querySelectorAll('#exp .chip').forEach(c => c.classList.toggle('on', c === b));
    wizSave(wiz); refresh();
  });
  root.querySelector('#exp').addEventListener('input', e => {
    if (e.target.id !== 'expN') return;
    wiz.expChoice = e.target.value ? String(Math.max(1, Math.min(99, parseInt(e.target.value) || 0))) : '';
    root.querySelectorAll('#exp .chip').forEach(c => c.classList.remove('on'));
    wizSave(wiz); refresh();
  });
  root.querySelector('#loadedAt').addEventListener('input', e => { wiz.loadedAt = e.target.value; wizSave(wiz); });
  root.querySelector('#rollTitle').addEventListener('input', e => { wiz.title = e.target.value; wizSave(wiz); refresh(); });

  const filter = (box, q, extra) => box && box.querySelectorAll('[data-q]').forEach(el => {
    el.hidden = !(el.dataset.q.includes(q.toLowerCase().trim()) && (!extra || extra(el)));
  });
  const fmtOk = el => el.dataset.format === wiz.format;   // Kameras: genau das Aufnahmeformat
  const filmOk = el => el.dataset.format === filmFmt(wiz.format);   // Filme im Kühlschrank: passender Film
  const refresh = () => {
    filter(root.querySelector('#fridgeList'), root.querySelector('#qFridge')?.value || '', filmOk);
    const fl = root.querySelector('#fridgeList');
    if (fl) {
      const any = [...fl.children].some(x => !x.hidden), q = (root.querySelector('#qFridge')?.value || '').trim();
      const forFmt = [...fl.children].some(x => x.dataset.format === filmFmt(wiz.format));
      const none = root.querySelector('#fridgeNone');
      root.querySelector('#qFridge').hidden = !forFmt;
      fl.hidden = !forFmt;
      root.querySelector('#fcTitle').textContent = forFmt ? 'Aus dem Filmkühlschrank' : 'Dein Filmkühlschrank ist leer.';
      none.hidden = any || !forFmt;
      none.textContent = 'Ups, der Film liegt noch nicht im Kühlschrank.';
    }
    root.querySelectorAll('#cams [data-cam]').forEach(el => { el.hidden = !fmtOk(el); });
    // Einlegen nur mit Film, Anzahl und Rollennamen
    const named = !!(wiz.title || '').trim(), ready = !!(wiz.stockId && parseInt(wiz.expChoice) > 0);
    root.querySelector('#next').disabled = !(ready && named);
    root.querySelector('#nameHint').hidden = !(ready && !named);
  };
  const toNext = () => root.querySelector('#expSec').scrollIntoView({ behavior: 'smooth', block: 'center' });
  const toFilm = () => root.querySelector('#filmSec').scrollIntoView({ behavior: 'smooth', block: 'start' });
  const dropMismatch = () => {
    if (wiz.fridgeId) { const fe = root.querySelector(`[data-fridge="${wiz.fridgeId}"]`); if (fe && fe.dataset.format !== filmFmt(wiz.format)) { wiz.fridgeId = null; wiz.stockId = null; fe.classList.remove('on'); } }
  };
  root.querySelector('#qFridge')?.addEventListener('input', refresh);
  root.querySelector('#fmt').addEventListener('click', e => {
    const b = e.target.closest('[data-fmt]'); if (!b) return;
    wiz.format = b.dataset.fmt;
    const cam = cams.find(c => c.id === wiz.cameraId);
    if (cam && cam.format !== wiz.format) { wiz.cameraId = null; root.querySelectorAll('[data-cam]').forEach(x => x.classList.remove('on')); }
    root.querySelectorAll('#fmt .seg').forEach(s => s.classList.toggle('on', s === b));
    dropMismatch(); renderExp(); wizSave(wiz); refresh();
  });
  root.querySelector('#fridgeList')?.addEventListener('click', e => {
    const b = e.target.closest('[data-fridge]'); if (!b) return;
    wiz.stockId = b.dataset.stock; wiz.fridgeId = b.dataset.fridge;
    root.querySelectorAll('[data-fridge]').forEach(x => x.classList.toggle('on', x === b));
    const nf = root.querySelector('#newFilm'); nf.classList.remove('on');
    nf.querySelector('.plusbox').textContent = '+';
    nf.querySelector('b').textContent = 'Neuen Film anlegen';
    nf.querySelector('.sub2').textContent = '';
    wizSave(wiz); refresh(); toNext();
  });
  root.querySelector('#newFilm').addEventListener('click', () => openStockPicker(async stockId => {
    wiz.stockId = stockId; wiz.fridgeId = null; wizSave(wiz);
    await wizardStep1(wiz, root);
    setTimeout(() => root.querySelector('#filmSec').scrollIntoView({ block: 'start' }), 50);
  }, wiz.format === 'gross' ? null : filmFmt(wiz.format)));
  root.querySelector('#cams').addEventListener('click', e => {
    const b = e.target.closest('[data-cam]'); if (!b) return;
    const on = wiz.cameraId === b.dataset.cam ? null : b.dataset.cam;
    wiz.cameraId = on;
    root.querySelectorAll('[data-cam]').forEach(x => x.classList.toggle('on', x.dataset.cam === on));
    dropMismatch(); renderExp(); wizSave(wiz); refresh();
    if (on) toFilm();
  });
  root.querySelector('#next').addEventListener('click', async e => { e.currentTarget.disabled = true; wizSave(wiz); await createRoll(wiz, root.querySelector('#loadedAt').value); });
  refresh();
}

async function wizardStep2(wiz) { location.replace('#/rolle/neu'); }

// Aufnahmen: Kleinbild 24, 36, 36+1 (Bonusbild am Rollenanfang) oder frei. Mittelformat: Bildzahl der Kamera oder frei.
// Mittelformat: Bilder pro Rolle aus der Kamera, sonst aus dem Bildformat (120er-Rolle: 6×4,5 → 15, 6×6 → 12, 6×7 → 10, 6×8 → 9, 6×9 → 8)
function framesFor120(cam) {
  if (!cam) return 0;
  if (parseInt(cam.frames) > 0) return parseInt(cam.frames);
  const m = String(cam.frameSize || '').replace(',', '.').match(/6\s*[×x]\s*([\d.]+)/);
  const table = { '4.5': 15, '6': 12, '7': 10, '8': 9, '9': 8, '12': 6, '17': 4 };
  return m ? (table[m[1]] || 0) : 12;
}
function expOptions(wiz, cam) {
  const is120 = wiz.format === '120';
  const n120 = is120 ? framesFor120(cam) : 0;
  // Halbformat: doppelt so viele Bilder wie die Kleinbildrolle. Großformat: Planfilmblätter.
  const options = is120 ? (n120 ? [String(n120)] : []) : wiz.format === 'half' ? ['48', '72'] : wiz.format === 'gross' ? ['1', '2', '4', '10'] : ['24', '36', '36+1'];
  const key = wiz.format + (wiz.cameraId || '');
  if (is120) { wiz.expChoice = n120 ? String(n120) : ''; wiz.expFor = key; }
  else if (!wiz.expChoice || wiz.expFor !== key) { wiz.expChoice = wiz.format === 'half' ? '72' : wiz.format === 'gross' ? '2' : '36'; wiz.expFor = key; }
  return options;
}

async function createRoll(wiz, loadedAt) {
  if (!(wiz.title || '').trim()) { U.toast('Gib der Rolle einen Namen'); return; }
  const stock = await DB.get('stocks', wiz.stockId);
  const cam = wiz.cameraId ? await DB.get('cameras', wiz.cameraId) : null;
  const n = parseInt(wiz.expChoice);
  const bonus = wiz.expChoice === '36+1';
  const roll = {
    id: U.uid(), stockId: wiz.stockId, cameraId: wiz.cameraId || null, camera: camLabel(cam),
    format: wiz.format, exposures: n, bonus, ei: null, loadedAt: loadedAt || U.today(), title: (wiz.title || '').trim(),
    status: 'entwurf', dev: { mode: 'labor' }, createdAt: new Date().toISOString()
  };
  const frames = [];
  if (bonus) frames.push({ id: U.uid(), rollId: roll.id, index: 0, bonus: true });
  for (let i = 1; i <= n; i++) frames.push({ id: U.uid(), rollId: roll.id, index: i });
  if (wiz.fridgeId) {
    const fe = await DB.get('fridge', wiz.fridgeId);
    if (fe) {
      roll.fridge = { boughtAt: fe.boughtAt || null, expiresAt: fe.expiresAt || null };
      fe.count = Math.max(0, (fe.count || 1) - 1);
      await DB.put('fridge', fe);
    }
  }
  await DB.put('rolls', roll);
  await DB.putMany('frames', frames);
  try { sessionStorage.removeItem(WIZ_KEY); } catch (_) {}
  FX.film(stock);
  FX.rollName(roll.title);
  if (!wiz.fridgeId) askFilmPrice(roll, stock); else { U.toast('Film eingelegt'); location.replace('#/rolle/' + roll.id); }
}

// Neuer Film (nicht aus dem Kühlschrank): Preis verbuchen?
function askFilmPrice(roll, stock) {
  const ov = document.createElement('div');
  ov.className = 'modalbg';
  ov.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="fpTitle">
      <h2 id="fpTitle">Preis verbuchen?</h2>
      <p class="hint">${U.esc(U.stockLabel(stock))} kam nicht aus dem Kühlschrank.</p>
      <label class="fld"><span>Preis (€)</span><input id="fpPrice" inputmode="decimal"></label>
      <div class="modalfoot">
        <button class="closex" id="fpNo" aria-label="Nicht verbuchen">${ART.x}</button>
        <button class="btn accent" id="fpYes" disabled>Verbuchen</button>
      </div>
    </div>`;
  document.body.appendChild(ov);
  const inp = ov.querySelector('#fpPrice'), yes = ov.querySelector('#fpYes');
  inp.addEventListener('input', () => { yes.disabled = isNaN(parseFloat(inp.value.replace(',', '.'))); });
  const finish = (msg = 'Film eingelegt') => { ov.remove(); U.toast(msg); location.replace('#/rolle/' + roll.id); };
  ov.querySelector('#fpNo').addEventListener('click', () => finish());
  yes.addEventListener('click', async () => {
    roll.filmCost = Math.round(parseFloat(inp.value.replace(',', '.')) * 100) / 100;
    await DB.put('rolls', roll);
    finish('Film eingelegt, Preis verbucht');
  });
  setTimeout(() => inp.focus(), 50);
}

const TRASH_BTN = id => `<button class="trashbtn" data-delroll="${id}" aria-label="Rolle löschen" title="Rolle löschen"><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M4.5 7h15M9.5 7V4.8h5V7M6.5 7l1 12.2h9L17.5 7M10.3 10.5v5.7M13.7 10.5v5.7" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;

// Rolle löschen mit Sicherheitsabfrage
async function confirmDeleteRoll(rollId) {
  const roll = await DB.get('rolls', rollId); if (!roll) return;
  const stock = await DB.get('stocks', roll.stockId);
  const fr = await framesOf(rollId);
  const scans = fr.filter(f => f.imgId).length;
  const ov = document.createElement('div');
  ov.className = 'modalbg';
  ov.innerHTML = `
    <div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="drTitle">
      <h2 id="drTitle">Rolle wirklich löschen?</h2>
      <p>${U.esc(roll.title || U.stockLabel(stock))}${roll.loadedAt ? ', eingelegt am ' + U.fmtDate(roll.loadedAt) : ''}.</p>
      <p class="hint">Gelöscht werden alle Bilder${scans ? ` (${scans} Fotos)` : ''}, Handyfotos, Notizen und der Abholschein. Das lässt sich nicht rückgängig machen.</p>
      <div class="modalfoot">
        <button class="closex" id="drNo" aria-label="Abbrechen">${ART.x}</button>
        <button class="btn danger" id="drYes">Endgültig löschen</button>
      </div>
    </div>`;
  document.body.appendChild(ov);
  const close = () => ov.remove();
  ov.querySelector('#drNo').addEventListener('click', close);
  ov.addEventListener('click', e => { if (e.target === ov) close(); });
  ov.querySelector('#drYes').addEventListener('click', async () => {
    for (const f of fr) { await deleteImage(f.imgId); await deleteImage(f.phoneId); await deleteImage(f.phoneId2); await DB.del('frames', f.id); }
    await deleteImage(roll.dev?.slipId);
    await DB.del('rolls', roll.id);
    close(); U.toast('Rolle gelöscht');
    if (location.hash === '#/' || !location.hash) route(); else location.replace('#/');
  });
}
document.addEventListener('click', e => { const b = e.target.closest('[data-delroll]'); if (b) { e.preventDefault(); confirmDeleteRoll(b.dataset.delroll); } });

/* ---------- Rolle ---------- */
async function viewRoll(id, tab) {
  setTab('rollen');
  const roll = await DB.get('rolls', id);
  if (!roll) { location.replace('#/'); return; }
  const stock = await DB.get('stocks', roll.stockId);
  const cam = roll.cameraId ? await DB.get('cameras', roll.cameraId) : null;
  setHeader(roll.title || U.stockLabel(stock));
  // In der Kamera gibt es noch nichts zu entwickeln: nur Bilder und Rolle. Ab „In Entwicklung“ alle Reiter.
  const inCam = (roll.status || 'entwurf') === 'entwurf';
  const tabs = inCam ? [['bilder', 'Bilder'], ['info', 'Rolle']] : [['bilder', 'Bilder'], ['entwicklung', 'Entwicklung'], ['info', 'Rolle']];
  if (inCam && tab === 'entwicklung') tab = 'bilder';
  view.innerHTML = `
    <div class="rollhead">
      <div class="rh-art">${await filmArt(stock, 52)}${cam ? await camArt(cam, 66) : ''}${rollIrFilters(roll, await framesOf(roll.id), await getFilters()).map(f => filterArt(f, 38)).join('')}</div>
      <div class="rh-txt"><b>${U.esc(U.stockLabel(stock))}</b><br><span class="sub2">EI ${U.esc(roll.ei || stock?.boxIso || '?')}${camLabel(cam) || roll.camera ? ' · ' + U.esc(camLabel(cam) || roll.camera) : ''}</span>
        <br><span class="stagebadge st-${roll.status || 'entwurf'}">${STATUS[roll.status || 'entwurf'].label}</span></div>
      ${TRASH_BTN(roll.id).replace('class="trashbtn"', 'class="trashbtn big"')}
    </div>
    <div class="tabs">${tabs.map(([k, t]) => `<a class="tab${tab === k ? ' on' : ''}" href="#/rolle/${id}/${k}">${t}</a>`).join('')}</div>
    <div id="rollbody"></div>`;
  const body = view.querySelector('#rollbody');
  if (tab === 'entwicklung') return rollDev(body, roll, stock);
  if (tab === 'info') return rollInfo(body, roll);
  return rollFrames(body, roll, stock);
}

// Lightleaks: bei Kameras mit Lichteinfall bekommt etwa jedes dritte bis vierte Bild in der Vorschau einen Leak.
// Welche Bilder und welche Form, ergibt sich fest aus der Rolle, damit es bei jedem Öffnen gleich aussieht.
function leakMap(roll, frames) {
  const m = new Map();
  let h = 2166136261; for (const c of String(roll.id)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  const rnd = () => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return h / 4294967296; };
  let next = 1 + Math.floor(rnd() * 3);
  frames.forEach((f, i) => { if (i === next) { m.set(f.id, 1 + Math.floor(rnd() * 4)); next = i + 3 + (rnd() < .5 ? 0 : 1); } });
  return m;
}
async function frameCell(f, leak = 0) {
  const u = f.imgId ? await U.imgUrl(f.imgId, true) : null;
  const pu = !u && f.phoneId ? await U.imgUrl(f.phoneId, true) : null;
  const flags = [f.double ? ART.double : '', f.phoneId && u ? '<span>▣</span>' : '', f.leak ? '<span class="leakdot" title="Lightleak" aria-label="Lightleak"></span>' : ''].join('');
  return `<a class="cell${u ? ' has' : ''}${pu ? ' phoneprev' : ''}${f.shot ? ' shot' : ''}${f.bonus ? ' bonus' : ''}${leak ? ' leak l' + leak : ''}" href="#/bild/${f.id}">
    ${pu ? `<img src="${pu}" alt="" class="phoneimg"><span class="phonetag">Handy</span><span class="idx">${frameLabel(f)}</span>` : ''}
    ${u ? `<img src="${u}" alt="">` : pu ? '' : `<div class="ph"><span class="num">${frameLabel(f)}</span>${f.note ? `<span class="pn">${U.esc(f.note.slice(0, 40))}</span>` : ''}${!f.note && (f.aperture || f.shutter) ? `<span class="pn">${f.aperture ? 'f/' + U.esc(f.aperture) : ''} ${U.esc(f.shutter || '')}</span>` : ''}</div>`}
    ${u ? `<span class="idx">${frameLabel(f)}</span>` : ''}
    ${flags ? `<span class="flags">${flags}</span>` : ''}
  </a>`;
}

async function rollFrames(body, roll, stock) {
  const fr = await framesOf(roll.id);
  const st = roll.status || 'entwurf';
  const rcam = roll.cameraId ? await DB.get('cameras', roll.cameraId) : null;
  // Simulierte Lightleaks nur, solange die Rolle in der Kamera ist; danach zeigen die Scans, ob es welche gibt
  const leaks = rcam?.lightLeaks && !roll.leaksMarked && (roll.status || 'entwurf') === 'entwurf' ? leakMap(roll, fr) : new Map();
  const cells = await Promise.all(fr.map(f => frameCell(f, leaks.get(f.id) || 0)));
  const hasImgs = fr.some(f => f.imgId);
  let top = '', bottom = '';
  if (st === 'entwurf') {
    bottom = `<div class="modewrap"><div class="slidebtn to-dev" id="devSlide">
      <span class="slidelabel">In Entwicklung geben</span>
      <button class="slideknob" aria-label="In Entwicklung geben (zum Bestätigen nach rechts schieben)">${ART.arrow}</button>
    </div></div>`;
  } else if (st === 'belichtet') {
    const slip = roll.dev?.slipId ? await U.imgUrl(roll.dev.slipId, true) : null;
    top = `<div class="devcard">
      <div><b>In Entwicklung</b><br><span class="sub2">${roll.dev?.mode === 'selbst' ? 'Selbst entwickeln' : U.esc(roll.dev?.lab || 'Labor')}${roll.dev?.sentAt ? ' · abgegeben ' + U.fmtDate(roll.dev.sentAt) : ''}</span></div>
      ${slip ? `<img src="${slip}" class="slipthumb zoomable" alt="Abholschein">` : ''}
    </div>`;
    bottom = modeBtn('pickupOpen', ART.up, roll.dev?.mode === 'selbst' ? 'Scans hochladen' : 'Abgeholt: Fotos hochladen', '', 'to-album');
  } else {
    if (hasImgs) top = `<div class="modewrap"><a class="modebtn open-album" href="#/album/${roll.id}"><span class="mbicon">${ART.album}</span><span>Fotoalbum ansehen</span></a></div>`;
    bottom = `<label class="btn ghost wide">Weitere Fotos hinzufügen<input type="file" accept="image/*" multiple hidden id="bulk"></label>`;
  }
  body.innerHTML = `
    ${top}
    <div class="reorderbar" id="reorderBar">
      <div class="reordertools" hidden>
        <p class="hint">Halte ein Bild gedrückt und ziehe es an die richtige Stelle. Alles dazwischen rückt nach. Oder verschiebe alle Einträge auf einmal.</p>
        <div class="row gap" style="padding:0">
          <button type="button" class="btn ghost small" id="shiftBack">‹ Alle eins nach vorne</button>
          <button type="button" class="btn ghost small" id="shiftFwd">Alle eins nach hinten ›</button>
        </div>
        <div class="row gap" style="padding:0;margin-top:6px">
          <button type="button" class="btn ghost small" id="reorderUndo" disabled>Rückgängig</button>
          <button type="button" class="btn accent small" id="reorderOff">Fertig</button>
        </div>
      </div>
    </div>
    <div class="grid" id="frameGrid">${cells.join('')}</div>
    ${bottom}`;
  const reorder = setupReorder(body, roll, fr);
  const slide = body.querySelector('#devSlide');
  if (slide) setupSlide(slide, () => openDevModal(roll, () => route()));
  body.querySelector('#pickupOpen')?.addEventListener('click', () => openPickupModal(roll, () => route()));
  body.querySelector('.slipthumb')?.addEventListener('click', e => zoom(e.target.src));
  // Handyfotos zuordnen: Standortsymbol oben rechts in der Reiterzeile, links neben „Verschieben“
  const tabsRow = document.querySelector('.tabs');
  tabsRow?.querySelector('#phoneImpBtn')?.remove();
  const imp = document.createElement('label');
  imp.id = 'phoneImpBtn'; imp.className = 'reorderbtn phoneimpbtn'; imp.setAttribute("aria-label", "Referenzfotos hochladen: Ort und Zeit übernehmen"); imp.title = "Referenzfotos hochladen: Ort und Zeit übernehmen";
  imp.innerHTML = REF_IMP_IC + '<input type="file" accept="image/*" multiple hidden id="phoneImp">';
  if (tabsRow) { const ro = tabsRow.querySelector('#reorderOn'); ro ? tabsRow.insertBefore(imp, ro) : tabsRow.appendChild(imp); }
  imp.querySelector('#phoneImp').addEventListener('change', e => { const files = [...e.target.files]; e.target.value = ''; if (files.length) openPhoneImport(roll, files); });
  const grid = body.querySelector('#frameGrid');
  // Langes Drücken auf einen Frame: dessen Einstellungen auf andere Frames übertragen
  let lp = null, lpFired = false;
  grid.addEventListener('pointerdown', e => {
    const c = e.target.closest('.cell'); if (!c || grid.classList.contains('reorder')) return;
    const x0 = e.clientX, y0 = e.clientY;
    lp = { t: setTimeout(() => { lp = null; lpFired = true; U.haptic && U.haptic(15); const f = fr[[...grid.querySelectorAll('.cell')].indexOf(c)]; if (f) openFramePop(c, f); }, 520), x0, y0 };
  });
  const lpCancel = e => { if (!lp) return; if (e.type === 'pointermove' && Math.hypot(e.clientX - lp.x0, e.clientY - lp.y0) < 9) return; clearTimeout(lp.t); lp = null; };
  ['pointermove', 'pointerup', 'pointercancel'].forEach(ev => grid.addEventListener(ev, lpCancel));
  grid.addEventListener('contextmenu', e => { if (e.target.closest('.cell')) e.preventDefault(); });
  // Zwei runde Symbole ploppen am Frame auf: Verschieben (Reihenfolge ändern) und Einstellungen übertragen
  const openFramePop = (c, f) => {
    document.querySelector('.framepop')?.remove();
    const pop = document.createElement('div'); pop.className = 'framepop';
    pop.innerHTML = `<button type="button" class="fpbtn" data-act="move" aria-label="Reihenfolge ändern">${MOVE_IC}</button><button type="button" class="fpbtn" data-act="copy" aria-label="Einstellungen von Frame ${U.esc(frameLabel(f))} übertragen">${COPY_IC}</button>`;
    // unten rechts, wo sonst der Haken sitzt; der gedrückte Frame bleibt markiert, solange die Symbole offen sind
    c.classList.add('lpsel');
    document.body.appendChild(pop);
    const close = () => { pop.remove(); c.classList.remove('lpsel'); document.removeEventListener('pointerdown', away, true); window.removeEventListener('scroll', close); window.removeEventListener('hashchange', close); };
    const away = ev => { if (!pop.contains(ev.target)) close(); };
    setTimeout(() => { document.addEventListener('pointerdown', away, true); window.addEventListener('scroll', close, { once: true }); window.addEventListener('hashchange', close, { once: true }); }, 0);
    pop.addEventListener('click', ev => { const b = ev.target.closest('[data-act]'); if (!b) return; close(); U.haptic && U.haptic(10); if (b.dataset.act === 'move') reorder && reorder(true); else openCopySettings(roll, f, fr); });
  };
  grid.addEventListener('click', e => { if (lpFired) { lpFired = false; e.preventDefault(); e.stopPropagation(); } }, true);
  body.querySelector('#bulk')?.addEventListener('change', async e => {
    const files = [...e.target.files];
    if (!files.length) return;
    const n = await assignScans(roll, files);
    if ((roll.status || 'entwurf') === 'belichtet') {
      roll.status = 'entwickelt';
      roll.dev = roll.dev || {};
      if (!roll.dev.backAt && !roll.dev.devDate) roll.dev[roll.dev.mode === 'selbst' ? 'devDate' : 'backAt'] = U.today();
      await DB.put('rolls', roll);
    }
    U.toast(`${n} ${n === 1 ? 'Foto' : 'Fotos'} hochgeladen`);
    if (await queueLeakPick(roll)) { location.hash = '#/album/' + roll.id; return; }
    route();
  });
}

// Einstellungen eines Frames auf andere übertragen: Was übernommen wird, ist vorausgewählt und abwählbar; Ziel-Frames antippen, Haken
async function openCopySettings(roll, src, fr) {
  const lens = src.lensId ? await DB.get('lenses', src.lensId) : null;
  const filters = src.filterIds?.length ? (await getFilters()).filter(f => src.filterIds.includes(f.id)) : [];
  const fields = [
    ['aperture', src.aperture ? 'f/' + String(src.aperture).replace(/^f\//, '').replace('.', ',') : '', true],
    ['shutter', src.shutter ? (/^\d+$/.test(src.shutter) ? src.shutter + ' s' : src.shutter) : '', true],
    ['lensId', lens ? lensLabel(lens) : '', true],
    ['filterIds', filters.length ? filters.map(filterShort).join(', ') : '', true],
    ['flash', src.flash ? 'Blitz' : '', true],
    ['iso', src.iso ? 'ISO ' + src.iso : '', true],
    ['place', src.place || '', false]
  ].filter(x => x[1]);
  const ov = document.createElement('div'); ov.className = 'modalbg';
  if (!fields.length) { U.toast(`Frame ${frameLabel(src)} hat noch keine Einstellungen`); return; }
  const on = new Set(fields.filter(x => x[2]).map(x => x[0])), to = new Set();
  ov.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="cpTitle">
    <h2 id="cpTitle">Frame ${U.esc(frameLabel(src))} übertragen</h2>
    <div class="chipwrap" id="cpF">${fields.map(([k, t]) => `<button type="button" class="chip${on.has(k) ? ' on' : ''}" data-k="${k}" aria-pressed="${on.has(k)}">${U.esc(t)}</button>`).join('')}</div>
    <div class="qlabel">auf</div>
    <div class="cpgrid" id="cpT">${fr.filter(f => f.id !== src.id).map(f => `<button type="button" class="cpfr${f.shot || f.aperture || f.shutter ? ' used' : ''}" data-id="${f.id}" aria-pressed="false">${U.esc(frameLabel(f))}</button>`).join('')}</div>
    <div class="modalfoot"><button class="closex" id="cpNo" aria-label="Abbrechen">${ART.x}</button><button class="okbtn" id="cpOk" aria-label="Übertragen" disabled>${ART.check}</button></div></div>`;
  document.body.appendChild(ov);
  const ok = ov.querySelector('#cpOk'), check = () => { ok.disabled = !on.size || !to.size; };
  ov.querySelector('#cpF').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; on.has(b.dataset.k) ? on.delete(b.dataset.k) : on.add(b.dataset.k); b.classList.toggle('on', on.has(b.dataset.k)); b.setAttribute('aria-pressed', on.has(b.dataset.k)); check(); });
  ov.querySelector('#cpT').addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (!b) return; to.has(b.dataset.id) ? to.delete(b.dataset.id) : to.add(b.dataset.id); b.classList.toggle('on', to.has(b.dataset.id)); b.setAttribute('aria-pressed', to.has(b.dataset.id)); U.haptic && U.haptic(8); check(); });
  ov.querySelector('#cpNo').onclick = () => ov.remove();
  ok.onclick = async () => {
    for (const id of to) {
      const f = await DB.get('frames', id); if (!f) continue;
      if (on.has('aperture')) f.aperture = src.aperture;
      if (on.has('shutter')) f.shutter = src.shutter;
      if (on.has('lensId')) f.lensId = src.lensId;
      if (on.has('filterIds')) f.filterIds = [...src.filterIds];
      if (on.has('flash')) { f.flash = src.flash; if (src.flashId) f.flashId = src.flashId; else delete f.flashId; }
      if (on.has('iso')) f.iso = src.iso;
      if (on.has('place')) for (const k of ['place', 'placeLat', 'placeLng', 'placeCC', 'placeSrc', 'placeNameAuto']) { if (src[k] != null) f[k] = src[k]; else delete f[k]; }
      await DB.put('frames', f);
    }
    ov.remove(); U.toast(`Auf ${to.size} ${to.size === 1 ? 'Frame' : 'Frames'} übertragen`); U.haptic && U.haptic([12, 40, 12]);
    const y = window.scrollY; await route(); window.scrollTo(0, y);
  };
}

// Lightleak-Kamera: nach dem Hochladen öffnet das Album die Auswahl der Bilder mit Lightleaks
async function queueLeakPick(roll) {
  const cam = roll.cameraId ? await DB.get('cameras', roll.cameraId) : null;
  if (!cam?.lightLeaks) return false;
  try { sessionStorage.setItem('kb-leakpick', roll.id); } catch (_) {}
  return true;
}
async function openLeakPicker(roll, done) {
  const fr = (await framesOf(roll.id)).filter(f => f.imgId);
  if (!fr.length) return;
  const cam = roll.cameraId ? await DB.get('cameras', roll.cameraId) : null;
  const thumbs = await Promise.all(fr.map(f => U.imgUrl(f.imgId, true)));
  const on = new Set(fr.filter(f => f.leak).map(f => f.id));
  const ov = document.createElement('div');
  ov.className = 'modalbg';
  ov.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="lkTitle">
      <h2 id="lkTitle">Welche Fotos haben Lightleaks?</h2>
      <p class="hint">${U.esc(camLabel(cam) || 'Die Kamera')} hat Lightleaks. Tippe die Fotos an, auf denen wirklich Licht eingefallen ist.</p>
      <div class="leakgrid" id="lkGrid">${fr.map((f, i) => `<button type="button" class="leakpick${on.has(f.id) ? ' on' : ''}" data-id="${f.id}" aria-pressed="${on.has(f.id)}" aria-label="Bild ${frameLabel(f)}"><img src="${thumbs[i]}" alt=""><span class="lkidx">${frameLabel(f)}</span><span class="lkmark">${ART.check}</span></button>`).join('')}</div>
      <p class="hint" id="lkCount"></p>
      <div class="modalfoot"><button class="closex" id="lkNo" aria-label="Später">${ART.x}</button><button class="okbtn" id="lkOk" aria-label="Speichern">${ART.check}</button></div>
    </div>`;
  document.body.appendChild(ov);
  const count = () => { ov.querySelector('#lkCount').textContent = on.size ? `${on.size} ${on.size === 1 ? 'Bild' : 'Bilder'} mit Lightleak` : 'Kein Bild markiert'; };
  count();
  ov.querySelector('#lkGrid').addEventListener('click', e => {
    const b = e.target.closest('[data-id]'); if (!b) return;
    on.has(b.dataset.id) ? on.delete(b.dataset.id) : on.add(b.dataset.id);
    b.classList.toggle('on', on.has(b.dataset.id)); b.setAttribute('aria-pressed', on.has(b.dataset.id));
    U.haptic && U.haptic(); count();
  });
  const close = () => ov.remove();
  ov.querySelector('#lkNo').addEventListener('click', close);
  ov.addEventListener('click', e => { if (e.target === ov) close(); });
  ov.querySelector('#lkOk').addEventListener('click', async () => {
    for (const f of fr) { const v = on.has(f.id); if (!!f.leak !== v) { f.leak = v; await DB.put('frames', f); } }
    roll.leaksMarked = true; await DB.put('rolls', roll);
    close(); U.toast(on.size ? `${on.size} ${on.size === 1 ? 'Lightleak' : 'Lightleaks'} vermerkt` : 'Keine Lightleaks vermerkt');
    done && done();
  });
}

// Infrarotfilter einer Rolle: in einem Bild gewählt oder zuletzt für die Rolle gewählt
function rollIrFilters(roll, frames, filters) {
  const ids = new Set([...(roll.lastFilterIds || []), ...frames.flatMap(f => f.filterIds || [])]);
  return filters.filter(f => ids.has(f.id) && isIrFilter(f));
}

const SEARCH_IC = '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 20 20"/></svg>';
/* Filtersuche in der Bildansicht: Lupe oben, darunter gewählte und zuletzt in der Rolle benutzte Filter, beim Tippen alle Treffer.
   Antippen wählt oder entfernt einen Filter, der Haken übernimmt. */
function openFrameFilterSearch(filters, chosen, roll, onDone, onCancel) {
  let pick = [...chosen];
  const recent = new Set(roll?.lastFilterIds || []);
  const hay = f => [filterCode(f), f.code, filterName(f), f.notes, ...(f.colors || []).map(c => c.name), filterKind(f) === 'screw' ? 'schraubfilter' : 'schiebefilter', f.thread ? f.thread + ' mm' : ''].filter(Boolean).join(' ').toLowerCase();
  const ov = document.createElement('div');
  ov.className = 'modalbg';
  ov.innerHTML = `
    <div class="modal ffsearch" role="dialog" aria-modal="true" aria-labelledby="ffsTitle">
      <h2 id="ffsTitle">Filter wählen</h2>
      <input type="search" id="ffsQ" placeholder=" " aria-label="Filter suchen" autocomplete="off">
      <div class="ffslist" id="ffsList"></div>
      <div class="modalfoot"><button class="closex" id="ffsNo" aria-label="Abbrechen">${ART.x}</button><span class="sub2" id="ffsCount"></span><button class="okbtn" id="ffsOk" aria-label="Übernehmen">${ART.check}</button></div>
    </div>`;
  document.body.appendChild(ov);
  const $ = id => ov.querySelector('#' + id);
  const one = (f, label) => `<button type="button" class="ffsrow${pick.includes(f.id) ? ' on' : ''}${f.colorKey ? ' sub' : ''}" data-filter="${f.id}" aria-pressed="${pick.includes(f.id)}">
      ${filterArt(f, f.colorKey ? 30 : 40)}${!f.colorKey && f.code ? `<span class="filterbadge">${U.esc(filterCode(f))}</span>` : ''}<span class="ffsname">${U.esc(label || filterName(f))}</span><span class="ffscheck" aria-hidden="true"></span></button>`;
  // Sets mit Farben: Kopfzeile mit Bild, darunter die Farben einzeln
  const row = f => (f.colors || []).length
    ? `<div class="ffsset"><div class="ffssethead">${filterArt(f, 40)}${f.code ? `<span class="filterbadge">${U.esc(filterCode(f))}</span>` : ''}<span class="ffsname">${U.esc(filterName(f))}</span></div>
        <div class="ffsgrid">${f.colors.map(c => { const v = filterById(filters, f.id + '#' + c.k); return `<button type="button" class="ffscol${pick.includes(v.id) ? ' on' : ''}" data-filter="${v.id}" aria-pressed="${pick.includes(v.id)}">${filterArt(v, 34)}<span>${U.esc(c.name)}</span></button>`; }).join('')}</div></div>`
    : one(f);
  const draw = () => {
    const q = $('ffsQ').value.toLowerCase().trim();
    let html;
    if (q) {
      const hits = filters.filter(f => q.split(/\s+/).every(w => hay(f).includes(w)));
      html = hits.length ? hits.map(row).join('') : '<p class="hint">Kein Filter gefunden.</p>';
    } else {
      const base = id => String(id).split('#')[0];
      const top = filters.filter(f => pick.some(id => base(id) === f.id) || [...recent].some(id => base(id) === f.id));
      const rest = filters.filter(f => !top.includes(f)).sort((a, b) => !!b.fav - !!a.fav);
      html = (top.length ? `<div class="ffshead">Gewählt und zuletzt benutzt</div>${top.map(row).join('')}` : '')
        + `<div class="ffshead">Alle Filter</div>${rest.map(row).join('')}`;
    }
    $('ffsList').innerHTML = html;
    $('ffsCount').textContent = pick.length ? `${pick.length} gewählt` : '';
  };
  draw();
  setTimeout(() => $('ffsQ').focus(), 80);
  $('ffsQ').addEventListener('input', draw);
  $('ffsList').addEventListener('click', e => {
    const b = e.target.closest('[data-filter]'); if (!b) return;
    const id = b.dataset.filter;
    pick = pick.includes(id) ? pick.filter(x => x !== id) : [...pick, id];
    b.classList.toggle('on', pick.includes(id)); b.setAttribute('aria-pressed', pick.includes(id));
    $('ffsCount').textContent = pick.length ? `${pick.length} gewählt` : '';
    U.haptic && U.haptic(10);
  });
  const close = () => { ov.remove(); onCancel && onCancel(); };
  $('ffsNo').addEventListener('click', close);
  ov.addEventListener('click', e => { if (e.target === ov) close(); });
  $('ffsOk').addEventListener('click', () => { ov.remove(); onDone(pick); });
}

/* ---------- Einträge der Bilder verschieben ----------
   Die Plätze (Bild 1, 2, 3 …) bleiben, verschoben wird alles, was zu einem Bild eingetragen ist:
   Blende, Zeit, Objektiv, Filter, Notiz, Datum, Handyfotos, Scans. */
// Referenzfotos hochladen, Ort und Zeit übernehmen: Foto mit Ortsnadel darin
const REF_IMP_IC = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2.6"/><path d="M12 7.2a3.6 3.6 0 0 0-3.6 3.6c0 2.7 3.6 6 3.6 6s3.6-3.3 3.6-6A3.6 3.6 0 0 0 12 7.2z"/><circle cx="12" cy="10.8" r="1.2"/></svg>';
const COPY_IC = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="8.5" y="8.5" width="11" height="11" rx="2.2"/><path d="M15.5 8.5V6.2a1.7 1.7 0 0 0-1.7-1.7H6.2a1.7 1.7 0 0 0-1.7 1.7v7.6c0 .9.8 1.7 1.7 1.7h2.3"/></svg>';
const MOVE_IC = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4 3.5 7.5 7 11M3.5 7.5H15M17 13l3.5 3.5L17 20M20.5 16.5H9"/></svg>';
const FRAME_FIXED = ['id', 'rollId', 'index', 'bonus'];
const frameContent = f => Object.fromEntries(Object.entries(f).filter(([k]) => !FRAME_FIXED.includes(k)));
const contentEmpty = c => !Object.values(c).some(v => v !== null && v !== undefined && v !== '' && v !== false && !(Array.isArray(v) && !v.length));
async function applyContents(frames, contents) {
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    for (const k of Object.keys(f)) if (!FRAME_FIXED.includes(k)) delete f[k];
    Object.assign(f, contents[i] || {});
    await DB.put('frames', f);
  }
}
function setupReorder(body, roll, fr) {
  const bar = body.querySelector('#reorderBar'), grid = body.querySelector('#frameGrid');
  if (!bar || !grid || fr.length < 2) { bar?.remove(); return; }
  // Symbol zum Verschieben rechts in der Reiterzeile (Bilder · Rolle)
  const tabs = document.querySelector('.tabs');
  tabs?.querySelector('#reorderOn')?.remove();
  const on = document.createElement('button');
  on.type = 'button'; on.id = 'reorderOn'; on.className = 'reorderbtn';
  on.setAttribute('aria-label', 'Einträge verschieben'); on.title = 'Einträge verschieben';
  on.innerHTML = MOVE_IC;
  (tabs || bar).appendChild(on);
  const tools = bar.querySelector('.reordertools');
  let undo = null;
  const setMode = m => { grid.classList.toggle('reorder', m); tools.hidden = !m; on.classList.toggle('on', m); on.setAttribute('aria-pressed', m); };
  // Aktiviert wird über langes Drücken auf einen Frame. Das Symbol beendet das Verschieben bzw. zeigt, wie es geht.
  on.addEventListener('click', () => { if (grid.classList.contains('reorder')) route(); else U.toast('Zum Verschieben einen Frame lange drücken'); });
  const commit = async contents => {
    undo = fr.map(frameContent);
    await applyContents(fr, contents);
    const cells = await Promise.all(fr.map(f => frameCell(f)));
    grid.innerHTML = cells.join('');
    bar.querySelector('#reorderUndo').disabled = false;
    U.haptic && U.haptic([15, 40, 15]);
  };
  bar.querySelector('#reorderOff').addEventListener('click', () => route());
  bar.querySelector('#reorderUndo').addEventListener('click', async () => {
    if (!undo) return; const u = undo; await commit(u); undo = null; bar.querySelector('#reorderUndo').disabled = true; U.toast('Rückgängig gemacht');
  });
  // Alle auf einmal: nur die normalen Bilder, das Bonusbild bleibt, wo es ist
  const regular = fr.filter(f => !f.bonus);
  const shift = async d => {
    const c = fr.map(frameContent), idx = regular.map(f => fr.indexOf(f)), arr = idx.map(i => c[i]);
    if (d > 0) { if (!contentEmpty(arr[arr.length - 1])) { U.toast('Das letzte Bild ist belegt, nach hinten geht nichts mehr'); return; } arr.pop(); arr.unshift({}); }
    else { if (!contentEmpty(arr[0])) { U.toast('Bild 1 ist belegt, nach vorne geht nichts mehr'); return; } arr.shift(); arr.push({}); }
    idx.forEach((i, k) => { c[i] = arr[k]; });
    await commit(c); U.toast(d > 0 ? 'Alle Einträge eins nach hinten' : 'Alle Einträge eins nach vorne');
  };
  bar.querySelector('#shiftFwd').addEventListener('click', () => shift(1));
  bar.querySelector('#shiftBack').addEventListener('click', () => shift(-1));
  // Ziehen: Bild lange antippen und auf seinen richtigen Platz ziehen
  let drag = null, timer = null;
  const cellsArr = () => [...grid.querySelectorAll('.cell')];
  grid.addEventListener('click', e => { if (grid.classList.contains('reorder')) e.preventDefault(); }, true);
  grid.addEventListener('contextmenu', e => { if (grid.classList.contains('reorder')) e.preventDefault(); });
  grid.addEventListener('pointerdown', e => {
    if (!grid.classList.contains('reorder')) return;
    const cell = e.target.closest('.cell'); if (!cell) return;
    const from = cellsArr().indexOf(cell);
    const start = { x: e.clientX, y: e.clientY };
    clearTimeout(timer);
    timer = setTimeout(() => {
      const r = cell.getBoundingClientRect();
      const ghost = cell.cloneNode(true); ghost.classList.add('dragghost');
      Object.assign(ghost.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
      document.body.appendChild(ghost); cell.classList.add('dragfrom');
      drag = { from, to: from, ghost, dx: start.x - r.left, dy: start.y - r.top };
      GEAR_DRAG = true; U.haptic && U.haptic(12);
    }, 260);
    const cancelEarly = ev => { if (!drag && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > 8) clearTimeout(timer); };
    grid.addEventListener('pointermove', cancelEarly, { once: true });
  });
  document.addEventListener('pointermove', e => {
    if (!drag) return;
    e.preventDefault();
    drag.ghost.style.left = (e.clientX - drag.dx) + 'px'; drag.ghost.style.top = (e.clientY - drag.dy) + 'px';
    const hitAt = (x, y) => {
      if (!drag) return;
      drag.ghost.style.visibility = 'hidden';
      const el = document.elementFromPoint(x, y)?.closest('#frameGrid .cell');
      drag.ghost.style.visibility = '';
      const to = el ? cellsArr().indexOf(el) : drag.to;
      if (to !== drag.to) { drag.to = to; cellsArr().forEach((c, i) => c.classList.toggle('droptarget', i === to && to !== drag.from)); U.haptic && U.haptic(6); }
    };
    hitAt(e.clientX, e.clientY);
    autoScrollAt(e.clientX, e.clientY, hitAt);
  }, { passive: false });
  const end = async () => {
    clearTimeout(timer);
    if (!drag) return;
    stopAutoScroll(); GEAR_DRAG = false;
    const { from, to, ghost } = drag; drag = null; ghost.remove();
    cellsArr().forEach(c => c.classList.remove('dragfrom', 'droptarget'));
    if (to === from || to < 0) return;
    const c = fr.map(frameContent); const [item] = c.splice(from, 1); c.splice(to, 0, item);
    await commit(c);
    U.toast(`Eintrag von Bild ${frameLabel(fr[from])} auf Bild ${frameLabel(fr[to])} verschoben`);
  };
  document.addEventListener('pointerup', end);
  document.addEventListener('pointercancel', end);
  window.addEventListener('hashchange', () => { document.removeEventListener('pointerup', end); document.removeEventListener('pointercancel', end); }, { once: true });
  return setMode;
}

// Schieberegler: Knopf von links nach rechts ziehen, um die Aktion auszulösen
function setupSlide(el, onDone) {
  const knob = el.querySelector('.slideknob');
  let x0 = null, max = 0, pos = 0, armed = false;
  const set = (p, anim) => { pos = p; knob.style.transition = anim ? 'transform .25s ease' : 'none'; knob.style.transform = `translateX(${p}px)`; el.style.setProperty('--p', max ? p / max : 0); };
  knob.addEventListener('pointerdown', e => {
    x0 = e.clientX - pos; max = el.clientWidth - knob.offsetWidth - 8;
    knob.setPointerCapture(e.pointerId); el.classList.add('drag');
    armed = false; U.haptic(10);
  });
  knob.addEventListener('pointermove', e => {
    if (x0 === null) return;
    set(Math.max(0, Math.min(max, e.clientX - x0)));
    const hit = pos >= max * 0.85;
    if (hit !== armed) { armed = hit; if (hit) U.haptic(15); }
  });
  const end = () => {
    if (x0 === null) return;
    x0 = null; el.classList.remove('drag');
    if (pos >= max * 0.85) { set(max, true); U.haptic([25, 50, 25]); setTimeout(() => { onDone(); set(0, true); }, 220); }
    else set(0, true);
  };
  knob.addEventListener('pointerup', end);
  knob.addEventListener('pointercancel', end);
  // Tastatur: Eingabe löst ebenfalls aus
  knob.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDone(); } });
  knob.addEventListener('click', e => e.preventDefault());
}

// Knopf, der die Rolle ins nächste Stadium bringt: klein, mittig, mit Hinweis auf den Wechsel
function modeBtn(id, icon, label, sub, cls = '') {
  return `<div class="modewrap"><button class="modebtn ${cls}" id="${id}"><span class="mbicon">${icon}</span><span>${label}</span></button>${sub ? `<span class="modesub">${sub}</span>` : ''}</div>`;
}

// Scans in die Platzhalter verteilen. Das Bonusbild wird nur gefüllt, wenn mehr Dateien als normale Bilder da sind.
async function assignScans(roll, files) {
  files.sort((a, b) => a.name.localeCompare(b.name, 'de', { numeric: true }));
  const fr = await framesOf(roll.id);
  const regular = fr.filter(f => !f.bonus);
  const bonus = fr.find(f => f.bonus);
  let free = regular.filter(f => !f.imgId);
  if (bonus && !bonus.imgId && files.length > free.length) free = [bonus, ...free];
  let next = (fr[fr.length - 1]?.index || 0) + 1;
  let done = 0;
  for (const file of files) {
    let f = free.shift();
    if (!f) { f = { id: U.uid(), rollId: roll.id, index: next++ }; }
    U.toast(`Speichere ${++done}/${files.length} …`);
    const rec = await U.storeImage(file, 'scan');
    f.imgId = rec.id; f.shot = true;
    await DB.put('frames', f);
  }
  const maxIdx = Math.max(...(await framesOf(roll.id)).map(f => f.index));
  if (maxIdx !== roll.exposures) { roll.exposures = maxIdx; await DB.put('rolls', roll); }
  return files.length;
}

// Foto groß: wie in der Fotos-App nach unten (oder oben) wegwischen oder antippen schließt; zwei Finger zoomen
function zoom(src) {
  const ov = document.createElement('div');
  ov.className = 'overlay zoomov';
  ov.innerHTML = `<img src="${src}" alt="">`;
  const img = ov.querySelector('img');
  const pz = U.pinch(img);
  const close = () => { ov.classList.add('out'); setTimeout(() => ov.remove(), 220); };
  ov.addEventListener('click', ev => { if (!pz.zoomed && !ov.dataset.dragged) close(); delete ov.dataset.dragged; });
  let st = null;
  ov.addEventListener('touchstart', e => { st = e.touches.length === 1 && !pz.zoomed ? { y: e.touches[0].clientY, x: e.touches[0].clientX } : null; }, { passive: true });
  ov.addEventListener('touchmove', e => {
    if (!st || pz.zoomed) return;
    const dy = e.touches[0].clientY - st.y, dx = e.touches[0].clientX - st.x;
    if (Math.abs(dy) < Math.abs(dx)) return;
    st.dy = dy; ov.dataset.dragged = '1';
    img.style.transition = 'none'; img.style.translate = `0 ${dy}px`; img.style.scale = String(Math.max(.8, 1 - Math.abs(dy) / 1200));
    ov.style.backgroundColor = `rgba(0,0,0,${Math.max(0, .92 - Math.abs(dy) / 500)})`;
  }, { passive: true });
  ov.addEventListener('touchend', () => {
    if (!st) return;
    const dy = st.dy || 0; st = null;
    if (Math.abs(dy) > 90) { img.style.transition = 'translate .22s ease-in, opacity .22s'; img.style.translate = `0 ${dy > 0 ? innerHeight : -innerHeight}px`; img.style.opacity = '0'; ov.style.transition = 'background-color .22s'; ov.style.backgroundColor = 'rgba(0,0,0,0)'; setTimeout(() => ov.remove(), 230); }
    else { img.style.transition = ''; img.style.translate = ''; img.style.scale = ''; ov.style.backgroundColor = ''; setTimeout(() => { delete ov.dataset.dragged; }, 50); }
  });
  document.body.appendChild(ov);
}

/* ---------- Abgabe zur Entwicklung ---------- */
async function viewHandover(id) {
  setTab('rollen');
  const roll = await DB.get('rolls', id);
  if (!roll) { location.replace('#/'); return; }
  setHeader('In Entwicklung', {});
  const labs = [...new Set((await DB.all('rolls')).map(r => r.dev?.lab).filter(Boolean))];
  const fr = await framesOf(id);
  const shot = fr.filter(f => f.shot).length;
  let mode = roll.dev?.lab ? 'labor' : (roll.dev?.mode || 'labor');
  let slipFile = null;
  view.innerHTML = `
    <section class="wizsec">
      <h2 class="wiztitle">Wo wird der Film entwickelt?</h2>
      <div class="bigchoice" id="mode">
        <button type="button" data-m="labor" class="${mode === 'labor' ? 'on' : ''}"><b>Im Labor</b><span>Abgabe bei einem Fotolabor oder Drogeriemarkt</span></button>
        <button type="button" data-m="selbst" class="${mode === 'selbst' ? 'on' : ''}"><b>Selbst</b><span>Zu Hause entwickeln</span></button>
      </div>
    </section>
    <section class="wizsec card" id="laborBox">
      <label class="fld"><span>Labor</span><input id="lab" list="labs" value="${U.esc(roll.dev?.lab || '')}"><datalist id="labs">${labs.map(l => `<option value="${U.esc(l)}">`).join('')}</datalist></label>
      <label class="fld"><span>Abgegeben am</span><input type="date" id="sentAt" value="${roll.dev?.sentAt || U.today()}"></label>
      <label class="fld"><span>Kosten (€, optional)</span><input id="cost" inputmode="decimal" value="${U.esc(roll.dev?.cost ?? '')}"></label>
      <div class="fld"><span>Abholschein (optional)</span>
        <div class="row gap" style="padding:0">
          <label class="btn ghost small">Foto aufnehmen<input type="file" accept="image/*" capture="environment" hidden class="slip"></label>
          <label class="btn ghost small">Aus Mediathek<input type="file" accept="image/*" hidden class="slip"></label>
        </div>
        <img id="slipPrev" class="slipprev" hidden alt="Abholschein">
      </div>
    </section>
    <section class="wizsec card" id="selbstBox">
      <label class="fld"><span>Geplant für</span><input type="date" id="devDate" value="${roll.dev?.devDate || U.today()}"></label>
      <p class="hint">Chemie, Zeiten und Temperaturen trägst du im Reiter Entwicklung ein.</p>
    </section>
    <div class="wizfoot"><button class="btn wide accent" id="go">Film in Entwicklung geben</button></div>`;
  const sync = () => {
    view.querySelector('#laborBox').hidden = mode !== 'labor';
    view.querySelector('#selbstBox').hidden = mode !== 'selbst';
    view.querySelectorAll('#mode button').forEach(b => b.classList.toggle('on', b.dataset.m === mode));
  };
  view.querySelector('#mode').addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (b) { mode = b.dataset.m; sync(); } });
  view.querySelectorAll('.slip').forEach(inp => inp.addEventListener('change', () => {
    slipFile = inp.files[0]; if (!slipFile) return;
    const img = view.querySelector('#slipPrev'); U.fileToDataUrl(slipFile).then(u => { img.src = u; img.hidden = false; });
  }));
  view.querySelector('#go').addEventListener('click', async () => {
    roll.dev = roll.dev || {};
    roll.dev.mode = mode;
    if (mode === 'labor') {
      roll.dev.lab = view.querySelector('#lab').value.trim();
      roll.dev.sentAt = view.querySelector('#sentAt').value;
      const c = view.querySelector('#cost').value.replace(',', '.');
      roll.dev.cost = c ? Number(c) : roll.dev.cost ?? null;
      if (slipFile) {
        const rec = await U.storeImage(slipFile, 'slip');
        await deleteImage(roll.dev.slipId); roll.dev.slipId = rec.id;
      }
    } else {
      roll.dev.devDate = view.querySelector('#devDate').value;
    }
    roll.status = 'belichtet';
    roll.finishedAt = roll.finishedAt || U.today();
    await DB.put('rolls', roll);
    U.toast('Film ist in Entwicklung');
    location.replace('#/rolle/' + roll.id);
  });
  sync();
}

/* ---------- Reiter Entwicklung ---------- */
async function rollDev(body, roll, stock) {
  roll.dev = roll.dev || { mode: 'labor' };
  const slip = roll.dev.slipId ? await U.imgUrl(roll.dev.slipId) : null;
  body.innerHTML = `
  <div class="card" id="devform">
    <div class="seggroup">
      <label class="seg"><input type="radio" name="mode" value="labor" data-f="dev.mode">Labor</label>
      <label class="seg"><input type="radio" name="mode" value="selbst" data-f="dev.mode">Selbst entwickelt</label>
    </div>
    <div id="labor">
      ${field('Labor', 'dev.lab')}
      ${field('Abgegeben am', 'dev.sentAt', { type: 'date' })}
      ${field('Zurück am', 'dev.backAt', { type: 'date' })}
      ${field('Kosten (€)', 'dev.cost', { num: true })}
      ${field('Push/Pull beim Labor', 'dev.pushPull')}
      ${field('Scans (Auflösung, Format)', 'dev.scans')}
      <div class="fld"><span>Abholschein</span>
        ${slip ? `<img src="${slip}" class="slipprev zoomable" alt="Abholschein">` : '<p class="hint">Kein Foto hinterlegt.</p>'}
        <label class="btn ghost small">${slip ? 'Foto ersetzen' : 'Foto hinzufügen'}<input type="file" accept="image/*" hidden id="slipUp"></label>
      </div>
    </div>
    <div id="selbst">
      ${field('Entwickelt am', 'dev.devDate', { type: 'date' })}
      ${select('Prozess', 'dev.process', [['', 'bitte wählen'], ['SW', 'Schwarzweiß'], ['C-41', 'C-41'], ['E-6', 'E-6'], ['ECN-2', 'ECN-2']])}
      ${field('Entwickler', 'dev.developer')}
      ${field('Verdünnung', 'dev.dilution')}
      ${field('Menge (ml)', 'dev.volume', { num: true })}
      ${field('Temperatur (°C)', 'dev.temp', { num: true })}
      ${field('Entwicklungszeit', 'dev.time')}
      ${field('Kipprhythmus', 'dev.agitation')}
      ${field('Stoppbad', 'dev.stop')}
      ${field('Fixierer und Zeit', 'dev.fixer')}
      ${field('Wässern / Netzmittel', 'dev.wash')}
      ${field('Push/Pull', 'dev.pushPull')}
      ${field('Charge / Ansatz', 'dev.batch')}
    </div>
    ${field('Gescannt mit', 'dev.scanner')}
    ${area('Notizen zur Entwicklung', 'dev.notes', '')}
  </div>`;
  const sync = () => {
    const self = roll.dev.mode === 'selbst';
    body.querySelector('#labor').hidden = self;
    body.querySelector('#selbst').hidden = !self;
  };
  if (stock && !roll.dev.process) roll.dev.process = stock.process;
  bind(body.querySelector('#devform'), roll, 'rolls', sync);
  body.addEventListener('change', sync);
  body.querySelector('.slipprev.zoomable')?.addEventListener('click', e => zoom(e.target.src));
  body.querySelector('#slipUp').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    const rec = await U.storeImage(f, 'slip');
    await deleteImage(roll.dev.slipId); roll.dev.slipId = rec.id; await DB.put('rolls', roll); route();
  });
  sync();
}

/* ---------- Reiter Rolle ---------- */
function rollInfo(body, roll) {
  body.innerHTML = `
  <div class="card" id="infoform">
    ${field('Name der Rolle', 'title')}
    <div class="fld"><span>Film</span><button type="button" class="filmpickbtn" id="stockBtn" aria-label="Film ändern"><span class="filmselart" id="filmArt"></span><span class="filmpickname" id="stockName"></span><span class="filmpickchg">Ändern</span></button></div>
    <label class="fld"><span>Kamera</span><select data-f="cameraId" id="camsel"></select></label>
    <label class="fld"><span>Festes Objektiv für alle Frames</span><select id="lenssel"></select></label>
    <div id="isoBox"></div>
    ${field('Eingelegt am', 'loadedAt', { type: 'date' })}
    ${field('Voll am', 'finishedAt', { type: 'date' })}
    <div class="fld"><span>Ort der Rolle (ungefähr)</span><button type="button" class="filmpickbtn" id="rollPlaceBtn"><span class="rpic" aria-hidden="true">${PIN_IC}</span><span class="filmpickname" id="rollPlaceName">${U.esc(roll.place || 'Stadt oder Gegend wählen')}</span>${roll.place ? '<span class="filmpickchg" id="rollPlaceClr" role="button" aria-label="Ort der Rolle entfernen">×</span>' : ''}</button></div>
    ${area('Notizen zur Rolle', 'notes', '', 4)}
    ${select('Status korrigieren', 'status', [['entwurf', 'In der Kamera'], ['belichtet', 'In Entwicklung'], ['entwickelt', 'Fotoalbum']])}
  </div>
  <div id="diaryCard"></div>
  <button class="btn danger wide" data-delroll="${roll.id}">Rolle löschen</button>`;
  const fillDiary = async () => {
    const box = body.querySelector('#diaryCard'); if (!box) return;
    box.innerHTML = await diaryCardHtml(await DB.get('stocks', roll.stockId));
  };
  fillDiary();
  body.querySelector('#diaryCard').addEventListener('click', async e => { const img = e.target.closest('img[data-img]'); if (img) zoom(await U.imgUrl(img.dataset.img) || img.src); });
  // Festes Objektiv: gilt für alle Frames der Rolle, einzelne Frames lassen sich danach trotzdem ändern
  const fillLens = async () => {
    const all = (await DB.all('lenses')).filter(l => !l.inactive || l.id === roll.fixedLensId);
    const fit = all.filter(l => (l.cameraIds || []).includes(roll.cameraId));
    const list = (fit.length ? fit : all).sort((a, b) => parseFloat(a.focal) - parseFloat(b.focal));
    const sel = body.querySelector('#lenssel');
    sel.innerHTML = '<option value="">wechselt je Frame</option>' + list.map(l => `<option value="${l.id}"${roll.fixedLensId === l.id ? ' selected' : ''}>${U.esc(lensLabel(l))}</option>`).join('');
  };
  fillLens();
  body.querySelector('#camsel').addEventListener('change', () => setTimeout(fillLens, 50));
  body.querySelector('#lenssel').addEventListener('change', async e => {
    const v = e.target.value || null;
    roll.fixedLensId = v; if (v) roll.lastLensId = v;
    await DB.put('rolls', roll);
    if (v) {
      for (const f of (await DB.all('frames')).filter(f => f.rollId === roll.id)) { f.lensId = v; await DB.put('frames', f); }
      U.toast('Objektiv für alle Frames übernommen');
    }
  });
  // Kleines Foto des Films neben der Auswahl; ISO-Feld nur, wenn die Kamera eine ISO-Einstellung hat
  const extras = async () => {
    const [stock, cam] = await Promise.all([DB.get('stocks', roll.stockId), roll.cameraId ? DB.get('cameras', roll.cameraId) : null]);
    body.querySelector('#filmArt').innerHTML = stock ? await filmArt(stock, 40) : '';
    body.querySelector('#stockName').textContent = stock ? U.stockLabel(stock) : 'Film wählen';
    const box = body.querySelector('#isoBox');
    if (!cam || cam.isoDial !== true) { box.innerHTML = ''; return; }
    const tips = [];
    if (stock?.boxIso) tips.push(`Hersteller: ISO ${U.esc(stock.boxIso)}`);
    if (stock?.communityIso) tips.push(`oft empfohlen: ISO ${U.esc(stock.communityIso)}${stock.communitySource ? ` (${U.esc(stock.communitySource)})` : ''}`);
    box.innerHTML = `<label class="fld"><span>ISO an der Kamera eingestellt</span><input id="rollIso" inputmode="numeric" value="${U.esc(roll.ei || '')}" placeholder="${U.esc(stock?.boxIso || '')}"></label>
      ${tips.length ? `<p class="hint isohint">${tips.map(t => `<span>${t}</span>`).join(' · ')}</p>` : ''}`;
    box.querySelector('#rollIso').addEventListener('input', async e => { roll.ei = e.target.value.replace(/[^\d]/g, ''); await DB.put('rolls', roll); });
  };
  extras();
  // Film ändern, auch bei fertigen und archivierten Alben: Suche wie beim Einlegen
  // Grober Ort für die ganze Rolle: gilt für Bilder ohne eigenen Ort (Karte, Filter in Alle Fotos, Analytics)
  body.querySelector('#rollPlaceBtn').addEventListener('click', async e => {
    if (e.target.closest('#rollPlaceClr')) { delete roll.place; delete roll.placeLat; delete roll.placeLng; delete roll.placeCC; await DB.put('rolls', roll); viewRoll(roll.id, 'info'); return; }
    openPlaceChooser(async p => {
      roll.place = p.name || roll.place; if (p.lat != null) { roll.placeLat = p.lat; roll.placeLng = p.lng; } if (p.cc) roll.placeCC = p.cc;
      await DB.put('rolls', roll); U.haptic && U.haptic([12, 40, 12]); viewRoll(roll.id, 'info');
    }, { city: true });
  });
  body.querySelector('#stockBtn').addEventListener('click', () => openStockPicker(async id => {
    roll.stockId = id; await DB.put('rolls', roll);
    U.toast('Film geändert'); U.haptic && U.haptic(10);
    // Kopf der Rolle (Filmbild, Name, EI) neu zeichnen, Reiter „Rolle“ bleibt offen
    const y = window.scrollY; await viewRoll(roll.id, 'info'); window.scrollTo(0, y);
  }, null, 'Film ändern'));
  body.querySelector('#camsel').addEventListener('change', () => setTimeout(extras, 80));
  Promise.all([DB.all('stocks'), DB.all('cameras')]).then(([st, cams]) => {
    body.querySelector('#camsel').innerHTML = '<option value="">ohne Angabe</option>' + cams.filter(c => (!c.broken && !c.inactive) || c.id === roll.cameraId).map(c => `<option value="${c.id}">${U.esc(camLabel(c))}${c.broken ? ' (kaputt)' : c.inactive ? ' (inaktiv)' : ''}</option>`).join('');
    bind(body.querySelector('#infoform'), roll, 'rolls');
  });
}

/* ---------- Einzelbild (Frames-Modus) ---------- */
async function viewFrame(idWithQuery) {
  const [id] = idWithQuery.split('?');
  const frame = await DB.get('frames', id);
  if (!frame) { location.replace('#/'); return; }
  const roll = await DB.get('rolls', frame.rollId);
  const stock = roll ? await DB.get('stocks', roll.stockId) : null;
  const all = await framesOf(frame.rollId);
  const pos = all.findIndex(f => f.id === frame.id);
  const prev = all[pos - 1], next = all[pos + 1];
  const regularCount = all.filter(f => !f.bonus).length;
  setHeader(frame.bonus ? 'B' : frameLabel(frame), { soft: true });

  const scanUrl = frame.imgId ? await U.imgUrl(frame.imgId) : null;
  const phoneUrl = frame.phoneId ? await U.imgUrl(frame.phoneId) : null;
  const phoneUrl2 = frame.double && frame.phoneId2 ? await U.imgUrl(frame.phoneId2) : null;
  const camLenses = roll?.cameraId ? (await DB.all('lenses')).filter(l => (l.cameraIds || []).includes(roll.cameraId) && (!l.inactive || l.id === frame.lensId)) : [];
  gearSort(camLenses, (a, b) => parseFloat(a.focal) - parseFloat(b.focal));
  const ap = String(frame.aperture || '').replace(/^f\//, '');
  const sh = String(frame.shutter || '');
  const cam = roll?.cameraId ? await DB.get('cameras', roll.cameraId) : null;
  // Objektiv zuerst: zuletzt benutztes Objektiv der Rolle oder das einzige der Kamera ist vorausgewählt
  let lensId = frame.lensId || (roll?.fixedLensId && camLenses.some(l => l.id === roll.fixedLensId) ? roll.fixedLensId : null) || (camLenses.length === 1 ? camLenses[0].id : camLenses.some(l => l.id === roll?.lastLensId) ? roll.lastLensId : null);
  const curLens = () => camLenses.find(l => l.id === lensId);
  const apList = () => cam?.auto && !camLenses.length ? ['Auto'] : lensApertures(curLens());
  const shList = camShutters(cam);
  // Filter: aus dem Kameraschrank. Ohne eigenen Eintrag übernimmt das Bild die zuletzt benutzten Filter der Rolle.
  // Infrarotfilter (Hoya R72, Cokin 007) nur bei Filmen, die Infrarot aufnehmen: Typ Infrarot und Ilford SFX 200 (erweiterte Rotempfindlichkeit)
  const isIR = isIrFilm(stock);
  let myFilters = (await getFilters()).filter(f => isIR || !isIrFilter(f));
  if (isIR) myFilters.sort((a, b) => isIrFilter(b) - isIrFilter(a));
  let filterIds = (frame.filterIds || roll?.lastFilterIds || []).filter(id => filterById(myFilters, id));
  const IR_ISOS = ['8', '10', '12', '16', '20', '25'];
  const iso = String(frame.iso || (isIR ? roll?.lastIso || '' : ''));
  // Blitze aus dem Zubehör, passende zur Kamera zuerst
  const flashes = (await getAccessories()).filter(a => a.kind === 'blitz').sort((a, b) => ((b.cameraIds || []).includes(roll?.cameraId) - (a.cameraIds || []).includes(roll?.cameraId)));
  const filterChips = () => filterIds.map(id => filterById(myFilters, id)).filter(Boolean)
    .map(f => `<span class="ffchip">${filterArt(f, 22)}<span>${U.esc(filterShort(f))}</span></span>`).join('');

  view.innerHTML = `
  <div class="framestrip" role="slider" aria-label="Bild wählen" aria-valuemin="1" aria-valuemax="${all.length}" aria-valuenow="${all.findIndex(f => f.id === frame.id) + 1}">${all.map(f => `<i data-id="${f.id}" class="${f.id === frame.id ? 'on' : ''}${f.bonus ? ' b' : ''}${f.shot || f.imgId || f.note ? ' used' : ''}"></i>`).join('')}</div>
  ${U.hintOnce('frame-swipe', 'Wische auf dem Bild nach links oder rechts zum nächsten oder vorigen Bild. Unten rechts speichert der Haken und führt zurück zur Rolle.')}
  <div class="framefilters" id="frameFilters">${filterChips()}${isIR && iso ? `<span class="ffchip iso">ISO ${U.esc(iso)}</span>` : ''}</div>
  <div id="media"></div>
  <div class="card quick">
    ${camLenses.length ? `<div class="lensrow" id="lensRow">${camLenses.map(l => `<button type="button" class="lensbtn${lensId === l.id ? ' on' : ''}" data-lens="${l.id}" aria-label="${U.esc(lensLabel(l))}" aria-pressed="${lensId === l.id}">${ART.lens(l, 54)}</button>`).join('')}</div>` : ''}
    <div class="qlabel">Blende</div>
    <div class="chipwrap fitchips" id="apRow"><span class="chipset" id="apChips">${chipHtml(apList(), ap)}</span>
      <input class="chip-input" id="apOther" placeholder="andere" value="${!ap || apList().includes(ap) ? '' : U.esc(ap)}"></div>
    <div class="qlabel">Belichtungszeit</div>
    <div class="chipwrap fitchips" id="shRow"><span class="chipset">${chipHtml(shList, sh, true)}</span>
      <input class="chip-input" id="shOther" placeholder="andere" value="${!sh || shList.includes(sh) ? '' : U.esc(sh)}"></div>
    <div id="recip" class="hint"></div>
    ${isIR ? `<div class="qlabel">ISO (Infrarot)</div>
    <div class="chipwrap fitchips" id="isoRow"><span class="chipset">${chipHtml(IR_ISOS, iso)}</span>
      <input class="chip-input" id="isoOther" inputmode="numeric" placeholder="andere" value="${!iso || IR_ISOS.includes(iso) ? '' : U.esc(iso)}"></div>` : ''}
    <div class="togrow">
      <button type="button" class="togbtn${frame.flash ? ' on' : ''}" id="flashTog" aria-label="Blitz" aria-pressed="${!!frame.flash}">${FLASH_TOG_IC}</button>
      <button type="button" class="togbtn${filterIds.length ? ' on' : ''}" id="filterTog" aria-label="Filter" aria-pressed="${filterIds.length > 0}">${FILTER_TOG_IC}</button>
      ${cam && cam.multiExp === false ? '' : `<button type="button" class="togbtn${frame.double ? ' on' : ''}" id="dbl" aria-label="Doppelbelichtung" aria-pressed="${!!frame.double}">${ART.double}</button>`}
      ${!scanUrl ? `<button type="button" class="togbtn${phoneUrl ? ' on hasimg' : ''}" id="phoneTog" aria-label="Handyfoto">${phoneUrl ? `<img src="${phoneUrl}" alt="">` : PHONE_TOG_IC}</button>` : ''}
      <button type="button" class="togbtn${frame.meter ? ' on' : ''}" id="meterBtn" aria-label="Belichtungsmesser">${ART.meter}</button>
    </div>
    ${frame.meter ? `<p class="meterlast"><span>Letzte Messung</span> <b>LW ${(Math.round(frame.meter.ev100 * 10) / 10).toLocaleString(I18N.locale())}</b> <span>bei ISO ${U.esc(String(frame.meter.iso || frame.meter.ei || ''))}</span></p>` : ''}
    <div class="placetime">
      <div class="placefld1"><input id="framePlace" list="framePlaceList" maxlength="80" value="${U.esc(frame.place || '')}" enterkeyhint="done" autocomplete="off" aria-label="Ort"><datalist id="framePlaceList"></datalist><button type="button" class="placepin placemap" id="framePlaceMap" aria-label="Ort auf der Karte wählen">${MAP_PICK_IC}</button><button type="button" class="placepin" id="framePlaceGps" aria-label="Standort abfragen">${PIN_IC}</button></div>
      <div class="timefld${frame.date ? ' has' : ''}" id="timeFld"><label class="timeedit"><span id="frameTimeTxt">${frame.date ? fmtShot(frame.date) : ''}</span><input type="datetime-local" id="frameTime" value="${U.esc(String(frame.date || '').slice(0, 16))}" aria-label="Aufnahmezeit ändern"></label><button type="button" class="clockbtn" id="timeNow" aria-label="Aktuelle Uhrzeit eintragen">${CLOCK_IC}</button></div>
    </div>
    <span class="placecoord" id="framePlaceCoord">${U.esc(fmtCoord(frame))}</span>
    <p class="framewx" id="frameWx" hidden></p>
    <textarea id="note" class="mininote" rows="1" placeholder="Notizen" aria-label="Notizen">${U.esc(frame.note || '')}</textarea>
    <textarea id="info" class="mininote" rows="1" placeholder="Infos, nur für dich" aria-label="Infos, nur für dich, erscheinen nicht im Fotoalbum">${U.esc(frame.info || '')}</textarea>
  </div>`;

  renderMedia(view.querySelector('#media'), scanUrl, [phoneUrl, phoneUrl2].filter(Boolean), frame);
  if (cam?.lightLeaks && roll && !roll.leaksMarked && (roll.status || 'entwurf') === 'entwurf' && !frame.imgId) { const lv = leakMap(roll, all).get(frame.id); const md = view.querySelector('#media .media'); if (lv && md) md.classList.add('leak', 'l' + lv); }

  // Speichern; beim ersten Eintrag wird der heutige Tag als Aufnahmetag gesetzt
  let t;
  const flush = () => { clearTimeout(t); return DB.put('frames', frame); };
  const save = () => {
    if (!frame.lensId && lensId) frame.lensId = lensId;
    if (!frame.filterIds && filterIds.length) frame.filterIds = [...filterIds];
    if (isIR && !frame.iso && iso) frame.iso = iso;
    clearTimeout(t); t = setTimeout(() => DB.put('frames', frame), 300);
  };
  const setChip = (rowId, otherId, key) => {
    const row = view.querySelector('#' + rowId), other = view.querySelector('#' + otherId);
    row.addEventListener('click', e => {
      const b = e.target.closest('.chip'); if (!b) return;
      const same = String(frame[key] || '').replace(/^f\//, '') === b.dataset.v;
      frame[key] = same ? '' : b.dataset.v;
      row.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', !same && c === b));
      other.value = '';
      if (!frame.shot && frame[key]) frame.shot = true;
      save(); showRecip();
    });
    other.addEventListener('input', () => {
      frame[key] = other.value.trim();
      row.querySelectorAll('.chip').forEach(c => c.classList.remove('on'));
      save(); showRecip();
    });
  };
  setChip('apRow', 'apOther', 'aperture');
  // Wetter zur Aufnahme: erscheint unter Ort und Zeit, sobald beides eingetragen ist (Uhrzeit und Koordinaten)
  let wxReq = 0;
  const showWx = async () => {
    const box = view.querySelector('#frameWx'); if (!box || typeof SKY === 'undefined') return;
    const ds = String(frame.date || ''), timed = ds.length > 10 && !/T12:00/.test(ds);
    if (!timed || frame.placeLat == null) { box.hidden = true; return; }
    const key = `${ds.slice(0, 16)}|${(+frame.placeLat).toFixed(3)}|${(+frame.placeLng).toFixed(3)}`;
    const when = new Date(ds), night = SKY.sun(when, +frame.placeLat, +frame.placeLng).alt < -0.8;
    const draw = w => { box.hidden = !w; if (w) box.innerHTML = `${SKY.wxIcon(w, night)}<span>${U.esc(SKY.wxShort(w))}</span>`; };
    if (frame.wx && frame.wxKey === key) { draw(frame.wx); return; }
    const my = ++wxReq;
    box.hidden = false; box.innerHTML = '<span class="sub2">Wetter …</span>';
    let w = null; try { w = await SKY.weather(when, +frame.placeLat, +frame.placeLng); } catch (_) {}
    if (my !== wxReq) return;
    if (w) { frame.wx = w; frame.wxKey = key; const fresh = await DB.get('frames', frame.id); if (fresh) { fresh.wx = w; fresh.wxKey = key; await DB.put('frames', fresh); } }
    draw(w);
  };
  // Aufnahmezeit: steht neben dem Ort, minutengenau; von Hand geändert zählt sie als gesetzt
  const showTime = () => { showWx(); view.querySelector('#frameTimeTxt').textContent = frame.date ? fmtShot(frame.date) : ''; view.querySelector('#frameTime').value = String(frame.date || '').slice(0, 16); view.querySelector('#timeFld').classList.toggle('has', !!frame.date); };
  // Uhrsymbol: trägt die aktuelle Uhrzeit minutengenau ein (erst dann, nicht automatisch)
  view.querySelector('#timeNow').addEventListener('click', () => {
    frame.date = nowLocal().slice(0, 16) + ':00'; frame.dateSet = true; delete frame.wx;
    if (!frame.shot) frame.shot = true;
    showTime(); clearTimeout(t); DB.put('frames', frame); U.haptic && U.haptic(10);
  });
  view.querySelector('#frameTime').addEventListener('change', e => {
    const v = e.target.value;
    frame.date = v ? v + ':00' : null; frame.dateSet = !!v; delete frame.wx;
    if (v && !frame.shot) frame.shot = true;
    showTime(); clearTimeout(t); DB.put('frames', frame); U.haptic && U.haptic(10);
  });
  const drawTop = () => { view.querySelector('#frameFilters').innerHTML = filterChips() + (isIR && frame.iso ? `<span class="ffchip iso">ISO ${U.esc(frame.iso)}</span>` : ''); };
  // Filter: erst „Mit Filter“ wählen, dann öffnet sich die Suche. Gewählte Filter stehen darunter, ein Tipp auf „Ändern“ öffnet die Suche erneut.
  const setFilters = ids => {
    filterIds = [...ids]; frame.filterIds = [...filterIds];
    if (roll) { roll.lastFilterIds = [...filterIds]; DB.put('rolls', roll); }
    drawTop(); drawSel(); save();
  };
  const drawSel = () => {
    const sel = view.querySelector('#filterSel'); if (!sel) return;
    const fs = filterIds.map(id => filterById(myFilters, id)).filter(Boolean);
    sel.innerHTML = fs.map(f => `<span class="ffchip">${filterArt(f, 26)}<span>${U.esc(filterShort(f))}</span></span>`).join('')
      + `<button type="button" class="btn ghost small ffedit" id="filterEdit">${SEARCH_IC}${fs.length ? 'Ändern' : 'Filter suchen'}</button>`;
    sel.querySelector('#filterEdit').addEventListener('click', () => openFrameFilterSearch(myFilters, filterIds, roll, ids => { setFilters(ids); syncUse(); }));
  };
  const filterTog = view.querySelector('#filterTog');
  const syncUse = () => { const use = filterIds.length > 0; filterTog.classList.toggle('on', use); filterTog.setAttribute('aria-pressed', use); };
  const openFilters = pre => {
    if (!myFilters.length) { U.toast('Noch keine Filter im Kameraschrank'); return; }
    openFrameFilterSearch(myFilters, pre, roll, ids => { setFilters(ids); syncUse(); }, () => syncUse());
  };
  // Tippen: an (öffnet die Auswahl) oder aus. Gedrückt halten: Auswahl ändern.
  tapToggle(filterTog, () => filterIds.length > 0,
    () => { frame.filterIdsOff = [...filterIds]; setFilters([]); syncUse(); },
    () => openFilters(filterIds.length ? filterIds : (frame.filterIdsOff || []).filter(id => filterById(myFilters, id))));
  if (isIR) {
    const row = view.querySelector('#isoRow'), other = view.querySelector('#isoOther');
    const setIso = v => { frame.iso = v; if (roll) { roll.lastIso = v; DB.put('rolls', roll); } drawTop(); save(); };
    row.addEventListener('click', e => {
      const b = e.target.closest('.chip'); if (!b) return;
      const same = String(frame.iso || '') === b.dataset.v;
      row.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', !same && c === b)); other.value = '';
      setIso(same ? '' : b.dataset.v);
    });
    other.addEventListener('input', () => { row.querySelectorAll('.chip').forEach(c => c.classList.remove('on')); setIso(other.value.replace(/[^\d]/g, '')); });
  }
  setChip('shRow', 'shOther', 'shutter');
  // ---------- Blitz: Synchronzeit der Kamera und aufklappbarer Blitzrechner ----------
  // Leitzahl LZ = Blende × Entfernung (Meter, ISO 100). Bei anderer ISO wächst LZ mit der Wurzel: LZ_ISO = LZ × √(ISO/100).
  const STOPS = [1, 1.1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.5, 2.8, 3.2, 3.5, 4, 4.5, 5, 5.6, 6.3, 7.1, 8, 9, 10, 11, 13, 14, 16, 18, 20, 22, 25, 29, 32, 36, 40, 45, 51, 57, 64];
  const nearStop = n => STOPS.reduce((b, v) => Math.abs(Math.log2(v / n)) < Math.abs(Math.log2(b / n)) ? v : b, STOPS[0]);
  const fmtN = v => 'f/' + String(v).replace('.', ',');
  const num = v => parseFloat(String(v ?? '').replace(',', '.'));
  const drawFlash = () => {
    const box = document.querySelector('#flashBox'); if (!box) return;
    const fl = flashes.find(f => f.id === frame.flashId) || (flashes.length === 1 ? flashes[0] : null);
    const isoV = num(frame.flashIso) || num(frame.iso) || num(roll?.ei) || num(stock?.boxIso) || 100;
    const gn = num(frame.flashGn) || num(fl?.gn) || '';
    const dist = num(frame.flashDist) || 3;
    const sync = cam?.flashSync, tSet = shutterSec(frame.shutter, cam), tSync = /^1\//.test(sync || '') ? U.parseShutter(sync) : 0;
    const tooFast = tSync && tSet > 0 && tSet < tSync - 1e-6;
    const lens = curLens(), maxAp = num(lens?.maxAp), minAp = num(lens?.minAp);
    let calc = '', rows = '';
    if (gn > 0) {
      const g = gn * Math.sqrt(isoV / 100), n = g / dist, st = nearStop(n);
      const warn = maxAp && n < maxAp ? ` Das ist offener als das Objektiv (${fmtN(maxAp)}): näher heran oder empfindlicherer Film.` : minAp && n > minAp ? ` Weiter als ${fmtN(minAp)} lässt sich nicht abblenden: weiter weg, Blitz streuen oder indirekt blitzen.` : '';
      calc = `<p class="flashres">Bei ${String(dist).replace('.', ',')} m und ISO ${isoV}: <b>${fmtN(st)}</b> <span class="sub2">(genau ${String(Math.round(n * 10) / 10).replace('.', ',')})</span>${warn}</p>
        <button type="button" class="btn ghost small" id="flApply" data-v="${st}">${fmtN(st)} als Blende übernehmen</button>`;
      const ds = [0.5, 1, 1.5, 2, 3, 4, 5, 7, 10, 15, 20];
      rows = ds.map(d => { const v = g / d, sv = nearStop(v), out = (maxAp && v < maxAp) || (minAp && v > minAp); return `<tr class="${d === dist ? 'on' : ''}${out ? ' out' : ''}"><td>${String(d).replace('.', ',')} m</td><td>${fmtN(sv)}</td></tr>`; }).join('');
      const apSet = num(String(frame.aperture || '').replace(/^f\//, ''));
      if (apSet > 0) calc += `<p class="sub2" style="margin:8px 0 0">Mit der eingestellten Blende ${fmtN(apSet)} reicht der Blitz etwa ${String(Math.round(g / apSet * 10) / 10).replace('.', ',')} m.</p>`;
    }
    box.innerHTML = `
      ${flashes.length ? `<div class="flashpick" id="flashPick">${flashes.map(f => `<button type="button" class="chip${fl && fl.id === f.id ? ' on' : ''}" data-flash="${f.id}">${U.esc([f.maker, f.name].filter(Boolean).join(' ') || 'Blitz')}</button>`).join('')}</div>` : '<p class="hint">Noch kein Blitz im Zubehör. Mit Leitzahl angelegt, rechnet die App sie hier ein.</p>'}
      <p class="flashsync${tooFast ? ' warn' : ''}">${U.esc(flashSyncText(cam))}${tooFast ? ` Eingestellt ist ${U.esc(frame.shutter)} s, das ist schneller: Ein Teil des Bildes bleibt dunkel.` : ''}</p>
      <details class="flashcalc"${frame.flashCalcOpen ? ' open' : ''}><summary>Blitzrechner</summary>
        <div class="flgrid">
          <label class="fld"><span>ISO</span><input id="flIso" inputmode="numeric" value="${isoV}"></label>
          <label class="fld"><span>Leitzahl</span><input id="flGn" inputmode="decimal" value="${gn ? String(gn).replace('.', ',') : ''}"></label>
          <label class="fld"><span>Entfernung (m)</span><input id="flDist" inputmode="decimal" value="${String(dist).replace('.', ',')}"></label>
        </div>
        ${gn > 0 ? calc + `<table class="flashtable"><thead><tr><th>Entfernung</th><th>Blende</th></tr></thead><tbody>${rows}</tbody></table>
          <p class="hint" style="margin-top:6px">Blende = Leitzahl × √(ISO/100) ÷ Entfernung, gerundet auf Drittelstufen. Grau: außerhalb der Blenden des Objektivs. Gilt für direkten Blitz ohne Diffusor, Filter verlängern die Belichtung zusätzlich.</p>`
        : '<p class="hint">Leitzahl eintragen. Sie steht im Datenblatt oder in der Tabelle hinten auf dem Blitz (Wert bei ISO 100 und Meter).</p>'}
      </details>`;
    box.querySelector('#flashPick')?.addEventListener('click', e => {
      const b = e.target.closest('[data-flash]'); if (!b) return;
      frame.flashId = frame.flashId === b.dataset.flash ? null : b.dataset.flash; frame.flashGn = null;
      if (roll) { roll.lastFlashId = frame.flashId; DB.put('rolls', roll); }
      save(); drawFlash();
    });
    box.querySelector('.flashcalc').addEventListener('toggle', e => { frame.flashCalcOpen = e.target.open; save(); });
    const upd = (id, key) => box.querySelector('#' + id).addEventListener('change', async e => {
      frame[key] = num(e.target.value) || null;
      // Leitzahl gehört zum Blitz: im Zubehör mitspeichern
      if (key === 'flashGn' && fl && frame.flashGn) { const list = await getAccessories(); const a = list.find(x => x.id === fl.id); if (a) { a.gn = frame.flashGn; fl.gn = frame.flashGn; await saveAccessories(list); } frame.flashGn = null; }
      save(); drawFlash();
    });
    upd('flIso', 'flashIso'); upd('flGn', 'flashGn'); upd('flDist', 'flashDist');
    box.querySelector('#flApply')?.addEventListener('click', e => {
      const v = String(e.currentTarget.dataset.v);
      frame.aperture = v; if (!frame.shot) frame.shot = true;
      view.querySelector('#apChips').innerHTML = chipHtml(apList(), v);
      view.querySelector('#apOther').value = apList().includes(v) ? '' : v;
      U.haptic && U.haptic(10); save(); drawFlash();
    });
  };
  // Blitz: eigenes Fenster mit Blitzauswahl, Synchronzeit und Rechner
  const flashTog = view.querySelector('#flashTog');
  const syncFlash = () => { flashTog.classList.toggle('on', !!frame.flash); flashTog.setAttribute('aria-pressed', !!frame.flash); };
  const openFlash = () => {
    if (!frame.flash) { frame.flash = true; if (!frame.flashId && roll?.lastFlashId && flashes.some(f => f.id === roll.lastFlashId)) frame.flashId = roll.lastFlashId; save(); syncFlash(); }
    const ov = document.createElement('div'); ov.className = 'modalbg';
    ov.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="Blitz"><div class="flashbox" id="flashBox"></div>
      <div class="modalfoot"><button class="btn ghost small" id="flOff">Ohne Blitz</button><button class="okbtn" id="flOk" aria-label="Fertig">${ART.check}</button></div></div>`;
    document.body.appendChild(ov); drawFlash();
    ov.querySelector('#flOk').addEventListener('click', () => ov.remove());
    ov.querySelector('#flOff').addEventListener('click', () => { frame.flash = false; save(); syncFlash(); ov.remove(); });
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
  };
  tapToggle(flashTog, () => !!frame.flash, () => { frame.flash = false; save(); syncFlash(); }, openFlash);

  // Blende oder Zeit geändert: Hinweise im Blitzbereich neu rechnen
  ['apRow', 'shRow'].forEach(r => view.querySelector('#' + r).addEventListener('click', () => setTimeout(drawFlash, 0)));
  ['apOther', 'shOther'].forEach(r => view.querySelector('#' + r).addEventListener('input', () => setTimeout(drawFlash, 0)));
  view.querySelector('#lensRow')?.addEventListener('click', () => setTimeout(drawFlash, 0));
  drawFlash();
  // Notizen füllen den freien Platz bis zum unteren Rand (Platz für den Haken bleibt)
  let noteBase = 0;
  const fitNote = () => {
    const ta = view.querySelector('#note'); if (!ta) return;
    ta.style.height = '40px';
    const card = ta.closest('.card'); if (!card) return;
    const free = innerHeight - card.getBoundingClientRect().bottom - 96;   // unten bleibt Platz für den Haken
    noteBase = Math.max(40, Math.min(320, 40 + free));
    ta.style.height = Math.max(noteBase, ta.scrollHeight + 2) + 'px';
  };
  view.querySelectorAll('.mininote').forEach(ta => {
    const grow = () => { if (ta.id === 'note' && noteBase) { ta.style.height = noteBase + 'px'; ta.style.height = Math.max(noteBase, ta.scrollHeight + 2) + 'px'; return; } ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 2 + 'px'; };
    grow(); ta.addEventListener('input', () => { frame[ta.id] = ta.value; grow(); save(); });
  });
  fitChipRows(view);
  requestAnimationFrame(fitNote);
  let placeRefresh = null; wirePlace(view, 'framePlace', frame, () => { save(); showWx(); }).then(fn => { placeRefresh = fn; });
  showWx();
  view.querySelector('#lensRow')?.addEventListener('click', e => {
    const b = e.target.closest('[data-lens]'); if (!b) return;
    lensId = lensId === b.dataset.lens ? null : b.dataset.lens;
    frame.lensId = lensId;
    view.querySelectorAll('#lensRow .lensbtn').forEach(x => { const on = x.dataset.lens === lensId; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
    const cur = String(frame.aperture || '');
    view.querySelector('#apChips').innerHTML = chipHtml(apList(), cur);
    view.querySelector('#apOther').value = !cur || apList().includes(cur) ? '' : cur;
    fitChipRows(view);
    save();
    if (lensId && roll) { roll.lastLensId = lensId; DB.put('rolls', roll); }
  });
  // Belichtungsmesser (Test): übernimmt Blende und Zeit in diesen Frame
  view.querySelector('#meterBtn').addEventListener('click', async () => {
    const filt = filterIds.map(id => myFilters.find(f => f.id === id)).filter(Boolean).reduce((a, f) => a + METER.filterStops(filterName(f)), 0);
    METER.open({
      stock, roll, cam, frameLabel: frame.bonus ? 'B' : frameLabel(frame),
      filmArt: stock ? await filmArt(stock, 26) : '',
      lenses: camLenses.map(l => ({ id: l.id, label: lensLabel(l), focal: parseFloat(l.focal) || 0, apertures: lensApertures(l) })),
      lensId, shutters: shList, aperture: String(frame.aperture || '').replace(/^f\//, ''),
      iso: frame.iso || roll?.ei || '', boxIso: stock?.boxIso || '', filterSuggest: filt, hasPhone: !!frame.phoneId,
      onLog: async (r, blob) => {
        frame.aperture = r.aperture;
        frame.shutter = r.shutter;
        if (r.lensId) { frame.lensId = r.lensId; if (roll) { roll.lastLensId = r.lensId; DB.put('rolls', roll); } }
        frame.meter = Object.assign(r.meter, { at: nowLocal() });
        frame.shot = true;
        if (blob && !frame.phoneId) { try { frame.phoneId = (await U.storeImage(blob, 'phone')).id; } catch (_) {} }
        await flush(); U.toast('Messung geloggt'); route();
      }
    });
  });
  // Handyfoto und Doppelbelichtung: eigenes Fenster mit dem Referenzfoto (bei Doppelbelichtung zwei)
  const openPhoneModal = (dblMode) => {
    const ov = document.createElement('div'); ov.className = 'modalbg';
    let changed = false;
    const draw = async () => {
      const u1 = frame.phoneId ? await U.imgUrl(frame.phoneId) : null, u2 = frame.double && frame.phoneId2 ? await U.imgUrl(frame.phoneId2) : null;
      ov.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="${dblMode ? 'Doppelbelichtung' : 'Handyfoto'}">
        ${phoneBoxes(frame, u1, u2)}
        <div class="modalfoot">${dblMode ? '<button class="btn ghost small" id="dblOff">Keine Doppelbelichtung</button>' : '<span></span>'}<button class="okbtn" id="phOk" aria-label="Fertig">${ART.check}</button></div></div>`;
      const up = async (input, kind) => {
        const file = input.files[0]; if (!file) return;
        U.toast('Speichere Bild …');
        const rec = await U.storeImage(file, 'phone');
        if (kind === 'phone2') { await deleteImage(frame.phoneId2); frame.phoneId2 = rec.id; }
        else { await deleteImage(frame.phoneId); frame.phoneId = rec.id; }
        applyPhoneExif(frame, rec.exif);
        if (frame.placeSrc === 'exif' && !frame.place) placeName(frame.placeLat, frame.placeLng).then(n => { if (n && !frame.place) { frame.place = n; frame.placeNameAuto = true; if (placeName.cc) frame.placeCC = placeName.cc; DB.put('frames', frame); } });
        changed = true; await flush(); draw();
      };
      const q = sel => ov.querySelector(sel);
      q('#qPhone')?.addEventListener('change', e => up(e.target, 'phone'));
      q('#qPhoneCam')?.addEventListener('change', e => up(e.target, 'phone'));
      q('#qPhone2')?.addEventListener('change', e => up(e.target, 'phone2'));
      q('#qPhoneCam2')?.addEventListener('change', e => up(e.target, 'phone2'));
      q('#qPhoneRm')?.addEventListener('click', async () => { await deleteImage(frame.phoneId); frame.phoneId = null; changed = true; await flush(); draw(); });
      q('#qPhoneRm2')?.addEventListener('click', async () => { await deleteImage(frame.phoneId2); frame.phoneId2 = null; changed = true; await flush(); draw(); });
      ov.querySelectorAll('.phonethumb').forEach(img => img.addEventListener('click', e => zoom(e.target.src)));
      q('#phOk').addEventListener('click', close);
      q('#dblOff')?.addEventListener('click', async () => { frame.double = false; changed = true; await flush(); close(); });
    };
    const close = () => { ov.remove(); if (changed) route(); };
    ov.addEventListener('click', e => { if (e.target === ov) close(); });
    document.body.appendChild(ov); draw();
  };
  view.querySelector('#phoneTog')?.addEventListener('click', () => openPhoneModal(false));
  const dblBtn = view.querySelector('#dbl');
  if (dblBtn) {
    const syncDbl = () => { dblBtn.classList.toggle('on', !!frame.double); dblBtn.setAttribute('aria-pressed', !!frame.double); };
    tapToggle(dblBtn, () => !!frame.double,
      async () => { frame.double = false; await flush(); syncDbl(); },
      async () => { if (!frame.double) { frame.double = true; await flush(); syncDbl(); } openPhoneModal(true); });
  }

  function showRecip() {
    const el = view.querySelector('#recip');
    const tt = U.parseShutter(frame.shutter);
    if (!(tt > 0) || tt <= 1 || !stock) { el.textContent = ''; return; }
    const r = U.reciprocity(stock, tt);
    el.innerHTML = r.ok
      ? `Schwarzschild für ${U.esc(U.stockLabel(stock))}: gemessen ${U.fmtSec(tt)} → belichten <b>${U.fmtSec(r.tc)}</b>.`
      : `Schwarzschild: ${U.esc(r.msg)}`;
  }
  showRecip();

  // Haken unten rechts: speichern und zurück zur Bildübersicht der Rolle
  const done = document.createElement('button');
  done.className = 'donebtn goesback'; done.setAttribute('aria-label', 'Fertig'); done.innerHTML = ART.check;
  document.body.appendChild(done);
  done.addEventListener('click', async () => {
    await flush();
    let back = null; try { back = sessionStorage.getItem('kb-frame-return'); sessionStorage.removeItem('kb-frame-return'); } catch (_) {}
    location.hash = back || '#/rolle/' + frame.rollId;
  });

  // Wischen nach links oder rechts: nächstes oder vorheriges Bild
  const goTo = async f => { if (!f) return; await flush(); location.replace('#/bild/' + f.id); };
  // Mit dem Finger über die Bildleiste wischen: das Bild unter dem Finger wird markiert, beim Loslassen öffnet es sich
  const strip = view.querySelector('.framestrip');
  if (strip) {
    const marks = [...strip.children];
    let cur = marks.findIndex(m => m.classList.contains('on')), scrub = false, tip = null;
    const at = x => { const a = marks[0].getBoundingClientRect(), b = marks[marks.length - 1].getBoundingClientRect(); return Math.max(0, Math.min(marks.length - 1, Math.floor((x - a.left) / (b.right - a.left) * marks.length))); };
    const show = i => {
      if (i === cur) return;
      cur = i; U.haptic && U.haptic();
      marks.forEach((m, j) => m.classList.toggle('on', j === i));
      const f = all[i];
      if (!tip) { tip = document.createElement('div'); tip.className = 'striptip'; strip.appendChild(tip); }
      tip.textContent = f.bonus ? 'Bonusbild' : 'Bild ' + frameLabel(f);
      tip.style.left = (marks[i].offsetLeft + marks[i].offsetWidth / 2) + 'px';
    };
    strip.addEventListener('pointerdown', e => { scrub = true; strip.setPointerCapture(e.pointerId); cur = -1; show(at(e.clientX)); e.preventDefault(); });
    strip.addEventListener('pointermove', e => { if (scrub) show(at(e.clientX)); });
    const end = () => { if (!scrub) return; scrub = false; tip?.remove(); tip = null; const f = all[cur]; if (f && f.id !== frame.id) goTo(f); else marks.forEach(m => m.classList.toggle('on', m.dataset.id === frame.id)); };
    strip.addEventListener('pointerup', end); strip.addEventListener('pointercancel', end);
  }
  // Große Knöpfe am linken und rechten Rand, mittig
  [[prev, 'prev', 'M15 5l-7 7 7 7'], [next, 'next', 'M9 5l7 7-7 7']].forEach(([f, side, d]) => {
    if (!f) return;
    const b = document.createElement('button');
    b.className = 'framenavbtn ' + side;
    b.setAttribute('aria-label', (side === 'prev' ? 'Vorheriges Bild ' : 'Nächstes Bild ') + frameLabel(f));
    b.innerHTML = `<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg><span>${frameLabel(f)}</span>`;
    b.addEventListener('click', () => goTo(f));
    document.body.appendChild(b);
  });
  let t0 = null;
  const onStart = e => {
    if (e.target.closest('.slides, input, textarea, select, label, .cmprange, .framestrip, .lensrow, .chipwrap, .ffsel, .seggroup, .placetime, .togrow')) { t0 = null; return; }
    t0 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onEnd = e => {
    if (!t0) return;
    const dx = e.changedTouches[0].clientX - t0.x, dy = e.changedTouches[0].clientY - t0.y;
    t0 = null;
    if (String(window.getSelection?.() || '')) return;   // Text markiert: kein Blättern
    if (Math.abs(dx) > 100 && Math.abs(dx) > Math.abs(dy) * 2) goTo(dx < 0 ? next : prev);
  };
  const onKey = e => { if (e.target.closest('input, textarea')) return; if (e.key === 'ArrowRight') goTo(next); if (e.key === 'ArrowLeft') goTo(prev); };
  view.addEventListener('touchstart', onStart, { passive: true });
  view.addEventListener('touchend', onEnd, { passive: true });
  document.addEventListener('keydown', onKey);
  window.addEventListener('hashchange', () => {
    view.removeEventListener('touchstart', onStart); view.removeEventListener('touchend', onEnd);
    document.removeEventListener('keydown', onKey);
  }, { once: true });
}

function phoneBoxes(frame, url1, url2) {
  const box = (url, sfx, title) => `<div class="phonebox">
      ${url ? `<img src="${url}" alt="${title}" class="phonethumb zoomable">` : `<span class="phoneicon">▣</span>`}
      <div class="phonetxt"><b>${title}</b>
        <div class="row gap" style="padding:0;margin:8px 0 0">
          <label class="btn ghost small">${url ? 'Ersetzen' : 'Aus Mediathek'}<input type="file" accept="image/*" hidden id="qPhone${sfx}"></label>
          ${url ? `<button class="btn ghost small" id="qPhoneRm${sfx}">Entfernen</button>` : `<label class="btn ghost small">Aufnehmen<input type="file" accept="image/*" capture="environment" hidden id="qPhoneCam${sfx}"></label>`}
        </div>
      </div>
    </div>`;
  return frame.double
    ? box(url1, '', 'Handyfoto 1. Belichtung') + box(url2, '2', 'Handyfoto 2. Belichtung')
    : box(url1, '', 'Handyfoto');
}

function renderMedia(el, scanUrl, phones, frame) {
  if (!scanUrl) { el.innerHTML = ''; return; }   // ohne Scan zeigt die Schnellauswahl das Handyfoto
  const phoneUrl = phones[0];
  if (!phoneUrl) {
    el.innerHTML = `<div class="media${frame.bonus ? ' bonus' : ''}"><img src="${scanUrl}" alt="" class="zoomable"></div>`;
  } else {
    let mode = 'slides';
    const draw = () => {
      const modes = [['slides', 'Wischen'], ['slider', 'Schieber'], ['side', 'Nebeneinander']];
      let inner = '';
      if (mode === 'slides') inner = `
        <div class="slides" id="slides">
          <div class="slide"><div class="media${frame.bonus ? ' bonus' : ''}"><img src="${scanUrl}" class="zoomable" alt="Scan"><span class="lbl">Analog</span></div></div>
          ${phones.map((u, k) => `<div class="slide"><div class="media"><img src="${u}" class="zoomable" alt="Handyfoto"><span class="lbl">Handy${phones.length > 1 ? ' ' + (k + 1) : ''}</span></div></div>`).join('')}
        </div>
        <div class="dots"><i class="on"></i>${phones.map(() => '<i></i>').join('')}</div>`;
      else if (mode === 'side') inner = `<div class="side"><div class="media"><img src="${scanUrl}" class="zoomable"><span class="lbl">Analog</span></div><div class="media"><img src="${phoneUrl}" class="zoomable"><span class="lbl">Handy</span></div></div>`;
      else inner = `<div class="media cmp"><img src="${phoneUrl}" class="under"><img src="${scanUrl}" class="over" style="clip-path:inset(0 50% 0 0)"><div class="cmpline" style="left:50%"></div><span class="lbl l">Analog</span><span class="lbl r">Handy</span></div><input type="range" min="0" max="100" value="50" class="cmprange" aria-label="Vergleich verschieben">`;
      el.innerHTML = `${inner}<div class="seggroup small">${modes.map(([k, t]) => `<button class="seg${k === mode ? ' on' : ''}" data-m="${k}">${t}</button>`).join('')}</div>`;
      const sl = el.querySelector('#slides');
      if (sl) sl.addEventListener('scroll', () => {
        const i = Math.round(sl.scrollLeft / sl.clientWidth);
        el.querySelectorAll('.dots i').forEach((d, k) => d.classList.toggle('on', k === i));
      }, { passive: true });
      const r = el.querySelector('.cmprange');
      if (r) r.addEventListener('input', () => {
        el.querySelector('.over').style.clipPath = `inset(0 ${100 - r.value}% 0 0)`;
        el.querySelector('.cmpline').style.left = r.value + '%';
      });
    };
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-m]'); if (!b) return;
      mode = b.dataset.m; draw();
    });
    draw();
  }
  el.addEventListener('click', e => { const img = e.target.closest('img.zoomable'); if (img) zoom(img.src); });
}

/* ---------- Fotoalbum: Raster, Einzelfoto, Buch ---------- */
async function albumData(id) {
  const rolls = new Map((await DB.all('rolls')).map(r => [r.id, r]));
  const stocks = await stocksMap();
  const cams = new Map((await DB.all('cameras')).map(c => [c.id, c]));
  const lenses = new Map((await DB.all('lenses')).map(l => [l.id, l]));
  let frames, title, roll = null;
  if (id === 'alle') {
    const order = [...rolls.values()].sort((a, b) => (b.loadedAt || '').localeCompare(a.loadedAt || '')).map(r => r.id);
    frames = (await DB.all('frames')).filter(f => f.imgId && rolls.has(f.rollId));
    frames.sort((a, b) => order.indexOf(a.rollId) - order.indexOf(b.rollId) || a.index - b.index);
    title = 'Alle Fotos';
  } else {
    roll = rolls.get(id);
    if (!roll) return null;
    frames = (await framesOf(id)).filter(f => f.imgId);
    title = roll.title || U.stockLabel(stocks.get(roll.stockId));
  }
  const fav = id === 'alle';
  // Kurzzeile unter dem Foto: Brennweite, Blende, Zeit, Notiz; sonst nur der Tag
  const line = f => {
    const l = lenses.get(f.lensId);
    const bits = [f.iso ? `ISO ${f.iso}` : '', l?.focal ? `${l.focal} mm` : '', f.aperture ? `f/${String(f.aperture).replace(/^f\//, '').replace('.', ',')}` : '', f.shutter ? (/^\d+$/.test(f.shutter) ? `${f.shutter} s` : f.shutter) : ''].filter(Boolean);
    const r = rolls.get(f.rollId);
    // Aufnahmetag, ersatzweise der Tag der Entwicklung
    const d = f.date || r?.dev?.backAt || r?.dev?.devDate || r?.dev?.sentAt || '';
    const film = U.stockLabel(stocks.get(r?.stockId));
    const gear = [film, fav ? camLabel(cams.get(r?.cameraId)) : ''].filter(Boolean).join(' · ');
    const date = [f.place, d ? U.fmtDate(d) : ''].filter(Boolean).join(', ');
    return { tech: bits.join(' · '), note: f.note || f.memory || '', date, gear, spec: [gear, date].filter(Boolean).join(', ') };
  };
  return { frames, title, roll, line, fav, rolls, stocks, cams, lenses };
}

// Ort auswählen: schon benutzte Orte, auf der Karte (mit Suche) oder aktueller Standort
async function knownPlaces(rollId) {
  const m = new Map();
  for (const f of await DB.all('frames')) {
    if (!f.place) continue;
    const e = m.get(f.place) || { name: f.place, n: 0, lat: null, lng: null, cc: null, fr: [] };
    if (rollId && f.rollId === rollId) e.fr.push(f);
    e.n++; if (e.lat == null && f.placeLat != null) { e.lat = +f.placeLat; e.lng = +f.placeLng; e.cc = f.placeCC || null; }
    m.set(f.place, e);
  }
  for (const r of await DB.all('rolls')) if (r.place && !m.has(r.place)) m.set(r.place, { name: r.place, n: 0, lat: r.placeLat ?? null, lng: r.placeLng ?? null, cc: r.placeCC || null });
  // Orte aus der eigenen Rolle zuerst, mit den Frames, die ihn schon haben (so lässt sich der Ort eines Frames auf weitere übertragen)
  return [...m.values()].map(e => ({ ...e, fr: e.fr || [] })).sort((a, b) => (b.fr.length > 0) - (a.fr.length > 0) || b.n - a.n || a.name.localeCompare(b.name, 'de'));
}
async function openPlaceChooser(onPick, opts = {}) {
  const places = await knownPlaces(opts.rollId);
  const frTxt = p => { const l = p.fr.sort((a, b) => a.index - b.index).map(frameLabel); return (l.length === 1 ? 'Frame ' : 'Frames ') + (l.length > 4 ? l.slice(0, 4).join(', ') + ' …' : l.join(', ')); };
  const ov = document.createElement('div'); ov.className = 'modalbg';
  ov.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="Ort wählen">
    <div class="pcacts"><button type="button" class="btn ghost" id="pcMap">${MAP_PICK_IC}<span>${opts.city ? 'Stadt suchen' : 'Auf der Karte'}</span></button><button type="button" class="btn ghost" id="pcGps">${PIN_IC}<span>Hier</span></button></div>
    ${places.length ? `<div class="pclist">${places.map((p, i) => `<button type="button" class="pcitem" data-i="${i}"><span>${U.esc(p.name)}</span><span class="sub2${p.fr.length ? ' pcfr' : ''}">${p.fr.length ? frTxt(p) : p.n ? p.n + (p.n === 1 ? ' Foto' : ' Fotos') : ''}</span></button>`).join('')}</div>` : ''}
    <div class="modalfoot"><button class="closex" id="pcNo" aria-label="Abbrechen">${ART.x}</button><span></span></div></div>`;
  document.body.appendChild(ov);
  const done = p => { ov.remove(); onPick(p); };
  ov.querySelector('#pcNo').onclick = () => ov.remove();
  ov.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { const p = places[+b.dataset.i]; done({ name: p.name, lat: p.lat, lng: p.lng, cc: p.cc, src: 'list' }); });
  ov.querySelector('#pcMap').onclick = () => { ov.remove(); openMapPicker(null, p => onPick({ ...p, src: 'map', auto: !!p.name }), opts); };
  ov.querySelector('#pcGps').onclick = async e => {
    e.currentTarget.disabled = true;
    try { const c = await getPosition(true); const n = await placeName(c.latitude, c.longitude); done({ name: n, lat: c.latitude, lng: c.longitude, cc: placeName.cc, src: 'pin', auto: true }); }
    catch (_) { U.toast('Standort nicht freigegeben'); e.currentTarget.disabled = false; }
  };
}
let ALBUM_PICK = false, ALBUM_PICKED = new Set();
async function viewAlbum(id) {
  const d = await albumData(id);
  if (!d) { location.replace('#/'); return; }
  // Kopfzeile nur mit Titel. Film, Kamera und Entwicklung erreicht man über die gut sichtbare Zeile unter dem Namen (vorher „Rolle“ klein oben rechts).
  setHeader(d.title);
  const st = d.roll ? d.stocks.get(d.roll.stockId) : null, cm = d.roll ? d.cams.get(d.roll.cameraId) : null;
  // Film als kleiner Kreis: antippen öffnet Film, Kamera und Entwicklung der Rolle
  const filmCircle = d.roll ? `<a class="albfilm" href="#/rolle/${d.roll.id}/info" aria-label="${U.esc(U.stockLabel(st))}, ${U.esc(camLabel(cm) || 'Kamera unbekannt')}: bearbeiten" title="${U.esc(U.stockLabel(st))}">${await filmArt(st, 30)}</a>` : '';
  const infoRow = '';
  // Fotos nachtragen: füllen zuerst Bilder ohne Foto (nach Dateinamen sortiert), weitere kommen als neue Bilder hinten dran
  const addPhotosBtn = d.roll ? `<label class="roundic" aria-label="Fotos nachtragen" title="Fotos nachtragen">${ART.pickup}<input type="file" accept="image/*" multiple hidden id="albAdd"></label>` : '';
  const phoneBtn = d.roll ? `<label class="roundic" aria-label="Handyfotos als Referenz zuordnen" title="Handyfotos zuordnen">${REF_IMP_IC}<input type="file" accept="image/*" multiple hidden id="albPhone"></label>` : '';
  const sheetBtn = d.roll && d.frames.length ? `<button type="button" class="roundic" id="albSheet" aria-label="Contact Sheet als PDF" title="Contact Sheet">${SHEET_IC}</button>` : '';
  const wireAdd = () => view.querySelector('#albAdd')?.addEventListener('change', async e => {
    const files = [...e.target.files]; if (!files.length) return;
    const n = await assignScans(d.roll, files);
    U.toast(`${n} ${n === 1 ? 'Foto' : 'Fotos'} nachgetragen`); U.haptic && U.haptic([12, 40, 12]);
    const y = window.scrollY; await viewAlbum(id); window.scrollTo(0, y);
  });
  if (!d.frames.length) { view.innerHTML = `<div class="albhead">${filmCircle}<span class="albname"></span><div class="albtools">${addPhotosBtn}</div></div><div class="empty">Noch keine Fotos im Album.</div>`; wireAdd(); return; }
  const thumbs = await Promise.all(d.frames.map(f => U.imgUrl(f.imgId, true)));
  const leakCam = !!(d.roll && d.cams.get(d.roll.cameraId)?.lightLeaks);
  view.innerHTML = `
    <div class="albhead">${filmCircle}
      ${d.roll ? `<label class="rollname albname"><span>Name der Rolle</span><input id="rollName" maxlength="80" value="${U.esc(d.roll.title || '')}" enterkeyhint="done"></label>` : '<span class="albname"></span>'}
    </div>
    <div class="albtools">${ALBUM_SORT || ALBUM_PICK ? '' : sheetBtn + addPhotosBtn + phoneBtn}${d.roll && !ALBUM_SORT ? `<button type="button" class="roundic${ALBUM_PICK ? ' on' : ''}" id="albPick" aria-pressed="${ALBUM_PICK}" aria-label="Ort für mehrere Fotos festlegen" title="Ort für mehrere Fotos">${PIN_IC}</button>` : ''}${d.frames.length > 1 && !ALBUM_PICK ? `<button type="button" class="roundic${ALBUM_SORT ? ' on' : ''}" id="albSort" aria-pressed="${ALBUM_SORT}" aria-label="Reihenfolge ändern" title="Reihenfolge">${MOVE_IC}</button>` : ''}</div>
    ${ALBUM_PICK ? '<p class="hint pad sorthint">Tippe die Fotos an, die denselben Ort bekommen sollen.</p>' : ''}
    ${ALBUM_SORT ? '<p class="hint pad sorthint">Halte ein Foto kurz gedrückt und ziehe es an die richtige Stelle. Blende, Zeit, Notiz und alle anderen Einträge wandern mit.</p>' : ''}
    <div class="photogrid${ALBUM_SORT ? ' sorting' : ''}${ALBUM_PICK ? ' picking' : ''}" data-roll="${id}">${d.frames.map((f, i) => `<a href="#/foto/${id}/${f.id}" data-fid="${f.id}" aria-label="Bild ${frameLabel(f)}"><img src="${thumbs[i]}" alt="" loading="lazy" draggable="false">${ALBUM_SORT ? `<span class="sortnum">${frameLabel(f)}</span>` : ALBUM_PICK ? '<span class="pickmark" aria-hidden="true"></span>' : (f.leak ? '<span class="leakdot" title="Lightleak"></span>' : '')}</a>`).join('')}</div>
    <div class="modewrap"><a class="modebtn" href="#/album/${id}/buch"><span class="mbicon">${ART.album}</span><span>Fotoalbum ansehen</span></a></div>
    ${d.roll ? `<div class="modewrap"><button class="btn ghost small" id="albFilters">${SEARCH_IC}Filter für alle Bilder eintragen</button></div>` : ''}
    ${leakCam ? `<div class="modewrap"><button class="btn ghost small" id="leakEdit">${d.roll.leaksMarked ? 'Lightleaks ändern' : 'Lightleaks markieren'}</button></div>` : ''}`;
  view.querySelector('#leakEdit')?.addEventListener('click', () => openLeakPicker(d.roll, () => route()));
  wireAdd();
  view.querySelector('#albSheet')?.addEventListener('click', () => openContactSheet(id));
  view.querySelector('#albPhone')?.addEventListener('change', e => { const files = [...e.target.files]; e.target.value = ''; if (files.length) openPhoneImport(d.roll, files); });
  // Ort für mehrere Fotos: Auswahlmodus, dann Ort aus der Liste, auf der Karte oder per Standort
  view.querySelector('#albPick')?.addEventListener('click', async () => { ALBUM_PICK = !ALBUM_PICK; ALBUM_PICKED = new Set(); U.haptic && U.haptic(10); const y = window.scrollY; await viewAlbum(id); window.scrollTo(0, y); });
  if (ALBUM_PICK) {
    const grid = view.querySelector('.photogrid');
    const bar = document.createElement('div'); bar.className = 'pickbar';
    const drawBar = () => { bar.innerHTML = `<span>${ALBUM_PICKED.size} ausgewählt</span><button type="button" class="btn small" id="pbAll">${ALBUM_PICKED.size === d.frames.length ? 'Keins' : 'Alle'}</button><button type="button" class="btn accent small" id="pbGo"${ALBUM_PICKED.size ? '' : ' disabled'}>Ort wählen</button>`;
      bar.querySelector('#pbAll').onclick = () => { if (ALBUM_PICKED.size === d.frames.length) ALBUM_PICKED.clear(); else d.frames.forEach(f => ALBUM_PICKED.add(f.id)); grid.querySelectorAll('[data-fid]').forEach(a => a.classList.toggle('picked', ALBUM_PICKED.has(a.dataset.fid))); drawBar(); };
      bar.querySelector('#pbGo').onclick = () => openPlaceChooser(async p => {
        let n = 0;
        for (const fid of ALBUM_PICKED) { const fr = await DB.get('frames', fid); if (!fr) continue; fr.place = p.name || fr.place || ''; if (p.lat != null) { fr.placeLat = p.lat; fr.placeLng = p.lng; delete fr.placeAcc; fr.placeSrc = p.src || 'map'; if (p.cc) fr.placeCC = p.cc; } fr.placeNameAuto = !!p.auto; await DB.put('frames', fr); n++; }
        ALBUM_PICK = false; ALBUM_PICKED = new Set(); bar.remove();
        U.toast(`Ort bei ${n} ${n === 1 ? 'Foto' : 'Fotos'} eingetragen`); U.haptic && U.haptic([12, 40, 12]);
        const y = window.scrollY; await viewAlbum(id); window.scrollTo(0, y);
      }); };
    drawBar(); document.body.appendChild(bar);
    window.addEventListener('hashchange', () => { bar.remove(); ALBUM_PICK = false; }, { once: true });
    grid.addEventListener('click', e => { const a = e.target.closest('[data-fid]'); if (!a) return; e.preventDefault(); const k = a.dataset.fid; ALBUM_PICKED.has(k) ? ALBUM_PICKED.delete(k) : ALBUM_PICKED.add(k); a.classList.toggle('picked', ALBUM_PICKED.has(k)); U.haptic && U.haptic(8); drawBar(); });
  }
  // Filter nachträglich für die ganze Rolle: wird bei allen Bildern ergänzt, schon eingetragene Filter bleiben
  view.querySelector('#albFilters')?.addEventListener('click', async () => {
    const all = await getFilters();
    openFrameFilterSearch(all, [], d.roll, async ids => {
      if (!ids.length) return;
      const frs = await framesOf(d.roll.id); let n = 0;
      for (const fr of frs) { const had = fr.filterIds || []; const next = [...new Set([...had, ...ids])]; if (next.length !== had.length) { fr.filterIds = next; await DB.put('frames', fr); n++; } }
      d.roll.lastFilterIds = [...ids]; await DB.put('rolls', d.roll);
      U.toast(n ? `Filter bei ${n} ${n === 1 ? 'Bild' : 'Bildern'} eingetragen` : 'War schon überall eingetragen'); U.haptic && U.haptic([12, 40, 12]);
    });
  });
  // Reihenfolge der Fotos per Ziehen ändern (wie in „Alle Fotos“)
  view.querySelector('#albSort')?.addEventListener('click', async () => {
    ALBUM_SORT = !ALBUM_SORT; U.haptic && U.haptic(10);
    const y = window.scrollY; await viewAlbum(id); window.scrollTo(0, y);
  });
  while (PHOTOSORT_OFF.length) PHOTOSORT_OFF.pop()();
  if (ALBUM_SORT) view.querySelectorAll('.photogrid.sorting').forEach(g => setupPhotoSort(g, () => viewAlbum(id)));
  let pick = null;
  try { pick = sessionStorage.getItem('kb-leakpick'); if (pick === id) sessionStorage.removeItem('kb-leakpick'); } catch (_) {}
  if (leakCam && pick === id) setTimeout(() => openLeakPicker(d.roll, () => route()), 350);
  const nameIn = view.querySelector('#rollName');
  if (nameIn) {
    const save = async () => { d.roll.title = nameIn.value.trim(); await DB.put('rolls', d.roll); titleEl.textContent = d.roll.title || U.stockLabel(await DB.get('stocks', d.roll.stockId)); };
    let nt;
    nameIn.addEventListener('input', () => { clearTimeout(nt); nt = setTimeout(save, 400); });
    nameIn.addEventListener('keydown', e => { if (e.key === 'Enter') nameIn.blur(); });
    nameIn.addEventListener('blur', save);
  }
}

/* Aufnahmeort: freier Text, Vorschläge aus schon benutzten Orten, „Standort“ füllt den Ort über GPS
   (Ortsname per OpenStreetMap Nominatim, ohne Netz nur die Koordinaten). */
// Symbolknopf: Tippen schaltet aus, wenn an; sonst an und Fenster öffnen. Gedrückt halten öffnet das Fenster immer.
function tapToggle(btn, isOn, off, open) {
  let timer = null, long = false;
  btn.addEventListener('pointerdown', () => { long = false; clearTimeout(timer); timer = setTimeout(() => { long = true; U.haptic && U.haptic(15); open(); }, 450); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, () => clearTimeout(timer)));
  btn.addEventListener('contextmenu', e => e.preventDefault());
  btn.addEventListener('click', () => {
    if (long) { long = false; return; }
    U.haptic && U.haptic(10);
    if (isOn()) off(); else open();
  });
}
const CLOCK_IC = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>';
const PHONE_TOG_IC = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/></svg>';
// Aufnahmezeit mit Jahr: „14.08.2026, 19:52“
function fmtShotLong(v) { const s = String(v || ''); if (!s) return ''; const [d, tm] = s.split('T'); const [y, m, dd] = d.split('-'); return `${dd}.${m}.${y}${tm && !/^12:00(:00)?$/.test(tm) ? ', ' + tm.slice(0, 5) : ''}`; }
// Aufnahmezeit minutengenau: „03.11. 14:32“, aus einem anderen Jahr mit Jahr
function fmtShot(v) {
  const s = String(v || ''); if (!s) return '';
  const [d, tm] = s.split('T'); const [y, m, dd] = d.split('-');
  return `${dd}.${m}.${y !== String(new Date().getFullYear()) ? y.slice(2) : ''} ${tm ? tm.slice(0, 5) : ''}`.trim();
}
// Chipreihen (Blende, Zeit): eine Reihe, wenn alles passt, sonst gleichmäßig auf möglichst wenige Reihen verteilt
function fitChipRows(root) {
  root.querySelectorAll('.fitchips').forEach(row => {
    const items = [...row.querySelectorAll('.chip'), row.querySelector('.chip-input')].filter(Boolean);
    const avail = row.clientWidth; if (!avail || !items.length) return;
    const gap = 5, longest = Math.max(3, ...items.map(x => (x.textContent || '').trim().length));
    const w = longest * 6 + 4;   // Ziffern bei 13 px rund 6 px breit
    const maxCols = Math.max(1, Math.floor((avail + gap) / (w + gap)));
    const rows = Math.ceil(items.length / maxCols);
    row.style.setProperty('--cols', Math.ceil(items.length / rows));
    const inp = row.querySelector('.chip-input'); if (inp) { inp.setAttribute('aria-label', 'andere'); inp.placeholder = avail / Math.ceil(items.length / rows) < 56 ? '…' : 'andere'; }
  });
}
const FILTER_TOG_IC = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="9.5" cy="12" r="6"/><circle cx="14.5" cy="12" r="6"/></svg>';
const FLASH_TOG_IC = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M13.5 2.5 5 13.5h6l-1.5 8 8.5-11h-6z"/></svg>';
const PIN_IC = '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6.5-6.2-6.5-11.2A6.5 6.5 0 0 1 12 3.3a6.5 6.5 0 0 1 6.5 6.5C18.5 14.8 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.3"/></svg>';
async function placeOptions() { return [...new Set((await DB.all('frames')).map(f => f.place).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'de')); }
function placeFieldHtml(id, value, cls = 'fld', obj = null) {
  return `<div class="${cls} placefld"><span>Ort</span><div class="placefld1"><input id="${id}" list="${id}List" maxlength="80" value="${U.esc(value || '')}" enterkeyhint="done" autocomplete="off"><datalist id="${id}List"></datalist><button type="button" class="placepin placemap" id="${id}Map" aria-label="Ort auf der Karte wählen">${MAP_PICK_IC}</button><button type="button" class="placepin" id="${id}Gps" aria-label="Standort abfragen">${PIN_IC}</button></div><span class="placecoord" id="${id}Coord">${U.esc(fmtCoord(obj))}</span></div>`;
}
// Standort: genaue Koordinaten (mit Genauigkeit in Metern), Ortsname per OpenStreetMap Nominatim
function getPosition(precise = true) {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error('nogeo'));
    navigator.geolocation.getCurrentPosition(p => res(p.coords), rej, { enableHighAccuracy: precise, timeout: 20000, maximumAge: 15000 });
  });
}
let NOMI_LAST = 0;
async function placeName(la, lo) {
  // Nominatim erlaubt höchstens eine Anfrage pro Sekunde
  const wait = NOMI_LAST + 1100 - Date.now(); if (wait > 0) await new Promise(r => setTimeout(r, wait));
  NOMI_LAST = Date.now(); placeName.cc = null;
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=14&accept-language=de&lat=${la}&lon=${lo}`);
    const a = (await r.json()).address || {};
    placeName.cc = a.country_code || null;   // Land, für die Analytics (Zuhause oder Ausland)
    const local = a.suburb || a.village || a.town || a.city_district || a.neighbourhood || '', city = a.city || a.town || a.village || a.municipality || '';
    return [local !== city ? local : '', city].filter(Boolean).join(', ') || null;
  } catch (_) { return null; }
}
const fmtCoord = o => o && o.placeLat != null ? `${(+o.placeLat).toFixed(5).replace('.', ',')}, ${(+o.placeLng).toFixed(5).replace('.', ',')}${o.placeAcc ? ` · ±${Math.round(o.placeAcc)} m` : ''}` : '';
// Handyfoto: Aufnahmezeit und GPS aus den EXIF-Daten übernehmen, ohne Eingetragenes zu überschreiben
function exifLocal(iso) { const d = new Date(iso); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 19); }
function applyPhoneExif(frame, ex) {
  if (!ex) return false;
  let ch = false;
  if (ex.taken && !frame.dateSet) { frame.date = exifLocal(ex.taken); ch = true; }
  // Der Ort aus dem Handyfoto stammt vom Moment der Aufnahme. Er ersetzt einen automatisch beim Eintragen gemessenen Ort,
  // nicht aber einen, den man selbst per Standortsymbol abgefragt hat.
  const replaceable = frame.placeLat == null || !frame.placeSrc || ['auto', 'gps', 'exif'].includes(frame.placeSrc);
  if (typeof ex.lat === 'number' && typeof ex.lng === 'number' && replaceable) {
    if (frame.placeNameAuto) frame.place = '';
    frame.placeLat = ex.lat; frame.placeLng = ex.lng; delete frame.placeAcc; frame.placeAt = ex.taken || null; frame.placeSrc = 'exif'; ch = true;
  }
  return ch;
}
async function readExif(file) {
  try {
    const e = await exifr.parse(file, { gps: true, tiff: true, exif: true });
    return e ? { lat: typeof e.latitude === 'number' ? e.latitude : null, lng: typeof e.longitude === 'number' ? e.longitude : null, taken: e.DateTimeOriginal ? new Date(e.DateTimeOriginal).toISOString() : null } : {};
  } catch (_) { return {}; }
}
// Mehrere Handyfotos auf einmal den Frames einer Rolle zuordnen
async function openPhoneImport(roll, files) {
  U.toast('Lese Fotos …');
  const items = await Promise.all(files.map(async file => ({ file, ex: await readExif(file) })));
  items.sort((a, b) => (a.ex.taken || '9').localeCompare(b.ex.taken || '9'));
  const frames = await framesOf(roll.id);
  const withLoc = items.filter(i => i.ex.lat != null).length;
  const dated = frames.some(f => f.date) && items.some(i => i.ex.taken);
  let mode = 'seq', start = (frames.find(f => !f.phoneId) || frames[0])?.id;
  const ov = document.createElement('div');
  ov.className = 'modalbg';
  const urls = items.map(i => { try { return URL.createObjectURL(i.file); } catch (_) { return ''; } });
  const plan = () => {
    const out = new Map();
    if (mode === 'time') {
      const used = new Set();
      items.forEach((it, k) => {
        if (!it.ex.taken) return;
        const t = new Date(it.ex.taken).getTime();
        let best = null, bd = Infinity;
        frames.forEach(f => { if (!f.date || used.has(f.id)) return; const d = Math.abs(new Date(f.date).getTime() - t); if (d < bd) { bd = d; best = f; } });
        if (best) { used.add(best.id); out.set(k, best); }
      });
    } else {
      let j = Math.max(0, frames.findIndex(f => f.id === start));
      items.forEach((_, k) => { while (j < frames.length && frames[j].phoneId && frames[j].id !== start) j++; if (j < frames.length) out.set(k, frames[j++]); });
    }
    return out;
  };
  const tm = iso => iso ? new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '–';
  const draw = () => {
    const p = plan();
    ov.querySelector('#piList').innerHTML = items.map((it, k) => `<div class="pirow"><img src="${urls[k]}" alt=""><span>${tm(it.ex.taken)}</span><span class="pipin${it.ex.lat != null ? ' on' : ''}" aria-label="${it.ex.lat != null ? 'mit Ort' : 'ohne Ort'}">${PIN_IC}</span><span class="pito">${p.has(k) ? 'Bild ' + frameLabel(p.get(k)) : '–'}</span></div>`).join('');
    ov.querySelector('#piStartRow').hidden = mode !== 'seq';
    ov.querySelector('#piOk').disabled = !p.size;
  };
  ov.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="piTitle">
    <h2 id="piTitle">Handyfotos zuordnen</h2>
    <p class="sub2">${items.length} ${items.length === 1 ? 'Foto' : 'Fotos'} · ${withLoc} mit Ort</p>
    ${withLoc < items.length ? '<p class="hint">Fehlt der Ort, beim Auswählen auf dem iPhone oben „Optionen“ antippen und „Ort“ einschalten.</p>' : ''}
    ${dated ? `<div class="seggroup" id="piMode"><button type="button" data-m="seq" class="seg on">Der Reihe nach</button><button type="button" data-m="time" class="seg">Nach Uhrzeit</button></div>` : ''}
    <label class="fld" id="piStartRow"><span>Ab Bild</span><select id="piStart">${frames.map(f => `<option value="${f.id}"${f.id === start ? ' selected' : ''}>${frameLabel(f)}${f.phoneId ? ' (hat Handyfoto)' : ''}</option>`).join('')}</select></label>
    <div class="pilist" id="piList"></div>
    <div class="modalfoot"><button class="closex" id="piNo" aria-label="Abbrechen">${ART.x}</button><button class="btn accent" id="piOk">Zuordnen</button></div>
  </div>`;
  document.body.appendChild(ov);
  const close = () => { urls.forEach(u => { try { URL.revokeObjectURL(u); } catch (_) {} }); ov.remove(); };
  ov.querySelector('#piNo').addEventListener('click', close);
  ov.querySelector('#piMode')?.addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (!b) return; mode = b.dataset.m; ov.querySelectorAll('#piMode button').forEach(x => x.classList.toggle('on', x === b)); draw(); });
  ov.querySelector('#piStart').addEventListener('change', e => { start = e.target.value; draw(); });
  ov.querySelector('#piOk').addEventListener('click', async () => {
    const p = plan(); const btn = ov.querySelector('#piOk'); btn.disabled = true; btn.textContent = 'Speichere …';
    const geo = [];
    for (const [k, f] of p) {
      const rec = await U.storeImage(items[k].file, 'phone');
      await deleteImage(f.phoneId); f.phoneId = rec.id;
      applyPhoneExif(f, rec.exif && rec.exif.taken ? rec.exif : items[k].ex);
      if (f.placeSrc === 'exif' && !f.place) geo.push(f);
      await DB.put('frames', f);
    }
    close();
    U.toast(`${p.size} ${p.size === 1 ? 'Foto' : 'Fotos'} zugeordnet`);
    route();
    for (const f of geo) { const n = await placeName(f.placeLat, f.placeLng); if (n) { const fresh = await DB.get('frames', f.id); if (fresh && !fresh.place) { fresh.place = n; fresh.placeNameAuto = true; if (placeName.cc) fresh.placeCC = placeName.cc; await DB.put('frames', fresh); } } }
  });
  draw();
}
async function wirePlace(root, id, obj, persist) {
  const inp = root.querySelector('#' + id), dl = root.querySelector('#' + id + 'List'), gps = root.querySelector('#' + id + 'Gps'), co = root.querySelector('#' + id + 'Coord');
  if (!inp) return;
  dl.innerHTML = (await placeOptions()).map(p => `<option value="${U.esc(p)}">`).join('');
  let t;
  const showCoord = () => { if (co) co.textContent = fmtCoord(obj); };
  const save = () => { clearTimeout(t); if (obj.place !== inp.value.trim()) delete obj.placeNameAuto; obj.place = inp.value.trim(); if (!obj.place) { delete obj.placeLat; delete obj.placeLng; delete obj.placeAcc; } showCoord(); persist(); };
  inp.addEventListener('input', () => { clearTimeout(t); t = setTimeout(save, 400); });
  inp.addEventListener('change', save);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.blur(); });
  gps.addEventListener('click', async () => {
    gps.disabled = true;
    try {
      const c = await getPosition(true);
      obj.placeLat = c.latitude; obj.placeLng = c.longitude; obj.placeAcc = c.accuracy; obj.placeAt = new Date().toISOString(); obj.placeSrc = 'pin';
      inp.value = (await placeName(c.latitude, c.longitude)) || inp.value || `${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)}`;
      if (placeName.cc) obj.placeCC = placeName.cc; else delete obj.placeCC;
      save(); obj.placeNameAuto = true; persist(); U.haptic && U.haptic(10);
    } catch (_) { U.toast('Standort nicht freigegeben'); }
    gps.disabled = false;
  });
  // Ort auf der Karte wählen (mit Suche), z. B. für ältere Fotos
  root.querySelector('#' + id + 'Map')?.addEventListener('click', () => openMapPicker({ lat: obj.placeLat, lng: obj.placeLng }, p => {
    obj.placeLat = p.lat; obj.placeLng = p.lng; delete obj.placeAcc; obj.placeAt = new Date().toISOString(); obj.placeSrc = 'map';
    if (p.cc) obj.placeCC = p.cc;
    inp.value = p.name || inp.value || `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`;
    save(); if (p.name) { obj.placeNameAuto = true; persist(); }
    U.haptic && U.haptic(10);
  }));
  // von außen (automatischer Standort) aktualisieren
  return () => { if (document.activeElement !== inp) inp.value = obj.place || ''; showCoord(); };
}

// Einzelfoto: nur ansehen. Wischen hoch/runter zeigt das Handyfoto, links/rechts blättert.
// Metadaten eines Fotos (nur in „Alle Fotos“): Zeit, Ort, Koordinaten, Sonnenstand, Wetter, Ausrüstung
async function photoMeta(box, f, d) {
  if (!box) return;
  const r = d.rolls.get(f.rollId), cam = d.cams.get(r?.cameraId), lens = d.lenses.get(f.lensId), st = d.stocks.get(r?.stockId);
  const fl = f.flash ? (await getAccessories()).find(a => a.id === f.flashId) : null;
  const allFilters = await getFilters();
  const fs = (f.filterIds || []).map(id => filterById(allFilters, id)).filter(Boolean);
  const peopleAll = await getPeople();   // v197: fehlte hier, „Personen“ in den Metadaten warf deshalb einen Fehler
  const when = f.date ? new Date(f.date) : null, hasLoc = f.placeLat != null && when && !isNaN(when);
  const rows = [
    ['Aufgenommen', f.date ? `${U.fmtDate(String(f.date).slice(0, 10))}${String(f.date).length > 10 ? ', ' + String(f.date).slice(11, 16) + ' Uhr' : ''}` : ''],
    ['Ort', f.place || ''],
    ['Koordinaten', f.placeLat != null ? fmtCoord(f) + (f.placeSrc === 'exif' ? ' · aus Handyfoto' : '') : ''],
    ['Sonne', hasLoc ? SKY.sunText(when, +f.placeLat, +f.placeLng) : ''],
    ['Wetter', f.wx ? SKY.wxText(f.wx) : hasLoc ? '…' : ''],
    ['Kamera', camLabel(cam) || r?.camera || ''],
    ['Objektiv', lens ? lensLabel(lens) : ''],
    ['Blende', f.aperture ? 'f/' + String(f.aperture).replace(/^f\//, '').replace('.', ',') : ''],
    ['Zeit', f.shutter ? (/^\d+$/.test(f.shutter) ? f.shutter + ' s' : f.shutter) : ''],
    ['Film', st ? U.stockLabel(st) + (r?.ei && String(r.ei) !== String(st.boxIso) ? ` · EI ${r.ei}` : '') : ''],
    ['Filter', fs.map(x => filterShort(x)).join(', ')],
    ['Blitz', f.flash ? ([fl?.maker, fl?.name].filter(Boolean).join(' ') || 'ja') : ''],
    ['Doppelbelichtung', f.double ? 'ja' : ''],
    ['Bewertung', f.rate != null ? fmtRate(f.rate) : ''],
    ['Personen', (f.people || []).map(id => peopleAll.find(p => p.id === id)?.name).filter(Boolean).join(', ')]
  ].filter(x => x[1]);
  box.innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd${k === 'Wetter' ? ' id="phWx"' : ''}>${U.esc(v)}</dd>`).join('');
  if (hasLoc && !f.wx && !photoMeta.busy) {
    photoMeta.busy = true;
    try { const w = await SKY.weather(when, +f.placeLat, +f.placeLng); const el = box.querySelector('#phWx'); if (w) { f.wx = w; await DB.put('frames', f); if (el) el.textContent = SKY.wxText(w); } else if (el) { el.previousElementSibling.remove(); el.remove(); } }
    catch (_) { const el = box.querySelector('#phWx'); if (el) { el.previousElementSibling.remove(); el.remove(); } }
    photoMeta.busy = false;
  }
}
async function viewPhoto(albumId, frameId) {
  const d = await albumData(albumId);
  if (!d) { location.replace('#/'); return; }
  if (albumId === 'alle') { arrangeAllPhotos(d); if (AP_ITEM && d.frames.some(x => x.id === frameId && apMatch(d, x, AP_ITEM))) d.frames = d.frames.filter(x => apMatch(d, x, AP_ITEM)); }
  const i = d.frames.findIndex(f => f.id === frameId);
  if (i < 0) { location.replace('#/album/' + albumId); return; }
  const f = d.frames[i];
  // Oben rechts: Mülleimer zum Löschen eines versehentlich hochgeladenen Fotos
  setHeader('', { action: `<button class="trashbtn" id="phDel" aria-label="Foto löschen" title="Foto löschen">${TRASH_BTN('').match(/<svg[\s\S]*<\/svg>/)[0]}</button>` });
  const url = await U.imgUrl(f.imgId);
  const phones = (await Promise.all([f.phoneId, f.double ? f.phoneId2 : null].filter(Boolean).map(x => U.imgUrl(x)))).filter(Boolean);
  const ln = d.line(f);
  const text = [ln.tech, ln.note].filter(Boolean).join(' · ');
  view.innerHTML = `
    <figure class="photoview flipper" data-k="0">
      <div class="flipimgs"><img src="${url}" alt="" class="ana">${phones.map((u, k) => `<img src="${u}" alt="Handyfoto" class="ph" data-k="${k + 1}">`).join('')}</div>
      ${phones.length ? `<span class="phlbl">Handy</span>` : ''}
      <figcaption>
        <label class="titlefld"><span>Titel</span><input id="phTitle" value="${U.esc(f.title || '')}" maxlength="120" enterkeyhint="done"></label>
        <div class="titlefld raterow"><span>Bewertung</span>${rateHtml(f.rate ?? null, 'phRate')}</div>
        <div class="titlefld peoplerow"><span>Personen</span><div class="pprow"><span class="ppchips" id="phPeople">${await peopleChips(f.people)}</span><button type="button" class="roundic" id="phPeopleBtn" aria-label="Personen benennen">${PERSON_IC}</button></div></div>
        ${placeFieldHtml('phPlace', f.place, 'titlefld', f)}
        <div class="titlefld phtime"><span>Aufgenommen</span><div class="placefld1"><label class="timeedit2"><span id="phTimeTxt">${f.date ? U.esc(fmtShotLong(f.date)) : ''}</span><input type="datetime-local" id="phTime" value="${U.esc(String(f.date || '').slice(0, 16))}" aria-label="Aufnahmedatum und Uhrzeit"></label><button type="button" class="placepin" id="phTimeNow" aria-label="Jetzige Uhrzeit eintragen">${CLOCK_IC}</button></div></div>
        <label class="titlefld infofld"><span>Infos · nur für dich, erscheinen nicht im Fotoalbum</span><textarea id="phInfo" rows="2">${U.esc(f.info || '')}</textarea></label>
        <div class="phfilters" id="phFilters"></div>
        ${text ? `<p class="phototext">${U.esc(text)}</p>` : ''}
        ${ln.spec ? `<p class="photospec">${U.esc(ln.spec)}</p>` : ''}
        ${phones.length ? '<p class="photodate">Nach oben wischen: Handyfoto</p>' : ''}
        <button type="button" class="btn ghost wide phedit" id="phEdit">Alle Angaben bearbeiten</button>
        ${albumId === 'alle' ? '<dl class="metabox" id="phMeta"></dl>' : ''}
      </figcaption>
    </figure>`;
  const fig = view.querySelector('.flipper');
  let tt;
  const tIn = view.querySelector('#phTitle');
  const saveTitle = () => { clearTimeout(tt); f.title = tIn.value.trim(); const ii = view.querySelector('#phInfo'); if (ii) f.info = ii.value.trim(); return DB.put('frames', f); };
  tIn.addEventListener('input', () => { clearTimeout(tt); tt = setTimeout(saveTitle, 350); });
  tIn.addEventListener('keydown', e => { if (e.key === 'Enter') tIn.blur(); });
  tIn.addEventListener('blur', saveTitle);
  wirePlace(view, 'phPlace', f, () => { DB.put('frames', f); drawMeta(); });
  // Bewertung −5 bis +5 und Personen
  wireRate(view, 'phRate', () => f.rate ?? null, async v => { if (v == null) delete f.rate; else f.rate = v; await DB.put('frames', f); });
  view.querySelector('#phPeopleBtn').addEventListener('click', () => openPeoplePicker(f.people, async ids => { f.people = ids; if (!ids.length) delete f.people; await DB.put('frames', f); view.querySelector('#phPeople').innerHTML = await peopleChips(f.people); U.haptic && U.haptic(10); drawMeta(); }));
  // Datum und Uhrzeit nachtragen
  const showPhTime = () => { view.querySelector('#phTimeTxt').textContent = f.date ? fmtShotLong(f.date) : ''; view.querySelector('#phTime').value = String(f.date || '').slice(0, 16); };
  view.querySelector('#phTime').addEventListener('change', async e => { const v = e.target.value; f.date = v ? v + ':00' : null; f.dateSet = !!v; delete f.wx; showPhTime(); await DB.put('frames', f); drawMeta(); U.haptic && U.haptic(10); });
  view.querySelector('#phTimeNow').addEventListener('click', async () => { f.date = nowLocal().slice(0, 16) + ':00'; f.dateSet = true; delete f.wx; showPhTime(); await DB.put('frames', f); drawMeta(); U.haptic && U.haptic(10); });
  // Alle Angaben (Objektiv, Blende, Zeit, Blitz, Filter, Doppelbelichtung …) in der Bildansicht bearbeiten, danach zurück hierher
  view.querySelector('#phEdit').addEventListener('click', async () => { await saveTitle(); try { sessionStorage.setItem('kb-frame-return', location.hash); } catch (_) {} location.hash = '#/bild/' + f.id; });
  const drawMeta = () => photoMeta(view.querySelector('#phMeta'), f, d);
  drawMeta();
  // Infos: freier Text, nur hier und in der Bildansicht sichtbar, nicht im Fotoalbum
  const infoIn = view.querySelector('#phInfo'); let it;
  const saveInfo = () => { clearTimeout(it); f.info = infoIn.value.trim(); return DB.put('frames', f); };
  infoIn.addEventListener('input', () => { clearTimeout(it); it = setTimeout(saveInfo, 400); infoIn.style.height = 'auto'; infoIn.style.height = infoIn.scrollHeight + 'px'; });
  infoIn.addEventListener('blur', saveInfo);
  const go = async g => { if (g) { await saveTitle(); location.replace(`#/foto/${albumId}/${g.id}`); } };
  // Haken unten rechts: speichern und zurück zum Raster, dort auf der Höhe dieses Fotos
  const done = document.createElement('button');
  done.className = 'donebtn goesback'; done.setAttribute('aria-label', 'Fertig, zurück zur Übersicht'); done.innerHTML = ART.check;
  document.body.appendChild(done);
  done.addEventListener('click', async () => { await saveTitle(); await saveInfo(); document.activeElement?.blur(); goHash(albumId === 'alle' ? '#/alle-fotos' : '#/album/' + albumId); });
  document.getElementById('phDel')?.addEventListener('click', async () => {
    await saveTitle();
    const imgId = f.imgId, back = albumId === 'alle' ? '#/alle-fotos' : '#/album/' + albumId;
    const target = d.frames[i + 1] || d.frames[i - 1];
    f.imgId = null; await DB.put('frames', f);
    U.haptic && U.haptic(15);
    location.replace(target ? `#/foto/${albumId}/${target.id}` : back);
    let undone = false;
    U.undo('Foto gelöscht', async () => {
      undone = true; const cur = await DB.get('frames', f.id); if (!cur) return;
      cur.imgId = imgId; await DB.put('frames', cur); location.replace(`#/foto/${albumId}/${f.id}`);
    }, async () => { if (!undone) await deleteImage(imgId); });
  });
  done.addEventListener('click', async () => { await saveTitle(); done.classList.remove('rewarded'); void done.offsetWidth; done.classList.add('rewarded'); setTimeout(() => done.classList.remove('rewarded'), 600); });
  // Filter nachtragen: auch bei fertigen und archivierten Rollen, damit das Foto später beim Filter als Beispiel auftaucht
  const allFilters = await getFilters();
  const drawPhFilters = () => {
    const fs = (f.filterIds || []).map(id => filterById(allFilters, id)).filter(Boolean);
    const box = view.querySelector('#phFilters'); if (!box) return;
    // v199: Filter werden über „Alle Angaben bearbeiten“ eingetragen. Hier stehen sie nur, wenn welche gewählt sind.
    box.hidden = !fs.length;
    box.innerHTML = fs.length ? `<span class="phflabel">Filter</span>${fs.map(x => `<span class="ffchip">${filterArt(x, 22)}<span>${U.esc(filterShort(x))}</span></span>`).join('')}` : '';
    box.querySelector('#phFilterEdit')?.addEventListener('click', async () => {
      const roll = await DB.get('rolls', f.rollId);
      openFrameFilterSearch(allFilters, (f.filterIds || []).filter(id => filterById(allFilters, id)), roll, async ids => {
        f.filterIds = [...ids]; await DB.put('frames', f);
        if (roll) { roll.lastFilterIds = [...ids]; await DB.put('rolls', roll); }
        U.haptic && U.haptic(10); drawPhFilters();
      });
    });
  };
  drawPhFilters();
  // Zwei Finger: Foto vergrößern (nur das Foto, nicht die App)
  fig.querySelectorAll('.flipimgs img').forEach(img => U.pinch(img));
  // Tippen auf den linken oder rechten Rand des Fotos: zurück oder weiter
  fig.querySelector('.flipimgs').addEventListener('click', e => {
    const r = e.currentTarget.getBoundingClientRect(), x = (e.clientX - r.left) / r.width;
    if (x < 0.35) go(d.frames[i - 1]); else if (x > 0.65) go(d.frames[i + 1]);
  });
  swipe(view, {
    left: () => go(d.frames[i + 1]), right: () => go(d.frames[i - 1]),
    up: () => flipPhone(fig, phones.length, 1), down: () => flipPhone(fig, phones.length, -1)
  });
}

// Handyfoto ein- und ausblenden (Scan → Handy 1 → Handy 2 → Scan)
function flipPhone(el, n, d) {
  if (!n) return;
  const k = ((+el.dataset.k + d) % (n + 1) + n + 1) % (n + 1);
  el.dataset.k = k;
  el.classList.toggle('showph', k > 0);
  el.querySelectorAll('img.ph').forEach(img => img.classList.toggle('on', +img.dataset.k === k));
  const lbl = el.querySelector('.phlbl'); if (lbl) lbl.textContent = n > 1 ? `Handy ${k}` : 'Handy';
}

// Wischgesten und Pfeiltasten für eine Ansicht; räumt sich beim Seitenwechsel selbst auf
function swipe(root, h) {
  let t0 = null;
  // Vergrößertes Foto oder zwei Finger: keine Wischgeste
  // Nicht in Eingabefeldern, Texten und Listen starten: dort wird markiert oder gescrollt
  const s = e => { t0 = e.touches.length > 1 || root.querySelector('[data-zoomed="1"]') || e.target.closest('input, textarea, select, label, button, a, .rate, .placefld1') ? null : { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const en = e => {
    if (!t0) return;
    if (e.touches.length || root.querySelector('[data-zoomed="1"]')) { t0 = null; return; }
    const dx = e.changedTouches[0].clientX - t0.x, dy = e.changedTouches[0].clientY - t0.y; t0 = null;
    if (String(window.getSelection?.() || '')) return;
    if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 1.8) (dx < 0 ? h.left : h.right)?.();
    else if (Math.abs(dy) > 70 && Math.abs(dy) > Math.abs(dx) * 1.8) (dy < 0 ? h.up : h.down)?.();
  };
  const k = e => {
    if (e.target.closest && e.target.closest('input, textarea')) return;
    const m = { ArrowRight: h.left, ArrowLeft: h.right, ArrowUp: h.up, ArrowDown: h.down, Escape: h.esc }[e.key];
    if (m) { e.preventDefault(); m(); }
  };
  root.addEventListener('touchstart', s, { passive: true });
  root.addEventListener('touchend', en, { passive: true });
  document.addEventListener('keydown', k);
  window.addEventListener('hashchange', () => { root.removeEventListener('touchstart', s); root.removeEventListener('touchend', en); document.removeEventListener('keydown', k); }, { once: true });
}

// Buch: weiße Seiten, Foto mittig, Datum rechts unter dem Foto
async function viewAlbumBook(id) {
  const d = await albumData(id);
  if (!d || !d.frames.length) { location.replace('#/album/' + id); return; }
  document.body.classList.add('albummode');
  const urls = await Promise.all(d.frames.map(f => U.imgUrl(f.imgId)));
  const phones = await Promise.all(d.frames.map(async f => (await Promise.all([f.phoneId, f.double ? f.phoneId2 : null].filter(Boolean).map(x => U.imgUrl(x)))).filter(Boolean)));
  view.innerHTML = `
    <div class="album book">
      <div class="albumbar">
        <button class="closex" id="albClose" aria-label="Schließen">${ART.x}</button>
        <span class="albcount" id="albCount">1 / ${d.frames.length}</span>
      </div>
      <div class="pages" id="pages">
        ${d.frames.map((f, i) => { const ln = d.line(f); return `
          <section class="page">
            <div class="bookpage">
              ${i === 0 ? `<h1 class="booktitle">${U.esc(d.title)}</h1>` : ''}
              <figure class="bookphoto flipper" data-i="${i}" data-k="0">
                <div class="flipimgs"><img src="${urls[i]}" alt="" draggable="false" class="ana">${phones[i].map((u, k) => `<img src="${u}" alt="Handyfoto" draggable="false" class="ph" data-k="${k + 1}">`).join('')}</div>
                ${phones[i].length ? '<span class="phlbl">Handy</span>' : ''}
                <figcaption><span class="bookspec">${U.esc(ln.spec)}</span>${f.title ? `<span class="booktitle2">${U.esc(f.title)}</span>` : ''}</figcaption>
              </figure>
            </div>
          </section>`; }).join('')}
      </div>
    </div>`;
  const pages = view.querySelector('#pages');
  const count = view.querySelector('#albCount');
  const cur = () => Math.round(pages.scrollLeft / pages.clientWidth);
  pages.addEventListener('scroll', () => { count.textContent = `${cur() + 1} / ${d.frames.length}`; }, { passive: true });
  const fig = () => pages.querySelectorAll('.bookphoto')[cur()];
  const go = dd => pages.scrollBy({ left: dd * pages.clientWidth, behavior: 'smooth' });
  swipe(pages, {
    up: () => flipPhone(fig(), phones[cur()].length, 1), down: () => flipPhone(fig(), phones[cur()].length, -1),
    esc: () => history.back()
  });
  const k = e => { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); };
  document.addEventListener('keydown', k);
  window.addEventListener('hashchange', () => document.removeEventListener('keydown', k), { once: true });
  view.querySelector('#albClose').addEventListener('click', () => { location.hash = '#/album/' + id; });
}

// Alle hochgeladenen Fotos, nach Rollen getrennt durch eine kleine Zeile
// Beim Ziehen am Bildrand automatisch scrollen, damit auch Plätze außerhalb des Bildschirms erreichbar sind
const AUTOSCROLL = { x: 0, y: null, tick: null, raf: 0 };
function autoScrollAt(x, y, tick) {
  AUTOSCROLL.x = x; AUTOSCROLL.y = y; AUTOSCROLL.tick = tick;
  if (AUTOSCROLL.raf) return;
  const loop = () => {
    if (AUTOSCROLL.y === null) { AUTOSCROLL.raf = 0; return; }
    const H = window.innerHeight, edge = 110, y0 = AUTOSCROLL.y;
    const v = y0 < edge ? -Math.ceil((edge - y0) / 7) : y0 > H - edge ? Math.ceil((y0 - (H - edge)) / 7) : 0;
    if (v) { window.scrollBy(0, v); AUTOSCROLL.tick && AUTOSCROLL.tick(AUTOSCROLL.x, AUTOSCROLL.y); }
    AUTOSCROLL.raf = requestAnimationFrame(loop);
  };
  AUTOSCROLL.raf = requestAnimationFrame(loop);
}
function stopAutoScroll() { AUTOSCROLL.y = null; AUTOSCROLL.tick = null; }

let ALLPHOTOS_SORT = false;
let ALBUM_SORT = false;
let FAV_OPEN = false;
let AP_ITEM = '';
window.addEventListener('hashchange', () => { if (location.hash !== '#/alle-fotos' && !location.hash.startsWith('#/foto/alle/')) { FAV_OPEN = false; AP_ITEM = ''; } });
window.addEventListener('hashchange', () => { if (!location.hash.startsWith('#/album/')) ALBUM_SORT = false; });
window.addEventListener('hashchange', () => { if (!location.hash.startsWith('#/alle-fotos')) ALLPHOTOS_SORT = false; });
// Reihenfolge der Scans einer Rolle per Ziehen ändern. Verschoben werden nur Scan, Lightleak-Markierung und Favorit.
function setupPhotoSort(grid, redraw = viewAllPhotos) {
  // Scrollen bleibt möglich: erst langes Drücken (ohne Bewegung) hebt ein Foto an, danach folgt es dem Finger
  // Beim Verschieben wandert das ganze Bild mit allen Einträgen (Foto, Blende, Zeit, Objektiv, Filter, Notiz, Titel, Datum, Favorit …).
  // Fest bleiben nur die Plätze selbst: id, Rolle, Bildnummer und Bonusbild-Kennung.
  const FIXED = ['id', 'rollId', 'index', 'bonus'];
  let drag = null, timer = null, start = null;
  const cells = () => [...grid.querySelectorAll(':scope > a')];
  grid.addEventListener('click', e => e.preventDefault(), true);
  grid.addEventListener('contextmenu', e => e.preventDefault());
  grid.addEventListener('dragstart', e => e.preventDefault());
  grid.querySelectorAll('a').forEach(a => a.setAttribute('draggable', 'false'));
  const hit = (x, y) => {
    drag.ghost.style.visibility = 'hidden';
    const el = document.elementFromPoint(x, y)?.closest('a[data-fid]');
    drag.ghost.style.visibility = '';
    const to = el && el.parentElement === grid ? cells().indexOf(el) : drag.to;
    if (to !== drag.to) { drag.to = to; cells().forEach((c, i) => c.classList.toggle('droptarget', i === to && to !== drag.from)); U.haptic && U.haptic(6); }
  };
  grid.addEventListener('pointerdown', e => {
    const a = e.target.closest('a[data-fid]'); if (!a) return;
    start = { x: e.clientX, y: e.clientY };
    clearTimeout(timer);
    timer = setTimeout(() => {
      const r = a.getBoundingClientRect();
      const ghost = a.cloneNode(true); ghost.className = 'sortghost';
      Object.assign(ghost.style, { width: r.width + 'px', height: r.height + 'px', left: r.left + 'px', top: r.top + 'px' });
      document.body.appendChild(ghost); a.classList.add('dragfrom');
      drag = { a, ghost, dx: start.x - r.left, dy: start.y - r.top, from: cells().indexOf(a), to: cells().indexOf(a) };
      GEAR_DRAG = true; U.haptic && U.haptic(12);
    }, 260);
  });
  const move = e => {
    if (!drag) { if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) { clearTimeout(timer); start = null; } return; }
    e.preventDefault();
    drag.ghost.style.left = (e.clientX - drag.dx) + 'px'; drag.ghost.style.top = (e.clientY - drag.dy) + 'px';
    hit(e.clientX, e.clientY);
    autoScrollAt(e.clientX, e.clientY, (x, y) => drag && hit(x, y));
  };
  const end = async () => {
    clearTimeout(timer); start = null;
    if (!drag) return;
    stopAutoScroll(); GEAR_DRAG = false;
    const { from, to, ghost, a } = drag; drag = null; ghost.remove(); a.classList.remove('dragfrom');
    cells().forEach(c => c.classList.remove('droptarget'));
    if (to === from || to < 0) return;
    const ids = cells().map(c => c.dataset.fid);
    const fr = await Promise.all(ids.map(id => DB.get('frames', id)));
    const content = fr.map(f => Object.fromEntries(Object.entries(f).filter(([k]) => !FIXED.includes(k))));
    const [m] = content.splice(from, 1); content.splice(to, 0, m);
    for (let i = 0; i < fr.length; i++) {
      const keep = Object.fromEntries(FIXED.filter(k => k in fr[i]).map(k => [k, fr[i][k]]));
      await DB.put('frames', { ...keep, ...content[i] });
    }
    U.haptic && U.haptic([15, 40, 15]);
    document.querySelectorAll('.donebtn').forEach(x => x.remove()); const y = window.scrollY; await redraw(); window.scrollTo(0, y);
  };
  // Beim Neuzeichnen und beim Verlassen der Seite die Dokument-Listener wieder abmelden
  const off = () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', end); document.removeEventListener('pointercancel', end); };
  PHOTOSORT_OFF.push(off);
  document.addEventListener('pointermove', move, { passive: false });
  document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
}
const PHOTOSORT_OFF = [];
window.addEventListener('hashchange', () => { while (PHOTOSORT_OFF.length) PHOTOSORT_OFF.pop()(); });

// Alle Fotos: Rollen sortieren und Fotos nach einem Teil aus dem Kameraschrank filtern (auch fürs Blättern in der Einzelansicht)
function apMatch(d, f, item) {
  if (!item) return true;
  const k = item.slice(0, 1), id = item.slice(2);
  if (k === 'c') return d.rolls.get(f.rollId)?.cameraId === id;
  if (k === 'l') return f.lensId === id;
  if (k === 'f') return (f.filterIds || []).some(x => x === id || (!id.includes('#') && String(x).startsWith(id + '#')));
  if (k === 'a') return !!f.flash && f.flashId === id;
  if (k === 'p') return effPlace(f, d.rolls.get(f.rollId)) === id;
  return true;
}
// Ort eines Bildes: eigener Ort, sonst der grobe Ort der Rolle
const effPlace = (f, r) => f.place || r?.place || '';
function arrangeAllPhotos(d) {
  let order = 'date';
  try { order = localStorage.getItem('kb-ap-order') || 'date'; } catch (_) {}
  const rollKey = {
    date: r => r?.loadedAt || '', dateOld: r => r?.loadedAt || '',
    film: r => U.stockLabel(d.stocks.get(r?.stockId)).toLowerCase(), name: r => (r?.title || '\uffff').toLowerCase(), cam: r => (camLabel(d.cams.get(r?.cameraId)) || r?.camera || '\uffff').toLowerCase()
  };
  const rollIds = [...new Set(d.frames.map(f => f.rollId))];
  const kf = rollKey[order] || rollKey.date;
  rollIds.sort((a, b) => { const x = kf(d.rolls.get(a)), y = kf(d.rolls.get(b)); const c = x < y ? -1 : x > y ? 1 : 0; return order === 'date' ? -c || String(d.rolls.get(b)?.loadedAt || '').localeCompare(String(d.rolls.get(a)?.loadedAt || '')) : c; });
  const rpos = new Map(rollIds.map((id, i) => [id, i]));
  d.frames.sort((a, b) => rpos.get(a.rollId) - rpos.get(b.rollId) || a.index - b.index);
  // Nach Bewertung: beste zuerst, unbewertete am Ende; innerhalb einer Stufe neueste Rolle zuerst
  if (order === 'rate') { const pos = new Map(d.frames.map((f, i) => [f.id, i])); d.frames.sort((a, b) => (b.rate ?? -99) - (a.rate ?? -99) || pos.get(a.id) - pos.get(b.id)); }
  return { order };
}

async function viewAllPhotos() {
  // Archivieren oben rechts in der Kopfzeile, nur in dieser Ansicht
  setHeader('Alle Fotos');
  const d = await albumData('alle');
  // Reihenfolge ändert man nur noch im einzelnen Album, nicht in „Alle Fotos“
  const sorting = ALLPHOTOS_SORT = false;
  const arBtn = `<div class="archcorner"><a class="archlink" href="#/archiv" aria-label="Archivieren: früher entwickelte Rolle nachtragen">${ARCHIVE_IC}<span>Archivieren</span></a></div>`
    + (sorting ? '<p class="hint pad sorthint">Ziehe ein Foto innerhalb seiner Rolle an die richtige Stelle. Blende, Zeit, Notiz und alle anderen Einträge wandern mit.</p>' : '');
  if (!d.frames.length) { view.innerHTML = arBtn + '<div class="empty">Noch keine Fotos hochgeladen. Früher entwickelte Rollen trägst du oben rechts mit „Archivieren“ nach.</div>'; return; }
  // Rollen sortieren (Datum, Film, Name, Kamera) und Fotos nach einem Teil aus dem Kameraschrank filtern
  const { order } = arrangeAllPhotos(d); let item = AP_ITEM;
  const [allLenses, allFilters, allAcc] = await Promise.all([DB.all('lenses'), getFilters(), getAccessories()]);
  const usedCams = new Set([...d.rolls.values()].map(r => r.cameraId).filter(Boolean));
  const usedLens = new Set(d.frames.map(f => f.lensId).filter(Boolean));
  const usedFl = new Set(d.frames.flatMap(f => f.filterIds || []));
  const usedFlash = new Set(d.frames.map(f => f.flash && f.flashId).filter(Boolean));
  const opt = (v, t) => `<option value="${v}"${item === v ? ' selected' : ''}>${U.esc(t)}</option>`;
  const grp = (label, opts) => opts.length ? `<optgroup label="${label}">${opts.join('')}</optgroup>` : '';
  const flOpts = [];
  for (const fl of allFilters) {
    if ([...usedFl].some(id => id === fl.id || String(id).startsWith(fl.id + '#'))) flOpts.push(opt('f:' + fl.id, (filterCode(fl) ? filterCode(fl) + ' ' : '') + filterName(fl)));
    for (const c of fl.colors || []) if (usedFl.has(fl.id + '#' + c.k)) flOpts.push(opt('f:' + fl.id + '#' + c.k, '· ' + c.name));
  }
  const itemSel = `<select id="apItem" aria-label="Fotos mit">${opt('', 'Alle Fotos')}
    ${grp('Kameras', [...d.cams.values()].filter(c => usedCams.has(c.id)).map(c => opt('c:' + c.id, camLabel(c))))}
    ${grp('Objektive', allLenses.filter(l => usedLens.has(l.id)).map(l => opt('l:' + l.id, lensLabel(l))))}
    ${grp('Filter', flOpts)}
    ${grp('Blitze', allAcc.filter(a => usedFlash.has(a.id)).map(a => opt('a:' + a.id, [a.maker, a.name].filter(Boolean).join(' ') || 'Blitz')))}
    ${grp('Orte', (() => { const c = new Map(); d.frames.forEach(f => { const p = effPlace(f, d.rolls.get(f.rollId)); if (p) c.set(p, (c.get(p) || 0) + 1); }); return [...c].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'de')).map(([p, n]) => opt('p:' + p, `${p} (${n})`)); })())}</select>`;
  if (item && !d.frames.some(f => apMatch(d, f, item))) { item = AP_ITEM = ''; }
  d.frames = d.frames.filter(f => apMatch(d, f, item));
  const toolbar = sorting ? '' : `<div class="aptools"><select id="apOrder" aria-label="Rollen sortieren">${[['date', 'Neueste zuerst'], ['dateOld', 'Älteste zuerst'], ['film', 'Film'], ['name', 'Name'], ['cam', 'Kamera'], ['rate', 'Bewertung']].map(([v, t]) => `<option value="${v}"${order === v ? ' selected' : ''}>${t}</option>`).join('')}</select>${itemSel}</div>`;
  const thumbs = await Promise.all(d.frames.map(f => U.imgUrl(f.imgId, true)));
  // Favoriten sind die Fotos mit +5 (fünf Leuchtpunkte). Sie stehen zusätzlich oben in einer eigenen Reihe.
  const favs = item ? [] : d.frames.map((f, i) => [f, i]).filter(([f]) => f.rate === 5);
  // Favoriten-Reihe klappt auf und zu; beim Hineinnavigieren ist sie zugeklappt
  let html = favs.length ? `<button type="button" class="rollsep favsep favtoggle${FAV_OPEN ? ' open' : ''}" id="favToggle" aria-expanded="${FAV_OPEN}"><span class="favdot" aria-hidden="true"></span>Favoriten · ${favs.length}<span class="favchev" aria-hidden="true"></span></button><div class="photogrid favgrid"${FAV_OPEN ? '' : ' hidden'}>${favs.map(([f, i]) => `<a href="#/foto/alle/${f.id}" aria-label="Favorit, Bild ${frameLabel(f)}"><img src="${thumbs[i]}" alt="" loading="lazy"></a>`).join('')}</div>` : '';
  let cur = null;
  d.frames.forEach((f, i) => {
    const gk = order === 'rate' ? 'r' + (f.rate ?? 'x') : f.rollId;
    if (gk !== cur) {
      if (cur !== null) html += '</div>';
      cur = gk;
      if (order === 'rate') html += `<div class="rollsep">${f.rate == null ? 'Nicht bewertet' : 'Bewertung ' + fmtRate(f.rate)}</div><div class="photogrid">`;
      else {
        const r = d.rolls.get(cur);
        const st = d.stocks.get(r?.stockId), cam = d.cams.get(r?.cameraId);
        html += `<div class="rollsep">${[r?.title, U.stockLabel(st), camLabel(cam)].filter(Boolean).map(U.esc).join(' · ')}</div><div class="photogrid${sorting ? ' sorting' : ''}" data-roll="${cur}">`;
      }
    }
    html += `<a href="#/foto/alle/${f.id}" data-fid="${f.id}"${f.rate === 5 ? ' class="isfav"' : ''} data-film="${U.esc(U.stockLabel(d.stocks.get(d.rolls.get(f.rollId)?.stockId)).toUpperCase())}" aria-label="Bild ${frameLabel(f)}"><span class="apnum" aria-hidden="true">${frameLabel(f)}</span><img src="${thumbs[i]}" alt="" loading="lazy" draggable="false">${sorting ? `<span class="sortnum">${frameLabel(f)}</span>` : f.rate === 5 ? '<span class="favdot" aria-label="Favorit"></span>' : ''}</a>`;
  });
  view.innerHTML = arBtn + toolbar + html + '</div>' + (sorting || item ? '' : `<div class="card zipcard"><p>Alle ${d.frames.length} Fotos mit Rollen, Notizen, Favoriten, Reihenfolge und Einstellungen als ZIP-Datei sichern. Unter Einstellungen › Sicherung und Speicher lässt sie sich wieder einspielen.</p><button type="button" class="btn ghost wide" id="apZip">${ART.save}<span>Als ZIP sichern</span></button></div>`);
  view.querySelector('#apOrder')?.addEventListener('change', async e => { try { localStorage.setItem('kb-ap-order', e.target.value); } catch (_) {} await viewAllPhotos(); });
  view.querySelector('#apItem')?.addEventListener('change', async e => { AP_ITEM = e.target.value; await viewAllPhotos(); window.scrollTo(0, 0); });
  view.querySelector('#favToggle')?.addEventListener('click', e => {
    FAV_OPEN = !FAV_OPEN; U.haptic && U.haptic(8);
    const b = e.currentTarget; b.classList.toggle('open', FAV_OPEN); b.setAttribute('aria-expanded', FAV_OPEN);
    view.querySelector('.favgrid').hidden = !FAV_OPEN;
  });
  view.querySelector('#apZip')?.addEventListener('click', async e => { const b = e.currentTarget; b.disabled = true; try { await exportZip(); } finally { b.disabled = false; } });
  view.querySelector('#apSort')?.addEventListener('click', async () => {
    ALLPHOTOS_SORT = !ALLPHOTOS_SORT; U.haptic && U.haptic(10);
    document.querySelectorAll('.donebtn').forEach(x => x.remove()); const y = window.scrollY; await viewAllPhotos(); window.scrollTo(0, y);
  });
  while (PHOTOSORT_OFF.length) PHOTOSORT_OFF.pop()();
  if (sorting) view.querySelectorAll('.photogrid.sorting').forEach(g => setupPhotoSort(g));
}

/* ---------- Archivieren: früher entwickelte Rollen nachtragen, ohne Einlegen und Entwickeln ----------
   Die Rolle entsteht direkt im Fotoalbum (Status „entwickelt“, archived: true). Die Scans füllen Bild 1, 2, 3 … nach Dateinamen.
   Beschriften und Einstellungen gehen danach wie gewohnt in der Rolle. Alles außer den Fotos ist freiwillig. */
const ARCHIVE_IC = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h16v9.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M4 10 2.5 6.5 9 5l3 5M20 10l1.5-3.5L15 5l-3 5"/><path d="M9.5 14h5"/></svg>';
/* Zeitraum in einem Kalender: erster Tipp = Beginn, zweiter Tipp = Ende. Gleicher Tag zweimal = ein Tag. Keine Tage in der Zukunft. */
function openRangePicker(from, to, onDone) {
  const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = U.today();
  let a = from || null, b = to || null;
  const start = new Date((a || today) + 'T12:00'); let y = start.getFullYear(), m = start.getMonth();
  const thisYear = new Date().getFullYear();
  const ov = document.createElement('div');
  ov.className = 'modalbg';
  ov.innerHTML = `<div class="modal rangemodal" role="dialog" aria-modal="true" aria-label="Zeitraum wählen">
      <div class="rphead"><button type="button" class="rpnav" data-d="-1" aria-label="Voriger Monat">‹</button>
        <select id="rpM" aria-label="Monat">${MONTHS.map((n, i) => `<option value="${i}">${n}</option>`).join('')}</select>
        <select id="rpY" aria-label="Jahr">${Array.from({ length: 60 }, (_, i) => thisYear - i).map(v => `<option>${v}</option>`).join('')}</select>
        <button type="button" class="rpnav" data-d="1" aria-label="Nächster Monat">›</button></div>
      <p class="rpstate" id="rpState"></p>
      <div class="rpweek">${['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => `<span>${d}</span>`).join('')}</div>
      <div class="rpgrid" id="rpGrid"></div>
      <div class="modalfoot"><button class="closex" id="rpNo" aria-label="Abbrechen">${ART.x}</button><button type="button" class="btn ghost small" id="rpClear">Zurücksetzen</button><button class="okbtn" id="rpOk" aria-label="Übernehmen">${ART.check}</button></div>
    </div>`;
  document.body.appendChild(ov);
  const $ = id => ov.querySelector('#' + id);
  const draw = () => {
    $('rpM').value = m; $('rpY').value = y;
    const first = new Date(y, m, 1), lead = (first.getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
    let html = '<span></span>'.repeat(lead);
    for (let d = 1; d <= days; d++) {
      const v = iso(new Date(y, m, d)), fut = v > today;
      const inR = a && b && v >= a && v <= b, edge = v === a || v === b;
      html += `<button type="button" class="rpday${inR ? ' in' : ''}${edge ? ' edge' : ''}${v === today ? ' today' : ''}" data-v="${v}"${fut ? ' disabled' : ''}>${d}</button>`;
    }
    $('rpGrid').innerHTML = html;
    $('rpState').textContent = !a ? 'Ersten Tag antippen' : !b ? `Ab ${U.fmtDate(a)} · jetzt den letzten Tag antippen` : a === b ? U.fmtDate(a) : `${U.fmtDate(a)} bis ${U.fmtDate(b)}`;
  };
  const step = d => { m += d; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } if (y > thisYear || (y === thisYear && m > new Date().getMonth())) { y = thisYear; m = new Date().getMonth(); } draw(); };
  ov.querySelectorAll('.rpnav').forEach(n => n.addEventListener('click', () => step(+n.dataset.d)));
  $('rpM').addEventListener('change', e => { m = +e.target.value; step(0); });
  $('rpY').addEventListener('change', e => { y = +e.target.value; step(0); });
  const finish = () => { onDone(a, b || a); ov.remove(); };
  $('rpGrid').addEventListener('click', e => {
    const t = e.target.closest('[data-v]'); if (!t || t.disabled) return;
    const v = t.dataset.v; U.haptic && U.haptic(8);
    if (!a || (a && b)) { a = v; b = null; draw(); return; }
    if (v < a) { a = v; draw(); return; }
    b = v; draw(); setTimeout(finish, 350);   // Zeitraum vollständig: kurz zeigen, dann schließen
  });
  $('rpClear').addEventListener('click', () => { a = b = null; draw(); });
  $('rpOk').addEventListener('click', finish);
  $('rpNo').addEventListener('click', () => ov.remove());
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
  draw();
}

async function viewArchive() {
  setHeader('Archivieren');
  const cams = gearSort(await DB.all('cameras'), camSortFb);
  const labs = await getLabs();
  const ed = { files: [], dev: null, camId: undefined, stockId: null, format: '135' };
  const camCards = await Promise.all(cams.map(async c => `<button type="button" class="pick cam" data-cam="${c.id}"><span class="pickart">${await camArt(c, 84)}</span><span class="pickname">${U.esc(camLabel(c))}</span></button>`));
  const today = U.today();
  view.innerHTML = `
    <p class="hint pad">Für Rollen, die du schon früher entwickelt hast. Pflicht sind die Fotos und der Film (oder „Weiß ich nicht mehr“). Beschriften kannst du die Bilder danach in der Rolle.</p>
    <section class="wizsec">
      <h2 class="wiztitle">1 · Fotos</h2>
      <label class="btn accent archup">${ARCHIVE_IC}<span id="arUpTxt">Fotos auswählen</span><input type="file" accept="image/*" multiple hidden id="arFiles"></label>
      <p class="hint">Die Reihenfolge folgt den Dateinamen. Ändern kannst du sie danach in „Alle Fotos“.</p>
    </section>
    <section class="wizsec">
      <h2 class="wiztitle">2 · Fotografiert ungefähr</h2>
      <input type="hidden" id="arFrom"><input type="hidden" id="arTo">
      <button type="button" class="filmpickbtn rangebtn" id="arRange"><span class="rangeic" aria-hidden="true">${ART.calIc || ''}</span><span class="filmpickname" id="arRangeTxt">Zeitraum wählen</span><span class="filmpickchg">Kalender</span></button>
    </section>
    <section class="wizsec">
      <h2 class="wiztitle">3 · Entwicklung</h2>
      <label class="fld"><span>Entwickelt am</span><input type="date" id="arDev" max="${today}"></label>
      <div class="devopts" id="arDevOpts">${labs.map(l => `<button type="button" data-o="${l.id}">${U.esc(l.name)}</button>`).join('')}<button type="button" data-o="selbst">Selbst entwickelt</button><button type="button" data-o="">Weiß ich nicht mehr</button></div>
    </section>
    <section class="wizsec">
      <h2 class="wiztitle">4 · Kamera</h2>
      <div class="picks" id="arCams">${camCards.join('')}<button type="button" class="pick cam" data-cam=""><span class="pickart unknowncam">?</span><span class="pickname">Weiß ich nicht mehr</span></button></div>
    </section>
    <section class="wizsec">
      <h2 class="wiztitle">5 · Film und Name</h2>
      <div class="arfilm" id="arFilm"><button type="button" class="filmpickbtn" id="arStock"><span class="filmselart" id="arStockArt"></span><span class="filmpickname" id="arStockName">Film wählen</span><span class="filmpickchg">Pflicht</span></button>
        <button type="button" class="btn ghost small" id="arStockUnknown">Weiß ich nicht mehr</button></div>
      <div class="seggroup" id="arFmt">${[['135', 'Kleinbild'], ['120', 'Mittelformat'], ['half', 'Halbformat'], ['gross', 'Großformat'], ['sonst', 'Sonstiges']].map(([k, l]) => `<button type="button" class="seg${k === ed.format ? ' on' : ''}" data-f="${k}">${l}</button>`).join('')}</div>
      <label class="fld"><span>Name der Rolle</span><input id="arTitle" maxlength="80"></label>
    </section>`;
  const $ = id => view.querySelector('#' + id);
  // Unten rechts: Archivieren (statt eines Zurück-Pfeils, der wie ein Haken wirkt)
  const save = document.createElement('button');
  save.className = 'donebtn archsave'; save.setAttribute('aria-label', 'Rolle archivieren'); save.innerHTML = ARCHIVE_IC; save.disabled = true;
  document.body.appendChild(save);
  $('arFiles').addEventListener('change', e => {
    ed.files = [...e.target.files];
    $('arUpTxt').textContent = ed.files.length ? `${ed.files.length} ${ed.files.length === 1 ? 'Foto' : 'Fotos'} ausgewählt` : 'Fotos auswählen';
    ready();
  });
  // Archivieren erst mit Fotos und einer Filmangabe
  const ready = () => { const ok = !!ed.files.length && !!ed.stockId; save.disabled = !ok; save.classList.toggle('ready', ok); };
  const fmtD = v => v ? U.fmtDate(v) : '';
  $('arRange').addEventListener('click', () => openRangePicker($('arFrom').value, $('arTo').value, (a, b) => {
    $('arFrom').value = a || ''; $('arTo').value = b || a || '';
    $('arRangeTxt').textContent = a ? (b && b !== a ? `${fmtD(a)} bis ${fmtD(b)}` : fmtD(a)) : 'Zeitraum wählen';
    $('arRange').classList.toggle('on', !!a);
  }));
  $('arDevOpts').addEventListener('click', e => {
    const b = e.target.closest('[data-o]'); if (!b) return;
    ed.dev = b.dataset.o; view.querySelectorAll('#arDevOpts button').forEach(x => x.classList.toggle('on', x === b)); U.haptic && U.haptic(8);
  });
  $('arCams').addEventListener('click', e => {
    const b = e.target.closest('[data-cam]'); if (!b) return;
    ed.camId = b.dataset.cam; view.querySelectorAll('#arCams .pick').forEach(x => x.classList.toggle('on', x === b)); U.haptic && U.haptic(8);
  });
  $('arStockUnknown').addEventListener('click', () => {
    ed.stockId = 'film-unbekannt'; $('arStockArt').innerHTML = ''; $('arStockName').textContent = 'Unbekannter Film';
    $('arStock').classList.add('on'); $('arStock').querySelector('.filmpickchg').textContent = 'Ändern'; $('arStockUnknown').classList.add('on'); U.haptic && U.haptic(8); ready();
  });
  $('arStock').addEventListener('click', () => openStockPicker(async id => {
    ed.stockId = id; const st = await DB.get('stocks', id);
    $('arStockArt').innerHTML = await filmArt(st, 36); $('arStockName').textContent = U.stockLabel(st);
    $('arStock').classList.add('on'); $('arStock').querySelector('.filmpickchg').textContent = 'Ändern'; $('arStockUnknown').classList.remove('on'); ready();
    if (st?.formats?.length && !st.formats.includes(ed.format)) { ed.format = st.formats[0] === '120' ? '120' : '135'; view.querySelectorAll('#arFmt .seg').forEach(x => x.classList.toggle('on', x.dataset.f === ed.format)); }
  }, null, 'Film wählen'));
  $('arFmt').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (!b) return; ed.format = b.dataset.f; view.querySelectorAll('#arFmt .seg').forEach(x => x.classList.toggle('on', x === b)); });
  save.addEventListener('click', async () => {
    if (!ed.files.length) { U.toast('Wähle zuerst die Fotos aus'); return; }
    if (!ed.stockId) { U.toast('Wähle den Film aus'); return; }
    const from = $('arFrom').value || null, to = $('arTo').value || from, dev = $('arDev').value || null;
    const cam = cams.find(c => c.id === ed.camId), lab = labs.find(l => l.id === ed.dev);
    if (ed.stockId === 'film-unbekannt') {
      if (!(await DB.get('stocks', ed.stockId))) await DB.put('stocks', { id: ed.stockId, maker: '', name: 'Unbekannter Film', type: 'farbneg', process: '', boxIso: '', formats: ['135', '120'], reciprocity: { model: 'unknown' }, builtin: false });
    }
    const roll = {
      id: U.uid(), stockId: ed.stockId, cameraId: cam?.id || null, camera: camLabel(cam), format: ed.format, exposures: 0, bonus: false, ei: null,
      loadedAt: from || dev || U.today(), finishedAt: to || null, title: $('arTitle').value.trim(), status: 'entwickelt', archived: true, shotFrom: from, shotTo: to,
      dev: ed.dev === 'selbst' ? { mode: 'selbst', devDate: dev } : { mode: 'labor', lab: lab?.name || null, labId: lab?.id || null, backAt: dev },
      createdAt: new Date().toISOString()
    };
    save.disabled = true;
    const busy = document.createElement('div');
    busy.className = 'modalbg busy';
    busy.innerHTML = `<div class="busycard">${ed.files.length} ${ed.files.length === 1 ? 'Foto wird' : 'Fotos werden'} gespeichert …</div>`;
    document.body.appendChild(busy);
    try {
      await DB.put('rolls', roll);
      const n = await assignScans(roll, ed.files);
      U.haptic && U.haptic([20, 60, 20]); U.toast(`Rolle mit ${n} ${n === 1 ? 'Foto' : 'Fotos'} archiviert`);
      location.hash = '#/rolle/' + roll.id;
    } finally { busy.remove(); }
  });
}

/* ---------- Kameras ---------- */
function gearSwitch(active) {
  return `<div class="seggroup gear"><a class="seg${active === 'filme' ? ' on' : ''}" href="#/filme">Filme</a><a class="seg${active === 'kameras' ? ' on' : ''}" href="#/kameras">Kameraschrank</a></div>`;
}

function lensLabel(l) {
  if (!l) return '';
  return [l.maker, l.name, (l.focal ? l.focal + ' mm' : ''), (l.maxAp ? 'f/' + String(l.maxAp).replace('.', ',') : '')].filter(Boolean).join(' ');
}
const LENS_KINDS = [['wide', 'Weitwinkel'], ['normal', 'Normal'], ['tele', 'Tele'], ['zoom', 'Zoom']];

// Ausklappzustand der Profilbereiche merken
function foldOpen(key, def = false) { try { const v = localStorage.getItem('kb-fold-' + key); return v === null ? def : v === '1'; } catch (_) { return def; } }
function setupFolds(root) {
  root.querySelectorAll('.fold > .foldhead').forEach(h => {
    h.setAttribute('role', 'button'); h.tabIndex = 0;
    const sec = h.parentElement;
    h.setAttribute('aria-expanded', sec.classList.contains('open'));
    const toggle = e => {
      if (e.target.closest('button, a, input')) return;
      const open = sec.classList.toggle('open');
      h.setAttribute('aria-expanded', open);
      try { localStorage.setItem('kb-fold-' + sec.dataset.fold, open ? '1' : '0'); } catch (_) {}
    };
    h.addEventListener('click', toggle);
    h.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(e); } });
  });
}

// Lightleaks einer Kamera: markierte Bilder aller Rollen und das erste Einlegedatum
async function leakStats(camId, rolls, frames) {
  rolls = rolls || await DB.all('rolls'); frames = frames || await DB.all('frames');
  const mine = rolls.filter(r => r.cameraId === camId);
  const ids = new Set(mine.map(r => r.id));
  const since = mine.map(r => r.loadedAt).filter(Boolean).sort()[0] || null;
  const n = frames.filter(f => f.leak && ids.has(f.rollId)).length;
  return { n, since, marked: mine.some(r => r.leaksMarked) };
}
const leakSentence = st => st.since
  ? `Diese Kamera hat seit ${U.fmtDate(st.since)} ${st.n} ${st.n === 1 ? 'Lightleak' : 'Lightleaks'} produziert.`
  : 'Mit dieser Kamera wurde noch kein Film eingelegt.';

// Reihenfolge aus dem Kameraschrank (per Ziehen festgelegt). Einträge ohne Platz kommen ans Ende.
const camSortFb = (a, b) => camLabel(a).localeCompare(camLabel(b));
const lensSortFb = (a, b) => (a.mount || '').localeCompare(b.mount || '') || parseFloat(a.focal) - parseFloat(b.focal);
function gearSort(list, fb) { return list.sort((a, b) => (!!b.fav - !!a.fav) || (a.order ?? 1e6) - (b.order ?? 1e6) || fb(a, b)); }
// Favoriten im Kameraschrank: Leuchtpunkt in der Ecke des Bildes, Favoriten stehen oben in ihrer Liste
// v196: gleicher leuchtender Punkt wie bei den Favoriten in „Alle Fotos“
const FAV_IC = '<span class="favpt" aria-hidden="true"></span>';
const favStar = (store, item) => `<span class="favstar${item.fav ? ' on' : ''}" role="button" tabindex="0" data-fav="${store}:${item.id}" aria-pressed="${!!item.fav}" aria-label="${item.fav ? 'Aus Favoriten entfernen' : 'Als Favorit markieren'}">${FAV_IC}</span>`;
async function toggleFav(store, id) {
  if (store === 'filters' || store === 'accessories') {
    const list = store === 'filters' ? await getFilters() : await getAccessories();
    const it = list.find(x => x.id === id); if (!it) return null;
    it.fav = !it.fav;
    await (store === 'filters' ? saveFilters(list) : saveAccessories(list));
    return it.fav;
  }
  const it = await DB.get(store, id); if (!it) return null;
  it.fav = !it.fav; await DB.put(store, it); return it.fav;
}
function setupFavs(root) {
  const act = async e => {
    const st = e.target.closest('.favstar'); if (!st) return;
    e.preventDefault(); e.stopPropagation();
    const [store, id] = st.dataset.fav.split(':');
    const on = await toggleFav(store, id); if (on === null) return;
    st.classList.toggle('on', on); st.setAttribute('aria-pressed', on);
    st.setAttribute('aria-label', on ? 'Aus Favoriten entfernen' : 'Als Favorit markieren');
    U.haptic && U.haptic(on ? [12, 40, 12] : 10);
    // Zeile innerhalb ihrer Liste nach oben (oder hinter die Favoriten) schieben, ohne neu zu laden
    const row = st.closest('.crow'), list = row?.parentElement;
    if (list) {
      const rows = [...list.children].filter(x => x.classList.contains('crow'));
      const favs = rows.filter(x => x.querySelector(':scope .favstar.on'));
      const rest = rows.filter(x => !favs.includes(x));
      [...favs, ...rest].forEach(x => list.appendChild(x));
      row.classList.remove('fresh'); void row.offsetWidth; row.classList.add('fresh');
    }
  };
  root.addEventListener('click', act, true);
  root.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest?.('.favstar')) act(e); }, true);
}

// Kameraschrank. Im Profil (fold) nur vier Kacheln, jede führt in ihre eigene Seite #/schrank/<teil>. Mit only wird genau ein Teil gezeigt.
const CAB_PARTS = [['kameras', 'Kameras'], ['objektive', 'Objektive'], ['filter', 'Filter'], ['zubehoer', 'Zubehör']];
async function cabinetHtml(fold = false, only = null) {
  const cams = gearSort(await DB.all('cameras'), camSortFb);
  const lenses = gearSort(await DB.all('lenses'), lensSortFb);
  const [rolls, frames] = [await DB.all('rolls'), await DB.all('frames')];
  const nFilters = (await getFilters()).reduce((n, f) => n + (f.count || 1), 0);
  let fresh = null;
  try { fresh = sessionStorage.getItem('kb-newgear'); sessionStorage.removeItem('kb-newgear'); } catch (_) {}
  const camRow = async c => {
    const own = lenses.filter(l => !l.inactive && (l.cameraIds || []).includes(c.id));
    const lk = c.lightLeaks ? await leakStats(c.id, rolls, frames) : null;
    return `<a class="crow${fresh === c.id ? ' fresh' : ''}${c.broken ? ' broken' : ''}${c.inactive ? ' inactive' : ''}" href="#/kamera/${c.id}" data-id="${c.id}">
      <span class="crowart">${await camArt(c, 76)}${favStar('cameras', c)}</span>
      <span class="frowmain">
        <span class="frowname">${U.esc(camLabel(c))}</span>
        <span class="frowchips">${c.mount ? `<span>${U.esc(c.mount)}</span>` : ''}${c.broken ? '<span class="brokentag">kaputt</span>' : ''}${lentChip(c)}${lk && lk.since ? `<span class="leaktag">${lk.n} ${lk.n === 1 ? 'Lightleak' : 'Lightleaks'}</span>` : ''}</span>
        ${c.broken && c.brokenNotes ? `<span class="frowsub">${U.esc(c.brokenNotes.slice(0, 80))}</span>` : ''}
        ${own.length ? `<span class="minilenses">${own.map(l => ART.lens(l, 34)).join('')}</span>` : ''}
      </span>
      <span class="chev">›</span>
    </a>`;
  };
  const working = cams.filter(c => !c.broken && !c.inactive), broken = cams.filter(c => c.broken), inactive = cams.filter(c => c.inactive && !c.broken);
  const camRows = await Promise.all(working.map(camRow));
  const brokenRows = await Promise.all(broken.map(camRow));
  const inactiveRows = await Promise.all(inactive.map(camRow));
  const lensRow = l => {
    const names = (l.cameraIds || []).map(id => cams.find(c => c.id === id)).filter(Boolean).map(camLabel);
    return `<a class="crow${fresh === l.id ? ' fresh' : ''}${l.inactive ? ' inactive' : ''}" href="#/objektiv/${l.id}" data-id="${l.id}">
      <span class="crowart lensart">${ART.lens(l, 60)}${favStar('lenses', l)}</span>
      <span class="frowmain">
        <span class="frowname">${U.esc(lensLabel(l))}</span>
        <span class="frowchips">${lentChip(l)}<span>${U.esc(l.mount || 'Bajonett offen')}</span>${l.filterThread ? `<span class="threadtag">⌀ ${U.esc(String(l.filterThread).replace('.', ','))} mm</span>` : ''}${names.map(n => `<span>${U.esc(n)}</span>`).join('')}</span>
      </span>
      <span class="chev">›</span>
    </a>`;
  };
  // Inaktive Objektive stehen unter den aktiven in einer eigenen Gruppe
  const lensRows = lenses.filter(l => !l.inactive).map(lensRow);
  const inactiveLensRows = lenses.filter(l => l.inactive).map(lensRow);
  const freshCam = cams.some(c => c.id === fresh), freshLens = lenses.some(l => l.id === fresh);
  const sub = (key, title, count, add, body, open) => `
      <div class="cabsub fold${open ? ' open' : ''}" data-fold="${key}">
        <div class="cabhead foldhead"><h3>${title}<span class="cabcount">${count}</span></h3><span class="cabtools"><button class="fridgeplus" data-add="${add}" aria-label="${add === 'kamera' ? 'Kamera' : 'Objektiv'} hinzufügen">+</button><span class="foldchev" aria-hidden="true"></span></span></div>
        <div class="foldbody">${body}</div>
      </div>`;
  const partCams = () => `${sub('cab-cams', 'Kameras', working.length, 'kamera', `<div class="flist" data-sort="cameras">${camRows.length ? camRows.join('') : '<p class="hint">Noch keine Kamera. Lege mit dem Plus deine erste an.</p>'}</div>
        ${brokenRows.length ? `<div class="brokenhead">Kaputt</div><div class="flist" data-sort="cameras">${brokenRows.join('')}</div>` : ''}`, freshCam || foldOpen('cab-cams'))}
      ${inactiveRows.length ? `
      <div class="cabsub fold inactivesub${foldOpen('cab-inactive') ? ' open' : ''}" data-fold="cab-inactive">
        <div class="cabhead foldhead"><h3>Inaktiv<span class="cabcount">${inactiveRows.length}</span></h3><span class="cabtools"><span class="foldchev" aria-hidden="true"></span></span></div>
        <div class="foldbody"><p class="hint inactivehint">Kameras, die gerade im Regal liegen. Sie erscheinen nicht bei „Film einlegen“.</p><div class="flist" data-sort="cameras">${inactiveRows.join('')}</div></div>
      </div>` : ''}`;
  const partLenses = () => sub('cab-lenses', 'Objektive', lenses.length, 'objektiv', `<div class="flist" data-sort="lenses">${lensRows.length ? lensRows.join('') : '<p class="hint">Noch keine aktiven Objektive.</p>'}</div>
        ${inactiveLensRows.length ? `<div class="brokenhead">Inaktiv</div><div class="flist" data-sort="lenses">${inactiveLensRows.join('')}</div>` : ''}`, freshLens || foldOpen('cab-lenses'));
  if (only) {
    // Eigene Seite: der Teil steht offen da, ohne Einklappen
    const html = only === 'kameras' ? partCams() : only === 'objektive' ? partLenses()
      : only === 'filter' ? await filtersSubHtml(lenses, true) : await accessoriesSubHtml(cams, true);
    return `<section class="cabinet cabpage">${html.replace(/class="cabsub fold(?! inactivesub)( open)?"/, 'class="cabsub cabsolo"')}</section>`;
  }
  if (fold) {
    const filters = await getFilters(), accs = await getAccessories();
    const favFirst = list => [...list].sort((a, b) => !!b.fav - !!a.fav);
    const c0 = favFirst(cams.filter(c => !c.inactive && !c.broken))[0] || cams[0], l0 = favFirst(lenses.filter(l => !l.inactive))[0] || lenses[0], f0 = favFirst(filters)[0], a0 = favFirst(accs)[0];
    const nAcc = accs.reduce((n, a) => n + (a.count || 1), 0);
    const tile = (k, label, n, art) => `<a class="cabtile" href="#/schrank/${k}"><span class="cabtileart">${art}</span><span class="cabtilename">${label}</span><span class="sub2">${n}</span></a>`;
    return `
    <section class="cabinet fold${fresh || foldOpen('cabinet') ? ' open' : ''}" data-fold="cabinet">
      <div class="fridgetop foldhead">
        <span class="fridgeicon cabicon">${ART.cabinet}</span>
        <div><h2>Kameraschrank</h2><span class="sub2">${cams.length} ${cams.length === 1 ? 'Kamera' : 'Kameras'} · ${lenses.length} ${lenses.length === 1 ? 'Objektiv' : 'Objektive'}${nFilters ? ` · ${nFilters} Filter` : ''}</span></div>
        <span class="foldchev" aria-hidden="true"></span>
      </div>
      <div class="foldbody"><div class="cabtiles">
        ${tile('kameras', 'Kameras', `${working.length} aktiv${inactiveRows.length + brokenRows.length ? ` · ${inactiveRows.length + brokenRows.length} weitere` : ''}`, c0 ? await camArt(c0, 64) : ART.cabinet)}
        ${tile('objektive', 'Objektive', `${lenses.length}`, l0 ? ART.lens(l0, 50) : '')}
        ${tile('filter', 'Filter', `${nFilters}`, f0 ? filterArt(f0, 46) : '')}
        ${tile('zubehoer', 'Zubehör', `${nAcc}`, a0 ? accIcon(a0.kind, 36) : accIcon('sonst', 36))}
      </div></div>
    </section>`;
  }
  return `
    <section class="cabinet" data-fold="cabinet">
      <div class="fridgetop">
        <span class="fridgeicon cabicon">${ART.cabinet}</span>
        <div><h2>Kameraschrank</h2></div>
      </div>
      <div class="foldbody">
      ${partCams()}
      ${partLenses()}
      ${await filtersSubHtml(lenses, foldOpen('cab-filters'))}
      ${await accessoriesSubHtml(cams, foldOpen('cab-acc'))}
      </div>
    </section>`;
}

async function viewCabinetPart(k) {
  const part = CAB_PARTS.find(p => p[0] === k);
  if (!part) { location.replace('#/profil'); return; }
  setHeader(part[1]);
  const sortable = k === 'kameras' || k === 'objektive';
  view.innerHTML = `<div class="cabnav">${CAB_PARTS.map(([key, label]) => `<a class="seg${key === k ? ' on' : ''}" href="#/schrank/${key}">${label}</a>`).join('')}</div>`
    + U.hintOnce('cab-gestures2', sortable ? 'Der Leuchtpunkt am Bild macht einen Eintrag zum Favoriten, er steht dann oben. Mit langem Drücken ziehst du Einträge an eine andere Stelle.' : 'Der Leuchtpunkt am Bild macht einen Eintrag zum Favoriten, er steht dann oben.')
    + await cabinetHtml(false, k);
  setupFolds(view);
  setupCabinet(view);
}

// Plus im Kameraschrank: kurzes Vibrieren, danach leuchtet der neue Eintrag beim Zurückkommen auf
function setupCabinet(root) {
  root.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => {
    U.haptic();
    b.classList.add('pulse');
    setTimeout(() => { location.hash = `#/${b.dataset.add}/neu`; }, 180);
  }));
  const f = root.querySelector('.crow.fresh');
  if (f) { setTimeout(() => f.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150); }
  root.querySelectorAll('.flist[data-sort]').forEach(setupGearDrag);
  setupFavs(root);
  setupFilters(root);
  setupAccessories(root);
}
async function viewCameras() {
  setHeader('Kameraschrank');
  view.innerHTML = await cabinetHtml();
  setupCabinet(view);
}

// Reihenfolge ändern: Eintrag lange gedrückt halten, bis er sich anhebt, dann an die neue Stelle ziehen.
let GEAR_DRAG = false;
document.addEventListener('touchmove', e => { if (GEAR_DRAG) e.preventDefault(); }, { passive: false });
function setupGearDrag(list) {
  const holdMs = () => list.closest('.cabsorting') ? 90 : 380;   // im Modus „Reihenfolge“ hebt fast sofort an
  let timer = null, row = null, rows = [], rects = [], startY = 0, startX = 0, from = 0, to = 0, step = 0, active = false, suppress = false;
  const reset = () => { clearTimeout(timer); timer = null; };
  list.addEventListener('dragstart', e => e.preventDefault());
  list.addEventListener('contextmenu', e => { if (timer || active || suppress) e.preventDefault(); });
  list.addEventListener('click', e => { if (suppress || (list.closest('.cabsorting') && !e.target.closest('.favstar'))) { e.preventDefault(); e.stopPropagation(); } }, true);
  list.addEventListener('pointerdown', e => {
    const r = e.target.closest('.crow');
    if (!r || !list.contains(r) || (e.pointerType === 'mouse' && e.button !== 0)) return;
    rows = [...list.querySelectorAll(':scope > .crow')];
    if (rows.length < 2) return;
    row = r; startY = e.clientY; startX = e.clientX;
    const pid = e.pointerId;
    timer = setTimeout(() => {
      timer = null; active = true; GEAR_DRAG = true; suppress = true;
      from = to = rows.indexOf(row);
      rects = rows.map(x => x.getBoundingClientRect());
      const gap = rects[1].top - rects[0].bottom;
      step = rects[from].height + gap;
      list.classList.add('sorting'); row.classList.add('lifted');
      row.style.transform = 'scale(1.03)';
      try { row.setPointerCapture(pid); } catch (_) {}
      U.haptic();
    }, holdMs());
  });
  list.addEventListener('pointermove', e => {
    if (!row) return;
    if (timer && (Math.abs(e.clientY - startY) > 8 || Math.abs(e.clientX - startX) > 8)) { reset(); row = null; return; }
    if (!active) return;
    const dy = e.clientY - startY;
    row.style.transform = `translateY(${dy}px) scale(1.03)`;
    const mid = rects[from].top + rects[from].height / 2 + dy;
    let next = 0;
    rects.forEach((r, i) => { if (i !== from && r.top + r.height / 2 < mid) next++; });
    if (next !== to) { to = next; U.haptic(8); }
    rows.forEach((x, i) => {
      if (x === row) return;
      let shift = 0;
      if (from < to && i > from && i <= to) shift = -step;
      if (from > to && i < from && i >= to) shift = step;
      x.style.transform = shift ? `translateY(${shift}px)` : '';
    });
  });
  const end = async () => {
    reset();
    if (!active) { row = null; return; }
    active = false; GEAR_DRAG = false;
    rows.forEach(x => { x.style.transform = ''; });
    row.classList.remove('lifted'); list.classList.remove('sorting');
    if (to !== from) {
      const moved = rows.splice(from, 1)[0]; rows.splice(to, 0, moved);
      rows.forEach(x => list.appendChild(x));
      const store = list.dataset.sort;
      const lists = [...document.querySelectorAll(`.flist[data-sort="${store}"]`)];
      const ids = lists.flatMap(l => [...l.querySelectorAll(':scope > .crow')].map(x => x.dataset.id));
      for (let i = 0; i < ids.length; i++) { const it = await DB.get(store, ids[i]); if (it && it.order !== i) { it.order = i; await DB.put(store, it); } }
    }
    row = null;
    setTimeout(() => { suppress = false; }, 400);
  };
  list.addEventListener('pointerup', end);
  list.addEventListener('pointercancel', end);
}

async function viewLens(id) {
  const cams = gearSort(await DB.all('cameras'), camSortFb);
  if (id === 'neu') {
    const l = { id: U.uid(), maker: '', focal: '50', kind: 'normal', mount: '', cameraIds: [] };
    // Ohne Vorauswahl: Bajonett und passende Kameras wählt man selbst
    await DB.put('lenses', l);
    try { sessionStorage.setItem('kb-newgear', l.id); } catch (_) {}
    FRESH_ID = l.id;
    location.replace('#/objektiv/' + l.id);
    return;
  }
  const lens = await DB.get('lenses', id);
  if (!lens) { location.replace('#/kameras'); return; }
  lens.cameraIds = lens.cameraIds || [];
  setHeader(lensLabel(lens) || 'Objektiv', {});
  gearDoneButton();
  const used = (await DB.all('frames')).some(f => f.lensId === id);
  const draw = () => {
    view.innerHTML = `
    <div class="lensstage">${ART.lens(lens, 150)}</div>
    <div class="card" id="lf">
      <div class="qlabel">Art</div>
      <div class="kindrow" id="kindRow">${LENS_KINDS.map(([k, t]) => `<button type="button" class="kindbtn${lens.kind === k ? ' on' : ''}" data-kind="${k}" aria-label="${t}">${ART.lens({ kind: k, focal: '' }, 46)}<span>${t}</span></button>`).join('')}</div>
      <div class="two">
        ${field('Brennweite (mm)', 'focal')}
        ${field('Lichtstärke (größte Blende)', 'maxAp')}
        ${field('Kleinste Blende', 'minAp')}
        ${field('Filtergewinde ⌀ (mm)', 'filterThread', { attrs: 'inputmode="decimal"' })}
      </div>
      ${field('Hersteller', 'maker')}
      ${field('Bezeichnung', 'name')}
      <label class="fld"><span>Bajonett</span><select data-f="mount"><option value="">Bitte wählen</option>${MOUNTS.map(m => `<option>${U.esc(m)}</option>`).join('')}</select></label>
      <div class="qlabel">Passt an</div>
      <div class="camchecks" id="camChecks">${cams.map(c => `<label class="camcheck${lens.mount && c.mount && c.mount !== lens.mount ? ' other' : ''}"><input type="checkbox" value="${c.id}" ${lens.cameraIds.includes(c.id) ? 'checked' : ''}><span>${U.esc(camLabel(c))}<br><span class="sub2">${U.esc(c.mount || 'Bajonett offen')}</span></span></label>`).join('')}</div>
      ${lentFields('Objektiv')}
      <label class="check"><input type="checkbox" data-f="inactive"> Objektiv ist inaktiv</label>
      <p class="hint" style="margin:-4px 0 10px">Inaktive Objektive stehen im Schrank unter „Inaktiv“ und erscheinen nicht mehr in der Bildansicht.</p>
      <div class="two">
        ${field('Kaufpreis (€)', 'price', { attrs: 'inputmode="decimal"' })}
        ${field('Gekauft am', 'boughtAt', { type: 'date' })}
      </div>
      ${area('Notizen', 'notes', '')}
    </div>
    ${used || FRESH_ID === lens.id ? '' : '<button class="btn danger wide" id="delLens">Objektiv löschen</button>'}`;
    lentWire(view.querySelector('#lf'), lens);
    bind(view.querySelector('#lf'), lens, 'lenses', () => {
      view.querySelector('.lensstage').innerHTML = ART.lens(lens, 150);
      setHeader(lensLabel(lens) || 'Objektiv', {});
      view.querySelectorAll('.camcheck').forEach(el => {
        const c = cams.find(x => x.id === el.querySelector('input').value);
        el.classList.toggle('other', !!(lens.mount && c.mount && c.mount !== lens.mount));
      });
    });
    view.querySelector('#kindRow').addEventListener('click', async e => {
      const b = e.target.closest('[data-kind]'); if (!b) return;
      lens.kind = b.dataset.kind; await DB.put('lenses', lens);
      view.querySelectorAll('.kindbtn').forEach(x => x.classList.toggle('on', x === b));
      view.querySelector('.lensstage').innerHTML = ART.lens(lens, 150);
    });
    view.querySelector('#camChecks').addEventListener('change', async () => {
      lens.cameraIds = [...view.querySelectorAll('#camChecks input:checked')].map(i => i.value);
      await DB.put('lenses', lens);
    });
    view.querySelector('#delLens')?.addEventListener('click', async () => { const keep = await DB.get('lenses', lens.id); await DB.del('lenses', lens.id); location.replace('#/schrank/objektive'); U.undo('Objektiv gelöscht', async () => { if (keep) await DB.put('lenses', keep); route(); }); });
  };
  draw();
}

async function viewCamera(id) {
  if (id === 'neu') {
    const cam = { id: U.uid(), maker: '', name: 'Neue Kamera', format: '135', mount: 'Nikon F', isoDial: true, multiExp: true, art: { kind: 'slr', body: 'black' } };
    await DB.put('cameras', cam);
    try { sessionStorage.setItem('kb-newgear', cam.id); } catch (_) {}
    FRESH_ID = cam.id;
    location.replace('#/kamera/' + cam.id);
    return;
  }
  const cam = await DB.get('cameras', id);
  if (!cam) { location.replace('#/kameras'); return; }
  cam.art = cam.art || { kind: 'slr', body: 'black' };
  setHeader(camLabel(cam), {});
  gearDoneButton();
  const used = (await DB.all('rolls')).filter(r => r.cameraId === id).length;
  const camLenses = gearSort((await DB.all('lenses')).filter(l => (l.cameraIds || []).includes(id)), (a, b) => parseFloat(a.focal) - parseFloat(b.focal));
  view.innerHTML = `
  <div class="artrow">
    <div class="artbox" id="camArt">${await camArt(cam, 150)}</div>
    <div class="artbtns">
      <label class="btn ghost small">${cam.photoId ? 'Foto ersetzen' : 'Eigenes Foto'}<input type="file" accept="image/*" hidden id="camPhoto"></label>
      ${cam.photoId ? '<button class="btn ghost small" id="camPhotoRm">Foto entfernen</button>' : ''}
    </div>
  </div>
  <div class="card" id="cf">
    ${field('Hersteller', 'maker')}
    ${field('Modell', 'name')}
    ${select('Format', 'format', [['135', 'Kleinbild (135)'], ['half', 'Halbformat (135, 18 × 24 mm)'], ['120', 'Mittelformat (120)'], ['gross', 'Großformat (Planfilm)']])}
    <label class="fld"><span>Bajonett</span><select data-f="mount">${MOUNTS.map(m => `<option>${U.esc(m)}</option>`).join('')}</select></label>
    <div class="two">
      ${select('Kürzeste Zeit', 'shutterFast', [['', 'keine Angabe'], ...SPEEDS.map(v => [v, v + (/^\d+$/.test(v) ? ' s' : ' s')])])}
      ${select('Längste Zeit', 'shutterSlow', [['', 'keine Angabe'], ...SPEEDS.map(v => [v, v + ' s'])])}
    </div>
    <div class="row gap" style="padding:0">
      <label class="check"><input type="checkbox" data-f="shutterB"> B</label>
      <label class="check"><input type="checkbox" data-f="shutterT"> T</label>
      <label class="check"><input type="checkbox" data-f="shutterX"> X</label>
    </div>
    ${select('Blitzsynchronzeit', 'flashSync', FLASH_SYNC_OPTS)}
    ${cam.flashNote ? `<p class="hint" style="margin:-4px 0 8px">${U.esc(cam.flashNote)}</p>` : ''}
    <label class="check"><input type="checkbox" data-f="isoDial"> ISO-Einstellung an der Kamera</label>
    <label class="check"><input type="checkbox" data-f="multiExp"> Doppelbelichtung möglich</label>
    <label class="check"><input type="checkbox" data-f="lightLeaks"> Kamera hat Lightleaks</label>
    ${cam.lightLeaks ? `<p class="leakstat">${U.esc(leakSentence(await leakStats(cam.id)))}</p>` : ''}
    <label class="check"><input type="checkbox" data-f="borrowed"> Kamera ist ausgeliehen</label>
    ${lentFields('Kamera')}
    <label class="check"><input type="checkbox" data-f="inactive"> Kamera ist inaktiv</label>
    <label class="check"><input type="checkbox" data-f="broken"> Kamera ist kaputt</label>
    <div id="brokenBox">${area('Was ist kaputt?', 'brokenNotes', '', 3)}<p class="hint">Kaputte Kameras erscheinen nicht bei „Film einlegen“.</p></div>
    <div id="mfBox">
      ${field('Bilder pro 120er-Rolle', 'frames', { num: true })}
      ${field('Bildformat', 'frameSize')}
    </div>
    ${select('Illustration', 'art.kind', [['slr', 'Spiegelreflex'], ['mf', 'Mittelformat-Würfel'], ['compact', 'Kompaktkamera']])}
    ${select('Farbe Spiegelreflex', 'art.body', [['black', 'Schwarz'], ['chrome', 'Chrom']])}
    <div class="two">
      ${field('Kaufpreis (€)', 'price', { attrs: 'inputmode="decimal"' })}
      ${field('Gekauft am', 'boughtAt', { type: 'date' })}
    </div>
    ${area('Notizen', 'notes', '')}
  </div>
  <div class="card">
    <div class="cabhead"><h3>Objektive für diese Kamera</h3><a class="fridgeplus" href="#/objektiv/neu" aria-label="Objektiv hinzufügen">+</a></div>
    ${camLenses.length ? `<div class="lensrow">${camLenses.map(l => `<a class="lensbtn" href="#/objektiv/${l.id}" aria-label="${U.esc(lensLabel(l))}">${ART.lens(l, 64)}</a>`).join('')}</div>` : '<p class="hint">Noch keine. Im Objektiv lässt sich ankreuzen, an welche Kameras es passt.</p>'}
  </div>
  ${used || FRESH_ID === cam.id ? '' : `<button class="btn danger wide" id="delCam">Kamera löschen</button>`}`;
  const sync = async () => {
    view.querySelector('#mfBox').hidden = cam.format !== '120';
    view.querySelector('#brokenBox').hidden = !cam.broken;
    if (!cam.photoId && !SEED_IMG[cam.id]) view.querySelector('#camArt').innerHTML = ART.camera(cam, 150);
    setHeader(camLabel(cam), {});
  };
  bind(view.querySelector('#cf'), cam, 'cameras', sync);
  lentWire(view.querySelector('#cf'), cam);
  view.querySelector('#cf').addEventListener('input', () => setTimeout(sync, 400));
  sync();
  view.querySelector('#camPhoto').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    const rec = await U.storeImage(f, 'camera');
    await deleteImage(cam.photoId); cam.photoId = rec.id; await DB.put('cameras', cam); route();
  });
  view.querySelector('#camPhotoRm')?.addEventListener('click', async () => { await deleteImage(cam.photoId); cam.photoId = null; await DB.put('cameras', cam); route(); });
  view.querySelector('#delCam')?.addEventListener('click', async () => { const keep = await DB.get('cameras', cam.id); await DB.del('cameras', cam.id); location.replace('#/schrank/kameras'); U.undo('Kamera gelöscht', async () => { if (keep) await DB.put('cameras', keep); route(); }); });
}
