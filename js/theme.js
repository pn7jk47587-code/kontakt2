// Licht der App: tagsüber Sonne, nach Sonnenuntergang Mondschein.
// Sonnenzeiten grob für die Mitte Deutschlands (51° N, 10° O) nach der üblichen Sonnenstands-Näherung.
const MOOD = (() => {
  const KEY = 'kb-mood';
  const LAT = 51, LON = 10;

  function sunTimes(date) {
    const rad = Math.PI / 180;
    const start = new Date(date.getFullYear(), 0, 0);
    const day = Math.floor((date - start) / 86400000);
    const decl = 23.44 * rad * Math.sin(rad * (360 / 365) * (day - 81));
    const cosH = (Math.sin(-0.833 * rad) - Math.sin(LAT * rad) * Math.sin(decl)) / (Math.cos(LAT * rad) * Math.cos(decl));
    const H = Math.acos(Math.max(-1, Math.min(1, cosH))) / rad; // Grad
    const B = rad * (360 / 365) * (day - 81);
    const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B); // Minuten
    const noonUtc = 720 - 4 * LON - eot; // Minuten nach Mitternacht UTC
    const offset = -date.getTimezoneOffset();
    return { rise: noonUtc - 4 * H + offset, set: noonUtc + 4 * H + offset };
  }

  function pref() { try { return localStorage.getItem(KEY) || 'auto'; } catch (_) { return 'auto'; } }

  // Simulierte Uhrzeit (Stunden als Dezimalzahl), nur zum Ausprobieren
  function clock() { try { const v = localStorage.getItem('kb-clock'); return v === null ? null : parseFloat(v); } catch (_) { return null; } }
  function setClock(h) { try { h === null ? localStorage.removeItem('kb-clock') : localStorage.setItem('kb-clock', String(h)); } catch (_) {} apply(); if (window.BEAM) BEAM.update(); }
  function current() {
    const p = pref();
    if (p === 'sun' || p === 'moon') return p;
    const d = new Date();
    const sim = clock();
    const m = sim !== null && !isNaN(sim) ? sim * 60 : d.getHours() * 60 + d.getMinutes();
    const t = sunTimes(d);
    return (m >= t.rise && m < t.set) ? 'sun' : 'moon';
  }

  function apply() {
    const m = current();
    document.documentElement.dataset.mood = m;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', m === 'sun' ? '#fbfaf6' : '#090e1d');
  }

  function set(p) { try { localStorage.setItem(KEY, p); } catch (_) {} apply(); }

  apply();
  setInterval(apply, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) apply(); });
  return { pref, set, current, sunTimes, clock, setClock };
})();
