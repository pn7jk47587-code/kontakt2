/* Abzeichen (v191): aus den gespeicherten Daten berechnet, verdiente Stufen mit Datum in meta 'badges'.
   Im Profil: Anstecker am Profilbild (selbst gewählt) und eine Kachel mit allen verdienten Abzeichen.
   Noch nicht verdiente erscheinen nur als Platzhalter, ihre Regeln zeigt die App nicht. */
const BADGES = (() => {
  // cls: Farbe der Kategorie. lv: Schwellen der Stufen 1 bis 3 (ein Wert: nur eine Stufe). txt: wofür, mit {n} für den Schwellenwert
  const DEF = [
    { id: 'kueken', name: 'Küken', cls: 'licht', lv: [1], txt: 'Einführung bis zum Ende durchgegangen' },
    { id: 'frosch', name: 'Laubfrosch', cls: 'wetter', lv: [15, 50, 100], txt: '{n} Fotos bei Regen' },
    { id: 'eisbaer', name: 'Eisbär', cls: 'wetter', lv: [15, 50, 100], txt: '{n} Fotos bei 0 °C oder kälter' },
    { id: 'eidechse', name: 'Eidechse', cls: 'wetter', lv: [15, 50, 100], txt: '{n} Fotos bei 28 °C oder mehr' },
    { id: 'eule', name: 'Eule', cls: 'licht', lv: [25, 100, 250], txt: '{n} Fotos bei Nacht' },
    { id: 'gluehwurm', name: 'Glühwürmchen', cls: 'licht', lv: [15, 50, 100], txt: '{n} Fotos in der blauen Stunde' },
    { id: 'lerche', name: 'Lerche', cls: 'licht', lv: [15, 50, 100], txt: '{n} Fotos in der goldenen Stunde am Morgen' },
    { id: 'elster', name: 'Elster', cls: 'kuehl', lv: [20, 40, 80], txt: '{n} Rollen gleichzeitig im Kühlschrank' },
    { id: 'prepper', name: 'Prepper', cls: 'kuehl', lv: [1, 2, 3], txt: 'Eine Rolle liegt seit {n} {J} unbenutzt im Kühlschrank' },
    { id: 'archaeo', name: 'Archäologin', cls: 'kuehl', lv: [1, 5, 10], txt: '{n} abgelaufene {R} belichtet' },
    { id: 'gas', name: 'GAS-Opfer', cls: 'gear', lv: [1], txt: 'Mehr als 8 Kameras und Objektive, Schnitt der Bewertungen unter 2,5' },
    { id: 'treue', name: 'Treue Seele', cls: 'gear', lv: [10, 25, 50], txt: '{n} Rollen hintereinander mit derselben Kamera' },
    { id: 'krake', name: 'Krake', cls: 'gear', lv: [3, 5, 8], txt: 'Kameras von {n} Herstellern' },
    { id: 'milliardaer', name: 'Milliardär', cls: 'gold', lv: [1], txt: 'Eine Hasselblad im Kameraschrank' },
    { id: 'sniper', name: 'Sniper', cls: 'gear', lv: [100, 500, 1000], txt: '{n} Fotos mit Teleobjektiv' },
    { id: 'schnorrer', name: 'Schnorrer', cls: 'gear', lv: [3, 6, 10], txt: '{n} geschenkte Teile im Kameraschrank' },
    { id: 'leck', name: 'Lightleaker', cls: 'gear', lv: [50, 150, 300], txt: '{n} Fotos mit Lightleak' },
    { id: 'zebra', name: 'Zebra', cls: 'film', lv: [1], txt: 'Vier von fünf Rollen schwarzweiß' },
    { id: 'biene', name: 'Biene', cls: 'film', lv: [1], txt: 'Von jedem großen Hersteller eine Rolle' },
    { id: 'chamaeleon', name: 'Chamäleon', cls: 'film', lv: [10, 25, 50], txt: '{n} verschiedene Filme belichtet' },
    { id: 'matroschka', name: 'Matroschka', cls: 'film', lv: [1], txt: 'Halbformat, Kleinbild, Mittelformat und Großformat belichtet' },
    { id: 'alchemist', name: 'Alchemistin', cls: 'film', lv: [5, 25, 100], txt: '{n} Rollen selbst entwickelt' },
    { id: 'doppel', name: 'Doppelgänger', cls: 'film', lv: [10, 50, 150], txt: '{n} Doppelbelichtungen' },
    { id: 'schnecke', name: 'Schnecke', cls: 'tempo', lv: [6, 12, 24], txt: 'Eine Rolle lag über {n} Monate in der Kamera' },
    { id: 'gepard', name: 'Gepard', cls: 'tempo', lv: [1, 5, 10], txt: '{n} {GR} an einem Tag' },
    { id: 'zugvogel', name: 'Zugvogel', cls: 'ort', lv: [7, 15, 30], txt: 'Fotos in {n} Ländern' },
    { id: 'maulwurf', name: 'Maulwurf', cls: 'ort', lv: [1], txt: 'Vier von fünf Fotos im Umkreis von 3 km um Zuhause' },
    { id: 'loch', name: 'Bodenloses Loch', cls: 'geld', lv: [1000, 5000, 10000], txt: '{n} € ausgegeben' },
    { id: 'adler', name: 'Adlerauge', cls: 'geld', lv: [25, 100, 250], txt: '{n} Fotos mit fünf Leuchtpunkten' },
    { id: 'pech', name: 'Pechvogel', cls: 'tempo', lv: [25, 100, 250], txt: '{n} Fotos mit −3 oder schlechter' },
    { id: 'waage', name: 'Waage', cls: 'tempo', lv: [25, 100, 250], txt: '{n} Fotos mit 0 bewertet' },
    { id: 'archiv', name: 'Archivarin', cls: 'kuehl', lv: [100, 500, 1000], txt: '{n} Fotos ins Archiv nachgetragen' }
  ];
  const BIG_MAKERS = [/kodak/i, /fuji/i, /ilford|harman|kentmere/i, /foma/i, /agfa/i, /cinestill/i, /orwo|wolfen/i];
  const nfmt = n => Number(n).toLocaleString('de-DE');
  const text = (d, lv) => { const n = d.lv[Math.max(0, lv - 1)]; return d.txt.replace('{n}', nfmt(n)).replace('{J}', n === 1 ? 'Jahr' : 'Jahren').replace('{R}', n === 1 ? 'Rolle' : 'Rollen').replace('{GR}', n === 1 ? 'ganze Rolle' : 'ganze Rollen'); };
  const level = (d, v) => { let l = 0; d.lv.forEach((t, i) => { if (v >= t) l = i + 1; }); return l; };
  const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isNaN(n) ? null : n; };
  const gift = v => v !== null && v !== undefined && String(v).trim() !== '' && num(v) === 0;   // Kaufpreis bewusst 0 €
  const day = s => s ? new Date(String(s).slice(0, 10) + 'T00:00:00') : null;
  const timed = f => { const s = String(f.date || ''); return s.length > 10 && !/T12:00/.test(s); };

  async function values() {
    const [allFrames, allRolls, cams, lenses, fridge, stocksM] = await Promise.all([DB.all('frames'), DB.all('rolls'), DB.all('cameras'), DB.all('lenses'), DB.all('fridge'), stocksMap()]);
    // Nur Rollen, die den ganzen Weg in der App gegangen sind (eingelegt, entwickelt, hochgeladen). Archivierte zählen nur für die Archivarin.
    const archivedIds = new Set(allRolls.filter(r => r.archived).map(r => r.id));
    const rolls = allRolls.filter(r => !r.archived), frames = allFrames.filter(f => !archivedIds.has(f.rollId));
    const filters = await getFilters(), acc = await getAccessories(), lensM = new Map(lenses.map(l => [l.id, l]));
    const own = cams.filter(c => !c.borrowed);   // ausgeliehene Kameras zählen nicht als eigener Besitz
    const rollM = new Map(rolls.map(r => [r.id, r]));
    const used = rolls.filter(r => (r.status || 'entwurf') !== 'entwurf' || frames.some(f => f.rollId === r.id && f.shot));
    const v = {};
    v.kueken = (await DB.get('meta', 'tourDone')) ? 1 : 0;
    // Wetter: nur Fotos, für die das Wetter schon geholt ist
    const wx = frames.filter(f => f.wx);
    v.frosch = wx.filter(f => { const c = f.wx.code; return (c >= 51 && c <= 67) || (c >= 80 && c <= 82) || c >= 95; }).length;
    v.eisbaer = wx.filter(f => f.wx.t != null && f.wx.t <= 0).length;
    v.eidechse = wx.filter(f => f.wx.t != null && f.wx.t >= 28).length;
    // Licht nach Sonnenstand am Ort zur Aufnahmezeit
    const lit = frames.filter(f => timed(f) && f.placeLat != null).map(f => ({ f, a: SKY.sun(new Date(f.date), +f.placeLat, +f.placeLng).alt, h: new Date(f.date).getHours() }));
    v.eule = lit.filter(x => x.a < -6).length;
    v.gluehwurm = lit.filter(x => x.a >= -6 && x.a < -4).length;
    v.lerche = lit.filter(x => x.a >= -4 && x.a < 6 && x.h < 12).length;
    // Kühlschrank
    const inFridge = fridge.filter(e => (e.count || 0) > 0);
    v.elster = inFridge.reduce((n, e) => n + (e.count || 0), 0);
    v.prepper = Math.max(0, ...inFridge.filter(e => e.boughtAt && !rolls.some(r => r.stockId === e.stockId && String(r.loadedAt || '') >= e.boughtAt)).map(e => Math.floor((Date.now() - day(e.boughtAt)) / (365.25 * 864e5))));
    v.archaeo = rolls.filter(r => r.fridge?.expiresAt && r.loadedAt && day(r.loadedAt) > monthEnd(r.fridge.expiresAt)).length;
    // Ausrüstung
    const rated = frames.filter(f => f.rate != null);
    const avg = rated.length ? rated.reduce((a, f) => a + f.rate, 0) / rated.length : null;
    v.gas = own.length + lenses.length > 8 && rated.length >= 30 && avg < 2.5 ? 1 : 0;
    const byLoad = [...used].filter(r => r.cameraId).sort((a, b) => String(a.loadedAt || '').localeCompare(String(b.loadedAt || '')));
    let run = 0, best = 0, prev = null; byLoad.forEach(r => { run = r.cameraId === prev ? run + 1 : 1; prev = r.cameraId; best = Math.max(best, run); }); v.treue = best;
    v.krake = new Set(own.map(c => String(c.maker || '').trim().toLowerCase()).filter(Boolean)).size;
    v.milliardaer = own.some(c => /hasselblad/i.test(c.maker || '')) ? 1 : 0;
    const longEnd = l => Math.max(0, ...String(l?.focal || '').split(/[^\d.,]+/).map(num).filter(Boolean));
    v.sniper = frames.filter(f => f.lensId && longEnd(lensM.get(f.lensId)) >= 85).length;
    v.schnorrer = [...own, ...lenses, ...filters, ...acc].filter(x => gift(x.price)).length;
    v.leck = frames.filter(f => f.leak).length;
    // Filme und Entwicklung
    const sts = used.map(r => stocksM.get(r.stockId)).filter(Boolean);
    const bw = sts.filter(st => /^(sw|ir)/.test(String(st.type || ''))).length;
    v.zebra = sts.length >= 10 && bw / sts.length >= 0.8 ? 1 : 0;
    const makers = sts.map(st => String(st.maker || ''));
    v.biene = BIG_MAKERS.every(re => makers.some(m => re.test(m))) ? 1 : 0;
    v.chamaeleon = new Set(used.map(r => r.stockId).filter(id => id && id !== 'film-unbekannt')).size;
    const fmts = new Set(used.map(r => r.format));
    v.matroschka = ['half', '135', '120', 'gross'].every(f => fmts.has(f)) ? 1 : 0;
    v.alchemist = rolls.filter(r => r.dev?.mode === 'selbst' && (r.status || 'entwurf') !== 'entwurf').length;
    v.doppel = frames.filter(f => f.double).length;
    // Tempo
    v.schnecke = Math.max(0, ...rolls.map(r => { const a = day(r.loadedAt), b = day(r.finishedAt || r.dev?.sentAt); return a && b && b > a ? (b - a) / (30.44 * 864e5) : 0; }));
    v.gepard = rolls.filter(r => { const fs = frames.filter(f => f.rollId === r.id && !f.bonus && f.date); const n = r.exposures || 36; return fs.length >= Math.round(n * 0.9) && new Set(fs.map(f => String(f.date).slice(0, 10))).size === 1; }).length;
    // Orte
    v.zugvogel = new Set(frames.map(f => f.placeCC).filter(Boolean)).size;
    const loc = frames.filter(f => f.placeLat != null);
    if (loc.length >= 50) {
      const home = await DB.get('meta', 'home');
      let hLa, hLo;
      if (home?.lat != null) { hLa = +home.lat; hLo = +home.lng; }
      else { const c = new Map(); loc.forEach(f => { const k = `${(+f.placeLat).toFixed(2)},${(+f.placeLng).toFixed(2)}`; c.set(k, (c.get(k) || []).concat(f)); }); const g = [...c.values()].sort((a, b) => b.length - a.length)[0]; hLa = g.reduce((a, f) => a + +f.placeLat, 0) / g.length; hLo = g.reduce((a, f) => a + +f.placeLng, 0) / g.length; }
      v.maulwurf = loc.filter(f => distKm(hLa, hLo, +f.placeLat, +f.placeLng) <= 3).length / loc.length >= 0.8 ? 1 : 0;
    } else v.maulwurf = 0;
    // Geld und Bewertung
    v.loch = transactions(fridge, rolls, stocksM, await allGearTx()).reduce((n, t) => n + t.amount, 0);
    v.adler = frames.filter(f => f.rate === 5).length;
    v.pech = frames.filter(f => f.rate != null && f.rate <= -3).length;
    v.waage = frames.filter(f => f.rate === 0).length;
    v.archiv = allFrames.filter(f => archivedIds.has(f.rollId) && f.imgId).length;
    return v;
  }

  async function state() { return (await DB.get('meta', 'badges')) || { id: 'badges', earned: {}, pin: null, v: 3 }; }
  // Neu berechnen, neue Stufen mit heutigem Datum festhalten. Eine einmal verdiente Stufe bleibt.
  let running = null;
  async function check(quiet) {
    if (running) return running;
    running = (async () => {
      const v = await values(), st = await state(), fresh = [];
      // Einmalig (v192): Stufen, die in v191 aus archivierten Fotos verdient wurden, auf den heutigen Stand zurücksetzen
      if ((st.v || 1) < 3) { for (const d of DEF) { const e = st.earned[d.id]; if (!e) continue; const lv = level(d, v[d.id] || 0); if (lv < e.lv) { if (lv) e.lv = lv; else delete st.earned[d.id]; } } if (st.pin && !st.earned[st.pin]) st.pin = null; st.v = 3; await DB.put('meta', st); }
      // Besitz-Abzeichen folgen dem Kameraschrank: wird eine Kamera als ausgeliehen markiert oder verkauft, fällt die Stufe wieder weg
      const LIVE = ['milliardaer', 'krake', 'gas', 'schnorrer'];
      let changed = false;
      for (const d of DEF) {
        const lv = level(d, v[d.id] || 0), had = st.earned[d.id]?.lv || 0;
        if (lv > had) { st.earned[d.id] = { lv, at: U.today() }; fresh.push([d, lv]); }
        else if (LIVE.includes(d.id) && lv < had) { if (lv) st.earned[d.id].lv = lv; else delete st.earned[d.id]; if (st.pin === d.id && !lv) st.pin = null; changed = true; }
      }
      if (changed && !fresh.length) await DB.put('meta', st);
      if (fresh.length) {
        await DB.put('meta', st);
        if (!quiet) { const [d, lv] = fresh[0]; U.toast(fresh.length > 1 ? `${fresh.length} neue Abzeichen` : `Neues Abzeichen: ${d.name}${d.lv.length > 1 ? ` · Stufe ${lv}` : ''}`); U.haptic && U.haptic([20, 60, 20]); }
      }
      running = null; return { st, fresh };
    })();
    return running;
  }

  const svg = id => `<svg viewBox="0 0 48 48" aria-hidden="true">${BADGE_IC[id] || BADGE_IC.frage}</svg>`;
  const dots = (d, lv) => d.lv.length > 1 ? `<span class="bdots">${[1, 2, 3].map(i => `<i${i <= lv ? ' class="on"' : ''}></i>`).join('')}</span>` : '';
  const med = (d, size = '') => `<span class="bmed ${d.cls}${size}"><span>${svg(d.id)}</span></span>`;
  const lockMed = (size = '') => `<span class="bmed lock${size}"><span>${svg('frage')}</span></span>`;

  // Anstecker am Profilbild
  async function pinHtml() {
    const st = await state(); const d = DEF.find(x => x.id === st.pin);
    return d && st.earned[d.id] ? `<span class="bpin" aria-label="Anstecker: ${U.esc(d.name)}">${med(d, ' xs')}</span>` : '';
  }
  // Kachel im Profil: verdiente Abzeichen, dann Platzhalter für die übrigen
  async function foldHtml() {
    const st = await state(), got = DEF.filter(d => st.earned[d.id]), rest = DEF.length - got.length;
    const cells = got.map(d => `<button type="button" class="bcell" data-badge="${d.id}" aria-label="${U.esc(d.name)}">${med(d)}${dots(d, st.earned[d.id].lv)}</button>`).join('')
      + Array.from({ length: rest }, () => `<span class="bcell" aria-hidden="true">${lockMed()}</span>`).join('');
    return `<section class="badgefold fold${foldOpen('badges') ? ' open' : ''}" data-fold="badges">
      <div class="fridgetop foldhead"><span class="fridgeicon">${svg('frage')}</span><div><h2>Abzeichen</h2><span class="sub2">${got.length ? `${got.length} verdient` : 'noch keins verdient'}</span></div><span class="foldchev" aria-hidden="true"></span></div>
      <div class="foldbody"><div class="bgrid">${cells}</div></div></section>`;
  }
  async function open(id) {
    const st = await state(), d = DEF.find(x => x.id === id), e = st.earned[id]; if (!d || !e) return;
    const ov = document.createElement('div'); ov.className = 'modalbg';
    const pinned = st.pin === id;
    ov.innerHTML = `<div class="modal badgemodal" role="dialog" aria-modal="true" aria-label="${U.esc(d.name)}">
      <div class="bbig">${med(d, ' lg')}${dots(d, e.lv)}</div>
      <h2>${U.esc(d.name)}</h2>
      <p class="sub2">${d.lv.length > 1 ? `Stufe ${e.lv} · ` : ''}verdient am ${U.fmtDate(e.at)}</p>
      <p>${U.esc(text(d, e.lv))}</p>
      <div class="modalfoot"><button class="closex" id="bNo" aria-label="Schließen">${ART.x}</button><button type="button" class="btn small" id="bPin">${pinned ? 'Anstecker abnehmen' : 'Als Anstecker tragen'}</button></div></div>`;
    document.body.appendChild(ov);
    ov.querySelector('#bNo').onclick = () => ov.remove();
    ov.querySelector('#bPin').onclick = async () => { st.pin = pinned ? null : id; await DB.put('meta', st); ov.remove(); U.toast(pinned ? 'Anstecker abgenommen' : `${d.name} am Profil`); U.haptic && U.haptic([12, 40, 12]); route(); };
  }
  document.addEventListener('click', e => { const b = e.target.closest('[data-badge]'); if (b) { e.preventDefault(); open(b.dataset.badge); } });

  // Wetter nachholen: Fotos mit Uhrzeit und Ort ohne Wetter, nacheinander, höchstens 60 je Start der App.
  // Ohne Netz oder bei Fehlern bricht es ab, die Abzeichen zählen dann die Fotos, für die das Wetter schon da ist.
  let wxDone = 0, wxBusy = false;
  async function backfillWeather() {
    if (wxBusy || wxDone >= 60 || typeof SKY === 'undefined' || !navigator.onLine) return;
    wxBusy = true;
    try {
      const todo = (await DB.all('frames')).filter(f => !f.wx && timed(f) && f.placeLat != null && new Date(f.date) < new Date());
      for (const f of todo) {
        if (wxDone >= 60) break;
        let w = null; try { w = await SKY.weather(new Date(f.date), +f.placeLat, +f.placeLng); } catch (_) { break; }
        wxDone++;
        if (w) { const fresh = await DB.get('frames', f.id); if (fresh && !fresh.wx) { fresh.wx = w; fresh.wxKey = `${String(fresh.date).slice(0, 16)}|${(+fresh.placeLat).toFixed(3)}|${(+fresh.placeLng).toFixed(3)}`; await DB.put('frames', fresh); } }
        await new Promise(r => setTimeout(r, 350));
      }
    } finally { wxBusy = false; }
    check();
  }
  return { DEF, values, check, state, pinHtml, foldHtml, open, backfillWeather };
})();
window.BADGES = BADGES;
