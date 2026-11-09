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
    ['083', 'Diffuser 1 (alte Nr., heute 830)'], ['084', 'Diffuser 2 (alte Nr., heute 840)'], ['088', 'Cold Color Diffuser'], ['089', 'Warm Color Diffuser'], ['694', 'Sunsoft'], ['695', 'Champagne'], ['696', 'Softwarm'],
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
    ['340', 'Creative Mask'], ['375', 'Creative Filters (Farbfolien-Set)'], ['342', 'Double Mask 1'], ['345', 'Double Mask 2'], ['346', 'Double Exposure'], ['397', 'Pre-shaped Frames']]]
];
const COKIN_BY_CODE = new Map(COKIN_GROUPS.flatMap(([g, , list]) => list.map(([c, n]) => [c, { code: c, name: n, group: g }])));
const COKIN_SRC = [
  ['Cokin, Katalog Creative Filter System, 04/2000', 'https://www.adorama.com/pdfs/Cokin%20brochure.pdf'],
  ['Cokin, Creative-Broschüre, 02/2015', 'https://crkphotoimaging.com.au/ts1616532770/attachments/Product/58637/creative.tag.brochure.pdf'],
  ['Cokin Creative Filter System User Guide (Internet Archive)', 'https://archive.org/details/cokin-creative-filter-system-user-guide']
];

async function getFilters() { return (await DB.get('meta', 'filters'))?.list || []; }
async function saveFilters(list) { await DB.put('meta', { id: 'filters', list }); }
// Ältere Cokin-Größe B (Aufdruck „B“ auf dem Ring), nur für vorhandene Filter, nicht in der Auswahl
const COKIN_SERIES_OLD = [['B', 'B', 'B-Serie (alt)', null]];
const seriesOf = k => COKIN_SERIES.find(s => s[0] === k) || COKIN_SERIES_OLD.find(s => s[0] === k);
const filterCode = f => f.code ? (f.series || '') + f.code : '';
// Schiebefilter (Cokin & Co., in den Halter gesteckt) oder Schraubfilter (aufs Objektiv geschraubt). Eigene Filter ohne Angabe gelten als Schraubfilter.
const filterKind = f => f.code ? 'slide' : (f.kind || 'screw');
const THREADS = ['37', '40.5', '43', '46', '49', '52', '55', '58', '62', '67', '72', '77', '82'];
const mm = v => String(v).replace('.', ',') + ' mm';
const filterName = f => f.name || COKIN_BY_CODE.get(f.code)?.name || 'Filter';

// Teil im Kameraschrank: Liste der Filter mit Anzahl, darüber die Filtergewinde der Objektive
async function filtersSubHtml(lenses, open) {
  const list = await getFilters();
  const total = list.reduce((n, f) => n + (f.count || 1), 0);
  const threads = [...new Set(lenses.map(l => parseFloat(String(l.filterThread || '').replace(',', '.'))).filter(x => x > 0))].sort((a, b) => a - b);
  const rows = [...list].sort((a, b) => !!b.fav - !!a.fav).map(f => {
    const s = seriesOf(f.series);
    return `<button type="button" class="crow filterrow" data-filter="${f.id}">
      <span class="crowart filtart">${filterArt(f, 36)}${favStar('filters', f)}</span>
      ${f.code ? `<span class="filterbadge">${U.esc(filterCode(f))}</span>` : ''}
      <span class="frowmain">
        <span class="frowname">${U.esc(filterName(f))}</span>
        <span class="frowchips">${lentChip(f)}${s ? `<span>${s[1]} · ${s[2]}</span>` : `<span>${filterKind(f) === 'screw' ? 'Schraubfilter' : 'Schiebefilter'}</span>`}${filterKind(f) === 'screw' && f.thread ? `<span class="threadtag">⌀ ${mm(f.thread)}</span>` : ''}${(f.colors || []).length ? `<span class="gelstrip" title="${U.esc(f.colors.map(c => c.name).join(', '))}" style="background:linear-gradient(90deg,${f.colors.map((c, i, a) => `${c.hex} ${i / a.length * 100}% ${(i + 1) / a.length * 100}%`).join(',')})"></span><span>${f.colors.length} Farben</span>` : ''}${f.notes ? `<span class="chipnote">${U.esc(f.notes.slice(0, 30))}</span>` : ''}</span>
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
  let kind = 'slide', thread = '', screwN = 1;
  const threadsMine = [...new Set((await DB.all('lenses')).map(l => String(l.filterThread || '').replace(',', '.')).filter(t => parseFloat(t) > 0))];
  const ov = document.createElement('div');
  ov.className = 'modalbg';
  ov.innerHTML = `
    <div class="modal filterpick" role="dialog" aria-modal="true" aria-labelledby="fpkTitle">
      <h2 id="fpkTitle">Filter hinzufügen</h2>
      <div class="seggroup" id="fpkKind"><button type="button" class="seg on" data-k="slide">Schiebefilter</button><button type="button" class="seg" data-k="screw">Schraubfilter</button></div>
      <div id="fpkScrew" hidden>
        <label class="fld"><span>Name</span><input id="fpsName" maxlength="60"></label>
        <div class="qlabel">Gewindedurchmesser</div>
        <div class="chipwrap" id="fpsThread"><span class="chipset">${[...new Set([...threadsMine, ...THREADS])].sort((a, b) => parseFloat(a) - parseFloat(b)).map(t => `<button type="button" class="chip${threadsMine.includes(t) ? ' mine' : ''}" data-v="${t}">${mm(t)}</button>`).join('')}</span>
          <input class="chip-input" id="fpsThreadOther" inputmode="decimal" placeholder="andere"></div>
        ${threadsMine.length ? '<p class="hint">Hervorgehoben: Filtergewinde deiner Objektive.</p>' : ''}
        <div class="fld"><span>Anzahl</span><div class="stepper"><button type="button" id="fpsMinus" aria-label="weniger">−</button><span id="fpsCount">1</span><button type="button" id="fpsPlus" aria-label="mehr">+</button></div></div>
      </div>
      <div id="fpkSlide">
      <div class="seggroup" id="fpkSeries">${COKIN_SERIES.map(([k, sz, nm, mm]) => `<button type="button" class="seg${k === series ? ' on' : ''}" data-s="${k}"><b>${sz}</b><span class="sub2">${nm}</span></button>`).join('')}</div>
      <p class="hint" id="fpkMm"></p>
      <input type="search" placeholder=" " id="fpkQ" aria-label="Filter suchen" autocomplete="off">
      <div class="fpklist" id="fpkList">
        ${COKIN_GROUPS.map(([g, label, list]) => `<div class="fpkgroup" data-g="${g}"><div class="fpkhead">${label}</div>
          ${list.map(([c, n]) => `<div class="fpkrow" data-code="${c}" data-q="${U.esc((c + ' ' + n + ' ' + label).toLowerCase())}">
            <button type="button" class="fpktoggle" aria-pressed="false"><span class="filterbadge"><span class="fpkser">${series}</span>${c}</span><span class="fpkname">${U.esc(n)}</span></button>
            <span class="stepper small"><button type="button" data-d="-1" aria-label="weniger">−</button><span class="fpkn">1</span><button type="button" data-d="1" aria-label="mehr">+</button></span>
          </div>`).join('')}</div>`).join('')}
        <div class="fpkgroup"><div class="fpkhead">Anderer Schiebefilter</div>
          <div class="fpkown"><input id="fpkOwn" maxlength="60" aria-label="Anderer Schiebefilter"></div></div>
      </div>
      <p class="hint fpksrc">Nummern und Namen aus den Cokin-Katalogen 2000 und 2015. Nicht jeder Filter gibt es in jeder Größe oder noch neu zu kaufen.</p>
      </div>
      <div class="modalfoot"><button class="closex" id="fpkNo" aria-label="Abbrechen">${ART.x}</button><span class="sub2" id="fpkCount"></span><button class="okbtn" id="fpkOk" aria-label="Hinzufügen" disabled>${ART.check}</button></div>
    </div>`;
  document.body.appendChild(ov);
  const $ = id => ov.querySelector('#' + id);
  const sync = () => {
    const s = seriesOf(series);
    $('fpkMm').textContent = `Halter ${s[3]} mm breit`;
    ov.querySelectorAll('.fpkser').forEach(x => { x.textContent = series; });
    const n = kind === 'screw' ? ($('fpsName').value.trim() ? screwN : 0) : [...pick.values()].reduce((a, b) => a + b, 0) + ($('fpkOwn').value.trim() ? 1 : 0);
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
  $('fpkKind').addEventListener('click', e => {
    const b = e.target.closest('[data-k]'); if (!b) return;
    kind = b.dataset.k; ov.querySelectorAll('#fpkKind .seg').forEach(x => x.classList.toggle('on', x === b));
    $('fpkScrew').hidden = kind !== 'screw'; $('fpkSlide').hidden = kind === 'screw'; sync();
    if (kind === 'screw') setTimeout(() => $('fpsName').focus(), 50);
  });
  $('fpsName').addEventListener('input', sync);
  $('fpsThread').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    thread = thread === b.dataset.v ? '' : b.dataset.v; $('fpsThreadOther').value = '';
    ov.querySelectorAll('#fpsThread .chip').forEach(c => c.classList.toggle('on', c.dataset.v === thread));
  });
  $('fpsThreadOther').addEventListener('input', e => { thread = e.target.value.replace(',', '.').replace(/[^\d.]/g, ''); ov.querySelectorAll('#fpsThread .chip').forEach(c => c.classList.remove('on')); });
  $('fpsMinus').addEventListener('click', () => { screwN = Math.max(1, screwN - 1); $('fpsCount').textContent = screwN; sync(); });
  $('fpsPlus').addEventListener('click', () => { screwN = Math.min(9, screwN + 1); $('fpsCount').textContent = screwN; sync(); });
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
    if (kind === 'screw') {
      list.push({ id: U.uid(), code: '', name: $('fpsName').value.trim(), kind: 'screw', thread: thread || null, series: null, count: screwN });
      await saveFilters(list);
      close(); U.haptic([20, 60, 20]); U.toast('Schraubfilter hinzugefügt');
      try { localStorage.setItem('kb-fold-cab-filters', '1'); localStorage.setItem('kb-fold-cabinet', '1'); } catch (_) {}
      route(); return;
    }
    for (const [code, n] of pick) {
      const same = list.find(f => f.code === code && f.series === series);
      if (same) same.count = (same.count || 1) + n;
      else list.push({ id: U.uid(), code, series, count: n });
    }
    const own = $('fpkOwn').value.trim();
    if (own) list.push({ id: U.uid(), code: '', name: own, kind: 'slide', series: null, count: 1 });
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
      ${filterImg(f) ? `<img class="fe-photo" src="${filterImg(f)}" alt="">` : ''}
      <h2 id="feTitle"><span class="filterbadge${f.code ? '' : ' own'}" id="feBadge">${U.esc(filterCode(f) || 'F')}</span> ${U.esc(filterName(f))}</h2>
      ${f.code ? `<div class="seggroup" id="feSeries">${COKIN_SERIES.map(([k, sz, nm]) => `<button type="button" class="seg${k === f.series ? ' on' : ''}" data-s="${k}"><b>${sz}</b><span class="sub2">${nm}</span></button>`).join('')}</div>`
        : `<label class="fld"><span>Name</span><input id="feName" maxlength="60" value="${U.esc(f.name || '')}"></label>
           <div class="seggroup" id="feKind"><button type="button" class="seg${filterKind(f) === 'slide' ? ' on' : ''}" data-k="slide">Schiebefilter</button><button type="button" class="seg${filterKind(f) === 'screw' ? ' on' : ''}" data-k="screw">Schraubfilter</button></div>
           <label class="fld" id="feThreadBox"${filterKind(f) === 'screw' ? '' : ' hidden'}><span>Gewindedurchmesser (mm)</span><input id="feThread" inputmode="decimal" value="${U.esc(String(f.thread || '').replace('.', ','))}"></label>`}
      ${(f.colors || []).length ? `<details class="gelbox"><summary>${f.colors.length} Farben${f.code === '375' ? ' und Halter' : ''}</summary><div class="gellist">${f.colors.map(c => `<span class="gelitem"><img src="img/filter-${c.img}.webp" alt="" width="30" height="30">${U.esc(c.name)}</span>`).join('')}${f.code === '375' ? '<span class="gelitem"><img src="img/filter-b375-halter.webp" alt="" width="30" height="30">Halter</span>' : ''}</div></details>` : ''}
      <div class="feex"><div class="qlabel">Beispielfotos</div><div id="feEx"><p class="hint">Lädt …</p></div></div>
      ${(f.colors || []).length ? `<div class="feex"><div class="qlabel">Farben · für Fotos je Farbe antippen</div><div class="fecolors" id="feColors"></div></div>
      <div class="feex"><div class="qlabel">Kombinationen</div><div id="feCombos"></div></div>` : ''}
      <div class="fld"><span>Anzahl</span><div class="stepper"><button type="button" id="feMinus" aria-label="weniger">−</button><span id="feCount">${f.count || 1}</span><button type="button" id="fePlus" aria-label="mehr">+</button></div></div>
      <div class="two"><label class="fld"><span>Kaufpreis (€)</span><input id="fePrice" inputmode="decimal" value="${U.esc(f.price != null ? String(f.price).replace('.', ',') : '')}"></label>
        <label class="fld"><span>Gekauft am</span><input type="date" id="feBought" value="${U.esc(f.boughtAt || '')}"></label></div>
      ${lentFields('Filter')}
      <label class="fld"><span>Notizen</span><textarea id="feNotes" rows="3">${U.esc(f.notes || '')}</textarea></label>
      <button class="btn danger small" id="feDel">Filter entfernen</button>
      <div class="modalfoot"><button class="closex" id="feNo" aria-label="Abbrechen">${ART.x}</button><button class="okbtn" id="feOk" aria-label="Speichern">${ART.check}</button></div>
    </div>`;
  document.body.appendChild(ov);
  const $ = id => ov.querySelector('#' + id);
  const ed = { ...f, count: f.count || 1 };
  lentWire(ov, ed);
  $('feSeries')?.addEventListener('click', e => {
    const b = e.target.closest('[data-s]'); if (!b) return;
    ed.series = b.dataset.s; ov.querySelectorAll('#feSeries .seg').forEach(x => x.classList.toggle('on', x === b));
    $('feBadge').textContent = filterCode(ed);
  });
  $('feKind')?.addEventListener('click', e => {
    const b = e.target.closest('[data-k]'); if (!b) return;
    ed.kind = b.dataset.k; ov.querySelectorAll('#feKind .seg').forEach(x => x.classList.toggle('on', x === b));
    $('feThreadBox').hidden = ed.kind !== 'screw';
  });
  // Beispielfotos (eigene Uploads und Fotos aus Frames); beim Farbfolien-Set zusätzlich eine Kachel je Farbe und Kombinationen
  const fresh = async () => (await getFilters()).find(x => x.id === f.id) || f;
  const drawSet = async () => {
    const cur = await fresh();
    if ($('feColors')) $('feColors').innerHTML = await filterColorTiles(cur);
    if ($('feCombos')) $('feCombos').innerHTML = await filterComboList(cur);
  };
  renderFilterExamples($('feEx'), f, null);
  if ((f.colors || []).length) {
    drawSet();
    $('feColors').addEventListener('click', async e => {
      const t = e.target.closest('[data-color]'); if (!t) return;
      const cur = await fresh(); const c = cur.colors.find(x => x.k === t.dataset.color);
      if (c) openFilterColor(cur, c, drawSet);
    });
    $('feCombos').addEventListener('click', async e => {
      const del = e.target.closest('[data-delup]');
      if (del) { await removeFilterUpload(f.id, del.dataset.delup); drawSet(); return; }
      const z = e.target.closest('[data-zoomimg]'); if (z) { zoom(await U.imgUrl(z.dataset.zoomimg)); return; }
      if (e.target.closest('#feComboAdd')) openFilterCombo(await fresh(), drawSet);
    });
  }
  $('feMinus').addEventListener('click', () => { ed.count = Math.max(1, ed.count - 1); $('feCount').textContent = ed.count; });
  $('fePlus').addEventListener('click', () => { ed.count = Math.min(99, ed.count + 1); $('feCount').textContent = ed.count; });
  const close = () => ov.remove();
  $('feNo').addEventListener('click', close);
  ov.addEventListener('click', e => { if (e.target === ov) close(); });
  $('feOk').addEventListener('click', async () => {
    ed.notes = $('feNotes').value.trim();
    lentRead(ov, ed);
    { const p = parseFloat($('fePrice').value.replace(',', '.')); ed.price = isNaN(p) ? null : Math.round(p * 100) / 100; ed.boughtAt = $('feBought').value || null; }
    if ($('feName')) ed.name = $('feName').value.trim() || f.name;
    if ($('feThread')) { const t = $('feThread').value.replace(',', '.').replace(/[^\d.]/g, ''); ed.thread = filterKind(ed) === 'screw' && t ? t : null; }
    // Beispielfotos werden sofort gespeichert und hier nicht vom Stand beim Öffnen überschrieben
    const list = (await getFilters()).map(x => x.id === f.id ? { ...ed, examples: x.examples, colorExamples: x.colorExamples, uploads: x.uploads } : x);
    await saveFilters(list); close(); U.toast('Gespeichert'); route();
  });
  $('feDel').addEventListener('click', async () => {
    const before = await getFilters();
    await saveFilters(before.filter(x => x.id !== f.id)); close(); route();
    U.undo(`${filterCode(f) || filterName(f)} entfernt`, async () => { await saveFilters(before); route(); });
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
  ['labor', 'Laborequipment', '<path d="M9 3h6M10 3v6l-5 10a1.6 1.6 0 0 0 1.4 2.3h11.2A1.6 1.6 0 0 0 19 19l-5-10V3"/><path d="M7.5 15h9"/>'],
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
  const rows = [...list].sort((a, b) => (!!b.fav - !!a.fav) || order.indexOf(a.kind) - order.indexOf(b.kind) || (a.name || '').localeCompare(b.name || '')).map(a => {
    const names = (a.cameraIds || []).map(id => cams.find(c => c.id === id)).filter(Boolean).map(camLabel);
    return `<button type="button" class="crow accrow" data-acc="${a.id}">
      <span class="crowart accart"><span class="accicon">${accIcon(a.kind, 26)}</span>${favStar('accessories', a)}</span>
      <span class="frowmain">
        <span class="frowname">${U.esc([a.maker, a.name].filter(Boolean).join(' ') || accKind(a.kind)[1])}</span>
        <span class="frowchips">${lentChip(a)}<span>${U.esc(accKind(a.kind)[1])}</span>${names.map(n => `<span>${U.esc(n)}</span>`).join('')}</span>
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
      ${cams.length ? `<div class="qlabel" id="acCamsLbl"${ed.kind === 'labor' ? ' hidden' : ''}>Passt an</div><div class="camchecks" id="acCams"${ed.kind === 'labor' ? ' hidden' : ''}>${cams.map(c => `<label class="camcheck"><input type="checkbox" value="${c.id}" ${ed.cameraIds.includes(c.id) ? 'checked' : ''}><span>${U.esc(camLabel(c))}</span></label>`).join('')}</div>` : ''}
      <div class="two"><label class="fld"><span>Kaufpreis (€)</span><input id="acPrice" inputmode="decimal" value="${U.esc(ed.price != null ? String(ed.price).replace('.', ',') : '')}"></label>
        <label class="fld"><span>Gekauft am</span><input type="date" id="acBought" value="${U.esc(ed.boughtAt || '')}"></label></div>
      <label class="fld" id="acGnBox"${ed.kind === 'blitz' ? '' : ' hidden'}><span>Leitzahl (ISO 100, Meter)</span><input id="acGn" inputmode="decimal" value="${U.esc(ed.gn != null ? String(ed.gn).replace('.', ',') : '')}"></label>
      ${lentFields('Zubehör')}
      <label class="fld"><span>Notizen</span><textarea id="acNotes" rows="3">${U.esc(ed.notes || '')}</textarea></label>
      ${isNew ? '' : '<button class="btn danger small" id="acDel">Zubehör entfernen</button>'}
      <div class="modalfoot"><button class="closex" id="acNo" aria-label="Abbrechen">${ART.x}</button><button class="okbtn" id="acOk" aria-label="Speichern">${ART.check}</button></div>
    </div>`;
  document.body.appendChild(ov);
  const $ = id => ov.querySelector('#' + id);
  lentWire(ov, ed);
  $('acKinds').addEventListener('click', e => {
    const b = e.target.closest('[data-k]'); if (!b) return;
    ed.kind = b.dataset.k; ov.querySelectorAll('.acckind').forEach(x => x.classList.toggle('on', x === b));
    $('acGnBox').hidden = ed.kind !== 'blitz';
    // Laborequipment (Tank, Spirale, Thermometer, Messbecher …) gehört zu keiner Kamera
    if ($('acCams')) { $('acCams').hidden = ed.kind === 'labor'; $('acCamsLbl').hidden = ed.kind === 'labor'; }
  });
  $('acMinus').addEventListener('click', () => { ed.count = Math.max(1, (ed.count || 1) - 1); $('acCount').textContent = ed.count; });
  $('acPlus').addEventListener('click', () => { ed.count = Math.min(99, (ed.count || 1) + 1); $('acCount').textContent = ed.count; });
  const close = () => ov.remove();
  $('acNo').addEventListener('click', close);
  ov.addEventListener('click', e => { if (e.target === ov) close(); });
  $('acOk').addEventListener('click', async () => {
    ed.maker = $('acMaker').value.trim(); ed.name = $('acName').value.trim(); ed.notes = $('acNotes').value.trim();
    lentRead(ov, ed);
    { const p = parseFloat($('acPrice').value.replace(',', '.')); ed.price = isNaN(p) ? null : Math.round(p * 100) / 100; ed.boughtAt = $('acBought').value || null; }
    { const g = parseFloat($('acGn').value.replace(',', '.')); ed.gn = ed.kind === 'blitz' && g > 0 ? g : null; }
    ed.cameraIds = ed.kind === 'labor' ? [] : [...ov.querySelectorAll('#acCams input:checked')].map(i => i.value);
    const list = await getAccessories();
    const i = list.findIndex(x => x.id === ed.id);
    if (i >= 0) list[i] = ed; else list.push(ed);
    await saveAccessories(list);
    close(); if (isNew) U.haptic([20, 60, 20]);
    U.toast(isNew ? 'Zubehör hinzugefügt' : 'Gespeichert');
    try { localStorage.setItem('kb-fold-cab-acc', '1'); localStorage.setItem('kb-fold-cabinet', '1'); } catch (_) {}
    route();
  });
  $('acDel')?.addEventListener('click', async () => {
    const before = await getAccessories();
    await saveAccessories(before.filter(x => x.id !== ed.id)); close(); route();
    U.undo('Zubehör entfernt', async () => { await saveAccessories(before); route(); });
  });
}

/* ---------- Fotos der Filter: freigestellt aus Rebeccas Aufnahmen auf dem Leuchtpult, einheitlich 400 × 400 px.
   Cokin-Filter nach Nummer (gilt für jede Größe, eigene Aufnahme der Serie hat Vorrang), eigene Filter über das Feld img. ---------- */
const FILTER_IMG_SER = { B160: 'b160', B058: 'b058', B375: 'b375' };
const FILTER_IMG_CODE = Object.fromEntries(['005', '021', '029', '056', '061', '084', '086', '103', '121', '124', '132', '133', '151', '160', '185', '195', '196', '201', '230', '345', '397'].map(c => [c, 'a' + c]));
// Farbfolien-Set B375: ein Eintrag im Kameraschrank, die Farben einzeln wählbar (Kennung im Bild: f-b375#rot)
const B375_COLORS = [['gelb', 'Honiggelb', '#f1b762'], ['goldgelb', 'Goldgelb', '#c99401'], ['pfirsich', 'Pfirsich', '#e5bc9d'], ['kupfer', 'Kupferorange', '#e4853a'], ['leuchtorange', 'Leuchtorange', '#db6901'], ['rot', 'Signalrot mit Loch', '#fe5340'], ['koralle', 'Koralle', '#e2637f'], ['pink', 'Pink', '#f17ab2'], ['lavendel', 'Lavendel', '#9880b2'], ['violett', 'Violett', '#520096'], ['ultramarin', 'Ultramarin', '#4146ca'], ['blau', 'Kobaltblau', '#0170dd'], ['eisblau', 'Eisblau', '#95a8d4'], ['himmelblau', 'Himmelblau', '#7cbad7'], ['tuerkis', 'Türkis', '#05cbdf'], ['gruen', 'Grasgrün', '#6bec32'], ['hellgrau', 'Hellgrau', '#949395'], ['grau', 'Grau', '#878a83']]
  .map(([k, name, hex]) => ({ k, name, hex, img: 'b375-' + k }));
function filterById(list, id) {
  const [base, ck] = String(id).split('#');
  const f = list.find(x => x.id === base);
  if (!f || !ck) return f || null;
  const c = (f.colors || []).find(x => x.k === ck);
  return c ? { ...f, id, colorKey: ck, colorName: c.name, img: c.img } : f;
}
const filterShort = f => f.colorName || filterCode(f) || filterName(f);
function filterImg(f) {
  if (!f) return null;
  const k = f.img || FILTER_IMG_SER[(f.series || '') + f.code] || (f.code && FILTER_IMG_CODE[f.code]);
  return k ? `img/filter-${k}.webp` : null;
}

// Rebeccas Filter (Stand 26.10.2026). Feste Kennungen, damit ein erneutes Laden nichts doppelt anlegt.
const OWNLESS = 'Ohne Herstellerangabe.';
const CF_NOTE = 'Effektfilter mit Klarglas-Mitte, Hersteller unbekannt (Aufdruck „PAT NO. 13783“).';
const SEED_FILTERS = [
  ...[['160', 'A', 1], ['160', 'B', 1, 'Am Ring ist nur „160“ lesbar. Serie vermutlich B wie beim Sternfilter B058.'], ['058', 'B', 1], ['056', 'A', 1],
    ['121', 'A', 2], ['124', 'A', 1], ['132', 'A', 1], ['133', 'A', 1], ['151', 'A', 1],
    ['005', 'A', 1], ['021', 'A', 1], ['029', 'A', 1], ['084', 'A', 2], ['086', 'A', 1], ['230', 'A', 1],
    ['061', 'A', 1], ['185', 'A', 1], ['195', 'A', 1], ['196', 'A', 1], ['201', 'A', 1], ['103', 'A', 1],
    ['345', 'A', 1, 'Zwei Masken: schwarz mit Loch und klar mit schwarzem Punkt.'], ['397', 'A', 1]]
    .map(([code, series, count, notes]) => ({ id: `f-${series.toLowerCase()}${code}`, code, series, count, ...(notes ? { notes } : {}) })),
  ...[['grad-hell', 'Verlaufsfilter Gelb hell'], ['grad-tabak', 'Verlaufsfilter Tabak'], ['grad-oliv', 'Verlaufsfilter Oliv'], ['grad-gruengrau', 'Verlaufsfilter Graugrün'], ['grad-rose', 'Verlaufsfilter Rosé']]
    .map(([img, name]) => ({ id: 'f-' + img, code: '', name, kind: 'slide', series: null, count: 1, img, notes: OWNLESS })),
  ...[['cf1', 'CF-1 Aurora'], ['cf3', 'CF-3 Radial Zoom'], ['cf4', 'CF-4 Swirl'], ['cf7', 'CF-7 Barrel'], ['cf10', 'CF-10 Diamond Cross']]
    .map(([img, name]) => ({ id: 'f-' + img, code: '', name, kind: 'slide', series: null, count: 1, img, notes: CF_NOTE })),
  { id: 'f-b375', code: '375', series: 'B', count: 1, colors: B375_COLORS, notes: '18 Farbfolien und ein Halter, Schachtel „Creative Filter B. 375“.' },
  { id: 'f-zeiss-g1', code: '', name: 'Carl Zeiss Jena G1 (Gelb)', kind: 'screw', thread: '49', series: null, count: 1, img: 'zeiss-g1', notes: 'Gelbfilter, Aufdruck „G 1 / M 49“.' }
];
// Fehlende Filter ergänzen. Cokin-Filter gelten als vorhanden, wenn Nummer und Serie schon in der Liste stehen.
async function mergeSeedFilters() {
  const list = await getFilters();
  let n = 0;
  for (const s of SEED_FILTERS) {
    const has = list.some(f => f.id === s.id || (s.code && f.code === s.code && f.series === s.series));
    if (!has) { list.push(JSON.parse(JSON.stringify(s))); n++; }
  }
  if (n) await saveFilters(list);
  return n;
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
  const src = filterImg(f);
  if (src) return `<img class="filterart fimg" src="${src}" alt="" width="${size}" height="${size}" loading="lazy">`;
  const t = filterTint(f), id = 'fa' + Math.random().toString(36).slice(2, 7);
  const round = filterKind(f) === 'screw';
  const fill = t.grad
    ? `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.a}" stop-opacity=".9"/><stop offset=".5" stop-color="${t.a}" stop-opacity=".35"/><stop offset=".62" stop-color="${t.a}" stop-opacity="0"/></linearGradient>`
    : `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.a}" stop-opacity=".92"/><stop offset="1" stop-color="${t.b}" stop-opacity=".78"/></linearGradient>`;
  const shape = round
    ? `<circle cx="20" cy="20" r="17.5" fill="#1d1f22"/><circle cx="20" cy="20" r="14.5" fill="url(#${id})"/><circle cx="20" cy="20" r="14.5" fill="none" stroke="#fff" stroke-opacity=".25"/><path d="M11 13a11 11 0 0 1 9-5" stroke="#fff" stroke-opacity=".55" stroke-width="2" fill="none" stroke-linecap="round"/>`
    : `<rect x="5" y="3" width="30" height="34" rx="3" fill="#fff" fill-opacity=".12" stroke="#9aa3ad" stroke-opacity=".7"/><rect x="5" y="3" width="30" height="34" rx="3" fill="url(#${id})"/><path d="M9 8l6 0" stroke="#fff" stroke-opacity=".6" stroke-width="2" stroke-linecap="round"/>`;
  return `<svg class="filterart" viewBox="0 0 40 40" width="${size}" height="${size}" aria-hidden="true"><defs>${fill}</defs>${shape}</svg>`;
}

const IR_FILM_IDS = ['ilford-sfx200'];
const isIrFilm = st => !!st && (st.type === 'ir' || IR_FILM_IDS.includes(st.id));
const isIrFilter = f => filterTint(f).a === '#2a0508';


/* ---------- Beispielfotos zu Filtern ----------
   f.examples: Frame-ids (ganzer Filter), f.colorExamples[k]: Frame-ids je Farbe,
   f.uploads: eigene Fotos { id, imgId, color?, combo?: [Farbschlüssel] }. Alles liegt im Filtereintrag (meta filters). */
const usesFilterId = (id, base, ck) => ck ? id === base + '#' + ck : (id === base || String(id).startsWith(base + '#'));
async function patchFilter(id, fn) { const list = await getFilters(); const it = list.find(x => x.id === id); if (!it) return null; fn(it); await saveFilters(list); return it; }
async function removeFilterUpload(fid, upId) {
  let img = null;
  await patchFilter(fid, it => { const u = (it.uploads || []).find(x => x.id === upId); img = u?.imgId; it.uploads = (it.uploads || []).filter(x => x.id !== upId); });
  if (img) await deleteImage(img);
  U.haptic && U.haptic(10);
}
async function filterFramesFor(f, ck) {
  const rolls = new Map((await DB.all('rolls')).map(r => [r.id, r]));
  const used = (await DB.all('frames')).filter(fr => fr.imgId && (fr.filterIds || []).some(id => usesFilterId(id, f.id, ck)))
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  return { used, label: fr => [rolls.get(fr.rollId)?.title, 'Bild ' + (fr.index === 0 ? '0' : fr.index)].filter(Boolean).join(' · ') };
}
// Beispielbereich: oben eigene Uploads und ausgewählte Frame-Fotos groß, dann „Foto hochladen“, darunter aufklappbar alle Fotos mit dem Filter
async function renderFilterExamples(box, f0, ck, onChange) {
  const { used, label } = await filterFramesFor(f0, ck);
  const thumbs = new Map(await Promise.all(used.map(async fr => [fr.id, await U.imgUrl(fr.imgId, true)])));
  const draw = async () => {
    const f = (await getFilters()).find(x => x.id === f0.id) || f0;
    const picks = (ck ? (f.colorExamples || {})[ck] : f.examples) || [];
    const ups = (f.uploads || []).filter(u => ck ? u.color === ck && !u.combo : !u.color && !u.combo);
    const upUrls = await Promise.all(ups.map(u => U.imgUrl(u.imgId, true)));
    const sel = picks.map(id => used.find(u => u.id === id)).filter(Boolean);
    const big = [...ups.map((u, i) => `<div class="feexbig"><button type="button" class="feexzoom" data-zoomimg="${u.imgId}" aria-label="Vergrößern"><img src="${upUrls[i]}" alt=""></button><span>Eigenes Foto</span><button type="button" class="feexdel" data-delup="${u.id}" aria-label="Foto entfernen">${ART.x}</button></div>`),
      ...sel.map(fr => `<div class="feexbig"><button type="button" class="feexzoom" data-zoomimg="${fr.imgId}" aria-label="Vergrößern"><img src="${thumbs.get(fr.id)}" alt=""></button><span>${U.esc(label(fr))}</span></div>`)];
    box.innerHTML = (big.length ? `<div class="feexsel">${big.join('')}</div>` : '')
      + `<label class="btn ghost small feexup">${ART.pickup}<span>Foto hochladen</span><input type="file" accept="image/*" multiple hidden></label>`
      + (used.length ? `<details class="feexall"${big.length ? '' : ' open'}><summary>Fotos aus deinen Rollen · ${used.length}</summary><div class="feexgrid">${used.map(fr => `<button type="button" class="feexpick${picks.includes(fr.id) ? ' on' : ''}" data-pick="${fr.id}" aria-pressed="${picks.includes(fr.id)}" aria-label="${U.esc(label(fr))}"><img src="${thumbs.get(fr.id)}" alt="" loading="lazy"><i></i></button>`).join('')}</div></details>`
        : '<p class="hint">Fotos aus deinen Rollen erscheinen hier zur Auswahl, sobald du den Filter bei einem Bild einträgst und das Foto hochgeladen ist.</p>');
    box.querySelector('.feexup input').addEventListener('change', async e => {
      const files = [...e.target.files]; if (!files.length) return;
      U.toast(files.length > 1 ? `${files.length} Fotos werden gespeichert …` : 'Foto wird gespeichert …');
      const recs = []; for (const file of files) recs.push(await U.storeImage(file, 'filter'));
      await patchFilter(f0.id, it => { it.uploads = [...(it.uploads || []), ...recs.map(r => ({ id: U.uid(), imgId: r.id, ...(ck ? { color: ck } : {}) }))]; });
      U.haptic && U.haptic([12, 40, 12]); await draw(); onChange && onChange();
    });
  };
  box.onclick = async e => {
    const z = e.target.closest('[data-zoomimg]'); if (z) { zoom(await U.imgUrl(z.dataset.zoomimg)); return; }
    const d = e.target.closest('[data-delup]'); if (d) { await removeFilterUpload(f0.id, d.dataset.delup); await draw(); onChange && onChange(); return; }
    const p = e.target.closest('[data-pick]'); if (!p) return;
    const open = box.querySelector('.feexall')?.open;
    await patchFilter(f0.id, it => {
      const list = ck ? ((it.colorExamples = it.colorExamples || {})[ck] = it.colorExamples[ck] || []) : (it.examples = it.examples || []);
      const i = list.indexOf(p.dataset.pick); if (i >= 0) list.splice(i, 1); else list.push(p.dataset.pick);
    });
    U.haptic && U.haptic(10); await draw(); const det = box.querySelector('.feexall'); if (det) det.open = open; onChange && onChange();
  };
  await draw();
}
// Farbkacheln des Sets mit Anzahl der Fotos je Farbe
async function filterColorTiles(f) {
  const frames = (await DB.all('frames')).filter(fr => fr.imgId);
  return f.colors.map(c => {
    const n = frames.filter(fr => (fr.filterIds || []).includes(f.id + '#' + c.k)).length + (f.uploads || []).filter(u => u.color === c.k && !u.combo).length;
    return `<button type="button" class="fecolor" data-color="${c.k}"><img src="img/filter-${c.img}.webp" alt=""><span>${U.esc(c.name)}</span>${n ? `<b>${n}</b>` : ''}</button>`;
  }).join('');
}
async function filterComboList(f) {
  const combos = (f.uploads || []).filter(u => (u.combo || []).length);
  const urls = await Promise.all(combos.map(u => U.imgUrl(u.imgId, true)));
  const cname = k => (f.colors.find(c => c.k === k) || {}).name || k;
  return (combos.length ? `<div class="fecombos">${combos.map((u, i) => `<div class="fecombo"><button type="button" class="feexzoom" data-zoomimg="${u.imgId}" aria-label="Vergrößern"><img src="${urls[i]}" alt=""></button>
      <div class="fecombotxt"><span class="fecombochips">${u.combo.map(k => { const c = f.colors.find(x => x.k === k); return c ? `<img src="img/filter-${c.img}.webp" alt="" title="${U.esc(c.name)}">` : ''; }).join('')}</span><span class="sub2">${U.esc(u.combo.map(cname).join(' + '))}</span></div>
      <button type="button" class="feexdel" data-delup="${u.id}" aria-label="Kombination entfernen">${ART.x}</button></div>`).join('')}</div>` : '<p class="hint">Noch keine Kombination. Wähle zwei oder mehr Farben, die du übereinander benutzt hast, und lade das Ergebnis hoch.</p>')
    + '<button type="button" class="btn ghost small" id="feComboAdd">+ Kombination hinzufügen</button>';
}
// Eine Farbe des Sets: eigene Beispielfotos nur für dieses Plättchen
function openFilterColor(f, c, onClose) {
  const ov = document.createElement('div');
  ov.className = 'modalbg';
  ov.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="fcTitle">
      <div class="fecolorhead"><img src="img/filter-${c.img}.webp" alt=""><div><h2 id="fcTitle">${U.esc(c.name)}</h2><p class="sub2">${U.esc(filterName(f))}</p></div></div>
      <div class="feex"><div class="qlabel">Beispielfotos mit dieser Farbe</div><div id="fcEx"><p class="hint">Lädt …</p></div></div>
      <div class="modalfoot"><button class="closex" id="fcNo" aria-label="Schließen">${ART.x}</button><span></span></div></div>`;
  document.body.appendChild(ov);
  const close = () => { ov.remove(); onClose && onClose(); };
  ov.querySelector('#fcNo').addEventListener('click', close);
  ov.addEventListener('click', e => { if (e.target === ov) close(); });
  renderFilterExamples(ov.querySelector('#fcEx'), f, c.k);
}
// Kombination: Farben wählen, dann das Ergebnis hochladen
function openFilterCombo(f, onDone) {
  const chosen = new Set();
  const ov = document.createElement('div');
  ov.className = 'modalbg';
  ov.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="fkTitle">
      <h2 id="fkTitle">Kombination</h2>
      <p class="hint">Welche Farben lagen übereinander? Mindestens zwei antippen, dann das Foto hochladen.</p>
      <div class="fecolors pick" id="fkColors">${f.colors.map(c => `<button type="button" class="fecolor" data-k="${c.k}" aria-pressed="false"><img src="img/filter-${c.img}.webp" alt=""><span>${U.esc(c.name)}</span></button>`).join('')}</div>
      <label class="btn accent wide feexup disabled" id="fkUp">${ART.pickup}<span>Ergebnis hochladen</span><input type="file" accept="image/*" hidden disabled></label>
      <div class="modalfoot"><button class="closex" id="fkNo" aria-label="Abbrechen">${ART.x}</button><span class="sub2" id="fkCount"></span></div></div>`;
  document.body.appendChild(ov);
  const $ = id => ov.querySelector('#' + id);
  const sync = () => {
    const ok = chosen.size >= 2;
    $('fkUp').classList.toggle('disabled', !ok); $('fkUp').querySelector('input').disabled = !ok;
    $('fkCount').textContent = chosen.size ? `${chosen.size} ${chosen.size === 1 ? 'Farbe' : 'Farben'}` : '';
  };
  $('fkColors').addEventListener('click', e => {
    const b = e.target.closest('[data-k]'); if (!b) return;
    if (chosen.has(b.dataset.k)) chosen.delete(b.dataset.k); else chosen.add(b.dataset.k);
    b.classList.toggle('on', chosen.has(b.dataset.k)); b.setAttribute('aria-pressed', chosen.has(b.dataset.k));
    U.haptic && U.haptic(8); sync();
  });
  $('fkUp').querySelector('input').addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file || chosen.size < 2) return;
    const rec = await U.storeImage(file, 'filter');
    await patchFilter(f.id, it => { it.uploads = [...(it.uploads || []), { id: U.uid(), imgId: rec.id, combo: [...chosen] }]; });
    U.toast('Kombination gespeichert'); U.haptic && U.haptic([12, 40, 12]);
    ov.remove(); onDone && onDone();
  });
  $('fkNo').addEventListener('click', () => ov.remove());
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
  sync();
}
