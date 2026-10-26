/* Belichtungsmesser (Test), geöffnet aus der Bildansicht eines Frames.
   Aufbau nach Rebeccas Vorlage: Kopfzeile (Schwarzschild, Film, Bildnummer, Einstellungen), links eine Rechenschieber-Skala
   Zeit ↔ Blende, rechts der Sucher mit Rahmen des gewählten Objektivs, darunter Objektivleiste, Messen/Loggen und vier Walzen
   (Lichtwert, Korrektur, Filter, ISO) mit Schlössern.

   Woher der Lichtwert kommt:
   1. Foto („messen“ oder Mediathek): EXIF liefert Zeit, Blende und ISO der Handykamera. Daraus folgt der Lichtwert, den die
      Handykamera eingestellt hat. Die Helligkeit im Messfeld verschiebt ihn auf den Wert, bei dem diese Stelle Mittelgrau
      (18 % linear) würde.
   2. Live, nur wenn der Browser Belichtungszeit und ISO der Kamera herausgibt (MediaStreamTrack.getSettings, Image Capture).
      Safari auf iOS tut das nach allem, was dazu auffindbar ist, nicht. Dann zeigt Live nur das Verhältnis Messfeld zu Bild.
   3. Von Hand an der Lichtwert-Walze.
   Belichtung: LW(ISO) = LW100 + log2(ISO/100) − Korrektur − Filter. Für jede Zeit t der Skala gilt N = √(t_gemessen · 2^LW).
   Mit Schwarzschild ist t die einzustellende Zeit und t_gemessen die Zeit vor der Korrektur (U.effectiveTime). */
const METER = (() => {
  const LS = 'kb-meter-';
  const ls = (k, d) => { try { const v = localStorage.getItem(LS + k); return v === null ? d : JSON.parse(v); } catch (_) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(LS + k, JSON.stringify(v)); } catch (_) {} };
  // Frühere Version speicherte die Kalibrierung unter „kb-meter-cal“ als Zahl, das bleibt lesbar
  const getCal = () => { const v = parseFloat(ls('cal', 0)); return isFinite(v) ? v : 0; };

  const GREY = 0.18;
  const SPOT = 0.045;
  const LUT = new Float32Array(256).map((_, i) => { const c = i / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
  const loc = () => (typeof I18N !== 'undefined' ? I18N.locale() : 'de-DE');
  const dec = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toLocaleString(loc(), { maximumFractionDigits: d });

  // Drittelreihen
  const THIRD_T = ['1/8000', '1/6400', '1/5000', '1/4000', '1/3200', '1/2500', '1/2000', '1/1600', '1/1250', '1/1000', '1/800', '1/640', '1/500', '1/400', '1/320', '1/250', '1/200', '1/160', '1/125', '1/100', '1/80', '1/60', '1/50', '1/40', '1/30', '1/25', '1/20', '1/15', '1/13', '1/10', '1/8', '1/6', '1/5', '1/4', '0.3', '0.4', '0.5', '0.6', '0.8', '1', '1.3', '1.6', '2', '2.5', '3', '4', '5', '6', '8', '10', '13', '15', '20', '25', '30', '40', '50', '60', '90', '120', '180', '240'];
  const THIRD_N = [0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.5, 2.8, 3.2, 3.5, 4, 4.5, 5, 5.6, 6.3, 7.1, 8, 9, 10, 11, 13, 14, 16, 18, 20, 22, 25, 29, 32, 36, 40, 45, 51, 57, 64, 72, 80, 90];
  const ISOS = [3, 4, 5, 6, 8, 10, 12, 16, 20, 25, 32, 40, 50, 64, 80, 100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000, 6400, 8000, 12800];
  const EVS = Array.from({ length: (21 + 6) * 3 + 1 }, (_, i) => -6 + i / 3);   // −6 … 21 in Dritteln
  const COMPS = Array.from({ length: 19 }, (_, i) => -3 + i / 3);              // −3 … +3
  const FILTS = Array.from({ length: 41 }, (_, i) => i / 3);                   // 0 … +13⅓
  const FR = ['', '⅓', '⅔'];
  const thirds = (v, sign) => {
    const s = v < -1e-6 ? '−' : sign && v > 1e-6 ? '+' : '';
    const a = Math.abs(v), w = Math.floor(a + 1e-6), f = Math.round((a - w) * 3) % 3;
    return s + (w || !f ? String(w) : '') + FR[f];
  };
  const tLabel = s => /^1\//.test(s) ? s.slice(2) : String(s).replace('.', ',') + '″';
  const tDial = s => /^\d+(\.\d+)?$/.test(s) ? s.replace('.', ',') + ' s' : s + ' s';
  const nLabel = N => { const n = THIRD_N.reduce((b, x) => Math.abs(Math.log2(x / N)) < Math.abs(Math.log2(b / N)) ? x : b); return Math.abs(Math.log2(n / N)) < 1 / 7 ? n : Math.round(N * 10) / 10; };

  // Film- und Objektivgeometrie: Diagonale Kleinbild 43,27 mm
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
  // Sichtbares Bildrechteck bei object-fit: cover
  function coverRect(el, iw, ih) {
    const r = el.getBoundingClientRect();
    const s = Math.max(r.width / iw, r.height / ih), w = iw * s, h = ih * s;
    return { left: r.left + (r.width - w) / 2, top: r.top + (r.height - h) / 2, width: w, height: h, box: r };
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
  const IC_FLIP = IC('<path d="M4 12a8 8 0 0 1 13.7-5.6L20 9"/><path d="M20 4v5h-5"/><path d="M20 12a8 8 0 0 1-13.7 5.6L4 15"/><path d="M4 20v-5h5"/>');
  const IC_EXP = IC('<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>');
  const IC_SHR = IC('<path d="M4 14h6v6M20 10h-6V4M10 14l-7 7M14 10l7-7"/>');
  const IC_GEAR = IC('<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>', 21);
  const IC_LOG = IC('<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 8"/>', 20);
  const IC_SHUT = IC('<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5l3.2 8.5M20.5 12l-8.5 3.2M12 20.5 8.8 12M3.5 12l8.5-3.2"/>', 20);
  const IC_LIB = IC('<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 15l5-5 4 4 3-3 6 6"/>', 18);
  const IC_LIVE = IC('<circle cx="12" cy="12" r="3.2" fill="currentColor"/><path d="M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8"/>', 18);

  /* opts: { stock, roll, cam, frameLabel, filmArt, lenses: [{id, label, focal, apertures}], lensId, shutters,
             aperture, iso, boxIso, filterSuggest, hasPhone, onLog(result, blob) } */
  function open(opts) {
    const stock = opts.stock, film = filmSize(opts.roll, opts.cam);
    const shNum = (opts.shutters || []).filter(v => U.parseShutter(v) > 0);
    const camFast = shNum.length ? Math.min(...shNum.map(U.parseShutter)) : 1 / 1000;
    let camSlow = shNum.length ? Math.max(...shNum.map(U.parseShutter)) : 1;
    if ((opts.shutters || []).some(v => v === 'B' || v === 'T')) camSlow = 240;
    const lenses = opts.lenses || [];
    let lensIdx = Math.max(0, lenses.findIndex(l => l.id === opts.lensId));
    if (!lenses.length) lensIdx = -1;
    const lens = () => lenses[lensIdx] || null;
    const recipKnown = !!stock && U.reciprocity(stock, 2).ok;

    // Zustand; Schlösser halten ihren Wert auch beim nächsten Öffnen
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
      sel: null, measured: false, source: '', exif: null, file: null
    };
    let mode = 'live', stream = null, track = null, raf = 0, facing = 'environment', fx = 0.5, fy = 0.5, liveExp = false, last = null;

    const filmType = stock?.type || '';
    const looks = { sw: 'grayscale(1) contrast(1.12)', 'sw-c41': 'grayscale(1) contrast(1.05)', 'sw-umkehr': 'grayscale(1) contrast(1.3)', ir: 'grayscale(1) contrast(1.45) brightness(1.05)', farbneg: 'saturate(1.08) sepia(.1) contrast(.97)', dia: 'saturate(1.3) contrast(1.15)' };
    const lookCss = looks[filmType] || '';

    const ov = document.createElement('div');
    ov.className = 'mtr';
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Belichtungsmesser');
    ov.innerHTML = `
      <div class="mtr-glow" aria-hidden="true"></div>
      <header class="mtr-top">
        <button type="button" class="mtr-pill mtr-recip${st.recip ? ' on' : ''}" id="mRecip" ${recipKnown ? '' : 'disabled'} aria-pressed="${st.recip}">Schwarzschild <span class="mtr-ck">${IC('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 14)}</span></button>
        <span class="mtr-film">${opts.filmArt || ''}<span>${U.esc(stock ? (stock.name || U.stockLabel(stock)) : 'Film')}</span></span>
        <span class="mtr-no">#${U.esc(opts.frameLabel || '')}</span>
        <button type="button" class="mtr-ic" id="mGear" aria-label="Einstellungen">${IC_GEAR}</button>
        <button type="button" class="mtr-ic" id="mClose" aria-label="Schließen">${ART.x}</button>
      </header>
      <div class="mtr-body">
        <div class="mtr-scale" id="mScale" role="list" aria-label="Zeit und Blende"></div>
        <div class="mtr-right">
          <div class="mtr-view" id="mView">
            <video id="mVideo" playsinline muted autoplay></video>
            <img id="mImg" alt="" hidden>
            <div class="mtr-frame" id="mFrame" hidden><i></i><i></i><i></i><i></i></div>
            <div class="mtr-spot" id="mSpot" hidden></div>
            <div class="mtr-tags">
              <span class="mtr-tag" id="mWb" hidden></span>
              ${lookCss ? `<button type="button" class="mtr-tag${st.look ? ' on' : ''}" id="mLook" aria-pressed="${st.look}">Film-Look</button>` : ''}
            </div>
            <p class="mtr-msg" id="mMsg" hidden></p>
            <button type="button" class="mtr-vbtn l" id="mFlip" aria-label="Kamera wechseln">${IC_FLIP}</button>
            <button type="button" class="mtr-vbtn l" id="mLive" aria-label="Zurück zu Live" hidden>${IC_LIVE}</button>
            <button type="button" class="mtr-vbtn r" id="mExp" aria-label="Sucher vergrößern">${IC_EXP}</button>
            <label class="mtr-vbtn l t" aria-label="Aus Mediathek" role="button"><input type="file" accept="image/*" id="mLib" hidden>${IC_LIB}</label>
          </div>
          <button type="button" class="mtr-lens" id="mLens"></button>
          <div class="mtr-act">
            <div class="mtr-read" id="mRead" aria-live="polite"></div>
            <div class="mtr-btns">
              <label class="mtr-meas"><input type="file" accept="image/*" capture="environment" id="mCap" hidden>${IC_SHUT}<span>messen</span></label>
              <button type="button" class="mtr-log" id="mLog" disabled>${IC_LOG}<span>loggen</span></button>
            </div>
          </div>
          <div class="mtr-wheels">
            <div class="mtr-band" aria-hidden="true"></div>
            <div class="mtr-wheel" data-k="ev" aria-label="Lichtwert"></div>
            <div class="mtr-wheel" data-k="comp" aria-label="Korrektur"></div>
            <div class="mtr-wheel" data-k="filt" aria-label="Filter"></div>
            <div class="mtr-wheel" data-k="iso" aria-label="ISO"></div>
          </div>
          <div class="mtr-wlabels">
            <button type="button" data-k="ev">LW</button><button type="button" data-k="comp">Korr.</button><button type="button" data-k="filt">Filter</button><button type="button" data-k="iso">ISO</button>
          </div>
        </div>
      </div>
      <div class="mtr-sheet" id="mSheet" hidden></div>`;
    document.body.appendChild(ov);
    document.body.classList.add('meteron');
    const $ = s => ov.querySelector(s);
    const video = $('#mVideo'), img = $('#mImg'), view = $('#mView');
    const cv = document.createElement('canvas'), ctx = cv.getContext('2d', { willReadFrequently: true });

    /* ---------- Walzen ---------- */
    const ROW = 34;
    const LISTS = { ev: EVS, comp: COMPS, filt: FILTS, iso: ISOS };
    const LBL = {
      ev: v => Math.abs(v - Math.round(v)) < 1e-6 ? String(Math.round(v)).replace('-', '−') : '•',
      comp: v => thirds(v, true), filt: v => thirds(v, true), iso: v => String(v)
    };
    const wheels = {};
    ov.querySelectorAll('.mtr-wheel').forEach(w => {
      const k = w.dataset.k, list = LISTS[k];
      w.innerHTML = `<div class="mtr-pad"></div>${list.map((v, i) => `<div class="mtr-it" data-i="${i}" data-a="${LBL[k](v)}" data-b="${k === 'ev' ? thirds(v) : LBL[k](v)}">${LBL[k](v)}</div>`).join('')}<div class="mtr-pad"></div>`;
      let tm = null, quiet = false;
      const idx = () => Math.max(0, Math.min(list.length - 1, Math.round(w.scrollTop / ROW)));
      const mark = i => w.querySelectorAll('.mtr-it').forEach((e, j) => { const d = Math.abs(j - i); e.className = 'mtr-it' + (d === 0 ? ' on' : d === 1 ? ' n1' : d === 2 ? ' n2' : ''); e.textContent = d === 0 ? e.dataset.b : e.dataset.a; });
      w.addEventListener('scroll', () => {
        mark(idx());
        if (quiet) return;
        clearTimeout(tm); tm = setTimeout(() => {
          const i = idx(), v = list[i];
          if (locks[k]) { set(st[k]); return; }          // gesperrt: zurückspringen
          if (Math.abs(v - st[k]) > 1e-6) { st[k] = v; U.haptic && U.haptic(8); if (k === 'ev') { st.source = 'Hand'; st.measured = true; lsSet('lastEv', v); } changed(); }
        }, 90);
      }, { passive: true });
      w.addEventListener('click', e => { const it = e.target.closest('.mtr-it'); if (it && !locks[k]) w.scrollTo({ top: +it.dataset.i * ROW, behavior: 'smooth' }); });
      const set = (v, smooth) => {
        const i = list.reduce((b, x, j) => Math.abs(x - v) < Math.abs(list[b] - v) ? j : b, 0);
        quiet = true; w.scrollTo({ top: i * ROW, behavior: smooth ? 'smooth' : 'auto' }); mark(i);
        setTimeout(() => { quiet = false; }, smooth ? 450 : 80);
      };
      wheels[k] = { el: w, set };
    });
    const WN = { ev: ['LW', 'Lichtwert'], comp: ['Korr.', 'Korrektur'], filt: ['Filter', 'Filter'], iso: ['ISO', 'ISO'] };
    const drawLocks = () => ov.querySelectorAll('.mtr-wlabels button').forEach(b => {
      const k = b.dataset.k; b.classList.toggle('on', !!locks[k]);
      b.innerHTML = `<span>${WN[k][0]}</span>${locks[k] ? LOCK : UNLOCK}`;
      b.setAttribute('aria-label', `${WN[k][1]} ${locks[k] ? 'entsperren' : 'sperren'}`);
      wheels[k].el.classList.toggle('locked', !!locks[k]);
    });
    ov.querySelector('.mtr-wlabels').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const k = b.dataset.k; locks[k] = !locks[k]; lsSet('locks', locks);
      if (locks[k]) lsSet(k, st[k]);
      U.haptic && U.haptic(); drawLocks();
    });

    /* ---------- Skala Zeit ↔ Blende ---------- */
    const evSet = () => st.ev + Math.log2(st.iso / 100) - st.comp - st.filt;
    function rows() {
      const ev = evSet(), l = lens();
      const lo = l ? Math.min(...l.apertures.map(U.parseAperture)) : 1.4, hi = l ? Math.max(...l.apertures.map(U.parseAperture)) : 22;
      const full = l ? l.apertures : ['1', '1.4', '2', '2.8', '4', '5.6', '8', '11', '16', '22', '32', '45', '64'];
      return THIRD_T.filter(s => { const t = U.parseShutter(s); return t >= camFast / 1.12 && t <= camSlow * 1.12; }).map(s => {
        const t = U.parseShutter(s);
        let tm = t, recip = false, recipBad = false;
        if (st.recip && t > 1) { const e = U.effectiveTime(stock, t); if (e.ok) { tm = e.t; recip = Math.abs(e.t - t) > 0.01; } else recipBad = true; }
        const N = Math.sqrt(tm * Math.pow(2, ev));
        const n = nLabel(N);
        const dial = shNum.find(v => Math.abs(Math.log2(U.parseShutter(v) / t)) < 0.05);
        const inLens = N >= lo / 1.06 && N <= hi * 1.06;
        const fullStop = full.some(a => Math.abs(Math.log2(U.parseAperture(a) / n)) < 0.05);
        return { s, t, tm, N, n, onDial: !!dial, inLens, fullStop, recip, recipBad, dial };
      });
    }
    let cur = [];
    function drawScale(center) {
      const sc = $('#mScale'), keep = sc.scrollTop;
      cur = rows();
      sc.innerHTML = cur.map((r, i) => `<button type="button" role="listitem" class="mtr-row${r.onDial ? ' dial' : ''}${r.inLens ? ' lens' : ''}${r.fullStop && r.inLens ? ' full' : ''}${st.sel && st.sel.s === r.s ? ' sel' : ''}" data-i="${i}">
          <span class="mtr-t">${tLabel(r.s)}</span><span class="mtr-tick"></span><span class="mtr-n">${r.N >= 0.6 && r.N <= 96 ? String(r.n).replace('.', ',') : ''}</span>${r.recip ? '<span class="mtr-rc" title="mit Schwarzschild" aria-label="mit Schwarzschild"></span>' : ''}</button>`).join('');
      if (center) centerScale(); else sc.scrollTop = keep;
    }
    function centerScale() {
      const sc = $('#mScale');
      let i = st.sel ? cur.findIndex(r => r.s === st.sel.s) : -1;
      if (i < 0 && opts.aperture) { const A = U.parseAperture(opts.aperture); if (A > 0) i = cur.reduce((b, r, j) => Math.abs(Math.log2(r.N / A)) < Math.abs(Math.log2(cur[b].N / A)) ? j : b, 0); }
      if (i < 0) i = cur.findIndex(r => r.inLens && r.fullStop);
      const el = sc.children[Math.max(0, i)];
      if (el) sc.scrollTop = el.offsetTop - sc.clientHeight / 2 + el.offsetHeight / 2;
    }
    $('#mScale').addEventListener('click', e => {
      const b = e.target.closest('.mtr-row'); if (!b) return;
      const r = cur[+b.dataset.i];
      st.sel = { s: r.s };
      U.haptic && U.haptic();
      $('#mScale').querySelectorAll('.mtr-row').forEach(x => x.classList.toggle('sel', x === b));
      drawRead();
    });

    /* ---------- Anzeige unter dem Sucher ---------- */
    function drawRead() {
      const r = st.sel && cur.find(x => x.s === st.sel.s);
      const src = { Foto: 'aus Foto', Live: 'live', Hand: 'von Hand' }[st.source] || '';
      let h = '';
      if (last && mode === 'photo' && !(st.exif && st.exif.ok)) h += `<div class="mtr-warn">Foto ohne Belichtungsdaten (EXIF). Lichtwert von Hand einstellen oder ein Foto der Kamera-App aus der Mediathek laden.</div>`;
      if (r) h += `<div class="mtr-pair"><b>f/${String(r.n).replace('.', ',')}</b><b>${tDial(r.s)}</b></div>
        <div class="mtr-sub">${r.onDial ? '' : 'Zwischenwert · '}${!r.inLens ? 'außerhalb des Objektivs · ' : ''}${r.recip ? `gemessen ${U.fmtSec(r.tm)} · ` : r.recipBad ? 'Schwarzschild unbekannt · ' : ''}LW ${dec(st.ev)} ${src}</div>`;
      else if (st.measured) h += `<div class="mtr-pair"><span class="mtr-big">LW ${dec(st.ev)}</span><span class="mtr-src">${src}</span></div><div class="mtr-sub">Zeit und Blende links antippen</div>`;
      else h += `<div class="mtr-sub">${liveExp ? 'Live-Messung läuft. ' : ''}Messfeld antippen, dann <b>messen</b>.</div>`;
      if (last && last.clip > 0.2) h += '<div class="mtr-warn">Messfeld ausgebrannt, Wert zu niedrig.</div>';
      else if (last && last.dark > 0.2) h += '<div class="mtr-warn">Messfeld fast schwarz, Wert unsicher.</div>';
      else if (mode === 'live' && !liveExp && last) h += `<div class="mtr-sub">Messfeld ${U.fmtStops(Math.log2(Math.max(last.spot, 1e-5) / Math.max(last.mean, 1e-5)))} Blenden zum Bild</div>`;
      $('#mRead').innerHTML = h;
      $('#mLog').disabled = !r;
    }
    function changed() { drawScale(false); drawRead(); }

    /* ---------- Objektivleiste und Rahmen ---------- */
    function drawLens() {
      const l = lens(), b = $('#mLens');
      if (!l) { b.innerHTML = `<span class="mtr-lname">Kein Objektiv gewählt</span>`; b.disabled = true; $('#mFrame').hidden = true; return; }
      const crop = DIAG_KB / Math.hypot(film.w, film.h), feq = l.focal * crop;
      const txt = l.focal ? (film.label === 'KB' ? `KB · ${dec(l.focal, 0)} mm` : `${film.label} · ${dec(l.focal, 0)} mm ≈ ${dec(feq, 0)} mm KB`) : U.esc(l.label);
      b.innerHTML = `<span class="mtr-lname">${txt}</span>${lenses.length > 1 ? '<span class="mtr-lnext">wechseln</span>' : ''}<span class="mtr-lock${st.frameOn ? ' on' : ''}" id="mFrameT" role="switch" aria-checked="${st.frameOn}" aria-label="Bildausschnitt anzeigen">${st.frameOn ? LOCK : UNLOCK}</span>`;
      b.disabled = false;
      placeFrame();
    }
    function placeFrame() {
      const l = lens(), fr = $('#mFrame');
      const iw = mode === 'live' ? video.videoWidth : img.naturalWidth, ih = mode === 'live' ? video.videoHeight : img.naturalHeight;
      if (!l || !l.focal || !st.frameOn || !iw) { fr.hidden = true; return; }
      const el = mode === 'live' ? video : img, c = coverRect(el, iw, ih);
      const feq = l.focal * DIAG_KB / Math.hypot(film.w, film.h);
      const k = Math.min(1, st.phoneF / feq);                       // Anteil der Bilddiagonale
      const portrait = c.height >= c.width;
      const aw = portrait ? Math.min(film.w, film.h) : Math.max(film.w, film.h), ah = portrait ? Math.max(film.w, film.h) : Math.min(film.w, film.h);
      const u = Math.hypot(c.width, c.height) * k / Math.hypot(aw, ah);
      let w = aw * u, h = ah * u;
      const vb = view.getBoundingClientRect();
      const fit = Math.min(1, (vb.width - 16) / w, (vb.height - 16) / h); w *= fit; h *= fit;   // sichtbar halten
      fr.style.width = w + 'px'; fr.style.height = h + 'px';
      fr.style.left = (c.left - vb.left + c.width / 2 - w / 2) + 'px'; fr.style.top = (c.top - vb.top + c.height / 2 - h / 2) + 'px';
      fr.classList.toggle('wide', st.phoneF / feq > 1.02 || fit < 0.999);
      fr.hidden = false;
    }
    $('#mLens').addEventListener('click', e => {
      if (e.target.closest('#mFrameT')) { st.frameOn = !st.frameOn; lsSet('frameOn', st.frameOn); drawLens(); return; }
      if (lenses.length < 2) return;
      lensIdx = (lensIdx + 1) % lenses.length; U.haptic && U.haptic();
      st.sel = null; drawLens(); drawScale(true); drawRead();
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
      if (e.target.closest('button, label')) return;
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
    window.addEventListener('resize', relayout);

    const draw = (src, iw, ih) => {
      const k = Math.min(1, 480 / Math.max(iw, ih));
      cv.width = Math.max(1, Math.round(iw * k)); cv.height = Math.max(1, Math.round(ih * k));
      ctx.drawImage(src, 0, 0, cv.width, cv.height);
      return measure(ctx, cv.width, cv.height, fx, fy);
    };
    const setEv = (v, source) => {
      if (locks.ev) return;
      st.ev = Math.round(v * 3) / 3; st.measured = true; st.source = source; lsSet('lastEv', st.ev);
      wheels.ev.set(st.ev, true);
    };

    /* ---------- Live ---------- */
    let tick = 0;
    const loop = ts => {
      raf = requestAnimationFrame(loop);
      if (ts - tick < 300 || !video.videoWidth) return;
      tick = ts;
      last = draw(video, video.videoWidth, video.videoHeight);
      // Nur wenn der Browser Zeit und ISO verrät (Image Capture: exposureTime in 100-µs-Schritten)
      const s = track?.getSettings?.() || {};
      if (s.exposureTime > 0 && s.iso > 0) {
        liveExp = true;
        const ev = Math.log2(st.phoneN * st.phoneN / (s.exposureTime / 10000)) - Math.log2(s.iso / 100) + Math.log2(Math.max(last.spot, 1e-5) / GREY) + st.cal;
        if (Math.abs(ev - st.ev) > 0.17) { setEv(ev, 'Live'); changed(); return; }
      }
      if (s.colorTemperature > 0) { $('#mWb').hidden = false; $('#mWb').textContent = `${Math.round(s.colorTemperature)} K${s.whiteBalanceMode === 'continuous' ? ' · AWB' : ''}`; }
      else if (s.whiteBalanceMode) { $('#mWb').hidden = false; $('#mWb').textContent = s.whiteBalanceMode === 'continuous' ? 'AWB' : 'WB fest'; }
      if (!st.sel) drawRead();
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
    $('#mLive').addEventListener('click', () => { startLive(); });

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

    /* ---------- Sucher, Film-Look, Vollbild ---------- */
    const applyLook = () => { const f = st.look && lookCss ? lookCss : ''; video.style.filter = f; img.style.filter = f; };
    $('#mLook')?.addEventListener('click', e => { st.look = !st.look; lsSet('look', st.look); e.currentTarget.classList.toggle('on', st.look); e.currentTarget.setAttribute('aria-pressed', st.look); applyLook(); });
    $('#mExp').addEventListener('click', () => {
      const big = ov.classList.toggle('big');
      $('#mExp').innerHTML = big ? IC_SHR : IC_EXP;
      $('#mExp').setAttribute('aria-label', big ? 'Sucher verkleinern' : 'Sucher vergrößern');
      setTimeout(relayout, 280);
    });

    /* ---------- Schwarzschild ---------- */
    $('#mRecip').addEventListener('click', () => {
      st.recip = !st.recip; lsSet('recip', st.recip);
      $('#mRecip').classList.toggle('on', st.recip); $('#mRecip').setAttribute('aria-pressed', st.recip);
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
          <div class="mtr-srow"><span>Brennweite Handykamera<small>Kleinbild-äquivalent, für den Bildausschnitt. Wird aus dem EXIF eines Messfotos übernommen.</small></span>
            <span class="mtr-in"><input id="sF" inputmode="numeric" value="${dec(st.phoneF, 0)}"> mm</span></div>
          <div class="mtr-srow"><span>Blende Handykamera<small>Nur für eine Live-Messung, falls der Browser Zeit und ISO liefert. Wird aus dem EXIF übernommen.</small></span>
            <span class="mtr-in">f/<input id="sN" inputmode="decimal" value="${dec(st.phoneN, 2)}"></span></div>
          <label class="mtr-srow"><span>Messfoto beim Loggen als Handyfoto speichern<small>Nur wenn das Bild noch kein Handyfoto hat.</small></span>
            <input type="checkbox" switch id="sSave" ${st.saveShot ? 'checked' : ''}></label>
          <p class="mtr-note">Safari gibt Zeit, ISO und Weißabgleich der Handykamera im Live-Bild nicht heraus. Einen Lichtwert gibt es deshalb über „messen“ (Foto mit EXIF) oder von Hand an der Walze LW. Schlösser halten einen Wert fest, auch beim nächsten Öffnen.</p>
          <button type="button" class="btn" id="sDone">Fertig</button></div>`;
        sh.querySelectorAll('[data-cal]').forEach(b => b.addEventListener('click', () => {
          const d = +b.dataset.cal / 3; st.cal = Math.round((st.cal + d) * 3) / 3; lsSet('cal', st.cal);
          if (st.measured && st.source !== 'Hand' && !locks.ev) { st.ev = Math.round((st.ev + d) * 3) / 3; wheels.ev.set(st.ev, true); changed(); }
          render();
        }));
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
      const r = st.sel && cur.find(x => x.s === st.sel.s); if (!r) return;
      const blob = st.saveShot && !opts.hasPhone ? await snapshot() : null;
      const l = lens();
      const res = {
        aperture: String(r.n), shutter: r.dial || r.s, lensId: l ? l.id : null,
        meter: { ev100: Math.round(st.ev * 100) / 100, iso: st.iso, comp: st.comp, filter: Math.round(st.filt * 100) / 100, cal: Math.round(st.cal * 100) / 100,
          recip: !!r.recip, source: st.source || '', tMeasured: r.tm,
          phone: st.exif?.ok ? { t: st.exif.t, N: st.exif.N, iso: st.exif.iso, model: st.exif.model } : null,
          spot: { x: Math.round(fx * 1000) / 1000, y: Math.round(fy * 1000) / 1000 } }
      };
      close();
      opts.onLog && opts.onLog(res, blob);
    });

    /* ---------- Schließen ---------- */
    const close = () => { stopLive(); window.removeEventListener('resize', relayout); window.removeEventListener('hashchange', close); ov.remove(); document.body.classList.remove('meteron'); };
    window.addEventListener('hashchange', close);
    $('#mClose').addEventListener('click', close);

    // Start
    drawLocks(); drawLens(); applyLook();
    requestAnimationFrame(() => {
      Object.entries(wheels).forEach(([k, w]) => w.set(st[k]));
      drawScale(true); drawRead();
    });
    startLive();
    return { close };
  }

  return { open, getCal, measure, filterStops, _GREY: GREY };
})();
