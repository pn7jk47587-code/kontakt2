// Offline-Cache für die App-Dateien. Nutzerdaten liegen in IndexedDB, nicht hier.
const VERSION = 'kb-v125';
const FILES = [
  './', 'index.html', 'styles.css', 'manifest.webmanifest',
  'js/theme.js', 'js/i18n.js', 'js/db.js', 'js/seed.js', 'js/util.js', 'js/fx.js', 'js/art.js', 'js/app.js', 'js/meter.js', 'js/rolls.js', 'js/profile.js', 'js/diary.js', 'js/filters.js', 'js/ideas.js', 'js/tour.js', 'js/beam.js', 'burn.png',
  'vendor/jszip.min.js', 'vendor/exifr.lite.umd.js',
  'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'fonts/unbounded-600.woff2',
  'img/agfa-apx100.webp', 'img/cam-hasselblad-500cm.webp', 'img/cam-minolta-xg1.webp', 'img/cam-nikon-f3.webp', 'img/cam-praktica-l2.webp', 'img/cam-superheadz-olivesan.webp', 'img/cam-minolta-hi-matic-7s.webp', 'img/cam-olympus-superzoom70.webp', 'img/cam-praktica-bx20.webp', 'img/cam-leica-c2.webp', 'img/lens-hb-planar-80.webp', 'img/cinestill-400d.webp', 'img/cinestill-50d.webp', 'img/cinestill-800t.webp', 'img/cinestill-bwxx.webp', 'img/foma-100.webp', 'img/foma-200.webp', 'img/foma-400.webp', 'img/harman-phoenix125.webp', 'img/harman-phoenix2.webp', 'img/harman-phoenix200-rot.webp', 'img/agfa-color400.webp', 'img/harman-red125.webp', 'img/harman-switch-azure.webp', 'img/ilford-delta100.webp', 'img/ilford-delta3200.webp', 'img/ilford-delta400.webp', 'img/ilford-fp4.webp', 'img/ilford-hp5.webp', 'img/ilford-panf.webp', 'img/ilford-sfx200.webp', 'img/ilford-xp2.webp', 'img/kentmere-200.webp', 'img/rollei-ir400.webp', 'img/optik-opticolour200.webp', 'img/lomo-purple.webp', 'img/kodak-portra160.webp', 'img/kodak-portra400.webp', 'img/kodak-portra800.webp', 'img/kodak-colorplus200.webp', 'img/kodak-gold200.webp', 'img/orwo-wolfen-nc500.webp', 'img/lomo-cn800.webp', 'img/kodak-trix.webp',
  'img/filter-a005.webp', 'img/filter-a021.webp', 'img/filter-a029.webp', 'img/filter-a056.webp', 'img/filter-a061.webp', 'img/filter-a084.webp', 'img/filter-a086.webp', 'img/filter-a103.webp', 'img/filter-a121.webp', 'img/filter-a124.webp', 'img/filter-a132.webp', 'img/filter-a133.webp', 'img/filter-a151.webp', 'img/filter-a160.webp', 'img/filter-a185.webp', 'img/filter-a195.webp', 'img/filter-a196.webp', 'img/filter-a201.webp', 'img/filter-a230.webp', 'img/filter-a345.webp', 'img/filter-a397.webp', 'img/filter-b058.webp', 'img/filter-b160.webp', 'img/filter-cf1.webp', 'img/filter-cf10.webp', 'img/filter-cf3.webp', 'img/filter-cf4.webp', 'img/filter-cf7.webp', 'img/filter-grad-gruengrau.webp', 'img/filter-grad-hell.webp', 'img/filter-grad-oliv.webp', 'img/filter-grad-rose.webp', 'img/filter-grad-tabak.webp', 'img/filter-zeiss-g1.webp', 'img/filter-b375-blau.webp', 'img/filter-b375-eisblau.webp', 'img/filter-b375-gelb.webp', 'img/filter-b375-goldgelb.webp', 'img/filter-b375-grau.webp', 'img/filter-b375-gruen.webp', 'img/filter-b375-halter.webp', 'img/filter-b375-hellgrau.webp', 'img/filter-b375-himmelblau.webp', 'img/filter-b375-koralle.webp', 'img/filter-b375-kupfer.webp', 'img/filter-b375-lavendel.webp', 'img/filter-b375-leuchtorange.webp', 'img/filter-b375-pfirsich.webp', 'img/filter-b375-pink.webp', 'img/filter-b375-rot.webp', 'img/filter-b375-tuerkis.webp', 'img/filter-b375-ultramarin.webp', 'img/filter-b375-violett.webp', 'img/filter-b375.webp'
];

self.addEventListener('install', e => {
  // cache: 'reload' umgeht den HTTP-Cache, sonst landen bis zu 10 Minuten alte Dateien von GitHub Pages im neuen Cache
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
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
