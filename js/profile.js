/* Profil, Willkommen, Filmkühlschrank und Menü */

let PROFILE = null;

function genitive(name) {
  const n = String(name || '').trim();
  if (!n) return 'Meine';
  return /(s|ß|x|z|ce)$/i.test(n) ? n + '’' : n + 's';
}

// Der Nutzername steht immer mit @ davor. Gespeichert wird er ohne @.
const atName = n => '@' + String(n || '').replace(/^@+/, '');
function stripAt(inp) { if (/^@/.test(inp.value)) { const p = inp.selectionStart; inp.value = inp.value.replace(/^@+/, ''); try { inp.setSelectionRange(Math.max(0, p - 1), Math.max(0, p - 1)); } catch (_) {} } }

function initials(name) {
  return String(name || '?').replace(/^@+/, '').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';
}

// Rundes Nutzerbild. Ohne eigenes Bild: Initialen auf einem Prisma-Verlauf.
async function avatarHtml(size = 96, profile = PROFILE) {
  if (profile?.avatarId) {
    const u = await U.imgUrl(profile.avatarId, true);
    if (u) return `<img class="avimg" src="${u}" alt="" style="width:${size}px;height:${size}px">`;
  }
  const id = 'av' + Math.random().toString(36).slice(2, 7);
  return `<svg class="avimg" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffd6a5"/><stop offset=".35" stop-color="#ffb8d0"/><stop offset=".65" stop-color="#cdb8ff"/><stop offset="1" stop-color="#a8e6ff"/></linearGradient></defs>
    <circle cx="50" cy="50" r="50" fill="url(#${id})"/>
    <circle cx="34" cy="28" r="14" fill="#fff" opacity=".35"/>
    <text x="50" y="61" text-anchor="middle" font-family="ui-rounded, 'SF Pro Rounded', system-ui, sans-serif" font-size="34" font-weight="700" fill="#3a3550">${U.esc(initials(profile?.name))}</text>
  </svg>`;
}

async function profileHero() {
  return `<a class="profilehead homehead" href="#/profil" aria-label="Profil">
    <span class="heroav big">${await avatarHtml(120)}</span>
    <span class="pname">${U.esc(atName(PROFILE?.name))}</span>
  </a>`;
}

/* ---------- Willkommen ---------- */
async function viewWelcome() {
  setHeader('', {});
  let avatarFile = null;
  view.innerHTML = `
    <div class="welcome">
      <div class="brand"><img src="icon-192.png" alt="" width="88" height="88">${WORDMARK}</div>
      <label class="welcomeav" aria-label="Profilbild wählen"><span id="wAv">${await avatarHtml(132, { name: '' })}</span><span class="avedit">Bild wählen</span><input type="file" accept="image/*" hidden id="wPic"></label>
      <div class="langpick" id="wLang">${['de', 'en'].map(l => `<button type="button" data-lang="${l}" class="${I18N.get() === l ? 'on' : ''}">${l.toUpperCase()}</button>`).join('')}</div>
      <h1 class="welcometitle">Willkommen</h1>
      <label class="atname"><span class="at" aria-hidden="true">@</span><input id="wName" autocomplete="nickname" maxlength="40" aria-label="Dein Nutzername" autocapitalize="none" spellcheck="false"></label>
      <button class="btn wide accent" id="wGo" disabled>Los geht’s</button>
    </div>`;
  const nameIn = view.querySelector('#wName');
  view.querySelector('#wLang').addEventListener('click', e => {
    const b = e.target.closest('[data-lang]'); if (!b || b.dataset.lang === I18N.get()) return;
    try { sessionStorage.setItem('kb-welcome-name', nameIn.value); } catch (_) {}
    I18N.set(b.dataset.lang);
  });
  try { const keep = sessionStorage.getItem('kb-welcome-name'); if (keep) { nameIn.value = keep; view.querySelector('#wGo').disabled = !keep.trim(); sessionStorage.removeItem('kb-welcome-name'); } } catch (_) {}
  const refreshAv = async () => {
    if (avatarFile) {
      const u = await U.fileToDataUrl(avatarFile);
      view.querySelector('#wAv').innerHTML = `<img class="avimg" src="${u}" alt="" style="width:132px;height:132px">`;
    } else view.querySelector('#wAv').innerHTML = await avatarHtml(132, { name: nameIn.value });
  };
  nameIn.addEventListener('input', () => { stripAt(nameIn); view.querySelector('#wGo').disabled = !nameIn.value.trim(); if (!avatarFile) refreshAv(); });
  view.querySelector('#wPic').addEventListener('change', e => { avatarFile = e.target.files[0] || null; refreshAv(); });
  view.querySelector('#wGo').addEventListener('click', async () => {
    const p = { id: 'profile', name: nameIn.value.replace(/^@+/, '').trim(), createdAt: new Date().toISOString() };
    if (avatarFile) p.avatarId = (await U.storeImage(avatarFile, 'avatar')).id;
    await DB.put('meta', p);
    PROFILE = p;
    TOUR.start();
    location.replace('#/');
  });
}

/* ---------- Filmkühlschrank ---------- */
function monthEnd(ym) {
  const [y, m] = String(ym).split('-').map(Number);
  return new Date(y, m, 0, 23, 59, 59);
}
function fmtMonth(ym) {
  if (!ym) return '';
  const [y, m] = String(ym).split('-');
  return `${m}/${y}`;
}
function ageText(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr), now = new Date();
  const months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (months <= 0) return 'diesen Monat gekauft';
  if (months < 12) return `vor ${months} ${months === 1 ? 'Monat' : 'Monaten'} gekauft`;
  const y = Math.floor(months / 12), r = months % 12;
  return `vor ${y} ${y === 1 ? 'Jahr' : 'Jahren'}${r ? ` und ${r} ${r === 1 ? 'Monat' : 'Monaten'}` : ''} gekauft`;
}
function fridgeExpiry(e) {
  if (!e.expiresAt) return { state: 'none', tag: '' };
  const end = monthEnd(e.expiresAt), now = new Date();
  const days = (end - now) / 86400000;
  if (days < 0) return { state: 'expired', tag: '<span class="exptag">Expired</span>' };
  if (days < 92) return { state: 'soon', tag: '<span class="exptag soon">bald</span>' };
  return { state: 'ok', tag: '' };
}


const SW_TYPES = ['sw', 'sw-c41', 'sw-umkehr', 'ir'];
const FRIDGE_SORTS = [['bought', 'Kaufdatum'], ['color', 'SW / Farbe'], ['iso', 'ISO'], ['brand', 'Marke'], ['name', 'Name']];

function sortFridge(entries, stocks, key) {
  const st = e => stocks.get(e.stockId) || {};
  const name = e => (st(e).name || '').toLowerCase();
  const brand = e => (st(e).maker || '').toLowerCase();
  const byName = (a, b) => brand(a).localeCompare(brand(b)) || name(a).localeCompare(name(b));
  const cmp = {
    bought: (a, b) => (b.boughtAt || '').localeCompare(a.boughtAt || '') || byName(a, b),
    color: (a, b) => (SW_TYPES.includes(st(a).type) ? 0 : 1) - (SW_TYPES.includes(st(b).type) ? 0 : 1) || byName(a, b),
    iso: (a, b) => (st(a).boxIso || 0) - (st(b).boxIso || 0) || byName(a, b),
    brand: byName,
    name: (a, b) => name(a).localeCompare(name(b)) || brand(a).localeCompare(brand(b)),
    expiry: (a, b) => {
      const r = e => ({ expired: 0, soon: 1, ok: 2, none: 3 }[fridgeExpiry(e).state]);
      return r(a) - r(b) || (a.expiresAt || '9999').localeCompare(b.expiresAt || '9999') || byName(a, b);
    }
  }[key] || byName;
  return [...entries].sort(cmp);
}

async function fridgeRow(e, st, { pick = false, on = false } = {}) {
  const exp = fridgeExpiry(e);
  const kind = st ? (SW_TYPES.includes(st.type) ? 'SW' : 'Farbe') : '';
  const q = st ? `${U.stockLabel(st)} ${st.boxIso || ''} ${kind}`.toLowerCase() : '';
  const attrs = pick
    ? `data-fridge="${e.id}" data-stock="${st?.id || ''}" data-format="${e.format || ''}"`
    : `data-entry="${e.id}"`;
  return `<button type="button" class="frow ${exp.state}${on ? ' on' : ''}" ${attrs} data-q="${U.esc(q)}">
    <span class="frowart">${await filmArt(st, 42)}</span>
    <span class="frowmain">
      <span class="frowname">${U.esc(st ? U.stockLabel(st) : 'Unbekannter Film')}${exp.tag ? ' ' + exp.tag.replace('exptag', 'exptag inline') : ''}</span>
      <span class="frowchips"><span>${FORMAT_LABEL[e.format] || '?'}</span><span>ISO ${U.esc(st?.isoLabel || st?.boxIso || '?')}</span><span>${kind}</span></span>
      <span class="frowsub">${e.boughtAt ? ageText(e.boughtAt) : 'Kaufdatum offen'}${e.expiresAt ? ` · haltbar bis ${fmtMonth(e.expiresAt)}` : ''}</span>
    </span>
    <span class="frowcount">×${e.count || 0}</span>
    ${pick ? '' : `<span class="frowx" role="button" tabindex="0" data-delentry="${e.id}" aria-label="Aus dem Kühlschrank entfernen">${ART.x}</span>`}
  </button>`;
}

// Auswahl aus allen Filmen (für einen Film, der nicht im Kühlschrank liegt)
async function openStockPicker(onPick, format) {
  const stocks = (await DB.all('stocks')).filter(s => !format || !s.formats || s.formats.includes(format)).sort((a, b) => U.stockLabel(a).localeCompare(U.stockLabel(b)));
  const ov = document.createElement('div');
  ov.className = 'modalbg';
  ov.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="spTitle">
      <h2 id="spTitle">Neuer Film${format ? ` · ${FORMAT_LABEL[format] || format}` : ''}</h2>
      <input type="search" placeholder=" " id="spQ" aria-label="Suchen" autocomplete="off">
      <div class="frlist tall" id="spList">${stocks.map(s => `<button type="button" class="fropt" data-s="${s.id}" data-q="${U.esc((U.stockLabel(s) + ' ' + (s.boxIso || '')).toLowerCase())}">${U.esc(U.stockLabel(s))}<span class="sub2"> ISO ${U.esc(s.isoLabel || s.boxIso || '?')}</span></button>`).join('')}</div>
      <p class="hint">Film fehlt? <a href="#/film/neu">Neu in der Filmliste anlegen</a></p>
      <button class="btn ghost wide" id="spCancel">Abbrechen</button>
    </div>`;
  document.body.appendChild(ov);
  const close = () => ov.remove();
  ov.querySelector('#spCancel').addEventListener('click', close);
  ov.addEventListener('click', e => { if (e.target === ov) close(); });
  ov.querySelector('#spQ').addEventListener('input', e => {
    const q = e.target.value.toLowerCase().trim();
    ov.querySelectorAll('.fropt').forEach(b => { b.hidden = !b.dataset.q.includes(q); });
    const list = ov.querySelector('#spList');
    U.emptyHint(list, q && ![...list.children].some(b => !b.hidden), UPS_FILM);
  });
  ov.querySelector('#spList').addEventListener('click', e => {
    const b = e.target.closest('[data-s]'); if (!b) return;
    close(); onPick(b.dataset.s);
  });
  setTimeout(() => ov.querySelector('#spQ').focus(), 50);
}

function euro(n) { return (n || 0).toLocaleString((typeof I18N !== 'undefined' ? I18N.locale() : 'de-DE'), { style: 'currency', currency: 'EUR' }); }

// Preisliste Fotokotti (Angabe der Nutzerin): Entwicklung nach Format und Farbe/SW, Scan nach Format
// Labore mit Preisen. Entweder Einzelpreise (Entwicklung und Scan je Format und SW/Farbe) oder ein Gesamtpreis pro Film.
// Vorbelegt: Fotokotti mit den Preisen der Nutzerin.
const DEFAULT_LABS = [{ id: 'lab-fotokotti', name: 'Fotokotti', mode: 'detail',
  dev: { '135': { farbe: 4.5, sw: 7.5 }, '120': { farbe: 5.5, sw: 7.5 } },
  scan: { '135': { farbe: 6.5, sw: 6.5 }, '120': { farbe: 9.5, sw: 9.5 } } }];
async function getLabs() {
  const m = await DB.get('meta', 'labs');
  if (m?.list) return m.list;
  await DB.put('meta', { id: 'labs', list: DEFAULT_LABS });
  return DEFAULT_LABS;
}
async function saveLabs(list) { await DB.put('meta', { id: 'labs', list }); }
function labPrice(roll, stock, scan, lab) {
  if (!lab) return { dev: 0, scan: 0 };
  if (lab.mode === 'flat') return { dev: Number(lab.flat) || 0, scan: 0 };
  const fmt = roll.format === '120' ? '120' : '135';
  const kind = stock?.process === 'SW' ? 'sw' : 'farbe';   // XP2 und andere C-41-SW-Filme laufen im Farbprozess
  const sc = lab.scan?.[fmt];
  return { dev: Number(lab.dev?.[fmt]?.[kind]) || 0, scan: scan ? Number(typeof sc === 'object' ? sc?.[kind] : sc) || 0 : 0 };
}

// Alle Buchungen: Filmkäufe im Kühlschrank, einzeln verbuchte Filme, Entwicklung und Scan
function transactions(fridgeEntries, rolls, stocks) {
  const tx = [];
  for (const e of fridgeEntries) {
    if (e.price == null) continue;
    const n = e.bought ?? e.count ?? 0;
    if (!n) continue;
    tx.push({ key: 'f:' + e.id, date: e.boughtAt || '', kind: 'film', amount: e.price * n, label: `${n} × ${U.stockLabel(stocks.get(e.stockId))}` });
  }
  for (const r of rolls) {
    const st = stocks.get(r.stockId);
    if (r.filmCost) tx.push({ key: 'r:' + r.id, date: r.loadedAt || '', kind: 'film', amount: Number(r.filmCost), label: U.stockLabel(st) });
    const d = r.dev;
    if (!d || d.mode !== 'labor' || (r.status || 'entwurf') === 'entwurf') continue;
    if (d.cost) tx.push({ key: 'd:' + r.id, date: d.sentAt || '', kind: 'dev', amount: Number(d.cost), label: `Entwicklung ${U.stockLabel(st)}` });
    if (d.scanCost) tx.push({ key: 's:' + r.id, date: d.sentAt || '', kind: 'scan', amount: Number(d.scanCost), label: `Scan ${U.stockLabel(st)}` });
  }
  return tx.sort((a, b) => b.date.localeCompare(a.date));
}
function spending(tx) {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const r = { total: 0, month: 0, film: 0, dev: 0, scan: 0 };
  for (const t of tx) {
    r.total += t.amount; r[t.kind] += t.amount;
    if (t.date.slice(0, 7) === ym) r.month += t.amount;
  }
  return r;
}
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
function historyHtml(tx) {
  if (!tx.length) return '<p class="hint">Noch keine Buchungen.</p>';
  const groups = new Map();
  for (const t of tx) { const k = t.date.slice(0, 7) || 'ohne Datum'; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(t); }
  const KIND = { film: 'Film', dev: 'Entwicklung', scan: 'Scan' };
  return [...groups].map(([k, list]) => {
    const [y, m] = k.split('-');
    const sum = kind => list.filter(t => t.kind === kind).reduce((n, t) => n + t.amount, 0);
    return `<div class="txmonth">
      <div class="txhead"><b>${m ? I18N.t(MONTHS[Number(m) - 1]) + ' ' + y : I18N.t(k)}</b><span>${euro(list.reduce((n, t) => n + t.amount, 0))}</span></div>
      <div class="txsplit">${['film', 'dev', 'scan'].map(kd => `<span>${KIND[kd]} ${euro(sum(kd))}</span>`).join('')}</div>
      ${list.map(t => `<div class="txrow"><span>${U.esc(t.label)}</span><span>${euro(t.amount)}</span></div>`).join('')}
    </div>`;
  }).join('');
}

const SNOW = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7"/><path d="M9.5 3.8 12 5.5l2.5-1.7M9.5 20.2 12 18.5l2.5 1.7M4.2 10.2l2.9-.3.4-2.9M19.8 13.8l-2.9.3-.4 2.9M4.2 13.8l2.9.3.4 2.9M19.8 10.2l-2.9-.3-.4-2.9"/></g></svg>`;

async function viewProfile() {
  setHeader('');
  const allEntries = await DB.all('fridge');
  const entries = allEntries.filter(e => (e.count || 0) > 0);
  const [stocks, rolls] = [await stocksMap(), await DB.all('rolls')];
  // Zurückgesetzte Beträge werden je Buchung abgezogen; spätere Käufe zählen wieder
  const cleared = (await DB.get('meta', 'spendReset'))?.cleared || {};
  const tx = transactions(allEntries, rolls, stocks)
    .map(t => ({ ...t, amount: Math.round((t.amount - (cleared[t.key] || 0)) * 100) / 100 }))
    .filter(t => t.amount > 0.004);
  const spend = spending(tx);
  let sortKey = 'bought';
  try { sortKey = localStorage.getItem('kb-fridge-sort') || 'bought'; } catch (_) {}
  const sorted = sortFridge(entries, stocks, sortKey);
  const cells = await Promise.all(sorted.map(e => fridgeRow(e, stocks.get(e.stockId))));
  const total = entries.reduce((n, e) => n + (e.count || 0), 0);
  const photos = (await DB.all('frames')).filter(f => f.imgId);
  view.innerHTML = `
    <div class="profilehead">
      <button class="gearbtn" id="openSettings" aria-label="Einstellungen">${ART.menu}</button>
      <button class="heroav big" id="pAv" aria-label="Profilbild ändern">${await avatarHtml(120)}</button>
      <input type="file" accept="image/*" hidden id="pPic">
      <label class="atname pname"><span class="at" aria-hidden="true">@</span><input id="pName" value="${U.esc(PROFILE?.name || '')}" aria-label="Nutzername" maxlength="40" autocapitalize="none" spellcheck="false"></label>
    </div>

    <a class="tile photostile" href="#/alle-fotos">
      <span class="fridgeicon photoicon">${ART.album}</span>
      <div><h2>Alle Fotos</h2><span class="sub2">${photos.length} ${photos.length === 1 ? 'Foto' : 'Fotos'}</span></div>
      <span class="chev">›</span>
    </a>

    <section class="fridge fold${foldOpen('fridge') ? ' open' : ''}" data-fold="fridge">
      <div class="fridgetop foldhead">
        <span class="fridgeicon">${SNOW}</span>
        <div><h2>Filmkühlschrank</h2><span class="sub2">${total ? `${total} ${total === 1 ? 'Rolle' : 'Rollen'} vorrätig` : 'Noch leer'}</span></div>
        <button class="fridgeplus" id="addFridge" aria-label="Film in den Kühlschrank legen">+</button>
        <span class="foldchev" aria-hidden="true"></span>
      </div>
      <div class="foldbody">
      ${entries.length > 1 ? `<div class="sortrow" id="fSort"><span class="sub2">Sortieren</span>${FRIDGE_SORTS.map(([k, l]) => `<button type="button" class="chip${k === sortKey ? ' on' : ''}" data-sort="${k}">${l}</button>`).join('')}</div>` : ''}
      <div class="flist" id="fList">${cells.length ? cells.join('') : '<p class="hint fridgeempty">Lege mit dem Plus die Filme hinein, die du gekauft hast.</p>'}</div>
      </div>
    </section>

    ${await cabinetHtml(true)}

    ${await diaryFoldHtml()}

    <section class="spend fold${foldOpen('spend') ? ' open' : ''}" data-fold="spend">
      <div class="fridgetop foldhead">
        <span class="fridgeicon spendicon">€</span>
        <div><h2>Geld</h2><span class="sub2">diesen Monat ${euro(spend.month)}</span></div>
        <span class="foldchev" aria-hidden="true"></span>
      </div>
      <div class="foldbody">
      <p class="spendtext">Du hast diesen Monat schon <b>${euro(spend.month)}</b> für Film ausgegeben. Dein Filmgeldberg ist <b>${euro(spend.total)}</b> hoch.</p>
      <div class="spendsplit three">
        <div><span class="sub2">Filme</span><b>${euro(spend.film)}</b></div>
        <div><span class="sub2">Entwicklung</span><b>${euro(spend.dev)}</b></div>
        <div><span class="sub2">Scans</span><b>${euro(spend.scan)}</b></div>
      </div>
      <details class="txhist"><summary>Verlauf</summary>${historyHtml(tx)}
        ${tx.length ? '<button class="btn danger small" id="spendReset">Ausgaben zurücksetzen</button>' : ''}</details>
      </div>
    </section>`;
  const nameIn = view.querySelector('#pName');
  const fit = () => { nameIn.size = Math.max(2, nameIn.value.length + 1); };
  fit();
  let t;
  nameIn.addEventListener('input', () => {
    stripAt(nameIn); fit();
    clearTimeout(t);
    t = setTimeout(async () => {
      if (!nameIn.value.trim()) return;
      PROFILE.name = nameIn.value.trim(); await DB.put('meta', PROFILE);
    }, 400);
  });
  view.querySelector('#pAv').addEventListener('click', () => view.querySelector('#pPic').click());
  view.querySelector('#pPic').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    const rec = await U.storeImage(f, 'avatar');
    await deleteImage(PROFILE.avatarId);
    PROFILE.avatarId = rec.id; await DB.put('meta', PROFILE); route();
  });
  view.querySelector('#addFridge').addEventListener('click', e => openFridgeModal(null, e.currentTarget));
  view.querySelector('#fSort')?.addEventListener('click', e => {
    const b = e.target.closest('[data-sort]'); if (!b) return;
    try { localStorage.setItem('kb-fridge-sort', b.dataset.sort); } catch (_) {}
    view.querySelectorAll('#fSort .chip').forEach(c => c.classList.toggle('on', c === b));
    const list = sortFridge(entries, stocks, b.dataset.sort);
    Promise.all(list.map(x => fridgeRow(x, stocks.get(x.stockId)))).then(h => { view.querySelector('#fList').innerHTML = h.join(''); });
  });
  view.querySelector('#fList').addEventListener('click', async e => {
    const x = e.target.closest('[data-delentry]');
    if (x) {
      e.stopPropagation();
      // Versehentlich hinzugefügt: noch vorrätige Rollen samt Preis entfernen. Schon eingelegte Rollen bleiben als Ausgabe stehen.
      const en = await DB.get('fridge', x.dataset.delentry); if (!en) return;
      const left = en.count || 0, bought = en.bought ?? left;
      const used = Math.max(0, bought - left);
      if (used > 0) { en.bought = used; en.count = 0; await DB.put('fridge', en); }
      else await DB.del('fridge', en.id);
      U.toast(left === 1 ? 'Film entfernt' : `${left} Rollen entfernt`);
      route();
      return;
    }
    const b = e.target.closest('[data-entry]'); if (!b) return;
    openFridgeModal(await DB.get('fridge', b.dataset.entry));
  });
  setupCabinet(view);
  setupDiaryFold(view);
  setupFolds(view);
  view.querySelector('#spendReset')?.addEventListener('click', () => {
    const ov = document.createElement('div');
    ov.className = 'modalbg';
    ov.innerHTML = `<div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="rsTitle">
      <h2 id="rsTitle">Ausgaben zurücksetzen?</h2>
      <p class="hint">Der Filmgeldberg und dieser Monat stehen danach auf 0 €. Filme, Rollen und Fotos bleiben erhalten. Was du danach kaufst oder entwickeln lässt, zählt wieder.</p>
      <div class="modalfoot"><button class="closex" id="rsNo" aria-label="Abbrechen">${ART.x}</button><button class="btn danger" id="rsYes">Zurücksetzen</button></div>
    </div>`;
    document.body.appendChild(ov);
    ov.querySelector('#rsNo').addEventListener('click', () => ov.remove());
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    ov.querySelector('#rsYes').addEventListener('click', async () => {
      const all = transactions(await DB.all('fridge'), await DB.all('rolls'), await stocksMap());
      const map = {};
      all.forEach(t => { map[t.key] = (map[t.key] || 0) + t.amount; });
      await DB.put('meta', { id: 'spendReset', at: new Date().toISOString(), cleared: map });
      ov.remove(); U.toast('Ausgaben zurückgesetzt'); route();
    });
  });
  view.querySelector('#openSettings').addEventListener('click', openSettings);
  try { if (sessionStorage.getItem('kb-open-settings')) { sessionStorage.removeItem('kb-open-settings'); openSettings(); } } catch (_) {}
}

// Einstellungen und weitere Bereiche in einem Fenster, damit das Profil bei vier Bereichen bleibt
function openSettings() {
  const ov = document.createElement('div');
  ov.className = 'modalbg';
  ov.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="setTitle">
      <h2 id="setTitle">Einstellungen</h2>
      <div class="sethead"><span class="langic" aria-hidden="true">Aa</span><span>Sprache</span></div>
      <div class="langpick" id="setLang">${['de', 'en'].map(l => `<button type="button" data-lang="${l}" class="${I18N.get() === l ? 'on' : ''}">${l.toUpperCase()}</button>`).join('')}</div>
      <div class="sethead">${ART.sun}<span>Farbschema</span></div>
      <div class="moodpick" id="menuMood">${[['auto', 'Automatisch'], ['sun', 'Sonne'], ['moon', 'Mond']].map(([k, l]) => `<button type="button" data-mood="${k}">${l}</button>`).join('')}</div>
      <div class="qlabel" id="clockLabel"></div>
      <input type="range" id="clockRange" min="0" max="23.75" step="0.25" aria-label="Uhrzeit simulieren" style="padding:0;border:0;background:none;accent-color:var(--teal)">
      <button type="button" class="btn ghost small" id="clockReal">Echte Uhrzeit</button>
      <div class="sethead">${ART.tank}<span>Entwicklung</span></div>
      <div class="list labs" id="labList" style="margin:0"></div>
      <button type="button" class="btn ghost small" id="labNew" style="margin-top:8px">+ Neues Labor anlegen</button>
      <div class="list profilelinks" style="margin:16px 0 0">
        <a class="item" href="#/filme"><span class="setlink">${ART.filmIc}Alle Filme und Infos</span><span class="chev">›</span></a>
        <a class="item" href="#/rechner"><span class="setlink">${ART.moon}Belichtungsrechner für Nachtaufnahmen</span><span class="chev">›</span></a>
        <a class="item" href="#/mehr"><span class="setlink">${ART.save}Sicherung und Speicher</span><span class="chev">›</span></a>
      </div>
      <div class="sethead">${ART.x}<span>Reset/Test</span></div>
      <p class="hint" style="margin:0 0 8px">Löscht alle hochgeladenen Fotos, deinen Namen und dein Profilbild. Rollen, Filme, Kameras und Preise bleiben.</p>
      <button type="button" class="btn danger small" id="resetAll">Fotos, Name und Profilbild löschen</button>
      <p class="hint" style="margin:14px 0 8px">Die Beispielkameras und -objektive sind beim ersten Start schon im Kameraschrank. Gelöschte lassen sich hier wieder laden.</p>
      <button type="button" class="btn ghost small" id="seedGear">Beispielausrüstung laden</button>
      <div class="modalfoot"><button class="closex" id="setClose" aria-label="Schließen">${ART.x}</button><span></span></div>
    </div>`;
  document.body.appendChild(ov);
  setupLightSettings(ov);
  ov.querySelector('#setLang').addEventListener('click', e => {
    const b = e.target.closest('[data-lang]'); if (!b || b.dataset.lang === I18N.get()) return;
    ov.querySelectorAll('#setLang button').forEach(x => x.classList.toggle('on', x === b));
    try { sessionStorage.setItem('kb-open-settings', '1'); } catch (_) {}
    I18N.set(b.dataset.lang);
  });
  const drawLabs = async () => {
    const labs = await getLabs();
    ov.querySelector('#labList').innerHTML = labs.map(l => `<button type="button" class="item" data-lab="${l.id}"><span>${U.esc(l.name)}<br><span class="sub2">${l.mode === 'flat' ? 'Gesamtpreis ' + euro(Number(l.flat) || 0) : 'Einzelpreise'}</span></span><span class="chev">›</span></button>`).join('');
  };
  drawLabs();
  ov.querySelector('#labList').addEventListener('click', async e => { const b = e.target.closest('[data-lab]'); if (b) openLabEditor((await getLabs()).find(l => l.id === b.dataset.lab), drawLabs); });
  ov.querySelector('#labNew').addEventListener('click', () => openLabEditor(null, drawLabs));
  ov.querySelector('#resetAll').addEventListener('click', () => {
    const cf = document.createElement('div');
    cf.className = 'modalbg';
    cf.innerHTML = `<div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="raTitle">
      <h2 id="raTitle">Wirklich zurücksetzen?</h2>
      <p class="hint">Alle Fotos, dein Name und dein Profilbild werden gelöscht. Das lässt sich nicht rückgängig machen.</p>
      <div class="modalfoot"><button class="closex" id="raNo" aria-label="Abbrechen">${ART.x}</button><button class="btn danger" id="raYes">Löschen</button></div>
    </div>`;
    document.body.appendChild(cf);
    cf.querySelector('#raNo').addEventListener('click', () => cf.remove());
    cf.addEventListener('click', e => { if (e.target === cf) cf.remove(); });
    cf.querySelector('#raYes').addEventListener('click', async () => { await resetPhotosAndProfile(); cf.remove(); ov.remove(); });
  });
  ov.querySelector('#seedGear').addEventListener('click', async () => {
    const n = await loadSeedGear();
    U.toast(n ? 'Beispielausrüstung geladen' : 'Beispielausrüstung ist schon da');
    if (n && location.hash.startsWith('#/profil')) { ov.remove(); route(); }
  });
  const close = () => ov.remove();
  ov.querySelector('#setClose').addEventListener('click', close);
  ov.addEventListener('click', e => { if (e.target === ov) close(); });
}

/* Lichtwahl und simulierte Uhrzeit (früher im Menü) */
function setupLightSettings(root) {
  const hm = h => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;
  const mark = () => {
    root.querySelectorAll('#menuMood button').forEach(b => b.classList.toggle('on', b.dataset.mood === MOOD.pref()));
    const c = MOOD.clock(), now = new Date();
    root.querySelector('#clockRange').value = c ?? (now.getHours() + now.getMinutes() / 60);
    root.querySelector('#clockLabel').textContent = c === null ? 'Uhrzeit simulieren' : `Simuliert: ${hm(c)} Uhr`;
  };
  root.querySelector('#clockRange').addEventListener('input', e => { if (MOOD.pref() !== 'auto') MOOD.set('auto'); MOOD.setClock(parseFloat(e.target.value)); mark(); });
  root.querySelector('#clockReal').addEventListener('click', () => { MOOD.setClock(null); mark(); });
  root.querySelector('#menuMood').addEventListener('click', e => { const b = e.target.closest('[data-mood]'); if (!b) return; MOOD.set(b.dataset.mood); mark(); });
  mark();
}

async function openFridgeModal(entry, fromBtn) {
  const isNew = !entry;
  entry = entry || { id: U.uid(), count: 1, format: '135', boughtAt: U.today() };
  const stocks = (await DB.all('stocks')).sort((a, b) => U.stockLabel(a).localeCompare(U.stockLabel(b)));
  const current = stocks.find(s => s.id === entry.stockId);
  const ov = document.createElement('div');
  ov.className = 'modalbg';
  ov.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="frTitle">
      <div class="seggroup fmtpick" id="frFmt">
        <button type="button" class="seg${entry.format === '135' ? ' on' : ''}" data-f="135" aria-label="Kleinbild">${ART.fmt135}<span>135</span></button>
        <button type="button" class="seg${entry.format === '120' ? ' on' : ''}" data-f="120" aria-label="Mittelformat">${ART.fmt120}<span>120</span></button>
      </div>
      <h2 id="frTitle">${isNew ? 'Film in den Kühlschrank' : U.esc(current ? U.stockLabel(current) : 'Film')}</h2>
      ${isNew ? `
        <div class="frslot empty" id="frSlot" aria-live="polite"><span class="frslotart"></span><span class="frslottxt">Film wählen</span></div>
        <input type="search" placeholder=" " id="frQ" aria-label="Suchen" autocomplete="off">
        <div class="frlist three" id="frList">${stocks.map(s => `<button type="button" class="fropt" data-s="${s.id}" data-fmts="${(s.formats || ['135', '120']).join(' ')}" data-q="${U.esc((U.stockLabel(s) + ' ' + (s.boxIso || '')).toLowerCase())}">${U.esc(U.stockLabel(s))}<span class="sub2"> ISO ${U.esc(s.isoLabel || s.boxIso || '?')}</span></button>`).join('')}</div>` : ''}
      <div class="fld"><span>Anzahl Rollen</span>
        <div class="stepper"><button type="button" id="frMinus" aria-label="weniger">−</button><span id="frCount">${entry.count}</span><button type="button" id="frPlus" aria-label="mehr">+</button></div>
      </div>
      <div class="two">
        <label class="fld"><span>Preis pro Rolle (€)</span><input id="frPrice" inputmode="decimal" value="${entry.price != null ? String(entry.price).replace('.', ',') : ''}"></label>
        <label class="fld"><span>Gekauft am</span><input type="date" id="frBought" value="${entry.boughtAt || ''}"></label>
      </div>
      <label class="fld"><span>Läuft ab (Monat, optional)</span><input type="month" id="frExp" value="${U.esc(entry.expiresAt || '')}"></label>
      ${isNew ? '' : '<button class="btn danger small" id="frDel">Aus dem Kühlschrank nehmen</button>'}
      <div class="modalfoot">
        <button class="closex" id="frCancel" aria-label="Abbrechen">${ART.x}</button>
        <button class="btn accent" id="frSave" ${isNew ? 'disabled' : ''}>${isNew ? 'In den Kühlschrank legen' : 'Speichern'}</button>
      </div>
    </div>`;
  document.body.appendChild(ov);
  const $ = id => ov.querySelector('#' + id);
  const close = fromBtn ? growFrom(ov, fromBtn) : () => ov.remove();
  $('frCancel').addEventListener('click', close);
  ov.addEventListener('click', e => { if (e.target === ov) close(); });
  const filter = () => {
    const q = ($('frQ')?.value || '').toLowerCase().trim();
    ov.querySelectorAll('.fropt').forEach(b => { b.hidden = !b.dataset.q.includes(q) || !b.dataset.fmts.split(' ').includes(entry.format); });
    const list = $('frList');
    if (list) U.emptyHint(list, q && ![...list.children].some(b => !b.hidden), UPS_FILM);
  };
  $('frQ')?.addEventListener('input', filter);
  // Gewählter Film fliegt aus der Liste in das Feld oben und rastet dort ein
  const fillSlot = async b => {
    const slot = $('frSlot'), st = stocks.find(x => x.id === entry.stockId);
    const kind = SW_TYPES.includes(st.type) ? 'SW' : 'Farbe';
    const from = b.getBoundingClientRect(), to = slot.getBoundingClientRect();
    const ghost = document.createElement('div');
    ghost.className = 'frghost'; ghost.textContent = U.stockLabel(st);
    ghost.style.cssText = `left:${from.left}px;top:${from.top}px;width:${from.width}px;height:${from.height}px`;
    document.body.appendChild(ghost);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(() => {
      ghost.style.transform = `translate(${to.left - from.left}px, ${to.top - from.top}px)`;
      ghost.style.width = to.width + 'px'; ghost.style.height = to.height + 'px'; ghost.style.opacity = '.2';
    });
    const art = await filmArt(st, 52);
    setTimeout(() => {
      ghost.remove();
      slot.classList.remove('empty', 'pop'); void slot.offsetWidth;
      slot.innerHTML = `<span class="frslotart">${art}</span><span class="frslottxt"><b>${U.esc(U.stockLabel(st))}</b><span class="frowchips"><span>ISO ${U.esc(st.isoLabel || st.boxIso || '?')}</span><span>${kind}</span><span>${FORMAT_LABEL[entry.format]}</span></span></span><span class="frslotok">${ART.check}</span>`;
      slot.classList.add('pop');
      U.haptic();
    }, reduce ? 0 : 320);
  };
  $('frList')?.addEventListener('click', e => {
    const b = e.target.closest('[data-s]'); if (!b) return;
    entry.stockId = b.dataset.s;
    ov.querySelectorAll('.fropt').forEach(x => x.classList.toggle('on', x === b));
    $('frSave').disabled = false;
    fillSlot(b);
  });
  $('frFmt').addEventListener('click', e => {
    const b = e.target.closest('[data-f]'); if (!b) return;
    entry.format = b.dataset.f;
    ov.querySelectorAll('#frFmt .seg').forEach(x => x.classList.toggle('on', x === b));
    filter();
    const chosen = ov.querySelector('.fropt.on');
    if (chosen && chosen.hidden) { chosen.classList.remove('on'); entry.stockId = null; $('frSave').disabled = true; const sl = $('frSlot'); sl.className = 'frslot empty'; sl.innerHTML = '<span class="frslotart"></span><span class="frslottxt">Film wählen</span>'; }
    else if (chosen) { const c = ov.querySelector('#frSlot .frowchips span:last-child'); if (c) c.textContent = FORMAT_LABEL[entry.format]; }
  });
  filter();
  $('frMinus').addEventListener('click', () => { entry.count = Math.max(1, (entry.count || 1) - 1); $('frCount').textContent = entry.count; });
  $('frPlus').addEventListener('click', () => { entry.count = (entry.count || 0) + 1; $('frCount').textContent = entry.count; });
  const startCount = entry.count || 0;
  $('frSave').addEventListener('click', async () => {
    const pr = parseFloat($('frPrice').value.replace(',', '.'));
    entry.price = isNaN(pr) ? null : Math.round(pr * 100) / 100;
    if (isNew) entry.bought = entry.count;
    else if (entry.count > startCount) entry.bought = (entry.bought ?? startCount) + (entry.count - startCount);
    entry.boughtAt = $('frBought').value;
    entry.expiresAt = $('frExp').value || null;
    await DB.put('fridge', entry);
    close(); U.toast(isNew ? 'Im Filmkühlschrank' : 'Gespeichert'); route();
  });
  $('frDel')?.addEventListener('click', async () => { await DB.del('fridge', entry.id); close(); route(); });
}

// Labor anlegen oder bearbeiten
async function openLabEditor(lab, done) {
  const isNew = !lab;
  lab = lab ? JSON.parse(JSON.stringify(lab)) : { id: U.uid(), name: '', mode: 'detail', dev: { '135': {}, '120': {} }, scan: { '135': {}, '120': {} } };
  lab.dev = lab.dev || { '135': {}, '120': {} }; lab.scan = lab.scan || { '135': {}, '120': {} };
  const num = v => v == null || v === '' ? '' : String(v).replace('.', ',');
  const cell = (grp, fmt, kind) => { const v = lab[grp]?.[fmt]; return num(typeof v === 'object' ? v?.[kind] : v); };
  const grid = grp => `<div class="pricegrid">
      <span></span><span class="sub2">Farbe</span><span class="sub2">SW</span>
      ${[['135', 'Kleinbild'], ['120', 'Mittelformat']].map(([f, l]) => `<span>${l}</span>
        <input inputmode="decimal" data-p="${grp}.${f}.farbe" aria-label="${grp === 'dev' ? 'Entwicklung' : 'Scan'} ${l} Farbe" value="${cell(grp, f, 'farbe')}">
        <input inputmode="decimal" data-p="${grp}.${f}.sw" aria-label="${grp === 'dev' ? 'Entwicklung' : 'Scan'} ${l} Schwarzweiß" value="${cell(grp, f, 'sw')}">`).join('')}
    </div>`;
  const ov = document.createElement('div');
  ov.className = 'modalbg';
  ov.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="labTitle">
      <h2 id="labTitle">${isNew ? 'Neues Labor' : 'Labor'}</h2>
      <label class="fld"><span>Name</span><input id="labName" value="${U.esc(lab.name)}" maxlength="40"></label>
      <div class="seggroup" id="labMode">
        <button type="button" class="seg${lab.mode !== 'flat' ? ' on' : ''}" data-m="detail">Einzelpreise</button>
        <button type="button" class="seg${lab.mode === 'flat' ? ' on' : ''}" data-m="flat">Gesamtpreis</button>
      </div>
      <div id="labDetail">
        <h3 class="sub">Entwicklung (€)</h3>${grid('dev')}
        <h3 class="sub">Scan (€)</h3>${grid('scan')}
      </div>
      <div id="labFlat"><label class="fld"><span>Gesamtpreis pro Film (€)</span><input id="labFlatIn" inputmode="decimal" value="${num(lab.flat)}"></label></div>
      ${isNew ? '' : '<button class="btn danger small" id="labDel">Labor löschen</button>'}
      <div class="modalfoot"><button class="closex" id="labNo" aria-label="Abbrechen">${ART.x}</button><button class="okbtn" id="labOk" aria-label="Speichern">${ART.check}</button></div>
    </div>`;
  document.body.appendChild(ov);
  const $ = id => ov.querySelector('#' + id);
  const sync = () => { $('labDetail').hidden = lab.mode === 'flat'; $('labFlat').hidden = lab.mode !== 'flat'; $('labOk').disabled = !$('labName').value.trim(); };
  $('labMode').addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (!b) return; lab.mode = b.dataset.m; ov.querySelectorAll('#labMode .seg').forEach(x => x.classList.toggle('on', x === b)); sync(); });
  $('labName').addEventListener('input', sync);
  sync();
  const close = () => ov.remove();
  $('labNo').addEventListener('click', close);
  ov.addEventListener('click', e => { if (e.target === ov) close(); });
  $('labOk').addEventListener('click', async () => {
    const p = v => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : Math.round(n * 100) / 100; };
    lab.name = $('labName').value.trim();
    ov.querySelectorAll('[data-p]').forEach(inp => { const [g, f, k] = inp.dataset.p.split('.'); lab[g][f] = typeof lab[g][f] === 'object' ? lab[g][f] : {}; lab[g][f][k] = p(inp.value); });
    lab.flat = p($('labFlatIn').value);
    const labs = await getLabs();
    const i = labs.findIndex(l => l.id === lab.id);
    if (i >= 0) labs[i] = lab; else labs.push(lab);
    await saveLabs(labs);
    close(); U.toast(isNew ? 'Labor angelegt' : 'Labor gespeichert'); done && done();
  });
  $('labDel')?.addEventListener('click', async () => { await saveLabs((await getLabs()).filter(l => l.id !== lab.id)); close(); U.toast('Labor gelöscht'); done && done(); });
}

function closeMenu() {}

boot();

/* Reset/Test: alle Bilder löschen, Verweise darauf entfernen, Name und Profilbild zurücksetzen */
async function resetPhotosAndProfile() {
  const imgs = await DB.all('images');
  const ids = new Set(imgs.map(i => i.id));
  for (const i of imgs) { U.forgetImg(i.id); await DB.del('images', i.id); }
  const strip = o => {
    let changed = false;
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (typeof v === 'string' && ids.has(v)) { delete o[k]; changed = true; }
      else if (v && typeof v === 'object') changed = strip(v) || changed;
    }
    return changed;
  };
  for (const st of ['frames', 'rolls', 'cameras', 'lenses', 'stocks', 'fridge']) {
    for (const r of await DB.all(st)) if (strip(r)) await DB.put(st, r);
  }
  for (const d of await allDiaries()) { d.photos = (d.photos || []).filter(p => !ids.has(p.imgId)); await DB.put('meta', d); }
  await DB.del('meta', 'profile');
  PROFILE = null;
  U.toast('Zurückgesetzt');
  location.hash = '#/';
  route();
}
