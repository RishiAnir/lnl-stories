// BULKWAY — Part 2 "The Nest" (rework). The narration track (voices/narration.wav: Chatterbox lines laid end to end by
// voice.py) sets the clock; shots cut on its word times from voices/timing.json.
// Captions run continuously: every spoken word, 1-3 words at a time; the Caption column's **keywords** turn orange.
// glow(): light sources bloom softly on top of the flat palette (no recolouring).
import { P, W, H, FULL, GEN, DARK, clamp, lerp, seg, ss, eo, camera, blinkAt, breathe, vignette, rgba, fillRR, ell, darkness, glow } from '../assets/kit.js';
import { person, YOU, DANA, MARCUS, stranger, headCenter } from '../assets/chars.js';
import { aisle, aisleProj, loadingDock, office, desk, generator, nest, notebook, rackingUp, fuelSpill } from '../assets/sets.js';
import { camGrid, camFull, endCard, caption, TEXT } from '../assets/ui.js';

const LEAD = 0.5;
TEXT.end = ['PART 3', "Who's living in the store?", "Follow so you don't miss it"];
TEXT.stamp = '04:37 AM';
const CAM_LABEL = 'CAM 06 · AISLE 22 · PET FOOD';

// ---------- timing + continuous captions ----------
let TL, LINES, CAPS = {}, IDS = [];
const norm = s => s.toLowerCase().replace(/[^a-z0-9']/g, '');
function build(timing, lines) {
  TL = {}; LINES = {}; IDS = lines.lines.map(l => l.id);
  for (const l of lines.lines) {
    LINES[l.id] = l;
    const T = timing.lines[l.id];
    TL[l.id] = { t0: LEAD + T.t0, t1: LEAD + T.t1, ws: T.words.map(([w, a, b]) => [w, LEAD + a, LEAD + b]) };
    // keyword set from the Caption column (**…**)
    const keys = new Set();
    for (const m of l.caption.matchAll(/\*\*(.+?)\*\*/g)) for (const k of m[1].split(/\s+/)) keys.add(norm(k));
    // every spoken word, grouped into pops of up to 3: break after sentence punctuation or a closing quote,
    // and keep a keyword run together
    const raw = l.spoken.split(/\s+/).filter(Boolean);
    const groups = []; let g = [];
    raw.forEach((r, i) => {
      g.push(i);
      const ends = /[.,!?;:]["”]?$|["”]$/.test(r), next = raw[i + 1];
      const keyRun = next && keys.has(norm(r)) && keys.has(norm(next));
      if (g.length >= 4 || !keyRun && (ends || g.length >= 3 || (g.length >= 2 && next && /^["“]/.test(next)))) { groups.push(g); g = []; }
    });
    if (g.length) groups.push(g);
    CAPS[l.id] = groups.map(gr => ({ a: gr[0], b: gr[gr.length - 1], words: gr.map(i => ({ w: raw[i].replace(/["“”]/g, '').replace(/[.,;:]+$/, ''), key: keys.has(norm(raw[i])) })) }));
  }
}
const W_ = (id, i) => TL[id].ws[Math.min(Math.max(0, i), TL[id].ws.length - 1)];
const w = (id, i) => W_(id, i)[1], L0 = id => TL[id].t0, L1 = id => TL[id].t1;
const wi = (id, str, from = 0) => { const tk = LINES[id].spoken.split(/\s+/).map(norm), n = norm(str); let k = tk.indexOf(n, from); if (k < 0) k = tk.findIndex((x, j) => j >= from && x.startsWith(n)); return k < 0 ? 0 : k; };
const ww = (id, str, from = 0) => w(id, wi(id, str, from));
function capAt(t) {
  let cur = null;
  for (const id of IDS) {
    if (t < L0(id) - 0.05) break;
    for (const g of CAPS[id]) { const t0 = w(id, g.a) - 0.04; if (t >= t0) cur = { id, g, t0 }; }
  }
  if (!cur) return null;
  // hold the last pop of a line through the pause until the next line starts (continuous), but not across a long gap
  const nextIdx = IDS.indexOf(cur.id) + 1, end = nextIdx < IDS.length ? L0(IDS[nextIdx]) : L1(cur.id) + 0.6;
  if (t > end || t > L1(cur.id) + 1.2) return null;
  return { k: t - cur.t0, words: cur.g.words };
}

// ---------- helpers ----------
const blurCache = new Map();
function blurred(key, drawFn, px = 14) {
  let oc = blurCache.get(key);
  if (!oc) { oc = new OffscreenCanvas(W, H); const o = oc.getContext('2d'); o.filter = `blur(${px}px)`; const tmp = new OffscreenCanvas(W, H); drawFn(tmp.getContext('2d')); o.drawImage(tmp, 0, 0); blurCache.set(key, oc); }
  return oc;
}
const framed = (S, hx, hy, r, extra = {}) => { const s = r / 53, pose = Object.assign({ x: hx, y: 0, s }, extra); pose.y = hy - (headCenter(S, pose).y); return pose; };
const talk = (t, on) => on && Math.floor(t * 7) % 3 !== 0 ? 'open' : 'flat';
const CAM22 = { h: 1.7, vy: 860, f: 760 };
// the floor spot in aisle 22: torn kibble bag + crumbs
function bagSpot(c, x, y, s, L) {
  c.save(); c.translate(x, y); c.scale(s, s);
  ell(c, 0, 10, 190, 34, 'rgba(10,14,22,0.3)');
  c.beginPath(); c.moveTo(-120, 0); c.lineTo(-140, -150); c.lineTo(-80, -176); c.lineTo(-20, -150); c.lineTo(-6, 0); c.closePath(); c.fillStyle = '#C9A24A'; c.fill();
  fillRR(c, -118, -110, 96, 50, 8, '#8A5A2A');
  for (let i = 0; i < 22; i++) ell(c, -40 + (i * 53 % 230), 2 + (i * 17 % 26), 8, 5, '#7A5230');
  c.restore();
}
const cam06 = (o, t) => { const cam = { h: 4.4, vy: 220, f: 640 }; aisle(o, 0, GEN, { stock: 'pet', cam, sign: '22' }); const p = aisleProj(cam, 0.35, 0, 3.6); stranger(o, p.x, p.y, 0.52, 0, 0); };   // t frozen: the loop
const FEEDS = [
  (c, t) => aisle(c, t, GEN, { stock: 'cans', cam: { h: 4.4, vy: 230, f: 620 } }),
  (c, t) => aisle(c, t, GEN, { stock: 'water', cam: { h: 4.4, vy: 230, f: 620 } }),
  (c, t) => aisle(c, t, GEN, { stock: 'mixed', cam: { h: 4.0, vy: 300, f: 600, x: 0.4 } }),
  (c, t) => loadingDock(c, t, GEN),
  (c, t) => aisle(c, t, GEN, { stock: 'cans', cam: { h: 4.0, vy: 300, f: 600, x: -0.4 } }),
  cam06,
  (c, t) => aisle(c, t, GEN, { stock: 'water', cam: { h: 4.0, vy: 300, f: 600, x: 0.3 } }),
  (c, t) => aisle(c, t, GEN, { stock: 'mixed', cam: { h: 4.4, vy: 230, f: 620 } }),
  (c, t) => loadingDock(c, t, GEN),
];

function shots() {
  const S = []; const add = (name, t0, draw) => S.push({ name, t0, draw });
  // 1 · Aisle 22, empty: your beam sweeps the floor and stops on the torn bag
  add('empty', 0, (c, t, lt) => {
    c.save(); camera(c, 1 + lt * 0.03, 540, 1200);
    aisle(c, t, GEN, { stock: 'pet', sign: '22', cam: CAM22 });
    const p = aisleProj(CAM22, 0.15, 0, 2.6); bagSpot(c, p.x, p.y, p.s / 260, GEN);
    c.restore();
    const aim = Math.atan2(p.y - 1950, p.x - 760);
    darkness(c, [{ x: 760, y: 1950, ang: aim + lerp(0.55, 0, ss(seg(lt, 0, 1.0))), len: 1900, spread: 0.2 }], 0.45);
  });
  // 2 · Dana's screen: camera six still shows him sitting there (the loop)
  add('screen', ww('l01', 'but') - 0.1, (c, t, lt) => {
    office(c, t, GEN, { view: 'grid' });
    fillRR(c, 90, 240, 800, 690, 18, '#1A1E26');
    camGrid(c, t, { x: 110, y: 300, w: 760, h: 610 }, FEEDS, { on: 1, hi: 0.8 });
    desk(c, 1440, GEN, false);
    person(c, DANA, { x: 490, y: 1870, s: 1.1, back: true, legs: 'sit', armR: [0.9, 1.6], hold: 'radio', armL: [0.3, 0.5], breathe: breathe(t, 1), t }, GEN);
  });
  // 3 · You, radio up, Dana's voice: "He's right in front of you"
  add('radio', L0('l02') - 0.1, (c, t, lt) => {
    c.drawImage(blurred('a22', o => aisle(o, 0, GEN, { stock: 'pet', cam: CAM22 })), 0, 0);
    c.fillStyle = rgba('#05070C', 0.35); c.fillRect(0, 0, W, H);
    c.save(); camera(c, 1 + lt * 0.015, 540, 820);
    const talking = t > ww('l02', 'he') - 0.05;
    person(c, YOU, framed(YOU, 520, 760, 200, { face: 0.2, look: [0.5, 0.2], blink: blinkAt(t, 3), breathe: breathe(t), brows: talking ? -0.4 : 0.2, mouth: talking ? 'tight' : 'flat', hold: 'radio', radioOn: talking && Math.floor(t * 6) % 2 === 0, armL: [0.3, 2.65], radioRot: 0.15, t }), GEN);
    c.restore();
  });
  // 4 · Top-down: your shoes on the exact spot, nothing but crumbs and the bag
  add('spot', L0('l03') - 0.1, (c, t, lt) => {
    c.fillStyle = '#8E8475'; c.fillRect(0, 0, W, H);
    c.fillStyle = rgba('#000', 0.18); for (let i = 0; i < 6; i++) c.fillRect(0, i * 340, W, 4);
    bagSpot(c, 420, 980, 2.2, GEN);
    ell(c, 690, 1420, 70, 120, '#1B1F27'); ell(c, 840, 1440, 70, 120, '#1B1F27');            // your shoes
    darkness(c, [], 0.35, [{ x: 560 + Math.sin(lt * 2) * 90, y: 1120, r: 520, k: 0.95 }]);
  });
  // 5 · Low angle up the racking: Marcus looks up; a sleeping bag hangs over the top shelf
  add('lookUp', L0('l04') - 0.1, (c, t, lt) => {
    const tilt = ss(seg(t, ww('l04', 'on'), ww('l04', 'sleeping')));
    c.save(); c.translate(0, lerp(-500, 200, tilt)); rackingUp(c, t, GEN); c.restore();
    person(c, MARCUS, { x: 300, y: 2050 + tilt * 700, s: 1.6, face: 0.3, look: [0.3, -1], brows: 0.6, blink: blinkAt(t, 7), breathe: breathe(t, 2), mouth: 'o', t }, GEN);
    darkness(c, [{ x: 300, y: 1500, ang: -1.35, len: 1700, spread: 0.18 }], 0.4);
  });
  // 6 · Marcus climbs, hand over hand
  add('climb', L0('l05') - 0.1, (c, t, lt) => {
    rackingUp(c, t, GEN);
    const up = ss(seg(lt, 0, ww('l05', 'somebody') - L0('l05') + 0.2)), arm = Math.sin(lt * 5);
    person(c, MARCUS, { x: 540, y: lerp(1900, 1250, up), s: 1.3, back: true, armL: [2.9 + arm * 0.15, 0.1], armR: [2.9 - arm * 0.15, 0.1], breathe: breathe(t, 2), t }, GEN);
  });
  // 7 · The nest: sleeping bag, cans, store hoodies with the tags on (the beam pans across)
  add('nest', ww('l05', 'somebody') - 0.1, (c, t, lt) => nest(c, t, FULL, { reveal: ss(seg(lt, 0, (L0('l07') - ww('l05', 'somebody')) * 0.9)) }));
  // 8 · The notebook drops into your hands
  add('drop', L0('l07') - 0.1, (c, t, lt) => {
    c.drawImage(blurred('a22', o => aisle(o, 0, GEN, { stock: 'pet', cam: CAM22 })), 0, 0);
    c.fillStyle = rgba('#05070C', 0.3); c.fillRect(0, 0, W, H);
    const k = eo(seg(t, ww('l07', 'he'), ww('l07', 'you') + 0.15));
    c.save(); c.translate(540, lerp(-300, 1150, k)); c.rotate(lerp(-0.9, 0.08, k)); fillRR(c, -170, -230, 340, 460, 14, '#E9E4D6'); fillRR(c, -170, -230, 340, 60, 14, '#2A4A7A'); c.restore();
    if (k > 0.85) { ell(c, 320, 1280, 70, 110, P.skinA); ell(c, 760, 1280, 70, 110, P.skinAS); }
  });
  // 9 · Inside: three columns, your column is a drawing of your orange beanie
  add('notebook', L0('l08') - 0.1, (c, t, lt) => { c.save(); camera(c, 1 + lt * 0.015, 540, 900); notebook(c, t, GEN, { focus: 0, thumb: 1 }); c.restore(); });
  // 10 · Close on Dana's column: the thumb slides half off the code
  add('code', ww('l09', 'under') - 0.1, (c, t, lt) => notebook(c, t, GEN, { focus: ss(seg(lt, 0, 0.8)), thumb: lerp(1, 0.55, ss(seg(t, ww('l09', 'four'), ww('l09', 'numbers') + 0.3))) }));
  // 11 · Dana, lit by your flashlight, whispering
  add('danaCU', ww('l09', 'that\'s') - 0.25, (c, t, lt) => {
    c.fillStyle = '#07090D'; c.fillRect(0, 0, W, H);
    person(c, DANA, framed(DANA, 540, 760, 200, { face: -0.1, look: [0, 0.5], blink: 0, breathe: breathe(t, 1), brows: 0.7, mouth: talk(t, true), glasses: 'cord', t }), GEN);
    darkness(c, [{ x: 540, y: 1950, ang: -Math.PI / 2, len: 1600, spread: 0.32 }], 0.75);
  });
  // 12 · Back at the office, over your shoulder: camera six still shows him
  add('office', L0('l10') - 0.1, (c, t, lt) => {
    office(c, t, GEN, { view: 'grid' });
    fillRR(c, 90, 240, 800, 690, 18, '#1A1E26');
    camGrid(c, t, { x: 110, y: 300, w: 760, h: 610 }, FEEDS, { on: 1, hi: seg(t, ww('l10', 'six'), ww('l10', 'six') + 0.2) });
    desk(c, 1440, GEN, false);
    person(c, YOU, { x: 220, y: 1930, s: 1.02, back: true, breathe: breathe(t), t }, GEN);
    person(c, MARCUS, { x: 820, y: 1990, s: 1.0, back: true, breathe: breathe(t, 2), t }, GEN);
    person(c, DANA, { x: 500, y: 1870, s: 1.1, back: true, legs: 'sit', armR: [0.5, 0.5], armL: [0.3, 0.5], rot: 0.06 * ss(seg(t, L0('l11') - 0.6, L0('l11'))), breathe: breathe(t, 1), t }, GEN);
  });
  // 13 · Camera six full screen: push in on the frozen 04:37
  add('frozen', L0('l11') - 0.1, (c, t, lt) => {
    c.save(); camera(c, 1 + ss(seg(t, ww('l11', 'clock'), ww('l11', 'frozen'))) * 0.9, 220, 230);
    const r = camFull(c, 0, cam06, CAM_LABEL, 12);   // t = 0: nothing in the feed moves, the REC seconds don't tick
    c.restore(); return r;
  });
  // 14 · Marcus behind Dana: "Someone looped it."
  add('looped', L0('l12') - 0.1, (c, t, lt) => {
    office(c, t, GEN, {});
    person(c, MARCUS, framed(MARCUS, 640, 700, 150, { face: -0.3, look: [-0.5, 0.3], blink: blinkAt(t, 7), breathe: breathe(t, 2), brows: -0.8, mouth: talk(t, t < ww('l12', 'marcus')), armL: [0.4, 2.6], armR: [0.4, 2.6], t }), GEN);
    person(c, DANA, framed(DANA, 280, 1050, 130, { face: 0.4, look: [0.7, -0.2], blink: blinkAt(t, 5), brows: 0.5, glasses: 'cord', t }), GEN);
  });
  // 15 · The generator coughs twice and dies
  const coughA = ww('l13', 'coughs'), deadT = ww('l13', 'black');
  add('gen', L0('l13') - 0.1, (c, t, lt) => {
    const dead = t > deadT;
    generator(c, t, dead ? DARK : GEN, { cough: seg(t, coughA - 0.1, deadT), dead });
    if (dead) darkness(c, [], 0.92);
  });
  // 16 · Dark dock: Dana turns her light on the generator: "two days early"
  add('early', L0('l14') - 0.1, (c, t, lt) => {
    loadingDock(c, t, DARK);
    person(c, DANA, { x: 420, y: 1760, s: 1.2, face: 0.6, look: [0.8, 0], blink: blinkAt(t, 5), breathe: breathe(t, 1), brows: -0.6, mouth: talk(t, t < ww('l14', 'dana')), hold: 'flash', flashRot: 1.2, armR: [1.5, 0.1], glasses: 'cord', t }, DARK);
    person(c, MARCUS, { x: 760, y: 1820, s: 1.15, face: -0.4, look: [-0.5, 0], blink: blinkAt(t, 7), breathe: breathe(t, 2), mouth: talk(t, t > ww('l14', 'somebody') - 0.05), t }, DARK);
    darkness(c, [{ x: 520, y: 1100, ang: -0.2, len: 1100, spread: 0.2 }, { x: 900, y: 1950, ang: -1.9, len: 1300, spread: 0.24 }], 0.8, [{ x: 420, y: 1350, r: 380, k: 0.8 }, { x: 760, y: 1350, r: 380, k: 0.75 }]);
  });
  // 17 · Your beam finds the fuel can: tipped, empty, still wet
  add('spill', L0('l15') - 0.1, (c, t, lt) => {
    fuelSpill(c, t, DARK);
    const aim = lerp(-2.6, Math.atan2(760 - 1950, 520 - 900), ss(seg(t, ww('l15', 'finds') - 0.2, ww('l15', 'can'))));
    darkness(c, [{ x: 900, y: 1950, ang: aim, len: 1600, spread: 0.26 }], 0.72);
  });
  // 18 · Wide: three of you in a small circle of light, the dark store all around
  add('circle', L0('l16') - 0.1, (c, t, lt) => {
    const cam = { h: 4.5, vy: 320, f: 640 };
    aisle(c, t, DARK, { stock: 'mixed', cam, fixturesOn: () => false });
    const spots = [[-0.5, 3.6, YOU], [0.4, 3.4, DANA], [0.05, 4.4, MARCUS]], beams = [];
    spots.forEach(([X, Z, S], i) => { const p = aisleProj(cam, X, 0, Z), s = p.s * 1.75 / 640; person(c, S, { x: p.x, y: p.y, s, look: [0, -0.5], blink: blinkAt(t, i * 2 + 1), breathe: breathe(t, i), t }, DARK); beams.push({ x: p.x, y: p.y - 330 * s, ang: -Math.PI / 2 + (i - 1) * 1.6 + Math.sin(t * 0.8 + i) * 0.4, len: 800, spread: 0.16 }); });
    const c0 = aisleProj(cam, 0, 0, 3.8);
    darkness(c, beams, 0.85, [{ x: c0.x, y: c0.y - 140, r: 520, k: 0.92 }]);
  });
  // 19 · Close: your face, flashlight under your chin; the voice comes from right behind you
  add('voice', L0('l17') - 0.1, (c, t, lt) => {
    c.fillStyle = '#07090D'; c.fillRect(0, 0, W, H);
    const hit = t > ww('l17', "don't") - 0.1;
    person(c, YOU, framed(YOU, 540, 760, 210, { face: 0, look: [hit ? -0.8 : 0, 0], blink: 0, breathe: breathe(t) * 0.3, brows: hit ? 0.9 : 0.2, mouth: hit ? 'o' : 'flat', t }), GEN);
    darkness(c, [{ x: 540, y: 1700, ang: -Math.PI / 2, len: 1300, spread: 0.36 }], 0.8);
  });
  // 20 · You spin: your beam whips across the racking. Nobody.
  add('spin', L0('l18') - 0.1, (c, t, lt) => {
    const cam = { h: 1.7, vy: 860, f: 700 };
    aisle(c, t, DARK, { stock: 'mixed', cam, fixturesOn: () => false });
    const sweep = lerp(-0.4, -2.6, eo(seg(lt, 0, 0.5)));
    darkness(c, [{ x: 540, y: 1950, ang: sweep, len: 1900, spread: 0.2 }], 0.9);
  });
  // 21 · From the top of the racking: looking down at you in your circle of light
  add('above', ww('l18', 'nobody') - 0.15, (c, t, lt) => {
    c.fillStyle = '#3B414D'; c.fillRect(0, 0, W, H);
    c.save(); camera(c, 1 + lt * 0.05, 540, 1300);
    fillRR(c, 0, 0, 220, H, 0, '#4F6E91'); fillRR(c, 860, 0, 220, H, 0, '#4F6E91');          // racking edges from above
    for (let i = 0; i < 10; i++) { fillRR(c, 0, i * 200, 220, 18, 0, '#C9773A'); fillRR(c, 860, i * 200, 220, 18, 0, '#C9773A'); }
    ell(c, 540, 1300, 70, 70, P.orange); ell(c, 540, 1300, 70, 70, rgba(P.orangeS, 0.3));    // your beanie from above
    ell(c, 540, 1360, 90, 50, P.navy);
    c.restore();
    darkness(c, [{ x: 540, y: 1300, ang: 0.6 + Math.sin(t) * 0.2, len: 500, spread: 0.3 }], 0.9, [{ x: 540, y: 1310, r: 260, k: 0.85 }]);
  });
  const endT = L1('l18') + 0.9;
  add('end', endT, (c, t, lt) => endCard(c, seg(lt, 0.7, 1.3)));
  return { S, endT, coughA, deadT };
}

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
  ev.push({ t: L0('l02') + 0.05, type: 'radio' }, { t: ww('l07', 'you') + 0.1, type: 'catch' });
  for (let k = 0; k < 4; k++) ev.push({ t: cut('climb') + 0.25 + k * 0.42, type: 'clank' });
  ev.push({ t: cut('frozen'), type: 'static' });
  ev.push({ t: K.coughA, type: 'cough' }, { t: K.coughA + 0.45, type: 'cough' }, { t: K.deadT, type: 'genDie' });
  ev.push({ t: cut('spill') + 0.6, type: 'drip' }, { t: cut('spill') + 1.5, type: 'drip' });
  ev.push({ t: cut('voice'), type: 'droneDrop' }, { t: ww('l17', "don't") - 0.05, type: 'whisper' }, { t: cut('spin'), type: 'whoosh' });
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
    ctx.save(); const r = sh.draw(ctx, t, t - sh.t0) || []; ctx.restore();
    texts = [...r];
    if (sh.name !== 'end') {
      if (!NOGLOW) glow(ctx, 0.5);
      vignette(ctx, 0.36);
      const cp = NOSUB ? null : capAt(t); if (cp) caption(ctx, cp.words, cp.k);
    }
  };
  window.TEXTS = t => { window.render(t); return texts; };
}
