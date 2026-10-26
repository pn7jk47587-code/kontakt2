/* Belichtungsmesser (Testversion), geöffnet aus der Bildansicht eines Frames.
   Live: Kamerabild über getUserMedia. Ein Tipp legt den Messpunkt fest, der als Mittelgrau gelten soll.
   Das Live-Bild liefert keine Belichtungsdaten (Safari auf iOS gibt Zeit und ISO der Handykamera nicht heraus),
   deshalb zeigt es nur, wie viele Blenden der Messpunkt heller oder dunkler ist als das Gesamtbild.
   Foto: Ein Handyfoto bringt in den EXIF-Daten Zeit, Blende und ISO mit. Daraus folgt der Lichtwert,
   den die Handykamera eingestellt hat. Die Helligkeit des Messpunkts im Foto verschiebt ihn auf den Wert,
   bei dem dieser Punkt Mittelgrau (18 % linear) würde. Die Kalibrierung gleicht Abweichungen zu einem echten
   Belichtungsmesser aus und bleibt auf dem Gerät gespeichert. */
const METER = (() => {
  const CAL_KEY = 'kb-meter-cal';
  const GREY = 0.18;                 // Mittelgrau, linear
  const SPOT = 0.045;                // Halbe Kantenlänge des Messfelds, Anteil der kürzeren Bildseite
  const getCal = () => { try { const v = parseFloat(localStorage.getItem(CAL_KEY)); return isFinite(v) ? v : 0; } catch (_) { return 0; } };
  const setCal = v => { try { localStorage.setItem(CAL_KEY, String(v)); } catch (_) {} };
  const LUT = new Float32Array(256).map((_, i) => { const c = i / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
  const loc = () => (typeof I18N !== 'undefined' ? I18N.locale() : 'de-DE');
  const f1 = v => (Math.round(v * 10) / 10).toLocaleString(loc(), { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const fN = n => (Math.round(n * 10) / 10).toLocaleString(loc(), { maximumFractionDigits: 1 });
  const fT = t => t >= 1 ? fN(t) + ' s' : '1/' + Math.round(1 / t) + ' s';
  const shTxt = v => /^\d+(\.\d+)?$/.test(v) ? v.replace('.', ',') + ' s' : v + ' s';

  // Mittlere lineare Helligkeit (Rec. 709) in einem Rechteck, dazu der Anteil ausgebrannter Pixel
  function measure(ctx, w, h, fx, fy) {
    const d = ctx.getImageData(0, 0, w, h).data;
    let all = 0;
    for (let i = 0; i < d.length; i += 16) all += 0.2126 * LUT[d[i]] + 0.7152 * LUT[d[i + 1]] + 0.0722 * LUT[d[i + 2]];
    const mean = all / (d.length / 16);
    const r = Math.max(2, Math.round(Math.min(w, h) * SPOT));
    const cx = Math.round(fx * w), cy = Math.round(fy * h);
    const x0 = Math.max(0, cx - r), x1 = Math.min(w, cx + r), y0 = Math.max(0, cy - r), y1 = Math.min(h, cy + r);
    let s = 0, n = 0, clip = 0, dark = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = (y * w + x) * 4;
      s += 0.2126 * LUT[d[i]] + 0.7152 * LUT[d[i + 1]] + 0.0722 * LUT[d[i + 2]]; n++;
      if (d[i] > 250 || d[i + 1] > 250 || d[i + 2] > 250) clip++;
      if (d[i] < 6 && d[i + 1] < 6 && d[i + 2] < 6) dark++;
    }
    return { spot: n ? s / n : 0, mean, clip: n ? clip / n : 0, dark: n ? dark / n : 0 };
  }

  // Sichtbares Bildrechteck bei object-fit: contain
  function contentRect(el, iw, ih) {
    const r = el.getBoundingClientRect();
    const s = Math.min(r.width / iw, r.height / ih), w = iw * s, h = ih * s;
    return { left: r.left + (r.width - w) / 2, top: r.top + (r.height - h) / 2, width: w, height: h, offX: (r.width - w) / 2, offY: (r.height - h) / 2 };
  }

  async function readExif(file) {
    try {
      const e = await exifr.parse(file, { tiff: true, exif: true, gps: false });
      if (!e) return null;
      const t = +e.ExposureTime, N = +e.FNumber, iso = +(e.ISO ?? e.ISOSpeedRatings ?? e.PhotographicSensitivity);
      return { t, N, iso, model: [e.Make, e.Model].filter(Boolean).join(' '), ok: t > 0 && N > 0 && iso > 0 };
    } catch (_) { return null; }
  }

  /* opts: { stock, ei, apertures: ['2.8', …], shutters: ['1/500', …], aperture, onApply(result) } */
  function open(opts) {
    const apertures = (opts.apertures || []).filter(v => U.parseAperture(v) > 0);
    const apList = apertures.length ? apertures : ['1.4', '2', '2.8', '4', '5.6', '8', '11', '16', '22'];
    const shNum = (opts.shutters || []).filter(v => U.parseShutter(v) > 0);
    let ap = apList.includes(String(opts.aperture || '')) ? String(opts.aperture) : apList[Math.floor(apList.length / 2)];
    const box = parseFloat(opts.boxIso) > 0 ? parseFloat(opts.boxIso) : null;
    let isoIn = parseFloat(opts.ei) > 0 ? String(parseFloat(opts.ei)) : '';
    const curEi = () => parseFloat(isoIn) > 0 ? parseFloat(isoIn) : (box || 100);
    let cal = getCal(), ei = curEi();
    let mode = 'live', stream = null, raf = 0, fx = 0.5, fy = 0.5, photo = null, last = null, result = null;

    const ov = document.createElement('div');
    ov.className = 'meterov';
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Belichtungsmesser');
    ov.innerHTML = `
      <div class="mtop"><span class="mtitle">Belichtungsmesser</span><span class="mbadge">Test</span>
        <button class="mx" id="mClose" aria-label="Schließen">${ART.x}</button></div>
      <div class="mstage" id="mStage">
        <video id="mVideo" playsinline muted autoplay></video>
        <img id="mImg" alt="" hidden>
        <div class="mspot" id="mSpot" hidden></div>
        <p class="mmsg" id="mMsg" hidden></p>
      </div>
      <div class="mpanel">
        <div class="mmodes">
          <button type="button" class="mmode on" data-m="live">Live</button>
          <label class="mmode"><input type="file" accept="image/*" capture="environment" id="mCap" hidden>Foto aufnehmen</label>
          <label class="mmode"><input type="file" accept="image/*" id="mLib" hidden>Aus Mediathek</label>
        </div>
        <div id="mRead" class="mread" aria-live="polite"></div>
        <div id="mSet" class="mset" hidden>
          <div class="mline"><span class="mlab">ISO <span id="mEiSrc"></span></span><input id="mEi" inputmode="numeric" value="${U.esc(isoIn)}" placeholder="${box ? U.esc(String(box)) : '100'}"></div>
          <div class="mline"><span class="mlab">Kalibrierung</span>
            <span class="mcal"><button type="button" id="mCalM" aria-label="Kalibrierung minus">−</button><b id="mCalV"></b><button type="button" id="mCalP" aria-label="Kalibrierung plus">+</button></span></div>
          <div class="mlab mtabhead">${opts.lensName ? U.esc(opts.lensName) : 'Kein Objektiv gewählt, volle Blendenreihe'}</div>
          <div id="mRes" class="mtab" role="list"></div>
          <button type="button" class="btn primary" id="mApply" disabled>In den Frame übernehmen</button>
        </div>
        <p class="hint mhint">Tippe auf die Stelle, die Mittelgrau werden soll.</p>
      </div>`;
    document.body.appendChild(ov);
    document.body.classList.add('meteron');
    const $ = s => ov.querySelector(s);
    const video = $('#mVideo'), img = $('#mImg'), spotEl = $('#mSpot'), msg = $('#mMsg');
    const cv = document.createElement('canvas'), ctx = cv.getContext('2d', { willReadFrequently: true });

    const stopLive = () => { cancelAnimationFrame(raf); raf = 0; if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; video.srcObject = null; };
    const close = () => { stopLive(); ov.remove(); document.body.classList.remove('meteron'); window.removeEventListener('hashchange', close); };
    window.addEventListener('hashchange', close);
    $('#mClose').addEventListener('click', close);

    const say = t => { msg.hidden = !t; msg.textContent = t || ''; };
    const placeSpot = () => {
      const el = mode === 'live' ? video : img;
      const iw = mode === 'live' ? video.videoWidth : img.naturalWidth, ih = mode === 'live' ? video.videoHeight : img.naturalHeight;
      if (!iw || !ih) { spotEl.hidden = true; return; }
      const c = contentRect(el, iw, ih), sr = $('#mStage').getBoundingClientRect(), er = el.getBoundingClientRect();
      const size = Math.min(c.width, c.height) * SPOT * 2;
      spotEl.style.width = spotEl.style.height = Math.max(22, size) + 'px';
      spotEl.style.left = (er.left - sr.left + c.offX + fx * c.width) + 'px';
      spotEl.style.top = (er.top - sr.top + c.offY + fy * c.height) + 'px';
      spotEl.hidden = false;
    };
    $('#mStage').addEventListener('click', e => {
      const el = mode === 'live' ? video : img;
      const iw = mode === 'live' ? video.videoWidth : img.naturalWidth, ih = mode === 'live' ? video.videoHeight : img.naturalHeight;
      if (!iw || !ih) return;
      const c = contentRect(el, iw, ih);
      const x = (e.clientX - c.left) / c.width, y = (e.clientY - c.top) / c.height;
      if (x < 0 || x > 1 || y < 0 || y > 1) return;
      fx = x; fy = y; U.haptic && U.haptic();
      placeSpot();
      if (mode === 'photo') measurePhoto();
    });
    window.addEventListener('resize', placeSpot);

    const draw = (src, iw, ih) => {
      const k = Math.min(1, 480 / Math.max(iw, ih));
      cv.width = Math.max(1, Math.round(iw * k)); cv.height = Math.max(1, Math.round(ih * k));
      ctx.drawImage(src, 0, 0, cv.width, cv.height);
      return measure(ctx, cv.width, cv.height, fx, fy);
    };
    const warn = m => m.clip > 0.2 ? '<p class="mwarn">Messpunkt ist im Handybild ausgebrannt. Der Wert ist zu niedrig.</p>'
      : m.dark > 0.2 ? '<p class="mwarn">Messpunkt ist im Handybild fast schwarz. Der Wert ist unsicher.</p>' : '';

    // Live: Verhältnis Messpunkt zu Gesamtbild, etwa fünfmal pro Sekunde
    let tick = 0;
    const loop = ts => {
      raf = requestAnimationFrame(loop);
      if (ts - tick < 200 || !video.videoWidth) return;
      tick = ts;
      const m = draw(video, video.videoWidth, video.videoHeight);
      const d = Math.log2(Math.max(m.spot, 1e-5) / Math.max(m.mean, 1e-5));
      $('#mRead').innerHTML = `<div class="mbig"><span class="mlab">Messpunkt gegenüber Gesamtbild</span><b>${U.fmtStops(d)}</b><span class="mlab">Blenden</span></div>
        ${warn(m)}<p class="hint">Das Live-Bild liefert keine Belichtungsdaten. Für einen Lichtwert ein Foto aufnehmen.</p>`;
    };
    async function startLive() {
      mode = 'live'; photo = null; result = null;
      img.hidden = true; video.hidden = false; $('#mSet').hidden = true;
      ov.querySelectorAll('.mmode').forEach(b => b.classList.toggle('on', b.dataset.m === 'live'));
      $('#mRead').innerHTML = '';
      if (!navigator.mediaDevices?.getUserMedia) { say('Kamera im Browser nicht verfügbar. Ein Foto funktioniert trotzdem.'); return; }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
        if (!ov.isConnected) { stopLive(); return; }
        video.srcObject = stream;
        await video.play().catch(() => {});
        say('');
        video.addEventListener('loadedmetadata', placeSpot, { once: true });
        setTimeout(placeSpot, 300);
        raf = requestAnimationFrame(loop);
      } catch (err) {
        say(err && err.name === 'NotAllowedError' ? 'Kein Zugriff auf die Kamera. Ein Foto funktioniert trotzdem.' : 'Kamera konnte nicht starten. Ein Foto funktioniert trotzdem.');
      }
    }
    ov.querySelector('[data-m="live"]').addEventListener('click', () => { if (mode !== 'live') startLive(); });

    // Foto: Lichtwert aus EXIF, Messpunkt aus der Helligkeit im Foto
    async function loadPhoto(input) {
      const file = input.files[0]; input.value = ''; if (!file) return;
      stopLive();
      mode = 'photo'; result = null;
      ov.querySelectorAll('.mmode').forEach(b => b.classList.toggle('on', !b.dataset.m && b.contains(input)));
      video.hidden = true; say('Lese Foto …');
      const [exif, url] = await Promise.all([readExif(file), U.fileToDataUrl(file)]);
      photo = { exif };
      img.onload = () => { img.hidden = false; say(''); fx = 0.5; fy = 0.5; placeSpot(); measurePhoto(); };
      img.onerror = () => say('Das Foto lässt sich nicht öffnen.');
      img.src = url;
      $('#mSet').hidden = false;
    }
    $('#mCap').addEventListener('change', e => loadPhoto(e.target));
    $('#mLib').addEventListener('change', e => loadPhoto(e.target));

    function measurePhoto() {
      if (!photo || !img.naturalWidth) return;
      last = draw(img, img.naturalWidth, img.naturalHeight);
      render();
    }
    function render() {
      $('#mCalV').textContent = U.fmtStops(cal);
      const x = photo?.exif, m = last;
      const read = $('#mRead'), res = $('#mRes'), btn = $('#mApply');
      result = null; btn.disabled = true; res.innerHTML = '';
      if (!m) return;
      $('#mSet').hidden = !(x && x.ok);
      if (!x || !x.ok) {
        const d = Math.log2(Math.max(m.spot, 1e-5) / Math.max(m.mean, 1e-5));
        read.innerHTML = `<p class="mwarn">Das Foto enthält keine Belichtungsdaten (EXIF). Ein Lichtwert lässt sich daraus nicht berechnen.</p>
          <div class="mbig"><span class="mlab">Messpunkt gegenüber Gesamtbild</span><b>${U.fmtStops(d)}</b><span class="mlab">Blenden</span></div>
          <p class="hint">Mit einem Foto aus der Kamera-App über „Aus Mediathek“ klappt es eher.</p>`;
        return;
      }
      const evCam = Math.log2(x.N * x.N / x.t) - Math.log2(x.iso / 100);
      const ev100 = evCam + Math.log2(Math.max(m.spot, 1e-5) / GREY) + cal;
      const evEi = ev100 + Math.log2(ei / 100);
      read.innerHTML = `<div class="mexif"><span class="mlab">Handyfoto</span> <span>${fT(x.t)} · f/${fN(x.N)} · ISO ${Math.round(x.iso)}</span>${x.model ? ` <span class="mlab">${U.esc(x.model)}</span>` : ''}</div>
        <div class="mbig"><span class="mlab">Lichtwert bei ISO 100</span><b>LW ${f1(ev100)}</b></div>${warn(m)}`;
      // Für jede Blende des Objektivs die Zeit, bei der das Messfeld Mittelgrau wird
      const fastest = shNum.length ? Math.min(...shNum.map(U.parseShutter)) : 0;
      const slowest = shNum.length ? Math.max(...shNum.map(U.parseShutter)) : 0;
      rows = apList.map(a => {
        const N = U.parseAperture(a), t = N * N / Math.pow(2, evEi);
        let pick = null, dev = 0;
        if (shNum.length) {
          pick = shNum.reduce((b, v) => Math.abs(Math.log2(U.parseShutter(v) / t)) < Math.abs(Math.log2(U.parseShutter(b) / t)) ? v : b);
          dev = Math.log2(U.parseShutter(pick) / t);
        }
        const r = opts.stock && t > 1 ? U.reciprocity(opts.stock, t) : null;
        const out = shNum.length && (t < fastest / Math.SQRT2 || t > slowest * Math.SQRT2);
        return { a, t, pick, dev, r, out };
      });
      res.innerHTML = rows.map((w, i) => `<button type="button" role="listitem" class="mrow${w.a === ap ? ' on' : ''}${w.out ? ' out' : ''}" data-i="${i}">
          <span class="mf">f/${w.a.replace('.', ',')}</span>
          <b class="mt">${fT(w.t)}</b>
          <span class="mc">${w.out ? (w.t < fastest ? 'kürzer als die Kamera' : 'länger als die Kamera') : w.pick ? `Kamera ${shTxt(w.pick)}${Math.abs(w.dev) >= 0.05 ? ` <i>${U.fmtStops(w.dev)}</i>` : ''}` : ''}${w.r ? (w.r.ok ? `<br>Schwarzschild ${U.fmtSec(w.r.tc)}` : '<br>Schwarzschild unbekannt') : ''}</span>
        </button>`).join('');
      $('#mEiSrc').textContent = parseFloat(isoIn) > 0 ? '' : (box ? '(Box Speed)' : '');
      base = { ev100: Math.round(ev100 * 10) / 10, ei, cal, phone: { t: x.t, N: x.N, iso: x.iso, model: x.model }, spot: { x: Math.round(fx * 1000) / 1000, y: Math.round(fy * 1000) / 1000 } };
      pickRow();
    }
    let rows = [], base = null;
    function pickRow() {
      const w = rows.find(r => r.a === ap);
      const btn = $('#mApply');
      result = w && base ? Object.assign({ aperture: w.a, shutter: w.pick || null, t: w.t }, base) : null;
      btn.disabled = !result;
      btn.textContent = result ? `f/${w.a.replace('.', ',')} · ${w.pick ? shTxt(w.pick) : fT(w.t)} übernehmen` : 'In den Frame übernehmen';
    }
    $('#mRes').addEventListener('click', e => {
      const b = e.target.closest('.mrow'); if (!b) return;
      ap = rows[+b.dataset.i].a; U.haptic && U.haptic();
      $('#mRes').querySelectorAll('.mrow').forEach(x => x.classList.toggle('on', x === b));
      pickRow();
    });
    $('#mEi').addEventListener('input', e => { isoIn = e.target.value.replace(',', '.').replace(/[^\d.]/g, ''); ei = curEi(); render(); });
    const step = d => { cal = Math.round((cal + d) * 3) / 3; setCal(cal); render(); };
    $('#mCalM').addEventListener('click', () => step(-1 / 3));
    $('#mCalP').addEventListener('click', () => step(1 / 3));
    $('#mApply').addEventListener('click', () => { if (!result) return; const r = result; close(); opts.onApply && opts.onApply(r); });

    $('#mCalV').textContent = U.fmtStops(cal);
    startLive();
    return { close };
  }

  return { open, getCal, measure, _GREY: GREY };
})();
