/* Belichtungsmesser (Test), geöffnet aus der Bildansicht eines Frames.
   Aufbau (eigene Gestaltung im Lightleak-Look):
   oben der Sucher über die ganze Breite mit eingeblendeten Bedienelementen (Film, Objektiv, Film-Look, Kamera, Vollbild),
   darunter die Anzeige des gewählten Paars, ein waagerechter Blendenring (drehen = Blende wählen, darunter die Zeit),
   vier Werte-Chips (Lichtwert, Korrektur, Filter, ISO) mit gemeinsamem Lineal zum Einstellen und Schlössern,
   unten Mediathek, runder Auslöser „messen“ und „loggen“.

   Woher der Lichtwert kommt:
   1. Foto („messen“ oder Mediathek): EXIF liefert Zeit, Blende und ISO der Handykamera. Daraus folgt der Lichtwert, den die
      Handykamera eingestellt hat. Die Helligkeit im Messfeld verschiebt ihn auf den Wert, bei dem diese Stelle Mittelgrau
      (18 % linear) würde.
   2. Live, nur wenn der Browser Belichtungszeit und ISO der Kamera herausgibt (MediaStreamTrack.getSettings, Image Capture).
      Safari auf iOS tut das nach allem, was dazu auffindbar ist, nicht. Dann zeigt Live nur das Verhältnis Messfeld zu Bild.
   3. Von Hand am Lineal.
   Belichtung: LW(ISO) = LW100 + log2(ISO/100) − Korrektur − Filter. Für eine Blende N gilt t = N² / 2^LW.
   Mit Schwarzschild wird t danach mit U.reciprocity auf die einzustellende Zeit verlängert. */
const METER = (() => {
  const LS = 'kb-meter-';
  const ls = (k, d) => { try { const v = localStorage.getItem(LS + k); return v === null ? d : JSON.parse(v); } catch (_) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(LS + k, JSON.stringify(v)); } catch (_) {} };
  const getCal = () => { const v = parseFloat(ls('cal', 0)); return isFinite(v) ? v : 0; };

  const GREY = 0.18;
  const SPOT = 0.045;
  const LUT = new Float32Array(256).map((_, i) => { const c = i / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
  const loc = () => (typeof I18N !== 'undefined' ? I18N.locale() : 'de-DE');
  const dec = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toLocaleString(loc(), { maximumFractionDigits: d });

  const THIRD_N = [0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.5, 2.8, 3.2, 3.5, 4, 4.5, 5, 5.6, 6.3, 7.1, 8, 9, 10, 11, 13, 14, 16, 18, 20, 22, 25, 29, 32, 36, 40, 45, 51, 57, 64, 72, 80, 90];
  const ISOS = [3, 4, 5, 6, 8, 10, 12, 16, 20, 25, 32, 40, 50, 64, 80, 100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000, 6400, 8000, 12800];
  const EVS = Array.from({ length: (21 + 6) * 3 + 1 }, (_, i) => -6 + i / 3);
  const COMPS = Array.from({ length: 19 }, (_, i) => -3 + i / 3);
  const FILTS = Array.from({ length: 41 }, (_, i) => i / 3);
  const FR = ['', '⅓', '⅔'];
  const thirds = (v, sign) => {
    const s = v < -1e-6 ? '−' : sign && v > 1e-6 ? '+' : '';
    const a = Math.abs(v), w = Math.floor(a + 1e-6), f = Math.round((a - w) * 3) % 3;
    return s + (w || !f ? String(w) : '') + FR[f];
  };
  const fT = t => t >= 60 ? `${Math.floor(t / 60)} min ${Math.round(t % 60)} s` : t >= 0.95 ? dec(t, t < 10 ? 1 : 0) + ' s' : '1/' + Math.round(1 / t) + ' s';
  const tShort = s => /^1\//.test(s) ? s : String(s).replace('.', ',') + '″';
  const tDial = s => /^\d+(\.\d+)?$/.test(s) ? s.replace('.', ',') + ' s' : s + ' s';
  const nTxt = n => String(n).replace('.', ',');

  const DIAG_KB = Math.hypot(36, 24);
  function filmSize(roll, cam) {
    if (roll?.format === '120') {
      const m = String(cam?.frameSize || '').replace(',', '.').match(/6\s*[×x]\s*([\d.]+)/);
      const other = m ? parseFloat(m[1]) : 6;
      const mm = { 4.5: 41.5, 6: 56, 7: 69.5, 8: 77, 9: 84, 12: 118, 17: 168 }[other] || other * 9.3;
      return { w: Math.max(56, mm), h: Math.min(56, mm), label: `6×${String(other).replace('.', ',')}` };
    }
    if (roll?.format === '110') return { w: 17, h: 13, label: '110' };
    if (roll?.format === 'half') return { w: 24, h: 18, label: 'Halbformat' };
    return { w: 36, h: 24, label: 'KB' };
  }

  function measure(ctx, w, h, fx, fy) {
    const d = ctx.getImageData(0, 0, w, h).data;
    let all = 0;
    for (let i = 0; i < d.length; i += 16) all += 0.2126 * LUT[d[i]] + 0.7152 * LUT[d[i + 1]] + 0.0722 * LUT[d[i + 2]];
    const mean = all / (d.length / 16);
    const r = Math.max(2, Math.round(Math.min(w, h) * SPOT));
    const cx = Math.round(fx * w), cy = Math.round(fy * h);
    let s = 0, n = 0, clip = 0, dark = 0;
    for (let y = Math.max(0, cy - r); y < Math.min(h, cy + r); y++) for (let x = Math.max(0, cx - r); x < Math.min(w, cx + r); x++) {
      const i = (y * w + x) * 4;
      s += 0.2126 * LUT[d[i]] + 0.7152 * LUT[d[i + 1]] + 0.0722 * LUT[d[i + 2]]; n++;
      if (d[i] > 250 || d[i + 1] > 250 || d[i + 2] > 250) clip++;
      if (d[i] < 6 && d[i + 1] < 6 && d[i + 2] < 6) dark++;
    }
    return { spot: n ? s / n : 0, mean, clip: n ? clip / n : 0, dark: n ? dark / n : 0 };
  }
  function coverRect(el, iw, ih) {
    const r = el.getBoundingClientRect();
    const s = Math.max(r.width / iw, r.height / ih), w = iw * s, h = ih * s;
    return { left: r.left + (r.width - w) / 2, top: r.top + (r.height - h) / 2, width: w, height: h };
  }
  async function readExif(file) {
    try {
      const e = await exifr.parse(file, { tiff: true, exif: true, gps: false });
      if (!e) return null;
      const t = +e.ExposureTime, N = +e.FNumber, iso = +(e.ISO ?? e.ISOSpeedRatings ?? e.PhotographicSensitivity);
      return { t, N, iso, f35: +e.FocalLengthIn35mmFormat || 0, model: [e.Make, e.Model].filter(Boolean).join(' '), ok: t > 0 && N > 0 && iso > 0 };
    } catch (_) { return null; }
  }
  const filterStops = name => {
    let m = String(name || '').match(/\((\d+(?:[.,]\d+)?)\s*Blende/i); if (m) return parseFloat(m[1].replace(',', '.'));
    m = String(name || '').match(/ND\s?(\d+)/i); if (m) return Math.log2(parseFloat(m[1]));
    return 0;
  };

  const LOCK = '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>';
  const UNLOCK = '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 10.5V8a4 4 0 0 1 7.6-1.8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
  const IC = (d, s = 22) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const IC_FLIP = IC('<path d="M4 12a8 8 0 0 1 13.7-5.6L20 9"/><path d="M20 4v5h-5"/><path d="M20 12a8 8 0 0 1-13.7 5.6L4 15"/><path d="M4 20v-5h5"/>', 19);
  const IC_EXP = IC('<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>', 19);
  const IC_SHR = IC('<path d="M4 14h6v6M20 10h-6V4M10 14l-7 7M14 10l7-7"/>', 19);
  const IC_GEAR = IC('<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>', 19);
  const IC_LOG = IC('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 20);
  const IC_LIB = IC('<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 15l5-5 4 4 3-3 6 6"/>', 22);
  const IC_LIVE = IC('<circle cx="12" cy="12" r="3.2" fill="currentColor"/><path d="M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8"/>', 19);
  const IC_LENS = IC('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/>', 16);

  /* opts: { stock, roll, cam, frameLabel, filmArt, lenses: [{id, label, focal, apertures}], lensId, shutters,
             aperture, iso, boxIso, filterSuggest, hasPhone, onLog(result, blob) } */
  function open(opts) {
    const stock = opts.stock, film = filmSize(opts.roll, opts.cam);
    const shNum = (opts.shutters || []).filter(v => U.parseShutter(v) > 0);
    const hasB = (opts.shutters || []).some(v => v === 'B' || v === 'T');
    const camFast = shNum.length ? Math.min(...shNum.map(U.parseShutter)) : 1 / 1000;
    const camSlow = shNum.length ? Math.max(...shNum.map(U.parseShutter)) : 1;
    const lenses = opts.lenses || [];
    let lensIdx = lenses.length ? Math.max(0, lenses.findIndex(l => l.id === opts.lensId)) : -1;
    const lens = () => lenses[lensIdx] || null;
    const recipKnown = !!stock && U.reciprocity(stock, 2).ok;

    const locks = ls('locks', { ev: false, comp: false, filt: false, iso: false });
    const isoDef = parseFloat(opts.iso) > 0 ? parseFloat(opts.iso) : parseFloat(opts.boxIso) > 0 ? parseFloat(opts.boxIso) : 100;
    const near = (list, v) => list.reduce((b, x) => Math.abs(x - v) < Math.abs(b - v) ? x : b);
    const st = {
      ev: locks.ev ? ls('ev', 12) : ls('lastEv', 12),
      comp: locks.comp ? ls('comp', 0) : 0,
      filt: locks.filt ? ls('filt', 0) : near(FILTS, opts.filterSuggest || 0),
      iso: locks.iso ? ls('iso', isoDef) : near(ISOS, isoDef),
      cal: getCal(), recip: ls('recip', true) && recipKnown,
      look: ls('look', true), frameOn: ls('frameOn', true), saveShot: ls('saveShot', true),
      phoneN: ls('phoneN', 1.78), phoneF: ls('phoneF', 26),
      N: null, measured: false, source: '', exif: null, file: null, active: 'ev'
    };
    let mode = 'live', stream = null, track = null, raf = 0, facing = 'environment', fx = 0.5, fy = 0.5, liveExp = false, last = null;

    const looks = { sw: 'grayscale(1) contrast(1.12)', 'sw-c41': 'grayscale(1) contrast(1.05)', 'sw-umkehr': 'grayscale(1) contrast(1.3)', ir: 'grayscale(1) contrast(1.45) brightness(1.05)', farbneg: 'saturate(1.08) sepia(.1) contrast(.97)', dia: 'saturate(1.3) contrast(1.15)' };
    const lookCss = looks[stock?.type] || '';

    const ov = document.createElement('div');
    ov.className = 'mtr';
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Belichtungsmesser');
    ov.innerHTML = `
      <div class="mtr-glow" aria-hidden="true"></div>
      <div class="mtr-view" id="mView">
        <video id="mVideo" playsinline muted autoplay></video>
        <img id="mImg" alt="" hidden>
        <div class="mtr-frame" id="mFrame" hidden><i></i><i></i><i></i><i></i></div>
        <div class="mtr-spot" id="mSpot" hidden></div>
        <p class="mtr-msg" id="mMsg" hidden></p>
        <div class="mtr-hud top">
          <button type="button" class="mtr-hb" id="mClose" aria-label="Schließen">${ART.x}</button>
          <span class="mtr-film">${opts.filmArt || ''}<span class="mtr-fname">${U.esc(stock ? (stock.name || U.stockLabel(stock)) : 'Film')}</span><span class="mtr-fno">#${U.esc(opts.frameLabel || '')}</span></span>
          <button type="button" class="mtr-hb" id="mGear" aria-label="Einstellungen">${IC_GEAR}</button>
        </div>
        <div class="mtr-hud side">
          <button type="button" class="mtr-hb" id="mFlip" aria-label="Kamera wechseln">${IC_FLIP}</button>
          <button type="button" class="mtr-hb" id="mLive" aria-label="Zurück zu Live" hidden>${IC_LIVE}</button>
          <button type="button" class="mtr-hb" id="mExp" aria-label="Sucher vergrößern">${IC_EXP}</button>
        </div>
        <div class="mtr-hud bot">
          <button type="button" class="mtr-lens" id="mLens"></button>
          <span class="mtr-wb" id="mWb" hidden></span>
          ${lookCss ? `<button type="button" class="mtr-look${st.look ? ' on' : ''}" id="mLook" aria-pressed="${st.look}">Film-Look</button>` : ''}
        </div>
      </div>
      <div class="mtr-panel">
        <div class="mtr-read">
          <div class="mtr-pair" id="mPair"></div>
          <button type="button" class="mtr-recip${st.recip ? ' on' : ''}" id="mRecip" ${recipKnown ? '' : 'disabled'} role="switch" aria-checked="${st.recip}"><span class="mtr-sw"></span>Schwarzschild</button>
        </div>
        <div class="mtr-sub" id="mSub" aria-live="polite"></div>
        <div class="mtr-ring" id="mRing" aria-label="Blendenring"><div class="mtr-ringin" id="mRingIn"></div></div>
        <div class="mtr-chips" id="mChips">
          ${['ev', 'comp', 'filt', 'iso'].map(k => `<div class="mtr-chip" data-k="${k}"><button type="button" class="mtr-cv" data-k="${k}"><span class="mtr-cl"></span><b class="mtr-cn"></b></button><button type="button" class="mtr-lk" data-k="${k}"></button></div>`).join('')}
        </div>
        <div class="mtr-rulerwrap"><div class="mtr-ruler" id="mRuler"><div class="mtr-rin" id="mRulerIn"></div></div></div>
        <div class="mtr-bar">
          <label class="mtr-side" aria-label="Aus Mediathek" role="button"><input type="file" accept="image/*" id="mLib" hidden>${IC_LIB}<span>Mediathek</span></label>
          <label class="mtr-shutter" role="button" aria-label="messen"><input type="file" accept="image/*" capture="environment" id="mCap" hidden><span class="mtr-ring2"></span><span class="mtr-stxt">messen</span></label>
          <button type="button" class="mtr-side log" id="mLog" disabled>${IC_LOG}<span>loggen</span></button>
        </div>
      </div>
      <div class="mtr-sheet" id="mSheet" hidden></div>`;
    document.body.appendChild(ov);
    document.body.classList.add('meteron');
    const $ = s => ov.querySelector(s);
    const video = $('#mVideo'), img = $('#mImg'), view = $('#mView');
    const cv = document.createElement('canvas'), ctx = cv.getContext('2d', { willReadFrequently: true });

    /* ---------- Rechnung ---------- */
    const evSet = () => st.ev + Math.log2(st.iso / 100) - st.comp - st.filt;
    function apertureList() {
      const l = lens();
      const lo = l ? Math.min(...l.apertures.map(U.parseAperture)) : 1.4, hi = l ? Math.max(...l.apertures.map(U.parseAperture)) : 22;
      const full = l ? l.apertures.map(U.parseAperture) : [1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22];
      const list = THIRD_N.filter(n => n >= lo / 1.04 && n <= hi * 1.04);
      if (l) full.forEach(n => { if (!list.some(x => Math.abs(Math.log2(x / n)) < 0.05)) list.push(n); });
      return list.sort((a, b) => a - b).map(n => ({ n, full: full.some(x => Math.abs(Math.log2(x / n)) < 0.05) }));
    }
    function solve(n) {
      const ev = evSet();
      const tm = n * n / Math.pow(2, ev);
      let t = tm, recip = false, recipBad = false;
      if (st.recip && tm > 1) { const r = U.reciprocity(stock, tm); if (r.ok) { t = r.tc; recip = Math.abs(r.tc - tm) > 0.01; } else recipBad = true; }
      let dial = null, dev = 0, bulb = false;
      if (shNum.length) {
        dial = shNum.reduce((b, v) => Math.abs(Math.log2(U.parseShutter(v) / t)) < Math.abs(Math.log2(U.parseShutter(b) / t)) ? v : b);
        dev = Math.log2(U.parseShutter(dial) / t);
      }
      const tooFast = t < camFast / Math.SQRT2, tooSlow = t > camSlow * Math.SQRT2;
      if (tooSlow && hasB) { bulb = true; dial = 'B'; dev = 0; }
      return { n, tm, t, recip, recipBad, dial, dev, bulb, out: tooFast || (tooSlow && !hasB), tooFast };
    }

    /* ---------- Blendenring ---------- */
    const CELL = 64;
    let ring = [], ringQuiet = false, ringTm = null;
    function drawRing(keepN) {
      ring = apertureList();
      const inner = $('#mRingIn');
      inner.innerHTML = ring.map((a, i) => {
        const s = solve(a.n);
        const time = s.out ? (s.tooFast ? 'zu hell' : 'zu dunkel') : s.bulb ? 'B' : s.dial ? tShort(s.dial) : tShort(fT(s.t).replace(' s', ''));
        return `<button type="button" class="mtr-cell${a.full ? ' full' : ''}${s.out ? ' out' : ''}${s.recip ? ' rc' : ''}" data-i="${i}" style="width:${CELL}px"><span class="mtr-cf">${nTxt(a.n)}</span><span class="mtr-ct">${time}</span></button>`;
      }).join('');
      const pad = Math.max(0, ($('#mRing').clientWidth - CELL) / 2);
      inner.style.padding = `0 ${pad}px`;
      let want = keepN ?? st.N ?? (U.parseAperture(opts.aperture) > 0 ? U.parseAperture(opts.aperture) : null);
      let i = want ? ring.reduce((b, a, j) => Math.abs(Math.log2(a.n / want)) < Math.abs(Math.log2(ring[b].n / want)) ? j : b, 0) : ring.findIndex(a => a.full && Math.abs(a.n - 5.6) < 0.1);
      if (i < 0) i = Math.floor(ring.length / 2);
      setRing(i, false);
    }
    function setRing(i, smooth) {
      ringQuiet = true;
      $('#mRing').scrollTo({ left: i * CELL, behavior: smooth ? 'smooth' : 'auto' });
      pickRing(i);
      setTimeout(() => { ringQuiet = false; }, smooth ? 450 : 80);
    }
    function pickRing(i) {
      const a = ring[i]; if (!a) return;
      st.N = a.n;
      $('#mRingIn').querySelectorAll('.mtr-cell').forEach((c, j) => c.classList.toggle('on', j === i));
      drawRead();
    }
    $('#mRing').addEventListener('scroll', () => {
      const i = Math.max(0, Math.min(ring.length - 1, Math.round($('#mRing').scrollLeft / CELL)));
      if (ring[i] && ring[i].n !== st.N) { pickRing(i); if (!ringQuiet) U.haptic && U.haptic(6); }
      clearTimeout(ringTm); ringTm = setTimeout(() => { if (!ringQuiet) setRing(i, true); }, 140);
    }, { passive: true });
    $('#mRingIn').addEventListener('click', e => { const c = e.target.closest('.mtr-cell'); if (c) setRing(+c.dataset.i, true); });

    /* ---------- Anzeige ---------- */
    function drawRead() {
      const pair = $('#mPair'), sub = $('#mSub');
      const src = { Foto: 'aus Foto', Live: 'live', Hand: 'von Hand' }[st.source] || '';
      if (st.N == null) { pair.innerHTML = ''; return; }
      const s = solve(st.N);
      const timeTxt = s.out ? (s.tooFast ? 'zu hell' : 'zu dunkel') : s.bulb ? `B · ${fT(s.t)}` : s.dial ? tDial(s.dial) : fT(s.t);
      pair.innerHTML = `<span class="mtr-pf">f/${nTxt(s.n)}</span><span class="mtr-pt${s.out ? ' out' : ''}">${timeTxt}</span>`;
      const bits = [];
      if (!st.measured) bits.push(liveExp ? 'Live-Messung läuft' : 'Messfeld antippen, dann messen');
      else bits.push(`LW ${dec(st.ev)}${src ? ' ' + src : ''}`);
      if (!s.out && s.dial && !s.bulb && Math.abs(s.dev) >= 0.1) bits.push(`genau ${fT(s.t)} (${U.fmtStops(s.dev)})`);
      if (s.recip) bits.push(`gemessen ${fT(s.tm)}, mit Schwarzschild ${fT(s.t)}`);
      if (s.recipBad) bits.push('Schwarzschild unbekannt');
      let warn = '';
      if (last && mode === 'photo' && !(st.exif && st.exif.ok)) warn = 'Foto ohne Belichtungsdaten (EXIF). Lichtwert von Hand einstellen oder ein Foto der Kamera-App aus der Mediathek laden.';
      else if (last && last.clip > 0.2) warn = 'Messfeld ausgebrannt, Wert zu niedrig.';
      else if (last && last.dark > 0.2) warn = 'Messfeld fast schwarz, Wert unsicher.';
      else if (mode === 'live' && !liveExp && last) bits.push(`Messfeld ${U.fmtStops(Math.log2(Math.max(last.spot, 1e-5) / Math.max(last.mean, 1e-5)))} Blenden zum Bild`);
      sub.innerHTML = `${bits.map(b => `<span>${U.esc(b)}</span>`).join('')}${warn ? `<span class="mtr-warn">${U.esc(warn)}</span>` : ''}`;
      $('#mLog').disabled = !st.measured || s.out;
    }
    function changed() { drawRing(st.N); drawChips(); }

    /* ---------- Werte-Chips und Lineal ---------- */
    const P = {
      ev: { name: 'LW', long: 'Lichtwert', list: EVS, fmt: v => thirds(v), w: 18, label: v => Math.abs(v - Math.round(v)) < 1e-6 ? String(Math.round(v)).replace('-', '−') : '' },
      comp: { name: 'Korr.', long: 'Korrektur', list: COMPS, fmt: v => thirds(v, true), w: 22, label: v => Math.abs(v - Math.round(v)) < 1e-6 ? thirds(v, true) : '' },
      filt: { name: 'Filter', long: 'Filter', list: FILTS, fmt: v => thirds(v, true), w: 18, label: v => Math.abs(v - Math.round(v)) < 1e-6 ? thirds(v, true) : '' },
      iso: { name: 'ISO', long: 'ISO', list: ISOS, fmt: v => String(v), w: 40, label: v => String(v) }
    };
    function drawChips() {
      ov.querySelectorAll('.mtr-chip').forEach(c => {
        const k = c.dataset.k;
        c.classList.toggle('on', st.active === k); c.classList.toggle('locked', !!locks[k]);
        c.querySelector('.mtr-cl').textContent = P[k].name;
        c.querySelector('.mtr-cn').textContent = P[k].fmt(st[k]);
        c.querySelector('.mtr-cv').setAttribute('aria-pressed', st.active === k);
        const lk = c.querySelector('.mtr-lk');
        lk.innerHTML = locks[k] ? LOCK : UNLOCK;
        lk.setAttribute('aria-label', `${P[k].long} ${locks[k] ? 'entsperren' : 'sperren'}`);
      });
      $('#mRuler').classList.toggle('locked', !!locks[st.active]);
    }
    let rulerQuiet = false, rulerTm = null;
    function drawRuler() {
      const p = P[st.active], inner = $('#mRulerIn');
      inner.innerHTML = p.list.map((v, i) => { const lb = p.label(v); return `<span class="mtr-tk${lb ? ' maj' : ''}" data-i="${i}" style="width:${p.w}px"><i></i>${lb ? `<b>${lb}</b>` : ''}</span>`; }).join('');
      const pad = Math.max(0, ($('#mRuler').clientWidth - p.w) / 2);
      inner.style.padding = `0 ${pad}px`;
      setRuler(st[st.active], false);
    }
    function setRuler(v, smooth) {
      const p = P[st.active];
      const i = p.list.reduce((b, x, j) => Math.abs(x - v) < Math.abs(p.list[b] - v) ? j : b, 0);
      rulerQuiet = true;
      $('#mRuler').scrollTo({ left: i * p.w, behavior: smooth ? 'smooth' : 'auto' });
      setTimeout(() => { rulerQuiet = false; }, smooth ? 450 : 80);
    }
    $('#mRuler').addEventListener('scroll', () => {
      if (rulerQuiet) return;
      const k = st.active, p = P[k];
      const i = Math.max(0, Math.min(p.list.length - 1, Math.round($('#mRuler').scrollLeft / p.w)));
      if (locks[k]) { clearTimeout(rulerTm); rulerTm = setTimeout(() => setRuler(st[k], true), 120); return; }
      const v = p.list[i];
      if (Math.abs(v - st[k]) > 1e-6) {
        st[k] = v; U.haptic && U.haptic(6);
        if (k === 'ev') { st.source = 'Hand'; st.measured = true; lsSet('lastEv', v); }
        if (locks[k]) lsSet(k, v);
        changed();
      }
      clearTimeout(rulerTm); rulerTm = setTimeout(() => setRuler(st[k], true), 160);
    }, { passive: true });
    $('#mChips').addEventListener('click', e => {
      const lk = e.target.closest('.mtr-lk');
      if (lk) { const k = lk.dataset.k; locks[k] = !locks[k]; lsSet('locks', locks); if (locks[k]) lsSet(k, st[k]); U.haptic && U.haptic(); drawChips(); return; }
      const b = e.target.closest('.mtr-cv'); if (!b) return;
      st.active = b.dataset.k; drawChips(); drawRuler();
    });

    /* ---------- Objektiv und Rahmen ---------- */
    function drawLens() {
      const l = lens(), b = $('#mLens');
      if (!l) { b.innerHTML = `${IC_LENS}<span>Kein Objektiv</span>`; b.disabled = true; $('#mFrame').hidden = true; return; }
      const feq = l.focal * DIAG_KB / Math.hypot(film.w, film.h);
      const txt = l.focal ? (film.label === 'KB' ? `${dec(l.focal, 0)} mm` : `${dec(l.focal, 0)} mm · ${film.label} ≈ ${dec(feq, 0)} mm KB`) : l.label;
      b.innerHTML = `${IC_LENS}<span>${U.esc(txt)}</span>${lenses.length > 1 ? '<i class="mtr-more">›</i>' : ''}`;
      b.disabled = lenses.length < 2;
      b.setAttribute('aria-label', lenses.length > 1 ? `Objektiv ${l.label}, wechseln` : `Objektiv ${l.label}`);
      placeFrame();
    }
    function placeFrame() {
      const l = lens(), fr = $('#mFrame');
      const iw = mode === 'live' ? video.videoWidth : img.naturalWidth, ih = mode === 'live' ? video.videoHeight : img.naturalHeight;
      if (!l || !l.focal || !st.frameOn || !iw) { fr.hidden = true; return; }
      const el = mode === 'live' ? video : img, c = coverRect(el, iw, ih);
      const feq = l.focal * DIAG_KB / Math.hypot(film.w, film.h);
      const k = Math.min(1, st.phoneF / feq);
      const portrait = c.height >= c.width;
      const aw = portrait ? Math.min(film.w, film.h) : Math.max(film.w, film.h), ah = portrait ? Math.max(film.w, film.h) : Math.min(film.w, film.h);
      const u = Math.hypot(c.width, c.height) * k / Math.hypot(aw, ah);
      let w = aw * u, h = ah * u;
      const vb = view.getBoundingClientRect();
      const fit = Math.min(1, (vb.width - 24) / w, (vb.height - 24) / h); w *= fit; h *= fit;
      fr.style.width = w + 'px'; fr.style.height = h + 'px';
      fr.style.left = (vb.width / 2 - w / 2) + 'px'; fr.style.top = (vb.height / 2 - h / 2) + 'px';
      fr.classList.toggle('wide', st.phoneF / feq > 1.02 || fit < 0.999);
      fr.hidden = false;
    }
    $('#mLens').addEventListener('click', () => {
      if (lenses.length < 2) return;
      lensIdx = (lensIdx + 1) % lenses.length; U.haptic && U.haptic();
      drawLens(); drawRing(st.N);
    });

    /* ---------- Messfeld ---------- */
    const placeSpot = () => {
      const el = mode === 'live' ? video : img, sp = $('#mSpot');
      const iw = mode === 'live' ? video.videoWidth : img.naturalWidth, ih = mode === 'live' ? video.videoHeight : img.naturalHeight;
      if (!iw) { sp.hidden = true; return; }
      const c = coverRect(el, iw, ih), vb = view.getBoundingClientRect();
      const size = Math.max(22, Math.min(c.width, c.height) * SPOT * 2);
      sp.style.width = sp.style.height = size + 'px';
      sp.style.left = (c.left - vb.left + fx * c.width) + 'px'; sp.style.top = (c.top - vb.top + fy * c.height) + 'px';
      sp.hidden = false;
    };
    view.addEventListener('click', e => {
      if (e.target.closest('button, label, .mtr-film')) return;
      if (Date.now() - expAt < 400) return;
      const el = mode === 'live' ? video : img;
      const iw = mode === 'live' ? video.videoWidth : img.naturalWidth, ih = mode === 'live' ? video.videoHeight : img.naturalHeight;
      if (!iw) return;
      const c = coverRect(el, iw, ih);
      const x = (e.clientX - c.left) / c.width, y = (e.clientY - c.top) / c.height;
      if (x < 0 || x > 1 || y < 0 || y > 1) return;
      fx = x; fy = y; U.haptic && U.haptic(); placeSpot();
      if (mode === 'photo') measurePhoto();
    });
    const relayout = () => { placeSpot(); placeFrame(); };
    const onResize = () => { relayout(); drawRing(st.N); drawRuler(); };
    window.addEventListener('resize', onResize);

    const draw = (src, iw, ih) => {
      const k = Math.min(1, 480 / Math.max(iw, ih));
      cv.width = Math.max(1, Math.round(iw * k)); cv.height = Math.max(1, Math.round(ih * k));
      ctx.drawImage(src, 0, 0, cv.width, cv.height);
      return measure(ctx, cv.width, cv.height, fx, fy);
    };
    const setEv = (v, source) => {
      if (locks.ev) return;
      st.ev = Math.round(v * 3) / 3; st.measured = true; st.source = source; lsSet('lastEv', st.ev);
      if (st.active === 'ev') setRuler(st.ev, true);
    };

    /* ---------- Live ---------- */
    let tick = 0;
    const loop = ts => {
      raf = requestAnimationFrame(loop);
      if (ts - tick < 300 || !video.videoWidth) return;
      tick = ts;
      last = draw(video, video.videoWidth, video.videoHeight);
      const s = track?.getSettings?.() || {};
      if (s.exposureTime > 0 && s.iso > 0) {
        liveExp = true;
        const ev = Math.log2(st.phoneN * st.phoneN / (s.exposureTime / 10000)) - Math.log2(s.iso / 100) + Math.log2(Math.max(last.spot, 1e-5) / GREY) + st.cal;
        if (Math.abs(ev - st.ev) > 0.17) { setEv(ev, 'Live'); changed(); return; }
      }
      if (s.colorTemperature > 0) { $('#mWb').hidden = false; $('#mWb').textContent = `${Math.round(s.colorTemperature)} K${s.whiteBalanceMode === 'continuous' ? ' · AWB' : ''}`; }
      else if (s.whiteBalanceMode) { $('#mWb').hidden = false; $('#mWb').textContent = s.whiteBalanceMode === 'continuous' ? 'AWB' : 'WB fest'; }
      drawRead();
    };
    const stopLive = () => { cancelAnimationFrame(raf); raf = 0; if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; track = null; video.srcObject = null; };
    const say = t => { const m = $('#mMsg'); m.hidden = !t; m.textContent = t || ''; };
    async function startLive() {
      stopLive();
      mode = 'live'; last = null; st.exif = null; st.file = null;
      img.hidden = true; video.hidden = false; $('#mLive').hidden = true; $('#mFlip').hidden = false;
      if (!navigator.mediaDevices?.getUserMedia) { say('Kamera im Browser nicht verfügbar. „messen“ funktioniert trotzdem.'); drawRead(); return; }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
        if (!ov.isConnected) { stopLive(); return; }
        track = stream.getVideoTracks()[0];
        video.srcObject = stream; await video.play().catch(() => {});
        say('');
        video.addEventListener('loadedmetadata', relayout, { once: true });
        setTimeout(relayout, 300);
        raf = requestAnimationFrame(loop);
      } catch (err) {
        say(err && err.name === 'NotAllowedError' ? 'Kein Zugriff auf die Kamera. „messen“ funktioniert trotzdem.' : 'Kamera konnte nicht starten. „messen“ funktioniert trotzdem.');
      }
      drawRead();
    }
    $('#mFlip').addEventListener('click', () => { facing = facing === 'environment' ? 'user' : 'environment'; video.classList.toggle('mirror', facing === 'user'); startLive(); });
    $('#mLive').addEventListener('click', () => startLive());

    /* ---------- Foto ---------- */
    async function loadPhoto(input) {
      const file = input.files[0]; input.value = ''; if (!file) return;
      stopLive(); mode = 'photo'; last = null;
      video.hidden = true; $('#mFlip').hidden = true; $('#mLive').hidden = false; say('Lese Foto …');
      const [exif, url] = await Promise.all([readExif(file), U.fileToDataUrl(file)]);
      st.exif = exif; st.file = file;
      if (exif?.ok) { st.phoneN = exif.N; lsSet('phoneN', exif.N); if (exif.f35 > 0) { st.phoneF = exif.f35; lsSet('phoneF', exif.f35); } }
      img.onload = () => { img.hidden = false; say(''); relayout(); measurePhoto(); };
      img.onerror = () => say('Das Foto lässt sich nicht öffnen.');
      img.src = url;
    }
    function measurePhoto() {
      if (!img.naturalWidth) return;
      last = draw(img, img.naturalWidth, img.naturalHeight);
      const x = st.exif;
      if (x && x.ok) setEv(Math.log2(x.N * x.N / x.t) - Math.log2(x.iso / 100) + Math.log2(Math.max(last.spot, 1e-5) / GREY) + st.cal, 'Foto');
      changed();
    }
    $('#mCap').addEventListener('change', e => loadPhoto(e.target));
    $('#mLib').addEventListener('change', e => loadPhoto(e.target));

    /* ---------- Film-Look, Vollbild, Schwarzschild ---------- */
    const applyLook = () => { const f = st.look && lookCss ? lookCss : ''; video.style.filter = f; img.style.filter = f; };
    $('#mLook')?.addEventListener('click', e => { st.look = !st.look; lsSet('look', st.look); e.currentTarget.classList.toggle('on', st.look); e.currentTarget.setAttribute('aria-pressed', st.look); applyLook(); });
    let expAt = 0;
    $('#mExp').addEventListener('click', () => {
      expAt = Date.now();
      const big = ov.classList.toggle('big');
      $('#mExp').innerHTML = big ? IC_SHR : IC_EXP;
      $('#mExp').setAttribute('aria-label', big ? 'Sucher verkleinern' : 'Sucher vergrößern');
      setTimeout(relayout, 320);
    });
    $('#mRecip').addEventListener('click', () => {
      st.recip = !st.recip; lsSet('recip', st.recip);
      $('#mRecip').classList.toggle('on', st.recip); $('#mRecip').setAttribute('aria-checked', st.recip);
      changed();
    });

    /* ---------- Einstellungen ---------- */
    $('#mGear').addEventListener('click', () => {
      const sh = $('#mSheet');
      const render = () => {
        sh.innerHTML = `<div class="mtr-sheetbox" role="dialog" aria-label="Einstellungen">
          <h3>Einstellungen</h3>
          <div class="mtr-srow"><span>Kalibrierung<small>Abgleich mit einem echten Belichtungsmesser. Plus ergibt kürzere Zeiten.</small></span>
            <span class="mtr-step"><button type="button" data-cal="-1" aria-label="Kalibrierung minus">−</button><b>${U.fmtStops(st.cal)}</b><button type="button" data-cal="1" aria-label="Kalibrierung plus">+</button></span></div>
          <label class="mtr-srow"><span>Bildausschnitt des Objektivs zeigen<small>Ecken im Sucher, umgerechnet auf das Filmformat der Rolle.</small></span>
            <input type="checkbox" switch id="sFrame" ${st.frameOn ? 'checked' : ''}></label>
          <div class="mtr-srow"><span>Brennweite Handykamera<small>Kleinbild-äquivalent, für den Bildausschnitt. Wird aus dem EXIF eines Messfotos übernommen.</small></span>
            <span class="mtr-in"><input id="sF" inputmode="numeric" value="${dec(st.phoneF, 0)}"> mm</span></div>
          <div class="mtr-srow"><span>Blende Handykamera<small>Nur für eine Live-Messung, falls der Browser Zeit und ISO liefert. Wird aus dem EXIF übernommen.</small></span>
            <span class="mtr-in">f/<input id="sN" inputmode="decimal" value="${dec(st.phoneN, 2)}"></span></div>
          <label class="mtr-srow"><span>Messfoto beim Loggen als Handyfoto speichern<small>Nur wenn das Bild noch kein Handyfoto hat.</small></span>
            <input type="checkbox" switch id="sSave" ${st.saveShot ? 'checked' : ''}></label>
          <p class="mtr-note">Safari gibt Zeit, ISO und Weißabgleich der Handykamera im Live-Bild nicht heraus. Einen Lichtwert gibt es deshalb über „messen“ (Foto mit EXIF) oder von Hand am Lineal. Schlösser halten einen Wert fest, auch beim nächsten Öffnen.</p>
          <button type="button" class="btn" id="sDone">Fertig</button></div>`;
        sh.querySelectorAll('[data-cal]').forEach(b => b.addEventListener('click', () => {
          const d = +b.dataset.cal / 3; st.cal = Math.round((st.cal + d) * 3) / 3; lsSet('cal', st.cal);
          if (st.measured && st.source !== 'Hand' && !locks.ev) { st.ev = Math.round((st.ev + d) * 3) / 3; if (st.active === 'ev') setRuler(st.ev, false); changed(); }
          render();
        }));
        sh.querySelector('#sFrame').addEventListener('change', e => { st.frameOn = e.target.checked; lsSet('frameOn', st.frameOn); placeFrame(); });
        sh.querySelector('#sF').addEventListener('change', e => { const v = parseFloat(e.target.value.replace(',', '.')); if (v > 5) { st.phoneF = v; lsSet('phoneF', v); placeFrame(); } });
        sh.querySelector('#sN').addEventListener('change', e => { const v = parseFloat(e.target.value.replace(',', '.')); if (v > 0.5) { st.phoneN = v; lsSet('phoneN', v); } });
        sh.querySelector('#sSave').addEventListener('change', e => { st.saveShot = e.target.checked; lsSet('saveShot', st.saveShot); });
        sh.querySelector('#sDone').addEventListener('click', () => { sh.hidden = true; });
      };
      render(); sh.hidden = false;
      sh.onclick = e => { if (e.target === sh) sh.hidden = true; };
    });

    /* ---------- Loggen ---------- */
    async function snapshot() {
      if (mode === 'photo' && st.file) return st.file;
      if (mode !== 'live' || !video.videoWidth) return null;
      const c = document.createElement('canvas'); c.width = video.videoWidth; c.height = video.videoHeight;
      c.getContext('2d').drawImage(video, 0, 0);
      return await new Promise(res => c.toBlob(b => res(b), 'image/jpeg', 0.88));
    }
    $('#mLog').addEventListener('click', async () => {
      if (st.N == null) return;
      const s = solve(st.N); if (s.out) return;
      const blob = st.saveShot && !opts.hasPhone ? await snapshot() : null;
      const l = lens();
      const res = {
        aperture: String(s.n), shutter: s.dial || (s.t >= 1 ? String(Math.round(s.t)) : '1/' + Math.round(1 / s.t)), lensId: l ? l.id : null,
        meter: { ev100: Math.round(st.ev * 100) / 100, iso: st.iso, comp: st.comp, filter: Math.round(st.filt * 100) / 100, cal: Math.round(st.cal * 100) / 100,
          recip: !!s.recip, source: st.source || '', tMeasured: Math.round(s.tm * 10000) / 10000, tSet: Math.round(s.t * 10000) / 10000,
          phone: st.exif?.ok ? { t: st.exif.t, N: st.exif.N, iso: st.exif.iso, model: st.exif.model } : null,
          spot: { x: Math.round(fx * 1000) / 1000, y: Math.round(fy * 1000) / 1000 } }
      };
      close();
      opts.onLog && opts.onLog(res, blob);
    });

    /* ---------- Schließen ---------- */
    const close = () => { stopLive(); window.removeEventListener('resize', onResize); window.removeEventListener('hashchange', close); ov.remove(); document.body.classList.remove('meteron'); };
    window.addEventListener('hashchange', close);
    $('#mClose').addEventListener('click', close);

    drawLens(); applyLook(); drawChips();
    requestAnimationFrame(() => { drawRing(); drawRuler(); drawRead(); });
    startLive();
    return { close };
  }

  return { open, getCal, measure, filterStops, _GREY: GREY };
})();
