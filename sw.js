// Offline-Cache für die App-Dateien. Nutzerdaten liegen in IndexedDB, nicht hier.
const VERSION = 'kb-v74';
const FILES = [
  './', 'index.html', 'styles.css', 'manifest.webmanifest',
  'js/theme.js', 'js/i18n.js', 'js/db.js', 'js/seed.js', 'js/util.js', 'js/art.js', 'js/app.js', 'js/rolls.js', 'js/profile.js', 'js/diary.js', 'js/tour.js', 'js/beam.js', 'burn.png',
  'vendor/jszip.min.js', 'vendor/exifr.lite.umd.js',
  'icon-192.png', 'icon-512.png', 'apple-touch-icon.png',
  'img/agfa-apx100.webp', 'img/cam-hasselblad-500cm.webp', 'img/cam-minolta-xg1.webp', 'img/cam-nikon-f3.webp', 'img/cam-praktica-l2.webp', 'img/cam-superheadz-olivesan.webp', 'img/cinestill-400d.webp', 'img/cinestill-50d.webp', 'img/cinestill-800t.webp', 'img/cinestill-bwxx.webp', 'img/foma-100.webp', 'img/foma-200.webp', 'img/foma-400.webp', 'img/harman-phoenix125.webp', 'img/harman-phoenix200.webp', 'img/harman-red125.webp', 'img/harman-switch-azure.webp', 'img/ilford-delta100.webp', 'img/ilford-delta3200.webp', 'img/ilford-delta400.webp', 'img/ilford-fp4.webp', 'img/ilford-hp5.webp', 'img/ilford-panf.webp', 'img/ilford-sfx200.webp', 'img/ilford-xp2.webp', 'img/kentmere-200.webp'
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
