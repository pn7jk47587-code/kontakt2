/* Rollen: Assistent, Übersicht, Bildansicht, Entwicklung, Favoriten, Album, Kameras */

const APERTURES = ['1.4', '2', '2.8', '4', '5.6', '8', '11', '16', '22'];
// Zeiten von der kürzesten zur längsten. Ohne Kameradaten gilt die volle Reihe.
const SPEEDS = ['1/4000', '1/2000', '1/1000', '1/500', '1/250', '1/125', '1/60', '1/30', '1/15', '1/8', '1/4', '1/2', '1', '2', '4', '8', '15', '30'];
const SHUTTERS = ['1/2000', '1/1000', '1/500', '1/250', '1/125', '1/60', '1/30', '1/15', '1/8', '1/4', '1/2', '1', '2', '4', '8', 'B', 'Auto'];
const STOPS = ['1', '1.4', '2', '2.8', '4', '5.6', '8', '11', '16', '22', '32', '45', '64'];
const num = v => parseFloat(String(v ?? '').replace(',', '.'));
// Blendenreihe eines Objektivs: Lichtstärke, dann volle Stufen bis zur kleinsten Blende (ohne Angabe bis 22)
function lensApertures(l) {
  const mx = num(l?.maxAp), mn = num(l?.minAp) || 22;
  if (!(mx > 0)) return APERTURES;
  return [String(mx), ...STOPS.filter(x => parseFloat(x) > mx + 0.05 && parseFloat(x) <= mn + 0.05)];
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
  const [rolls, stocks, cams] = [await DB.all('rolls'), await stocksMap(), await DB.all('cameras')];
  const hero = await profileHero();
  const camMap = new Map(cams.map(c => [c.id, c]));
  const allFrames = await DB.all('frames');
  rolls.sort((a, b) => (b.loadedAt || b.createdAt || '').localeCompare(a.loadedAt || a.createdAt || ''));
  let html = hero + `<a class="btn glass newroll" href="#/rolle/neu">Film einlegen</a>`;
  const order = [['entwurf', 'Film in der Kamera'], ['belichtet', 'In Entwicklung'], ['entwickelt', 'Fotoalbum']];
  for (const [g, label] of order) {
    const list = rolls.filter(r => (r.status || 'entwurf') === g);
    if (!list.length) continue;
    html += `<h2 class="sec sec-${g}"><i></i>${label}</h2><div class="rolls">`;
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
      html += `<div class="rollcard st-${g}">
        <a class="rc-link" href="#/${g === 'entwickelt' ? 'album' : 'rolle'}/${r.id}">
          <div class="strip">${thumbs.length ? thumbs.map(u => `<img src="${u}" alt="">`).join('') : `<div class="strip-art">${await filmArt(st, 58)}${cam ? await camArt(cam, 70) : ''}</div>`}</div>
          <div class="rc-body">
            <div class="rc-title">${U.esc(r.title || U.stockLabel(st))}</div>
            <div class="rc-sub">${U.esc(camLabel(cam) || r.camera || '')}${r.loadedAt ? ' · ' + U.fmtDate(r.loadedAt) : ''}</div>
            ${devInfo}
          </div>
        </a>${act}</div>`;
    }
    html += `</div>`;
  }
  view.innerHTML = html;
  view.querySelectorAll('[data-dev]').forEach(b => b.addEventListener('click', () => openDevModal(rolls.find(r => r.id === b.dataset.dev), () => route())));
  view.querySelectorAll('[data-pickup]').forEach(b => b.addEventListener('click', () => openPickupModal(rolls.find(r => r.id === b.dataset.pickup), () => route())));
  setupLongPress(view, { rolls, stocks, camMap, allFrames });
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
  const cams = (await DB.all('cameras')).sort((a, b) => camLabel(a).localeCompare(camLabel(b)));
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
        <span class="fridgeicon" aria-label="Filmkühlschrank" role="img">${SNOW}</span>
        <div class="fcbody">
          ${fridge.length ? `<input type="search" placeholder=" " id="qFridge" aria-label="Filme im Kühlschrank durchsuchen" autocomplete="off">
          <div class="flist" id="fridgeList">${rows.join('')}</div>
          <p class="hint" id="fridgeNone" hidden>Kein passender Film im Kühlschrank für dieses Format.</p>` : '<p class="hint">Dein Filmkühlschrank ist leer.</p>'}
        </div>
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
      none.hidden = any;
      none.textContent = q && forFmt ? 'Ups, der Film liegt noch nicht im Kühlschrank.' : 'Dein Filmkühlschrank ist leer.';
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

const TRASH_BTN = id => `<button class="trashbtn" data-delroll="${id}" aria-label="Rolle löschen" title="Rolle löschen"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4.5 7h15M9.5 7V4.8h5V7M6.5 7l1 12.2h9L17.5 7M10.3 10.5v5.7M13.7 10.5v5.7" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;

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
  setHeader(roll.title || U.stockLabel(stock), { action: TRASH_BTN(roll.id) });
  // In der Kamera gibt es noch nichts zu entwickeln: nur Bilder und Rolle. Ab „In Entwicklung“ alle Reiter.
  const inCam = (roll.status || 'entwurf') === 'entwurf';
  const tabs = inCam ? [['bilder', 'Bilder'], ['info', 'Rolle']] : [['bilder', 'Bilder'], ['entwicklung', 'Entwicklung'], ['info', 'Rolle']];
  if (inCam && tab === 'entwicklung') tab = 'bilder';
  view.innerHTML = `
    <div class="rollhead">
      <div class="rh-art">${await filmArt(stock, 52)}${cam ? await camArt(cam, 66) : ''}</div>
      <div class="rh-txt"><b>${U.esc(U.stockLabel(stock))}</b><br><span class="sub2">EI ${U.esc(roll.ei || stock?.boxIso || '?')}${camLabel(cam) || roll.camera ? ' · ' + U.esc(camLabel(cam) || roll.camera) : ''}</span>
        <br><span class="stagebadge st-${roll.status || 'entwurf'}">${STATUS[roll.status || 'entwurf'].label}</span></div>
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
  const flags = [f.double ? ART.double : '', f.phoneId && u ? '<span>▣</span>' : ''].join('');
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
  const leaks = rcam?.lightLeaks ? leakMap(roll, fr) : new Map();
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
    <div class="grid">${cells.join('')}</div>
    ${bottom}`;
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
    route();
  });
}

// Schieberegler: Knopf von links nach rechts ziehen, um die Aktion auszulösen
function setupSlide(el, onDone) {
  const knob = el.querySelector('.slideknob');
  let x0 = null, max = 0, pos = 0;
  const set = (p, anim) => { pos = p; knob.style.transition = anim ? 'transform .25s ease' : 'none'; knob.style.transform = `translateX(${p}px)`; el.style.setProperty('--p', max ? p / max : 0); };
  knob.addEventListener('pointerdown', e => {
    x0 = e.clientX - pos; max = el.clientWidth - knob.offsetWidth - 8;
    knob.setPointerCapture(e.pointerId); el.classList.add('drag');
  });
  knob.addEventListener('pointermove', e => { if (x0 === null) return; set(Math.max(0, Math.min(max, e.clientX - x0))); });
  const end = () => {
    if (x0 === null) return;
    x0 = null; el.classList.remove('drag');
    if (pos >= max * 0.85) { set(max, true); U.haptic(); setTimeout(() => { onDone(); set(0, true); }, 220); }
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
    const all = await DB.all('lenses');
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
    body.querySelector('#camsel').innerHTML = '<option value="">ohne Angabe</option>' + cams.map(c => `<option value="${c.id}">${U.esc(camLabel(c))}</option>`).join('');
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
  const camLenses = roll?.cameraId ? (await DB.all('lenses')).filter(l => (l.cameraIds || []).includes(roll.cameraId)).sort((a, b) => parseFloat(a.focal) - parseFloat(b.focal)) : [];
  const ap = String(frame.aperture || '').replace(/^f\//, '');
  const sh = String(frame.shutter || '');
  const cam = roll?.cameraId ? await DB.get('cameras', roll.cameraId) : null;
  // Objektiv zuerst: zuletzt benutztes Objektiv der Rolle oder das einzige der Kamera ist vorausgewählt
  let lensId = frame.lensId || (roll?.fixedLensId && camLenses.some(l => l.id === roll.fixedLensId) ? roll.fixedLensId : null) || (camLenses.length === 1 ? camLenses[0].id : camLenses.some(l => l.id === roll?.lastLensId) ? roll.lastLensId : null);
  const curLens = () => camLenses.find(l => l.id === lensId);
  const apList = () => cam?.auto && !camLenses.length ? ['Auto'] : lensApertures(curLens());
  const shList = camShutters(cam);

  view.innerHTML = `
  <div class="framestrip" role="slider" aria-label="Bild wählen" aria-valuemin="1" aria-valuemax="${all.length}" aria-valuenow="${all.findIndex(f => f.id === frame.id) + 1}">${all.map(f => `<i data-id="${f.id}" class="${f.id === frame.id ? 'on' : ''}${f.bonus ? ' b' : ''}${f.shot || f.imgId || f.note ? ' used' : ''}"></i>`).join('')}</div>
  <div id="media"></div>
  <div class="card quick">
    ${camLenses.length ? `<div class="qlabel">Objektiv</div>
    <div class="lensrow" id="lensRow">${camLenses.map(l => `<button type="button" class="lensbtn${lensId === l.id ? ' on' : ''}" data-lens="${l.id}" aria-label="${U.esc(lensLabel(l))}" aria-pressed="${lensId === l.id}">${ART.lens(l, 54)}</button>`).join('')}</div>` : ''}
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
    </div>
  </div>`;

  renderMedia(view.querySelector('#media'), scanUrl, [phoneUrl, phoneUrl2].filter(Boolean), frame);
  if (cam?.lightLeaks && roll) { const lv = leakMap(roll, all).get(frame.id); const md = view.querySelector('#media .media'); if (lv && md) md.classList.add('leak', 'l' + lv); }

  // Speichern; beim ersten Eintrag wird der heutige Tag als Aufnahmetag gesetzt
  let t;
  const flush = () => { clearTimeout(t); return DB.put('frames', frame); };
  const save = () => {
    if (!frame.date) frame.date = nowLocal();
    if (!frame.lensId && lensId) frame.lensId = lensId;
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
    if (e.target.closest('.slides, input, textarea, .cmprange, .framestrip')) { t0 = null; return; }
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
    const bits = [l?.focal ? `${l.focal} mm` : '', f.aperture ? `f/${String(f.aperture).replace(/^f\//, '').replace('.', ',')}` : '', f.shutter ? (/^\d+$/.test(f.shutter) ? `${f.shutter} s` : f.shutter) : ''].filter(Boolean);
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
  view.innerHTML = `
    ${d.roll ? `<label class="rollname"><span>Name der Rolle</span><input id="rollName" maxlength="80" value="${U.esc(d.roll.title || '')}" enterkeyhint="done"></label>` : ''}
    <div class="photogrid">${d.frames.map((f, i) => `<a href="#/foto/${id}/${f.id}" aria-label="Bild ${frameLabel(f)}"><img src="${thumbs[i]}" alt="" loading="lazy"></a>`).join('')}</div>
    <div class="modewrap"><a class="modebtn" href="#/album/${id}/buch"><span class="mbicon">${ART.album}</span><span>Fotoalbum ansehen</span></a></div>`;
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
async function viewAllPhotos() {
  setHeader('Alle Fotos');
  const d = await albumData('alle');
  if (!d.frames.length) { view.innerHTML = '<div class="empty">Noch keine Fotos hochgeladen.</div>'; return; }
  const thumbs = await Promise.all(d.frames.map(f => U.imgUrl(f.imgId, true)));
  let html = '', cur = null;
  d.frames.forEach((f, i) => {
    if (f.rollId !== cur) {
      if (cur !== null) html += '</div>';
      cur = f.rollId;
      const r = d.rolls.get(cur);
      const st = d.stocks.get(r?.stockId), cam = d.cams.get(r?.cameraId);
      html += `<div class="rollsep">${[r?.title, U.stockLabel(st), camLabel(cam)].filter(Boolean).map(U.esc).join(' · ')}</div><div class="photogrid">`;
    }
    html += `<a href="#/foto/alle/${f.id}" aria-label="Bild ${frameLabel(f)}"><img src="${thumbs[i]}" alt="" loading="lazy"></a>`;
  });
  view.innerHTML = html + '</div>';
  // Pfeil unten rechts: zurück zum Profil
  const back = document.createElement('button');
  back.className = 'donebtn'; back.setAttribute('aria-label', 'Zurück zum Profil');
  back.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M19 12H6M11.5 6 5.5 12l6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  document.body.appendChild(back);
  back.addEventListener('click', () => { location.hash = '#/profil'; });
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
function foldOpen(key) { try { return localStorage.getItem('kb-fold-' + key) === '1'; } catch (_) { return false; } }
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

async function cabinetHtml(fold = false) {
  const cams = (await DB.all('cameras')).sort((a, b) => camLabel(a).localeCompare(camLabel(b)));
  const lenses = (await DB.all('lenses')).sort((a, b) => (a.mount || '').localeCompare(b.mount || '') || parseFloat(a.focal) - parseFloat(b.focal));
  let fresh = null;
  try { fresh = sessionStorage.getItem('kb-newgear'); sessionStorage.removeItem('kb-newgear'); } catch (_) {}
  const camRows = await Promise.all(cams.map(async c => {
    const own = lenses.filter(l => (l.cameraIds || []).includes(c.id));
    return `<a class="crow${fresh === c.id ? ' fresh' : ''}" href="#/kamera/${c.id}">
      <span class="crowart">${await camArt(c, 76)}</span>
      <span class="frowmain">
        <span class="frowname">${U.esc(camLabel(c))}</span>
        ${c.mount ? `<span class="frowchips"><span>${U.esc(c.mount)}</span></span>` : ''}
        ${own.length ? `<span class="minilenses">${own.map(l => ART.lens(l, 34)).join('')}</span>` : ''}
      </span>
      <span class="chev">›</span>
    </a>`;
  }));
  const lensRows = lenses.map(l => {
    const names = (l.cameraIds || []).map(id => cams.find(c => c.id === id)).filter(Boolean).map(camLabel);
    return `<a class="crow${fresh === l.id ? ' fresh' : ''}" href="#/objektiv/${l.id}">
      <span class="crowart lensart">${ART.lens(l, 60)}</span>
      <span class="frowmain">
        <span class="frowname">${U.esc(lensLabel(l))}</span>
        <span class="frowchips"><span>${U.esc(l.mount || 'Bajonett offen')}</span>${names.map(n => `<span>${U.esc(n)}</span>`).join('')}</span>
      </span>
      <span class="chev">›</span>
    </a>`;
  });
  return `
    <section class="cabinet${fold ? ' fold' : ''}${fold && (fresh || foldOpen('cabinet')) ? ' open' : ''}" data-fold="cabinet">
      <div class="fridgetop foldhead">
        <span class="fridgeicon cabicon">${ART.cabinet}</span>
        <div><h2>Kameraschrank</h2><span class="sub2">${cams.length} ${cams.length === 1 ? 'Kamera' : 'Kameras'} · ${lenses.length} ${lenses.length === 1 ? 'Objektiv' : 'Objektive'}</span></div>
        ${fold ? '<span class="foldchev" aria-hidden="true"></span>' : ''}
      </div>
      <div class="foldbody">
      <div class="cabhead"><h3>Kameras</h3><button class="fridgeplus" data-add="kamera" aria-label="Kamera hinzufügen">+</button></div>
      <div class="flist">${camRows.join('')}</div>
      <div class="cabhead"><h3>Objektive</h3><button class="fridgeplus" data-add="objektiv" aria-label="Objektiv hinzufügen">+</button></div>
      <div class="flist">${lensRows.length ? lensRows.join('') : '<p class="hint">Noch keine Objektive.</p>'}</div>
      </div>
    </section>`;
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
}
async function viewCameras() {
  setHeader('Kameraschrank');
  view.innerHTML = await cabinetHtml();
  setupCabinet(view);
}

async function viewLens(id) {
  const cams = (await DB.all('cameras')).sort((a, b) => camLabel(a).localeCompare(camLabel(b)));
  if (id === 'neu') {
    const l = { id: U.uid(), maker: '', focal: '50', kind: 'normal', mount: 'Nikon F', cameraIds: [] };
    l.cameraIds = cams.filter(c => c.mount === l.mount).map(c => c.id);
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
      </div>
      ${field('Hersteller', 'maker')}
      ${field('Bezeichnung', 'name')}
      <label class="fld"><span>Bajonett</span><select data-f="mount">${MOUNTS.map(m => `<option>${U.esc(m)}</option>`).join('')}</select></label>
      <div class="qlabel">Passt an</div>
      <div class="camchecks" id="camChecks">${cams.map(c => `<label class="camcheck${c.mount && c.mount !== lens.mount ? ' other' : ''}"><input type="checkbox" value="${c.id}" ${lens.cameraIds.includes(c.id) ? 'checked' : ''}><span>${U.esc(camLabel(c))}<br><span class="sub2">${U.esc(c.mount || 'Bajonett offen')}</span></span></label>`).join('')}</div>
      ${area('Notizen', 'notes', 'Eigenheiten, Filtergewinde, Macken …')}
    </div>
    ${used || FRESH_ID === lens.id ? '' : '<button class="btn danger wide" id="delLens">Objektiv löschen</button>'}`;
    bind(view.querySelector('#lf'), lens, 'lenses', () => {
      view.querySelector('.lensstage').innerHTML = ART.lens(lens, 150);
      setHeader(lensLabel(lens) || 'Objektiv', {});
      view.querySelectorAll('.camcheck').forEach(el => {
        const c = cams.find(x => x.id === el.querySelector('input').value);
        el.classList.toggle('other', !!(c.mount && c.mount !== lens.mount));
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
    view.querySelector('#delLens')?.addEventListener('click', async () => { await DB.del('lenses', lens.id); location.replace('#/kameras'); });
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
  const camLenses = (await DB.all('lenses')).filter(l => (l.cameraIds || []).includes(id)).sort((a, b) => parseFloat(a.focal) - parseFloat(b.focal));
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
  view.querySelector('#delCam')?.addEventListener('click', async () => { await DB.del('cameras', cam.id); location.replace('#/kameras'); });
}
