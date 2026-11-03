/* Weltkarte: jedes Foto mit Koordinaten als kleines Vorschaubild an seinem Aufnahmeort.
   Karte: OpenFreeMap, Stil „Liberty“ mit 3D-Gebäuden, gezeichnet mit MapLibre GL JS (kein Schlüssel nötig). */
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
let MAPLIBRE_P = null;
function loadMapLibre() {
  if (window.maplibregl) return Promise.resolve();
  if (MAPLIBRE_P) return MAPLIBRE_P;
  MAPLIBRE_P = new Promise((res, rej) => {
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'vendor/maplibre/maplibre-gl.css'; document.head.appendChild(css);
    const js = document.createElement('script'); js.src = 'vendor/maplibre/maplibre-gl.js'; js.onload = res; js.onerror = () => { MAPLIBRE_P = null; rej(new Error('Karte konnte nicht geladen werden')); };
    document.head.appendChild(js);
  });
  return MAPLIBRE_P;
}

async function mapPhotos() {
  // auch Bilder ohne Scan und ohne Handyfoto (noch nicht entwickelt): dann mit Platzhalter
  // ohne eigenen Ort: am groben Ort der Rolle, falls festgelegt
  const rolls = new Map((await DB.all('rolls')).map(r => [r.id, r]));
  const fr = (await DB.all('frames')).map(f => {
    if (f.placeLat != null && f.placeLng != null) return f;
    const r = rolls.get(f.rollId);
    return r && r.placeLat != null && (f.imgId || f.shot) ? { ...f, placeLat: r.placeLat, placeLng: r.placeLng, place: f.place || r.place, rough: true } : null;
  }).filter(Boolean);
  return Promise.all(fr.map(async f => ({ f, url: f.imgId || f.phoneId ? await U.imgUrl(f.imgId || f.phoneId, true) : null })));
}

async function viewMap() {
  setHeader('Karte');
  document.body.classList.add('mapmode');
  view.innerHTML = `<div class="mapwrap"><div id="photoMap" class="photomap"></div></div>`;
  const pts = await mapPhotos();
  const wrap = view.querySelector('.mapwrap');
  if (!pts.length) wrap.insertAdjacentHTML('beforeend', '<p class="mapempty">Noch keine Fotos mit Ort</p>');
  try { await loadMapLibre(); } catch (e) { wrap.insertAdjacentHTML('beforeend', `<p class="mapempty">${U.esc(e.message)}</p>`); return; }
  const el = view.querySelector('#photoMap'); if (!el) return;
  let map;
  try {
    map = new maplibregl.Map({ container: el, style: MAP_STYLE, center: [10.4, 51.2], zoom: 4.5, pitch: 0, maxPitch: 70, attributionControl: { compact: true } });
  } catch (e) { wrap.insertAdjacentHTML('beforeend', '<p class="mapempty">Karte konnte nicht geladen werden</p>'); return; }
  // Beim Verlassen der Ansicht die Karte freigeben
  const stop = () => { if (!document.body.contains(el)) { try { map.remove(); } catch (_) {} window.removeEventListener('hashchange', later); } };
  const later = () => setTimeout(stop, 0);
  window.addEventListener('hashchange', later);
  // Auf die Fotos zoomen, leicht gekippt, damit nah herangezoomt die Gebäude in 3D erscheinen
  if (pts.length) {
    const b = new maplibregl.LngLatBounds();
    pts.forEach(p => b.extend([+p.f.placeLng, +p.f.placeLat]));
    map.fitBounds(b, { padding: 70, maxZoom: 16, pitch: 50, duration: 0 });
  }
  // Fotos, die auf dem Bildschirm übereinanderliegen, als Stapel mit Zahl zeigen
  let markers = [];
  const draw = () => {
    markers.forEach(m => m.remove()); markers = [];
    const groups = [];
    pts.forEach(p => {
      const px = map.project([+p.f.placeLng, +p.f.placeLat]);
      const g = groups.find(g => Math.abs(g.px.x - px.x) < 44 && Math.abs(g.px.y - px.y) < 44);
      if (g) g.items.push(p); else groups.push({ px, ll: [+p.f.placeLng, +p.f.placeLat], items: [p] });
    });
    groups.forEach(g => {
      const first = g.items[0];
      const node = document.createElement('button');
      node.type = 'button'; node.className = 'mapthumb';
      node.setAttribute('aria-label', (first.f.place || 'Foto') + (g.items.length > 1 ? `, ${g.items.length} Fotos` : ''));
      node.innerHTML = `<span class="mtimg${first.url ? '' : ' mtph'}"${first.url ? ` style="background-image:url('${first.url}')"` : ''}>${first.url ? '' : `<b>${U.esc(frameLabel(first.f))}</b>`}</span>${g.items.length > 1 ? `<span class="mtn">${g.items.length}</span>` : ''}`;
      node.addEventListener('click', e => {
        e.stopPropagation();
        const lngs = g.items.map(p => +p.f.placeLng), lats = g.items.map(p => +p.f.placeLat);
        const same = Math.max(...lngs) - Math.min(...lngs) < 1e-4 && Math.max(...lats) - Math.min(...lats) < 1e-4;
        if (g.items.length === 1 || same || map.getZoom() >= 17.5) location.hash = (first.f.imgId ? '#/foto/alle/' : '#/bild/') + first.f.id;
        else map.easeTo({ center: [(Math.min(...lngs) + Math.max(...lngs)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2], zoom: Math.min(18, map.getZoom() + 3) });
      });
      const label = node.getAttribute('aria-label');
      markers.push(new maplibregl.Marker({ element: node, anchor: 'bottom', offset: [0, -6] }).setLngLat(g.ll).addTo(map));
      node.setAttribute('aria-label', label);   // MapLibre setzt sonst „Map marker“
    });
  };
  // Vorschaubilder sofort zeigen, auch wenn der Kartenstil noch lädt oder ohne Netz gar nicht kommt
  draw();
  map.on('load', draw);
  map.on('moveend', draw);
  map.on('error', ev => console.warn('Karte:', ev && ev.error && ev.error.message));
}

/* Ort auf einer Karte wählen: verschieben und zoomen, die Nadel in der Mitte markiert den Ort.
   Suche über OpenStreetMap Nominatim (nur auf Tastendruck, keine Vorschläge beim Tippen, wie es die Nutzungsregeln verlangen). */
const MAP_PICK_IC = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3.5 6.5 9 4l6 2.5 5.5-2.5v13.5L15 20l-6-2.5-5.5 2.5z"/><path d="M9 4v13.5M15 6.5V20"/></svg>';
async function openMapPicker(start, onPick, opts = {}) {
  const ov = document.createElement('div');
  ov.className = 'modalbg mappickbg';
  ov.innerHTML = `<div class="modal mappick" role="dialog" aria-modal="true" aria-label="Ort auf der Karte wählen">
    <form class="mpsearch" id="mpForm"><input id="mpQ" type="search" enterkeyhint="search" autocomplete="off" aria-label="Ort suchen" placeholder="Suchen"><button type="submit" class="mpgo" aria-label="Suchen">${typeof SEARCH_IC !== 'undefined' ? SEARCH_IC : '⌕'}</button></form>
    <div class="mpres" id="mpRes" hidden></div>
    <div class="mpmapwrap"><div id="mpMap" class="mpmap"></div><span class="mppin" aria-hidden="true">${typeof PIN_IC !== 'undefined' ? PIN_IC : ''}</span></div>
    <p class="mpname sub2" id="mpName"></p>
    <div class="modalfoot"><button class="closex" id="mpNo" aria-label="Abbrechen">${ART.x}</button><button class="okbtn" id="mpOk" aria-label="Ort übernehmen">${ART.check}</button></div>
  </div>`;
  document.body.appendChild(ov);
  const close = () => ov.remove();
  ov.querySelector('#mpNo').addEventListener('click', close);
  try { await loadMapLibre(); } catch (e) { ov.querySelector('#mpName').textContent = e.message; return; }
  const has = start && start.lat != null && start.lng != null;
  const map = new maplibregl.Map({ container: ov.querySelector('#mpMap'), style: MAP_STYLE, center: has ? [+start.lng, +start.lat] : [10.4, 51.2], zoom: has ? 15 : 4.5, attributionControl: { compact: true } });
  let chosenName = null;
  const nameEl = ov.querySelector('#mpName');
  map.on('movestart', () => { chosenName = null; nameEl.textContent = ''; });
  // Suche
  const res = ov.querySelector('#mpRes');
  ov.querySelector('#mpForm').addEventListener('submit', async e => {
    e.preventDefault();
    const q = ov.querySelector('#mpQ').value.trim(); if (!q) return;
    res.hidden = false; res.innerHTML = '<p class="sub2">Suche …</p>';
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&accept-language=de&q=${encodeURIComponent(q)}`);
      const list = await r.json();
      res.innerHTML = list.length ? list.map((x, i) => `<button type="button" class="mpitem" data-i="${i}">${U.esc(x.display_name)}</button>`).join('') : '<p class="sub2">Nichts gefunden</p>';
      res.querySelectorAll('[data-i]').forEach(b => b.addEventListener('click', () => {
        const x = list[+b.dataset.i]; res.hidden = true;
        const bb = x.boundingbox && x.boundingbox.map(Number);
        if (bb && opts.city) map.fitBounds([[bb[2], bb[0]], [bb[3], bb[1]]], { padding: 20, duration: 600 });
        else map.flyTo({ center: [+x.lon, +x.lat], zoom: Math.max(map.getZoom(), x.type === 'city' ? 11 : 16), duration: 700 });
        map.once('moveend', () => { chosenName = String(x.name || x.display_name.split(',')[0]); nameEl.textContent = x.display_name; });
      }));
    } catch (_) { res.innerHTML = '<p class="sub2">Suche nicht erreichbar</p>'; }
  });
  ov.querySelector('#mpOk').addEventListener('click', async () => {
    const c = map.getCenter();
    const btn = ov.querySelector('#mpOk'); btn.disabled = true;
    let name = chosenName;
    if (!name && typeof placeName === 'function') name = await placeName(c.lat, c.lng);
    const cc = typeof placeName === 'function' ? placeName.cc : null;
    try { map.remove(); } catch (_) {}
    close();
    onPick({ lat: c.lat, lng: c.lng, name: name || null, cc: cc || null, zoom: map.getZoom ? undefined : undefined });
  });
}
