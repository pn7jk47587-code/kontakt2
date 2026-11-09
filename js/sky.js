/* Sonnenstand und Wetter zum Aufnahmezeitpunkt eines Bildes.
   Sonnenstand: Formeln nach SunCalc (Vladimir Agafonkin, BSD-2-Clause), offline gerechnet.
   Wetter: Open-Meteo (Forecast API für die letzten Tage, Historical Weather API für ältere Bilder), ohne Schlüssel. */
const SKY = (() => {
  const rad = Math.PI / 180, dayMs = 864e5, J1970 = 2440588, J2000 = 2451545, e = rad * 23.4397;
  const toDays = d => d.valueOf() / dayMs - 0.5 + J1970 - J2000;
  const ra = (l, b) => Math.atan2(Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e), Math.cos(l));
  const dec = (l, b) => Math.asin(Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l));
  function sun(date, lat, lng) {
    const d = toDays(date), lw = rad * -lng, phi = rad * lat;
    const M = rad * (357.5291 + 0.98560028 * d);
    const L = M + rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) + rad * 102.9372 + Math.PI;
    const dc = dec(L, 0), H = rad * (280.16 + 360.9856235 * d) - lw - ra(L, 0);
    const alt = Math.asin(Math.sin(phi) * Math.sin(dc) + Math.cos(phi) * Math.cos(dc) * Math.cos(H));
    const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dc) * Math.cos(phi));
    return { alt: alt / rad, az: (az / rad + 180 + 360) % 360 };   // Azimut ab Nord im Uhrzeigersinn
  }
  const DIRS = ['Nord', 'Nordost', 'Ost', 'Südost', 'Süd', 'Südwest', 'West', 'Nordwest'];
  // Lichtphasen nach der unter Fotografen gängigen Abgrenzung über die Sonnenhöhe
  function sunText(date, lat, lng) {
    const s = sun(date, lat, lng), dir = DIRS[Math.round(s.az / 45) % 8], h = Math.round(s.alt);
    const phase = s.alt < -6 ? 'Nacht' : s.alt < -4 ? 'blaue Stunde' : s.alt < 6 ? 'goldene Stunde' : '';
    return s.alt < -6 ? 'Nacht, Sonne unter dem Horizont' : `${h}° ${s.alt < 0 ? 'unter dem Horizont' : 'hoch'}, ${dir}${phase ? ' · ' + phase : ''}`;
  }
  const WMO = { 0: 'klar', 1: 'überwiegend klar', 2: 'teils bewölkt', 3: 'bedeckt', 45: 'Nebel', 48: 'Raureifnebel', 51: 'leichter Niesel', 53: 'Niesel', 55: 'starker Niesel', 56: 'gefrierender Niesel', 57: 'gefrierender Niesel', 61: 'leichter Regen', 63: 'Regen', 65: 'starker Regen', 66: 'gefrierender Regen', 67: 'gefrierender Regen', 71: 'leichter Schnee', 73: 'Schnee', 75: 'starker Schnee', 77: 'Schneegriesel', 80: 'leichte Schauer', 81: 'Schauer', 82: 'heftige Schauer', 85: 'Schneeschauer', 86: 'starke Schneeschauer', 95: 'Gewitter', 96: 'Gewitter mit Hagel', 97: 'starkes Gewitter', 99: 'Gewitter mit Hagel' };
  const wxText = w => w ? [w.t != null ? `${Math.round(w.t)} °C` : '', WMO[w.code] || '', w.cloud != null ? `Wolken ${Math.round(w.cloud)} %` : ''].filter(Boolean).join(' · ') : '';
  async function weather(date, lat, lng) {
    const utcHour = new Date(Math.round(date.valueOf() / 36e5) * 36e5).toISOString().slice(0, 13) + ':00';
    const day = utcHour.slice(0, 10), ageDays = (Date.now() - date.valueOf()) / dayMs;
    if (ageDays < -0.1) return null;
    const q = `latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&hourly=temperature_2m,weather_code,cloud_cover,wind_speed_10m&timezone=GMT`;
    const url = ageDays > 6 ? `https://archive-api.open-meteo.com/v1/archive?${q}&start_date=${day}&end_date=${day}` : `https://api.open-meteo.com/v1/forecast?${q}&past_days=7&forecast_days=1`;
    const r = await fetch(url); if (!r.ok) return null;
    const h = (await r.json()).hourly; if (!h) return null;
    const i = h.time.indexOf(utcHour); if (i < 0 || h.weather_code[i] == null) return null;
    return { t: h.temperature_2m[i], code: h.weather_code[i], cloud: h.cloud_cover[i], wind: h.wind_speed_10m?.[i] ?? null };
  }
  // Wettersymbol: Gewitter, Nebel, Schnee, Regen, Wind (ab 40 km/h), sonst Sonne oder Mond, halb bewölkt oder Wolke
  const P = d => `<path d="${d}"/>`;
  const CLOUD = 'M7 18.5h10a3.5 3.5 0 0 0 .4-7 5 5 0 0 0-9.6-1.3A3.9 3.9 0 0 0 7 18.5z';
  const ICONS = {
    sun: '<circle cx="12" cy="12" r="4"/>' + P('M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4'),
    moon: P('M19.5 14.5A8 8 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10z'),
    sunCloud: P('M8 6.2a3.6 3.6 0 0 1 6.2 1.6M8.5 2.8v1.4M3.6 7.6H5M4.9 4.3l1 1') + P('M8 20h9.5a3.2 3.2 0 0 0 .3-6.4 4.6 4.6 0 0 0-8.8-1.2A3.6 3.6 0 0 0 8 20z'),
    moonCloud: P('M12.6 8.2A4.6 4.6 0 0 1 7 3.6a4.4 4.4 0 1 0 5.6 4.6z') + P('M8 20h9.5a3.2 3.2 0 0 0 .3-6.4 4.6 4.6 0 0 0-8.8-1.2A3.6 3.6 0 0 0 8 20z'),
    cloud: P(CLOUD),
    rain: P('M7 15h10a3.5 3.5 0 0 0 .4-7 5 5 0 0 0-9.6-1.3A3.9 3.9 0 0 0 7 15z') + P('M8.5 18l-1 2.5M12.5 18l-1 2.5M16.5 18l-1 2.5'),
    snow: P('M7 15h10a3.5 3.5 0 0 0 .4-7 5 5 0 0 0-9.6-1.3A3.9 3.9 0 0 0 7 15z') + P('M8.5 18.5h.01M12 20h.01M15.5 18.5h.01'),
    storm: P('M7 15h10a3.5 3.5 0 0 0 .4-7 5 5 0 0 0-9.6-1.3A3.9 3.9 0 0 0 7 15z') + P('M12.5 15l-2 3.5h3l-2 3.5'),
    fog: P('M4 9h16M6 13h12M4 17h16'),
    wind: P('M3 9h11a2.5 2.5 0 1 0-2.5-2.5M3 13h15a2.5 2.5 0 1 1-2.5 2.5M3 17h7')
  };
  function wxKind(w, night) {
    if (!w) return null;
    const c = w.code;
    if (c >= 95) return 'storm';
    if (c === 45 || c === 48) return 'fog';
    if ((c >= 71 && c <= 77) || c === 85 || c === 86) return 'snow';
    if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) return 'rain';
    if (w.wind != null && w.wind >= 40) return 'wind';
    if (c <= 1) return night ? 'moon' : 'sun';
    if (c === 2) return night ? 'moonCloud' : 'sunCloud';
    return 'cloud';
  }
  const wxIcon = (w, night) => { const k = wxKind(w, night); return k ? `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONS[k]}</svg>` : ''; };
  const wxShort = w => w ? [w.t != null ? `${Math.round(w.t)} °C` : '', WMO[w.code] || '', w.wind != null && w.wind >= 20 ? `Wind ${Math.round(w.wind)} km/h` : ''].filter(Boolean).join(' · ') : '';
  return { sun, sunText, weather, wxText, wxIcon, wxShort, wxKind };
})();
