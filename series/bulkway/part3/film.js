// BULKWAY — Part 3 "Ray". Night 2, the store black (generator dead), three flashlights. The narration track
// (voices/narration.wav: Chatterbox lines laid end to end by voice.py) sets the clock; shots cut on its word times.
// Same caption + timing machinery as Part 2. New: title at the top of the first shot, the time chip, Ray with his hood down.
import { P, W, H, FULL, GEN, DARK, clamp, lerp, seg, ss, eo, camera, blinkAt, breathe, vignette, rgba, fillRR, ell, poly, capsule, lit, darkness, glow } from '../assets/kit.js';
import { person, YOU, DANA, MARCUS, RAY, stranger, headCenter, LAMP } from '../assets/chars.js';
import { aisle, aisleProj, loadingDock, office, desk, notebook, rackingUp, wallClock } from '../assets/sets.js';
import { camGrid, endCard, caption, TEXT, titleTop, timeChip } from '../assets/ui.js';

const LEAD = 0.5;
TEXT.stamp = '01:53 AM';   // the monitor clock matches the time chip (1:52 AM)
TEXT.end = ['PART 4', 'Who is prying the bay door open?', "Follow so you don't miss it"];
const TITLE = 'Snowed In at Bulkway', PART = 'Part 3: Ray';

// ---------- timing + continuous captions (as Part 2) ----------
let TL, LINES, CAPS = {}, IDS = [];
const norm = s => s.toLowerCase().replace(/[^a-z0-9']/g, '');
function build(timing, lines) {
  TL = {}; LINES = {}; IDS = lines.lines.map(l => l.id);
  for (const l of lines.lines) {
    LINES[l.id] = l;
    const T = timing.lines[l.id];
    TL[l.id] = { t0: LEAD + T.t0, t1: LEAD + T.t1, ws: T.words.map(([w, a, b]) => [w, LEAD + a, LEAD + b]) };
    const keys = new Set();
    for (const m of l.caption.matchAll(/\*\*(.+?)\*\*/g)) for (const k of m[1].split(/\s+/)) keys.add(norm(k));
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
const wend = (id, str, from = 0) => W_(id, wi(id, str, from))[2];
function capAt(t) {
  let cur = null;
  for (const id of IDS) {
    if (t < L0(id) - 0.05) break;
    for (const g of CAPS[id]) { const t0 = w(id, g.a) - 0.04; if (t >= t0) cur = { id, g, t0 }; }
  }
  if (!cur) return null;
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
const talk = (t, on, shut = 'flat') => on && Math.floor(t * 7) % 3 !== 0 ? 'open' : shut;
const CAM22 = { h: 1.7, vy: 860, f: 760 };
const a22 = o => aisle(o, 0, GEN, { stock: 'pet', sign: '22', cam: CAM22 });
// your own hand at the bottom of the frame holding the flashlight (POV). Only used when your body is NOT in the shot.
function povFlash(c, x, y, ang, S = YOU) {
  const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
  capsule(c, x - dx * 60 + 140, H + 260, x - dx * 30, y - dy * 30, 62, '#141821');
  capsule(c, x - dx * 60 + 140, H + 260, x - dx * 30, y - dy * 30, 50, rgba(lit(S.shirt, GEN), 0.35));
  c.save(); c.translate(x, y); c.rotate(ang);
  fillRR(c, -40, -24, 170, 48, 14, '#262B34'); fillRR(c, 120, -34, 56, 68, 12, '#323946'); fillRR(c, 172, -30, 8, 60, 3, '#FFE7B8');
  fillRR(c, 10, -26, 30, 8, 3, rgba('#C9773A', 0.8));
  c.restore();
  ell(c, x, y, 52, 46, '#4A3428'); ell(c, x + nx * 20, y + ny * 20, 40, 30, '#5A4032');
}
const pov = (c, fx, fy, ang, S) => povFlash(c, fx - Math.cos(ang) * 180, fy - Math.sin(ang) * 180, ang, S);
// Ray's wrists in front of him, crossed, a black zip tie around them (drawn over a person pose with BOUND arms)
const BOUND = { armL: [-0.32, -0.55], armR: [-0.32, -0.55] };
function zipTie(c, S, pose, L) {   // where the hands meet, a strap loop + tail
  const s = pose.s, T = S.tall, hipY = pose.legs === 'sit' ? -175 : -320 * T;
  const x = pose.x, y = pose.y + (hipY - 196 * T + 16 + 250 * T) * s;
  c.save(); c.translate(x, y); c.scale(s, s);
  fillRR(c, -26, -8, 52, 12, 5, '#111318'); fillRR(c, 18, -12, 12, 18, 3, '#1E2026'); fillRR(c, 24, -2, 34, 6, 3, '#111318');
  c.restore();
}

function shots() {
  const S = []; const add = (name, t0, draw, o = {}) => S.push(Object.assign({ name, t0, draw }, o));
  // 1 · Cold open: in the dark at the foot of the racking, a hooded shape drops from the top shelf, straight at the lens
  const fallT = ww('l01', 'drops');
  add('drop', 0, (c, t, lt) => {
    c.save(); camera(c, 1 + lt * 0.02, 560, 700); rackingUp(c, t, DARK); c.restore();
    const k = clamp((t - fallT + 0.1) / 1.4), sc = lerp(1.1, 3.2, k * k), y = lerp(-60, 900, k * k) + 600 * sc;
    if (k > 0 && k < 1) person(c, RAY, { x: 560 + k * 60, y, s: sc, rot: lerp(0.2, -0.5, k), armL: [2.3, 0.4], armR: [2.5, 0.2], look: [0, 1], brows: 0.8, mouth: 'o', t, legs: 'stand' }, GEN);
    const ang = Math.atan2(260 - 1650, 520 - 760) + Math.sin(lt * 1.3) * 0.05;
    darkness(c, [{ x: 760, y: 1650, ang, len: 1900, spread: 0.24, k: 0.95 }], 0.68, [{ x: 560, y: 700, r: 520, k: 0.45 }]);
    pov(c, 760, 1650, ang);
    if (k >= 1) { c.fillStyle = '#000'; c.fillRect(0, 0, W, H); }   // he hits you: black
  }, { title: 1, chip: { time: '1:52', ampm: 'AM', line: 'PART 3 · AISLE 22 · NIGHT 2' } });
  // 2 · Earlier. You and Marcus crouched in the black, lights off, breath clouds in a sliver of exit-sign light
  add('wait', L0('l02') - 0.1, (c, t, lt) => {
    c.drawImage(blurred('a22', a22), 0, 0); c.fillStyle = rgba('#05070C', 0.5); c.fillRect(0, 0, W, H);
    c.save(); camera(c, 1 + lt * 0.012, 540, 900);
    person(c, YOU, { x: 360, y: 1760, s: 1.55, legs: 'sit', face: 0.3, look: [0.4, -0.6], blink: blinkAt(t, 3), breathe: breathe(t), brows: 0.3, armL: [0.25, 1.2], armR: [0.25, 1.2], t }, GEN);
    person(c, MARCUS, { x: 740, y: 1800, s: 1.5, legs: 'sit', face: -0.3, look: [-0.2, -0.7], blink: blinkAt(t, 7), breathe: breathe(t, 2), brows: 0.2, armL: [0.3, 1.1], armR: [0.3, 1.1], t }, GEN);
    c.restore();
    for (const [x, y, ph] of [[372, 760, 0], [752, 700, 1.7]]) { const k = (t * 0.45 + ph) % 1; ell(c, x + 30 + k * 60, y + 30 - k * 50, 26 + k * 40, 16 + k * 26, rgba('#DCE6F4', 0.22 * (1 - k))); }
    darkness(c, [], 0.72, [{ x: 360, y: 900, r: 460, k: 0.85 }, { x: 740, y: 860, r: 460, k: 0.85 }, { x: 980, y: 200, r: 300, k: 0.4 }]);
    ell(c, 990, 190, 70, 26, rgba('#4CC38A', 0.5));   // exit sign glow
  });
  // 3 · The office: Dana at the monitors, camera six still showing the empty nest on its loop
  add('monitor', L0('l03') - 0.1, (c, t, lt) => {
    office(c, t, GEN, { view: 'grid' });
    fillRR(c, 90, 240, 800, 690, 18, '#1A1E26');
    const feeds = Array.from({ length: 9 }, (_, i) => i === 5 ? (o, tt) => { const cam = { h: 4.4, vy: 220, f: 640 }; aisle(o, 0, GEN, { stock: 'pet', cam, sign: '22' }); } : (o, tt) => aisle(o, 0, GEN, { stock: ['cans', 'water', 'mixed'][i % 3], cam: { h: 4.2, vy: 260, f: 620, x: (i % 3 - 1) * 0.4 } }));
    camGrid(c, t, { x: 110, y: 300, w: 760, h: 610 }, feeds, { on: 1, hi: ss(seg(t, ww('l03', 'six') - 0.2, ww('l03', 'six') + 0.2)) });
    desk(c, 1440, GEN, false);
    person(c, DANA, { x: 490, y: 1870, s: 1.1, back: true, legs: 'sit', armR: [0.9, 1.6], hold: 'radio', armL: [0.3, 0.5], breathe: breathe(t, 1), t }, GEN);
    darkness(c, [], 0.55, [{ x: 490, y: 600, r: 700, k: 0.85 }]);
  });
  // 4 · The catch: Marcus's arms clamp round the falling figure; your light snaps on at "Got you"
  const gotT = ww('l04', 'got');
  add('catch', L0('l04') - 0.1, (c, t, lt) => {
    c.save(); camera(c, 1.05, 540, 1000);
    aisle(c, t, DARK, { stock: 'pet', sign: '22', cam: { h: 1.4, vy: 760, f: 700 } });
    const fall = ss(seg(t, L0('l04') + 0.2, ww('l04', 'snags') + 0.15));
    person(c, MARCUS, { x: 520, y: 1880, s: 1.55, face: 0.1, look: [0, -0.7 + fall * 0.5], brows: 0.6 - fall * 1.2, blink: 0, breathe: breathe(t, 2), mouth: t > gotT - 0.05 ? talk(t, t < L1('l04'), 'tight') : 'tight', armL: [lerp(2.8, 1.9, fall), lerp(0.2, 1.3, fall)], armR: [lerp(2.8, 1.9, fall), lerp(0.2, 1.3, fall)], t }, GEN);
    c.save(); c.translate(lerp(640, 540, fall), lerp(300, 1020, fall)); c.rotate(lerp(0.3, 1.35, fall));   // Ray tumbling, turned about his middle
    person(c, RAY, { x: 0, y: 330 * 1.35, s: 1.35, armL: [2.4, 0.4], armR: [1.2, 0.6], look: [0, 1], brows: 0.8, mouth: 'o', t }, GEN);
    c.restore();
    c.restore();
    const on = t > L0('l04') + 0.5, ang = -1.75;
    darkness(c, on ? [{ x: 760, y: 1650, ang, len: 1700, spread: 0.34, k: 1 }] : [], on ? 0.62 : 0.8, on ? [{ x: 540, y: 1100, r: 600, k: 0.6 }] : [{ x: 540, y: 1000, r: 620, k: 0.55 }]);
    if (on) pov(c, 760, 1650, ang);
  });
  // 5 · Ray's face in your beam, hood yanked back: stubble, eyes screwed against the light
  add('face', L0('l05') - 0.1, (c, t, lt) => {
    c.fillStyle = '#07090D'; c.fillRect(0, 0, W, H);
    c.save(); camera(c, 1 + lt * 0.02, 540, 760);
    const back = ss(seg(t, ww('l05', 'hood') - 0.2, ww('l05', 'yanked') + 0.1));
    person(c, RAY, framed(RAY, 540, 760, 205, { hoodDown: back > 0.5, face: 0.1, look: [0.2, 0.3], blink: back > 0.5 ? 0.45 : 0, brows: 0.8, mouth: t < ww('l05', 'hood') ? 'o' : 'tight', breathe: breathe(t, 1) * 1.6, rot: (1 - back) * 0.06 - 0.03, t }), GEN);
    c.restore();
    darkness(c, [{ x: 690, y: 1660, ang: -Math.PI / 2 - 0.25, len: 1500, spread: 0.32 }], 0.66);
    pov(c, 690, 1660, -Math.PI / 2 - 0.25);
  });
  // 6 · Dana on the radio from the office, voice breaking: "His name is Ray."
  add('radio', L0('l06') - 0.1, (c, t, lt) => {
    office(c, t, GEN, {});
    const on = t > L0('l06') && t < L1('l06');
    person(c, DANA, framed(DANA, 560, 760, 190, { face: -0.15, look: [-0.3, 0.2], blink: blinkAt(t, 5), breathe: breathe(t, 1), brows: 0.75, mouth: talk(t, on && t < ww('l06', 'dana\'s') || t > ww('l06', 'his') - 0.05 && on, 'tight'), glasses: 'cord', hold: 'radio', radioOn: on && Math.floor(t * 6) % 2 === 0, armL: [0.12, 2.9], radioRot: 0.1, t }), GEN);
    darkness(c, [], 0.6, [{ x: 520, y: 760, r: 640, k: 0.85 }]);
  });
  // 7 · Close on the wrists: your hands cinch the zip tie; he doesn't flinch
  add('zip', L0('l07') - 0.1, (c, t, lt) => {
    c.fillStyle = '#0B0E14'; c.fillRect(0, 0, W, H);
    c.save(); camera(c, 1 + lt * 0.015, 540, 900);
    // his forearms in hoodie sleeves, crossed at the wrists
    capsule(c, -60, 1260, 560, 940, 92, lit(RAY.shirtS, GEN)); capsule(c, 1140, 1280, 520, 960, 92, lit(RAY.shirt, GEN));
    fillRR(c, 470, 880, 150, 120, 50, lit('#505B4A', GEN));   // cuffs
    ell(c, 610, 930, 66, 56, lit(RAY.skin, GEN)); ell(c, 470, 950, 66, 56, lit(RAY.skinS, GEN));   // his hands, limp
    const cin = ss(seg(t, ww('l07', 'cinch') - 0.1, ww('l07', 'ties') + 0.2));
    c.save(); c.translate(540, 940); c.rotate(-0.15);
    c.beginPath(); c.ellipse(0, 0, lerp(150, 112, cin), lerp(84, 62, cin), 0, 0, Math.PI * 2); c.lineWidth = 22; c.strokeStyle = '#111318'; c.stroke();
    fillRR(c, lerp(130, 98, cin), -26, 40, 52, 8, '#1E2026');   // the lock head
    fillRR(c, lerp(160, 128, cin), -10, lerp(160, 300, cin), 20, 8, '#111318');   // the tail, pulled
    c.restore();
    // your hand on the tail (one hand, from the right edge) and your other hand steadying his wrist from below
    const hx = 540 + lerp(260, 400, cin);
    capsule(c, 1160, 1200, hx + 40, 960, 64, lit(YOU.shirt, GEN)); ell(c, hx, 930, 62, 54, lit(YOU.skin, GEN));
    capsule(c, 300, H + 100, 520, 1060, 64, lit(YOU.shirtS, GEN)); ell(c, 520, 1050, 64, 50, lit(YOU.skinS, GEN));
    c.restore();
    darkness(c, [{ x: 200, y: 200, ang: 0.95, len: 1500, spread: 0.36 }], 0.72);
  });
  // 8 · Ray on the floor against the shelf, bound, calm: "The lights could be seen from the road."
  const rayFloor = (c, t, extra = {}, r = 175, hx = 540, hy = 780) => person(c, RAY, framed(RAY, hx, hy, r, Object.assign({ hoodDown: true, legs: 'sit', ...BOUND, blink: blinkAt(t, 4), breathe: breathe(t, 1), t }, extra)), GEN);
  add('confess', L0('l08') - 0.1, (c, t, lt) => {
    c.drawImage(blurred('a22', a22), 0, 0); c.fillStyle = rgba('#05070C', 0.45); c.fillRect(0, 0, W, H);
    c.save(); camera(c, 1 + lt * 0.018, 540, 780);
    const sp = t > L0('l08') && t < ww('l08', 'he') || t > ww('l08', 'had') - 0.05;
    rayFloor(c, t, { face: -0.1, look: [0.15, 0.2], brows: -0.1, mouth: talk(t, sp && t < L1('l08')) });
    c.restore();
    darkness(c, [{ x: 860, y: 1700, ang: -2.0, len: 1500, spread: 0.3 }], 0.66);
    pov(c, 860, 1700, -2.0);
  });
  // 9 · You lean in, "From who?" He looks away, jaw shut (Marcus's light from the side; your face lit, not your flashlight)
  add('who', L0('l09') - 0.1, (c, t, lt) => {
    c.drawImage(blurred('a22', a22), 0, 0); c.fillStyle = rgba('#05070C', 0.5); c.fillRect(0, 0, W, H);
    const ask = t < ww('l09', 'you') + 0.1, away = ss(seg(t, ww('l09', 'he') - 0.1, ww('l09', 'clamps')));
    person(c, YOU, framed(YOU, 300, 720, 165, { face: 0.5, look: [0.8, 0.2], blink: blinkAt(t, 3), brows: -0.5, mouth: talk(t, ask), breathe: breathe(t), rot: 0.06, t }), GEN);
    person(c, RAY, framed(RAY, 790, 800, 150, { hoodDown: true, legs: 'sit', ...BOUND, face: lerp(-0.4, 0.6, away), look: [lerp(-0.8, 0.9, away), 0.3], brows: -0.3, mouth: away > 0.5 ? 'tight' : 'flat', blink: blinkAt(t, 4), t }), GEN);
    darkness(c, [{ x: -60, y: 300, ang: 0.42, len: 1700, spread: 0.36, k: 1 }], 0.66, [{ x: 300, y: 720, r: 380, k: 0.6 }, { x: 790, y: 820, r: 380, k: 0.6 }]);
  });
  // 10 · Dana's beam finds the notebook (she's come down from the office): her column, the alarm code
  add('code', L0('l10') - 0.1, (c, t, lt) => {
    c.save(); camera(c, 1 + lt * 0.02, 540, 900); notebook(c, t, GEN, { focus: ss(seg(lt, 0.2, 1.4)), thumb: 0 }); c.restore();
    const sweep = ss(seg(t, L0('l10'), ww('l10', 'notebook') + 0.4));
    darkness(c, [], 0.9, [{ x: lerp(200, 560, sweep), y: lerp(600, 980, sweep), r: 460, k: 0.95 }]);
  });
  // 11 · Ray, exhausted, a thin smile: "I used to work here. Before you."
  add('smile', L0('l11') - 0.1, (c, t, lt) => {
    c.fillStyle = '#07090D'; c.fillRect(0, 0, W, H);
    c.save(); camera(c, 1 + lt * 0.02, 540, 780);
    rayFloor(c, t, { face: 0.15, look: [-0.3, -0.3], brows: 0.35, blink: 0.35 + blinkAt(t, 4) * 0.6, mouth: t > ww('l11', 'i') - 0.05 ? talk(t, t < L1('l11'), 'smile') : 'smile' }, 210, 540, 760);
    c.restore();
    darkness(c, [{ x: 220, y: 1700, ang: -1.25, len: 1500, spread: 0.3 }, { x: 1000, y: 1500, ang: -2.2, len: 1100, spread: 0.2, k: 0.5 }], 0.68);
  });
  // 12 · Three-shot in the aisle: Ray on the floor, Dana standing over him with her light, recognition dawning
  add('manager', L0('l12') - 0.1, (c, t, lt) => {
    const cam = { h: 1.5, vy: 760, f: 720 };
    aisle(c, t, DARK, { stock: 'pet', sign: '22', cam });
    person(c, DANA, { x: 800, y: 1820, s: 1.55, face: -0.5, look: [-0.7, 0.4], blink: blinkAt(t, 5), breathe: breathe(t, 1), brows: lerp(-0.4, 0.5, ss(seg(t, ww('l12', 'apples') - 1, ww('l12', 'apples')))), mouth: 'flat', glasses: 'cord', hold: 'flash', armL: [0.7, 0.9], flashRot: -1.9, t }, GEN);
    const sp = t < ww('l12', 'he') || t > ww('l12', 'i') - 0.05;
    person(c, RAY, { x: 340, y: 1780, s: 1.55, hoodDown: true, legs: 'sit', ...BOUND, face: 0.5, look: [0.8, -0.6], blink: blinkAt(t, 4), breathe: breathe(t, 1), brows: 0.2, mouth: talk(t, sp && t < L1('l12')), t }, GEN);
    zipTie(c, RAY, { x: 340, y: 1780, s: 1.55, legs: 'sit' }, DARK);
    const b = LAMP.dana ? { x: LAMP.dana.x, y: LAMP.dana.y, ang: LAMP.dana.ang, len: 1100, spread: 0.24 } : { x: 700, y: 1100, ang: 2.6, len: 1100, spread: 0.24 };
    darkness(c, [b], 0.66, [{ x: 800, y: 1250, r: 520, k: 0.85 }, { x: 330, y: 1350, r: 500, k: 0.85 }]);
  });
  // 13 · Dana goes pale: "You're the one who vanished."
  add('pale', L0('l13') - 0.1, (c, t, lt) => {
    c.fillStyle = '#07090D'; c.fillRect(0, 0, W, H);
    c.save(); camera(c, 1 + lt * 0.03, 540, 760);
    const sp = t > ww('l13', "you're") - 0.05 && t < L1('l13');
    person(c, DANA, framed(DANA, 540, 760, 200, { face: 0.1, look: [0.1, 0.6], blink: 0, breathe: breathe(t, 1) * 1.5, brows: 0.95, mouth: sp ? talk(t, true, 'o') : 'o', glasses: 'cord', t }), GEN);
    c.restore();
    darkness(c, [{ x: 520, y: 1700, ang: -Math.PI / 2 + 0.1, len: 1400, spread: 0.32 }], 0.68);
  });
  // 14 · Ray shrugs his bound shoulders: "Didn't vanish. Got evicted."
  add('evicted', L0('l14') - 0.1, (c, t, lt) => {
    c.drawImage(blurred('a22', a22), 0, 0); c.fillStyle = rgba('#05070C', 0.5); c.fillRect(0, 0, W, H);
    const shrug = Math.sin(clamp((t - ww('l14', 'got') + 0.2) / 0.7) * Math.PI);
    c.save(); c.translate(0, -shrug * 18); camera(c, 1, 540, 800);
    rayFloor(c, t, { face: -0.2, look: [0.1, 0.6 - shrug * 0.4], brows: 0.5 + shrug * 0.3, mouth: talk(t, t < L1('l14')) }, 165, 540, 800);
    c.restore();
    darkness(c, [{ x: 860, y: 1700, ang: -2.05, len: 1500, spread: 0.3 }], 0.66);
  });
  // 15 · The office clock, the minute hand clicks onto twelve: two in the morning
  const tickT = ww('l15', 'clicks');
  add('clock', L0('l15') - 0.1, (c, t, lt) => {
    c.fillStyle = lit('#5E6573', DARK); c.fillRect(0, 0, W, H);
    c.save(); camera(c, 1 + lt * 0.03, 540, 820);
    const m = t < tickT ? 59 : 60;
    wallClock(c, 540, 820, 300, 1, m, GEN);
    c.restore();
    darkness(c, [{ x: 940, y: 1750, ang: -2.0, len: 1500, spread: 0.26 }], 0.7, [{ x: 540, y: 820, r: 400, k: 0.6 }]);
  }, { chip: { time: '2:00', ampm: 'AM', line: 'PART 3 · NIGHT 2', from: () => tickT } });
  // 16 · The dock in the dark: three slow knocks hit the buried bay door; the steel shakes
  const knocks = () => [ww('l16', 'three'), ww('l16', 'knocks'), ww('l16', 'hammer')];
  add('knocks', L0('l16') - 0.1, (c, t, lt) => {
    const K = knocks(); let shake = 0; for (const k of K) if (t > k) shake = Math.max(shake, Math.exp(-(t - k) * 9));
    c.save(); c.translate(Math.sin(t * 90) * 10 * shake, Math.cos(t * 70) * 6 * shake); loadingDock(c, t, DARK); c.restore();
    const ang = -1.95;
    darkness(c, [{ x: 860, y: 1700, ang, len: 1900, spread: 0.3 }], 0.7, [{ x: 760, y: 900, r: 600, k: 0.35 + 0.35 * shake }]);
    pov(c, 860, 1700, ang);
  });
  // 17 · Close on the door's bottom seam: metal screams, the door jerks up an inch, cold blue light and snow spill under
  add('seam', L0('l17') - 0.1, (c, t, lt) => {
    const up = ss(seg(t, ww('l17', 'door') - 0.2, ww('l17', 'inch') + 0.1)), jit = up > 0 && up < 1 ? Math.sin(t * 80) * 5 : 0;
    c.save(); camera(c, 2.6, 760, 1400); c.translate(jit, 0);
    loadingDock(c, t, DARK);
    const gap = up * 46;
    if (gap > 0) {
      fillRR(c, 380, 1440 - gap, 760, gap, 0, '#BFD6F2');
      for (let i = 0; i < 26; i++) ell(c, 400 + (i * 61 + t * 30) % 740, 1440 - gap * (0.2 + (i * 0.37) % 0.8), 4, 3, rgba('#FFFFFF', 0.8));
      // the door itself, raised: its bottom slat now above the light
      for (let i = 18; i < 22; i++) { const y = 380 + i * (1060 / 22) - gap; fillRR(c, 380, y, 760, 1060 / 22 - 6, 3, lit(i % 2 ? '#7D8594' : '#747C8B', DARK)); }
      fillRR(c, 380, 1440 - gap - 8, 760, 8, 2, lit('#2E3440', DARK));
      // snow drifting in across the dock floor
      for (let i = 0; i < 18; i++) ell(c, 420 + i * 40, 1446 + (i % 3) * 6, 18 + (i % 4) * 6, 6, rgba('#E9EEF3', 0.6 * up));
    }
    c.restore();
    const ang = -1.8;
    darkness(c, [{ x: 760, y: 1750, ang, len: 1600, spread: 0.3, k: 0.9 }], 0.7, [{ x: 760, y: 1480, r: 700 * (0.3 + up * 0.7), k: 0.75 * up }]);
  });
  // 18 · Ray's eyes lock on yours: "They found us."
  add('found', L0('l18') - 0.1, (c, t, lt) => {
    c.fillStyle = '#05070B'; c.fillRect(0, 0, W, H);
    c.save(); camera(c, 1 + lt * 0.05, 540, 700);
    person(c, RAY, framed(RAY, 540, 700, 260, { hoodDown: true, legs: 'sit', ...BOUND, face: 0, look: [0, 0], blink: 0, brows: 0.6, mouth: talk(t, t > ww('l18', 'they') - 0.05 && t < L1('l18'), 'tight'), breathe: breathe(t, 1) * 0.4, t }), GEN);
    c.restore();
    darkness(c, [{ x: 560, y: 1750, ang: -Math.PI / 2 + 0.05, len: 1500, spread: 0.3 }], 0.7);
  });
  const endT = L1('l18') + 1.5;
  add('end', endT, (c, t, lt) => endCard(c, seg(lt, 0.7, 1.3)));
  return { S, endT, gotT, tickT, K: knocks(), fallT };
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
