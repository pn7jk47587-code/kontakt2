// Auf Unterseiten steht oben links der Zurück-Pfeil statt des App-Symbols
const homeStep = (text, back) => document.querySelector('#homeBtn:not([hidden])') ? [['#homeBtn', text]] : [['#backBtn', back || 'Tippe auf den Pfeil oben links, um zurückzugehen.']];
/* Einführung beim ersten Start: ein leuchtender Ring zeigt, wohin man tippen soll, eine Sprechblase sagt, was zu tun ist.
   Jeder Schritt geht erst weiter, wenn die Aufgabe erledigt ist. Der Stand liegt in localStorage, damit er ein Neuladen übersteht. */
const TOUR = (() => {
  const KEY = 'kb-tour';
  let st = null;
  try { st = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (_) {}
  const save = () => { try { st ? localStorage.setItem(KEY, JSON.stringify(st)) : localStorage.removeItem(KEY); } catch (_) {} };
  const hash = () => location.hash || '#/';
  const onHome = () => ['#/', '#', ''].includes(location.hash);
  const count = async s => (await DB.all(s)).length;
  const go = (step, extra = {}) => { st = { ...st, ...extra, step }; save(); draw(); };

  // Ziel je Schritt: Liste aus [Selektor, Text]; der erste sichtbare Treffer gilt. Ohne Selektor: Blase in der Mitte mit Knopf.
  const STEPS = {
    profile: () => [['#profBtn', 'Klicke hier, um dein Profil anzusehen.']],
    fridge: () => hash() === '#/profil' ? [['section.fridge', 'Hier kannst du deine Filme hinzufügen. Tippe auf das Plus und lege einen Film in den Kühlschrank.', '#addFridge']] : [['#profBtn', 'Zurück zum Profil, dort wartet der Filmkühlschrank.']],
    fridgeDone: () => [[null, 'Super, dein erster Film liegt im Kühlschrank.', null, 'Weiter']],
    cabinet: () => hash() === '#/profil'
      ? [['section.cabinet.open .cabtile[href="#/schrank/kameras"]', 'Hier kannst du deine Ausrüstung hinzufügen. Tippe auf „Kameras“.'], ['section.cabinet', 'Hier kannst du deine Ausrüstung hinzufügen. Öffne den Kameraschrank.']]
      : hash() === '#/schrank/kameras' ? [['[data-add="kamera"]', 'Tippe auf das Plus und lege eine Kamera an.']]
      : /^#\/kamera\//.test(hash()) ? [] : [['#profBtn', 'Zurück zum Profil, dort steht der Kameraschrank.']],
    // Neue Kamera: erst Hersteller und Modell eintragen, dann mit dem Haken speichern
    camEdit: () => hash() === '#/kamera/' + st.cam
      ? (st.named ? [['.donebtn', 'Tippe auf den Haken, um die Kamera zu speichern.']] : [['#cf .fld', 'Trag Hersteller und Modell deiner Kamera ein.']])
      : hash() === '#/schrank/kameras' ? [[`a.crow[href="#/kamera/${st.cam}"]`, 'Öffne deine neue Kamera und trag Hersteller und Modell ein.']]
      : hash() === '#/profil' ? [['section.cabinet.open .cabtile[href="#/schrank/kameras"]', 'Tippe auf „Kameras“ und öffne deine neue Kamera.'], ['section.cabinet', 'Öffne den Kameraschrank und tippe deine neue Kamera an.']]
      : [['#profBtn', 'Zurück zum Profil, dort steht deine neue Kamera.']],
    ready: () => onHome() ? [] : homeStep('Super, jetzt bist du bereit, deinen ersten Film in die Kamera zu legen. Tippe hier, um zur Startseite zu gehen.', 'Super, jetzt bist du bereit, deinen ersten Film in die Kamera zu legen. Tippe auf den Pfeil oben links, um zurückzugehen.'),
    load: () => onHome() ? [['.newroll', 'Tippe auf „Film einlegen“ und lege deinen ersten Film ein.']] : homeStep('Zur Startseite, dort legst du den Film ein.'),
    note: () => hash().startsWith('#/bild/') ? [['#note', 'Trag hier eine Beschreibung zu diesem Bild ein.']]
      : hash().startsWith('#/rolle/' + st.roll) ? [['.cell', 'Tippe ein Bild an und füge zumindest eine Beschreibung hinzu.']] : [],
    dev: () => hash().startsWith('#/bild/') ? [['.donebtn', 'Gut. Mit dem Haken geht es zurück zur Rolle.']]
      : hash().startsWith('#/rolle/' + st.roll) ? [['#devSlide', 'Schieb den Regler nach rechts, um den Film in die Entwicklung zu geben.']]
      : onHome() ? [[`[data-dev="${st.roll}"]`, 'Tippe auf „Entwickeln“, um den Film in die Entwicklung zu geben.']] : [],
    scan: () => onHome() ? [[`[data-pickup="${st.roll}"]`, 'Ist der Film entwickelt, lädst du hier die Fotos hoch.']]
      : hash().startsWith('#/rolle/' + st.roll) ? [['#pickupOpen', 'Ist der Film entwickelt, lädst du hier die Fotos hoch.']] : homeStep('Zur Startseite, dort lädst du die Fotos hoch.'),
    album: () => hash().startsWith('#/album/') ? [] : [['.open-album, a.rc-link[href^="#/album/"]', 'Schau dir jetzt dein Fotoalbum an.']],
    end: () => [[null, 'Geschafft! Das ist dein erstes Fotoalbum. Die Einführung ist beendet.', null, 'Fertig']]
  };

  // Wann ist ein Schritt erledigt?
  async function check() {
    if (!st) return;
    const s = st.step;
    if (s === 'profile' && hash() === '#/profil') return go('fridge');
    if (s === 'fridge' && (await DB.all('fridge')).some(e => (e.count || 0) > 0)) return go('fridgeDone');
    if (s === 'cabinet') {
      const fresh = (await DB.all('cameras')).find(c => !(st.camIds || []).includes(c.id));
      if (fresh) return go('camEdit', { cam: fresh.id, named: false });
    }
    if (s === 'camEdit') {
      const c = await DB.get('cameras', st.cam);
      if (!c) return go('cabinet');
      const named = !!((c.maker || '').trim() || ((c.name || '').trim() && c.name.trim() !== 'Neue Kamera'));
      if (named !== st.named) { st.named = named; save(); draw(); }
      // Erledigt erst, wenn die Kamera benannt ist und der Haken zurück ins Profil geführt hat
      if (named && (hash() === '#/profil' || hash().startsWith('#/schrank'))) return go('ready');
    }
    if (s === 'ready' && onHome()) return go('load', { known: (await DB.all('rolls')).map(r => r.id) });
    if (s === 'load') {
      const fresh = (await DB.all('rolls')).find(r => !(st.known || []).includes(r.id));
      if (fresh) return go('note', { roll: fresh.id });
    }
    if (s === 'note' && (await DB.all('frames')).some(f => f.rollId === st.roll && (f.note || '').trim())) return go('dev');
    const roll = st.roll ? await DB.get('rolls', st.roll) : null;
    if (s === 'dev' && roll && (roll.status || 'entwurf') !== 'entwurf') return go('scan');
    if (s === 'scan' && roll && roll.status === 'entwickelt') return go(hash().startsWith('#/album/') ? 'end' : 'album');
    if (s === 'album' && hash().startsWith('#/album/')) return go('end');
  }

  let layer = null, ring = null, bubble = null, cur = null, raf = 0;
  function ensure() {
    if (layer) return;
    layer = document.createElement('div'); layer.className = 'tour'; layer.setAttribute('aria-live', 'polite');
    layer.innerHTML = '<div class="tourring"></div><div class="tourbubble" role="status"><p></p><div class="tourbtns"></div><i class="tourarrow"></i></div>';
    document.body.appendChild(layer);
    ring = layer.querySelector('.tourring'); bubble = layer.querySelector('.tourbubble');
    bubble.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.act === 'skip') { st = null; save(); draw(); return; }
      if (st.step === 'fridgeDone') { DB.all('cameras').then(c => go('cabinet', { camIds: c.map(x => x.id) })); return; }
      if (st.step === 'end') { st = null; save(); draw(); }
    });
  }
  function draw() {
    if (!st || !PROFILE) { if (layer) layer.hidden = true; cur = null; return; }
    ensure();
    const list = (STEPS[st.step] || (() => []))();
    cur = null;
    for (const [sel, text, ring2, btn] of list) {
      if (!sel) { cur = { el: null, text, btn }; break; }
      const el = [...document.querySelectorAll(sel)].find(x => x.offsetParent !== null || x.getClientRects().length);
      if (el) { cur = { el, text, arrowEl: ring2 ? document.querySelector(ring2) : null }; break; }
    }
    if (!cur) { layer.hidden = true; return; }
    layer.hidden = false;
    bubble.querySelector('p').textContent = cur.text;
    bubble.querySelector('.tourbtns').innerHTML = (cur.btn ? `<button type="button" class="btn accent small" data-act="next">${cur.btn}</button>` : '') + (st.step !== 'end' ? '<button type="button" class="tourskip" data-act="skip">Einführung überspringen</button>' : '');
    layer.classList.toggle('center', !cur.el);
    if (typeof I18N !== 'undefined') I18N.apply(layer);
    place();
  }
  function place() {
    raf = 0;
    if (!cur || !layer || layer.hidden) return;
    const blocked = document.querySelector('.modalbg, .loadsheet, .overlay');
    layer.classList.toggle('away', !!blocked);
    if (!cur.el) { ring.style.display = 'none'; bubble.style.left = ''; bubble.style.top = ''; return; }
    if (!cur.el.isConnected) { draw(); return; }
    const r = cur.el.getBoundingClientRect(), pad = 6;
    const round = Math.abs(r.width - r.height) < 6 ? '50%' : getComputedStyle(cur.el).borderRadius || '18px';
    Object.assign(ring.style, { display: 'block', left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px', borderRadius: round === '50%' ? '50%' : `calc(${round} + ${pad}px)` });
    const W = window.innerWidth, H = window.innerHeight, bw = Math.min(300, W - 32);
    bubble.style.width = bw + 'px';
    const bh = bubble.offsetHeight;
    const point = cur.arrowEl && cur.arrowEl.isConnected ? cur.arrowEl.getBoundingClientRect() : r;
    const below = r.bottom + 16 + bh < H - 12 || r.top < bh + 28;
    const top = below ? r.bottom + 16 : r.top - 16 - bh;
    const cx = point.left + point.width / 2;
    const left = Math.max(16, Math.min(W - bw - 16, cx - bw / 2));
    bubble.style.left = left + 'px'; bubble.style.top = Math.max(8, Math.min(H - bh - 8, top)) + 'px';
    bubble.classList.toggle('up', !below);
    bubble.querySelector('.tourarrow').style.left = Math.max(18, Math.min(bw - 18, cx - left)) + 'px';
  }
  const tick = () => { if (!raf) raf = requestAnimationFrame(place); };
  window.addEventListener('scroll', tick, { passive: true, capture: true });
  window.addEventListener('resize', tick);
  window.addEventListener('hashchange', () => setTimeout(() => { check(); draw(); }, 350));
  // Hat sich das passende Ziel geändert (zum Beispiel Schrank aufgeklappt), Blase neu aufbauen
  const pick = () => {
    for (const [sel, text] of (STEPS[st.step] || (() => []))()) {
      if (!sel) return text;
      const el = [...document.querySelectorAll(sel)].find(x => x.offsetParent !== null || x.getClientRects().length);
      if (el) return el;
    }
    return null;
  };
  setInterval(() => {
    if (!st) return;
    check();
    const p = pick();
    if (!cur ? p : (cur.el ? cur.el !== p || !cur.el.isConnected : cur.text !== p)) draw(); else place();
  }, 500);

  return {
    start() { st = { step: 'profile' }; save(); setTimeout(draw, 400); },
    after() { if (st) { check(); draw(); } },
    active: () => !!st
  };
})();
