/* Rollen: Assistent, Übersicht, Bildansicht, Entwicklung, Favoriten, Album, Kameras */

const APERTURES = ['1.4', '2', '2.8', '4', '5.6', '8', '11', '16', '22'];
// Zeiten von der kürzesten zur längsten. Ohne Kameradaten gilt die volle Reihe.
const SPEEDS = ['1/4000', '1/2000', '1/1000', '1/500', '1/250', '1/125', '1/60', '1/30', '1/15', '1/8', '1/4', '1/2', '1', '2', '4', '8', '15', '30', '40'];
const SHUTTERS = ['1/2000', '1/1000', '1/500', '1/250', '1/125', '1/60', '1/30', '1/15', '1/8', '1/4', '1/2', '1', '2', '4', '8', 'B', 'Auto'];
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
// Zeiten einer Kamera: kürzeste Zeit zuerst, dann B, T, Automatik
function camShutters(c) {
  if (!c) return SHUTTERS;
  if (c.auto && !c.shutterFast) return ['Auto'];
  if (!c.shutterFast) return SHUTTERS;
  const a = SPEEDS.indexOf(c.shutterFast), b = SPEEDS.indexOf(c.shutterSlow || '1');
  return [...SPEEDS.slice(a, b + 1), ...(c.shutterB ? ['B'] : []), ...(c.shutterT ? ['T'] : []), ...(c.shutterAuto ? ['Auto'] : [])];
}
const chipHtml = (list, cur, sec) => list.map(v => `<button type="button" class="chip${cur === v ? ' on' : ''}" data-v="${v}">${v.replace('.', ',')}${sec && /^\d+$/.test(v) ? ' s' : ''}</button>`).join('');
const FORMAT_LABEL = { '135': 'Kleinbild', '120': 'Mittelformat' };

function nowLocal() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
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
  setHeader('');
  titleEl.innerHTML = WORDMARK;
  const [rolls, stocks, cams] = [await DB.all('rolls'), await stocksMap(), await DB.all('cameras')];
  const hero = await profileHero();
  const camMap = new Map(cams.map(c => [c.id, c]));
  const allFrames = await DB.all('frames');
  const allFilters = await getFilters();
  rolls.sort((a, b) => (b.loadedAt || b.createdAt || '').localeCompare(a.loadedAt || a.createdAt || ''));
  let html = hero + `<a class="btn glass newroll" href="#/rolle/neu">Film einlegen</a>`;
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
        : g === 'belichtet' ? `<button class="cardact to-album" data-pickup="${r.id}" aria-label="Film abgeholt, Scans hochladen">${ART.up}<span>Scans hochladen</span></button>`
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
      ['Bilder', (r.status || 'entwurf') === 'entwickelt' ? `${scans} Scans` : `${used} von ${fr.length} notiert${r.bonus ? ' · mit Bonusbild' : ''}`],
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

/* ---------- Fenster „Film abgeholt“: Scans hochladen, danach Fotoalbum ---------- */
// „Scans hochladen“ öffnet direkt die Fotoauswahl. Die Scans füllen die Platzhalter in der Reihenfolge der Dateinamen.
function openPickupModal(roll, done) {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true; inp.hidden = true;
  document.body.appendChild(inp);
  inp.addEventListener('change', async () => {
    const files = [...inp.files]; inp.remove();
    if (!files.length) return;
    const busy = document.createElement('div');
    busy.className = 'modalbg busy';
    busy.innerHTML = `<div class="busycard">${files.length} ${files.length === 1 ? 'Scan wird' : 'Scans werden'} gespeichert …</div>`;
    document.body.appendChild(busy);
    try {
      const n = await assignScans(roll, files);
      roll.status = 'entwickelt';
      roll.dev = roll.dev || {};
      if (!roll.dev.backAt && !roll.dev.devDate) roll.dev[roll.dev.mode === 'selbst' ? 'devDate' : 'backAt'] = U.today();
      await DB.put('rolls', roll);
      U.toast(`${n} ${n === 1 ? 'Scan' : 'Scans'} hochgeladen`);
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
  const camCards = await Promise.all(cams.map(async c => `
    <button type="button" class="pick cam${wiz.cameraId === c.id ? ' on' : ''}" data-cam="${c.id}" data-format="${c.format}">
      <span class="pickart">${await camArt(c, 104)}</span>
      <span class="pickname">${U.esc(camLabel(c))}</span>
    </button>`));
  const fridge = sortFridge((await DB.all('fridge')).filter(e => (e.count || 0) > 0), new Map(stocks.map(x => [x.id, x])), 'expiry');
  const rows = await Promise.all(fridge.map(e => fridgeRow(e, stocks.find(x => x.id === e.stockId), { pick: true, on: wiz.fridgeId === e.id })));
  let chosenOther = wiz.stockId && !wiz.fridgeId ? stocks.find(x => x.id === wiz.stockId) : null;
  if (chosenOther && chosenOther.formats && !chosenOther.formats.includes(wiz.format)) { chosenOther = null; wiz.stockId = null; }
  root.innerHTML = `
    ${steps(1)}
    <section class="wizsec">
      <h2 class="wiztitle">Kamera</h2>
      <div class="seggroup fmtpick" id="fmt">
        <button type="button" class="seg${wiz.format === '135' ? ' on' : ''}" data-fmt="135" aria-label="Kleinbild">${ART.fmt135}<span>135</span></button>
        <button type="button" class="seg${wiz.format === '120' ? ' on' : ''}" data-fmt="120" aria-label="Mittelformat">${ART.fmt120}<span>120</span></button>
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
      <label class="fld"><span>Name der Rolle</span><input id="rollTitle" maxlength="80" value="${U.esc(wiz.title || '')}" enterkeyhint="done"></label>
      <label class="fld"><span>Eingelegt am</span><input type="date" id="loadedAt" value="${wiz.loadedAt || U.today()}"></label>
    </section>
    <div class="wizfoot">${NEXT_BTN('next', 'Film in die Kamera legen', true)}</div>`;
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
  root.querySelector('#rollTitle').addEventListener('input', e => { wiz.title = e.target.value; wizSave(wiz); });

  const filter = (box, q, extra) => box && box.querySelectorAll('[data-q]').forEach(el => {
    el.hidden = !(el.dataset.q.includes(q.toLowerCase().trim()) && (!extra || extra(el)));
  });
  const fmtOk = el => el.dataset.format === wiz.format;
  const refresh = () => {
    filter(root.querySelector('#fridgeList'), root.querySelector('#qFridge')?.value || '', fmtOk);
    const fl = root.querySelector('#fridgeList');
    if (fl) {
      const any = [...fl.children].some(x => !x.hidden), q = (root.querySelector('#qFridge')?.value || '').trim();
      const forFmt = [...fl.children].some(x => x.dataset.format === wiz.format);
      const none = root.querySelector('#fridgeNone');
      root.querySelector('#qFridge').hidden = !forFmt;
      fl.hidden = !forFmt;
      root.querySelector('#fcTitle').textContent = forFmt ? 'Aus dem Filmkühlschrank' : 'Dein Filmkühlschrank ist leer.';
      none.hidden = any || !forFmt;
      none.textContent = 'Ups, der Film liegt noch nicht im Kühlschrank.';
    }
    root.querySelectorAll('#cams [data-cam]').forEach(el => { el.hidden = !fmtOk(el); });
    root.querySelector('#next').disabled = !(wiz.stockId && parseInt(wiz.expChoice) > 0);
  };
  const toNext = () => root.querySelector('#expSec').scrollIntoView({ behavior: 'smooth', block: 'center' });
  const toFilm = () => root.querySelector('#filmSec').scrollIntoView({ behavior: 'smooth', block: 'start' });
  const dropMismatch = () => {
    if (wiz.fridgeId) { const fe = root.querySelector(`[data-fridge="${wiz.fridgeId}"]`); if (fe && fe.dataset.format !== wiz.format) { wiz.fridgeId = null; wiz.stockId = null; fe.classList.remove('on'); } }
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
  }, wiz.format));
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
  const options = is120 ? (n120 ? [String(n120)] : []) : ['24', '36', '36+1'];
  const key = wiz.format + (wiz.cameraId || '');
  if (is120) { wiz.expChoice = n120 ? String(n120) : ''; wiz.expFor = key; }
  else if (!wiz.expChoice || wiz.expFor !== key) { wiz.expChoice = '36'; wiz.expFor = key; }
  return options;
}

async function createRoll(wiz, loadedAt) {
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
      <p class="hint">Gelöscht werden alle Bilder${scans ? ` (${scans} Scans)` : ''}, Handyfotos, Notizen und der Abholschein. Das lässt sich nicht rückgängig machen.</p>
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
  const leaks = rcam?.lightLeaks && !roll.leaksMarked ? leakMap(roll, fr) : new Map();
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
    bottom = modeBtn('pickupOpen', ART.up, 'Abgeholt: Scans hochladen', '', 'to-album');
  } else {
    if (hasImgs) top = `<div class="modewrap"><a class="modebtn open-album" href="#/album/${roll.id}"><span class="mbicon">${ART.album}</span><span>Fotoalbum ansehen</span></a></div>`;
    bottom = `<label class="btn ghost wide">Weitere Scans hinzufügen<input type="file" accept="image/*" multiple hidden id="bulk"></label>`;
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
  setupReorder(body, roll, fr);
  const slide = body.querySelector('#devSlide');
  if (slide) setupSlide(slide, () => openDevModal(roll, () => route()));
  body.querySelector('#pickupOpen')?.addEventListener('click', () => openPickupModal(roll, () => route()));
  body.querySelector('.slipthumb')?.addEventListener('click', e => zoom(e.target.src));
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
    U.toast(`${n} ${n === 1 ? 'Scan' : 'Scans'} hochgeladen`);
    if (await queueLeakPick(roll)) { location.hash = '#/album/' + roll.id; return; }
    route();
  });
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
      <h2 id="lkTitle">Welche Bilder haben Lightleaks?</h2>
      <p class="hint">${U.esc(camLabel(cam) || 'Die Kamera')} hat Lightleaks. Tippe die Scans an, auf denen wirklich Licht eingefallen ist.</p>
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
      <input type="search" id="ffsQ" placeholder="Nummer oder Name, z. B. 121 oder Pol" aria-label="Filter suchen" autocomplete="off">
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
  on.addEventListener('click', () => { if (grid.classList.contains('reorder')) route(); else setMode(true); });
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
      U.haptic && U.haptic(12);
    }, 220);
    const cancelEarly = ev => { if (!drag && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > 8) clearTimeout(timer); };
    grid.addEventListener('pointermove', cancelEarly, { once: true });
  });
  document.addEventListener('pointermove', e => {
    if (!drag) return;
    e.preventDefault();
    drag.ghost.style.left = (e.clientX - drag.dx) + 'px'; drag.ghost.style.top = (e.clientY - drag.dy) + 'px';
    drag.ghost.style.visibility = 'hidden';
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('#frameGrid .cell');
    drag.ghost.style.visibility = '';
    const to = el ? cellsArr().indexOf(el) : drag.to;
    if (to !== drag.to) { drag.to = to; cellsArr().forEach((c, i) => c.classList.toggle('droptarget', i === to && to !== drag.from)); U.haptic && U.haptic(6); }
  }, { passive: false });
  const end = async () => {
    clearTimeout(timer);
    if (!drag) return;
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

function zoom(src) {
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<img src="${src}" alt=""><button class="btn small close">Schließen</button>`;
  ov.addEventListener('click', ev => { if (ev.target.classList.contains('close') || ev.target === ov) ov.remove(); });
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
    ${area('Notizen zur Entwicklung', 'dev.notes', 'Ergebnis, Auffälligkeiten …')}
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
    <div class="fld"><span>Film</span><div class="filmselrow"><span class="filmselart" id="filmArt"></span><select data-f="stockId" id="stocksel"></select></div></div>
    <label class="fld"><span>Kamera</span><select data-f="cameraId" id="camsel"></select></label>
    <label class="fld"><span>Festes Objektiv für alle Frames</span><select id="lenssel"></select></label>
    <div id="isoBox"></div>
    ${field('Eingelegt am', 'loadedAt', { type: 'date' })}
    ${field('Voll am', 'finishedAt', { type: 'date' })}
    ${area('Notizen zur Rolle', 'notes', 'Thema, Reise, Besonderheiten …', 4)}
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
  body.querySelector('#stocksel').addEventListener('change', () => setTimeout(() => { extras(); fillDiary(); }, 80));
  body.querySelector('#camsel').addEventListener('change', () => setTimeout(extras, 80));
  Promise.all([DB.all('stocks'), DB.all('cameras')]).then(([st, cams]) => {
    body.querySelector('#stocksel').innerHTML = st.sort((a, b) => U.stockLabel(a).localeCompare(U.stockLabel(b))).map(s => `<option value="${s.id}">${U.esc(U.stockLabel(s))}</option>`).join('');
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
  setHeader(frame.bonus ? 'Bonusbild' : `Bild ${frame.index} von ${regularCount}`);

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
  const filterChips = () => filterIds.map(id => filterById(myFilters, id)).filter(Boolean)
    .map(f => `<span class="ffchip">${filterArt(f, 22)}<span>${U.esc(filterShort(f))}</span></span>`).join('');

  view.innerHTML = `
  <div class="framestrip" role="slider" aria-label="Bild wählen" aria-valuemin="1" aria-valuemax="${all.length}" aria-valuenow="${all.findIndex(f => f.id === frame.id) + 1}">${all.map(f => `<i data-id="${f.id}" class="${f.id === frame.id ? 'on' : ''}${f.bonus ? ' b' : ''}${f.shot || f.imgId || f.note ? ' used' : ''}"></i>`).join('')}</div>
  <label class="framedate"><span>Aufgenommen am</span><span class="fdval" id="frameDateTxt">${frame.date ? U.fmtDate(String(frame.date).slice(0, 10)) : 'Datum wählen'}</span><input type="date" id="frameDate" value="${U.esc(String(frame.date || '').slice(0, 10))}" max="${U.today()}" aria-label="Aufnahmetag"></label>
  <div class="framefilters" id="frameFilters">${filterChips()}${isIR && iso ? `<span class="ffchip iso">ISO ${U.esc(iso)}</span>` : ''}</div>
  <div id="media"></div>
  <div class="card quick">
    ${camLenses.length ? `<div class="qlabel">Objektiv</div>
    <div class="lensrow" id="lensRow">${camLenses.map(l => `<button type="button" class="lensbtn${lensId === l.id ? ' on' : ''}" data-lens="${l.id}" aria-label="${U.esc(lensLabel(l))}" aria-pressed="${lensId === l.id}">${ART.lens(l, 54)}</button>`).join('')}</div>` : ''}
    <div class="qlabel">Filter</div>
    ${myFilters.length ? `<div class="seggroup ffuse" id="filterUse"><button type="button" class="seg${filterIds.length ? '' : ' on'}" data-use="0">Ohne Filter</button><button type="button" class="seg${filterIds.length ? ' on' : ''}" data-use="1">Mit Filter</button></div>
    <div class="ffsel" id="filterSel"${filterIds.length ? '' : ' hidden'}></div>`
      : '<p class="hint">Noch keine Filter. Lege sie im Kameraschrank unter „Filter“ an.</p>'}
    ${isIR ? `<div class="qlabel">ISO (Infrarot)</div>
    <div class="chipwrap" id="isoRow"><span class="chipset">${chipHtml(IR_ISOS, iso)}</span>
      <input class="chip-input" id="isoOther" inputmode="numeric" placeholder="andere" value="${!iso || IR_ISOS.includes(iso) ? '' : U.esc(iso)}"></div>` : ''}
    <div class="qlabel">Blende</div>
    <div class="chipwrap" id="apRow"><span class="chipset" id="apChips">${chipHtml(apList(), ap)}</span>
      <input class="chip-input" id="apOther" placeholder="andere" value="${!ap || apList().includes(ap) ? '' : U.esc(ap)}"></div>
    <div class="qlabel">Belichtungszeit</div>
    <div class="chipwrap" id="shRow"><span class="chipset">${chipHtml(shList, sh, true)}</span>
      <input class="chip-input" id="shOther" placeholder="andere" value="${!sh || shList.includes(sh) ? '' : U.esc(sh)}"></div>
    <div id="recip" class="hint"></div>
    <label class="fld"><span>Notizen</span><textarea id="note" rows="3">${U.esc(frame.note || '')}</textarea></label>
    ${!scanUrl ? phoneBoxes(frame, phoneUrl, phoneUrl2) : ''}
    <div class="frametools">
      ${cam && cam.multiExp === false ? '' : `<button class="dblbtn${frame.double ? ' on' : ''}" id="dbl" aria-pressed="${!!frame.double}" aria-label="Doppelbelichtung" title="Doppelbelichtung">${ART.double}</button>`}
      <button class="dblbtn${frame.meter ? ' on' : ''}" id="meterBtn" aria-label="Belichtungsmesser" title="Belichtungsmesser">${ART.meter}</button>
      ${frame.meter ? `<span class="meterlast"><span>Letzte Messung</span> <b>LW ${(Math.round(frame.meter.ev100 * 10) / 10).toLocaleString(I18N.locale())}</b> <span>bei ISO ${U.esc(String(frame.meter.iso || frame.meter.ei || ''))}</span></span>` : ''}
    </div>
  </div>`;

  renderMedia(view.querySelector('#media'), scanUrl, [phoneUrl, phoneUrl2].filter(Boolean), frame);
  if (cam?.lightLeaks && roll && !roll.leaksMarked) { const lv = leakMap(roll, all).get(frame.id); const md = view.querySelector('#media .media'); if (lv && md) md.classList.add('leak', 'l' + lv); }

  // Speichern; beim ersten Eintrag wird der heutige Tag als Aufnahmetag gesetzt
  let t;
  const flush = () => { clearTimeout(t); return DB.put('frames', frame); };
  const save = () => {
    if (!frame.date) { frame.date = nowLocal(); const di = view.querySelector('#frameDate'); if (di) { di.value = frame.date.slice(0, 10); view.querySelector('#frameDateTxt').textContent = U.fmtDate(di.value); } }
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
  // Aufnahmetag von Hand: zählt im Profil beim Fotozähler. Leeren entfernt den Tag.
  view.querySelector('#frameDate').addEventListener('change', e => {
    const v = e.target.value;
    frame.date = v ? v + (String(frame.date || '').slice(10) || 'T12:00') : null;
    frame.dateSet = !!v;
    view.querySelector('#frameDateTxt').textContent = v ? U.fmtDate(v) : 'Datum wählen';
    if (v && !frame.shot) frame.shot = true;
    clearTimeout(t); DB.put('frames', frame); U.haptic && U.haptic(10);
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
  const syncUse = () => {
    const use = filterIds.length > 0 || view.querySelector('#filterUse [data-use="1"]')?.classList.contains('pending');
    view.querySelectorAll('#filterUse .seg').forEach(x => x.classList.toggle('on', (x.dataset.use === '1') === use));
    const sel = view.querySelector('#filterSel'); if (sel) sel.hidden = !use;
  };
  drawSel();
  view.querySelector('#filterUse')?.addEventListener('click', e => {
    const b = e.target.closest('[data-use]'); if (!b) return;
    U.haptic && U.haptic(10);
    if (b.dataset.use === '0') { setFilters([]); syncUse(); return; }
    view.querySelectorAll('#filterUse .seg').forEach(x => x.classList.toggle('on', x === b));
    view.querySelector('#filterSel').hidden = false;
    openFrameFilterSearch(myFilters, filterIds, roll, ids => { setFilters(ids); syncUse(); }, () => syncUse());
  });
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
  view.querySelector('#note').addEventListener('input', e => { frame.note = e.target.value; save(); });
  view.querySelector('#lensRow')?.addEventListener('click', e => {
    const b = e.target.closest('[data-lens]'); if (!b) return;
    lensId = lensId === b.dataset.lens ? null : b.dataset.lens;
    frame.lensId = lensId;
    view.querySelectorAll('#lensRow .lensbtn').forEach(x => { const on = x.dataset.lens === lensId; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
    const cur = String(frame.aperture || '');
    view.querySelector('#apChips').innerHTML = chipHtml(apList(), cur);
    view.querySelector('#apOther').value = !cur || apList().includes(cur) ? '' : cur;
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
        if (!frame.date) frame.date = nowLocal();
        if (blob && !frame.phoneId) { try { frame.phoneId = (await U.storeImage(blob, 'phone')).id; } catch (_) {} }
        await flush(); U.toast('Messung geloggt'); route();
      }
    });
  });
  view.querySelector('#dbl')?.addEventListener('click', async () => {
    frame.double = !frame.double;
    if (!frame.date) frame.date = nowLocal();
    await flush(); route();
  });

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

  const upload = async (input, kind) => {
    const file = input.files[0]; if (!file) return;
    U.toast('Speichere Bild …');
    const rec = await U.storeImage(file, 'phone');
    if (kind === 'phone2') { await deleteImage(frame.phoneId2); frame.phoneId2 = rec.id; }
    else { await deleteImage(frame.phoneId); frame.phoneId = rec.id; }
    if (!frame.date) frame.date = nowLocal();
    await flush(); route();
  };
  view.querySelector('#qPhone')?.addEventListener('change', e => upload(e.target, 'phone'));
  view.querySelector('#qPhoneCam')?.addEventListener('change', e => upload(e.target, 'phone'));
  view.querySelector('#qPhoneRm')?.addEventListener('click', async () => { await deleteImage(frame.phoneId); frame.phoneId = null; await flush(); route(); });
  view.querySelector('#qPhone2')?.addEventListener('change', e => upload(e.target, 'phone2'));
  view.querySelector('#qPhoneCam2')?.addEventListener('change', e => upload(e.target, 'phone2'));
  view.querySelector('#qPhoneRm2')?.addEventListener('click', async () => { await deleteImage(frame.phoneId2); frame.phoneId2 = null; await flush(); route(); });
  view.querySelectorAll('.phonethumb').forEach(img => img.addEventListener('click', e => zoom(e.target.src)));

  // Haken unten rechts: speichern und zurück zur Bildübersicht der Rolle
  const done = document.createElement('button');
  done.className = 'donebtn'; done.setAttribute('aria-label', 'Fertig'); done.innerHTML = ART.check;
  document.body.appendChild(done);
  done.addEventListener('click', async () => { await flush(); location.hash = '#/rolle/' + frame.rollId; });

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
    if (e.target.closest('.slides, input, textarea, .cmprange, .framestrip, .lensrow, .chipwrap, .ffsel, .seggroup')) { t0 = null; return; }
    t0 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onEnd = e => {
    if (!t0) return;
    const dx = e.changedTouches[0].clientX - t0.x, dy = e.changedTouches[0].clientY - t0.y;
    t0 = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) goTo(dx < 0 ? next : prev);
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
    const date = d ? U.fmtDate(d) : '';
    return { tech: bits.join(' · '), note: f.note || f.memory || '', date, gear, spec: [gear, date].filter(Boolean).join(', ') };
  };
  return { frames, title, roll, line, fav, rolls, stocks, cams };
}

async function viewAlbum(id) {
  const d = await albumData(id);
  if (!d) { location.replace('#/'); return; }
  setHeader(d.title, { action: d.roll ? `<a class="toplink" href="#/rolle/${d.roll.id}">Rolle</a>${TRASH_BTN(d.roll.id)}` : '' });
  if (!d.frames.length) { view.innerHTML = '<div class="empty">Noch keine Bilder im Album.</div>'; return; }
  const thumbs = await Promise.all(d.frames.map(f => U.imgUrl(f.imgId, true)));
  const leakCam = !!(d.roll && d.cams.get(d.roll.cameraId)?.lightLeaks);
  view.innerHTML = `
    ${d.roll ? `<label class="rollname"><span>Name der Rolle</span><input id="rollName" maxlength="80" value="${U.esc(d.roll.title || '')}" enterkeyhint="done"></label>` : ''}
    <div class="photogrid">${d.frames.map((f, i) => `<a href="#/foto/${id}/${f.id}" aria-label="Bild ${frameLabel(f)}"><img src="${thumbs[i]}" alt="" loading="lazy">${f.leak ? '<span class="leakdot" title="Lightleak"></span>' : ''}</a>`).join('')}</div>
    <div class="modewrap"><a class="modebtn" href="#/album/${id}/buch"><span class="mbicon">${ART.album}</span><span>Fotoalbum ansehen</span></a></div>
    ${leakCam ? `<div class="modewrap"><button class="btn ghost small" id="leakEdit">${d.roll.leaksMarked ? 'Lightleaks ändern' : 'Lightleaks markieren'}</button></div>` : ''}`;
  view.querySelector('#leakEdit')?.addEventListener('click', () => openLeakPicker(d.roll, () => route()));
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

// Einzelfoto: nur ansehen. Wischen hoch/runter zeigt das Handyfoto, links/rechts blättert.
async function viewPhoto(albumId, frameId) {
  const d = await albumData(albumId);
  if (!d) { location.replace('#/'); return; }
  const i = d.frames.findIndex(f => f.id === frameId);
  if (i < 0) { location.replace('#/album/' + albumId); return; }
  const f = d.frames[i];
  setHeader('');
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
        ${text ? `<p class="phototext">${U.esc(text)}</p>` : ''}
        ${ln.spec ? `<p class="photospec">${U.esc(ln.spec)}</p>` : ''}
        ${phones.length ? '<p class="photodate">Nach oben wischen: Handyfoto</p>' : ''}
      </figcaption>
    </figure>`;
  const fig = view.querySelector('.flipper');
  let tt;
  const tIn = view.querySelector('#phTitle');
  const saveTitle = () => { clearTimeout(tt); f.title = tIn.value.trim(); return DB.put('frames', f); };
  tIn.addEventListener('input', () => { clearTimeout(tt); tt = setTimeout(saveTitle, 350); });
  tIn.addEventListener('keydown', e => { if (e.key === 'Enter') tIn.blur(); });
  tIn.addEventListener('blur', saveTitle);
  const go = async g => { if (g) { await saveTitle(); location.replace(`#/foto/${albumId}/${g.id}`); } };
  // Haken unten rechts: Titel speichern und zurück zum Raster
  const done = document.createElement('button');
  done.className = 'donebtn'; done.setAttribute('aria-label', 'Fertig, zurück zum Raster'); done.innerHTML = ART.check;
  document.body.appendChild(done);
  done.addEventListener('click', async () => { await saveTitle(); location.hash = albumId === 'alle' ? '#/alle-fotos' : '#/album/' + albumId; });
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
  const s = e => { t0 = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const en = e => {
    if (!t0) return;
    const dx = e.changedTouches[0].clientX - t0.x, dy = e.changedTouches[0].clientY - t0.y; t0 = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) (dx < 0 ? h.left : h.right)?.();
    else if (Math.abs(dy) > 40 && Math.abs(dy) > Math.abs(dx) * 1.3) (dy < 0 ? h.up : h.down)?.();
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
let ALLPHOTOS_SORT = false;
window.addEventListener('hashchange', () => { if (!location.hash.startsWith('#/alle-fotos')) ALLPHOTOS_SORT = false; });
// Reihenfolge der Scans einer Rolle per Ziehen ändern. Verschoben werden nur Scan, Lightleak-Markierung und Favorit.
function setupPhotoSort(grid) {
  const SCAN = ['imgId', 'leak', 'fav'];
  let drag = null;
  const cells = () => [...grid.querySelectorAll(':scope > a')];
  grid.addEventListener('click', e => e.preventDefault(), true);
  grid.addEventListener('dragstart', e => e.preventDefault());
  grid.querySelectorAll('a').forEach(a => a.setAttribute('draggable', 'false'));
  grid.addEventListener('pointerdown', e => {
    const a = e.target.closest('a[data-fid]'); if (!a) return;
    e.preventDefault();
    const r = a.getBoundingClientRect();
    const ghost = a.cloneNode(true); ghost.className = 'sortghost';
    Object.assign(ghost.style, { width: r.width + 'px', height: r.height + 'px', left: r.left + 'px', top: r.top + 'px' });
    document.body.appendChild(ghost); a.classList.add('dragfrom');
    drag = { a, ghost, dx: e.clientX - r.left, dy: e.clientY - r.top, from: cells().indexOf(a), to: cells().indexOf(a) };
    grid.setPointerCapture?.(e.pointerId); U.haptic && U.haptic(10);
  });
  grid.addEventListener('pointermove', e => {
    if (!drag) return;
    drag.ghost.style.left = (e.clientX - drag.dx) + 'px'; drag.ghost.style.top = (e.clientY - drag.dy) + 'px';
    drag.ghost.style.visibility = 'hidden';
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('a[data-fid]');
    drag.ghost.style.visibility = '';
    const to = el && el.parentElement === grid ? cells().indexOf(el) : drag.to;
    if (to !== drag.to) { drag.to = to; cells().forEach((c, i) => c.classList.toggle('droptarget', i === to && to !== drag.from)); U.haptic && U.haptic(6); }
  });
  const end = async () => {
    if (!drag) return;
    const { from, to, ghost, a } = drag; drag = null; ghost.remove(); a.classList.remove('dragfrom');
    cells().forEach(c => c.classList.remove('droptarget'));
    if (to === from || to < 0) return;
    const ids = cells().map(c => c.dataset.fid);
    const fr = await Promise.all(ids.map(id => DB.get('frames', id)));
    const scans = fr.map(f => Object.fromEntries(SCAN.map(k => [k, f[k]])));
    const [m] = scans.splice(from, 1); scans.splice(to, 0, m);
    for (let i = 0; i < fr.length; i++) { for (const k of SCAN) { if (scans[i][k] === undefined) delete fr[i][k]; else fr[i][k] = scans[i][k]; } await DB.put('frames', fr[i]); }
    U.haptic && U.haptic([15, 40, 15]);
    document.querySelectorAll('.donebtn').forEach(x => x.remove()); const y = window.scrollY; await viewAllPhotos(); window.scrollTo(0, y);
  };
  grid.addEventListener('pointerup', end); grid.addEventListener('pointercancel', end);
}
async function viewAllPhotos() {
  // Archivieren oben rechts in der Kopfzeile, nur in dieser Ansicht
  setHeader('Alle Fotos');
  const d = await albumData('alle');
  const sorting = ALLPHOTOS_SORT;
  const arBtn = `<div class="archcorner">${d.frames.length > 1 ? `<button type="button" class="archlink${sorting ? ' on' : ''}" id="apSort" aria-pressed="${sorting}">${MOVE_IC}<span>${sorting ? 'Fertig' : 'Reihenfolge'}</span></button>` : ''}<a class="archlink" href="#/archiv" aria-label="Archivieren: früher entwickelte Rolle nachtragen">${ARCHIVE_IC}<span>Archivieren</span></a></div>`
    + (sorting ? '<p class="hint pad sorthint">Ziehe ein Foto innerhalb seiner Rolle an die richtige Stelle. Verschoben wird nur der Scan, Einträge wie Blende oder Notiz bleiben bei ihrer Bildnummer.</p>' : '');
  if (!d.frames.length) { view.innerHTML = arBtn + '<div class="empty">Noch keine Fotos hochgeladen. Früher entwickelte Rollen trägst du oben rechts mit „Archivieren“ nach.</div>'; return; }
  const thumbs = await Promise.all(d.frames.map(f => U.imgUrl(f.imgId, true)));
  // Favoriten: Stern unten rechts am Foto, alle Favoriten zusätzlich oben in einer eigenen Reihe
  const pstar = f => `<button type="button" class="pfav${f.fav ? ' on' : ''}" data-pfav="${f.id}" aria-pressed="${!!f.fav}" aria-label="${f.fav ? 'Aus Favoriten entfernen' : 'Als Favorit markieren'}">${FAV_IC}</button>`;
  const favs = d.frames.map((f, i) => [f, i]).filter(([f]) => f.fav);
  let html = favs.length ? `<div class="rollsep favsep">★ Favoriten · ${favs.length}</div><div class="photogrid favgrid">${favs.map(([f, i]) => `<a href="#/foto/alle/${f.id}" aria-label="Favorit, Bild ${frameLabel(f)}"><img src="${thumbs[i]}" alt="" loading="lazy">${pstar(f)}</a>`).join('')}</div>` : '';
  let cur = null;
  d.frames.forEach((f, i) => {
    if (f.rollId !== cur) {
      if (cur !== null) html += '</div>';
      cur = f.rollId;
      const r = d.rolls.get(cur);
      const st = d.stocks.get(r?.stockId), cam = d.cams.get(r?.cameraId);
      html += `<div class="rollsep">${[r?.title, U.stockLabel(st), camLabel(cam)].filter(Boolean).map(U.esc).join(' · ')}</div><div class="photogrid${sorting ? ' sorting' : ''}" data-roll="${cur}">`;
    }
    html += `<a href="#/foto/alle/${f.id}" data-fid="${f.id}" aria-label="Bild ${frameLabel(f)}"><img src="${thumbs[i]}" alt="" loading="lazy" draggable="false">${sorting ? `<span class="sortnum">${frameLabel(f)}</span>` : pstar(f)}</a>`;
  });
  view.innerHTML = arBtn + html + '</div>';
  view.querySelector('#apSort')?.addEventListener('click', async () => {
    ALLPHOTOS_SORT = !ALLPHOTOS_SORT; U.haptic && U.haptic(10);
    document.querySelectorAll('.donebtn').forEach(x => x.remove()); const y = window.scrollY; await viewAllPhotos(); window.scrollTo(0, y);
  });
  if (sorting) view.querySelectorAll('.photogrid.sorting').forEach(g => setupPhotoSort(g));
  view.querySelectorAll('[data-pfav]').forEach(b => b.addEventListener('click', async e => {
    e.preventDefault(); e.stopPropagation();
    const f = await DB.get('frames', b.dataset.pfav); if (!f) return;
    f.fav = !f.fav; await DB.put('frames', f);
    U.haptic && U.haptic(f.fav ? [12, 40, 12] : 10);
    const y = window.scrollY; document.querySelectorAll('.donebtn').forEach(x => x.remove()); await viewAllPhotos(); window.scrollTo(0, y);
  }));
  // Pfeil unten rechts: zurück zum Profil
  const back = document.createElement('button');
  back.className = 'donebtn'; back.setAttribute('aria-label', 'Zurück zum Profil');
  back.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M19 12H6M11.5 6 5.5 12l6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  document.body.appendChild(back);
  back.addEventListener('click', () => { location.hash = '#/profil'; });
}

/* ---------- Archivieren: früher entwickelte Rollen nachtragen, ohne Einlegen und Entwickeln ----------
   Die Rolle entsteht direkt im Fotoalbum (Status „entwickelt“, archived: true). Die Scans füllen Bild 1, 2, 3 … nach Dateinamen.
   Beschriften und Einstellungen gehen danach wie gewohnt in der Rolle. Alles außer den Fotos ist freiwillig. */
const ARCHIVE_IC = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h16v9.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M4 10 2.5 6.5 9 5l3 5M20 10l1.5-3.5L15 5l-3 5"/><path d="M9.5 14h5"/></svg>';
async function viewArchive() {
  setHeader('Archivieren');
  const cams = gearSort(await DB.all('cameras'), camSortFb);
  const labs = await getLabs();
  const ed = { files: [], dev: null, camId: undefined, stockId: null, format: '135' };
  const camCards = await Promise.all(cams.map(async c => `<button type="button" class="pick cam" data-cam="${c.id}"><span class="pickart">${await camArt(c, 84)}</span><span class="pickname">${U.esc(camLabel(c))}</span></button>`));
  const today = U.today();
  view.innerHTML = `
    <p class="hint pad">Für Rollen, die du schon früher entwickelt hast. Pflicht sind nur die Fotos. Beschriften kannst du die Bilder danach in der Rolle.</p>
    <section class="wizsec">
      <h2 class="wiztitle">1 · Fotos</h2>
      <label class="btn accent archup">${ARCHIVE_IC}<span id="arUpTxt">Fotos auswählen</span><input type="file" accept="image/*" multiple hidden id="arFiles"></label>
      <p class="hint">Die Reihenfolge folgt den Dateinamen. Ändern kannst du sie danach in „Alle Fotos“.</p>
    </section>
    <section class="wizsec">
      <h2 class="wiztitle">2 · Fotografiert ungefähr</h2>
      <div class="two">
        <label class="fld"><span>Von</span><input type="date" id="arFrom" max="${today}"></label>
        <label class="fld"><span>Bis</span><input type="date" id="arTo" max="${today}"></label>
      </div>
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
      <div class="fld"><span>Film</span><button type="button" class="btn ghost small" id="arStock">Film wählen</button></div>
      <div class="seggroup" id="arFmt">${[['135', 'Kleinbild'], ['120', 'Mittelformat'], ['half', 'Halbformat'], ['sonst', 'Sonstiges']].map(([k, l]) => `<button type="button" class="seg${k === ed.format ? ' on' : ''}" data-f="${k}">${l}</button>`).join('')}</div>
      <label class="fld"><span>Name der Rolle</span><input id="arTitle" maxlength="80" placeholder="z. B. Sommer an der Ostsee"></label>
    </section>`;
  const $ = id => view.querySelector('#' + id);
  // Unten rechts: Archivieren (statt eines Zurück-Pfeils, der wie ein Haken wirkt)
  const save = document.createElement('button');
  save.className = 'donebtn archsave'; save.setAttribute('aria-label', 'Rolle archivieren'); save.innerHTML = ARCHIVE_IC; save.disabled = true;
  document.body.appendChild(save);
  $('arFiles').addEventListener('change', e => {
    ed.files = [...e.target.files];
    $('arUpTxt').textContent = ed.files.length ? `${ed.files.length} ${ed.files.length === 1 ? 'Foto' : 'Fotos'} ausgewählt` : 'Fotos auswählen';
    save.disabled = !ed.files.length; save.classList.toggle('ready', !!ed.files.length);
  });
  $('arFrom').addEventListener('change', () => { if (!$('arTo').value || $('arTo').value < $('arFrom').value) $('arTo').value = $('arFrom').value; $('arTo').min = $('arFrom').value; });
  $('arDevOpts').addEventListener('click', e => {
    const b = e.target.closest('[data-o]'); if (!b) return;
    ed.dev = b.dataset.o; view.querySelectorAll('#arDevOpts button').forEach(x => x.classList.toggle('on', x === b)); U.haptic && U.haptic(8);
  });
  $('arCams').addEventListener('click', e => {
    const b = e.target.closest('[data-cam]'); if (!b) return;
    ed.camId = b.dataset.cam; view.querySelectorAll('#arCams .pick').forEach(x => x.classList.toggle('on', x === b)); U.haptic && U.haptic(8);
  });
  $('arStock').addEventListener('click', () => openStockPicker(async id => {
    ed.stockId = id; const st = await DB.get('stocks', id);
    $('arStock').innerHTML = `${await filmArt(st, 26)}<span>${U.esc(U.stockLabel(st))}</span>`;
    if (st?.formats?.length && !st.formats.includes(ed.format)) { ed.format = st.formats[0] === '120' ? '120' : '135'; view.querySelectorAll('#arFmt .seg').forEach(x => x.classList.toggle('on', x.dataset.f === ed.format)); }
  }));
  $('arFmt').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (!b) return; ed.format = b.dataset.f; view.querySelectorAll('#arFmt .seg').forEach(x => x.classList.toggle('on', x === b)); });
  save.addEventListener('click', async () => {
    if (!ed.files.length) { U.toast('Wähle zuerst die Fotos aus'); return; }
    const from = $('arFrom').value || null, to = $('arTo').value || from, dev = $('arDev').value || null;
    const cam = cams.find(c => c.id === ed.camId), lab = labs.find(l => l.id === ed.dev);
    if (!ed.stockId) {
      ed.stockId = 'film-unbekannt';
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
// Favoriten im Kameraschrank: Stern in der Ecke des Bildes, Favoriten stehen oben in ihrer Liste
const FAV_IC = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M12 3.2l2.6 5.5 6 .8-4.4 4.1 1.1 5.9L12 16.6l-5.3 2.9 1.1-5.9L3.4 9.5l6-.8z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
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
        <span class="frowchips">${c.mount ? `<span>${U.esc(c.mount)}</span>` : ''}${c.broken ? '<span class="brokentag">kaputt</span>' : ''}${lk && lk.since ? `<span class="leaktag">${lk.n} ${lk.n === 1 ? 'Lightleak' : 'Lightleaks'}</span>` : ''}</span>
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
        <span class="frowchips"><span>${U.esc(l.mount || 'Bajonett offen')}</span>${l.filterThread ? `<span class="threadtag">⌀ ${U.esc(String(l.filterThread).replace('.', ','))} mm</span>` : ''}${names.map(n => `<span>${U.esc(n)}</span>`).join('')}</span>
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
  view.innerHTML = `<div class="cabnav">${CAB_PARTS.map(([key, label]) => `<a class="seg${key === k ? ' on' : ''}" href="#/schrank/${key}">${label}</a>`).join('')}</div>` + await cabinetHtml(false, k);
  setupFolds(view);
  setupCabinet(view);
  const back = document.createElement('button');
  back.className = 'donebtn'; back.setAttribute('aria-label', 'Zurück zum Profil');
  back.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M19 12H6M11.5 6 5.5 12l6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  document.body.appendChild(back);
  back.addEventListener('click', () => { location.hash = '#/profil'; });
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
  const HOLD = 380;
  let timer = null, row = null, rows = [], rects = [], startY = 0, startX = 0, from = 0, to = 0, step = 0, active = false, suppress = false;
  const reset = () => { clearTimeout(timer); timer = null; };
  list.addEventListener('dragstart', e => e.preventDefault());
  list.addEventListener('contextmenu', e => { if (timer || active || suppress) e.preventDefault(); });
  list.addEventListener('click', e => { if (suppress) { e.preventDefault(); e.stopPropagation(); } }, true);
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
    }, HOLD);
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
        ${field('Filtergewinde ⌀ (mm)', 'filterThread', { attrs: 'inputmode="decimal" placeholder="z. B. 52"' })}
      </div>
      ${field('Hersteller', 'maker')}
      ${field('Bezeichnung', 'name')}
      <label class="fld"><span>Bajonett</span><select data-f="mount"><option value="">Bitte wählen</option>${MOUNTS.map(m => `<option>${U.esc(m)}</option>`).join('')}</select></label>
      <div class="qlabel">Passt an</div>
      <div class="camchecks" id="camChecks">${cams.map(c => `<label class="camcheck${lens.mount && c.mount && c.mount !== lens.mount ? ' other' : ''}"><input type="checkbox" value="${c.id}" ${lens.cameraIds.includes(c.id) ? 'checked' : ''}><span>${U.esc(camLabel(c))}<br><span class="sub2">${U.esc(c.mount || 'Bajonett offen')}</span></span></label>`).join('')}</div>
      <label class="check"><input type="checkbox" data-f="inactive"> Objektiv ist inaktiv</label>
      <p class="hint" style="margin:-4px 0 10px">Inaktive Objektive stehen im Schrank unter „Inaktiv“ und erscheinen nicht mehr in der Bildansicht.</p>
      ${area('Notizen', 'notes', 'Eigenheiten, Filtergewinde, Macken …')}
    </div>
    ${used || FRESH_ID === lens.id ? '' : '<button class="btn danger wide" id="delLens">Objektiv löschen</button>'}`;
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
    view.querySelector('#delLens')?.addEventListener('click', async () => { await DB.del('lenses', lens.id); location.replace('#/schrank/objektive'); });
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
    ${select('Format', 'format', [['135', 'Kleinbild (135)'], ['120', 'Mittelformat (120)']])}
    <label class="fld"><span>Bajonett</span><select data-f="mount">${MOUNTS.map(m => `<option>${U.esc(m)}</option>`).join('')}</select></label>
    <div class="two">
      ${select('Kürzeste Zeit', 'shutterFast', [['', 'keine Angabe'], ...SPEEDS.map(v => [v, v + (/^\d+$/.test(v) ? ' s' : ' s')])])}
      ${select('Längste Zeit', 'shutterSlow', [['', 'keine Angabe'], ...SPEEDS.map(v => [v, v + ' s'])])}
    </div>
    <div class="row gap" style="padding:0">
      <label class="check"><input type="checkbox" data-f="shutterB"> B</label>
      <label class="check"><input type="checkbox" data-f="shutterT"> T</label>
      <label class="check"><input type="checkbox" data-f="shutterAuto"> Zeitautomatik</label>
    </div>
    <label class="check"><input type="checkbox" data-f="isoDial"> ISO-Einstellung an der Kamera</label>
    <label class="check"><input type="checkbox" data-f="multiExp"> Doppelbelichtung möglich</label>
    <label class="check"><input type="checkbox" data-f="lightLeaks"> Kamera hat Lightleaks</label>
    ${cam.lightLeaks ? `<p class="leakstat">${U.esc(leakSentence(await leakStats(cam.id)))}</p>` : ''}
    <label class="check"><input type="checkbox" data-f="inactive"> Kamera ist inaktiv</label>
    <label class="check"><input type="checkbox" data-f="broken"> Kamera ist kaputt</label>
    <div id="brokenBox">${area('Was ist kaputt?', 'brokenNotes', '', 3)}<p class="hint">Kaputte Kameras erscheinen nicht bei „Film einlegen“.</p></div>
    <div id="mfBox">
      ${field('Bilder pro 120er-Rolle', 'frames', { num: true })}
      ${field('Bildformat', 'frameSize')}
    </div>
    ${select('Illustration', 'art.kind', [['slr', 'Spiegelreflex'], ['mf', 'Mittelformat-Würfel'], ['compact', 'Kompaktkamera']])}
    ${select('Farbe Spiegelreflex', 'art.body', [['black', 'Schwarz'], ['chrome', 'Chrom']])}
    ${area('Notizen', 'notes', 'Eigenheiten, Batterie, Macken …')}
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
  view.querySelector('#cf').addEventListener('input', () => setTimeout(sync, 400));
  sync();
  view.querySelector('#camPhoto').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    const rec = await U.storeImage(f, 'camera');
    await deleteImage(cam.photoId); cam.photoId = rec.id; await DB.put('cameras', cam); route();
  });
  view.querySelector('#camPhotoRm')?.addEventListener('click', async () => { await deleteImage(cam.photoId); cam.photoId = null; await DB.put('cameras', cam); route(); });
  view.querySelector('#delCam')?.addEventListener('click', async () => { await DB.del('cameras', cam.id); location.replace('#/schrank/kameras'); });
}
