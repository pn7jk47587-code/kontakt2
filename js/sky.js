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
    const q = `latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&hourly=temperature_2m,weather_code,cloud_cover&timezone=GMT`;
    const url = ageDays > 6 ? `https://archive-api.open-meteo.com/v1/archive?${q}&start_date=${day}&end_date=${day}` : `https://api.open-meteo.com/v1/forecast?${q}&past_days=7&forecast_days=1`;
    const r = await fetch(url); if (!r.ok) return null;
    const h = (await r.json()).hourly; if (!h) return null;
    const i = h.time.indexOf(utcHour); if (i < 0 || h.weather_code[i] == null) return null;
    return { t: h.temperature_2m[i], code: h.weather_code[i], cloud: h.cloud_cover[i] };
  }
  return { sun, sunText, weather, wxText };
})();
