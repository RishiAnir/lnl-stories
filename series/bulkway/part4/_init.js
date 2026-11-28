export async function init(ctx, q = new URLSearchParams()) {
  const NOSUB = q.get('nosub') === '1', NOGLOW = q.get('noglow') === '1';
  const [timing, lines] = await Promise.all([new URL('./voices/timing.json', import.meta.url), new URL('./lines.json', import.meta.url)].map(u => fetch(u).then(r => r.json())));
  build(timing, lines);
  const K = shots(); const S = K.S;
  window.DUR = Math.round((K.endT + 0.7 + 4.67) * 30) / 30;
  // ---- sound events for mix.py ----
  const cut = n => S.find(s => s.name === n).t0;
  const ev = [{ t: LEAD, type: 'vo', file: 'voices/narration.wav' }];
  for (const id of IDS) ev.push({ t: L0(id), type: 'line', id, t1: L1(id) });
  ev.push({ t: K.fallT + 0.5, type: 'whoosh' }, { t: cut('wait'), type: 'thud' });
  ev.push({ t: cut('monitor'), type: 'static' }, { t: ww('l04', 'snags') + 0.1, type: 'thud' }, { t: L0('l04') + 0.5, type: 'click' });
  ev.push({ t: L0('l06'), type: 'radio' }, { t: ww('l07', 'cinch'), type: 'zip' });
  ev.push({ t: K.tickT, type: 'tick' });
  for (const k of K.K) ev.push({ t: k, type: 'knock' });
  ev.push({ t: ww('l17', 'metal'), type: 'scream' });
  const rev = ww('l18', 'they');
  ev.push({ t: rev, type: 'reveal' }, { t: rev, type: 'boom' });
  ev.push({ t: K.endT, type: 'silence' }, { t: K.endT + 0.7, type: 'hit' });
  for (const s of S) ev.push({ t: s.t0, type: 'cut', name: s.name });
  window.EV = ev.sort((a, b) => a.t - b.t);
  window.CUES = IDS.map(id => ({ t0: L0(id), t1: L1(id) + 0.2, text: LINES[id].spoken }));
  let texts = [];
  window.render = t => {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none';
    let i = S.length - 1; while (i > 0 && S[i].t0 > t) i--;
    const sh = S[i];
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    for (const k in LAMP) delete LAMP[k];
    ctx.save(); const r = sh.draw(ctx, t, t - sh.t0) || []; ctx.restore();
    texts = [...r];
    if (sh.name !== 'end') {
      if (!NOGLOW) glow(ctx, 0.5);
      vignette(ctx, 0.36);
      if (sh.title) titleTop(ctx, TITLE, PART, clamp(1 - seg(t, L1('l01') - 0.3, L1('l01') + 0.2)));
      if (sh.chip) { const from = sh.chip.from ? sh.chip.from() : sh.t0; const k = ss(seg(t, from, from + 0.3)); timeChip(ctx, t, Object.assign({}, sh.chip, { k: sh.title ? 1 : k, y: sh.title ? 360 : 330 })); }
      const cp = NOSUB ? null : capAt(t); if (cp) caption(ctx, cp.words, cp.k);
    }
  };
  window.TEXTS = t => { window.render(t); return texts; };
}
