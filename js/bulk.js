/* v262: Bulk Loading. Meterware liegt als eigener Eintrag im Filmkühlschrank (format 'bulk', lengthM, usedM).
   „Patrone spulen“ zieht die Länge ab und legt die Patronen als Vorrat in den Kühlschrank (spooled, exposures).
   Rechnung: 38 mm je Bild (Kleinbild 36 mm plus Steg) plus eine einstellbare Zugabe für Anfang und Ende.
   Mit 28 cm Zugabe braucht eine 36er-Patrone rund 1,65 m, aus 30,5 m werden 18 Patronen. */
const BULK = (() => {
  const IC = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="12" r="7.5"/><circle cx="10" cy="12" r="2"/><path d="M10 4.5v3M10 16.5v3M2.5 12h3M14.5 12h3"/><path d="M15.5 17.2c2 1.6 4.4 2.3 6.5 2.3"/></svg>';
  const FRAME_M = 0.038;
  const extraCm = () => { try { const v = parseFloat(localStorage.getItem('kb-bulk-extra')); return v >= 0 && v <= 100 ? v : 28; } catch (_) { return 28; } };
  const need = (frames, cm = extraCm()) => frames * FRAME_M + cm / 100;
  const totalM = e => (e.lengthM || 0) * Math.max(1, e.count || 1);
  const restM = e => Math.max(0, Math.round((totalM(e) - (e.usedM || 0)) * 1000) / 1000);
  const fmtM = m => (Math.round(m * 10) / 10).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' m';
  const fits = (e, frames = 36) => Math.floor((restM(e) + 1e-6) / need(frames));
  const restText = e => { const n = fits(e); return n > 0 ? `reicht für ${n} × 36` : 'aufgebraucht'; };
  const defLen = id => { const l = SEED_BULK[id] || [30.5]; return l.includes(30.5) ? 30.5 : l[0]; };
  const CART = '<svg viewBox="0 0 32 40" aria-hidden="true"><rect x="12" y="1" width="8" height="5" rx="1.5" fill="currentColor" opacity=".7"/><rect x="5" y="5" width="22" height="31" rx="4" fill="currentColor"/><rect x="5" y="12" width="22" height="13" fill="rgba(0,0,0,.28)"/><rect x="12" y="35" width="8" height="4" rx="1.5" fill="currentColor" opacity=".7"/></svg>';

  // Belohnung nach dem Spulen: die Rolle dreht sich, der Film läuft in die Patrone, die Patronen ploppen einzeln auf
  function celebrate(n, frames, after) {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const show = Math.min(n, 12);
    const ov = document.createElement('div'); ov.className = 'spoolfx'; ov.setAttribute('role', 'status');
    // v264: Tageslichtlader mit Kurbel, das Zählwerk läuft bis zur Bildzahl, die Patronen erscheinen rechts daneben
    const T = reduce ? 0 : 1800;
    ov.innerHTML = `<div class="spscene" aria-hidden="true">
        <svg class="sploader" viewBox="60 90 232 160">
          <rect x="70" y="100" width="200" height="140" rx="22" fill="var(--solid)" stroke="currentColor" stroke-width="4"/>
          <circle cx="150" cy="170" r="46" fill="var(--bg)" stroke="currentColor" stroke-width="3"/>
          <g class="spwin"><circle cx="150" cy="170" r="30" fill="none" stroke="currentColor" stroke-width="12" stroke-dasharray="20 11.4" opacity=".55"/><circle cx="150" cy="170" r="7" fill="currentColor"/></g>
          <rect x="206" y="112" width="50" height="30" rx="6" fill="var(--bg)" stroke="currentColor" stroke-width="2"/>
          <svg x="206" y="112" width="50" height="30" viewBox="0 0 50 30"><g class="spdigits" style="--n:${frames};animation-timing-function:steps(${frames})" font-size="19" font-weight="700" font-family="ui-monospace, Menlo, monospace" text-anchor="middle" fill="currentColor">${Array.from({ length: frames + 1 }, (_, i) => `<text x="25" y="${22 + i * 24}">${String(i).padStart(2, '0')}</text>`).join('')}</g></svg>
          <g class="spcrank"><path d="M236 170h34" stroke="currentColor" stroke-width="7" stroke-linecap="round"/><circle cx="270" cy="170" r="9" fill="currentColor"/><circle cx="236" cy="170" r="8" fill="currentColor"/></g>
        </svg>
        <div class="sprow">${Array.from({ length: show }, (_, i) => `<span class="spc" style="animation-delay:${T + 100 + i * 150}ms">${CART}</span>`).join('')}${n > show ? `<b class="spmore">+${n - show}</b>` : ''}</div>
      </div>
      <p class="sptext"><b id="spN">0</b> ${n === 1 ? 'Patrone' : 'Patronen'} · ${frames} Bilder</p>`;
    document.body.appendChild(ov);
    const num = ov.querySelector('#spN');
    const timers = [];
    for (let i = 1; i <= n; i++) {
      const at = reduce ? 0 : T + 100 + Math.min(i - 1, show - 1) * 150;
      timers.push(setTimeout(() => { num.textContent = i; if (i <= show) U.haptic && U.haptic(12); }, at));
    }
    const total = reduce ? 1200 : T + 100 + show * 150 + 1300;
    let gone = false;
    const done = () => { if (gone) return; gone = true; timers.forEach(clearTimeout); ov.classList.add('out'); setTimeout(() => { ov.remove(); after && after(); }, 260); };
    timers.push(setTimeout(() => { U.haptic && U.haptic([14, 40, 14, 40, 30]); if (window.FEEL) FEEL.burst(ov.querySelector('.sptext')); }, total - 1200));
    timers.push(setTimeout(done, total));
    ov.addEventListener('click', done);
  }

  async function open(entry) {
    const st = await DB.get('stocks', entry.stockId);
    let frames = 36, n = 1;
    try { const f = parseInt(localStorage.getItem('kb-bulk-frames')); if (f > 0 && f < 100) frames = f; } catch (_) {}
    const ov = document.createElement('div'); ov.className = 'modalbg';
    ov.innerHTML = `<div class="modal bulkmodal" role="dialog" aria-modal="true" aria-label="Patronen spulen">
        <div class="frslot"><span class="frslotart">${await filmArt(st, 40)}</span><span class="frslottxt"><b>${U.esc(st ? U.stockLabel(st) : 'Unbekannter Film')}</b><span class="frowchips"><span>Meterware</span><span>ISO ${U.esc(st?.isoLabel || st?.boxIso || '?')}</span></span></span>
          <button type="button" class="roundic small" id="bkEdit" aria-label="Eintrag bearbeiten"><svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3z"/><path d="M14.5 6.5l3 3"/></svg></button></div>
        <div class="bulkrest"><span class="bulkbar big"><i id="bkBar"></i><em id="bkTake"></em></span><span class="sub2" id="bkRest"></span></div>
        <div class="fld"><span>Bilder je Patrone</span><div class="chips" id="bkF">${[12, 24, 36].map(x => `<button type="button" class="chip" data-f="${x}">${x}</button>`).join('')}<input type="number" id="bkFN" min="1" max="99" inputmode="numeric" class="chip-input" aria-label="Freie Bildzahl"></div></div>
        <div class="frgrid">
          <div class="fld"><span>Patronen</span><div class="stepper"><button type="button" id="bkMinus" aria-label="weniger">−</button><span id="bkN">1</span><button type="button" id="bkPlus" aria-label="mehr">+</button></div></div>
          <label class="fld"><span>Zugabe (cm)</span><input id="bkExtra" inputmode="decimal" value="${String(extraCm()).replace('.', ',')}"></label>
        </div>
        <p class="hint" id="bkHint"></p>
        <div class="modalfoot"><button class="closex" id="bkNo" aria-label="Abbrechen">${ART.x}</button><button class="okbtn" id="bkOk" aria-label="Spulen">${ART.check}</button></div>
      </div>`;
    document.body.appendChild(ov);
    const $ = id => ov.querySelector('#' + id);
    const close = () => ov.remove();
    const cm = () => { const v = parseFloat($('bkExtra').value.replace(',', '.')); return v >= 0 && v <= 100 ? v : 28; };
    const max = () => Math.floor((restM(entry) + 1e-6) / need(frames, cm()));
    const paint = () => {
      const m = max(); n = Math.max(m ? 1 : 0, Math.min(n, m));
      const take = n * need(frames, cm()), rest = restM(entry), tot = Math.max(.1, totalM(entry));
      ov.querySelectorAll('#bkF .chip').forEach(c => c.classList.toggle('on', +c.dataset.f === frames));
      if (document.activeElement !== $('bkFN')) $('bkFN').value = [12, 24, 36].includes(frames) ? '' : frames;
      $('bkN').textContent = n;
      $('bkBar').style.width = Math.round((rest - take) / tot * 100) + '%';
      $('bkTake').style.left = Math.round((rest - take) / tot * 100) + '%'; $('bkTake').style.width = Math.round(take / tot * 100) + '%';
      $('bkRest').textContent = `${fmtM(rest)} von ${fmtM(totalM(entry))}`;
      $('bkHint').textContent = m ? `${fmtM(take)} · danach bleiben ${fmtM(rest - take)} · höchstens ${m} ${m === 1 ? 'Patrone' : 'Patronen'}` : 'Der Rest reicht für diese Bildzahl nicht mehr.';
      $('bkOk').disabled = !n; $('bkPlus').disabled = n >= m; $('bkMinus').disabled = n <= 1;
    };
    $('bkF').addEventListener('click', e => { const c = e.target.closest('.chip'); if (!c) return; frames = +c.dataset.f; $('bkFN').value = ''; paint(); });
    $('bkFN').addEventListener('input', e => { const v = parseInt(e.target.value); if (v > 0 && v < 100) { frames = v; paint(); } });
    $('bkExtra').addEventListener('input', paint);
    $('bkMinus').onclick = () => { n--; paint(); };
    $('bkPlus').onclick = () => { n++; U.haptic && U.haptic(6); paint(); };
    $('bkNo').onclick = close;
    ov.addEventListener('click', e => { if (e.target === ov) close(); });
    $('bkEdit').onclick = () => { close(); openFridgeModal(entry); };
    $('bkOk').onclick = async () => {
      if (!n) return;
      $('bkOk').disabled = true;
      const c = cm();
      try { localStorage.setItem('kb-bulk-extra', String(c)); localStorage.setItem('kb-bulk-frames', String(frames)); } catch (_) {}
      const fresh = (await DB.get('fridge', entry.id)) || entry;
      fresh.usedM = Math.round(((fresh.usedM || 0) + n * need(frames, c)) * 1000) / 1000;
      await DB.put('fridge', fresh);
      const all = await DB.all('fridge');
      let cart = all.find(x => x.spooled && x.fromBulk === fresh.id && x.exposures === frames && x.stockId === fresh.stockId);
      if (cart) { cart.count = (cart.count || 0) + n; cart.bought = (cart.bought || 0) + n; }
      else cart = { id: U.uid(), stockId: fresh.stockId, format: '135', count: n, bought: n, exposures: frames, spooled: true, fromBulk: fresh.id, boughtAt: fresh.boughtAt || U.today(), expiresAt: fresh.expiresAt || null, price: null };
      await DB.put('fridge', cart);
      const stat = (await DB.get('meta', 'bulkstats')) || { id: 'bulkstats', spooled: 0 };
      stat.spooled = (stat.spooled || 0) + n; await DB.put('meta', stat);
      close();
      celebrate(n, frames, () => { route(); });
    };
    paint();
  }
  return { IC, open, restM, totalM, fmtM, restText, fits, need, defLen, celebrate };
})();
