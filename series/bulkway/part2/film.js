// BULKWAY — Part 2 "The Guest". Same rules as Part 1: the narration track (voices/narration.wav, Chatterbox,
// laid end to end by voice.py) sets the clock; shots cut on its line/word times from voices/timing.json.
// Captions are built from the Caption column of lines.json (the words are found in the Spoken line).
import { P, W, H, FULL, GEN, DARK, clamp, lerp, seg, ss, eo, ei, camera, blinkAt, breathe, vignette, rgba, fillRR, ell, capsule, darkness } from '../assets/kit.js';
import { person, YOU, DANA, MARCUS, RAY, stranger, headCenter, fuelCanProp } from '../assets/chars.js';
import { aisle, aisleProj, frozenWall, loadingDock, office, desk, freezerDrip, fireExit, bayGap, driftTunnel, generator, alarmBeacon } from '../assets/sets.js';
import { phoneScreen, camGrid, camFull, endCard, caption, TEXT } from '../assets/ui.js';

const LEAD = 0.5;
TEXT.end = ['PART 3', 'Who drained the tank?', "Follow so you don't miss it"];
TEXT.stamp = '10:58 PM';
const CAM_LABEL = 'CAM 06 · AISLE 22 · PET FOOD';

// ---------- timing ----------
let TL, LINES, CAPS = {}, IDS = [];
const norm = s => s.toLowerCase().replace(/[^a-z0-9']/g, '');
function build(timing, lines) {
  TL = {}; LINES = {}; IDS = lines.lines.map(l => l.id);
  for (const l of lines.lines) {
    LINES[l.id] = l;
    const T = timing.lines[l.id];
    TL[l.id] = { t0: LEAD + T.t0, t1: LEAD + T.t1, ws: T.words.map(([w, a, b]) => [w, LEAD + a, LEAD + b]) };
    // captions: find each caption word in the spoken words (in order), group into 1-3 word pops
    const toks = l.spoken.split(/\s+/).map(norm);
    const cw = l.caption.split(/\s+/).filter(Boolean);
    let at = 0; const found = [];
    for (const raw of cw) {
      const n = norm(raw.replace(/\*/g, '')); if (!n) continue;
      let j = toks.indexOf(n, at); if (j < 0) j = toks.findIndex((x, k) => k >= at && (x.startsWith(n) || n.startsWith(x)));
      if (j < 0) continue;
      found.push({ i: j, text: raw }); at = j + 1;
    }
    const groups = []; let g = [];
    for (const f of found) {
      if (g.length && (g.length >= 3 || f.i > g[g.length - 1].i + 1)) { groups.push(g); g = []; }
      g.push(f);
    }
    if (g.length) groups.push(g);
    CAPS[l.id] = groups.map(gr => [gr[0].i, gr[gr.length - 1].i, gr.map(x => x.text).join(' ')]);
  }
}
const W_ = (id, i) => TL[id].ws[Math.min(Math.max(0, i), TL[id].ws.length - 1)];
const w = (id, i) => W_(id, i)[1], we = (id, i) => W_(id, i)[2], L0 = id => TL[id].t0, L1 = id => TL[id].t1;
// index of the first spoken word that starts with str (for cutting on a word)
const wi = (id, str) => { const tk = LINES[id].spoken.split(/\s+/).map(norm), n = norm(str); let k = tk.indexOf(n); if (k < 0) k = tk.findIndex(x => x.startsWith(n)); return k < 0 ? 0 : k; };
const ww = (id, str) => w(id, wi(id, str));

// ---------- helpers ----------
const blurCache = new Map();
function blurred(key, drawFn, px = 14) {
  let oc = blurCache.get(key);
  if (!oc) { oc = new OffscreenCanvas(W, H); const o = oc.getContext('2d'); o.filter = `blur(${px}px)`; const tmp = new OffscreenCanvas(W, H); drawFn(tmp.getContext('2d')); o.drawImage(tmp, 0, 0); blurCache.set(key, oc); }
  return oc;
}
const framed = (S, hx, hy, r, extra = {}) => { const s = r / 53, pose = Object.assign({ x: hx, y: 0, s }, extra); pose.y = hy - (headCenter(S, pose).y); return pose; };
const talk = (t, on) => on && Math.floor(t * 7) % 3 !== 0 ? 'open' : 'flat';
const fingers = c => { ell(c, 70, 1100, 70, 120, P.skinAS); ell(c, 900, 1180, 70, 140, P.skinA); ell(c, 890, 1360, 60, 110, P.skinA); };
const CAM22 = { h: 1.7, vy: 860, f: 760 };
// Ray sitting cross-legged on the aisle floor (full rig, seated pose, hands in lap unless raised)
function raySit(c, x, y, s, t, L, o = {}) {
  const up = o.up || 0;
  person(c, RAY, Object.assign({ x, y, s, legs: 'sit', face: 0.2, look: [0.3, 0.4], blink: blinkAt(t, 11), breathe: breathe(t, 4), brows: -0.3, mouth: 'tight',
    armL: [lerp(0.5, 2.6, up), lerp(1.6, 0.5, up)], armR: [lerp(0.5, 2.6, up), lerp(1.6, 0.5, up)], t }, o.pose || {}), L);
  // kibble bag beside him
  if (!o.noBag) { fillRR(c, x - 210 * s, y - 150 * s, 110 * s, 150 * s, 14 * s, rgba('#C9A24A', 1)); fillRR(c, x - 200 * s, y - 110 * s, 90 * s, 46 * s, 6 * s, '#8A5A2A'); for (let i = 0; i < 10; i++) ell(c, x - 180 * s + (i * 37 % 120) * s, y + 4 * s + (i * 13 % 10) * s, 6 * s, 4 * s, '#7A5230'); }
}

// ---------- shots ----------
function shots() {
  const S = []; const add = (name, t0, draw) => S.push({ name, t0, draw });

  // 1 · lock screen: 4:45, the beam already moving
  add('lock', 0, (c, t, lt) => {
    c.drawImage(blurred('a22', o => aisle(o, 0, GEN, { stock: 'pet', sign: '22' })), 0, 0);
    c.fillStyle = rgba('#141A24', 0.5); c.fillRect(0, 0, W, H);
    c.save(); camera(c, 0.94 + lt * 0.01, 540, 900); const r = phoneScreen(c, t, { bars: 1, time: '4:45', day: 'Tuesday' }); fingers(c); c.restore();
    return r;
  });
  // 2 · Aisle 22 down a flashlight beam: Ray on the floor eating from the bag
  add('aisle22', ww('l01', 'and') - 0.1, (c, t, lt) => {
    c.save(); camera(c, 1 + lt * 0.04, 540, 1100);
    aisle(c, t, GEN, { stock: 'pet', sign: '22', cam: CAM22 });
    const p = aisleProj(CAM22, 0.35, 0, 4.2);
    raySit(c, p.x, p.y, p.s * 1.75 / 640, t, GEN, { pose: { face: -0.6, look: [-0.7, 0.8], armR: [1.2, 1.4 + Math.sin(t * 3) * 0.2] } });
    c.restore();
    const aim = Math.atan2(p.y - 120 - 1950, p.x - 820), sweep = aim + lerp(0.5, 0, ss(seg(lt, 0, 0.9)));
    darkness(c, [{ x: 820, y: 1950, ang: sweep, len: 1900, spread: 0.2 }], 0.5);
  });
  // 3 · You: flashlight up under the beanie, "Hands up. Now."
  add('youCU', L0('l02') - 0.1, (c, t, lt) => {
    c.drawImage(blurred('a22d', o => aisle(o, 0, GEN, { stock: 'pet', cam: CAM22 })), 0, 0);
    c.fillStyle = rgba('#05070C', 0.5); c.fillRect(0, 0, W, H);
    c.save(); camera(c, 1 + lt * 0.015, 540, 820);
    person(c, YOU, framed(YOU, 560, 760, 200, { face: -0.3, look: [-0.7, 0.1], blink: blinkAt(t, 3), breathe: breathe(t), brows: -0.6, mouth: talk(t, t > ww('l02', 'hands') - 0.05), hold: 'flash', flashRot: -1.1, armR: [1.35, 0.5], t }), GEN);
    c.restore();
    const g = c.createRadialGradient(560, 1150, 20, 560, 1150, 520); g.addColorStop(0, rgba('#FFE2B0', 0.22)); g.addColorStop(1, rgba('#FFE2B0', 0)); c.fillStyle = g; c.fillRect(0, 0, W, H);
  });
  // 4 · Ray raises both hands, slow (medium, in the beam)
  add('rayHands', ww('l02', 'he') - 0.1, (c, t, lt) => {
    const cam = { h: 1.0, vy: 760, f: 760 };
    aisle(c, t, GEN, { stock: 'pet', cam });
    raySit(c, 560, 1750, 1.75, t, GEN, { up: ss(seg(t, ww('l02', 'hands') - 0.2, ww('l03', 'up') + 0.4)) });
    darkness(c, [{ x: 1000, y: 1700, ang: -2.6, len: 1300, spread: 0.36 }], 0.6);
  });
  // 5 · Two-shot: Ray talks, hands up; you over the shoulder with the light
  add('two', ww('l03', 'i') - 0.1, (c, t, lt) => {
    aisle(c, t, GEN, { stock: 'pet', cam: { h: 1.2, vy: 700, f: 700 } });
    raySit(c, 380, 1560, 1.3, t, GEN, { up: 1, pose: { mouth: talk(t, true), face: 0.4, look: [0.6, -0.2] } });
    person(c, YOU, { x: 860, y: 1990, s: 1.35, back: true, breathe: breathe(t), t }, GEN);
    darkness(c, [{ x: 800, y: 1300, ang: -2.75, len: 1100, spread: 0.32 }], 0.5);
  });
  // 6 · Ray close-up: hood up, staring at the floor
  add('rayCU', L0('l04') - 0.1, (c, t, lt) => {
    c.drawImage(blurred('a22d', o => aisle(o, 0, GEN, { stock: 'pet', cam: CAM22 })), 0, 0);
    c.fillStyle = rgba('#05070C', 0.35); c.fillRect(0, 0, W, H);
    c.save(); camera(c, 1 + lt * 0.02, 540, 800);
    person(c, RAY, framed(RAY, 540, 760, 195, { legs: 'sit', face: 0.15, look: [0.1, 1], blink: blinkAt(t, 13) * 0.4, breathe: breathe(t, 4), brows: -0.5, mouth: 'tight', armL: [0.3, 0.6], armR: [0.3, 0.6], t }), GEN);
    c.restore();
  });
  // 7 · His hands, shaking in his lap
  add('shake', ww('l04', 'his') - 0.1, (c, t, lt) => {
    c.fillStyle = '#2B2F33'; c.fillRect(0, 0, W, H);
    ell(c, 540, 1500, 520, 260, '#3B3F47'); ell(c, 540, 1460, 480, 200, '#444955');                    // knees and lap
    const j = (k) => Math.sin(t * 38 + k) * 5 + Math.sin(t * 23 + k * 2) * 3;
    capsule(c, -40, 820, 330 + j(1), 1150, 70, '#66735F'); capsule(c, 1120, 820, 750 + j(2), 1150, 70, '#505B4A');   // sleeves
    ell(c, 380 + j(3), 1190, 92, 74, '#D8A27E'); ell(c, 700 + j(4), 1190, 92, 74, '#BE8865');            // hands
    for (let k = 0; k < 4; k++) { ell(c, 320 + k * 30 + j(5 + k), 1250, 18, 34, '#D8A27E'); ell(c, 650 + k * 30 + j(9 + k), 1250, 18, 34, '#BE8865'); }
    for (let i = 0; i < 8; i++) ell(c, 300 + i * 70, 960 + (i % 3) * 18, 7, 5, '#8A5A2A');            // kibble crumbs on the sleeves
    darkness(c, [{ x: 1000, y: 300, ang: 2.3, len: 1600, spread: 0.45 }], 0.45);
  });
  // 8 · Fire exit: Marcus kicks, snow hisses through the seam
  const kickT = ww('l05', 'kicks');
  add('fire', L0('l05') - 0.1, (c, t, lt) => {
    fireExit(c, t, GEN, { kick: seg(t, kickT, kickT + 0.6), hiss: seg(t, kickT + 0.1, kickT + 0.8) });
    const k = ss(seg(t, kickT - 0.3, kickT)) * (1 - ss(seg(t, kickT + 0.2, kickT + 0.6)));
    person(c, MARCUS, { x: 900, y: 1800, s: 1.15, face: -0.7, look: [-0.8, 0.3], blink: blinkAt(t, 7), breathe: breathe(t, 2), rot: -0.08 * k, mouth: talk(t, t > ww('l05', 'every') - 0.05), brows: -0.5, t }, GEN);
  });
  // 9 · Office: Dana taps camera six
  add('office', L0('l06') - 0.1, (c, t, lt) => {
    office(c, t, GEN, { view: 'grid' });
    fillRR(c, 90, 240, 800, 690, 18, '#1A1E26');
    camGrid(c, t, { x: 110, y: 300, w: 760, h: 610 }, FEEDS, { on: 1, hi: seg(t, L0('l06') + 0.4, L0('l06') + 0.6) });
    desk(c, 1440, GEN, false);
    person(c, DANA, { x: 490, y: 1870, s: 1.1, back: true, legs: 'sit', armR: [0.5 + Math.max(0, Math.sin(lt * 6)) * 0.6, 0.5], armL: [0.3, 0.5], breathe: breathe(t, 1), t }, GEN);
  });
  // 10 · CAM 06 playback, 10:58 PM: the hooded figure walks into aisle 22 before close (full power, people still shopping)
  add('playback', ww('l06', 'ten') - 0.15, (c, t, lt) => camFull(c, t, (o, tt) => {
    const cam = { h: 4.4, vy: 220, f: 640 };
    aisle(o, tt, FULL, { stock: 'pet', cam, sign: '22' });
    const k = seg(tt, ww('l06', 'ten'), L1('l06') + 0.6), p = aisleProj(cam, lerp(0.9, 0.3, k), 0, lerp(5, 3.6, k));
    o.save(); o.translate(p.x, p.y); o.scale(-1, 1); o.translate(-p.x, -p.y); stranger(o, p.x, p.y, 0.52, tt, 0.1); o.restore();
  }, CAM_LABEL, 58 + lt));
  // 11 · Marcus, arms crossed: "watching us"
  add('marcus', L0('l07') - 0.1, (c, t, lt) => {
    aisle(c, t, GEN, { stock: 'pet', cam: { h: 1.6, vy: 760, f: 700, x: 0.6 } });
    person(c, MARCUS, framed(MARCUS, 520, 760, 150, { face: 0.3, look: [0.6, 0.2], blink: blinkAt(t, 7), breathe: breathe(t, 2), brows: -0.7, mouth: talk(t, t < ww('l07', 'marcus')), armL: [0.4, 2.6], armR: [0.4, 2.6], t }), GEN);
  });
  // 12 · Dana snaps back
  add('dana', ww('l07', 'starving') - 0.35, (c, t, lt) => {
    c.drawImage(blurred('a22d', o => aisle(o, 0, GEN, { stock: 'pet', cam: CAM22 })), 0, 0);
    c.save(); camera(c, 1 + lt * 0.02, 540, 800);
    person(c, DANA, framed(DANA, 540, 740, 190, { face: -0.35, look: [-0.7, 0], blink: blinkAt(t, 5), breathe: breathe(t, 1), brows: -0.8, mouth: talk(t, true), glasses: 'cord', t }), GEN);
    c.restore();
  });
  // 13 · Afternoon: every freezer alarm screams
  add('alarm', L0('l08') - 0.15, (c, t, lt) => {
    c.save(); camera(c, 1 + lt * 0.03, 540, 900);
    frozenWall(c, t, GEN, { dark: 1 }); alarmBeacon(c, t, 260, 260, seg(t, ww('l08', 'every'), ww('l08', 'every') + 0.2)); alarmBeacon(c, t + 0.3, 820, 260, seg(t, ww('l08', 'alarm'), ww('l08', 'alarm') + 0.2));
    c.restore();
  });
  // 14 · Dana opens a freezer: warm fog rolls out
  add('fog', L0('l09') - 0.1, (c, t, lt) => {
    const d = L0('l10') - L0('l09');
    c.save(); camera(c, 1 + lt * 0.02, 540, 1400);
    freezerDrip(c, t, GEN, { fog: seg(lt, 0, d * 0.4), drip: seg(lt, d * 0.2, d * 0.7), puddle: seg(lt, d * 0.3, d) });
    c.restore();
    person(c, DANA, { x: 900, y: 1990, s: 1.3, back: true, rot: -0.05, armL: [1.2, 0.3], breathe: breathe(t, 1), t }, GEN);
  });
  // 15 · Loading dock: Marcus at the bay door, turns to the crew
  add('dock', L0('l10') - 0.1, (c, t, lt) => {
    c.save(); camera(c, 1.05 + lt * 0.02, 600, 1100);
    loadingDock(c, t, GEN);
    const turn = ss(seg(t, ww('l10', 'the') - 0.3, ww('l10', 'the')));
    person(c, MARCUS, { x: 720, y: 1760, s: 1.2, face: lerp(0.8, -0.2, turn), look: [lerp(0.9, -0.2, turn), 0], blink: blinkAt(t, 7), breathe: breathe(t, 2), mouth: talk(t, turn > 0.5), back: turn < 0.3, armR: [0.3, 0.2], t }, GEN);
    c.restore();
  });
  // 16 · The bay door hauls up and stops at one foot of white
  const upA = ww('l11', 'hauls'), upB = ww('l11', 'stops');
  add('bay', L0('l11') - 0.15, (c, t, lt) => {
    c.save(); camera(c, 1 + lt * 0.02, 540, 960);
    const o = ss(seg(t, upA, upB)), jolt = t > upB && t < upB + 0.3 ? Math.sin((t - upB) * 60) * 0.03 * (1 - (t - upB) / 0.3) : 0;
    bayGap(c, t, GEN, { open: o + jolt });
    c.restore();
  });
  // 17 · Shove the first pallet into the drift
  add('shove', L0('l12') - 0.1, (c, t, lt) => driftTunnel(c, t, GEN, { n: 1, slide: seg(t, ww('l12', 'shove'), ww('l12', 'drift') + 0.3) }));
  // 18 · Pull back: a tunnel of meat
  add('tunnel', L0('l13') - 0.1, (c, t, lt) => { const d = L1('l13') - L0('l13') + 0.4; driftTunnel(c, t, GEN, { n: 6, pull: ss(seg(lt, 0, d)) }); });
  // 19 · Day three, six in the morning (Thursday)
  add('lock3', L0('l14') - 0.15, (c, t, lt) => {
    c.fillStyle = '#10151E'; c.fillRect(0, 0, W, H);
    const r = phoneScreen(c, t, { bars: 0, time: '6:00', day: 'Thursday' }); fingers(c); return r;
  });
  // 20 · The generator coughs twice and dies
  const coughA = ww('l14', 'coughs'), deadT = ww('l14', 'dies');
  add('gen', ww('l14', 'the') - 0.1, (c, t, lt) => {
    const k = seg(t, coughA - 0.1, deadT + 0.1), dead = t > deadT + 0.1;
    generator(c, t, dead ? DARK : GEN, { cough: k, dead });
    if (dead) darkness(c, [], 0.55 * seg(t, deadT + 0.1, deadT + 0.5));
  });
  // 21 · The lights die one by one, near to far, then black
  add('lightsOut', L0('l15') - 0.1, (c, t, lt) => {
    const a = L0('l15'), b = ww('l15', 'black');
    const n = Math.floor(seg(t, a, b) * 8);
    aisle(c, t, GEN, { stock: 'mixed', cam: { h: 3.2, vy: 700, f: 620 }, fixturesOn: i => i % 2 === 0 && i >= n * 2 });
    c.fillStyle = rgba('#02040A', 0.1 * n + (t > b ? 0.95 : 0)); c.fillRect(0, 0, W, H);
  });
  // 22 · Dark dock: Dana lifts the fuel can in two flashlight beams; it's empty
  const liftT = ww('l16', 'lifts');
  add('can', L0('l16') - 0.1, (c, t, lt) => {
    loadingDock(c, t, DARK);
    const up = ss(seg(t, liftT - 0.2, liftT + 0.5)), tilt = ss(seg(t, ww('l16', 'bone') - 0.2, ww('l16', 'bone') + 0.4)) * 0.9 + Math.sin(t * 9) * 0.05 * up;
    person(c, DANA, { x: 560, y: 1780, s: 1.25, face: 0.1, look: [0.2, -0.4], blink: blinkAt(t, 5), breathe: breathe(t, 1), brows: -0.6, mouth: talk(t, t > ww('l16', 'it') - 0.05), hold: 'fuelcan', canTilt: tilt, armR: [lerp(0.3, 1.0, up), lerp(0.2, -0.5, up)], t }, DARK);
    darkness(c, [{ x: 40, y: 1650, ang: -0.55, len: 1300, spread: 0.26 }, { x: 1060, y: 1500, ang: -2.55, len: 1200, spread: 0.24 }], 0.88);
  });
  // 23 · Marcus in a flashlight: "gone in two" / Dana turns
  add('marcusDark', L0('l17') - 0.1, (c, t, lt) => {
    c.fillStyle = '#05070C'; c.fillRect(0, 0, W, H);
    person(c, MARCUS, framed(MARCUS, 420, 820, 170, { face: 0.2, look: [0.4, 0.1], blink: blinkAt(t, 7), breathe: breathe(t, 2), brows: -0.8, mouth: talk(t, t < ww('l17', 'marcus')), t }), GEN);
    const turn = ss(seg(t, ww('l17', 'dana') - 0.1, ww('l17', 'turns') + 0.2));
    person(c, DANA, { x: 900, y: 1990, s: 1.3, back: turn < 0.5, face: -0.4, look: [-0.8, 0], mouth: talk(t, t > ww('l17', 'who') - 0.05), t }, GEN);
    darkness(c, [{ x: 760, y: 1900, ang: -2.0, len: 1500, spread: 0.3 }], 0.9);
  });
  // 24 · Four flashlights in the dark. Nobody speaks.
  add('four', L0('l18') - 0.1, (c, t, lt) => {
    const cam = { h: 1.7, vy: 880, f: 700 };
    aisle(c, t, DARK, { stock: 'mixed', cam, fixturesOn: () => false });
    const pos = [[-0.95, 2.6, YOU], [0.95, 2.9, DANA], [-0.35, 4.4, MARCUS], [0.55, 5.6, RAY]];
    const beams = [];
    pos.forEach(([X, Z, S], i) => { const p = aisleProj(cam, X, 0, Z), s = p.s * 1.75 / 640; person(c, S, { x: p.x, y: p.y, s, face: X > 0 ? -0.4 : 0.4, look: [X > 0 ? -0.5 : 0.5, 0], blink: blinkAt(t, i * 3 + 1), breathe: breathe(t, i), t }, DARK); beams.push({ x: p.x, y: p.y - 350 * s, ang: (X > 0 ? -2.5 : -0.6) + Math.sin(t * 0.7 + i * 1.7) * 0.25, len: 1100, spread: 0.16 }); });
    const pools = pos.map(([X, Z]) => { const p = aisleProj(cam, X, 0, Z); return { x: p.x, y: p.y - 250 * p.s * 1.75 / 640, r: 420 * p.s * 1.75 / 640, k: 0.8 }; });
    darkness(c, beams, 0.85, pools);
  });
  const endT = L1('l18') + 0.6;
  add('end', endT, (c, t, lt) => endCard(c, seg(lt, 0.7, 1.3)));
  return { S, endT, kickT, upA, upB, coughA, deadT, liftT };
}

const FEEDS = [
  (c, t) => aisle(c, t, GEN, { stock: 'cans', cam: { h: 4.4, vy: 230, f: 620 } }),
  (c, t) => aisle(c, t, GEN, { stock: 'water', cam: { h: 4.4, vy: 230, f: 620 } }),
  (c, t) => frozenWall(c, t, GEN, { dark: 1 }),
  (c, t) => loadingDock(c, t, GEN),
  (c, t) => aisle(c, t, GEN, { stock: 'mixed', cam: { h: 4.0, vy: 300, f: 600, x: 0.4 } }),
  (c, t) => aisle(c, t, GEN, { stock: 'pet', cam: { h: 4.4, vy: 220, f: 640 }, sign: '22' }),
  (c, t) => fireExit(c, t, GEN, {}),
  (c, t) => aisle(c, t, GEN, { stock: 'cans', cam: { h: 4.0, vy: 300, f: 600, x: -0.4 } }),
  (c, t) => bayGap(c, t, GEN, { open: 0 }),
];

function capAt(t) {
  for (const id of IDS) {
    if (t < L0(id) - 0.1 || t > L1(id) + 0.6) continue;
    const G = CAPS[id];
    for (let i = G.length - 1; i >= 0; i--) {
      const [a, b, text] = G[i], t0 = w(id, a) - 0.04, t1 = Math.min(we(id, b) + 0.4, i + 1 < G.length ? w(id, G[i + 1][0]) - 0.04 : 1e9);
      if (t >= t0 && t < t1) {
        let key = false;
        return { k: t - t0, words: text.split(' ').map(x => { const s = x.startsWith('*'), e = x.replace(/[.,?!]+$/, '').endsWith('*'); if (s) key = true; const r = { w: x.replace(/\*/g, ''), key }; if (e) key = false; return r; }) };
      }
      if (t >= t0) break;
    }
  }
  return null;
}

export async function init(ctx, q = new URLSearchParams()) {
  const NOSUB = q.get('nosub') === '1';
  const [timing, lines] = await Promise.all([new URL('./voices/timing.json', import.meta.url), new URL('./lines.json', import.meta.url)].map(u => fetch(u).then(r => r.json())));
  build(timing, lines);
  const K = shots(); const S = K.S;
  window.DUR = Math.round((K.endT + 0.7 + 4.67) * 30) / 30;
  // ---- sound events for mix.py ----
  const ev = [{ t: LEAD, type: 'vo', file: 'voices/narration.wav' }];
  for (const id of IDS) ev.push({ t: L0(id), type: 'line', id, t1: L1(id) });
  ev.push({ t: K.kickT, type: 'kick' }, { t: K.kickT + 0.1, type: 'hiss' });
  ev.push({ t: S.find(s => s.name === 'playback').t0, type: 'static' });
  ev.push({ t: S.find(s => s.name === 'alarm').t0, type: 'alarm' }, { t: S.find(s => s.name === 'dock').t0, type: 'alarmOff' });
  ev.push({ t: K.upA, type: 'doorUp' }, { t: K.upB, type: 'doorStop' });
  ev.push({ t: ww('l12', 'drift'), type: 'thud' });
  ev.push({ t: K.coughA, type: 'cough' }, { t: K.coughA + 0.45, type: 'cough' }, { t: K.deadT + 0.1, type: 'genDie' });
  ev.push({ t: K.liftT + 0.2, type: 'canSlosh' });
  ev.push({ t: S.find(s => s.name === 'four').t0, type: 'droneDrop' });
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
    if (sh.name !== 'end') { vignette(ctx, 0.36); const cp = NOSUB ? null : capAt(t); if (cp) caption(ctx, cp.words, cp.k); }
  };
  window.TEXTS = t => { window.render(t); return texts; };
}
