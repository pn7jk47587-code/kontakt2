/* Weltkarte: jedes Foto mit Koordinaten als kleines Vorschaubild an seinem Aufnahmeort */
let LEAFLET_P = null;
function loadLeaflet() {
  if (window.L) return Promise.resolve();
  if (LEAFLET_P) return LEAFLET_P;
  LEAFLET_P = new Promise((res, rej) => {
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'vendor/leaflet/leaflet.css'; document.head.appendChild(css);
    const js = document.createElement('script'); js.src = 'vendor/leaflet/leaflet.js'; js.onload = res; js.onerror = () => { LEAFLET_P = null; rej(new Error('Karte konnte nicht geladen werden')); };
    document.head.appendChild(js);
  });
  return LEAFLET_P;
}

async function mapPhotos() {
  const fr = (await DB.all('frames')).filter(f => f.placeLat != null && f.placeLng != null && (f.imgId || f.phoneId));
  return Promise.all(fr.map(async f => ({ f, url: await U.imgUrl(f.imgId || f.phoneId, true) })));
}

async function viewMap() {
  setHeader('Karte');
  document.body.classList.add('mapmode');
  view.innerHTML = `<div class="mapwrap"><div id="photoMap" class="photomap"></div></div>`;
  const pts = await mapPhotos();
  if (!pts.length) { view.querySelector('.mapwrap').insertAdjacentHTML('beforeend', '<p class="mapempty">Noch keine Fotos mit Ort</p>'); }
  try { await loadLeaflet(); } catch (e) { view.querySelector('.mapwrap').insertAdjacentHTML('beforeend', `<p class="mapempty">${U.esc(e.message)}</p>`); return; }
  const el = view.querySelector('#photoMap'); if (!el) return;
  const map = L.map(el, { zoomControl: false, attributionControl: true, worldCopyJump: true, minZoom: 2 });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd', maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>'
  }).addTo(map);
  map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
  if (pts.length) map.fitBounds(L.latLngBounds(pts.map(p => [p.f.placeLat, p.f.placeLng])).pad(0.2), { maxZoom: 15 });
  else map.setView([51.2, 10.4], 5);
  // Fotos, die auf dem Bildschirm übereinanderliegen, als Stapel mit Zahl zeigen
  let layer = L.layerGroup().addTo(map);
  const draw = () => {
    layer.clearLayers();
    const groups = [];
    pts.forEach(p => {
      const px = map.latLngToLayerPoint([p.f.placeLat, p.f.placeLng]);
      const g = groups.find(g => Math.abs(g.px.x - px.x) < 44 && Math.abs(g.px.y - px.y) < 44);
      if (g) g.items.push(p); else groups.push({ px, items: [p] });
    });
    groups.forEach(g => {
      const first = g.items[0];
      const icon = L.divIcon({
        className: 'mapthumb',
        html: `<span class="mtimg"${first.url ? ` style="background-image:url('${first.url}')"` : ''}></span>${g.items.length > 1 ? `<span class="mtn">${g.items.length}</span>` : ''}`,
        iconSize: [52, 52], iconAnchor: [26, 58]
      });
      const m = L.marker(map.layerPointToLatLng(g.px), { icon, keyboard: true, title: first.f.place || '' }).addTo(layer);
      m.on('click', () => {
        const b = L.latLngBounds(g.items.map(p => [p.f.placeLat, p.f.placeLng]));
        const same = b.getNorthEast().distanceTo(b.getSouthWest()) < 5;
        if (g.items.length === 1 || same || map.getZoom() >= map.getMaxZoom()) location.hash = '#/foto/alle/' + first.f.id;
        else map.fitBounds(b.pad(0.4), { maxZoom: map.getMaxZoom() });
      });
    });
  };
  map.on('zoomend', draw);
  draw();
  setTimeout(() => map.invalidateSize(), 50);
}
