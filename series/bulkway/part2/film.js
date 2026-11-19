// BULKWAY — Part 2 "The Nest" (rework). The narration track (voices/narration.wav: Chatterbox lines laid end to end by
// voice.py) sets the clock; shots cut on its word times from voices/timing.json.
// Captions run continuously: every spoken word, 1-3 words at a time; the Caption column's **keywords** turn orange.
// glow(): light sources bloom softly on top of the flat palette (no recolouring).
import { P, W, H, FULL, GEN, DARK, clamp, lerp, seg, ss, eo, camera, blinkAt, breathe, vignette, rgba, fillRR, ell, poly, capsule, lit, darkness, glow } from '../assets/kit.js';
import { person, YOU, DANA, MARCUS, stranger, headCenter, LAMP } from '../assets/chars.js';
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
// your own hand at the bottom of the frame holding the flashlight (POV shots). Returns the lens, where the beam starts.
function povFlash(c, x, y, ang, S = YOU) {
  const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
  capsule(c, x - dx * 60 + 140, H + 260, x - dx * 30, y - dy * 30, 62, '#141821');               // sleeve, coming in from below
  capsule(c, x - dx * 60 + 140, H + 260, x - dx * 30, y - dy * 30, 50, rgba(lit(S.shirt, GEN), 0.35));
  c.save(); c.translate(x, y); c.rotate(ang);
  fillRR(c, -40, -24, 170, 48, 14, '#262B34'); fillRR(c, 120, -34, 56, 68, 12, '#323946'); fillRR(c, 172, -30, 8, 60, 3, '#FFE7B8');
  fillRR(c, 10, -26, 30, 8, 3, rgba('#C9773A', 0.8));
  c.restore();
  ell(c, x, y, 52, 46, '#4A3428'); ell(c, x + nx * 20, y + ny * 20, 40, 30, '#5A4032');           // fist around it, dim
  return { x: x + dx * 180, y: y + dy * 180 };
}
const lampBeam = (id, len, spread, k = 1) => { const l = LAMP[id]; return l ? { x: l.x, y: l.y, ang: l.ang, len, spread, k } : null; };
// the rolling warehouse ladder Marcus climbs (low angle, rails converging up toward the nest)
function ladder(c, cx, L) {
  const bot = H + 40, top = 110, wb = 150, wt = 86;
  for (const s of [-1, 1]) poly(c, [[cx + s * wb - 15, bot], [cx + s * wb + 15, bot], [cx + s * wt + 8, top], [cx + s * wt - 8, top]], lit('#9AA4B2', L));
  for (let i = 0; i < 14; i++) { const k = i / 13, y = lerp(bot - 70, top + 30, k), w = lerp(wb, wt, k); fillRR(c, cx - w, y - 8, w * 2, 16, 4, lit('#C9CCD1', L)); }
  fillRR(c, cx - wt - 20, top - 10, (wt + 20) * 2, 24, 6, lit('#C9773A', L));   // top platform lip
}
// a bay of racking seen straight on across the aisle (the spin): boxes on every level, one slot near the top cleared out
function rackFace(c, t) {
  c.fillStyle = '#20252E'; c.fillRect(0, 0, W, H);
  for (const x of [40, 1000]) fillRR(c, x, 0, 44, H, 0, '#4F6E91');
  const levels = [260, 600, 940, 1500, 1840];
  levels.forEach((y, i) => {
    fillRR(c, 0, y, W, 30, 0, '#C9773A');
    for (let j = 0; j < 5; j++) {
      if (i === 1 && j === 2) continue;   // the empty slot: a torn wrapper and crumbs left behind
      const w = 150 + (j * 37 + i * 13) % 40, h = 170 + (j * 53 + i * 29) % 70, x = 110 + j * 180;
      fillRR(c, x, y - h, w, h, 8, ['#B48A4A', '#9C7440', '#C9A24A', '#8A5A2A'][(i + j) % 4]); fillRR(c, x, y - h + 30, w, 16, 2, 'rgba(255,255,255,0.2)');
    }
  });
  c.save(); c.translate(560, 590); c.rotate(0.2); poly(c, [[-34, -14], [-10, -22], [12, -12], [36, -18], [30, 12], [4, 18], [-20, 10], [-38, 16]], '#D9584A'); c.restore();
  for (let k = 0; k < 9; k++) ell(c, 480 + k * 23, 594 - (k % 3) * 3, 5, 3, '#7A5230');
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
    const aim = Math.atan2(p.y - 1600, p.x - 800) + lerp(0.55, 0, ss(seg(lt, 0, 1.0)));
    const ox = 800 - Math.cos(aim) * 180, oy = 1600 - Math.sin(aim) * 180;
    darkness(c, [{ x: 800, y: 1600, ang: aim, len: 1800, spread: 0.2 }], 0.45);
    povFlash(c, ox, oy, aim);
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
    // over your shoulder: you look down at the torn bag on the spot where he should be
    const cam = { h: 1.9, vy: 700, f: 760 };
    aisle(c, t, GEN, { stock: 'pet', sign: '22', cam });
    const p = aisleProj(cam, -0.25, 0, 2.3); bagSpot(c, p.x, p.y, p.s / 300, GEN);
    const fx = 690, fy = 1560, aim = Math.atan2(p.y - fy, p.x - fx) + Math.sin(lt * 1.5) * 0.06;
    darkness(c, [{ x: fx + Math.cos(aim) * 60, y: fy + Math.sin(aim) * 60, ang: aim, len: 1000, spread: 0.24 }], 0.35);
    // you from behind, right arm out in front holding the light toward the bag
    capsule(c, 790, 1520, fx + 30, fy + 10, 26, lit(YOU.shirtS, GEN));
    c.save(); c.translate(fx, fy); c.rotate(aim); fillRR(c, -20, -13, 80, 26, 8, '#262B34'); fillRR(c, 52, -18, 26, 36, 7, '#323946'); fillRR(c, 76, -15, 5, 30, 2, '#FFE7B8'); c.restore();
    ell(c, fx + 8, fy + 4, 24, 22, lit(YOU.skinS, GEN));
    person(c, YOU, { x: 860, y: 2250, s: 2.3, back: true, rot: -0.05, breathe: breathe(t), t }, GEN);
  });
  // 5 · Marcus in the aisle looks up (plain generator light), then his eyeline: the sleeping bag over the top shelf
  add('lookUp', L0('l04') - 0.1, (c, t, lt) => {
    c.save(); camera(c, 1 + lt * 0.02, 540, 900);
    aisle(c, t, GEN, { stock: 'pet', cam: { h: 1.6, vy: 760, f: 700, x: 0.5 } });
    const up = ss(seg(t, L0('l04'), ww('l04', 'looks') + 0.3));
    person(c, MARCUS, framed(MARCUS, 540, 820, 140, { face: 0.1, look: [0.1, lerp(0, -1, up)], brows: up * 0.7, blink: blinkAt(t, 7) * (1 - up), breathe: breathe(t, 2), mouth: up > 0.5 ? 'o' : 'flat', t }), GEN);
    c.restore();
  });
  add('bagUp', ww('l04', 'on') - 0.1, (c, t, lt) => {
    c.save(); camera(c, 1 + ss(seg(lt, 0, 2.5)) * 0.35, 640, 250);
    rackingUp(c, t, GEN);
    c.restore();
    const ang = Math.atan2(250 - 1620, 640 - 560);
    darkness(c, [{ x: 560, y: 1620, ang, len: 2000, spread: 0.14 }], 0.3);
    povFlash(c, 560 - Math.cos(ang) * 180, 1620 - Math.sin(ang) * 180, ang, MARCUS);
  });
  // 6 · Marcus climbs, hand over hand
  add('climb', L0('l05') - 0.1, (c, t, lt) => {
    rackingUp(c, t, GEN);
    ladder(c, 560, GEN);
    const up = ss(seg(lt, 0, ww('l05', 'somebody') - L0('l05') + 0.2)), arm = Math.sin(lt * 5);
    person(c, MARCUS, { x: 560, y: lerp(1900, 1250, up), s: 1.3, back: true, armL: [2.9 + arm * 0.15, 0.1], armR: [2.9 - arm * 0.15, 0.1], breathe: breathe(t, 2), t }, GEN);
  });
  // 7 · The nest: sleeping bag, cans, store hoodies with the tags on (the beam pans across)
  add('nest', ww('l05', 'somebody') - 0.1, (c, t, lt) => { c.save(); camera(c, 1.22 + lt * 0.012, lerp(440, 640, ss(seg(lt, 0, 5))), 800); nest(c, t, FULL, { reveal: ss(seg(lt, 0, (L0('l07') - ww('l05', 'somebody')) * 0.9)) }); c.restore();
    // Marcus's flashlight (his hand at the bottom) sweeping across the camp
    const ang = lerp(-2.2, -1.25, ss(seg(lt, 0, 5)));
    darkness(c, [{ x: 300, y: 1600, ang, len: 1700, spread: 0.3, k: 0.9 }], 0.3);
    povFlash(c, 300 - Math.cos(ang) * 180, 1600 - Math.sin(ang) * 180, ang, MARCUS);
  });
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
    darkness(c, [{ x: 640, y: 1600, ang: -Math.PI / 2 - 0.08, len: 1500, spread: 0.34 }], 0.75);
    povFlash(c, 640 + Math.sin(0.08) * 180, 1780, -Math.PI / 2 - 0.08);
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
    const yours = -1.95;
    darkness(c, [lampBeam('dana', 1100, 0.2) || { x: 520, y: 1100, ang: -0.2, len: 1100, spread: 0.2 }, { x: 900, y: 1610, ang: yours, len: 1300, spread: 0.24 }], 0.8, [{ x: 420, y: 1350, r: 380, k: 0.8 }, { x: 760, y: 1350, r: 380, k: 0.75 }]);
    povFlash(c, 900 - Math.cos(yours) * 180, 1610 - Math.sin(yours) * 180, yours);
  });
  // 17 · Your beam finds the fuel can: tipped, empty, still wet
  add('spill', L0('l15') - 0.1, (c, t, lt) => {
    fuelSpill(c, t, DARK);
    const aim = lerp(-2.6, Math.atan2(760 - 1950, 520 - 900), ss(seg(t, ww('l15', 'finds') - 0.2, ww('l15', 'can'))));
    darkness(c, [{ x: 900, y: 1610, ang: aim, len: 1600, spread: 0.26 }], 0.72);
    povFlash(c, 900 - Math.cos(aim) * 180, 1610 - Math.sin(aim) * 180, aim);
  });
  // 18 · Wide: three of you in a small circle of light, the dark store all around
  add('circle', L0('l16') - 0.1, (c, t, lt) => {
    const cam = { h: 4.5, vy: 320, f: 640 };
    aisle(c, t, DARK, { stock: 'mixed', cam, fixturesOn: () => false });
    const spots = [[-0.5, 3.6, YOU], [0.4, 3.4, DANA], [0.05, 4.4, MARCUS]], beams = [];
    spots.forEach(([X, Z, S], i) => {
      const p = aisleProj(cam, X, 0, Z), s = p.s * 1.75 / 640;
      const rot = [-1.1, 1.3, 0.1][i] + Math.sin(t * 0.8 + i) * 0.35;   // each light points a different way into the dark
      person(c, S, { x: p.x, y: p.y, s, look: [0, -0.5], blink: blinkAt(t, i * 2 + 1), breathe: breathe(t, i), hold: 'flash', armL: [0.9, 0.5], flashRot: rot, t }, DARK);
      const b = lampBeam(S.id, 800, 0.16); if (b) beams.push(b);
    });
    const c0 = aisleProj(cam, 0, 0, 3.8);
    darkness(c, beams, 0.85, [{ x: c0.x, y: c0.y - 140, r: 520, k: 0.92 }]);
  });
  // 19 · Close: your face, flashlight under your chin; the voice comes from right behind you
  add('voice', L0('l17') - 0.1, (c, t, lt) => {
    c.fillStyle = '#07090D'; c.fillRect(0, 0, W, H);
    const hit = t > ww('l17', "don't") - 0.1;
    person(c, YOU, framed(YOU, 540, 760, 210, { face: 0, look: [hit ? -0.8 : 0, 0], blink: 0, breathe: breathe(t) * 0.3, brows: hit ? 0.9 : 0.2, mouth: hit ? 'o' : 'flat', t }), GEN);
    darkness(c, [{ x: 540, y: 1560, ang: -Math.PI / 2, len: 1300, spread: 0.36 }], 0.8);
    povFlash(c, 540, 1740, -Math.PI / 2);   // the flashlight under your chin
  });
  // 20 · You spin: your light whips across the racking and lands on an empty slot on the shelf. Nobody.
  add('spin', L0('l18') - 0.1, (c, t, lt) => {
    rackFace(c, t);
    const whip = eo(seg(t, ww('l18', 'hits') - 0.35, ww('l18', 'racking') + 0.1));
    const px = lerp(-420, 560, whip) + (whip > 0.98 ? Math.sin(lt * 9) * 6 : 0), py = lerp(900, 520, whip);
    const fx = 720, fy = 1600, ang = Math.atan2(py - fy, px - fx);
    const pools = [{ x: px, y: py, r: 330, k: 0.96 }];
    if (whip < 0.95) for (let k = 1; k <= 3; k++) pools.push({ x: px - k * 120 * (1 - whip), y: py + k * 30 * (1 - whip), r: 300, k: 0.35 / k });   // smear while it moves
    darkness(c, [{ x: fx, y: fy, ang, len: Math.hypot(px - fx, py - fy) + 200, spread: 0.12, k: 0.28 }], 0.94, pools);
    // dust drifting in the beam
    for (let i = 0; i < 18; i++) { const k = ((i * 0.137 + t * 0.05) % 1), q = (i * 0.61) % 1 - 0.5; ell(c, lerp(fx, px, k) - Math.sin(ang) * q * 220 * k, lerp(fy, py, k) + Math.cos(ang) * q * 220 * k, 3, 3, rgba('#FFE7B8', 0.35 * (1 - k))); }
    povFlash(c, fx - Math.cos(ang) * 180, fy - Math.sin(ang) * 180, ang);
  });
  // 21 · Looking straight down from the top of the racking: you, small, in your circle of light; a gloved hand grips the deck edge
  add('above', ww('l18', 'nobody') - 0.15, (c, t, lt) => {
    c.save(); camera(c, 1 + lt * 0.035, 560, 820);
    c.fillStyle = '#3B414D'; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 12; i++) { fillRR(c, 0, i * 170, W, 3, 0, 'rgba(255,255,255,0.05)'); fillRR(c, 260 + i * 170, 0, 3, H, 0, 'rgba(255,255,255,0.05)'); }   // floor tiles
    for (const x0 of [0, 830]) {            // the racking tops on both sides: pallets of boxes seen from above
      fillRR(c, x0, 0, 250, H, 0, '#4F6E91');
      for (let i = 0; i < 9; i++) { fillRR(c, x0 + 14, 20 + i * 220, 222, 190, 8, ['#B48A4A', '#9C7440', '#C9A24A'][i % 3]); fillRR(c, x0 + 115, 20 + i * 220, 20, 190, 3, 'rgba(255,255,255,0.18)'); }
      fillRR(c, x0 === 0 ? 236 : 830, 0, 14, H, 0, '#C9773A');
    }
    // you from above: beanie, shoulders, the arm holding the light down the aisle
    const yx = 560, yy = 820, ang = 1.35 + Math.sin(t * 0.9) * 0.2;
    ell(c, yx + 20, yy + 30, 120, 80, 'rgba(10,14,22,0.35)');
    ell(c, yx, yy, 104, 60, lit(YOU.shirt, GEN)); ell(c, yx, yy + 10, 104, 46, lit(YOU.shirtS, GEN));
    capsule(c, yx + 70, yy + 10, yx + 70 + Math.cos(ang) * 110, yy + 10 + Math.sin(ang) * 110, 22, lit(YOU.shirt, GEN));
    const hx = yx + 70 + Math.cos(ang) * 120, hy = yy + 10 + Math.sin(ang) * 120;
    c.save(); c.translate(hx, hy); c.rotate(ang); fillRR(c, -10, -10, 56, 20, 6, '#262B34'); fillRR(c, 40, -13, 18, 26, 5, '#323946'); c.restore();
    ell(c, hx, hy, 17, 16, lit(YOU.skin, GEN));
    ell(c, yx, yy - 4, 56, 56, P.orange); ell(c, yx + 12, yy + 6, 40, 40, rgba(P.orangeS, 0.5)); ell(c, yx - 4, yy - 8, 14, 14, '#FFB15A');
    c.restore();
    const z = 1 + lt * 0.035, sx = v => 560 + (v - 560) * z, sy = v => 820 + (v - 820) * z;   // camera() zooms about (560, 820)
    darkness(c, [{ x: sx(hx + Math.cos(ang) * 50), y: sy(hy + Math.sin(ang) * 50), ang, len: 1150, spread: 0.3 }], 0.8, [{ x: sx(yx), y: sy(yy), r: 340, k: 0.92 }]);
    // foreground, close to the lens: the top deck's edge on the left and the fingers of a dark glove curled over it
    const grip = ss(seg(lt, 0.6, 1.4));
    c.fillStyle = '#10141B'; c.fillRect(0, 0, 150, H); fillRR(c, 138, 0, 16, H, 0, '#2E2418');
    for (let i = 0; i < 4; i++) { const y = 520 + i * 58, ext = 66 + i % 2 * 10 + grip * 12; fillRR(c, 112, y, ext + 30, 46, 22, '#1C2028'); fillRR(c, 112 + ext, y + 6, 26, 34, 14, '#262B34'); fillRR(c, 120, y + 4, ext, 8, 4, 'rgba(255,214,150,0.12)'); }
    fillRR(c, 40, 500, 110, 260, 40, '#1C2028');   // back of the hand
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
  ev.push({ t: cut('above') + 0.05, type: 'boom' });
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
