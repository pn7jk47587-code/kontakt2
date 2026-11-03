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
  const fr = (await DB.all('frames')).filter(f => f.placeLat != null && f.placeLng != null);
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
