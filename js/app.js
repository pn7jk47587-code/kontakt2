/* Kontaktbogen: Filmrollen, Bilder, Notizen. Läuft komplett im Browser, Daten in IndexedDB. */
const SEED_VERSION = 19;
const view = document.getElementById('view');
const titleEl = document.getElementById('title');
const WORDMARK = '<span class="wordmark" aria-label="Lightleak">light<span>leak</span></span>';
const backBtn = document.getElementById('backBtn');
const topAction = document.getElementById('topAction');

const STATUS = {
  entwurf: { label: 'In der Kamera', short: 'In der Kamera' },
  belichtet: { label: 'In Entwicklung', short: 'In Entwicklung' },
  entwickelt: { label: 'Fotoalbum', short: 'Fotoalbum' }
};
const TYPES = { sw: 'Schwarzweiß', 'sw-c41': 'Schwarzweiß (C-41)', 'sw-umkehr': 'Schwarzweiß-Umkehr', ir: 'Infrarot (SW)', farbneg: 'Farbnegativ', dia: 'Dia', sonst: 'Sonstiges' };
const FORMATS = ['Kleinbild (135)', 'Mittelformat (120)', 'Halbformat', 'Instant', 'Sonstiges'];


/* ---------- Start ---------- */
async function boot() {
  const meta = await DB.get('meta', 'seed');
  if (!meta || meta.v < SEED_VERSION) {
    // Vivitar Point and Shoot war ein Platzhalter für die Superheadz Olive San: Eintrag umziehen, Rollen und Objektive mitnehmen
    const viv = await DB.get('cameras', 'cam-vivitar-ps');
    if (viv) {
      const seedOs = SEED_CAMERAS.find(c => c.id === 'cam-superheadz-olivesan');
      const os = Object.assign({}, viv, seedOs, { notes: viv.notes, photoId: viv.photoId }); delete os.auto; delete os.shutterAuto; delete os.shutterB; delete os.shutterT;
      await DB.put('cameras', os);
      for (const r of await DB.all('rolls')) if (r.cameraId === viv.id) { r.cameraId = seedOs.id; r.camera = seedOs.maker + ' ' + seedOs.name; await DB.put('rolls', r); }
      for (const l of await DB.all('lenses')) if ((l.cameraIds || []).includes(viv.id)) { l.cameraIds = l.cameraIds.map(x => x === viv.id ? seedOs.id : x); await DB.put('lenses', l); }
      await DB.del('cameras', viv.id);
    }
    const existing = new Set((await DB.all('stocks')).map(s => s.id));
    await DB.putMany('stocks', SEED_STOCKS.filter(s => !existing.has(s.id)));
    // Vorerst wieder: Beispielkameras und -objektive beim ersten Start und einmalig nach diesem Update ergänzen. Vorhandene Einträge bleiben unverändert.
    if (!meta || meta.v < 17) await loadSeedGear();
    else if (meta.v < 19) {
      // Neue Kameras und Objektive vom 25.10.2026 nachtragen, ohne gelöschte Beispielausrüstung zurückzuholen
      const ci = new Set((await DB.all('cameras')).map(c => c.id)), li = new Set((await DB.all('lenses')).map(l => l.id));
      await DB.putMany('cameras', SEED_CAMERAS.filter(c => NEW_GEAR_1025.cams.includes(c.id) && !ci.has(c.id)).map(c => JSON.parse(JSON.stringify(c))));
      await DB.putMany('lenses', SEED_LENSES.filter(l => NEW_GEAR_1025.lenses.includes(l.id) && !li.has(l.id)).map(l => JSON.parse(JSON.stringify(l))));
    }
    for (const c of await DB.all('cameras')) {
      const seed = SEED_CAMERAS.find(x => x.id === c.id);
      if (seed && !c.mount) { c.mount = seed.mount; await DB.put('cameras', c); }
    }
    for (const st of await DB.all('stocks')) {
      if (SEED_FORMATS[st.id] && st.builtin && JSON.stringify(st.formats) !== JSON.stringify(SEED_FORMATS[st.id])) { st.formats = SEED_FORMATS[st.id]; await DB.put('stocks', st); }
    }
    for (const r of await DB.all('rolls')) {
      if (r.dev?.lab === 'Fotocotti') { r.dev.lab = 'Fotokotti'; await DB.put('rolls', r); }
    }
    for (const c of await DB.all('cameras')) {
      const v = SEED_SHUTTERS[c.id];
      if (v && c.shutterFast === undefined && c.auto === undefined) { Object.assign(c, v); await DB.put('cameras', c); }
    }
    for (const l of await DB.all('lenses')) {
      const v = SEED_LENS_APS[l.id];
      if (v && !l.minAp) { l.maxAp = l.maxAp || v.maxAp; l.minAp = v.minAp; await DB.put('lenses', l); }
    }
    // Kameras mit ISO-Rad (Nikon F3, Minolta XG-1) und übliche ISO-Empfehlungen mit Quelle
    if (!meta || meta.v < 15) {
      const dial = { 'cam-nikon-f3': true, 'cam-minolta-xg1': true, 'cam-praktica-l2': false, 'cam-hasselblad-500cm': false, 'cam-superheadz-olivesan': false };
      for (const c of await DB.all('cameras')) if (c.id in dial && c.isoDial === undefined) { c.isoDial = dial[c.id]; await DB.put('cameras', c); }
      const rec = {
        'cinestill-800t': ['500', 'photobite.uk: bei Tageslicht ISO 500; CineStill selbst nennt EI 800 bei Kunstlicht'],
        'kodak-portra400': ['200', 'shootitwithfilm.com, Samantha Stortecky: ISO 200 für warme Farben']
      };
      for (const st of await DB.all('stocks')) if (rec[st.id] && !st.communityIso) { st.communityIso = rec[st.id][0]; st.communitySource = rec[st.id][1]; await DB.put('stocks', st); }
    }
    // Doppelbelichtung war bisher bei jeder Kamera möglich: Häkchen setzen, damit sich nichts ändert
    if (!meta || meta.v < 16) for (const c of await DB.all('cameras')) if (c.multiExp === undefined) { c.multiExp = true; await DB.put('cameras', c); }
    const lensIds = new Set((await DB.all('lenses')).map(l => l.id));
    if (meta && meta.v < 6) await DB.putMany('lenses', SEED_LENSES.filter(l => !lensIds.has(l.id)));
    else if (meta && meta.v < 14) await DB.putMany('lenses', SEED_LENSES.filter(l => l.id === 'lens-olivesan-22' && !lensIds.has(l.id)));
    await DB.put('meta', { id: 'seed', v: SEED_VERSION });
  }
  if (navigator.storage && navigator.storage.persist) {
    try { await navigator.storage.persist(); } catch (_) {}
  }
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  PROFILE = await DB.get('meta', 'profile') || null;
  window.addEventListener('hashchange', route);
  // Fehler sichtbar machen statt still zu scheitern, z. B. wenn ein Bild nicht gespeichert werden kann
  window.addEventListener('unhandledrejection', e => U.toast('Fehler: ' + (e.reason?.message || e.reason)));
  route();
}

// Beispielausrüstung (die Kameras und Objektive der Entwicklerin) für Tests laden. Vorhandene Einträge bleiben unverändert.
const SEED_ISO_DIAL = { 'cam-nikon-f3': true, 'cam-minolta-xg1': true, 'cam-praktica-l2': false, 'cam-hasselblad-500cm': false, 'cam-superheadz-olivesan': false };
async function loadSeedGear() {
  const camIds = new Set((await DB.all('cameras')).map(c => c.id));
  const lensIds = new Set((await DB.all('lenses')).map(l => l.id));
  const cams = SEED_CAMERAS.filter(c => !camIds.has(c.id)).map(c => ({ ...JSON.parse(JSON.stringify(c)), isoDial: SEED_ISO_DIAL[c.id] ?? c.isoDial ?? false, multiExp: c.multiExp ?? true }));
  const lenses = SEED_LENSES.filter(l => !lensIds.has(l.id)).map(l => JSON.parse(JSON.stringify(l)));
  await DB.putMany('cameras', cams);
  await DB.putMany('lenses', lenses);
  return cams.length + lenses.length;
}

// Kopfzeile: links immer die Startseite (Kreis mit App-Symbol), rechts immer das Profil
function setHeader(title, { action = '' } = {}) {
  titleEl.textContent = title || '';
  const has = !!PROFILE;
  document.getElementById('homeBtn').hidden = !has;
  const prof = document.getElementById('profBtn');
  prof.hidden = !has;
  prof.classList.toggle('here', location.hash.startsWith('#/profil'));
  document.getElementById('homeBtn').classList.toggle('here', !location.hash || location.hash === '#/' || location.hash === '#');
  if (has) avatarHtml(34).then(h => { prof.querySelector('.whoav').innerHTML = h; });
  topAction.innerHTML = action;
}

function setTab() {}

async function route() {
  await routeView();
  if (typeof TOUR !== 'undefined') TOUR.after();
  // Nach „Haken“ aus Kamera oder Objektiv: an dieselbe Stelle zurückscrollen
  try {
    const r = JSON.parse(sessionStorage.getItem('kb-restore') || 'null');
    if (r && r.hash === (location.hash || '#/')) { sessionStorage.removeItem('kb-restore'); requestAnimationFrame(() => window.scrollTo(0, r.y)); }
  } catch (_) {}
}
// Merkt sich Seite und Scrollposition, bevor man eine Kamera oder ein Objektiv öffnet
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#/kamera/"], a[href^="#/objektiv/"], [data-add]');
  if (!a) return;
  try {
    const st = JSON.parse(sessionStorage.getItem('kb-return') || '[]');
    st.push({ hash: location.hash || '#/', y: window.scrollY });
    sessionStorage.setItem('kb-return', JSON.stringify(st.slice(-10)));
  } catch (_) {}
}, true);
function gearDoneButton() {
  const done = document.createElement('button');
  done.className = 'donebtn'; done.setAttribute('aria-label', 'Fertig, eine Ebene zurück'); done.innerHTML = ART.check;
  document.body.appendChild(done);
  done.addEventListener('click', () => {
    try { if (sessionStorage.getItem('kb-newgear')) U.haptic([20, 60, 20]); } catch (_) {}
    let r = null, st = [];
    try { st = JSON.parse(sessionStorage.getItem('kb-return') || '[]'); } catch (_) {}
    while (st.length && (!r || r.hash === location.hash)) r = st.pop();
    if (!r || r.hash === location.hash) r = { hash: '#/profil', y: 0 };
    try { sessionStorage.setItem('kb-restore', JSON.stringify(r)); sessionStorage.setItem('kb-return', JSON.stringify(st)); } catch (_) {}
    document.activeElement?.blur();
    setTimeout(() => { location.hash = r.hash; }, 380);   // Autospeichern der Felder abwarten
  });
}

// Eine Ebene zurück: offenes Fenster schließen, sonst zur übergeordneten Seite
async function goUp() {
  const modals = document.querySelectorAll('.modalbg');
  if (modals.length) { modals[modals.length - 1].remove(); return; }
  const sheet = document.querySelector('.loadsheet #lsClose');
  if (sheet) { sheet.click(); return; }
  const parts = (location.hash.replace(/^#\/?/, '') || '').split('/').filter(Boolean);
  if (parts[0] === 'album' && parts[2] === 'buch') { location.hash = '#/album/' + parts[1]; return; }
  const done = document.querySelector('.donebtn');
  if (done) { done.click(); return; }
  const up = { rolle: '#/', album: '#/', film: '#/filme', filme: '#/profil', rechner: '#/profil', mehr: '#/profil', kameras: '#/profil', 'alle-fotos': '#/profil', tagebuch: '#/profil', profil: '#/' }[parts[0]];
  if (parts.length) location.hash = up || '#/';
}

// Aus der oberen linken Ecke bewusst nach unten rechts wischen: eine Ebene zurück (ohne Anzeige).
// Ausgewertet wird schon während der Bewegung, weil iOS das Ende einer Berührung beim Scrollen verschlucken kann.
// Funktioniert mit dem Finger und am Computer mit gedrückter Maustaste.
(() => {
  let s = null;
  const begin = (x, y) => { s = x <= 90 && y <= 240 ? { x, y, fired: false } : null; };
  const move = (x, y, e) => {
    if (!s || s.fired) return;
    const dx = x - s.x, dy = y - s.y;
    if (dx > 10 && dy > 0 && e && e.cancelable) e.preventDefault();   // Seite nicht mitscrollen
    if (dx > 55 && dy > 45 && dy < dx * 2.5) { s.fired = true; goUp(); }
  };
  document.addEventListener('touchstart', e => begin(e.touches[0].clientX, e.touches[0].clientY), { passive: true, capture: true });
  document.addEventListener('touchmove', e => move(e.touches[0].clientX, e.touches[0].clientY, e), { passive: false, capture: true });
  document.addEventListener('touchend', e => { if (s?.fired) e.stopPropagation(); s = null; }, { capture: true });
  document.addEventListener('touchcancel', () => { s = null; }, { capture: true });
  document.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') begin(e.clientX, e.clientY); }, true);
  document.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' && e.buttons) move(e.clientX, e.clientY); }, true);
  document.addEventListener('pointerup', e => { if (e.pointerType === 'mouse') { if (s?.fired) { const stop = ev => { ev.stopPropagation(); ev.preventDefault(); }; document.addEventListener('click', stop, { capture: true, once: true }); setTimeout(() => document.removeEventListener('click', stop, true), 60); } s = null; } }, true);
})();

// Fenster und die „Film einlegen“-Karte nach unten wegwischen
(() => {
  let d = null;
  document.addEventListener('touchstart', e => {
    const m = e.target.closest('.modal, .loadsheet');
    if (!m) return;
    const scroller = m.classList.contains('loadsheet') ? m.querySelector('.lsbody') : m;
    if (scroller.scrollTop > 0 && !e.target.closest('.lshead')) return;
    d = { m, y: e.touches[0].clientY, x: e.touches[0].clientX, dy: 0 };
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!d) return;
    d.dy = e.touches[0].clientY - d.y;
    if (d.dy > 0 && Math.abs(e.touches[0].clientX - d.x) < d.dy) { d.m.style.transition = 'none'; d.m.style.translate = `0 ${d.dy}px`; }
  }, { passive: true });
  document.addEventListener('touchend', () => {
    if (!d) return;
    const { m, dy } = d; d = null;
    m.style.transition = ''; m.style.translate = '';
    if (dy > 110) {
      if (m.classList.contains('loadsheet')) m.querySelector('#lsClose')?.click();
      else m.closest('.modalbg')?.remove();
    }
  });
})();

// Offenes Fenster: Hintergrund steht still. Das Fenster selbst federt beim Ziehen nach oben ein Stück mit und schnappt zurück.
(() => {
  let lock = null;
  const OPEN = '.modalbg, .loadsheet';
  const apply = () => {
    const open = !!document.querySelector(OPEN);
    if (open && !lock) {
      lock = { y: window.scrollY, hash: location.hash };
      Object.assign(document.body.style, { position: 'fixed', top: -lock.y + 'px', left: '0', right: '0' });
      document.documentElement.classList.add('locked');
    } else if (!open && lock) {
      const { y, hash } = lock; lock = null;
      Object.assign(document.body.style, { position: '', top: '', left: '', right: '' });
      document.documentElement.classList.remove('locked');
      if (location.hash === hash) window.scrollTo(0, y);
    }
  };
  new MutationObserver(apply).observe(document.body, { childList: true });
  let t = null;
  const damp = d => Math.sign(d) * Math.min(48, Math.pow(Math.abs(d), 0.72));
  document.addEventListener('touchstart', e => {
    if (!lock) return;
    const m = e.target.closest('.modal, .loadsheet');
    t = { y: e.touches[0].clientY, m, sc: m ? (m.classList.contains('loadsheet') ? m.querySelector('.lsbody') : m) : null, moved: false };
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!lock || !t) return;
    if (!t.m) { e.preventDefault(); return; }               // Hintergrund: nichts bewegt sich
    if (e.target.closest('input[type=range]')) return;
    const dy = e.touches[0].clientY - t.y, sc = t.sc;
    const atEnd = sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 1;
    if (dy < 0 && atEnd) {                                   // weiter nach oben ziehen, obwohl nichts mehr kommt
      e.preventDefault();
      t.moved = true;
      t.m.style.transition = 'none';
      t.m.style.translate = `0 ${damp(dy)}px`;
    }
  }, { passive: false });
  document.addEventListener('touchend', () => {
    if (t?.moved) {
      const m = t.m;
      m.style.transition = 'translate .5s cubic-bezier(.2,1.25,.4,1)';
      m.style.translate = '';
      setTimeout(() => { m.style.transition = ''; }, 520);
    }
    t = null;
  });
})();

// Gerade neu angelegte Kamera, Objektiv oder Film: dort gibt es noch keinen Löschen-Knopf
let FRESH_ID = null;
async function routeView() {
  if (FRESH_ID && !location.hash.endsWith('/' + FRESH_ID)) FRESH_ID = null;
  document.body.classList.remove('albummode');
  document.querySelectorAll('.modalbg, .overlay').forEach(x => x.remove());
  document.querySelectorAll('.donebtn, .framenavbtn, .loadsheet').forEach(x => x.remove()); document.body.classList.remove('sheetopen');
  const parts = (location.hash.replace(/^#\/?/, '') || '').split('/').filter(Boolean);
  window.scrollTo(0, 0);
  try {
    if (!PROFILE && parts[0] !== 'willkommen') { location.replace('#/willkommen'); return; }
    if (parts.length === 0) return await viewRolls();
    switch (parts[0]) {
      case 'rolle':
        if (parts[1] === 'neu') return await viewNewRoll(parts[2] === '2' ? 2 : 1);
        if (parts[2] === 'abgabe') return await viewHandover(parts[1]);
        return await viewRoll(parts[1], parts[2] || 'bilder');
      case 'album': return parts[2] === 'buch' ? await viewAlbumBook(parts[1]) : await viewAlbum(parts[1]);
      case 'foto': return await viewPhoto(parts[1], parts[2]);
      case 'alle-fotos': return await viewAllPhotos();
      case 'kameras': return await viewCameras();
      case 'kamera': return await viewCamera(parts[1]);
      case 'objektiv': return await viewLens(parts[1]);
      case 'bild': return await viewFrame(parts[1]);
      case 'willkommen': return await viewWelcome();
      case 'profil': return await viewProfile();
      case 'rechner': return await viewCalc();
      case 'filme': return await viewStocks();
      case 'film': return await viewStock(parts[1]);
      case 'mehr': return await viewMore();
      case 'tagebuch': return parts[1] ? await viewDiary(parts[1]) : await viewDiaryList();
      default: return await viewRolls();
    }
  } catch (e) {
    console.error(e);
    view.innerHTML = `<div class="empty">Fehler: ${U.esc(e.message)}</div>`;
  }
}

/* ---------- Formular-Bindung mit Autospeichern ---------- */
function getPath(o, p) { return p.split('.').reduce((a, k) => (a == null ? a : a[k]), o); }
function setPath(o, p, v) {
  const ks = p.split('.'); let cur = o;
  ks.slice(0, -1).forEach(k => { if (cur[k] == null || typeof cur[k] !== 'object') cur[k] = {}; cur = cur[k]; });
  cur[ks[ks.length - 1]] = v;
}
function bind(root, obj, store, after) {
  root.querySelectorAll('[data-f]').forEach(el => {
    const v = getPath(obj, el.dataset.f);
    if (el.type === 'checkbox') el.checked = !!v;
    else if (el.type === 'radio') el.checked = (v === el.value);
    else if (v != null) el.value = v;
  });
  let timer;
  const save = () => { clearTimeout(timer); timer = setTimeout(async () => { obj.updatedAt = new Date().toISOString(); await DB.put(store, obj); after && after(); }, 350); };
  root.addEventListener('input', e => {
    const el = e.target.closest('[data-f]'); if (!el) return;
    let v = el.type === 'checkbox' ? el.checked : el.value;
    if (el.dataset.num !== undefined) v = v === '' ? null : Number(v);
    if (el.type === 'radio' && !el.checked) return;
    setPath(obj, el.dataset.f, v);
    save();
  });
  root.addEventListener('change', e => {
    const el = e.target.closest('[data-f]');
    if (!el) return;
    if (el.type === 'checkbox') { setPath(obj, el.dataset.f, el.checked); save(); }
    else if ((el.type === 'radio' && el.checked) || el.tagName === 'SELECT') {
      setPath(obj, el.dataset.f, el.dataset.num !== undefined ? Number(el.value) : el.value);
      save();
    }
  });
}

function field(label, f, { type = 'text', ph = '', num = false, attrs = '' } = {}) {
  return `<label class="fld"><span>${label}</span><input type="${type}" data-f="${f}" ${num ? 'data-num inputmode="decimal"' : ''} ${attrs}></label>`;
}
function area(label, f, ph = '', rows = 3) {
  return `<label class="fld"><span>${label}</span><textarea data-f="${f}" rows="${rows}"></textarea></label>`;
}
function select(label, f, options) {
  return `<label class="fld"><span>${label}</span><select data-f="${f}">${options.map(([v, t]) => `<option value="${U.esc(v)}">${U.esc(t)}</option>`).join('')}</select></label>`;
}

/* ---------- Daten-Helfer ---------- */
async function framesOf(rollId) {
  const fr = await DB.byIndex('frames', 'rollId', rollId);
  return fr.sort((a, b) => a.index - b.index);
}
async function stocksMap() {
  const m = new Map(); (await DB.all('stocks')).forEach(s => m.set(s.id, s)); return m;
}
async function deleteImage(id) {
  if (!id) return; U.forgetImg(id); await DB.del('images', id);
}

/* ---------- Filme ---------- */
async function viewStocks() {
  setHeader('Alle Filme', { back: true, action: `<a class="btn small" href="#/film/neu">+ Film</a>` });
  const stocks = (await DB.all('stocks')).sort((a, b) => U.stockLabel(a).localeCompare(U.stockLabel(b)));
  const rolls = await DB.all('rolls');
  const count = id => rolls.filter(r => r.stockId === id).length;
  const items = await Promise.all(stocks.map(async s => `
      <a class="item stockitem" href="#/film/${s.id}" data-q="${U.esc((U.stockLabel(s) + ' ' + (s.boxIso || '') + ' ' + (TYPES[s.type] || '')).toLowerCase())}">
        <span class="stockart">${await filmArt(s, 44)}</span>
        <div><b>${U.esc(U.stockLabel(s))}</b><div class="sub2">${TYPES[s.type] || ''} · ISO ${U.esc(s.isoLabel || s.boxIso || '?')}${s.myIso ? ' · ich: ' + U.esc(s.myIso) : ''}</div></div>
        <span class="cnt">${count(s.id) || ''}</span>
      </a>`));
  view.innerHTML = `
    ${gearSwitch('filme')}
    <div class="wizsec"><input type="search" placeholder=" " id="qStock" aria-label="Suchen" autocomplete="off"></div>
    <div class="list" id="stockList">${items.join('')}</div>`;
  view.querySelector('#qStock').addEventListener('input', e => {
    const q = e.target.value.toLowerCase().trim();
    view.querySelectorAll('#stockList .item').forEach(el => { el.hidden = !el.dataset.q.includes(q); });
    const list = view.querySelector('#stockList');
    U.emptyHint(list, q && ![...list.querySelectorAll('.item')].some(el => !el.hidden), UPS_FILM);
  });
}

// Belichtungsrechner für Nachtaufnahmen: Schwarzschild-Korrektur nach der Angabe des jeweiligen Films
const NIGHT_TIMES = ['1', '2', '4', '8', '15', '30', '60', '120', '240', '480'];
const fmtLong = t => t >= 60 ? `${Math.floor(t / 60)} min${Math.round(t % 60) ? ' ' + Math.round(t % 60) + ' s' : ''}` : U.fmtSec(t);
function ruleText(st) {
  const r = st?.reciprocity;
  if (!r) return 'Für diesen Film ist keine Herstellerangabe hinterlegt.';
  if (r.model === 'power') return `Bis ${r.threshold || 1} s keine Korrektur, darüber Tc = Tm^${String(r.p).replace('.', ',')}.`;
  if (r.model === 'table') return `Herstellertabelle: ${r.points.map(([m, c]) => `${fmtLong(m)} → ${fmtLong(c)}`).join(', ')}. Zwischenwerte rechnet die App logarithmisch.`;
  if (r.model === 'none') return `Bis ${r.upTo} s keine Korrektur. Für längere Zeiten nennt der Hersteller keine Werte.`;
  if (r.model === 'custom' && r.p) return `Eigener Faktor: Tc = Tm^${String(r.p).replace('.', ',')}.`;
  return 'Für diesen Film sind keine geprüften Werte hinterlegt.';
}
async function viewCalc() {
  setHeader('Belichtungsrechner');
  const stocks = (await DB.all('stocks')).sort((a, b) => U.stockLabel(a).localeCompare(U.stockLabel(b)));
  let last = null;
  try { last = localStorage.getItem('kb-night-stock'); } catch (_) {}
  view.innerHTML = `
    <div class="card night">
      <h3 class="sub nighthead">${ART.moon}Nachtaufnahme</h3>
      <div class="fld"><span>Film</span>
      <div class="searchrow"><input type="search" placeholder=" " id="rcQ" aria-label="Film suchen" autocomplete="off"><select id="rcStock">${stocks.map(s => `<option value="${s.id}"${s.id === last ? ' selected' : ''}>${U.esc(U.stockLabel(s))}${s.reciprocity && s.reciprocity.model !== 'unknown' ? '' : ' (keine Angabe)'}</option>`).join('')}</select></div>
      <p class="ups" id="rcNone" hidden>Ups, der Film ist hier noch nicht gespeichert. <a href="#/film/neu">Film anlegen</a></p></div>
      <div class="rule" id="rcRule"></div>
      <div class="qlabel">Gemessene Zeit</div>
      <div class="chipwrap" id="rcChips">${NIGHT_TIMES.map(t => `<button type="button" class="chip" data-t="${t}">${fmtLong(Number(t))}</button>`).join('')}
        <input class="chip-input" id="rcTime" placeholder="andere"></div>
      <div id="rcOut" class="nightout"></div>
      <div id="rcTable"></div>
    </div>`;
  const $ = id => view.querySelector('#' + id);
  const stock = () => stocks.find(s => s.id === $('rcStock').value);
  const showRule = () => {
    const st = stock(), r = st?.reciprocity;
    const src = r?.source;
    $('rcRule').innerHTML = `<p>${U.esc(ruleText(st))}</p>${st?.nightNotes ? `<p class="hint">${U.esc(st.nightNotes)}</p>` : ''}${src ? `<p class="hint">Quelle: ${src.url ? `<a href="${U.esc(src.url)}" target="_blank" rel="noopener">${U.esc(src.label)}</a>` : U.esc(src.label)}</p>` : ''}`;
    const rows = NIGHT_TIMES.map(Number).map(t => { const x = U.reciprocity(st, t); return x.ok ? `<tr><td>${fmtLong(t)}</td><td>${fmtLong(x.tc)}</td></tr>` : ''; }).join('');
    $('rcTable').innerHTML = rows ? `<table class="nighttable"><thead><tr><th>gemessen</th><th>belichten</th></tr></thead><tbody>${rows}</tbody></table>` : '';
  };
  const calc = t => {
    const out = $('rcOut');
    if (!(t > 0)) { out.innerHTML = ''; return; }
    const r = U.reciprocity(stock(), t);
    out.innerHTML = r.ok
      ? `<span class="sub2">Belichten</span><b>${fmtLong(r.tc)}</b><span class="sub2">${r.tc > t ? (Math.log2(r.tc / t)).toFixed(1).replace('.', ',') + ' Blenden mehr · ' : ''}${U.esc(r.note)}</span>`
      : `<span class="sub2">${U.esc(r.msg)}</span>`;
  };
  let cur = null;
  $('rcChips').addEventListener('click', e => {
    const b = e.target.closest('[data-t]'); if (!b) return;
    cur = Number(b.dataset.t); $('rcTime').value = '';
    view.querySelectorAll('#rcChips .chip').forEach(c => c.classList.toggle('on', c === b));
    calc(cur);
  });
  $('rcTime').addEventListener('input', e => { cur = U.parseShutter(e.target.value); view.querySelectorAll('#rcChips .chip').forEach(c => c.classList.remove('on')); calc(cur); });
  // Suche: Liste auf passende Filme eingrenzen und den ersten Treffer wählen
  $('rcQ').addEventListener('input', e => {
    const q = e.target.value.toLowerCase().trim();
    let first = null;
    [...$('rcStock').options].forEach(o => { const hit = !q || o.textContent.toLowerCase().includes(q); o.hidden = !hit; o.disabled = !hit; if (hit && !first) first = o; });
    $('rcNone').hidden = !!first;
    if (first && $('rcStock').selectedOptions[0]?.hidden !== false) { $('rcStock').value = first.value; }
    if (first && $('rcStock').value !== first.value && $('rcStock').selectedOptions[0].hidden) $('rcStock').value = first.value;
    if (first) { $('rcStock').dispatchEvent(new Event('change')); }
  });
  $('rcStock').addEventListener('change', () => { try { localStorage.setItem('kb-night-stock', $('rcStock').value); } catch (_) {} showRule(); calc(cur); });
  showRule();
}

function setupLatitude(box, stocks) {
  const $ = id => box.querySelector('#' + id);
  const stockOf = () => stocks.find(s => s.id === $('laStock').value);
  const fillEi = () => { const st = stockOf(); $('laEi').value = parseFloat(st?.myIso) || st?.boxIso || ''; };
  fillEi();
  const calc = () => {
    const st = stockOf();
    const ref = $('laRef').value;
    $('laMeter').hidden = ref !== 'meter';
    $('laMeterHint').hidden = ref !== 'meter';
    $('laEvBox').hidden = ref !== 'ev';
    const out = $('laOut');
    const src = $('laSrc');
    const ei = parseFloat(String($('laEi').value).replace(',', '.'));
    const N = U.parseAperture($('laN').value);
    const t = U.parseShutter($('laT').value);
    src.innerHTML = '';
    if (!(ei > 0 && N > 0 && t > 0)) { out.innerHTML = '<span class="sub2">EI, Blende und Zeit eintragen.</span>'; return; }
    let lo, hi;
    if (ref === 'meter') {
      const mN = U.parseAperture($('laMN').value), mT = U.parseShutter($('laMT').value);
      if (!(mN > 0 && mT > 0)) { out.innerHTML = '<span class="sub2">Gemessene Blende und Zeit eintragen.</span>'; return; }
      // Messung gilt für das EI; auf ISO 100 zurückrechnen. Gemessene Zeit ist unkorrigiert (Messwert).
      lo = hi = U.evOf(mN, mT) - Math.log2(ei / 100);
    } else if (ref === 'ev') {
      const ev = parseFloat(String($('laEv').value).replace(',', '.'));
      if (isNaN(ev)) { out.innerHTML = '<span class="sub2">Lichtwert eintragen.</span>'; return; }
      lo = hi = ev;
    } else {
      const sc = EV_SCENES[Number(ref.slice(1))]; lo = sc[1]; hi = sc[2];
      src.innerHTML = `Lichtwerte: <a href="${EV_SOURCE.url}" target="_blank" rel="noopener">${U.esc(EV_SOURCE.label)}</a>. Richtwerte, die echte Szene kann deutlich abweichen.`;
    }
    const r = U.latitude({ stock: st, ei, N, t, evNeedLo: lo, evNeedHi: hi });
    const dev = r.devMin === r.devMax ? U.fmtStops(r.devMin) : `${U.fmtStops(r.devMin)} bis ${U.fmtStops(r.devMax)}`;
    const mid = (r.devMin + r.devMax) / 2;
    const word = Math.abs(mid) < 0.15 ? 'passend belichtet' : (mid > 0 ? 'überbelichtet' : 'unterbelichtet');
    // Spielraum des Films
    const lu = parseFloat(st?.latUnder), lov = parseFloat(st?.latOver);
    let verdict = '', band = null;
    if (lu > 0 && lov > 0) {
      band = [-lu, lov];
      const inside = r.devMin >= -lu && r.devMax <= lov;
      const partly = !inside && r.devMax >= -lu && r.devMin <= lov;
      verdict = inside ? `<span class="ok">Liegt im eingetragenen Spielraum (−${lu} / +${lov}).</span>`
        : partly ? `<span class="warn">Liegt teilweise außerhalb des eingetragenen Spielraums (−${lu} / +${lov}).</span>`
        : `<span class="bad">Liegt außerhalb des eingetragenen Spielraums (−${lu} / +${lov}).</span>`;
      if (st.latSource) verdict += `<br><span class="sub2">Quelle Spielraum: ${U.esc(st.latSource)}</span>`;
    } else {
      verdict = `<span class="sub2">Für diesen Film ist kein Spielraum eingetragen. Du kannst ihn unter Filme → ${U.esc(U.stockLabel(st))} ergänzen.</span>`;
      if (st?.type === 'farbneg') verdict += `<br><span class="sub2">${U.esc(LAB_LATITUDE_NOTE.text)} <a href="${LAB_LATITUDE_NOTE.url}" target="_blank" rel="noopener">Quelle</a></span>`;
    }
    let recip = '';
    if (r.recipApplied) recip = `<br><span class="sub2">Schwarzschild berücksichtigt: ${U.fmtSec(t)} wirken auf diesem Film wie ${U.fmtSec(r.tEffective)}.</span>`;
    if (r.recipUnknown) recip = `<br><span class="sub2">Achtung: Für Zeiten über 1 s fehlen Schwarzschild-Werte. Die Abweichung ist ohne Korrektur gerechnet und fällt in Wirklichkeit eher zur Unterbelichtung aus.</span>`;
    const ideal = `<br><span class="sub2">Bei f/${String(N).replace('.', ',')} wäre ${U.fmtSec(r.tIdeal)} richtig${r.tIdeal > 1 ? (r.tIdealCorrected ? `, mit Schwarzschild ${U.fmtSec(r.tIdealCorrected)}` : ', Schwarzschild-Korrektur unbekannt') : ''}.</span>`;
    out.innerHTML = `<b>${dev} Blenden</b> · ${word}${ideal}${recip}${latBar(r.devMin, r.devMax, band)}<div>${verdict}</div>`;
  };
  $('laStock').addEventListener('change', () => { fillEi(); calc(); });
  box.addEventListener('input', calc);
  box.addEventListener('change', calc);
  calc();
}

function latBar(a, b, band) {
  const min = -6, max = 8, pct = v => ((Math.max(min, Math.min(max, v)) - min) / (max - min)) * 100;
  const ticks = [];
  for (let v = min; v <= max; v += 2) ticks.push(`<span style="left:${pct(v)}%">${v > 0 ? '+' + v : v}</span>`);
  return `<div class="latbar" aria-hidden="true">
    ${band ? `<div class="latband" style="left:${pct(band[0])}%;width:${pct(band[1]) - pct(band[0])}%"></div>` : ''}
    <div class="latzero" style="left:${pct(0)}%"></div>
    <div class="latmark" style="left:${pct(a)}%;width:${Math.max(1.2, pct(b) - pct(a))}%"></div>
    <div class="latticks">${ticks.join('')}</div>
  </div>`;
}

async function viewStock(id) {
  let stock;
  if (id === 'neu') {
    stock = { id: U.uid(), maker: '', name: '', type: 'sw', process: 'SW', boxIso: null, reciprocity: { model: 'unknown' }, builtin: false };
    await DB.put('stocks', stock);
    FRESH_ID = stock.id;
    location.replace('#/film/' + stock.id);
    return;
  }
  stock = await DB.get('stocks', id);
  if (!stock) { location.replace('#/filme'); return; }
  setHeader(U.stockLabel(stock), { back: true });
  const r = stock.reciprocity || { model: 'unknown' };
  const src = r.source ? `<a href="${U.esc(r.source.url)}" target="_blank" rel="noopener">${U.esc(r.source.label)}</a>` : 'keine';
  let recipText = '';
  if (r.model === 'power') recipText = `Formel Tc = Tm<sup>${r.p}</sup> für Zeiten über ${r.threshold || 1} s.`;
  else if (r.model === 'table') recipText = 'Tabelle: ' + r.points.filter(p => p[0] >= 1).map(p => `${p[0]} s → ${p[1]} s`).join(', ') + '.';
  else if (r.model === 'none') recipText = `Bis ${r.upTo} s keine Korrektur, darüber keine Herstellerwerte.`;
  else if (r.model === 'custom') recipText = 'Eigener Faktor.';
  else recipText = 'Keine geprüften Herstellerwerte hinterlegt.';

  const rolls = (await DB.all('rolls')).filter(x => x.stockId === id);
  view.innerHTML = `
  <div class="artrow">
    <div class="artbox" id="stockArt">${await filmArt(stock, 120)}</div>
    <div class="artbtns">
      <label class="btn ghost small">${stock.photoId ? 'Foto ersetzen' : 'Foto der Packung'}<input type="file" accept="image/*" hidden id="stockPhoto"></label>
      ${stock.photoId ? '<button class="btn ghost small" id="stockPhotoRm">Foto entfernen</button>' : ''}
      <p class="hint">Ohne eigenes Foto zeigt die App eine neutrale Filmdose mit ISO.</p>
    </div>
  </div>
  <div class="card" id="sf">
    ${field('Hersteller', 'maker')}
    ${field('Name', 'name')}
    ${select('Typ', 'type', Object.entries(TYPES))}
    ${select('Prozess', 'process', [['SW', 'SW'], ['C-41', 'C-41'], ['E-6', 'E-6'], ['ECN-2', 'ECN-2'], ['sonst', 'Sonstiges']])}
    ${field('Box Speed (ISO)', 'boxIso', { num: true })}
    <div class="fld"><span>Erhältlich als</span><div class="chips" id="fmtChips">${[['135', 'Kleinbild'], ['120', 'Mittelformat'], ['110', '110']].map(([k, t]) => `<button type="button" class="chip${(stock.formats || []).includes(k) ? ' on' : ''}" data-fmt="${k}">${t}</button>`).join('')}</div>
    <p class="hint">Ohne Auswahl erscheint der Film bei Kleinbild und Mittelformat.</p></div>
    ${stock.makerNote ? `<div class="note">${U.esc(stock.makerNote)}<br><span class="sub2">Quelle: ${src}</span></div>` : ''}
    <h3 class="sub">Empfohlene ISO (allgemeine Meinung)</h3>
    ${field('Wert', 'communityIso')}
    ${field('Quelle dafür', 'communitySource')}
    <h3 class="sub">Eigene Präferenz</h3>
    ${field('Meine ISO/EI', 'myIso')}
    ${area('Warum, Erfahrungen', 'myNotes', 'Entwickler, Licht, Ergebnis …')}
    <h3 class="sub">Nacht und Langzeit</h3>
    <div class="note">${recipText}<br><span class="sub2">Quelle: ${src}</span></div>
    <h3 class="sub">Belichtungsspielraum</h3>
    <p class="hint">Für den Rechner. Nur mit Quelle oder eigenen Tests eintragen.</p>
    <div class="two">
      ${field('Blenden unter', 'latUnder', { num: true })}
      ${field('Blenden über', 'latOver', { num: true })}
    </div>
    ${field('Quelle Spielraum', 'latSource')}
    ${area('Belichtungsspielraum nachts (eigene Notizen)', 'nightNotes', 'Wie verhält sich der Film bei Unterbelichtung, Lichtquellen, Langzeit?', 4)}
    ${r.model === 'unknown' || r.model === 'custom' || !stock.builtin ? `
      <h3 class="sub">Eigener Schwarzschild-Faktor</h3>
      <p class="hint">Nur eintragen, wenn du eine Quelle oder eigene Tests hast. Formel Tc = Tm^p.</p>
      ${field('Faktor p', 'reciprocity.p', { num: true })}` : ''}
    ${field('Datenblatt-Link', 'datasheet', { type: 'url' })}
  </div>
  <a class="btn ghost wide" href="#/tagebuch/${stock.id}" style="margin:0 16px 12px;width:calc(100% - 32px)">Filmtagebuch zu diesem Film</a>
  <div class="card"><h3 class="sub">Rollen mit diesem Film</h3>${rolls.length ? rolls.map(x => `<a class="item" href="#/rolle/${x.id}"><span>${U.esc(x.title || U.fmtDate(x.loadedAt) || 'Rolle')}</span><span class="sub2">EI ${U.esc(x.ei || stock.boxIso || '?')}</span></a>`).join('') : '<p class="hint">Noch keine.</p>'}</div>
  ${rolls.length || FRESH_ID === stock.id ? '' : '<button class="btn danger wide" id="delStock">Film löschen</button>'}`;
  bind(view.querySelector('#sf'), stock, 'stocks', () => {
    if (stock.reciprocity && stock.reciprocity.p && stock.reciprocity.model === 'unknown') { stock.reciprocity.model = 'custom'; DB.put('stocks', stock); }
    setHeader(U.stockLabel(stock), { back: true });
  });
  view.querySelector('#fmtChips').addEventListener('click', async e => {
    const b = e.target.closest('[data-fmt]'); if (!b) return;
    const set = new Set(stock.formats || []);
    set.has(b.dataset.fmt) ? set.delete(b.dataset.fmt) : set.add(b.dataset.fmt);
    stock.formats = set.size ? [...set] : undefined;
    b.classList.toggle('on', set.has(b.dataset.fmt));
    await DB.put('stocks', stock);
  });
  view.querySelector('#stockPhoto').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    const rec = await U.storeImage(f, 'pack');
    await deleteImage(stock.photoId); stock.photoId = rec.id; await DB.put('stocks', stock); route();
  });
  view.querySelector('#stockPhotoRm')?.addEventListener('click', async () => {
    await deleteImage(stock.photoId); stock.photoId = null; await DB.put('stocks', stock); route();
  });
  view.querySelector('#delStock')?.addEventListener('click', async () => {
    if (!confirm('Film aus der Bibliothek löschen?')) return;
    await DB.del('stocks', stock.id); location.replace('#/filme');
  });
}

/* ---------- Mehr: Backup, Speicher ---------- */
async function viewMore() {
  setHeader('Sicherung und Speicher', { back: true });
  let est = '';
  if (navigator.storage?.estimate) {
    try {
      const e = await navigator.storage.estimate();
      est = `Belegt: ${(e.usage / 1048576).toFixed(1).replace('.', ',')} MB von ca. ${(e.quota / 1073741824).toFixed(1).replace('.', ',')} GB`;
    } catch (_) {}
  }
  let persisted = null;
  try { persisted = navigator.storage?.persisted ? await navigator.storage.persisted() : null; } catch (_) {}
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const lastBackup = (await DB.get('meta', 'backup'))?.at;
  const t = MOOD.sunTimes(new Date());
  const hm = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.round(m % 60)).padStart(2, '0')}`;
  view.innerHTML = `
  <div class="card">
    <h3 class="sub">Licht</h3>
    <div class="moodpick" id="mood">
      ${[['auto', 'Automatisch'], ['sun', 'Sonne'], ['moon', 'Mond']].map(([k, l]) => `<button type="button" data-mood="${k}" class="${MOOD.pref() === k ? 'on' : ''}">${l}</button>`).join('')}
    </div>
    <p class="hint">Automatisch: Sonne von etwa ${hm(t.rise)} bis ${hm(t.set)} Uhr, danach Mondschein. Gerechnet für die Mitte Deutschlands, auf ein paar Minuten genau.</p>
  </div>
  <div class="card">
    <h3 class="sub">Sicherung</h3>
    <p>Alle Daten liegen nur auf diesem Gerät. Eine Sicherung als ZIP-Datei schützt vor Datenverlust, etwa beim Löschen der Website-Daten oder einem Gerätewechsel.</p>
    <p class="hint">Letzte Sicherung: ${lastBackup ? U.fmtDate(lastBackup) : 'noch keine'}</p>
    <button class="btn wide" id="exp">Sicherung erstellen</button>
    <label class="btn ghost wide">Sicherung einspielen<input type="file" accept=".zip,application/zip" hidden id="imp"></label>
  </div>
  <div class="card">
    <h3 class="sub">Speicher</h3>
    <p>${est || 'Speicherbelegung nicht abrufbar.'}</p>
    <p>Als App installiert: ${standalone ? 'ja' : 'nein. In Safari „Teilen“ → „Zum Home-Bildschirm“ wählen und nur noch das Symbol verwenden.'}</p>
    ${persisted !== null ? `<p>Dauerhafter Speicher gewährt: ${persisted ? 'ja' : 'nein'}</p>` : ''}
  </div>
  <div class="card">
    <h3 class="sub">Geplant</h3>
    <p>Belichtungsmesser mit Vorschau verschiedener Einstellungen.</p>
    <p>Film selbst entwickeln: Ablauf mit Chemie, Zeiten und Temperaturen.</p>
  </div>
  <div class="card">
    <h3 class="sub">Alles löschen</h3>
    <button class="btn danger wide" id="wipe">Alle Daten auf diesem Gerät löschen</button>
  </div>
  <p class="hint pad">Bibliotheken: JSZip, exifr (Lizenzen im Ordner vendor).</p>`;
  view.querySelector('#mood').addEventListener('click', e => {
    const b = e.target.closest('[data-mood]'); if (!b) return;
    MOOD.set(b.dataset.mood);
    view.querySelectorAll('#mood button').forEach(x => x.classList.toggle('on', x === b));
  });
  view.querySelector('#exp').addEventListener('click', exportZip);
  view.querySelector('#imp').addEventListener('change', e => importZip(e.target.files[0]));
  view.querySelector('#wipe').addEventListener('click', async () => {
    if (!confirm('Wirklich alle Rollen, Bilder und Filme auf diesem Gerät löschen?')) return;
    if (!confirm('Letzte Rückfrage: Ohne Sicherung sind die Daten weg.')) return;
    for (const s of DB.STORES) await DB.clear(s);
    location.hash = '#/'; location.reload();
  });
}

async function exportZip() {
  U.toast('Erstelle Sicherung …');
  const zip = new JSZip();
  const data = { app: 'kontaktbogen', version: 1, exportedAt: new Date().toISOString() };
  for (const s of ['stocks', 'cameras', 'lenses', 'fridge', 'rolls', 'frames', 'meta']) data[s] = await DB.all(s);
  const imgs = await DB.all('images');
  data.images = imgs.map(({ blob, thumb, data, tdata, ...rest }) => rest);
  zip.file('daten.json', JSON.stringify(data, null, 1));
  for (const i of imgs) {
    zip.file(`bilder/${i.id}.jpg`, U.recBlob(i));
    zip.file(`bilder/${i.id}_klein.jpg`, U.recBlob(i, true));
  }
  const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
  const name = `lightleak-${U.today()}.zip`;
  const file = new File([blob], name, { type: 'application/zip' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name }); }
    catch (e) { if (e.name !== 'AbortError') downloadBlob(blob, name); else return; }
  } else downloadBlob(blob, name);
  await DB.put('meta', { id: 'backup', at: new Date().toISOString() });
  U.toast('Sicherung erstellt');
}
function downloadBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

async function importZip(file) {
  if (!file) return;
  if (!confirm('Sicherung einspielen? Vorhandene Daten auf diesem Gerät werden dabei ersetzt.')) return;
  try {
    U.toast('Lese Sicherung …');
    const zip = await JSZip.loadAsync(file);
    const data = JSON.parse(await zip.file('daten.json').async('string'));
    if (data.app !== 'kontaktbogen') throw new Error('Keine Lightleak-Sicherung');
    for (const s of DB.STORES) await DB.clear(s);
    for (const s of ['stocks', 'cameras', 'lenses', 'fridge', 'rolls', 'frames', 'meta']) await DB.putMany(s, data[s] || []);
    let n = 0;
    for (const meta of data.images || []) {
      const full = zip.file(`bilder/${meta.id}.jpg`), small = zip.file(`bilder/${meta.id}_klein.jpg`);
      if (!full) continue;
      const data = await full.async('arraybuffer');
      const tdata = small ? await small.async('arraybuffer') : data;
      await DB.put('images', { ...meta, data, tdata, type: 'image/jpeg' });
      if (++n % 10 === 0) U.toast(`Bilder: ${n}/${data.images.length}`);
    }
    U._urls.forEach(u => { if (u.startsWith('blob:')) URL.revokeObjectURL(u); }); U._urls.clear();
    U.toast('Sicherung eingespielt');
    location.hash = '#/';
    route();
  } catch (e) {
    alert('Einspielen fehlgeschlagen: ' + e.message);
  }
}


/* Ein Fenster zieht sich langsam aus dem Knopf auf, wie „Film einlegen“. Gibt die passende Schließen-Funktion zurück. */
function growFrom(ov, btn) {
  const m = ov.querySelector('.modal');
  if (!m || matchMedia('(prefers-reduced-motion: reduce)').matches) return () => ov.remove();
  const ease = 'cubic-bezier(.2,.8,.2,1)', dur = 340; // gleiche Dauer und Kurve wie die Karte „Film einlegen“
  const geo = () => {
    const a = btn.getBoundingClientRect(), b = m.getBoundingClientRect();
    return `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${Math.max(a.width / b.width, .02)}, ${Math.max(a.height / b.height, .02)})`;
  };
  m.style.transformOrigin = '0 0';
  const kids = [...m.children];
  const start = geo();
  m.animate([{ transform: start, borderRadius: '999px' }, { transform: 'none', borderRadius: getComputedStyle(m).borderRadius }], { duration: dur, easing: ease });
  ov.animate([{ backgroundColor: 'transparent', backdropFilter: 'blur(0)' }, {}], { duration: dur, easing: 'ease' });
  kids.forEach(k => k.animate([{ opacity: 0 }, { opacity: 0, offset: .47 }, { opacity: 1 }], { duration: 380, easing: 'ease' }));
  let closing = false;
  return () => {
    if (closing) return; closing = true;
    if (!btn.isConnected) { ov.remove(); return; }
    kids.forEach(k => k.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' }));
    const an = m.animate([{ transform: 'none' }, { transform: geo(), borderRadius: '999px' }], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
    ov.animate([{}, { backgroundColor: 'transparent', backdropFilter: 'blur(0)' }], { duration: 320, fill: 'forwards' });
    an.onfinish = () => ov.remove();
  };
}
