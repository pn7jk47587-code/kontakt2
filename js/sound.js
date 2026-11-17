/* Töne, von der App selbst erzeugt (Web Audio), keine Audiodateien. Ein Schalter in den Einstellungen (kb-sound), standardmäßig an.
   iOS: Der Stummschalter am iPhone schaltet auch diese Töne stumm. Der Ton startet erst nach einer Berührung. */
const SND = (() => {
  let ctx = null;
  const on = () => { try { return localStorage.getItem('kb-sound') !== '0'; } catch (_) { return true; } };
  const ac = () => {
    if (!on()) return null;
    try {
      if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); }
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx;
    } catch (_) { return null; }
  };
  const VOL = 0.5;
  // Ein Ton: Frequenz (auch gleitend), Dauer, Form, Lautstärke, Startverzögerung
  const tone = (f0, dur, { type = 'sine', f1 = null, vol = 0.2, at = 0, attack = 0.004 } = {}) => {
    const c = ac(); if (!c) return;
    const t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol * VOL, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  };
  // Rauschstoß, gefiltert: Klick, Knistern
  const noise = (dur, { vol = 0.2, at = 0, hp = 0, lp = 0, bp = 0, q = 1 } = {}) => {
    const c = ac(); if (!c) return;
    const n = Math.max(1, Math.floor(c.sampleRate * dur)), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(); s.buffer = buf;
    let node = s;
    const chain = (type, f) => { const b = c.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; node.connect(b); node = b; };
    if (hp) chain('highpass', hp); if (lp) chain('lowpass', lp); if (bp) chain('bandpass', bp);
    const g = c.createGain(); const t = c.currentTime + at; g.gain.setValueAtTime(vol * VOL, t);
    node.connect(g).connect(c.destination); s.start(t);
  };
  const api = {
    enabled: on,
    set(v) { try { localStorage.setItem('kb-sound', v ? '1' : '0'); } catch (_) {} if (v) api.tick(); },
    // Kurbelklick beim Spulen: kurzes, trockenes Klacken, leicht höher mit jedem Schritt
    crank(i = 0) { noise(0.03, { vol: 0.35, bp: 1800 + (i % 6) * 120, q: 2.5 }); tone(160 + (i % 6) * 14, 0.05, { type: 'triangle', vol: 0.12 }); },
    // Patrone erscheint: kleines Einrasten
    cart(i = 0) { tone(520 + i * 38, 0.09, { type: 'triangle', vol: 0.16 }); tone(780 + i * 57, 0.14, { type: 'sine', vol: 0.1, at: 0.04 }); noise(0.02, { vol: 0.15, hp: 2500 }); },
    // Abschluss beim Spulen: aufsteigende Fanfare
    fanfare() { [523, 659, 784, 1047].forEach((f, i) => { tone(f, 0.28, { type: 'triangle', vol: 0.2, at: i * 0.09 }); tone(f * 2, 0.22, { type: 'sine', vol: 0.06, at: i * 0.09 }); }); tone(1047, 0.7, { type: 'triangle', vol: 0.16, at: 0.4 }); tone(1319, 0.7, { type: 'sine', vol: 0.1, at: 0.4 }); },
    // Film einlegen: Rückwand schnappt zu, dann Aufzug
    load() { noise(0.05, { vol: 0.4, bp: 900, q: 1.5 }); tone(130, 0.09, { type: 'square', vol: 0.1 }); noise(0.04, { vol: 0.3, bp: 1400, q: 2, at: 0.14 }); tone(220, 0.06, { type: 'square', vol: 0.08, at: 0.14 }); },
    // Abzeichen: zwei helle Glockentöne
    badge() { [988, 1319].forEach((f, i) => { tone(f, 0.9, { type: 'sine', vol: 0.18, at: i * 0.12 }); tone(f * 2.76, 0.4, { type: 'sine', vol: 0.05, at: i * 0.12 }); }); },
    // Favorit an: Funkeln nach oben, aus: leiser Klick nach unten
    fav(onState = true) { if (onState) [1175, 1568, 2093].forEach((f, i) => tone(f, 0.18, { type: 'sine', vol: 0.12, at: i * 0.05 })); else tone(500, 0.08, { type: 'sine', f1: 300, vol: 0.12 }); },
    // Kühlschrank auf: Türdichtung, Luftzug, Eisknistern
    ice(openState = true) {
      if (!openState) { noise(0.12, { vol: 0.22, lp: 600 }); tone(110, 0.1, { type: 'sine', vol: 0.14 }); return; }
      noise(0.28, { vol: 0.18, lp: 900 }); tone(90, 0.12, { type: 'sine', vol: 0.12 });
      for (let i = 0; i < 7; i++) { const at = 0.12 + Math.random() * 0.45; noise(0.012, { vol: 0.28, hp: 4500, at }); tone(3200 + Math.random() * 2400, 0.04, { type: 'sine', vol: 0.05, at }); }
      tone(2637, 0.5, { type: 'sine', vol: 0.06, at: 0.1 });
    },
    tick() { tone(880, 0.06, { type: 'sine', vol: 0.12 }); }
  };
  // Der Tonkontext darf erst nach einer Berührung laufen
  const unlock = () => { if (on()) ac(); };
  ['touchstart', 'pointerdown', 'keydown'].forEach(ev => window.addEventListener(ev, unlock, { once: true, passive: true }));
  return api;
})();
