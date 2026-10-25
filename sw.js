// Offline-Cache für die App-Dateien. Nutzerdaten liegen in IndexedDB, nicht hier.
const VERSION = 'kb-v87';
const FILES = [
  './', 'index.html', 'styles.css', 'manifest.webmanifest',
  'js/theme.js', 'js/i18n.js', 'js/db.js', 'js/seed.js', 'js/util.js', 'js/art.js', 'js/app.js', 'js/rolls.js', 'js/profile.js', 'js/diary.js', 'js/filters.js', 'js/tour.js', 'js/beam.js', 'burn.png',
  'vendor/jszip.min.js', 'vendor/exifr.lite.umd.js',
  'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'fonts/unbounded-600.woff2',
  'img/agfa-apx100.webp', 'img/cam-hasselblad-500cm.webp', 'img/cam-minolta-xg1.webp', 'img/cam-nikon-f3.webp', 'img/cam-praktica-l2.webp', 'img/cam-superheadz-olivesan.webp', 'img/cam-minolta-hi-matic-7s.webp', 'img/cam-olympus-superzoom70.webp', 'img/cam-praktica-bx20.webp', 'img/cam-leica-c2.webp', 'img/cinestill-400d.webp', 'img/cinestill-50d.webp', 'img/cinestill-800t.webp', 'img/cinestill-bwxx.webp', 'img/foma-100.webp', 'img/foma-200.webp', 'img/foma-400.webp', 'img/harman-phoenix125.webp', 'img/harman-phoenix2.webp', 'img/harman-red125.webp', 'img/harman-switch-azure.webp', 'img/ilford-delta100.webp', 'img/ilford-delta3200.webp', 'img/ilford-delta400.webp', 'img/ilford-fp4.webp', 'img/ilford-hp5.webp', 'img/ilford-panf.webp', 'img/ilford-sfx200.webp', 'img/ilford-xp2.webp', 'img/kentmere-200.webp', 'img/rollei-ir400.webp', 'img/optik-opticolour200.webp', 'img/lomo-purple.webp', 'img/kodak-portra160.webp', 'img/kodak-portra400.webp', 'img/kodak-portra800.webp', 'img/kodak-colorplus200.webp', 'img/kodak-gold200.webp', 'img/orwo-wolfen-nc500.webp', 'img/lomo-cn800.webp', 'img/kodak-trix.webp'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // Kartenkacheln nicht cachen (Nutzungsbedingungen OSM), direkt durchreichen
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request))
  );
});
