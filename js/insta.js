/* v227: Instagram-Beitrag testen. Fotos einer Rolle wählen, die Reihenfolge durch Ziehen ändern
   und die Bildfolge wie ein Karussell durchblättern (wischen oder links und rechts antippen).
   Gespeichert in „meta“ unter igpost:<Rollen-ID>, damit die Reihenfolge beim nächsten Öffnen noch da ist. */
const INSTA_IC = '<svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3.5" width="14" height="15" rx="2"/><path d="M2.5 6v10M21.5 6v10"/><circle cx="9.5" cy="21" r=".6" fill="currentColor"/><circle cx="12" cy="21" r=".6" fill="currentColor"/><circle cx="14.5" cy="21" r=".6" fill="currentColor"/></svg>';
const IG_MAX = 20;
// v231: Instagram erlaubt laut den Anleitungen von 2026 1,91:1 bis 3:4 (3:4 neu, 1080 × 1440). Alle Bilder eines Beitrags bekommen dasselbe Format.
const IG_RATIOS = [['34', '3:4', 3 / 4], ['45', '4:5', 4 / 5], ['11', '1:1', 1], ['191', '1,91:1', 1.91]];

async function openInstaPost(rollId) {
  const key = 'igpost:' + rollId;
  const saved = (await DB.get('meta', key)) || { id: key, ids: [], ratio: '45' };
  const d = await albumData(rollId);
  const byId = new Map(d.frames.filter(f => f.imgId).map(f => [f.id, f]));
  saved.ids = (saved.ids || []).filter(id => byId.has(id));
  if (!byId.size) { U.toast('Noch keine Fotos im Album'); return; }
  const pick = () => openStoryPicker(rollId, async ids => { saved.ids = ids; await DB.put('meta', saved); arrange(); }, { max: IG_MAX, preset: saved.ids.length ? saved.ids : null });
  if (!saved.ids.length) { pick(); return; }
  arrange();

  async function arrange() {
    document.querySelector('.igov')?.remove();
    const frames = saved.ids.map(id => byId.get(id));
    const own = [], thumb = new Map();
    await Promise.all(frames.map(async f => { const rec = await DB.get('images', f.imgId); const b = rec && U.recBlob(rec, true); if (b) { const u = URL.createObjectURL(b); own.push(u); thumb.set(f.id, u); } }));
    let cur = 0;
    const who = (typeof PROFILE !== 'undefined' && PROFILE?.name) || '';
    const ov = document.createElement('div'); ov.className = 'cspv igov';
    ov.innerHTML = `<div class="igwrap">
        <div class="igphone">
          <div class="ighead"><span class="igav">${U.esc((who[0] || '·').toUpperCase())}</span><b>${U.esc(who)}</b></div>
          <div class="igview" id="igView"><div class="igtrack" id="igTrack"></div><span class="igcount" id="igCount"></span></div>
          <div class="igdots" id="igDots"></div>
        </div>
        <div class="iggrid" id="igGrid"></div>
      </div>
      <div class="matchbar"><button type="button" class="btn ghost small" id="igPick">Bilder wählen</button><span class="sub2" id="igN"></span></div>
      <div class="cspvfoot"><button class="closex" id="igX" aria-label="Schließen">${ART.x}</button>
      <div class="seggroup cspvfmt igratio" role="group" aria-label="Seitenverhältnis">${IG_RATIOS.map(([k, l]) => `<button type="button" class="seg" data-ig="${k}">${l}</button>`).join('')}</div>
      <button class="cspvshare" id="igShare" aria-label="Bilder in dieser Reihenfolge teilen">${SHARE_IC}</button></div>`;
    document.body.appendChild(ov);
    const $ = s => ov.querySelector(s);
    const close = () => { ov.remove(); setTimeout(() => own.forEach(u => URL.revokeObjectURL(u)), 1000); };
    const save = () => DB.put('meta', saved);

    // Vorschau: Karussell
    const drawView = () => {
      const r = IG_RATIOS.find(x => x[0] === saved.ratio) || IG_RATIOS[0];
      $('#igView').style.aspectRatio = String(r[2]);
      ov.querySelectorAll('[data-ig]').forEach(b => b.classList.toggle('on', b.dataset.ig === saved.ratio));
      $('#igTrack').innerHTML = saved.ids.map(id => `<img src="${thumb.get(id) || ''}" alt="" draggable="false">`).join('');
      $('#igDots').innerHTML = saved.ids.length > 1 ? saved.ids.map((_, i) => `<i data-i="${i}"></i>`).join('') : '';
      go(Math.min(cur, saved.ids.length - 1), false);
    };
    const go = (i, anim = true) => {
      cur = Math.max(0, Math.min(saved.ids.length - 1, i));
      const t = $('#igTrack'); t.style.transition = anim ? '' : 'none'; t.style.transform = `translateX(${-cur * 100}%)`;
      $('#igCount').textContent = saved.ids.length > 1 ? `${cur + 1}/${saved.ids.length}` : '';
      ov.querySelectorAll('#igDots i').forEach((x, k) => x.classList.toggle('on', k === cur));
      ov.querySelectorAll('.igt').forEach((x, k) => x.classList.toggle('cur', k === cur));
    };
    // Wischen und Tippen in der Vorschau
    const view = $('#igView');
    let sw = null;
    view.addEventListener('pointerdown', e => { sw = { x: e.clientX, y: e.clientY, w: view.clientWidth, dx: 0 }; view.setPointerCapture(e.pointerId); $('#igTrack').style.transition = 'none'; });
    view.addEventListener('pointermove', e => {
      if (!sw) return; sw.dx = e.clientX - sw.x;
      const edge = (cur === 0 && sw.dx > 0) || (cur === saved.ids.length - 1 && sw.dx < 0);
      $('#igTrack').style.transform = `translateX(calc(${-cur * 100}% + ${edge ? sw.dx / 3 : sw.dx}px))`;
    });
    const end = e => {
      if (!sw) return; const { dx, w, x } = sw; sw = null;
      if (Math.abs(dx) > w * 0.18) go(cur + (dx < 0 ? 1 : -1));
      else if (Math.abs(dx) < 6) { const r = view.getBoundingClientRect(); go(cur + (x - r.left > r.width / 2 ? 1 : -1)); }
      else go(cur);
    };
    view.addEventListener('pointerup', end); view.addEventListener('pointercancel', end);

    // Kacheln: Ziehen ändert die Reihenfolge, Antippen zeigt das Bild in der Vorschau
    const drawGrid = () => {
      $('#igGrid').innerHTML = saved.ids.map((id, i) => `<div class="igt" data-id="${id}"><img src="${thumb.get(id) || ''}" alt="" draggable="false"><span>${i + 1}</span></div>`).join('');
      $('#igN').textContent = `${saved.ids.length} ${saved.ids.length === 1 ? 'Bild' : 'Bilder'}`;
    };
    const grid = $('#igGrid');
    let dr = null;
    grid.addEventListener('pointerdown', e => {
      const t = e.target.closest('.igt'); if (!t) return;
      dr = { t, x: e.clientX, y: e.clientY, on: false }; t.setPointerCapture(e.pointerId);
    });
    grid.addEventListener('pointermove', e => {
      if (!dr) return;
      const dx = e.clientX - dr.x, dy = e.clientY - dr.y;
      if (!dr.on) {
        if (Math.hypot(dx, dy) < 6) return;
        dr.on = true; dr.t.classList.add('drag'); U.haptic && U.haptic(8);
      }
      dr.t.style.transform = `translate(${dx}px, ${dy}px) scale(1.08)`;
      // Ziel unter dem Finger suchen und die Kachel dort einsortieren
      dr.t.style.pointerEvents = 'none';
      const over = document.elementFromPoint(e.clientX, e.clientY)?.closest('.igt');
      dr.t.style.pointerEvents = '';
      if (over && over !== dr.t) {
        const before = dr.t.getBoundingClientRect();
        const tiles = [...grid.children], a = tiles.indexOf(dr.t), b = tiles.indexOf(over);
        grid.insertBefore(dr.t, a < b ? over.nextSibling : over);
        // Versatz ausgleichen, damit die Kachel unter dem Finger bleibt
        const after = dr.t.getBoundingClientRect();
        dr.x += after.left - before.left; dr.y += after.top - before.top;
        dr.t.style.transform = `translate(${e.clientX - dr.x}px, ${e.clientY - dr.y}px) scale(1.08)`;
        [...grid.children].forEach((x, k) => { x.querySelector('span').textContent = k + 1; });
        U.haptic && U.haptic(6);
      }
    });
    const drop = async () => {
      if (!dr) return; const { t, on } = dr; dr = null;
      if (!on) { go([...grid.children].indexOf(t)); return; }
      t.classList.remove('drag'); t.style.transform = '';
      saved.ids = [...grid.children].map(x => x.dataset.id);
      cur = Math.max(0, saved.ids.indexOf(t.dataset.id));
      await save(); drawView(); go(cur, false);
    };
    grid.addEventListener('pointerup', drop); grid.addEventListener('pointercancel', drop);

    ov.querySelectorAll('[data-ig]').forEach(b => b.onclick = async () => { saved.ratio = b.dataset.ig; await save(); drawView(); });
    $('#igPick').onclick = () => { close(); pick(); };
    $('#igX').onclick = close;
    $('#igShare').onclick = async e => {
      const btn = e.currentTarget; FEEL && FEEL.burst && FEEL.burst(btn);
      const files = [];
      for (const [i, id] of saved.ids.entries()) {
        const rec = await DB.get('images', byId.get(id).imgId); const b = rec && U.recBlob(rec, false);
        if (b) files.push(new File([b], `${String(i + 1).padStart(2, '0')}.jpg`, { type: b.type || 'image/jpeg' }));
      }
      if (navigator.canShare && navigator.canShare({ files })) {
        try { await navigator.share({ files }); return; } catch (err) { if (err && err.name === 'AbortError') return; }
      }
      files.forEach((f, i) => setTimeout(() => { const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 30000); }, i * 400));
    };
    window.addEventListener('hashchange', close, { once: true });
    drawGrid(); drawView();
  }
}
