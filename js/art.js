// Generische Illustrationen für Filme und Kameras (keine Nachbildung realer Produkte, keine Marken).
const ART = (() => {
  const TYPE_COL = {
    sw: ['#2a2f2d', '#d9d6cf', '#8c918d'],
    'sw-c41': ['#3a3f3c', '#e3ddd0', '#b07a4a'],
    farbneg: ['#7a4a2a', '#f0c27a', '#c8643a'],
    dia: ['#1f5f5a', '#bfe6dc', '#2fc4ad'],
    sonst: ['#3c3a44', '#d6c3a1', '#8a7fa8'],
    'sw-umkehr': ['#2a2f2d', '#e9e6df', '#6f7a8a'],
    ir: ['#2a0e14', '#f1d3d8', '#9b1d32']
  };

  // Filmdose mit Farbband nach Filmtyp und großer ISO-Zahl
  function film(stock, size = 120) {
    const [dark, light, accent] = TYPE_COL[stock?.type] || TYPE_COL.sonst;
    const iso = stock?.isoLabel || (stock?.boxIso ?? '?');
    const fs = String(iso).length > 4 ? 9.5 : 17;
    const id = 'g' + Math.random().toString(36).slice(2, 7);
    return `<svg viewBox="0 0 120 120" width="${size}" height="${size}" role="img" aria-label="Filmdose ISO ${iso}">
      <defs>
        <linearGradient id="${id}m" x1="0" x2="1"><stop offset="0" stop-color="#6d736f"/><stop offset=".45" stop-color="#e6e8e4"/><stop offset="1" stop-color="#4c524e"/></linearGradient>
        <linearGradient id="${id}b" x1="0" x2="1"><stop offset="0" stop-color="${dark}"/><stop offset=".5" stop-color="${accent}"/><stop offset="1" stop-color="${dark}"/></linearGradient>
      </defs>
      <rect x="44" y="6" width="16" height="10" rx="2" fill="url(#${id}m)"/>
      <rect x="30" y="14" width="44" height="8" rx="3" fill="url(#${id}m)"/>
      <rect x="32" y="21" width="40" height="78" fill="url(#${id}b)"/>
      <rect x="32" y="44" width="40" height="30" fill="${light}" opacity=".92"/>
      <text x="52" y="66" text-anchor="middle" font-family="-apple-system,system-ui,sans-serif" font-size="${fs}" font-weight="800" fill="${dark}">${iso}</text>
      <rect x="30" y="98" width="44" height="8" rx="3" fill="url(#${id}m)"/>
      <path d="M72 30 h26 q6 0 6 6 v10 q0 4 -4 4 h-28 z" fill="#1d1f1e"/>
      <path d="M72 34 h24" stroke="#3a3d3b" stroke-width="2" stroke-dasharray="3 3"/>
    </svg>`;
  }

  // Kameras: mf = Mittelformat-Würfel mit Lichtschacht, slr = Kleinbild-Spiegelreflex, compact = Sucherkamera
  function camera(cam, size = 140) {
    const a = cam?.art || { kind: 'slr', body: 'black' };
    const id = 'c' + Math.random().toString(36).slice(2, 7);
    const chrome = `<linearGradient id="${id}ch" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2f3f1"/><stop offset=".5" stop-color="#a9adab"/><stop offset="1" stop-color="#d9dcda"/></linearGradient>`;
    const glass = `<radialGradient id="${id}gl" cx=".38" cy=".35" r=".7"><stop offset="0" stop-color="#7fd6c8"/><stop offset=".35" stop-color="#1c4b5a"/><stop offset="1" stop-color="#05090b"/></radialGradient>`;
    let body = '';
    if (a.kind === 'mf') {
      body = `
        <rect x="44" y="22" width="60" height="12" rx="2" fill="#1a1b1b"/>
        <path d="M46 22 l6 -12 h44 l6 12 z" fill="#232524"/>
        <rect x="40" y="34" width="68" height="64" rx="3" fill="url(#${id}ch)"/>
        <rect x="46" y="40" width="56" height="52" rx="2" fill="#1b1c1c"/>
        <rect x="104" y="40" width="14" height="52" rx="2" fill="url(#${id}ch)"/>
        <circle cx="118" cy="60" r="6" fill="#2a2c2b"/><circle cx="118" cy="60" r="2.5" fill="url(#${id}ch)"/>
        <rect x="22" y="44" width="20" height="44" rx="3" fill="#121313" stroke="#5f6562" stroke-width="1.2"/>
        <circle cx="74" cy="66" r="24" fill="url(#${id}ch)"/>
        <circle cx="74" cy="66" r="19" fill="#151616"/>
        <circle cx="74" cy="66" r="13" fill="url(#${id}gl)"/>
        <path d="M58 52 a22 22 0 0 1 32 0" stroke="#e7e2d6" stroke-width="1" fill="none" opacity=".5"/>`;
    } else if (a.kind === 'compact') {
      const c = a.color || '#7b5aa6';
      body = `
        <defs><linearGradient id="${id}p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".85"/><stop offset="1" stop-color="${c}"/></linearGradient></defs>
        <rect x="14" y="38" width="112" height="56" rx="16" fill="url(#${id}p)"/>
        <rect x="14" y="38" width="112" height="14" rx="10" fill="#ffffff" opacity=".12"/>
        <rect x="94" y="45" width="22" height="12" rx="3" fill="#f6f3ea" opacity=".85"/>
        <rect x="24" y="46" width="16" height="10" rx="2" fill="#0c0d0d"/>
        <circle cx="70" cy="70" r="17" fill="#1d1a22"/>
        <circle cx="70" cy="70" r="12" fill="url(#${id}gl)"/>
        <rect x="98" y="32" width="18" height="7" rx="3" fill="#2a2430"/>`;
    } else {
      const top = a.body === 'black' ? '#1f2120' : `url(#${id}ch)`;
      const edge = 'stroke="#5f6562" stroke-width="1.2"';
      body = `
        <path d="M52 34 l8 -16 h20 l8 16 z" fill="${top}" ${edge}/>
        <rect x="16" y="34" width="108" height="16" rx="3" fill="${top}" ${edge}/>
        <rect x="16" y="48" width="108" height="42" rx="3" fill="#191a1a" ${edge}/>
        <path d="M58 22 h24" stroke="#8a908c" stroke-width="1" opacity=".7"/>
        <rect x="16" y="48" width="108" height="3" fill="${a.body === 'black' ? '#2c2f2d' : '#8f9391'}"/>
        <circle cx="34" cy="30" r="6" fill="${top}" ${edge}/><circle cx="104" cy="31" r="7" fill="${top}" ${edge}/>
        <rect x="100" y="24" width="8" height="3" fill="#0d0e0e"/>
        <circle cx="70" cy="72" r="24" fill="#242625" stroke="#6a706c" stroke-width="1.2"/>
        <circle cx="70" cy="72" r="20" fill="#2f3231" stroke="#5d625f" stroke-dasharray="1.5 2.5" stroke-width="2"/>
        <circle cx="70" cy="72" r="13" fill="url(#${id}gl)"/>`;
    }
    return `<svg viewBox="0 0 140 110" width="${size}" height="${Math.round(size * 110 / 140)}" role="img" aria-label="Kamera"><defs>${chrome}${glass}</defs>${body}</svg>`;
  }

  // Symbol Doppelbelichtung
  // Doppelbelichtung wie auf Kameras: zwei versetzt übereinanderliegende Rechtecke
  const double = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="3" y="3" width="12.5" height="12.5" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="8.5" y="8.5" width="12.5" height="12.5" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>`;
  const up = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 19V6M6 11.5 12 5.5l6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const check = `<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M5 12.5 10 17.5 19.5 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const x = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  // Glitzersterne für Favoriten
  const sparkle = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path class="s1" d="M10 2 L11.6 8.4 L18 10 L11.6 11.6 L10 18 L8.4 11.6 L2 10 L8.4 8.4 Z"/><path class="s2" d="M18.5 13 L19.3 16.2 L22.5 17 L19.3 17.8 L18.5 21 L17.7 17.8 L14.5 17 L17.7 16.2 Z"/><path class="s3" d="M19 1.5 L19.5 3.5 L21.5 4 L19.5 4.5 L19 6.5 L18.5 4.5 L16.5 4 L18.5 3.5 Z"/></svg>`;

  // Pfeil für „Film entwickeln“
  const arrow = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M5 12h12M12 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  // Abgeholt: Fotos hochladen
  const pickup = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 15V4M7.5 8.5 12 4l4.5 4.5" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 14v4.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V14" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/></svg>`;
  // Fotoalbum
  const album = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M5 4.5h11.5A2.5 2.5 0 0 1 19 7v12.5H7.5A2.5 2.5 0 0 1 5 17z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><path d="M5 17a2.5 2.5 0 0 1 2.5-2.5H19" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M9 8.5h6M9 11h4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`;

  // Objektiv in Seitenansicht. Die Form zeigt die Art (Weitwinkel kurz und breit, Normal kurz, Tele lang, Zoom lang mit Ringen),
  // die Zahl auf dem Tubus die Brennweite.
  function lens(l, size = 72) {
    const kind = l?.kind || 'normal';
    const id = 'l' + Math.random().toString(36).slice(2, 7);
    const len = { wide: 34, normal: 40, tele: 66, zoom: 74 }[kind] || 40;
    const front = { wide: 30, normal: 24, tele: 26, zoom: 28 }[kind] || 24;
    const back = 22;
    const x0 = 14, x1 = x0 + len, cy = 32;
    const label = String(l?.focal || '?').replace(/\s*mm$/i, '');
    const fs = label.length > 5 ? 9 : label.length > 3 ? 10.5 : 13;
    const rings = kind === 'zoom'
      ? [0.38, 0.5, 0.62].map(t => `<rect x="${x0 + len * t}" y="${cy - front + 3}" width="3" height="${front * 2 - 6}" fill="#3b3f3d"/>`).join('')
      : `<rect x="${x0 + len * 0.62}" y="${cy - front + 3}" width="${len * 0.18}" height="${front * 2 - 6}" fill="url(#${id}g)" opacity=".9"/>`;
    const w = x1 + 10;
    return `<svg viewBox="0 0 ${w} 64" width="${Math.round(size * w / 88)}" height="${Math.round(size * 64 / 88)}" role="img" aria-label="${l ? U.esc(l.focal || '') + ' mm' : 'Objektiv'}">
      <defs>
        <linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a4f4c"/><stop offset=".45" stop-color="#1c1e1d"/><stop offset="1" stop-color="#2c2f2d"/></linearGradient>
        <pattern id="${id}g" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="1.5" height="3" fill="#5c625e"/></pattern>
        <radialGradient id="${id}gl" cx=".35" cy=".35" r=".8"><stop offset="0" stop-color="#9ae3d6"/><stop offset=".5" stop-color="#2a5b6c"/><stop offset="1" stop-color="#0b1216"/></radialGradient>
      </defs>
      <rect x="4" y="${cy - back - 2}" width="12" height="${(back + 2) * 2}" rx="2" fill="#b9bdbb"/>
      <path d="M${x0} ${cy - back} L${x1} ${cy - front} L${x1} ${cy + front} L${x0} ${cy + back} Z" fill="url(#${id}b)"/>
      ${rings}
      <rect x="${x1 - 2}" y="${cy - front - 1}" width="6" height="${(front + 1) * 2}" rx="2" fill="#151716"/>
      <ellipse cx="${x1 + 4}" cy="${cy}" rx="4" ry="${front - 4}" fill="url(#${id}gl)"/>
      <text x="${x0 + len * 0.32}" y="${cy + fs * 0.36}" text-anchor="middle" font-family="-apple-system,system-ui,sans-serif" font-size="${fs}" font-weight="800" fill="#f2efe8">${U.esc(label)}</text>
    </svg>`;
  }

  // Schrank-Symbol
  const cabinet = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M12 3v18M10 11v2M14 11v2"/></g></svg>`;

  // Kleine Symbole für die Einstellungen
  const ic = d => `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const menu = ic('<path d="M4 7h16M4 12h16M4 17h16"/>');
  const sun = ic('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>');
  const tank = ic('<path d="M7 6h10v13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z"/><path d="M6 3.5h12v2.5H6zM10 10h4M10 14h4"/>');
  const filmIc = ic('<rect x="4" y="5" width="13" height="15" rx="2"/><path d="M17 8h3v9h-3M7 8v1M7 12v1M7 16v1"/>');
  const meter = ic('<rect x="5" y="3" width="14" height="18" rx="3"/><circle cx="12" cy="10" r="3.5"/><path d="M12 10l2-2M9 17h6"/>');
  const moon = ic('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/><path d="M16.5 3.5v2M15.5 4.5h2"/>');
  const save = ic('<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>');
  return { film, camera, double, sparkle, arrow, pickup, album, lens, cabinet, up, check, x, menu, sun, tank, filmIc, meter, save, moon };
})();
