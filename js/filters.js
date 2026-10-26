/* Filter im Kameraschrank. Gespeichert in „meta“ unter der Kennung „filters“, damit keine neue Datenbank-Tabelle nötig ist.
   Katalog: Cokin Creative Filter System, Nummern und Namen wie im Cokin-Katalog gedruckt
   (Cokin-Broschüre 04/2000, ergänzt um 007 Infrarot und 121M aus der Creative-Broschüre 02/2015).
   Nicht jeder Filter ist in jeder Größe und heute noch lieferbar. */
const COKIN_SERIES = [
  ['A', 'S', 'A-Serie', 67], ['P', 'M', 'P-Serie', 84], ['Z', 'L', 'Z-Pro', 100], ['X', 'XL', 'X-Pro', 130]
];
const COKIN_GROUPS = [
  ['sw', 'Schwarzweiß und Infrarot', [
    ['001', 'Yellow 2'], ['002', 'Orange 2,5'], ['003', 'Red 8'], ['004', 'Green 4'], ['005', 'Sepia 4'], ['006', 'Yellow Green 1.5'], ['007', 'Infrared (89B)']]],
  ['farbe', 'Farbe und Farbkorrektur', [
    ['020', 'Blue (80A)'], ['021', 'Blue (80B)'], ['022', 'Blue (80C)'], ['023', 'Blue (82A)'], ['024', 'Blue (82B)'], ['025', 'Blue (82C)'],
    ['026', 'Warm (81A)'], ['027', 'Warm (81B)'], ['028', 'Warm (81C)'], ['035', 'Warm (81D)'], ['037', 'Warm (81EF)'],
    ['029', 'Orange (85A)'], ['030', 'Orange (85B)'], ['031', 'Orange (85C)'], ['036', 'FLW'], ['046', 'FLD'],
    ['045', 'Sepialight'], ['047', 'Gold'], ['050', 'Cyan'], ['230', 'Skylight'], ['231', 'U.V.'], ['232', 'Skylight 1B']]],
  ['nd', 'Graufilter (ND)', [['152', 'Neutral Grey ND2 (1 Blende)'], ['153', 'Neutral Grey ND4 (2 Blenden)'], ['154', 'Neutral Grey ND8 (3 Blenden)']]],
  ['grad', 'Verlaufsfilter', [
    ['120', 'Gradual Grey G1'], ['121', 'Gradual Grey G2 (ND8)'], ['121L', 'Gradual Grey G2 Light (ND2)'], ['121M', 'Gradual Grey ND4 Medium'],
    ['121S', 'Gradual Grey G2 Soft (ND8)'], ['121F', 'Gradual Grey G2 Full (ND8)'],
    ['122', 'Gradual Blue B1'], ['123', 'Gradual Blue B2'], ['123L', 'Gradual Blue B2 Light'], ['123S', 'Gradual Blue B2 Soft'], ['123F', 'Gradual Blue B2 Full'],
    ['124', 'Gradual Tobacco T1'], ['125', 'Gradual Tobacco T2'], ['125L', 'Gradual Tobacco T2 Light'], ['125S', 'Gradual Tobacco T2 Soft'], ['125F', 'Gradual Tobacco T2 Full'],
    ['126', 'Gradual Mauve M1'], ['128', 'Gradual Pink P1'], ['129', 'Gradual Pink P2'], ['130', 'Gradual Emerald E1'], ['131', 'Gradual Emerald E2'],
    ['132', 'Gradual Yellow Y1'], ['133', 'Gradual Yellow Y2'], ['138', 'Gradual FLW'], ['139', 'Gradual FLD'], ['150', 'Gradual Fog 1'], ['151', 'Gradual Fog 2'],
    ['197', 'Sunset 1'], ['198', 'Sunset 2'],
    ['660', 'Gradual Fluo Yellow 1'], ['661', 'Gradual Fluo Yellow 2'], ['662', 'Gradual Fluo Orange 1'], ['663', 'Gradual Fluo Orange 2'],
    ['664', 'Gradual Fluo Red 1'], ['665', 'Gradual Fluo Red 2'], ['666', 'Gradual Fluo Blue 1'], ['667', 'Gradual Fluo Blue 2'],
    ['668', 'Gradual Fluo Mauve 1'], ['669', 'Gradual Fluo Mauve 2'], ['670', 'Gradual Fluo Pink 1'], ['671', 'Gradual Fluo Pink 2']]],
  ['pol', 'Polfilter', [
    ['160', 'Linear Polarizer'], ['164', 'Circular Polarizer'], ['161', 'Polacolor Red'], ['162', 'Polacolor Blue'], ['163', 'Polacolor Yellow'], ['165', 'Redhancer'],
    ['170', 'Varicolor Red/Green'], ['171', 'Varicolor Red/Blue'], ['172', 'Varicolor Pink/Orange'], ['173', 'Varicolor Blue/Yellow'], ['174', 'Varicolor Blue/Lime']]],
  ['stern', 'Stern und Diffraktion', [
    ['040', 'Diffractor Cosmos'], ['041', 'Diffractor Univers'], ['042', 'Diffractor Galaxy'],
    ['055', 'Star 16'], ['056', 'Star 8'], ['057', 'Star 4'], ['058', 'Star 2'], ['059', 'Softstar 1']]],
  ['spot', 'Center-Spot', [
    ['060', 'C.Spot Incolor 1'], ['061', 'C.Spot Incolor 2'], ['062', 'C.Spot Grey 1'], ['063', 'C.Spot Grey 2'], ['064', 'C.Spot Violet'],
    ['065', 'C.Spot Green'], ['066', 'C.Spot Orange'], ['067', 'C.Spot Blue'], ['068', 'C.Spot Red'],
    ['070', 'C.Spot WA Incolor 1'], ['071', 'C.Spot WA Incolor 2'], ['072', 'C.Spot WA Grey 1'], ['073', 'C.Spot WA Grey 2'], ['074', 'C.Spot WA Violet'],
    ['075', 'C.Spot WA Green'], ['076', 'C.Spot WA Orange'], ['077', 'C.Spot WA Blue'], ['078', 'C.Spot WA Red'],
    ['140', 'Oval C.Spot White'], ['141', 'Oval C.Spot Black'], ['672', 'C.Spot Pink/Blue'], ['673', 'C.Spot Yellow/Pink'], ['674', 'C.Spot Blue/Yellow']]],
  ['weich', 'Weichzeichner und Pastell', [
    ['080', 'Color Varnish'], ['081', 'Color Vaseline'], ['082', 'Color Diffuser'], ['086', 'Pastel 1'], ['087', 'Pastel 2'],
    ['088', 'Cold Color Diffuser'], ['089', 'Warm Color Diffuser'], ['694', 'Sunsoft'], ['695', 'Champagne'], ['696', 'Softwarm'],
    ['820', 'Diffuser Light'], ['830', 'Diffuser 1'], ['840', 'Diffuser 2'], ['850', 'Diffuser 3'],
    ['142', 'Net Filter 1 White'], ['143', 'Net Filter 1 Black'], ['144', 'Net Filter 2 White'], ['145', 'Net Filter 2 Black'],
    ['148', 'Wedding 1 White'], ['149', 'Wedding 1 Black']]],
  ['optik', 'Optische Effekte', [
    ['091', 'Dreams 1'], ['092', 'Dreams 2'], ['093', 'Dreams 3'], ['101', 'Close-up +1'], ['102', 'Close-up +2'], ['103', 'Close-up +3'],
    ['111', 'Split-field +1'], ['112', 'Split-field +2'], ['113', 'Split-field +3'],
    ['201', 'Multi-image X5'], ['202', 'Multi-image X7'], ['203', 'Multi-image X13'], ['204', 'Multi-image X25'], ['209', 'Multi-parallel']]],
  ['spezial', 'Spezialeffekte und Masken', [
    ['185', 'Radial Zoom'], ['186', 'Rainspot'], ['187', 'Cyclone'], ['188', 'Softspot'], ['189', 'Sunspot'], ['195', 'Rainbow 1'], ['196', 'Rainbow 2'],
    ['216', 'Speed 2'], ['217', 'Super Speed 2'], ['219', 'Prism 2'], ['220', 'Mirage'],
    ['340', 'Creative Mask'], ['342', 'Double Mask 1'], ['345', 'Double Mask 2'], ['346', 'Double Exposure'], ['397', 'Pre-shaped Frames']]]
];
const COKIN_BY_CODE = new Map(COKIN_GROUPS.flatMap(([g, , list]) => list.map(([c, n]) => [c, { code: c, name: n, group: g }])));
const COKIN_SRC = [
  ['Cokin, Katalog Creative Filter System, 04/2000', 'https://www.adorama.com/pdfs/Cokin%20brochure.pdf'],
  ['Cokin, Creative-Broschüre, 02/2015', 'https://crkphotoimaging.com.au/ts1616532770/attachments/Product/58637/creative.tag.brochure.pdf'],
  ['Cokin Creative Filter System User Guide (Internet Archive)', 'https://archive.org/details/cokin-creative-filter-system-user-guide']
];

async function getFilters() { return (await DB.get('meta', 'filters'))?.list || []; }
async function saveFilters(list) { await DB.put('meta', { id: 'filters', list }); }
const seriesOf = k => COKIN_SERIES.find(s => s[0] === k);
const filterCode = f => f.code ? (f.series || '') + f.code : '';
const filterName = f => f.name || COKIN_BY_CODE.get(f.code)?.name || 'Filter';

// Teil im Kameraschrank: Liste der Filter mit Anzahl, darüber die Filtergewinde der Objektive
async function filtersSubHtml(lenses, open) {
  const list = await getFilters();
  const total = list.reduce((n, f) => n + (f.count || 1), 0);
  const threads = [...new Set(lenses.map(l => parseFloat(String(l.filterThread || '').replace(',', '.'))).filter(x => x > 0))].sort((a, b) => a - b);
  const rows = list.map(f => {
    const s = seriesOf(f.series);
    return `<button type="button" class="crow filterrow" data-filter="${f.id}">
      ${filterArt(f, 36)}
      ${f.code ? `<span class="filterbadge">${U.esc(filterCode(f))}</span>` : ''}
      <span class="frowmain">
        <span class="frowname">${U.esc(filterName(f))}</span>
        <span class="frowchips">${s ? `<span>${s[1]} · ${s[2]}</span>` : ''}${f.notes ? `<span>${U.esc(f.notes.slice(0, 30))}</span>` : ''}</span>
      </span>
      <span class="frowcount">×${f.count || 1}</span>
    </button>`;
  });
  return `
      <div class="cabsub fold${open ? ' open' : ''}" data-fold="cab-filters">
        <div class="cabhead foldhead"><h3>Filter<span class="cabcount">${total}</span></h3><span class="cabtools"><button class="fridgeplus" id="addFilter" aria-label="Filter hinzufügen">+</button><span class="foldchev" aria-hidden="true"></span></span></div>
        <div class="foldbody">
          ${threads.length ? `<p class="hint threadhint">Filtergewinde deiner Objektive: ${threads.map(t => String(t).replace('.', ',') + ' mm').join(', ')}</p>` : ''}
          <div class="flist">${rows.length ? rows.join('') : '<p class="hint">Noch keine Filter. Wähle mit dem Plus deine Cokin-Filter aus dem Katalog.</p>'}</div>
        </div>
      </div>`;
}

function setupFilters(root) {
  root.querySelector('#addFilter')?.addEventListener('click', e => { e.stopPropagation(); U.haptic(); openFilterPicker(); });
  root.querySelectorAll('[data-filter]').forEach(b => b.addEventListener('click', async () => {
    const f = (await getFilters()).find(x => x.id === b.dataset.filter); if (f) openFilterEditor(f);
  }));
}

// Auswahl aus dem Cokin-Katalog: mehrere Filter auf einmal, je Filter eine Anzahl
async function openFilterPicker() {
  let series = 'P';
  try { series = localStorage.getItem('kb-filter-series') || 'P'; } catch (_) {}
  const pick = new Map();   // Code → Anzahl
  const ov = document.createElement('div');
  ov.className = 'modalbg';
  ov.innerHTML = `
    <div class="modal filterpick" role="dialog" aria-modal="true" aria-labelledby="fpkTitle">
      <h2 id="fpkTitle">Filter hinzufügen</h2>
      <div class="seggroup" id="fpkSeries">${COKIN_SERIES.map(([k, sz, nm, mm]) => `<button type="button" class="seg${k === series ? ' on' : ''}" data-s="${k}"><b>${sz}</b><span class="sub2">${nm}</span></button>`).join('')}</div>
      <p class="hint" id="fpkMm"></p>
      <input type="search" placeholder=" " id="fpkQ" aria-label="Filter suchen" autocomplete="off">
      <div class="fpklist" id="fpkList">
        ${COKIN_GROUPS.map(([g, label, list]) => `<div class="fpkgroup" data-g="${g}"><div class="fpkhead">${label}</div>
          ${list.map(([c, n]) => `<div class="fpkrow" data-code="${c}" data-q="${U.esc((c + ' ' + n + ' ' + label).toLowerCase())}">
            <button type="button" class="fpktoggle" aria-pressed="false"><span class="filterbadge"><span class="fpkser">${series}</span>${c}</span><span class="fpkname">${U.esc(n)}</span></button>
            <span class="stepper small"><button type="button" data-d="-1" aria-label="weniger">−</button><span class="fpkn">1</span><button type="button" data-d="1" aria-label="mehr">+</button></span>
          </div>`).join('')}</div>`).join('')}
        <div class="fpkgroup"><div class="fpkhead">Anderer Filter</div>
          <div class="fpkown"><input id="fpkOwn" maxlength="60" placeholder="z. B. Hoya R72" aria-label="Eigener Filter"></div></div>
      </div>
      <p class="hint fpksrc">Nummern und Namen aus den Cokin-Katalogen 2000 und 2015. Nicht jeder Filter gibt es in jeder Größe oder noch neu zu kaufen.</p>
      <div class="modalfoot"><button class="closex" id="fpkNo" aria-label="Abbrechen">${ART.x}</button><span class="sub2" id="fpkCount"></span><button class="okbtn" id="fpkOk" aria-label="Hinzufügen" disabled>${ART.check}</button></div>
    </div>`;
  document.body.appendChild(ov);
  const $ = id => ov.querySelector('#' + id);
  const sync = () => {
    const s = seriesOf(series);
    $('fpkMm').textContent = `Halter ${s[3]} mm breit`;
    ov.querySelectorAll('.fpkser').forEach(x => { x.textContent = series; });
    const n = [...pick.values()].reduce((a, b) => a + b, 0) + ($('fpkOwn').value.trim() ? 1 : 0);
    $('fpkCount').textContent = n ? `${n} ausgewählt` : '';
    $('fpkOk').disabled = !n;
  };
  sync();
  $('fpkSeries').addEventListener('click', e => {
    const b = e.target.closest('[data-s]'); if (!b) return;
    series = b.dataset.s; try { localStorage.setItem('kb-filter-series', series); } catch (_) {}
    ov.querySelectorAll('#fpkSeries .seg').forEach(x => x.classList.toggle('on', x === b)); sync();
  });
  $('fpkQ').addEventListener('input', e => {
    const q = e.target.value.toLowerCase().trim();
    ov.querySelectorAll('.fpkrow').forEach(r => { r.hidden = !!q && !r.dataset.q.includes(q); });
    ov.querySelectorAll('.fpkgroup[data-g]').forEach(g => { g.hidden = ![...g.querySelectorAll('.fpkrow')].some(r => !r.hidden); });
  });
  $('fpkOwn').addEventListener('input', sync);
  $('fpkList').addEventListener('click', e => {
    const row = e.target.closest('.fpkrow'); if (!row) return;
    const code = row.dataset.code;
    const step = e.target.closest('[data-d]');
    if (step) {
      const n = Math.max(1, Math.min(9, (pick.get(code) || 1) + Number(step.dataset.d)));
      pick.set(code, n); row.querySelector('.fpkn').textContent = n; sync(); return;
    }
    if (!e.target.closest('.fpktoggle')) return;
    const on = !pick.has(code);
    if (on) pick.set(code, 1); else pick.delete(code);
    row.classList.toggle('on', on); row.querySelector('.fpktoggle').setAttribute('aria-pressed', on);
    row.querySelector('.fpkn').textContent = pick.get(code) || 1;
    U.haptic && U.haptic(10); sync();
  });
  const close = () => ov.remove();
  $('fpkNo').addEventListener('click', close);
  ov.addEventListener('click', e => { if (e.target === ov) close(); });
  $('fpkOk').addEventListener('click', async () => {
    const list = await getFilters();
    for (const [code, n] of pick) {
      const same = list.find(f => f.code === code && f.series === series);
      if (same) same.count = (same.count || 1) + n;
      else list.push({ id: U.uid(), code, series, count: n });
    }
    const own = $('fpkOwn').value.trim();
    if (own) list.push({ id: U.uid(), code: '', name: own, series: null, count: 1 });
    await saveFilters(list);
    const added = [...pick.values()].reduce((a, b) => a + b, 0) + (own ? 1 : 0);
    close(); U.haptic([20, 60, 20]); U.toast(added === 1 ? 'Filter hinzugefügt' : `${added} Filter hinzugefügt`);
    try { localStorage.setItem('kb-fold-cab-filters', '1'); localStorage.setItem('kb-fold-cabinet', '1'); } catch (_) {}
    route();
  });
}

// Einen Filter bearbeiten: Anzahl, Größe, Notiz, entfernen
function openFilterEditor(f) {
  const ov = document.createElement('div');
  ov.className = 'modalbg';
  ov.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="feTitle">
      <h2 id="feTitle"><span class="filterbadge${f.code ? '' : ' own'}" id="feBadge">${U.esc(filterCode(f) || 'F')}</span> ${U.esc(filterName(f))}</h2>
      ${f.code ? `<div class="seggroup" id="feSeries">${COKIN_SERIES.map(([k, sz, nm]) => `<button type="button" class="seg${k === f.series ? ' on' : ''}" data-s="${k}"><b>${sz}</b><span class="sub2">${nm}</span></button>`).join('')}</div>`
        : `<label class="fld"><span>Name</span><input id="feName" maxlength="60" value="${U.esc(f.name || '')}"></label>`}
      <div class="fld"><span>Anzahl</span><div class="stepper"><button type="button" id="feMinus" aria-label="weniger">−</button><span id="feCount">${f.count || 1}</span><button type="button" id="fePlus" aria-label="mehr">+</button></div></div>
      <label class="fld"><span>Notizen</span><textarea id="feNotes" rows="3" placeholder="Kratzer, Adapterring, gekauft bei …">${U.esc(f.notes || '')}</textarea></label>
      <button class="btn danger small" id="feDel">Filter entfernen</button>
      <div class="modalfoot"><button class="closex" id="feNo" aria-label="Abbrechen">${ART.x}</button><button class="okbtn" id="feOk" aria-label="Speichern">${ART.check}</button></div>
    </div>`;
  document.body.appendChild(ov);
  const $ = id => ov.querySelector('#' + id);
  const ed = { ...f, count: f.count || 1 };
  $('feSeries')?.addEventListener('click', e => {
    const b = e.target.closest('[data-s]'); if (!b) return;
    ed.series = b.dataset.s; ov.querySelectorAll('#feSeries .seg').forEach(x => x.classList.toggle('on', x === b));
    $('feBadge').textContent = filterCode(ed);
  });
  $('feMinus').addEventListener('click', () => { ed.count = Math.max(1, ed.count - 1); $('feCount').textContent = ed.count; });
  $('fePlus').addEventListener('click', () => { ed.count = Math.min(99, ed.count + 1); $('feCount').textContent = ed.count; });
  const close = () => ov.remove();
  $('feNo').addEventListener('click', close);
  ov.addEventListener('click', e => { if (e.target === ov) close(); });
  $('feOk').addEventListener('click', async () => {
    ed.notes = $('feNotes').value.trim();
    if ($('feName')) ed.name = $('feName').value.trim() || f.name;
    const list = (await getFilters()).map(x => x.id === f.id ? ed : x);
    await saveFilters(list); close(); U.toast('Gespeichert'); route();
  });
  $('feDel').addEventListener('click', async () => {
    await saveFilters((await getFilters()).filter(x => x.id !== f.id)); close(); U.toast('Filter entfernt'); route();
  });
}

/* ---------- Zubehör: Blitze, Auslöser, Stative und alles andere, was an eine Kamera kommt ---------- */
const ACC_KINDS = [
  ['blitz', 'Blitz', '<path d="M13 2 5 13.5h5.5L9.5 22 19 9.5h-5.8z"/>'],
  ['ausloeser', 'Selbst- und Fernauslöser', '<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.5 2M9.5 2.5h5"/>'],
  ['stativ', 'Stativ', '<path d="M8 3h8v3H8zM12 6v5M12 11 5 21M12 11l7 10M12 11v10"/>'],
  ['messer', 'Belichtungsmesser', '<rect x="6" y="2.5" width="12" height="19" rx="3"/><circle cx="12" cy="9" r="3"/><path d="M9 16h6"/>'],
  ['blende', 'Gegenlichtblende', '<path d="M4 8h4v8H4zM8 6l10-3v18L8 18z"/>'],
  ['adapter', 'Adapter und Filterhalter', '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/>'],
  ['tasche', 'Tasche und Gurt', '<path d="M4 8h16v12H4zM9 8V5h6v3"/>'],
  ['sonst', 'Sonstiges', '<circle cx="6" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18" cy="12" r="1.6"/>']
];
const accKind = k => ACC_KINDS.find(x => x[0] === k) || ACC_KINDS[ACC_KINDS.length - 1];
const accIcon = (k, size = 22) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${accKind(k)[2]}</svg>`;
async function getAccessories() { return (await DB.get('meta', 'accessories'))?.list || []; }
async function saveAccessories(list) { await DB.put('meta', { id: 'accessories', list }); }

async function accessoriesSubHtml(cams, open) {
  const list = await getAccessories();
  const total = list.reduce((n, a) => n + (a.count || 1), 0);
  const order = ACC_KINDS.map(k => k[0]);
  const rows = [...list].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || (a.name || '').localeCompare(b.name || '')).map(a => {
    const names = (a.cameraIds || []).map(id => cams.find(c => c.id === id)).filter(Boolean).map(camLabel);
    return `<button type="button" class="crow accrow" data-acc="${a.id}">
      <span class="accicon">${accIcon(a.kind, 26)}</span>
      <span class="frowmain">
        <span class="frowname">${U.esc([a.maker, a.name].filter(Boolean).join(' ') || accKind(a.kind)[1])}</span>
        <span class="frowchips"><span>${U.esc(accKind(a.kind)[1])}</span>${names.map(n => `<span>${U.esc(n)}</span>`).join('')}</span>
        ${a.notes ? `<span class="frowsub">${U.esc(a.notes.slice(0, 80))}</span>` : ''}
      </span>
      ${(a.count || 1) > 1 ? `<span class="frowcount">×${a.count}</span>` : ''}
    </button>`;
  });
  return `
      <div class="cabsub fold${open ? ' open' : ''}" data-fold="cab-acc">
        <div class="cabhead foldhead"><h3>Zubehör<span class="cabcount">${total}</span></h3><span class="cabtools"><button class="fridgeplus" id="addAcc" aria-label="Zubehör hinzufügen">+</button><span class="foldchev" aria-hidden="true"></span></span></div>
        <div class="foldbody"><div class="flist">${rows.length ? rows.join('') : '<p class="hint">Noch kein Zubehör. Blitze, Auslöser, Stative und alles andere legst du mit dem Plus an.</p>'}</div></div>
      </div>`;
}

function setupAccessories(root) {
  root.querySelector('#addAcc')?.addEventListener('click', e => { e.stopPropagation(); U.haptic(); openAccEditor(null); });
  root.querySelectorAll('[data-acc]').forEach(b => b.addEventListener('click', async () => {
    const a = (await getAccessories()).find(x => x.id === b.dataset.acc); if (a) openAccEditor(a);
  }));
}

async function openAccEditor(a) {
  const isNew = !a;
  const ed = a ? JSON.parse(JSON.stringify(a)) : { id: U.uid(), kind: 'blitz', name: '', maker: '', count: 1, cameraIds: [], notes: '' };
  ed.cameraIds = ed.cameraIds || [];
  const cams = (await DB.all('cameras')).sort((x, y) => camLabel(x).localeCompare(camLabel(y)));
  const ov = document.createElement('div');
  ov.className = 'modalbg';
  ov.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="acTitle">
      <h2 id="acTitle">${isNew ? 'Zubehör hinzufügen' : 'Zubehör'}</h2>
      <div class="acckinds" id="acKinds">${ACC_KINDS.map(([k, l]) => `<button type="button" class="acckind${ed.kind === k ? ' on' : ''}" data-k="${k}">${accIcon(k)}<span>${l}</span></button>`).join('')}</div>
      <div class="two">
        <label class="fld"><span>Hersteller</span><input id="acMaker" maxlength="40" value="${U.esc(ed.maker || '')}"></label>
        <label class="fld"><span>Modell</span><input id="acName" maxlength="60" value="${U.esc(ed.name || '')}"></label>
      </div>
      <div class="fld"><span>Anzahl</span><div class="stepper"><button type="button" id="acMinus" aria-label="weniger">−</button><span id="acCount">${ed.count || 1}</span><button type="button" id="acPlus" aria-label="mehr">+</button></div></div>
      ${cams.length ? `<div class="qlabel">Passt an</div><div class="camchecks" id="acCams">${cams.map(c => `<label class="camcheck"><input type="checkbox" value="${c.id}" ${ed.cameraIds.includes(c.id) ? 'checked' : ''}><span>${U.esc(camLabel(c))}</span></label>`).join('')}</div>` : ''}
      <label class="fld"><span>Notizen</span><textarea id="acNotes" rows="3" placeholder="Leitzahl, Gewinde, Batterie, Macken …">${U.esc(ed.notes || '')}</textarea></label>
      ${isNew ? '' : '<button class="btn danger small" id="acDel">Zubehör entfernen</button>'}
      <div class="modalfoot"><button class="closex" id="acNo" aria-label="Abbrechen">${ART.x}</button><button class="okbtn" id="acOk" aria-label="Speichern">${ART.check}</button></div>
    </div>`;
  document.body.appendChild(ov);
  const $ = id => ov.querySelector('#' + id);
  $('acKinds').addEventListener('click', e => {
    const b = e.target.closest('[data-k]'); if (!b) return;
    ed.kind = b.dataset.k; ov.querySelectorAll('.acckind').forEach(x => x.classList.toggle('on', x === b));
  });
  $('acMinus').addEventListener('click', () => { ed.count = Math.max(1, (ed.count || 1) - 1); $('acCount').textContent = ed.count; });
  $('acPlus').addEventListener('click', () => { ed.count = Math.min(99, (ed.count || 1) + 1); $('acCount').textContent = ed.count; });
  const close = () => ov.remove();
  $('acNo').addEventListener('click', close);
  ov.addEventListener('click', e => { if (e.target === ov) close(); });
  $('acOk').addEventListener('click', async () => {
    ed.maker = $('acMaker').value.trim(); ed.name = $('acName').value.trim(); ed.notes = $('acNotes').value.trim();
    ed.cameraIds = [...ov.querySelectorAll('#acCams input:checked')].map(i => i.value);
    const list = await getAccessories();
    const i = list.findIndex(x => x.id === ed.id);
    if (i >= 0) list[i] = ed; else list.push(ed);
    await saveAccessories(list);
    close(); if (isNew) U.haptic([20, 60, 20]);
    U.toast(isNew ? 'Zubehör hinzugefügt' : 'Gespeichert');
    try { localStorage.setItem('kb-fold-cab-acc', '1'); localStorage.setItem('kb-fold-cabinet', '1'); } catch (_) {}
    route();
  });
  $('acDel')?.addEventListener('click', async () => { await saveAccessories((await getAccessories()).filter(x => x.id !== ed.id)); close(); U.toast('Zubehör entfernt'); route(); });
}

/* ---------- Bild eines Filters: Cokin-Filter als eckige Scheibe, Schraubfilter rund. Farbe nach Filterart. ---------- */
function filterTint(f) {
  const n = (filterName(f) || '').toLowerCase(), c = f.code || '';
  if (/r ?72|infra|ir\b|89b/.test(n) || c === '007') return { a: '#2a0508', b: '#5a0b14' };
  const fixed = { '001': '#f7d33a', '002': '#f59a2b', '003': '#d8232f', '004': '#4fa34a', '005': '#9b6a3b', '006': '#b9cf3b' };
  if (fixed[c]) return { a: fixed[c], b: fixed[c] };
  const g = COKIN_BY_CODE.get(c)?.group;
  if (g === 'nd') return { a: '#5d6168', b: '#5d6168' };
  if (g === 'pol') return { a: '#3a3f4a', b: '#6b7280' };
  if (g === 'grad') {
    const col = /blue/.test(n) ? '#3b7fd9' : /tobacco/.test(n) ? '#8a5a2b' : /mauve/.test(n) ? '#9a5ab0' : /pink/.test(n) ? '#e66aa3' : /emerald/.test(n) ? '#2e9a6a' : /yellow/.test(n) ? '#e8c23a' : /sunset|orange/.test(n) ? '#f08a3a' : /red/.test(n) ? '#d8373f' : '#5d6168';
    return { a: col, b: 'transparent', grad: true };
  }
  if (/blue|cyan|80|82/.test(n)) return { a: '#6fa8e8', b: '#6fa8e8' };
  if (/warm|81|85|gold|sepia/.test(n)) return { a: '#e8a25a', b: '#e8a25a' };
  return { a: '#cfe3ee', b: '#cfe3ee' };
}
function filterArt(f, size = 40) {
  const t = filterTint(f), id = 'fa' + Math.random().toString(36).slice(2, 7);
  const round = !f.code;
  const fill = t.grad
    ? `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.a}" stop-opacity=".9"/><stop offset=".5" stop-color="${t.a}" stop-opacity=".35"/><stop offset=".62" stop-color="${t.a}" stop-opacity="0"/></linearGradient>`
    : `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.a}" stop-opacity=".92"/><stop offset="1" stop-color="${t.b}" stop-opacity=".78"/></linearGradient>`;
  const shape = round
    ? `<circle cx="20" cy="20" r="17.5" fill="#1d1f22"/><circle cx="20" cy="20" r="14.5" fill="url(#${id})"/><circle cx="20" cy="20" r="14.5" fill="none" stroke="#fff" stroke-opacity=".25"/><path d="M11 13a11 11 0 0 1 9-5" stroke="#fff" stroke-opacity=".55" stroke-width="2" fill="none" stroke-linecap="round"/>`
    : `<rect x="5" y="3" width="30" height="34" rx="3" fill="#fff" fill-opacity=".12" stroke="#9aa3ad" stroke-opacity=".7"/><rect x="5" y="3" width="30" height="34" rx="3" fill="url(#${id})"/><path d="M9 8l6 0" stroke="#fff" stroke-opacity=".6" stroke-width="2" stroke-linecap="round"/>`;
  return `<svg class="filterart" viewBox="0 0 40 40" width="${size}" height="${size}" aria-hidden="true"><defs>${fill}</defs>${shape}</svg>`;
}
