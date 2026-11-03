/* Licht der App: weiche Lightleaks statt Prisma und Mondschein.
   Tag (Entwurf „Tag 4“): zwei zarte Leaks über Eck, oben links Bernstein, unten rechts Rosa bis Violett.
   Nacht (Entwurf „Nacht 2“): warmes Streiflicht vom linken Rand, fast gleichmäßig über die Höhe.
   Die Lichtquellen sind fest am Bildschirm. Karten, die darunter durchscrollen, bekommen an der Stelle,
   an der das Licht sie trifft, einen Schimmer: tagsüber leicht ausgebleicht, nachts angestrahlt.
   Der Name BEAM bleibt, weil theme.js BEAM.update() aufruft. */
const BEAM = (() => {
  // Karten in der App, die das Licht annehmen. Verschachtelte Treffer bekommen nur beim äußersten Element einen Schimmer.
  const SELECTOR = 'main .rollcard, main .card, main .fold:not(.homefold), main .diaryfold, main a.photostile, main .cell, main .list';
  let layer = null, raf = 0;

  // Nachtlicht zum Ausprobieren (Einstellungen): die vier Nacht-Entwürfe
  const NIGHT_LIGHTS = ['streif', 'glut', 'kuehl', 'schleier'];
  const nightLight = () => { try { const v = localStorage.getItem('kb-nightlight'); return NIGHT_LIGHTS.includes(v) ? v : 'streif'; } catch (_) { return 'streif'; } };
  function sources(night, W, H) {
    if (night) {
      const v = nightLight();
      // Glut von unten: warmes Licht steigt vom unteren Rand auf, Karten glühen an, je weiter unten sie sind
      if (v === 'glut') return [
        { x: W / 2, y: H + 60, rx: W * 1.15, ry: H * 0.62, stops: [[255,226,170,.85,0],[255,150,80,.5,26],[255,80,110,.22,56],[163,92,255,.06,82],[163,92,255,0,100]] }
      ];
      // Kühler Leak: Violett und Blau aus der Ecke rechts oben, mit kleinem warmem Kern
      if (v === 'kuehl') return [
        { x: W + 40, y: -40, rx: W * 1.0, ry: H * 0.62, stops: [[226,210,255,.75,0],[150,120,255,.45,24],[90,130,255,.2,55],[90,130,255,0,100]] },
        { x: W - 6, y: 6, rx: 130, ry: 130, stops: [[255,236,200,.85,0],[255,170,120,.32,45],[255,170,120,0,100]] }
      ];
      // Diagonaler Schleier: weicher schräger Lichtschleier in Rosa und Orange von links oben nach rechts unten
      if (v === 'schleier') return [
        { lin: k => `linear-gradient(128deg, rgba(255,120,150,0) 18%, rgba(255,120,150,${(.2 * k).toFixed(3)}) 34%, rgba(255,176,110,${(.32 * k).toFixed(3)}) 46%, rgba(255,226,180,${(.36 * k).toFixed(3)}) 50%, rgba(255,176,110,${(.28 * k).toFixed(3)}) 55%, rgba(255,110,150,${(.16 * k).toFixed(3)}) 66%, rgba(163,92,255,0) 82%)` },
        { x: -40, y: -40, rx: W * 0.5, ry: H * 0.28, stops: [[255,232,200,.6,0],[255,160,120,.2,45],[255,160,120,0,100]] }
      ];
      // Streiflicht: warmes Licht gleichmäßig vom linken Rand
      return [
        { x: -60, y: H * 0.52, rx: W * 0.67, ry: H * 1.02, stops: [[255,236,205,.85,0],[255,170,100,.48,24],[255,90,110,.2,55],[163,92,255,.06,80],[163,92,255,0,100]] }
      ];
    }
    return [
      { x: -W * 0.08, y: 100, rx: W * 0.64, ry: 230, stops: [[255,240,208,.85,0],[255,196,120,.45,34],[255,196,120,0,100]] },
      { x: W + 40, y: H - 24, rx: W * 0.87, ry: 310, stops: [[255,232,236,.8,0],[255,146,176,.4,32],[190,140,255,.16,66],[190,140,255,0,100]] }
    ];
  }
  function grad(s, k, ox, oy) {
    if (s.lin) return s.lin(k);
    return `radial-gradient(${s.rx.toFixed(0)}px ${s.ry.toFixed(0)}px at ${(s.x - ox).toFixed(1)}px ${(s.y - oy).toFixed(1)}px, ${s.stops.map(([r, g, b, a, p]) => `rgba(${r},${g},${b},${(a * k).toFixed(3)}) ${p}%`).join(', ')})`;
  }

  function draw() {
    raf = 0;
    if (!layer) return;
    const night = document.documentElement.dataset.mood === 'moon';
    const W = window.innerWidth, H = window.innerHeight;
    const src = sources(night, W, H);
    layer.style.background = src.map(s => grad(s, night ? .5 : .55, 0, 0)).join(', ');
    layer.style.backgroundSize = ''; layer.style.backgroundPosition = '';
    const off = document.body.classList.contains('albummode');
    const els = [...document.querySelectorAll(SELECTOR)].filter(el => !el.hidden && el.offsetParent !== null);
    const outer = new Set(els.filter(el => !els.some(o => o !== el && o.contains(el))));
    // Schimmer an Elementen entfernen, die keine äußeren Karten mehr sind
    document.querySelectorAll('.leakfx').forEach(fx => { if (off || !outer.has(fx.parentElement)) fx.remove(); });
    if (off) return;
    const blend = night ? 'screen' : 'normal';
    for (const el of outer) {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > H || r.width < 8) continue;
      let fx = el.querySelector(':scope > .leakfx');
      if (!fx) {
        if (getComputedStyle(el).position === 'static') el.classList.add('leakhost');
        fx = document.createElement('div');
        fx.className = 'leakfx';
        fx.setAttribute('aria-hidden', 'true');
        el.appendChild(fx);
      }
      fx.style.mixBlendMode = blend;
      fx.style.background = src.map(s => grad(s, .8, r.left, r.top)).join(', ');
      // Linienverläufe liegen fest am Bildschirm: Größe des Bildschirms, um die Lage der Karte verschoben
      if (src.some(s => s.lin)) { fx.style.backgroundSize = src.map(s => s.lin ? `${W}px ${H}px` : '100% 100%').join(', '); fx.style.backgroundPosition = src.map(s => s.lin ? `${-r.left}px ${-r.top}px` : '0 0').join(', '); fx.style.backgroundRepeat = 'no-repeat'; }
      else { fx.style.backgroundSize = ''; fx.style.backgroundPosition = ''; }
    }
  }
  const update = () => { if (!raf) raf = requestAnimationFrame(draw); };

  function init() {
    layer = document.querySelector('.light');
    if (!layer) { layer = document.createElement('div'); layer.className = 'light'; layer.setAttribute('aria-hidden', 'true'); document.body.prepend(layer); }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    document.addEventListener('scroll', update, { passive: true, capture: true });
    new MutationObserver(recs => {
      const ours = r => r.type === 'childList' && [...r.addedNodes, ...r.removedNodes].every(n => n.classList && n.classList.contains('leakfx'));
      if (recs.some(r => !ours(r))) update();
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class'] });
    new MutationObserver(update).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mood'] });
    update();
  }
  return { init, update, NIGHT_LIGHTS };
})();
BEAM.init();
