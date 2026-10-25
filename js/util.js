const U = {
  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },
  esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
  fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString((typeof I18N !== 'undefined' ? I18N.locale() : 'de-DE'), { day: '2-digit', month: '2-digit', year: 'numeric' });
  },
  today() {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  },

  // Datei oder Blob als data:-URL lesen (funktioniert auch dort, wo blob:-Adressen gesperrt sind)
  fileToDataUrl(blob) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = () => rej(r.error);
      r.readAsDataURL(blob);
    });
  },

  // Bild dekodieren ohne blob:-Adresse: zuerst createImageBitmap, sonst über data:-URL
  async decode(file) {
    if (window.createImageBitmap) {
      try { const b = await createImageBitmap(file, { imageOrientation: 'from-image' }); return { src: b, w: b.width, h: b.height }; }
      catch (_) { /* weiter mit Fallback */ }
    }
    const url = await U.fileToDataUrl(file);
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error('Bild konnte nicht gelesen werden'));
      i.src = url;
    });
    return { src: img, w: img.naturalWidth, h: img.naturalHeight };
  },

  // Bild verkleinern und als JPEG-Blob speichern. Hält die Datenmenge im Browser klein.
  async resize(file, maxSide, quality = 0.85, decoded) {
    const d = decoded || await U.decode(file);
    const scale = Math.min(1, maxSide / Math.max(d.w, d.h));
    const w = Math.round(d.w * scale), h = Math.round(d.h * scale);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(d.src, 0, 0, w, h);
    const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', quality));
    return { blob, w, h };
  },

  // Speichert Original (verkleinert auf max. 2400 px) und Vorschaubild.
  async storeImage(file, kind) {
    const decoded = await U.decode(file);
    const full = await U.resize(file, 2400, 0.86, decoded);
    const thumb = await U.resize(file, 480, 0.78, decoded);
    if (decoded.src.close) decoded.src.close();
    let exif = {};
    try {
      const e = await exifr.parse(file, { gps: true, tiff: true, exif: true });
      if (e) {
        exif = {
          lat: typeof e.latitude === 'number' ? e.latitude : null,
          lng: typeof e.longitude === 'number' ? e.longitude : null,
          taken: e.DateTimeOriginal ? new Date(e.DateTimeOriginal).toISOString() : null,
          make: e.Make || null, model: e.Model || null
        };
      }
    } catch (_) { /* kein EXIF, z. B. bei Scans */ }
    const rec = {
      id: U.uid(), kind, data: await full.blob.arrayBuffer(), tdata: await thumb.blob.arrayBuffer(), type: 'image/jpeg', w: full.w, h: full.h,
      name: file.name || '', exif, addedAt: new Date().toISOString()
    };
    await DB.put('images', rec);
    return rec;
  },

  _urls: new Map(),
  // Prüft einmal, ob blob:-Adressen als Bildquelle erlaubt sind (in der claude.ai-Vorschau sind sie es nicht)
  _blobOk: null,
  blobImagesOk() {
    if (U._blobOk) return U._blobOk;
    U._blobOk = new Promise(res => {
      const c = document.createElement('canvas'); c.width = c.height = 1;
      c.toBlob(b => {
        if (!b) return res(false);
        const u = URL.createObjectURL(b);
        const i = new Image();
        const t = setTimeout(() => res(false), 1500);
        i.onload = () => { clearTimeout(t); URL.revokeObjectURL(u); res(true); };
        i.onerror = () => { clearTimeout(t); URL.revokeObjectURL(u); res(false); };
        i.src = u;
      }, 'image/png');
    });
    return U._blobOk;
  },
  async imgUrl(id, thumb = false) {
    if (!id) return null;
    const key = id + (thumb ? ':t' : '');
    if (U._urls.has(key)) return U._urls.get(key);
    const rec = await DB.get('images', id);
    if (!rec) return null;
    const blob = U.recBlob(rec, thumb);
    const u = (await U.blobImagesOk()) ? URL.createObjectURL(blob) : await U.fileToDataUrl(blob);
    U._urls.set(key, u);
    return u;
  },
  // Bilddaten eines Eintrags als Blob (neue Einträge: ArrayBuffer, ältere: Blob)
  recBlob(rec, thumb = false) {
    const v = thumb ? (rec.tdata || rec.thumb) : (rec.data || rec.blob);
    if (!v) return null;
    return v instanceof Blob ? v : new Blob([v], { type: rec.type || 'image/jpeg' });
  },
  forgetImg(id) {
    for (const k of [id, id + ':t']) {
      if (U._urls.has(k)) { const u = U._urls.get(k); if (u.startsWith('blob:')) URL.revokeObjectURL(u); U._urls.delete(k); }
    }
  },

  // Schwarzschild-/Reciprocity-Korrektur: gemessene Zeit → korrigierte Zeit (Sekunden)
  reciprocity(stock, tm) {
    const r = stock && stock.reciprocity;
    if (!r || !(tm > 0)) return { ok: false, msg: 'Keine Angaben hinterlegt' };
    if (r.model === 'power') {
      if (tm <= (r.threshold || 1)) return { ok: true, tc: tm, note: 'Bis 1 s keine Korrektur (Herstellerangabe)' };
      return { ok: true, tc: Math.pow(tm, r.p), note: `Tc = Tm^${r.p} (Herstellerformel)` };
    }
    if (r.model === 'table') {
      const pts = r.points;
      if (tm <= pts[0][0]) return { ok: true, tc: tm, note: 'Im Bereich ohne Korrektur' };
      let i = pts.findIndex(p => p[0] >= tm);
      let extrap = false;
      if (i === -1) { i = pts.length - 1; extrap = true; }
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      const k = (Math.log(y1) - Math.log(y0)) / (Math.log(x1) - Math.log(x0));
      const tc = Math.exp(Math.log(y0) + k * (Math.log(tm) - Math.log(x0)));
      return {
        ok: true, tc,
        note: extrap
          ? 'Außerhalb der Herstellertabelle hochgerechnet, nur Anhaltspunkt'
          : 'Zwischen Tabellenwerten logarithmisch interpoliert'
      };
    }
    if (r.model === 'none') {
      if (tm <= r.upTo) return { ok: true, tc: tm, note: `Bis ${r.upTo} s keine Korrektur (Herstellerangabe)` };
      return { ok: false, msg: `Für Zeiten über ${r.upTo} s nennt der Hersteller keine Werte. Testbelichtungen nötig.` };
    }
    if (r.model === 'custom' && r.p) {
      if (tm <= 1) return { ok: true, tc: tm, note: 'Bis 1 s keine Korrektur angenommen' };
      return { ok: true, tc: Math.pow(tm, r.p), note: `Eigener Faktor Tc = Tm^${r.p}` };
    }
    return { ok: false, msg: 'Für diesen Film sind keine geprüften Werte hinterlegt' };
  },

  fmtSec(s) {
    if (s < 1) return '1/' + Math.round(1 / s) + ' s';
    if (s < 60) return (Math.round(s * 10) / 10).toLocaleString((typeof I18N !== 'undefined' ? I18N.locale() : 'de-DE')) + ' s';
    const m = Math.floor(s / 60), r = Math.round(s % 60);
    return `${m} min ${r} s`;
  },

  // "1/125", "2", "30s", "1m30" → Sekunden
  parseShutter(str) {
    if (!str) return NaN;
    const s = String(str).trim().replace(',', '.').replace(/\s*s$/, '');
    let m;
    if ((m = s.match(/^1\/(\d+(\.\d+)?)$/))) return 1 / parseFloat(m[1]);
    if ((m = s.match(/^(\d+)\s*m(?:in)?\s*(\d+)?$/))) return parseInt(m[1]) * 60 + (parseInt(m[2]) || 0);
    return parseFloat(s);
  },

  toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.hidden = false;
    t.classList.remove('pop'); void t.offsetWidth; t.classList.add('pop');
    clearTimeout(U._tt);
    U._tt = setTimeout(() => { t.hidden = true; }, 2600);
  },

  stockLabel(st) {
    return st ? `${st.maker} ${st.name}` : 'Unbekannter Film';
  }
};

/* ---------- Belichtungsspielraum ---------- */
// Lichtwertskala nach ANSI PH2.7-1973/1986, Tabelle 2 (ISO 100), zitiert nach Wikipedia „Exposure value“
const EV_SCENES = [
  ['Sonne, klarer bis leicht dunstiger Himmel', 15, 15],
  ['Heller Sand oder Schnee in der Sonne', 16, 16],
  ['Kurz nach Sonnenuntergang, Skyline', 9, 11],
  ['Helle Straßenszenen', 8, 8],
  ['Straße nachts, Schaufenster', 7, 8],
  ['Bühne, Sportveranstaltung', 8, 9],
  ['Wohnräume mit Kunstlicht', 5, 7],
  ['Angestrahlte Gebäude, Denkmäler, Brunnen', 3, 5]
];
const EV_SOURCE = {
  label: 'ANSI PH2.7-1973/1986, Tabelle 2, nach Wikipedia „Exposure value“',
  url: 'https://en.wikipedia.org/wiki/Exposure_value'
};
const LAB_LATITUDE_NOTE = {
  text: 'Ein Labortest von Carmencita Film Lab mit Portra 400 und Fuji 400H (Sichtprüfung der Scans, keine Dichtemessung) fand bei Farbnegativ etwa 2 bis 3 Blenden Spielraum nach unten und bis zu 6 nach oben. Das ist eine Einzelquelle, keine Herstellerangabe.',
  url: 'https://carmencitafilmlab.com/?p=4700'
};

Object.assign(U, {
  // Lichtwert der Kamera-Einstellung (bezogen auf die eingestellte Zeit)
  evOf(N, t) { return Math.log2((N * N) / t); },

  // Welche gemessene Zeit entspricht die tatsächliche Zeit t wegen Schwarzschild? (Umkehrung)
  effectiveTime(stock, t) {
    if (!(t > 1)) return { t, ok: true };
    const test = U.reciprocity(stock, 2);
    if (!test.ok) return { t, ok: false };
    let lo = 1, hi = t;
    for (let i = 0; i < 60; i++) {
      const mid = Math.sqrt(lo * hi);
      const r = U.reciprocity(stock, mid);
      if (!r.ok) return { t, ok: false };
      if (r.tc > t) hi = mid; else lo = mid;
    }
    return { t: Math.sqrt(lo * hi), ok: true };
  },

  parseAperture(str) {
    const s = String(str || '').trim().replace(',', '.').replace(/^f\/?/i, '');
    return parseFloat(s);
  },

  // Abweichung in Blenden: positiv = Überbelichtung
  latitude({ stock, ei, N, t, evNeedLo, evNeedHi }) {
    const eff = U.effectiveTime(stock, t);
    const evSet = U.evOf(N, eff.t);
    const shift = Math.log2(ei / 100);
    const devLo = (evNeedLo + shift) - evSet;
    const devHi = (evNeedHi + shift) - evSet;
    const evMid = (evNeedLo + evNeedHi) / 2 + shift;
    const tIdeal = (N * N) / Math.pow(2, evMid);
    const corr = U.reciprocity(stock, tIdeal);
    return {
      devMin: Math.min(devLo, devHi), devMax: Math.max(devLo, devHi),
      recipApplied: t > 1 && eff.ok, recipUnknown: t > 1 && !eff.ok, tEffective: eff.t,
      tIdeal, tIdealCorrected: corr.ok ? corr.tc : null
    };
  },

  fmtStops(x) {
    const r = Math.round(x * 10) / 10;
    return (r > 0 ? '+' : '') + r.toLocaleString((typeof I18N !== 'undefined' ? I18N.locale() : 'de-DE'), { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }
});

// Kurzes haptisches Signal. Android: Vibration API. iOS Safari kennt die Vibration API nicht;
// ab iOS 18 gibt das Umschalten eines Schalters (input type=checkbox switch) ein haptisches Signal.
U.haptic = function (pattern = 18) {
  try { if (navigator.vibrate) { navigator.vibrate(pattern); return; } } catch (_) {}
  try {
    let l = document.getElementById('hapticSw');
    if (!l) {
      l = document.createElement('label'); l.id = 'hapticSw'; l.setAttribute('aria-hidden', 'true');
      l.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none';
      l.innerHTML = '<input type="checkbox" switch>';
      document.body.appendChild(l);
    }
    l.click();
  } catch (_) {}
};

// Hinweis, wenn eine Suche nichts findet (steht direkt hinter der Liste)
U.emptyHint = function (list, show, html) {
  let p = list.nextElementSibling;
  if (!p || !p.classList.contains('ups')) { p = document.createElement('p'); p.className = 'ups'; list.after(p); }
  p.innerHTML = html; p.hidden = !show;
};
const UPS_FILM = 'Ups, der Film ist hier noch nicht gespeichert. <a href="#/film/neu">Film anlegen</a>';
