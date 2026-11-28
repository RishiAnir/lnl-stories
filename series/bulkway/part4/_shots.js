// ---------- Part 4 pieces ----------
// a man of the truck crew: a dark winter shape, a headlamp burning where his face should be
function crewman(c, x, y, s, t, { lamp = 1, dig = 0, ph = 0 } = {}) {
  c.save(); c.translate(x, y); c.scale(s, s);
  const sw = dig ? Math.sin(t * 4 + ph) * 0.5 : 0;
  ell(c, 0, 6, 90, 18, 'rgba(0,0,0,0.35)');
  capsule(c, -26, -300, -30, 0, 30, '#12151C'); capsule(c, 26, -300, 30, 0, 30, '#0E1117');                 // legs
  fillRR(c, -70, -560, 140, 290, 40, '#171B24');                                                            // parka
  capsule(c, -60, -520, -100 + sw * 60, -330 - sw * 80, 24, '#141821'); capsule(c, 60, -520, 100 + sw * 40, -340 + sw * 60, 24, '#141821');
  if (dig) { c.save(); c.translate(100 + sw * 40, -340 + sw * 60); c.rotate(0.6 + sw); fillRR(c, -6, -10, 12, 220, 4, '#3A3226'); fillRR(c, -40, 200, 80, 70, 10, '#5A606B'); c.restore(); }
  ell(c, 0, -620, 62, 68, '#1C2029'); fillRR(c, -66, -700, 132, 60, 26, '#0F1218');                           // head + knit cap
  if (lamp) { ell(c, 0, -640, 16, 12, '#FFF4D0'); c.globalCompositeOperation = 'screen'; const g = c.createRadialGradient(0, -640, 4, 0, -640, 160); g.addColorStop(0, 'rgba(255,240,200,0.8)'); g.addColorStop(1, 'rgba(255,240,200,0)'); c.fillStyle = g; c.fillRect(-160, -800, 320, 320); }
  c.restore();
}
// the keypad by the bay door: amber screen, the light under it (red, then green)
function keypad(c, t, { green = 0, beeps = [] } = {}) {
  c.fillStyle = lit('#555B66', DARK); c.fillRect(0, 0, W, H);
  for (let r = 0; r < 34; r++) for (let k = 0; k < 6; k++) fillRR(c, k * 200 + (r % 2) * 100 - 100 + 4, r * 60 + 4, 192, 52, 4, lit((r * 7 + k) % 3 ? '#5D636F' : '#626875', DARK));
  fillRR(c, 300, 460, 480, 820, 40, '#1E2229'); fillRR(c, 330, 490, 420, 760, 30, '#2A2F38');
  fillRR(c, 380, 540, 320, 120, 14, green ? '#1E3A24' : '#2A1E14');
  c.font = '700 64px "Plex Mono"'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = green ? '#7CF0A0' : '#F2A64A';
  const n = beeps.filter(b => t > b).length; c.fillText(green ? 'OPEN' : '* '.repeat(Math.min(4, n)).trim() || '- - - -', 540, 600);
  for (let r = 0; r < 4; r++) for (let k = 0; k < 3; k++) { const lit_ = beeps.some(b => t > b && t < b + 0.15 && (r * 3 + k) % 4 === beeps.indexOf(b) % 4); fillRR(c, 390 + k * 105, 710 + r * 120, 90, 96, 14, lit_ ? '#8A93A6' : '#4A5160'); c.fillStyle = '#D9DEE8'; c.font = '600 40px Inter'; c.fillText(['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'][r * 3 + k], 435 + k * 105, 760 + r * 120); }
  const col = green ? '#3BE07A' : '#E0473F'; ell(c, 540, 1210, 22, 22, col); c.globalCompositeOperation = 'screen'; const g = c.createRadialGradient(540, 1210, 4, 540, 1210, 160); g.addColorStop(0, rgba(col, 0.8)); g.addColorStop(1, rgba(col, 0)); c.fillStyle = g; c.fillRect(380, 1050, 320, 320); c.globalCompositeOperation = 'source-over';
}
// the bay door's bottom seam from inside: a gap, headlight glare and snow pouring under; pallets of water against it
function seam(c, t, { gap = 0, pallets = 0, slide = 0, hand = 0, cam = 2.2 } = {}) {
  c.save(); camera(c, cam, 760, 1380);
  loadingDock(c, t, DARK);
  if (gap > 0) {
    fillRR(c, 380, 1440 - gap, 760, gap, 0, '#E8EEF8');
    for (let i = 0; i < 26; i++) ell(c, 400 + (i * 61 + t * 40) % 740, 1440 - gap * (0.2 + (i * 0.37) % 0.8), 4, 3, rgba('#FFFFFF', 0.9));
    for (let i = 18; i < 22; i++) { const y = 380 + i * (1060 / 22) - gap; fillRR(c, 380, y, 760, 1060 / 22 - 6, 3, lit(i % 2 ? '#7D8594' : '#747C8B', DARK)); }
    fillRR(c, 380, 1440 - gap - 8, 760, 8, 2, lit('#2E3440', DARK));
    for (let i = 0; i < 18; i++) ell(c, 420 + i * 40, 1446 + (i % 3) * 6, 18 + (i % 4) * 6, 6, rgba('#E9EEF3', 0.6));
  }
  if (hand > 0) { const y = 1440 - gap + 10; capsule(c, 700, y - 30, lerp(700, 820, hand), y + 60 * hand, 30, '#1A1D24'); ell(c, lerp(700, 830, hand), y + 70 * hand, 40, 30, '#22262E'); }
  if (pallets > 0) for (let i = 0; i < 3; i++) {   // pallets of bottled water shoved against the door
    const x = 400 + i * 250 + slide * (i - 1) * 40, y = 1480 + slide * 30, k = clamp(pallets * 3 - i);
    if (k <= 0) continue; c.save(); c.globalAlpha = k; fillRR(c, x, y - 260, 230, 240, 10, lit('#5A8EC9', DARK)); for (let r = 0; r < 4; r++) for (let q = 0; q < 4; q++) ell(c, x + 30 + q * 56, y - 230 + r * 58, 22, 24, lit('#9CC7EE', DARK)); fillRR(c, x - 6, y - 24, 242, 26, 4, lit(P.pallet, DARK)); c.restore();
  }
  c.restore();
  if (gap > 0) { c.save(); c.globalCompositeOperation = 'screen'; const g = c.createRadialGradient(760, 1700, 40, 760, 1700, 1100); g.addColorStop(0, `rgba(255,245,215,${Math.min(0.7, gap / 160)})`); g.addColorStop(1, 'rgba(255,245,215,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H); c.restore(); }
}
function shots() {
  const S = []; const add = (name, t0, draw, o = {}) => S.push(Object.assign({ name, t0, draw }, o));
  const cu = (c, Sp, extra = {}, r = 200, hy = 760) => person(c, Sp, framed(Sp, 540, hy, r, Object.assign({ blink: blinkAt(t_, 5), breathe: breathe(t_, 1), t: t_ }, extra)), GEN);
  let t_ = 0;
  const dark = (c, lt, k = 0.62) => darkness(c, [{ x: 560, y: 1750, ang: -Math.PI / 2 + 0.05, len: 1500, spread: 0.32 }], k);
  const outside = (c, t, k = 'dock_night', o = {}) => { c.drawImage(blurred('bg_' + k + (o.blur || 14), o2 => bg(o2, k, { cam: 1.1 }), o.blur || 14), 0, 0); };
  const flakes = (c, t, a = 0.9) => snow(c, t, { n: 120, alpha: a });
  // 0 · hook: the seam, a crack of headlight under the door
  add('hook', 0, (c, t, lt) => seam(c, t, { gap: 22 + Math.sin(t * 3) * 2, cam: 1.6 }), { title: 1, chip: { time: '2:04', ampm: 'AM', line: 'FINAL PART · NIGHT 2' } });
  const upT = ww('l01', 'inch');
  add('screams', L0('l01') - 0.1, (c, t, lt) => { const g = lerp(24, 70, ss(seg(t, ww('l01', 'screams') - 0.2, upT + 0.2))); c.save(); c.translate(Math.sin(t * 80) * 5 * (g < 69 ? 1 : 0), 0); seam(c, t, { gap: g, cam: 2.0 }); c.restore(); });
  add('who', L0('l02') - 0.1, (c, t, lt) => { t_ = t; c.fillStyle = '#07090D'; c.fillRect(0, 0, W, H); cu(c, DANA, { face: 0.2, look: [0.6, 0.3], brows: -0.6, mouth: talk(t, t > L0('l02') && t < L1('l02')), glasses: 'cord' }, 200); darkness(c, [{ x: 760, y: 1700, ang: -2.0, len: 1500, spread: 0.3 }], 0.62, [{ x: 540, y: 760, r: 420, k: 0.5 }]); });
  const rayFloor = (c, t, extra = {}, r = 175, hx = 540, hy = 780) => person(c, RAY, framed(RAY, hx, hy, r, Object.assign({ hoodDown: true, legs: 'sit', ...BOUND, blink: blinkAt(t, 4), breathe: breathe(t, 1), t }, extra)), GEN);
  add('lot', L0('l03') - 0.1, (c, t, lt) => { c.fillStyle = '#07090D'; c.fillRect(0, 0, W, H); c.save(); camera(c, 1 + lt * 0.015, 540, 780); rayFloor(c, t, { face: -0.1, look: [0.2, 0.2], brows: 0.6, mouth: talk(t, quoteOn('l03', t)) }, 200, 540, 780); c.restore(); darkness(c, [{ x: 860, y: 1700, ang: -2.0, len: 1500, spread: 0.3 }], 0.62); });
  add('truck', L0('l04') - 0.1, (c, t, lt) => { bg(c, 'dock_night', { cam: 1.15 + lt * 0.02, fy: 1100 }); for (const [x, y, s_, ph] of [[300, 1700, 0.75, 0], [780, 1760, 0.8, 1.7], [560, 1620, 0.55, 3.1]]) crewman(c, x, y, s_, t, { dig: 1, ph }); flakes(c, t); }, { raw2: 1 });
  add('barricade', L0('l05') - 0.1, (c, t, lt) => { t_ = t; c.fillStyle = '#07090D'; c.fillRect(0, 0, W, H); cu(c, DANA, { face: -0.1, look: [-0.4, 0.1], brows: -0.8, mouth: talk(t, quoteOn('l05', t)), glasses: 'cord', hold: 'flash', armL: [0.7, 0.9], flashRot: -1.9 }, 205); darkness(c, [{ x: 540, y: 1750, ang: -Math.PI / 2, len: 1500, spread: 0.32 }], 0.6, [{ x: 540, y: 760, r: 460, k: 0.5 }]); });
  add('pallets', L0('l06') - 0.1, (c, t, lt) => {
    c.save(); camera(c, 1.05, 540, 1000); loadingDock(c, t, DARK);
    person(c, MARCUS, { x: 280, y: 1860, s: 1.5, face: 0.4, look: [0.6, 0], brows: -0.3, mouth: 'tight', armL: [1.2, 0.6], armR: [1.2, 0.6], t }, GEN);
    person(c, YOU, { x: 780, y: 1880, s: 1.45, face: -0.4, look: [-0.6, 0.4], brows: 0.4, mouth: 'flat', armL: [0.9, 0.9], armR: [0.9, 0.9], rot: -0.08, t }, GEN);
    c.restore();
    const k = ss(seg(t, ww('l06', 'drag') - 0.2, L1('l06') + 0.6)); for (let i = 0; i < 3; i++) { const x = 330 + i * 160, y = lerp(2100, 1460, clamp(k * 3 - i)); if (k * 3 - i > 0) { fillRR(c, x, y - 180, 150, 170, 8, lit('#5A8EC9', DARK)); fillRR(c, x - 4, y - 14, 158, 18, 3, lit(P.pallet, DARK)); } }
    darkness(c, [{ x: 860, y: 1700, ang: -2.0, len: 1800, spread: 0.34 }], 0.62, [{ x: 540, y: 1300, r: 600, k: 0.5 }]);
  });
  const beeps = () => [ww('l07', 'beeps'), ww('l07', 'once'), ww('l07', 'twice')];
  add('keypad', L0('l07') - 0.1, (c, t, lt) => { c.save(); camera(c, 1 + lt * 0.03, 540, 860); keypad(c, t, { beeps: beeps() }); c.restore(); darkness(c, [], 0.45, [{ x: 540, y: 860, r: 700, k: 0.7 }]); });
  const greenT = ww('l08', 'green');
  add('green', L0('l08') - 0.1, (c, t, lt) => { c.save(); camera(c, 1.25 + lt * 0.03, 540, 700); keypad(c, t, { beeps: beeps(), green: t > greenT - 0.05 }); c.restore(); darkness(c, [], 0.45, [{ x: 540, y: 860, r: 700, k: 0.7 }]); }, { sting: 1 });
  const tornT = ww('l09', 'torn');
  add('torn', L0('l09') - 0.1, (c, t, lt) => {
    c.save(); camera(c, 1 + lt * 0.02, 540, 900); notebook(c, t, GEN, { focus: 0.35, thumb: 0 });
    if (t > tornT - 0.3) { c.fillStyle = '#0B0E13'; c.fillRect(150, 300, 900, 1500); c.fillStyle = '#E9E4D6'; c.beginPath(); c.moveTo(130, 300); for (let y = 300; y <= 1800; y += 40) c.lineTo(150 + (y / 40 % 2) * 26, y); c.lineTo(110, 1800); c.closePath(); c.fill(); }   // only a ragged stub left by the spiral
    c.restore(); darkness(c, [], 0.55, [{ x: 540, y: 900, r: 700, k: 0.8 }]);
  }, { sting: 1 });
  add('swear', L0('l10') - 0.1, (c, t, lt) => { c.fillStyle = '#07090D'; c.fillRect(0, 0, W, H); c.save(); camera(c, 1 + lt * 0.03, 540, 760); rayFloor(c, t, { face: 0, look: [0, 0], brows: 0.9, mouth: talk(t, quoteOn('l10', t), 'tight') }, 210, 540, 760); c.restore(); darkness(c, [{ x: 560, y: 1700, ang: -Math.PI / 2, len: 1500, spread: 0.32 }], 0.6); });
  const handT = ww('l11', 'gloved');
  add('slide', L0('l11') - 0.1, (c, t, lt) => { const g = lerp(70, 180, ss(seg(t, ww('l11', 'rises') - 0.2, ww('l11', 'foot') + 0.3))); c.save(); c.translate(Math.sin(t * 60) * 4, 0); seam(c, t, { gap: g, pallets: 1, slide: ss(seg(t, L0('l11'), ww('l11', 'sliding') + 0.6)), hand: ss(seg(t, handT - 0.2, handT + 0.5)), cam: 1.5 }); c.restore(); }, { tense: 1 });
  add('wayout', L0('l12') - 0.1, (c, t, lt) => { t_ = t; c.fillStyle = '#07090D'; c.fillRect(0, 0, W, H); cu(c, YOU, { face: 0.3, look: [0.6, 0.2], brows: 0.9, mouth: talk(t, quoteOn('l12', t)) }, 205); darkness(c, [{ x: 860, y: 1700, ang: -2.0, len: 1500, spread: 0.3 }], 0.6, [{ x: 540, y: 760, r: 460, k: 0.5 }]); }, { tense: 1 });
  add('hatch', L0('l13') - 0.1, (c, t, lt) => { c.fillStyle = '#07090D'; c.fillRect(0, 0, W, H); rayFloor(c, t, { face: 0, look: [0, -0.9], brows: 0.4, mouth: talk(t, quoteOn('l13', t), 'tight') }, 210, 540, 780); darkness(c, [{ x: 560, y: 1700, ang: -Math.PI / 2, len: 1500, spread: 0.32 }], 0.6); });
  const cutT = ww('l14', 'cut');
  add('cut', L0('l14') - 0.1, (c, t, lt) => {
    if (t < ww('l14', 'then') - 0.1) { t_ = t; c.fillStyle = '#07090D'; c.fillRect(0, 0, W, H); cu(c, DANA, { face: -0.2, look: [-0.5, 0.4], brows: 0.5, blink: 0, mouth: 'tight', glasses: 'cord' }, 200 + lt * 6); darkness(c, [{ x: 540, y: 1750, ang: -Math.PI / 2, len: 1500, spread: 0.32 }], 0.6); return; }
    c.fillStyle = '#0B0E14'; c.fillRect(0, 0, W, H); c.save(); camera(c, 1.1, 540, 900);
    capsule(c, -60, 1260, 560, 940, 92, lit(RAY.shirtS, GEN)); capsule(c, 1140, 1280, 520, 960, 92, lit(RAY.shirt, GEN));
    ell(c, 610, 930, 66, 56, lit(RAY.skin, GEN)); ell(c, 470, 950, 66, 56, lit(RAY.skinS, GEN));
    const snap = ss(seg(t, cutT, cutT + 0.4));
    c.save(); c.translate(540, 940 + snap * 300); c.rotate(-0.15 + snap * 1.4); c.globalAlpha = 1 - snap * 0.6; c.beginPath(); c.arc(0, 0, 100, 0.3, Math.PI * 2 - 0.3); c.lineWidth = 22; c.strokeStyle = '#111318'; c.stroke(); c.restore();
    c.save(); c.translate(lerp(820, 600, ss(seg(t, cutT - 0.5, cutT))), 900); c.rotate(-0.5); fillRR(c, -20, -12, 160, 24, 6, '#C9773A'); fillRR(c, -70, -6, 60, 12, 2, '#D8DDE4'); c.restore();   // the box cutter
    c.restore(); darkness(c, [{ x: 200, y: 200, ang: 0.95, len: 1500, spread: 0.36 }], 0.66);
  });
  // ---- up and out ----
  add('climb', L0('l15') - 0.1, (c, t, lt) => {
    c.save(); camera(c, 1 + lt * 0.02, 560, 700); rackingUp(c, t, DARK); c.restore();
    const k = seg(lt, 0, 3.5), y = lerp(2300, 900, k), reach = Math.sin(t * 5);
    person(c, RAY, { x: 560, y, s: 1.4, hoodDown: true, back: true, armL: [2.8 + reach * 0.2, 0.2], armR: [2.8 - reach * 0.2, 0.2], legs: 'stand', t }, GEN);
    darkness(c, [{ x: 760, y: 1700, ang: -1.75 + lt * 0.05, len: 1900, spread: 0.26 }], 0.66);
  }, { scene: 1 });
  add('crawl', L0('l16') - 0.1, (c, t, lt) => {   // the crawlspace above the racking: joists, ducts, a narrow way forward
    c.fillStyle = '#0A0C11'; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 9; i++) { const k = i / 9, w = lerp(1400, 120, k), y = lerp(1900, 860, k), h = lerp(70, 8, k); fillRR(c, 540 - w / 2, y - (lt * 160 % 120) * (1 - k), w, h, 4, lit('#3A3328', DARK)); fillRR(c, 540 - w / 2, lerp(-20, 820, k), w, h * 0.8, 4, lit('#2C2720', DARK)); }
    fillRR(c, 700, 200, 120, 1500, 50, lit('#6A7282', DARK)); for (let i = 0; i < 12; i++) fillRR(c, 700, 260 + i * 120, 120, 8, 3, lit('#4A5160', DARK));   // a duct
    person(c, RAY, { x: 500, y: 1500, s: 0.9, back: true, hoodDown: true, armL: [1.6, 0.4], armR: [1.4, 0.5], t }, GEN);
    darkness(c, [{ x: 540, y: 1900, ang: -Math.PI / 2, len: 1600, spread: 0.24 }], 0.7);
  }, { tense: 1 });
  add('below', L0('l17') - 0.1, (c, t, lt) => {   // through the grate: the dock floor below, headlamps crawling under the door
    c.save(); camera(c, 1.2, 760, 1250); seam(c, t, { gap: 240, cam: 1 }); c.restore();
    for (let i = 0; i < 4; i++) { const k = seg(lt, i * 0.5, i * 0.5 + 1.4); if (k > 0) crewman(c, lerp(700, 220 + i * 190, k), lerp(1500, 1700, k), 0.6, t, {}); }
    c.strokeStyle = 'rgba(10,12,16,0.85)'; c.lineWidth = 14; for (let x = -40; x < W + 80; x += 110) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); } for (let y = 0; y < H; y += 110) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  }, { tense: 1 });
  const popT = ww('l18', 'pops');
  add('roof', L0('l18') - 0.1, (c, t, lt) => { bg(c, 'roof', { cam: 1.1 + lt * 0.02, fx: 560, fy: 1150 }); if (t > popT) { c.save(); c.globalCompositeOperation = 'screen'; const g = c.createRadialGradient(570, 1150, 20, 570, 1150, 500); g.addColorStop(0, 'rgba(255,220,160,0.55)'); g.addColorStop(1, 'rgba(255,220,160,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H); c.restore(); person(c, RAY, { x: 590, y: 1260, s: 0.55, hoodDown: true, armL: [2.4, 0.3], armR: [2.2, 0.3], rot: -0.1, t }, GEN); } flakes(c, t); }, { scene: 1 });
  add('slidedown', L0('l19') - 0.1, (c, t, lt) => { bg(c, 'dock_night', { cam: 1.05 + lt * 0.02, fy: 1150 }); const k = ss(seg(lt, 0, 1.8)); person(c, YOU, { x: lerp(150, 330, k), y: lerp(1300, 1750, k), s: 0.9, face: 0.4, look: [0.6, 0], brows: 0.6, mouth: 'o', armL: [1.4, 0.4], armR: [1.4, 0.4], rot: lerp(-0.5, 0, k), t }, GEN); for (let i = 0; i < 6; i++) { const ph = (t * 0.6 + i / 6) % 1; ell(c, 500 + i * 12 + ph * 60, 1240 - ph * 200, 20 + ph * 40, 14 + ph * 24, rgba('#C8D0DC', 0.4 * (1 - ph))); } flakes(c, t); }, { scene: 1 });
  const lockT = ww('l20', 'snaps');
  const doorOut = (c, t, lt, { shake = 0, chainK = 1, people = 1 } = {}) => {
    c.save(); c.translate(Math.sin(t * 70) * 8 * shake, 0); bg(c, 'dock_night', { cam: 1.35, fy: 900 });
    if (chainK > 0) { c.save(); c.globalAlpha = chainK; c.strokeStyle = '#8A8E96'; c.lineWidth = 10; c.setLineDash([16, 8]); c.beginPath(); c.moveTo(300, 1150); c.quadraticCurveTo(540, 1260, 780, 1150); c.stroke(); c.setLineDash([]); fillRR(c, 515, 1200, 50, 60, 10, '#C9A23A'); c.restore(); }
    c.restore();
    if (people) { person(c, DANA, { x: 260, y: 1880, s: 1.2, back: true, armL: [1.2, 0.6], armR: [1.4, 0.4], t }, GEN); person(c, YOU, { x: 560, y: 1900, s: 1.25, back: true, armL: [2.2, 0.3], armR: [2.2, 0.3], t }, GEN); person(c, RAY, { x: 840, y: 1880, s: 1.25, back: true, hoodDown: true, armL: [2.2, 0.3], armR: [2.2, 0.3], t }, GEN); }
    flakes(c, t, 0.7);
  };
  add('haul', L0('l20') - 0.1, (c, t, lt) => doorOut(c, t, lt, { chainK: seg(t, ww('l20', 'wraps') - 0.2, lockT) }));
  const fists = () => [ww('l21', 'fists'), ww('l21', 'hammer'), ww('l21', 'door'), ww('l21', 'trapped')];
  add('trapped', L0('l21') - 0.1, (c, t, lt) => { let sh = 0; for (const f of fists()) if (t > f) sh = Math.max(sh, Math.exp(-(t - f) * 8)); doorOut(c, t, lt, { shake: sh, people: 0 }); }, { tense: 1 });
  add('marcus', L0('l22') - 0.1, (c, t, lt) => { outside(c, t); const look = Math.sin(lt * 1.6); person(c, DANA, framed(DANA, 300, 760, 120, { face: look * 0.5, look: [look, 0], brows: 0.6, glasses: 'cord', t }), GEN); person(c, YOU, framed(YOU, 560, 720, 125, { face: -look * 0.5, look: [-look, 0], brows: 0.8, t }), GEN); person(c, RAY, framed(RAY, 820, 770, 118, { hoodDown: true, face: 0.3, look: [0.5, 0.2], brows: 0.5, t }), GEN); flakes(c, t, 0.6); });
  add('crack', L0('l23') - 0.1, (c, t, lt) => {   // under the door from outside: headlamp light, boots, and a strip of yellow hi-vis
    bg(c, 'dock_night', { cam: 2.6, fy: 1100, fx: 540 }); c.fillStyle = '#0A0C10'; c.fillRect(0, 1180, W, 120);
    c.fillStyle = '#F4E8C2'; c.fillRect(0, 1205, W, 70);
    for (const [x, col] of [[300, '#14171E'], [380, '#14171E'], [640, '#2F3644'], [720, '#2F3644']]) fillRR(c, x, 1210, 50, 65, 8, col);
    c.save(); c.beginPath(); c.rect(0, 1205, W, 70); c.clip(); fillRR(c, 600, 1150, 180, 80, 10, lit(P.hivis, FULL)); fillRR(c, 600, 1195, 180, 10, 3, '#D7DDE3'); c.restore();
    darkness(c, [], 0.5, [{ x: 540, y: 1240, r: 700, k: 0.7 }]); flakes(c, t, 0.4);
  }, { sting: 1 });
  add('page', L0('l24') - 0.1, (c, t, lt) => {
    c.fillStyle = '#0C0E14'; c.fillRect(0, 0, W, H); c.save(); camera(c, 1.6 + lt * 0.03, 540, 1150);
    person(c, MARCUS, framed(MARCUS, 540, 560, 150, { face: 0.3, look: [0.6, 0.2], brows: -0.2, mouth: 'tight', t }), GEN);
    c.save(); c.translate(470, 1080); c.rotate(-0.25); fillRR(c, 0, 0, 90, 120, 4, '#EDE7D8'); c.strokeStyle = '#B8B0A0'; c.beginPath(); c.moveTo(0, 0); for (let x = 0; x <= 90; x += 10) c.lineTo(x, (x / 10) % 2 ? 6 : 0); c.stroke(); for (let r = 0; r < 4; r++) fillRR(c, 10, 30 + r * 20, 70, 2, 1, 'rgba(90,120,170,0.5)'); c.restore();
    c.restore(); darkness(c, [{ x: 900, y: 1500, ang: -2.4, len: 1400, spread: 0.3 }], 0.55, [{ x: 540, y: 1150, r: 500, k: 0.6 }]);
  }, { sting: 1 });
  add('cracks', L0('l25') - 0.1, (c, t, lt) => { t_ = t; outside(c, t); c.fillStyle = 'rgba(5,8,14,0.45)'; c.fillRect(0, 0, W, H); cu(c, DANA, { face: 0.1, look: [0.2, 0.5], brows: 0.95, blink: 0.3, mouth: talk(t, quoteOn('l25', t), 'flat'), glasses: 'cord' }, 205); flakes(c, t, 0.5); });
  add('saw', L0('l26') - 0.1, (c, t, lt) => { outside(c, t); c.fillStyle = 'rgba(5,8,14,0.45)'; c.fillRect(0, 0, W, H); person(c, RAY, framed(RAY, 540, 760, 205, { hoodDown: true, face: -0.1, look: [-0.3, 0.2], brows: 0.3, blink: blinkAt(t, 4), mouth: talk(t, quoteOn('l26', t), 'tight'), t }), GEN); flakes(c, t, 0.5); });
  // ---- dawn ----
  const police = (c, t, k = 1) => { const on = Math.floor(t * 3) % 2; c.save(); c.globalCompositeOperation = 'screen'; for (const [x, y] of [[430, 530], [570, 520], [700, 520], [830, 545]]) { const g = c.createRadialGradient(x, y, 2, x, y, 160); const col = on ? '255,60,60' : '60,120,255'; g.addColorStop(0, `rgba(${col},${0.8 * k})`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.fillRect(x - 160, y - 160, 320, 320); } c.restore(); };
  const sign = c => { c.save(); c.font = '400 54px "Archivo Black"'; c.fillStyle = '#2A3140'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('BULKWAY', 540, 432); c.restore(); };
  add('dawn', L0('l27') - 0.1, (c, t, lt) => { bg(c, 'dawn', { cam: 1.25 - lt * 0.02, fy: 700 }); c.save(); c.translate(540, 700); c.scale(1.25 - lt * 0.02, 1.25 - lt * 0.02); c.translate(-540, -700); sign(c); police(c, t); c.restore(); }, { scene: 1, chip: { time: '6:41', ampm: 'AM', line: 'MORNING' } });
  add('plow', L0('l28') - 0.1, (c, t, lt) => { bg(c, 'dawn', { cam: 1 + lt * 0.02, fy: 900 }); c.save(); c.translate(540, 900); c.scale(1 + lt * 0.02, 1 + lt * 0.02); c.translate(-540, -900); sign(c); police(c, t); c.restore(); });
  add('cuffs', L0('l29') - 0.1, (c, t, lt) => {
    bg(c, 'dock_night', { cam: 1.2, fy: 1000 }); c.fillStyle = 'rgba(255,190,150,0.18)'; c.fillRect(0, 0, W, H); police(c, t, 0.6);
    for (let i = 0; i < 3; i++) crewman(c, 180 + i * 160, 1750, 0.62, t, { lamp: 0 });
    const mk = ss(seg(t, ww('l29', 'marcus') - 0.3, ww('l29', 'marcus') + 0.4));
    person(c, MARCUS, { x: lerp(1200, 820, mk), y: 1880, s: 1.35, face: -0.3, look: [-0.2, 1], brows: 0.6, mouth: 'tight', armL: [-0.2, -0.3], armR: [-0.2, -0.3], t }, GEN);
  });
  add('hedid', L0('l30') - 0.1, (c, t, lt) => { c.drawImage(blurred('bg_dawn14', o2 => bg(o2, 'dawn', { cam: 1.3, fy: 900 }), 14), 0, 0); const pt = ss(seg(t, ww('l30', 'points') - 0.2, ww('l30', 'points') + 0.2)); person(c, DANA, framed(DANA, 320, 780, 150, { face: 0.4, look: [0.7, 0.1], brows: 0.2, mouth: talk(t, quoteOn('l30', t), 'smile'), glasses: 'cord', armR: [lerp(0.1, 1.5, pt), lerp(0.1, 0.1, pt)], t }), FULL); person(c, RAY, framed(RAY, 780, 800, 150, { hoodDown: true, face: -0.3, look: [-0.5, 0.2], brows: lerp(0.3, -0.2, pt), mouth: pt > 0.5 ? 'smile' : 'flat', blink: blinkAt(t, 4), t }), FULL); });
  const openT = ww('l31', 'slide');
  add('doors', L0('l31') - 0.1, (c, t, lt) => {
    const cam = lerp(2.4, 3.2, ss(seg(lt, 0, 4))); c.save(); c.translate(532, 600); c.scale(cam, cam); c.translate(-532, -600); bg(c, 'dawn'); sign(c);
    const k = ss(seg(t, openT - 0.2, openT + 1.4)); c.fillStyle = '#FFE9C4'; c.fillRect(532 - 52 * k, 566, 104 * k, 58);   // light inside as the glass doors part
    c.restore(); SO_glow(c, 532, 620, k);
  }, { sting: 1 });
  const endT = L1('l31') + 2.4;
  add('fin', L1('l31') + 1.6, (c, t, lt) => { c.fillStyle = '#000'; c.fillRect(0, 0, W, H); });
  add('end', endT, (c, t, lt) => endCard(c, seg(lt, 0.7, 1.3)));
  return { S, endT, upT, beeps: beeps(), greenT, tornT, handT, cutT, popT, lockT, fists: fists(), openT };
}
function SO_glow(c, x, y, k) { if (k <= 0) return; c.save(); c.globalCompositeOperation = 'screen'; const g = c.createRadialGradient(x, y, 10, x, y, 900); g.addColorStop(0, `rgba(255,230,190,${0.45 * k})`); g.addColorStop(1, 'rgba(255,230,190,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H); c.restore(); }

