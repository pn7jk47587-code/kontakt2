// Startbibliothek der Filme. Nur Werte mit Quelle sind vorbelegt.
// Felder "Community-ISO" und "eigene Präferenz" bleiben leer und werden von dir gefüllt.
const SRC_ILFORD = {
  label: 'HARMAN/Ilford, Technical Information „Film Reciprocity Failure Compensation“, Dez. 2023',
  url: 'https://ilfordphoto.com/amfile/file/download/file/1964/product/695'
};
const SRC_KODAK_E31 = {
  label: 'Kodak, E-31 „Reciprocity and Special Filter Data“, Juli 2002',
  url: 'https://cyberphoto.se/storage/C0254BB2DFD47BB7DDA9286256ACEF3E997E98C198A401C96283EB306112A972/b21c65bff8d846ad9d061cd1bcbf6adb/pdf/media/c160c5da59fe4ecea361a56f50c24052/Kodak_Reciprocity.pdf'
};
const SRC_TMAX100 = {
  label: 'Kodak Alaris, F-4016 T-MAX 100, Feb. 2016',
  url: 'https://mail.kennethleegallery.com/pdf/TMax100.pdf'
};
const SRC_PORTRA400 = {
  label: 'Kodak Alaris, E-4050 PORTRA 400, Jan. 2025',
  url: 'https://www.freestylephoto.com/static/pdf/product_pdf/kodak/e4050_Kodak_Portra_400.pdf'
};

const SRC_PHOENIX = {
  label: 'HARMAN, Technical Information Phoenix 200, 7. Sep. 2024',
  url: 'https://www.macodirect.de/media/pdf/ba/db/a1/HP2001_Datenblatt_d.pdf'
};
const SRC_PHOENIX2 = {
  label: 'HARMAN, Phoenix II Data Sheet, 5. Juli 2025',
  url: 'https://firstcall-photographic.co.uk/cdn/shop/files/Harman_Phoenix_II_Data_Sheet.pdf'
};

const ILFORD_NOTE = 'Laut Hersteller: bis 1 s keine Korrektur. Bei langen Belichtungen kann der Kontrast steigen, dann ggf. Entwicklung verkürzen. Bei sehr langen Zeiten ist Probieren nötig.';

function ilford(id, name, iso, p) {
  return {
    id, maker: 'Ilford', name, type: 'sw', process: 'SW', boxIso: iso,
    reciprocity: { model: 'power', p, threshold: 1, source: SRC_ILFORD },
    nightNotes: ILFORD_NOTE, builtin: true
  };
}

const SEED_STOCKS = [
  ilford('ilford-hp5', 'HP5 Plus', 400, 1.31),
  ilford('ilford-fp4', 'FP4 Plus', 125, 1.26),
  ilford('ilford-delta100', 'Delta 100', 100, 1.26),
  ilford('ilford-delta400', 'Delta 400', 400, 1.41),
  ilford('ilford-panf', 'Pan F Plus', 50, 1.33),
  Object.assign(ilford('ilford-xp2', 'XP2 Super', 400, 1.31), { process: 'C-41', type: 'sw-c41' }),
  Object.assign(ilford('kentmere-100', 'Pan 100', 100, 1.26), { maker: 'Kentmere' }),
  Object.assign(ilford('kentmere-400', 'Pan 400', 400, 1.30), { maker: 'Kentmere' }),
  ilford('ilford-delta3200', 'Delta 3200', 3200, 1.33),
  ilford('ilford-sfx200', 'SFX 200', 200, 1.43),
  Object.assign(ilford('kentmere-200', 'Pan 200', 200, 1.26), { maker: 'Kentmere', formats: ['135', '120'],
    reciprocity: { model: 'power', p: 1.26, threshold: 1, source: { label: 'Harman, Kentmere Pan 200 Data Sheet, März 2025', url: 'https://firstcall-photographic.co.uk/cdn/shop/files/Kentmere_Pan_200_B_W_Film_Data_Sheet.pdf' } } }),
  {
    id: 'harman-phoenix200', maker: 'Harman', name: 'Phoenix 200', type: 'farbneg', process: 'C-41', boxIso: 200,
    reciprocity: { model: 'power', p: 1.31, threshold: 1, source: SRC_PHOENIX },
    makerNote: 'Hersteller: gute Ergebnisse bei EI 100 bis 200, Belichtungsreihen empfohlen, vor allem bei hellen Szenen und schwierigem Licht. Negative kontrastreicher als die meisten Farbfilme. Pushen nicht empfohlen.',
    nightNotes: 'Datenblatt: bis 1 s keine Korrektur, darüber Ta = Tm^1,31.',
    datasheet: SRC_PHOENIX.url, builtin: true
  },
  {
    id: 'harman-phoenix2', maker: 'Harman', name: 'Phoenix II 200', type: 'farbneg', process: 'C-41', boxIso: 200,
    reciprocity: { model: 'power', p: 1.31, threshold: 1, source: SRC_PHOENIX2 },
    makerNote: 'Hersteller: bestes Ergebnis bei EI 100 bis 200 je nach Helligkeit und Kontrast, anfangs Belichtungsreihen. Laut Datenblatt mehr Belichtungsspielraum als Phoenix 200 (ohne Zahlenangabe).',
    nightNotes: 'Datenblatt: bis 1 s keine Korrektur, darüber Ta = Tm^1,31.',
    datasheet: SRC_PHOENIX2.url, builtin: true
  },
  {
    id: 'kodak-trix', maker: 'Kodak', name: 'Tri-X 400', type: 'sw', process: 'SW', boxIso: 400,
    reciprocity: { model: 'table', points: [[0.1, 0.1], [1, 2], [10, 50], [100, 1200]], source: SRC_KODAK_E31 },
    nightNotes: 'Kodak-Tabelle: 1 s → 2 s, 10 s → 50 s, 100 s → 1200 s. Kodak empfiehlt dazu kürzere Entwicklung (−10 %, −20 %, −30 %).',
    builtin: true
  },
  {
    id: 'kodak-tmax100', maker: 'Kodak', name: 'T-Max 100', type: 'sw', process: 'SW', boxIso: 100,
    reciprocity: { model: 'table', points: [[0.1, 0.1], [1, 1.26], [10, 15], [100, 200]], source: SRC_TMAX100 },
    nightNotes: 'Datenblatt: 1 s +⅓ Blende (als Zeit umgerechnet ≈1,26 s), 10 s → 15 s, 100 s → 200 s.',
    builtin: true
  },
  {
    id: 'kodak-portra400', maker: 'Kodak', name: 'Portra 400', type: 'farbneg', process: 'C-41', boxIso: 400,
    reciprocity: { model: 'none', upTo: 1, source: SRC_PORTRA400 },
    nightNotes: 'Datenblatt: keine Korrektur von 1/10.000 s bis 1 s. Für längere Zeiten nennt Kodak keine Tabelle und rät zu Testbelichtungen.',
    builtin: true
  },
  ...[
    ['kodak-portra160', 'Kodak', 'Portra 160', 160],
    ['kodak-ektar100', 'Kodak', 'Ektar 100', 100],
    ['kodak-gold200', 'Kodak', 'Gold 200', 200],
    ['kodak-ultramax400', 'Kodak', 'UltraMax 400', 400]
  ].map(([id, maker, name, iso]) => ({
    id, maker, name, type: 'farbneg', process: 'C-41', boxIso: iso,
    reciprocity: { model: 'unknown' },
    nightNotes: '', builtin: true
  }))
];

// Startkameras. Bilder sind generische Illustrationen, eigenes Foto kann hochgeladen werden.
const SEED_CAMERAS = [
  { id: 'cam-hasselblad-500cm', maker: 'Hasselblad', name: '500C', format: '120', frames: 12, frameSize: '6×6', mount: 'Hasselblad V', art: { kind: 'mf' } },
  { id: 'cam-nikon-f3', maker: 'Nikon', name: 'F3', format: '135', mount: 'Nikon F', art: { kind: 'slr', body: 'black' } },
  { id: 'cam-minolta-xg1', maker: 'Minolta', name: 'XG-1', format: '135', mount: 'Minolta SR (MC/MD)', art: { kind: 'slr', body: 'chrome' } },
  { id: 'cam-praktica-l2', maker: 'Praktica', name: 'L2', format: '135', mount: 'M42', art: { kind: 'slr', body: 'chrome' } },
  { id: 'cam-superheadz-olivesan', maker: 'Superheadz', name: 'Olive San', format: '135', mount: 'Fest verbaut', art: { kind: 'compact', color: '#9b6fd0' } }
];

/* ---------- Ergänzung Oktober 2026 ---------- */
const SRC_FOMA = {
  label: 'FOMA BOHEMIA, Katalog Schwarzweißmaterialien (Schwarzschild-Tabelle, Faktoren bei 1 s, 10 s, 100 s)',
  url: 'https://foma.cz/en/catalogue_bw_photo_materials_and_developing_information'
};
const SRC_ROLLEI_IR = {
  label: 'Rollei, Infrared Data Sheet R210701 (2021)',
  url: 'https://www.rolleianalog.com/wp-content/uploads/2021/07/INFRARED_Data-Sheet_EN_R210701.pdf'
};
const SRC_CINESTILL = {
  label: 'CineStill, Hilfeseite zu Reciprocity: kein Datenblatt, nur allgemeine Faustformel Tm^1,3',
  url: 'https://help.cinestillfilm.com/hc/en-us/articles/4407453578893-What-are-the-reciprocity-failure-details-for-CineStill-films'
};
const SRC_CINESTILL_PRIMER = 'https://cinestill.film/blogs/news/cinestill-film-stock-primer';
const SRC_OPTIK = 'https://www.optik-oldschool.com/products/opticolour-200';
const SRC_LOMO_LIST = 'https://bluemooncamera.com/shop/category/48/lomography-film?manufacturers=8';

function foma(id, name, iso, f1, f10, f100, extra = {}) {
  return Object.assign({
    id, maker: 'Foma', name, type: 'sw', process: 'SW', boxIso: iso,
    reciprocity: { model: 'table', points: [[0.5, 0.5], [1, f1], [10, 10 * f10], [100, 100 * f100]], source: SRC_FOMA },
    nightNotes: `Foma-Tabelle (Faktor auf die gemessene Zeit): 1 s ×${f1}, 10 s ×${f10}, 100 s ×${f100}.`,
    builtin: true
  }, extra);
}
function lomo(id, name, iso, type, extra = {}) {
  return Object.assign({
    id, maker: 'Lomography', name, type, process: type === 'sw' ? 'SW' : 'C-41', boxIso: iso,
    reciprocity: { model: 'unknown' }, nightNotes: '', datasheet: SRC_LOMO_LIST, builtin: true
  }, extra);
}
const CINE_RECIP = { model: 'power', p: 1.3, threshold: 1, source: SRC_CINESTILL };
const CINE_NIGHT = 'CineStill hat kein Reciprocity-Datenblatt. Die App rechnet mit der allgemeinen Faustformel des Herstellers (Tm^1,3). CineStill rät zu Belichtungsreihen von ein paar Blenden und eher mehr Licht.';

SEED_STOCKS.push(
  {
    id: 'rollei-ir400', maker: 'Rollei', name: 'Infrared 400', type: 'ir', process: 'SW', boxIso: 400, isoLabel: '200–400',
    reciprocity: { model: 'unknown' },
    makerNote: 'Datenblatt: nominal ISO 200 bis 400, empfindlich bis in den Infrarotbereich (650 bis 750 nm). Für den Infraroteffekt Filter 715 bis 730 nm empfohlen. Filterfaktor laut Datenblatt bei Rot 695 (89B) 16, bei Infrarot 715 (88A) 16 bis 32. Wirkung nicht per Auge oder Belichtungsmesser beurteilbar, daher Reihen mit nominal, +1 und −1 empfohlen. Sehr hoher Belichtungsspielraum, Push/Pull 1 bis 2 Blenden möglich.',
    nightNotes: 'Datenblatt nennt keine Schwarzschild-Werte.',
    datasheet: SRC_ROLLEI_IR.url, builtin: true
  },
  {
    id: 'optik-opticolour200', maker: 'Optik Oldschool', name: 'OptiColour 200', type: 'farbneg', process: 'C-41', boxIso: 200,
    reciprocity: { model: 'unknown' },
    makerNote: 'Hersteller: Emulsion Wolfen NC200, beschichtet von InovisCoat in Deutschland, orange Maske. Keine Angaben zu Spielraum oder Schwarzschild.',
    datasheet: SRC_OPTIK, builtin: true
  },
  {
    id: 'cinestill-800t', maker: 'CineStill', name: '800T', type: 'farbneg', process: 'C-41', boxIso: 800,
    reciprocity: CINE_RECIP, nightNotes: CINE_NIGHT,
    makerNote: 'Hersteller: EI 800, Kunstlicht 3200 K. Bei Tageslicht ist ein 85er-Filter vorgeschlagen. Laut CineStill großer Belichtungsspielraum, Push bis 3 Blenden.',
    datasheet: SRC_CINESTILL_PRIMER, builtin: true
  },
  {
    id: 'cinestill-400d', maker: 'CineStill', name: '400D', type: 'farbneg', process: 'C-41', boxIso: 400,
    reciprocity: CINE_RECIP, nightNotes: CINE_NIGHT,
    makerNote: 'Hersteller: EI 400, Tageslicht. Laut CineStill sehr großer Belichtungsspielraum, Push bis 3 Blenden in C-41.',
    datasheet: SRC_CINESTILL_PRIMER, builtin: true
  },
  {
    id: 'cinestill-50d', maker: 'CineStill', name: '50D', type: 'farbneg', process: 'C-41', boxIso: 50,
    reciprocity: CINE_RECIP, nightNotes: CINE_NIGHT,
    makerNote: 'Hersteller: EI 50, Tageslicht. Laut CineStill sehr guter Belichtungsspielraum.',
    datasheet: SRC_CINESTILL_PRIMER, builtin: true
  },
  {
    id: 'cinestill-bwxx', maker: 'CineStill', name: 'BwXX', type: 'sw', process: 'SW', boxIso: 200, isoLabel: '200–800',
    reciprocity: CINE_RECIP, nightNotes: CINE_NIGHT,
    makerNote: 'Hersteller: variabel EI 200 bis 800. CineStill nennt die eigenen Entwickler D96 und Df96.',
    datasheet: SRC_CINESTILL_PRIMER, builtin: true
  },
  foma('foma-100', 'Fomapan 100 Classic', 100, 2, 8, 16),
  foma('foma-200', 'Fomapan 200 Creative', 200, 3, 9, 18),
  foma('foma-400', 'Fomapan 400 Action', 400, 1.5, 6, 8),
  foma('foma-retropan320', 'Retropan 320 Soft', 320, 1.5, 6, 8),
  {
    id: 'foma-r100', maker: 'Foma', name: 'Fomapan R 100', type: 'sw-umkehr', process: 'SW', boxIso: 100,
    reciprocity: { model: 'unknown' },
    makerNote: 'Schwarzweiß-Umkehrfilm (ergibt Dias). Der Foma-Katalog nennt dafür keine Schwarzschild-Werte.',
    datasheet: SRC_FOMA.url, builtin: true
  },
  lomo('lomo-cn100', 'Color Negative 100', 100, 'farbneg'),
  lomo('lomo-cn400', 'Color Negative 400', 400, 'farbneg'),
  lomo('lomo-cn800', 'Color Negative 800', 800, 'farbneg'),
  lomo('lomo-classicolor200', 'LomoChrome Classicolor 200', 200, 'farbneg', { makerNote: 'Seit Oktober 2025, C-41. Zunächst Kleinbild, 120 und 110 angekündigt.' }),
  lomo('lomo-color92', "LomoChrome Color '92", 400, 'farbneg'),
  lomo('lomo-color92-sun', "LomoChrome Color '92 Sun-Kissed", 400, 'farbneg'),
  lomo('lomo-purple', 'LomoChrome Purple XR', 100, 'farbneg', { isoLabel: '100–400', makerNote: 'Lomography gibt einen Bereich von ISO 100 bis 400 an. Als Sonderedition gibt es „Pétillant“.' }),
  lomo('lomo-turquoise', 'LomoChrome Turquoise XR', 100, 'farbneg', { isoLabel: '100–400', makerNote: 'Lomography gibt einen Bereich von ISO 100 bis 400 an.' }),
  lomo('lomo-metropolis', 'LomoChrome Metropolis XR', 100, 'farbneg', { isoLabel: '100–400', makerNote: 'Lomography gibt einen Bereich von ISO 100 bis 400 an.' }),
  lomo('lomo-redscale', 'Redscale XR', 50, 'farbneg', { isoLabel: '50–200', makerNote: 'Lomography gibt einen Bereich von ISO 50 bis 200 an.' }),
  lomo('lomo-earlgrey', 'Earl Grey 100', 100, 'sw'),
  lomo('lomo-ladygrey', 'Lady Grey 400', 400, 'sw'),
  lomo('lomo-berlin', 'Berlin Kino 400', 400, 'sw'),
  lomo('lomo-potsdam', 'Potsdam Kino 100', 100, 'sw'),
  lomo('lomo-babylon', 'Babylon Kino 13', 13, 'sw'),
  lomo('lomo-fantome', 'Fantôme Kino 8', 8, 'sw', { makerNote: 'Aktuelle Verfügbarkeit nicht geprüft.' }),
  lomo('lomo-orca', 'Orca 100 (110)', 100, 'sw', { makerNote: 'Nur im Format 110. Aktuelle Verfügbarkeit nicht geprüft.' }),
  lomo('lomo-tiger', 'Color Tiger 200 (110)', 200, 'farbneg', { makerNote: 'Nur im Format 110. Aktuelle Verfügbarkeit nicht geprüft.' }),
  lomo('lomo-lobster', 'Lobster Redscale (110)', 200, 'farbneg', { makerNote: 'Nur im Format 110, Spielraum laut Lomography ISO 100 bis 400.' })
);

// Bajonette und Startobjektive
const MOUNTS = ['Nikon F', 'Minolta SR (MC/MD)', 'M42', 'Praktica B', 'Hasselblad V', 'Canon FD', 'Pentax K', 'Olympus OM', 'Leica M', 'Fest verbaut', 'Sonstiges'];
const SEED_LENSES = [
  { id: 'lens-nikon-28', maker: 'Nikon', focal: '28', kind: 'wide', mount: 'Nikon F', cameraIds: ['cam-nikon-f3'] },
  { id: 'lens-nikon-50', maker: 'Nikon', focal: '50', kind: 'normal', mount: 'Nikon F', cameraIds: ['cam-nikon-f3'] },
  { id: 'lens-nikon-80-200', maker: 'Nikon', focal: '80-200', kind: 'zoom', mount: 'Nikon F', cameraIds: ['cam-nikon-f3'] },
  { id: 'lens-olivesan-22', maker: 'Superheadz', focal: '22', kind: 'wide', mount: 'Fest verbaut', cameraIds: ['cam-superheadz-olivesan'] },
  { id: 'lens-minolta-md-75-150', maker: 'Minolta', name: 'MD Zoom', focal: '75-150', kind: 'zoom', mount: 'Minolta SR (MC/MD)', cameraIds: ['cam-minolta-xg1'] }
];

// Bekannte Formate (nur wo eine Quelle vorliegt). Filme ohne Angabe erscheinen bei Kleinbild und Mittelformat.
const SEED_FORMATS = {
  'cinestill-800t': ['135', '120'], 'cinestill-400d': ['135', '120'], 'cinestill-50d': ['135', '120'], 'cinestill-bwxx': ['135', '120'],
  'rollei-ir400': ['135', '120'], 'optik-opticolour200': ['135', '120'], 'foma-100': ['135', '120'], 'foma-r100': ['135'],
  'lomo-orca': ['110'], 'lomo-tiger': ['110'], 'lomo-lobster': ['110']
};
SEED_STOCKS.forEach(s => { if (SEED_FORMATS[s.id]) s.formats = SEED_FORMATS[s.id]; });

// Kodak Portra 800 (Datenblatt E-4040, Revision 01/2025)
SEED_STOCKS.push({
  id: 'kodak-portra800', maker: 'Kodak', name: 'Portra 800', type: 'farbneg', process: 'C-41', boxIso: 800, formats: ['135', '120'],
  reciprocity: { model: 'none', upTo: 1, source: { label: 'Kodak Alaris, E-4040 PORTRA 800, Jan. 2025', url: 'https://www.freestylephoto.com/static/pdf/product_pdf/kodak/e4040_Kodak_Portra_800.pdf' } },
  makerNote: 'Datenblatt: EI 800 bei Tageslicht und Blitz, EI 250 bei Fotolampen (3400 K), EI 200 bei Kunstlicht (3200 K). Push 1 = EI 1600, Push 2 = EI 3200. Kodak nennt „best-in-class underexposure latitude“, ohne Zahlenwert.',
  nightNotes: 'Datenblatt: keine Korrektur von 1/10.000 s bis 1 s. Für längere Zeiten nennt Kodak keine Werte und rät zu eigenen Tests.',
  datasheet: 'https://www.freestylephoto.com/static/pdf/product_pdf/kodak/e4040_Kodak_Portra_800.pdf', builtin: true
});
SEED_FORMATS['kodak-portra800'] = ['135', '120'];
// Harman Phoenix 120: eigener Eintrag (Pressemitteilung Harman, 5.9.2024)
SEED_FORMATS['harman-phoenix200'] = ['135'];
SEED_FORMATS['harman-phoenix120'] = ['120'];
SEED_STOCKS.forEach(s => { if (s.id === 'harman-phoenix200') s.formats = ['135']; });
SEED_STOCKS.push({
  id: 'harman-phoenix120', maker: 'Harman', name: 'Phoenix 120', type: 'farbneg', process: 'C-41', boxIso: 200, formats: ['120'],
  reciprocity: { model: 'unknown' },
  makerNote: 'Harman, Pressemitteilung vom 5.9.2024: ISO 200, Rollfilm 120, Look mit kräftigem sichtbarem Korn und lebhaften Farben (starke Grün-, Rot- und Blautöne). Schwarzschild-Werte für diese Version habe ich nicht gefunden.',
  datasheet: 'https://newsroom.notified.com/news/314968/harman-technology-expands-phoenix-film-line-w', builtin: true
});

// Ergänzung Oktober 2026: weitere Harman-Filme, ORWO Wolfen NC500, AgfaPhoto
const SRC = (label, url) => ({ label, url });
SEED_STOCKS.push(
  {
    id: 'harman-phoenix125', maker: 'Harman', name: 'Phoenix 125', type: 'farbneg', process: 'C-41', boxIso: 125, formats: ['135', '120'],
    reciprocity: { model: 'unknown' },
    makerNote: 'PetaPixel, 12.8.2026: überarbeitete Fassung des Phoenix 200 mit ISO 125 und DX-Code, Kleinbild und 120. Den Prozess nennt der Artikel nicht, C-41 ist aus der Phoenix-Reihe übernommen und nicht eigens belegt. Phoenix 200 ist laut demselben Artikel eingestellt.',
    datasheet: 'https://petapixel.com/2026/08/12/harmans-phoenix-color-film-rises-from-the-ashes-with-a-new-iso/', builtin: true
  },
  {
    id: 'harman-red125', maker: 'Harman', name: 'Red 125', type: 'farbneg', process: 'C-41', boxIso: 125, formats: ['135', '120'],
    reciprocity: { model: 'unknown' },
    makerNote: 'Kosmo Foto, Juni 2025: Redscale-Film auf Basis von Phoenix, ISO 125, Kleinbild seit Februar 2025, 120 seit Juni 2025. Der Rotstich nimmt bei höherer ISO-Einstellung zu.',
    datasheet: 'https://kosmofoto.com/2025/06/harman-technology-releases-120-version-of-red-redscale-colour-film/', builtin: true
  },
  {
    id: 'harman-switch-azure', maker: 'Harman', name: 'Switch Azure 125', type: 'farbneg', process: 'C-41', boxIso: 125, formats: ['135', '120'],
    reciprocity: { model: 'unknown' },
    makerNote: 'Experimenteller Farbnegativfilm (Harman, März 2026): zwei Farbkuppler vertauscht, Blau wird eher orange, Gelb eher blau oder cyan, Rot violett. C-41. Harman empfiehlt, auf die Mitteltöne zu belichten.',
    datasheet: 'https://kosmofoto.com/2026/03/harman-technology-releases-experimental-switch-azure-colour-film/', builtin: true
  },
  {
    id: 'orwo-wolfen-nc500', maker: 'ORWO', name: 'Wolfen NC500', type: 'farbneg', process: 'C-41', boxIso: 500, formats: ['135'],
    reciprocity: { model: 'unknown' },
    makerNote: 'Kosmo Foto: limitierte Auflage, ISO 500, 36 Aufnahmen, laut ORWO eine C-41-Emulsion auf Basis des Agfa-Kinofilms XT320. Ein Händler empfiehlt ISO 400.',
    communityIso: '400', communitySource: 'Ateliers Marinette, Produktseite Wolfen NC 500',
    datasheet: 'https://kosmofoto.com/?p=28689', builtin: true
  },
  {
    id: 'agfa-apx100', maker: 'AgfaPhoto', name: 'APX 100', type: 'sw', process: 'SW', boxIso: 100, formats: ['135'],
    reciprocity: { model: 'unknown' }, makerNote: 'Fotoimpex führt APX 100 als Kleinbild mit 36 Aufnahmen und als 30,5-m-Meterware.',
    datasheet: 'https://www.agfaphoto-gtc.com/en/photo-film/67-agfaphoto-film-apx100-4250255100499.html', builtin: true
  },
  {
    id: 'agfa-apx200', maker: 'AgfaPhoto', name: 'APX 200 Pro', type: 'sw', process: 'SW', boxIso: 200, formats: ['135'],
    reciprocity: { model: 'unknown' }, makerNote: 'Fotoimpex führt APX 200 Pro als Kleinbild mit 36 Aufnahmen.',
    datasheet: 'https://www.fotoimpex.com/brands/agfaphoto/films/', builtin: true
  },
  {
    id: 'agfa-apx400', maker: 'AgfaPhoto', name: 'APX 400', type: 'sw', process: 'SW', boxIso: 400, formats: ['135'],
    reciprocity: { model: 'unknown' }, makerNote: 'AgfaPhoto: Push bis ISO 800 möglich. Kleinbild mit 36 Aufnahmen und als Meterware.',
    datasheet: 'https://www.agfaphoto-gtc.com/en/photo-film/68-agfaphoto-film-apx400-4250255100505.html', builtin: true
  },
  {
    id: 'agfa-color400', maker: 'AgfaPhoto', name: 'Color 400', type: 'farbneg', process: 'C-41', boxIso: 400, formats: ['135'],
    reciprocity: { model: 'unknown' }, makerNote: 'Kleinbild mit 24 Aufnahmen (Parallax Photographic). C-41 laut Händlerangaben als Farbnegativfilm, Hersteller-Datenblatt nicht gefunden.',
    datasheet: 'https://parallaxphotographic.coop/agfaphoto-color-400-film-review/', builtin: true
  }
);
['harman-phoenix125', 'harman-red125', 'harman-switch-azure', 'orwo-wolfen-nc500', 'agfa-apx100', 'agfa-apx200', 'agfa-apx400', 'agfa-color400']
  .forEach(id => { SEED_FORMATS[id] = SEED_STOCKS.find(s => s.id === id).formats; });

// Ergänzung 25.10.2026: fehlende Filme von Kodak, Ilford und Lomography (Quellen je Film in makerNote/datasheet)
const SRC_TMAX400 = SRC('Kodak, F-4043 T-MAX 400, Okt. 2007', 'https://www.freestylephoto.com/pdf/product_pdfs/kodak/Kodak_Tmax400.pdf');
const SRC_P3200 = SRC('Kodak Alaris, F-4001 T-MAX P3200, März 2018', 'https://www.macodirect.de/media/pdf/a3/fa/19/KTM3211_Datenblatt_e.pdf');
const SRC_ORTHO = SRC('Harman, ILFORD ORTHO Plus Datenblatt, Okt. 2019', 'https://www.ilfordphoto.com/amfile/file/download/file/1948/product/698');
const EK_EU = 'https://camerajabber.com/photography-news/eastman-kodaks-new-still-film-range-is-now-on-sale-in-europe/';
const EK_NAMES = 'https://obscura.hu/blogs/news/kodak-film-has-new-packaging';
const EK_SHEET = 'https://petapixel.com/2026/08/14/eastman-kodak-goes-big-and-shows-film-some-more-love/';
const RENAMED = (old) => `Eastman-Kodak-Bezeichnung seit 2026. Die Fachpresse hält ihn für ${old}, Kodak hat das nicht bestätigt. Deshalb sind keine Werte von ${old} übernommen.`;
const seedStock = (id, maker, name, type, process, iso, formats, extra = {}) => Object.assign(
  { id, maker, name, type, process, boxIso: iso, formats, reciprocity: { model: 'unknown' }, builtin: true }, extra);
SEED_STOCKS.push(
  seedStock('kodak-tmax400', 'Kodak', 'T-Max 400', 'sw', 'SW', 400, ['135', '120'], {
    reciprocity: { model: 'table', points: [[0.1, 0.1], [1, 1], [10, 12.6], [100, 300]], source: SRC_TMAX400 },
    nightNotes: 'Datenblatt: bis 1 s keine Korrektur, 10 s +⅓ Blende (als Zeit umgerechnet ≈12,6 s), 100 s → 300 s.', datasheet: SRC_TMAX400.url }),
  seedStock('kodak-tmaxp3200', 'Kodak', 'T-Max P3200', 'sw', 'SW', 3200, ['135'], {
    isoLabel: '800–6400',
    reciprocity: { model: 'none', upTo: 1, source: SRC_P3200 },
    makerNote: 'Kodak: Nennempfindlichkeit EI 800 bis 1000, gute Negative bei EI 1600, EI 3200 und 6400 mit mehr Kontrast und Korn. Die Patrone ist DX-codiert auf 3200.',
    nightNotes: 'Datenblatt: bis 1 s keine Korrektur, für längere Zeiten keine Werte.', datasheet: SRC_P3200.url }),
  seedStock('kodak-e100', 'Kodak', 'Ektachrome E100', 'dia', 'E-6', 100, ['135', '120'], {
    makerNote: 'Diafilm, auch als Planfilm 4×5 erhältlich. Schwarzschild-Werte aus einem aktuellen Kodak-Datenblatt habe ich nicht gefunden.',
    datasheet: 'https://petapixel.com/2019/12/10/kodak-ektachrome-e100-film-is-now-available-in-120-and-4x5-formats' }),
  seedStock('kodak-colorplus200', 'Kodak', 'ColorPlus 200', 'farbneg', 'C-41', 200, ['135'], {
    makerNote: 'Kodak-Alaris-Verpackung. Eastman Kodak verkauft vermutlich denselben Film als Kodacolor 200.', datasheet: EK_NAMES }),
  seedStock('kodak-proimage100', 'Kodak', 'Pro Image 100', 'farbneg', 'C-41', 100, ['135'], {
    makerNote: 'Kodak-Alaris-Verpackung. Eastman Kodak verkauft vermutlich denselben Film als Kodacolor 100.', datasheet: EK_NAMES }),
  seedStock('kodak-kodacolor100', 'Kodak', 'Kodacolor 100', 'farbneg', 'C-41', 100, ['135'], { makerNote: RENAMED('Pro Image 100'), datasheet: EK_NAMES }),
  seedStock('kodak-kodacolor200', 'Kodak', 'Kodacolor 200', 'farbneg', 'C-41', 200, ['135'], { makerNote: RENAMED('ColorPlus 200'), datasheet: EK_NAMES }),
  seedStock('kodak-ektacolor160', 'Kodak', 'Ektacolor Pro 160', 'farbneg', 'C-41', 160, ['135', '120'], { makerNote: RENAMED('Portra 160') + ' Auch als Planfilm 4×5 und 8×10.', datasheet: EK_SHEET }),
  seedStock('kodak-ektacolor400', 'Kodak', 'Ektacolor Pro 400', 'farbneg', 'C-41', 400, ['135', '120'], { makerNote: RENAMED('Portra 400') + ' Auch als Planfilm 4×5 und 8×10.', datasheet: EK_SHEET }),
  seedStock('kodak-ektacolor800', 'Kodak', 'Ektacolor Pro 800', 'farbneg', 'C-41', 800, ['135', '120'], { makerNote: RENAMED('Portra 800'), datasheet: EK_EU }),
  seedStock('kodak-ektapan100', 'Kodak', 'Ektapan 100', 'sw', 'SW', 100, ['135', '120'], { makerNote: RENAMED('T-Max 100') + ' Auch als Planfilm 4×5 und 100-ft-Rolle.', datasheet: EK_SHEET }),
  seedStock('kodak-ektapan400', 'Kodak', 'Ektapan 400', 'sw', 'SW', 400, ['135', '120'], { makerNote: RENAMED('T-Max 400') + ' Auch als Planfilm 4×5 und 100-ft-Rolle.', datasheet: EK_SHEET }),
  seedStock('kodak-ektapanp3200', 'Kodak', 'Ektapan P3200', 'sw', 'SW', 3200, ['135'], { makerNote: RENAMED('T-Max P3200') + ' Für Push-Entwicklung gedacht.', datasheet: EK_NAMES }),
  seedStock('ilford-orthoplus', 'Ilford', 'Ortho Plus 80', 'sw', 'SW', 80, ['135', '120'], {
    reciprocity: { model: 'power', p: 1.25, threshold: 1, source: SRC_ORTHO },
    makerNote: 'Orthochromatisch, also unempfindlich für Rot. Tageslicht ISO 80, Kunstlicht ISO 40. Die Patrone ist DX-codiert auf 80, bei Kunstlicht deshalb ISO 40 von Hand einstellen. Auch als Planfilm.',
    nightNotes: 'Datenblatt: bis 1 s keine Korrektur, darüber Ta = Tm^1,25.', datasheet: SRC_ORTHO.url }),
  seedStock('ilford-pan100', 'Ilford', 'Pan 100', 'sw', 'SW', 100, ['135'], {
    makerNote: 'Günstiger SW-Film, laut Ilford nur für ausgewählte Märkte, in Europa bei einigen Händlern. Datenblatt mit Schwarzschild-Werten habe ich nicht gefunden.',
    datasheet: 'https://www.photrio.com/forum/threads/ilford-pan-100.110960' }),
  seedStock('ilford-pan400', 'Ilford', 'Pan 400', 'sw', 'SW', 400, ['135'], {
    makerNote: 'Günstiger SW-Film, laut Ilford nur für ausgewählte Märkte, in Europa bei einigen Händlern. Datenblatt mit Schwarzschild-Werten habe ich nicht gefunden.',
    datasheet: 'https://www.photrio.com/forum/threads/ilford-pan-100.110960' }),
  seedStock('ilford-vintagetone400', 'Ilford', 'Ilfocolor Vintage Tone 400', 'farbneg', 'C-41', 400, ['135'], {
    makerNote: 'Farbnegativfilm mit warmem Vintage-Look, Kleinbild.', datasheet: 'https://ilfocolor.com/?p=405' }),
  seedStock('ilford-cinetone400', 'Ilford', 'Ilfocolor Cine Tone 400', 'farbneg', 'ECN-2', 400, ['135'], {
    makerNote: 'Kinofilm für den ECN-2-Prozess, nicht C-41. Vor dem Abgeben beim Labor fragen, ob es ECN-2 entwickelt.', datasheet: 'https://macodirect.de/en/film/color-negative-films/6815/ilford-ilfocolor-400-cine-tone-35mm-24-exposures-ecn2-cinefilm' }),
  seedStock('ilford-ilfochrome100', 'Ilford', 'Ilfochrome 100', 'dia', 'E-6', 100, ['135'], {
    makerNote: 'Diafilm für E-6, Kleinbild. Einzelne Händler führen ihn als nicht mehr lieferbar.', datasheet: 'https://ilfocolor.com/?p=405' })
);
// Bekannte Formate für schon vorhandene Filme. Ultramax gibt es nur als Kleinbild, LomoChrome-Filme zusätzlich als 110.
Object.assign(SEED_FORMATS, {
  'kodak-trix': ['135', '120'], 'kodak-tmax100': ['135', '120'], 'kodak-portra160': ['135', '120'], 'kodak-portra400': ['135', '120'],
  'kodak-ektar100': ['135', '120'], 'kodak-gold200': ['135', '120'], 'kodak-ultramax400': ['135'],
  'ilford-delta3200': ['135', '120'], 'ilford-sfx200': ['135', '120'], 'ilford-xp2': ['135', '120'],
  'lomo-purple': ['135', '120', '110'], 'lomo-turquoise': ['135', '120', '110'], 'lomo-metropolis': ['135', '120', '110'],
  'lomo-color92-sun': ['135', '120', '110'], 'lomo-classicolor200': ['135', '120', '110']
});
SEED_STOCKS.forEach(s => { if (SEED_FORMATS[s.id]) s.formats = SEED_FORMATS[s.id]; });

// Ergänzung 25.10.2026: weitere Kameras und Objektive der Nutzerin. Inaktive Kameras stehen im Schrank unter „Inaktiv“.
const NEW_GEAR_1025 = { cams: ['cam-minolta-hi-matic-7s', 'cam-olympus-superzoom70', 'cam-praktica-bx20', 'cam-canon-prima-zoom76', 'cam-leica-c2'],
  lenses: ['lens-hb-distagon-50', 'lens-hb-sonnar-150', 'lens-minolta-rokkor-45', 'lens-prakticar-50'] };
SEED_CAMERAS.push(
  // Mattsclassiccameras.com: Seiko-LA-Verschluss B und 1/4 bis 1/500 s, Automatik oder manuell, ASA 25 bis 800
  { id: 'cam-minolta-hi-matic-7s', maker: 'Minolta', name: 'Hi-Matic 7s', format: '135', mount: 'Fest verbaut', art: { kind: 'compact', color: '#b9bcbd' },
    shutterFast: '1/500', shutterSlow: '1/4', shutterB: true, shutterAuto: true, isoDial: true, multiExp: true },
  { id: 'cam-olympus-superzoom70', maker: 'Olympus', name: 'Superzoom 70', format: '135', mount: 'Fest verbaut', art: { kind: 'compact', color: '#2a2b2d' },
    auto: true, isoDial: false, multiExp: false, inactive: true, notes: 'Zoomobjektiv 38–70 mm (Aufdruck am Objektiv), Autofokus.' },
  // davidde.com: Praktica-B-Bajonett, B und 40 s bis 1/1000 s, Zeitautomatik, ISO 12 bis 3200
  { id: 'cam-praktica-bx20', maker: 'Praktica', name: 'BX20', format: '135', mount: 'Praktica B', art: { kind: 'slr', body: 'black' },
    shutterFast: '1/1000', shutterSlow: '40', shutterB: true, shutterAuto: true, isoDial: true, multiExp: true, inactive: true },
  { id: 'cam-canon-prima-zoom76', maker: 'Canon', name: 'Prima Zoom 76 AiAF', format: '135', mount: 'Fest verbaut', art: { kind: 'compact', color: '#3a3b3e' },
    auto: true, isoDial: false, multiExp: false, inactive: true, notes: 'Noch kein Foto hinterlegt.' },
  { id: 'cam-leica-c2', maker: 'Leica', name: 'C2', format: '135', mount: 'Fest verbaut', art: { kind: 'compact', color: '#d9dadb' },
    auto: true, isoDial: false, multiExp: false, inactive: true, notes: 'Leica Vario-Elmar 35–70 mm (Aufdruck am Objektiv).' }
);
SEED_LENSES.push(
  // Ken Rockwell, Hasselblad 50mm f/4 C: Blende bis f/22, Filter Serie VIII (63 mm) mit Haltering, die CF-Version hat Bajonett 60
  { id: 'lens-hb-distagon-50', maker: 'Zeiss', name: 'Distagon', focal: '50', kind: 'wide', mount: 'Hasselblad V', cameraIds: ['cam-hasselblad-500cm'], maxAp: '4', minAp: '22',
    notes: 'Filter: C-Version Serie VIII (63 mm) mit Haltering, CF-Version Bajonett 60. Version bitte prüfen.' },
  // Zeiss-Datenblatt Sonnar 4/150 C: Blende 4 bis 32
  { id: 'lens-hb-sonnar-150', maker: 'Zeiss', name: 'Sonnar', focal: '150', kind: 'tele', mount: 'Hasselblad V', cameraIds: ['cam-hasselblad-500cm'], maxAp: '4', minAp: '32',
    notes: 'Filter: Bajonett 50 (KEH, C-Version).' },
  { id: 'lens-minolta-rokkor-45', maker: 'Minolta', name: 'Rokkor', focal: '45', kind: 'normal', mount: 'Fest verbaut', cameraIds: ['cam-minolta-hi-matic-7s'], maxAp: '1.8', minAp: '22', filterThread: '55' },
  { id: 'lens-prakticar-50', maker: 'Pentacon', name: 'Prakticar MC', focal: '50', kind: 'normal', mount: 'Praktica B', cameraIds: ['cam-praktica-bx20'], maxAp: '1.8',
    notes: 'Filtergewinde: davidde.com nennt 49 mm, Kamerastore 58 mm. Bitte am Objektiv nachsehen.' }
);

// Verschlusszeiten der Kameras und Blendenbereiche der Objektive (Quellen in der Anleitung)
const SEED_SHUTTERS = {
  'cam-nikon-f3': { shutterFast: '1/2000', shutterSlow: '8', shutterB: true, shutterT: true, shutterAuto: true },
  'cam-minolta-xg1': { shutterFast: '1/1000', shutterSlow: '1', shutterB: true, shutterAuto: true },
  'cam-praktica-l2': { shutterFast: '1/1000', shutterSlow: '1', shutterB: true },
  'cam-hasselblad-500cm': { shutterFast: '1/500', shutterSlow: '1', shutterB: true },
  // Fester Verschluss, Angabe der Nutzerin (Film Photography Project nennt für die Superheadz-Bauform ebenfalls 1/125 laut Hersteller)
  'cam-superheadz-olivesan': { shutterFast: '1/125', shutterSlow: '1/125' }
};
SEED_CAMERAS.forEach(c => Object.assign(c, SEED_SHUTTERS[c.id] || {}));
const SEED_LENS_APS = { 'lens-minolta-md-75-150': { maxAp: '4', minAp: '32' }, 'lens-olivesan-22': { maxAp: '11', minAp: '11' } };
SEED_LENSES.forEach(l => Object.assign(l, SEED_LENS_APS[l.id] || {}));

// Freigestellte Produktfotos für die eingebauten Filme und Kameras (Ordner img/).
// Ein eigenes Foto im Eintrag hat Vorrang.
const SEED_IMG = Object.fromEntries([
  'cam-hasselblad-500cm', 'cam-minolta-xg1', 'cam-nikon-f3', 'cam-praktica-l2', 'cam-superheadz-olivesan',
  'cam-minolta-hi-matic-7s', 'cam-olympus-superzoom70', 'cam-praktica-bx20', 'cam-leica-c2',
  'agfa-apx100', 'cinestill-400d', 'cinestill-50d', 'cinestill-800t', 'cinestill-bwxx', 'foma-100', 'foma-200', 'foma-400',
  'harman-phoenix125', 'harman-phoenix2', 'harman-red125', 'harman-switch-azure', 'agfa-color400',
  'rollei-ir400', 'optik-opticolour200', 'lomo-purple', 'kodak-portra160', 'kodak-portra400', 'kodak-portra800', 'kodak-colorplus200', 'kodak-gold200', 'orwo-wolfen-nc500', 'lomo-cn800', 'kodak-trix',
  'ilford-delta100', 'ilford-delta3200', 'ilford-delta400', 'ilford-fp4', 'ilford-hp5', 'ilford-panf', 'ilford-sfx200', 'ilford-xp2',
  'kentmere-200'
].map(id => [id, 'img/' + id + '.webp']));
// Erste Phoenix 200 (rote Packung); die blaue Packung gehört zu Phoenix II
SEED_IMG['harman-phoenix200'] = 'img/harman-phoenix200-rot.webp';

/* ---------- Gear-Sets (30.10.2026): Rebeccas und Leos Ausrüstung, umschaltbar in den Einstellungen ---------- */
// Rebecca: Stand ihrer Screenshots vom 30.10.2026. Leo: alle übrigen Kameras, alle aktiv.
const GEAR_EXTRA_LENSES = [
  { id: 'lens-helios-44m', maker: 'Helios', name: '44 M', focal: '50', kind: 'normal', mount: 'Nikon F', filterThread: '52', cameraIds: ['cam-praktica-l2'] },
  { id: 'lens-minolta-rokkor-pf-50', maker: 'Minolta', name: 'MC Rokkor - PF', focal: '50', kind: 'normal', mount: 'Minolta SR (MC/MD)', maxAp: '2', cameraIds: ['cam-minolta-xg1'] },
  { id: 'lens-hqc-maginon-35-70', maker: 'HQC', name: 'Maginon-Serie', focal: '35 - 70', kind: 'zoom', mount: 'M42', maxAp: '3.5', cameraIds: ['cam-praktica-l2'] },
  { id: 'lens-beroflex-28', maker: 'Beroflex', name: 'Auto MC', focal: '28', kind: 'wide', mount: 'M42', maxAp: '2.8', filterThread: '52', cameraIds: ['cam-praktica-l2'] },
  { id: 'lens-canon-fd-200', maker: 'Canon', name: 'FD 200 1:4', focal: '200', kind: 'tele', mount: 'Canon FD', maxAp: '4', cameraIds: [], inactive: true },
  { id: 'lens-kiron-80-200', maker: 'Kiron', name: 'Macro 1:4', focal: '80 - 200', kind: 'zoom', mount: 'Minolta SR (MC/MD)', maxAp: '4.5', cameraIds: [], inactive: true },
  // Carl Zeiss Planar 80 mm f/2.8 C (verchromt, Leos Hasselblad). Kleinste Blende 22 laut Skala auf dem Foto, Filter Bajonett 50 laut KEH (C-Version)
  { id: 'lens-hb-planar-80', maker: 'Zeiss', name: 'Planar', focal: '80', kind: 'normal', mount: 'Hasselblad V', maxAp: '2.8', minAp: '22', cameraIds: ['cam-hasselblad-500cm'],
    notes: 'Filter: Bajonett 50 (C-Version).' },
  { id: 'lens-pentax-m-50', maker: 'SMC', name: 'Pentax-M 1:2', focal: '50', kind: 'normal', mount: 'Pentax K', maxAp: '2', cameraIds: [], inactive: true }
];
const GEAR_SETS = {
  rebecca: {
    label: 'Rebeccas Gear',
    cams: { 'cam-nikon-f3': true, 'cam-praktica-l2': true, 'cam-minolta-xg1': true, 'cam-superheadz-olivesan': true, 'cam-hasselblad-500cm': false, 'cam-olympus-superzoom70': false },
    lenses: {
      'lens-nikon-50': { name: 'AF Nikkor', maxAp: '2.8', filterThread: '52' }, 'lens-nikon-28': { name: 'AF Nikkor', maxAp: '2.8' },
      'lens-helios-44m': {}, 'lens-minolta-rokkor-pf-50': {}, 'lens-nikon-80-200': {}, 'lens-hqc-maginon-35-70': {},
      'lens-minolta-md-75-150': {}, 'lens-olivesan-22': {}, 'lens-beroflex-28': {},
      'lens-canon-fd-200': {}, 'lens-kiron-80-200': {}, 'lens-pentax-m-50': {}
    },
    acc: [
      { id: 'acc-holga-blitz', kind: 'blitz', name: 'Holga', maker: '', count: 1, cameraIds: ['cam-minolta-xg1', 'cam-nikon-f3', 'cam-praktica-l2'], notes: '' },
      { id: 'acc-sunpack-blitz', kind: 'blitz', name: 'Sunpack', maker: '', count: 1, cameraIds: ['cam-minolta-xg1', 'cam-nikon-f3', 'cam-praktica-l2'], notes: '' }
    ]
  },
  leo: {
    label: 'Leos Gear',
    cams: { 'cam-hasselblad-500cm': true, 'cam-olympus-superzoom70': true, 'cam-minolta-hi-matic-7s': true, 'cam-praktica-bx20': true, 'cam-canon-prima-zoom76': true, 'cam-leica-c2': true },
    lenses: { 'lens-hb-planar-80': {}, 'lens-hb-distagon-50': {}, 'lens-hb-sonnar-150': {}, 'lens-minolta-rokkor-45': {}, 'lens-prakticar-50': {} },
    acc: []
  }
};
SEED_IMG['lens-hb-planar-80'] = 'img/lens-hb-planar-80.webp';
