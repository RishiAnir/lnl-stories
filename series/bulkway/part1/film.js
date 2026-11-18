// BULKWAY — Part 1 "After Close", revision 2. The voice sets the clock: one continuous narration track
// (voices/narration.wav, built by voice.py from five Kokoro chunks) and its line/word times in voices/timing.json.
// Shots cut on those times; the voice is never moved, stretched or cut to fit a shot.
import { P, W, H, FULL, GEN, clamp, lerp, seg, ss, eo, ei, camera, blinkAt, breathe, vignette, rgba, fillRR, ell } from '../assets/kit.js';
import { person, YOU, DANA, MARCUS, stranger, headCenter } from '../assets/chars.js';
import { entrance, aisle, aisleProj, ladder, bedding, mattress, frozenWall, doorGap, loadingDock, monitorScreen, office, desk, waterWall, wallClock, freezerDrip } from '../assets/sets.js';
import { messageBubble, countyAlert, generatorMeter, phoneScreen, camGrid, camFull, endCard, caption, TEXT } from '../assets/ui.js';

const LEAD = 0.5;   // seconds of picture before the first word

// ---------- captions: [first word, last word, text]; *key* = orange. Only the words in the script's Caption column are shown,
// each group from its first spoken word until just after its last (or the next group).
const CAPS = {
  l01: [[0, 1, 'Just before'], [2, 4, '*eleven*...'], [11, 12, "Storm's *early*"]],
  l02: [[0, 2, 'Three of you'], [7, 7, 'Dana'], [10, 11, 'the *keys*'], [13, 13, 'Marcus'], [16, 17, 'the *forklift*']],
  l03: [[3, 4, 'A foot'], [5, 7, 'and a half'], [10, 11, 'by *morning*']],
  l04: [[5, 6, 'Enough water'], [7, 9, 'to fill a'], [10, 11, '*swimming pool*']],
  l05: [[10, 11, 'The lights'], [12, 12, '*flicker*']],
  l06: [[1, 2, 'The freezers'], [3, 4, 'go *quiet*']],
  l07: [[4, 5, 'Only *half*'], [8, 9, 'come back']],
  l08: [[15, 16, 'Two inches'], [17, 17, 'Then they'], [18, 18, '*stop*']],
  l09: [[9, 10, 'Nothing but'], [11, 11, '*white*'], [17, 19, '*Eight feet* up']],
  l10: [[9, 10, 'Plows'], [11, 11, '*suspended*']],
  l11: [[9, 10, 'Fuel for'], [11, 12, '*three days*'], [20, 21, 'Already'], [22, 23, '*dripping*']],
  l12: [[4, 5, 'The *cameras*']],
  l13: [[0, 1, 'Camera 6'], [2, 3, 'Aisle 22'], [4, 5, '*Pet food*']],
  l14: [[0, 1, 'Someone is'], [2, 5, '*sitting* there']],
  l15: [[6, 6, 'Nobody'], [7, 8, 'came *in*']],
  l16: [[4, 4, 'Already'], [5, 5, '*inside*']],
};
const IDS = Object.keys(CAPS);

let TL, SPOKEN;
function build(timing) {
  TL = {};
  for (const id of IDS) {
    const T = timing.lines[id];
    TL[id] = { t0: LEAD + T.t0, t1: LEAD + T.t1, ws: T.words.map(([w, a, b]) => [w, LEAD + a, LEAD + b]) };
  }
}
const W_ = (id, i) => TL[id].ws[Math.min(i, TL[id].ws.length - 1)];
const w = (id, i) => W_(id, i)[1], we = (id, i) => W_(id, i)[2], L0 = id => TL[id].t0, L1 = id => TL[id].t1;

// ---------- feeds for the camera wall (drawn in 1080×1920 design space) ----------
const HI = { h: 4.4, vy: 230, f: 620 };
let CAM06_TURN = 0;
const FEEDS = [
  (c, t) => entrance(c, t, GEN, { drift: 0.85, storm: 0.95, lamps: 0 }),
  (c, t) => aisle(c, t, GEN, { stock: 'cans', cam: HI }),
  (c, t) => frozenWall(c, t, GEN, { dark: 1 }),
  (c, t) => loadingDock(c, t, GEN),
  (c, t) => aisle(c, t, GEN, { stock: 'water', cam: HI }),
  (c, t) => cam06(c, t, CAM06_TURN),
  (c, t) => { bedding(c, t, GEN); mattress(c, 470, 1420, GEN); },
  (c, t) => aisle(c, t, GEN, { stock: 'mixed', cam: { h: 4.0, vy: 300, f: 600, x: 0.4 } }),
  (c, t) => doorGap(c, t, GEN, 1),
];
function cam06(c, t, turn) {
  const cam = { h: 4.4, vy: 220, f: 640 };
  aisle(c, t, GEN, { stock: 'pet', cam, sign: '22' });
  const p = aisleProj(cam, 0.35, 0, 3.6);
  stranger(c, p.x, p.y, 0.52, t, turn);
}

// ---------- shots ----------
const blurCache = new Map();
function blurred(key, drawFn, px = 14) {
  let oc = blurCache.get(key);
  if (!oc) { oc = new OffscreenCanvas(W, H); const o = oc.getContext('2d'); o.filter = `blur(${px}px)`; const tmp = new OffscreenCanvas(W, H); drawFn(tmp.getContext('2d')); o.drawImage(tmp, 0, 0); blurCache.set(key, oc); }
  return oc;
}
const bounceAt = (t, t0) => Math.sin(Math.PI * clamp((t - t0) / 0.38));
// a close-up: place S so the head centre lands at (hx, hy) with head radius r
const framed = (S, hx, hy, r, extra = {}) => { const s = r / 53, pose = Object.assign({ x: hx, y: 0, s }, extra); pose.y = hy - (headCenter(S, pose).y); return pose; };
const youLadder = (t, extra = {}) => Object.assign({ x: 300, y: 1170, s: 1.0, face: -0.5, look: [-0.8, -0.7], blink: blinkAt(t, 1), breathe: breathe(t), mouth: 'flat', armL: [2.7 + Math.sin(t * 2.2) * 0.1, 0.25], armR: [0.15, 0.1], hold: 'can', pocketPhone: true, t }, extra);
const fingers = c => { ell(c, 70, 1100, 70, 120, P.skinAS); ell(c, 900, 1180, 70, 140, P.skinA); ell(c, 890, 1360, 60, 110, P.skinA); };

function shots() {
  const S = [];
  const add = (name, t0, draw) => S.push({ name, t0, draw });
  const buzz1 = 0.08, buzz2 = 0.62;
  // 1 · Aisle 14, ladder, phone buzz in the vest pocket
  add('aisle14', 0, (c, t, lt) => {
    c.save(); camera(c, 1 + lt * 0.006, 300, 900);
    aisle(c, t, FULL, { stock: 'cans', sign: '14' }); ladder(c, 300, 1170, 1, FULL);
    const look = seg(t, 0.55, 0.8), lower = ss(seg(t, 0.75, 1.25));
    person(c, YOU, youLadder(t, {
      buzz: (t > buzz1 && t < buzz1 + 0.5) || (t > buzz2 && t < buzz2 + 0.5),
      look: [lerp(-0.8, -0.3, look), lerp(-0.7, 0.9, look)], face: lerp(-0.5, -0.1, look), brows: look * 0.4,
      armL: [lerp(2.7 + Math.sin(t * 2.2) * 0.1, 0.5, lower), lerp(0.25, 1.9, lower)], hold: lower > 0.5 ? null : 'can',
    }));
    c.restore();
  });
  // 2 · The lock screen: 10:58 PM, the manager's text lands
  const lockT = w('l01', 3) - 0.1, notifT = lockT + 0.15;
  add('lock', lockT, (c, t, lt) => {
    c.drawImage(blurred('a14', o => aisle(o, 0, FULL, { stock: 'cans', sign: '14' })), 0, 0);
    c.fillStyle = rgba('#141A24', 0.45); c.fillRect(0, 0, W, H);
    c.save(); camera(c, 0.94 + lt * 0.01, 540, 900);
    const r = phoneScreen(c, t, { bars: 3, time: '10:58', ampm: 'PM', day: 'Monday', notif: seg(t, notifT, notifT + 0.4) });
    fingers(c); c.restore();
    return r;
  });
  // 3 · Close-up: you look up from the phone
  add('youCU', w('l01', 13) - 0.12, (c, t, lt) => {
    c.drawImage(blurred('a14', o => aisle(o, 0, FULL, { stock: 'cans', sign: '14' })), 0, 0);
    c.fillStyle = rgba('#141A24', 0.25); c.fillRect(0, 0, W, H);
    c.save(); camera(c, 1 + lt * 0.012, 520, 800);
    const up = ss(seg(lt, 0.15, 0.55));
    person(c, YOU, framed(YOU, 540, 760, 205, { face: -0.15, look: [-0.25, lerp(0.8, 0.1, up)], blink: blinkAt(t, 3), breathe: breathe(t), brows: up * 0.8, mouth: up > 0.5 ? 'flat' : 'tight', armL: [0.25, 2.5], hold: 'phoneBack', t }));
    c.restore();
    const g = c.createRadialGradient(470, 900, 20, 470, 900, 460); g.addColorStop(0, rgba('#CFE8FF', 0.16 * (1 - up * 0.5))); g.addColorStop(1, rgba('#CFE8FF', 0)); c.fillStyle = g; c.fillRect(0, 0, W, H);
  });
  // 4 · The three of you at the front entrance (faces above the caption band)
  add('trio', L0('l02') - 0.15, (c, t, lt) => {
    entrance(c, t, FULL, { storm: 0.35, drift: 0.04 });
    const tY = w('l02', 6), tD = w('l02', 7), tM = w('l02', 13);
    const jing = clamp(1 - Math.abs(t - w('l02', 11) - 0.2) / 0.8);
    const s = 1.45, y = 1800;
    // Marcus with a pallet jack handle
    c.save(); c.translate(960, 1800); c.rotate(-0.22); fillRR(c, -9, -620, 18, 620, 9, '#2A2F38'); fillRR(c, -44, -640, 88, 24, 12, '#2A2F38'); c.restore();
    person(c, MARCUS, { x: 820, y, s, rot: 0.03, face: -0.2, look: [-0.3, 0], blink: blinkAt(t, 7), breathe: breathe(t, 2), bounce: bounceAt(t, tM), mouth: 'flat', armR: [0.55, -0.3], t });
    person(c, DANA, { x: 540, y, s, face: 0.1, look: [0.2, 0], blink: blinkAt(t, 5), breathe: breathe(t, 1), bounce: bounceAt(t, tD), mouth: t > tD ? 'smile' : 'flat', jingle: jing, armR: [0.15 + jing * 0.2, 0.25 * jing], t });
    person(c, YOU, { x: 250, y, s, face: 0.2, look: [0.3, 0], blink: blinkAt(t, 2), breathe: breathe(t, 3), bounce: bounceAt(t, tY), mouth: 'smile', pocketPhone: true, t });
  });
  // 5 · The forecast: the snow line climbs the glass in a quick time-lapse
  add('snowline', L0('l03') - 0.1, (c, t, lt) => {
    const d = L0('l04') - L0('l03'), k = seg(lt, 0.2, d - 0.1);
    const step = Math.floor(k * 24) / 24;                                     // time-lapse: the drift climbs in small jumps
    c.save(); camera(c, 1.3, 540, 1180);
    entrance(c, t * 5, FULL, { storm: lerp(0.45, 0.85, k), lamps: lerp(1, 0.4, k), drift: lerp(0.03, 0.62, ss(step)) });
    c.restore();
    c.fillStyle = rgba('#0B1220', 0.10 * Math.sin(lt * 9) ** 2); c.fillRect(0, 0, W, H);   // the time-lapse light flutter
  });
  // 6 · Water: a slow tilt up a wall of shrink-wrapped pallets, the crew tiny at the bottom
  add('water', L0('l04') - 0.15, (c, t, lt) => {
    const d = w('l04', 12) - L0('l04'), pan = ss(seg(lt, 0.3, d + 0.1)) * 0.9;
    const floor = waterWall(c, t, FULL, { pan });
    const s = 0.3;
    person(c, YOU, { x: 420, y: floor, s, face: 0.1, look: [0, -1], brows: 0.6, blink: blinkAt(t, 2), mouth: 'o', t }, FULL);
    person(c, DANA, { x: 540, y: floor, s, face: -0.1, look: [0, -1], blink: blinkAt(t, 5), t }, FULL);
    person(c, MARCUS, { x: 660, y: floor, s, face: -0.3, look: [-0.2, -1], blink: blinkAt(t, 7), armR: [0.4, 0.4], t }, FULL);
  });
  // 7 · Bedding aisle flop (lands on "sleep")
  add('bedding', w('l04', 12) - 0.15, (c, t, lt) => {
    bedding(c, t, FULL);
    const tl = w('l04', 15) + 0.05;
    const f = ei(seg(t, tl - 0.42, tl)), land = clamp((t - tl) / 0.35);
    const sq = t > tl ? Math.sin(land * Math.PI) * (1 - land) * 1.2 : seg(t, tl - 0.6, tl - 0.42) * 0.25;
    mattress(c, 470, 1560, FULL, t > tl ? Math.sin(land * Math.PI) * 0.8 : 0);
    person(c, YOU, { x: 840, y: lerp(1640, 1470, f), s: 0.86, rot: -f * 1.52, squash: sq, face: lerp(0.1, 0.4, f), look: [0, -0.4], blink: blinkAt(t, 4), mouth: 'grin', brows: 0.5, armL: [lerp(0.2, 2.7, f), 0.2], armR: [lerp(0.2, 2.5, f), 0.2], noShadow: f > 0.2, pocketPhone: true, t });
  });
  // 8 · Aisle 14 at two in the morning: the lights flicker twice
  const f0 = w('l05', 12) - 0.05;
  const flick = t => (t > f0 && t < f0 + 0.09) || (t > f0 + 0.24 && t < f0 + 0.38) ? 1 : 0;
  add('flicker', L0('l05') - 0.15, (c, t, lt) => {
    const k = flick(t), L = { power: 1, flick: k };
    aisle(c, t, L, { stock: 'cans', sign: '14', fixturesOn: () => !k }); ladder(c, 300, 1170, 1, L);
    const up = ss(seg(t, f0 + 0.1, f0 + 0.35));
    person(c, YOU, youLadder(t, { look: [lerp(-0.8, 0.1, up), lerp(-0.7, -1, up)], face: lerp(-0.5, -0.1, up), brows: up * 0.9, mouth: up > 0.5 ? 'o' : 'flat' }), L);
  });
  // 9 · Frozen wall: compressors cut, the door lights die left → right
  const humCut = w('l06', 4) + 0.1;
  const thunkT = w('l07', 2) - 0.04, genCut = thunkT - 0.5;                   // half a second of dark, then the generator
  add('frozen', L0('l06') - 0.1, (c, t, lt) => {
    frozenWall(c, t, FULL, { dark: seg(t, humCut, humCut + 0.45) });
    c.fillStyle = rgba('#05070B', 0.6 * seg(t, humCut + 0.3, humCut + 0.55)); c.fillRect(0, 0, W, H);
  });
  // 10 · The generator: the main aisle in the dark, a thunk, then every other row of lights comes back cold
  const genCam = { h: 3.2, vy: 700, f: 620, x: 0 };
  add('gen', genCut, (c, t, lt) => {
    const k = t - thunkT, row = i => k > 0.18 + (i >> 1) * 0.07;                 // rows come on near → far after the thunk
    const any = k > 0.18, flick = any ? 0 : 1;
    const L = { power: 0, flick: k < 0 ? 1 : flick * 0.6 };
    aisle(c, t, L, { stock: 'mixed', cam: genCam, fixturesOn: i => i % 2 === 0 && row(i) });
    if (k < 0) { c.fillStyle = rgba('#03050A', 0.72); c.fillRect(0, 0, W, H); }
    const p = aisleProj(genCam, 0.25, 0, 3.0);
    person(c, YOU, { x: p.x, y: p.y, s: p.s * 1.75 / 640, face: 0.1, look: [0, -1], brows: 0.7, blink: blinkAt(t, 3), breathe: breathe(t), mouth: 'tight', armL: [0.2, 0.1], t }, k < 0 ? { power: 0, flick: 1 } : GEN);
  });
  // 11 · Front doors at four: the clock, then Dana pushes; two inches and stop
  const pushT = w('l08', 11), openA = w('l08', 13), openB = w('l08', 16) + 0.15, stopT = w('l08', 18);
  add('doors', L0('l08') - 0.15, (c, t, lt) => {
    const o = ss(seg(t, openA, openB)) * 13, rat = t > stopT && t < stopT + 0.45 ? Math.sin((t - stopT) * 70) * 2.5 * (1 - (t - stopT) / 0.45) : 0;
    const zoom = lerp(1, 1.3, ss(seg(t, w('l08', 6), pushT - 0.2)));
    c.save(); camera(c, zoom, 560, 1500);
    entrance(c, t, GEN, { storm: 0.92, lamps: 0, drift: lerp(0.78, 0.86, seg(lt, 0, 6)), doorOpen: o + rat });
    wallClock(c, 540, 175, 92, 4, 0, GEN);
    const push = ss(seg(t, pushT - 0.3, pushT + 0.1));
    // Dana from behind, at the glass: hands flat on both panels, leaning in; the shove recoils when the doors stop
    const rec = t > stopT ? Math.sin(clamp((t - stopT) / 0.35) * Math.PI) * 0.6 : 0;
    person(c, DANA, { x: 470, y: 1440, s: 1.0, back: true, breathe: breathe(t), rot: 0.03 * push, bounce: 0.06 * rec, armL: [lerp(0.12, 0.55, push), lerp(0.1, 2.3, push) - rec * 0.3], armR: [lerp(0.12, 0.55, push), lerp(0.1, 2.3, push) - rec * 0.3], t }, GEN);
    c.restore();
  });
  // 12 · The 2-inch gap
  const gapT = L1('l08') + 0.1;
  add('gap', gapT, (c, t, lt) => { c.save(); camera(c, 1 + lt * 0.025, 470, 1200); doorGap(c, t, GEN, seg(lt, 0, 1.2)); c.restore(); });
  // 13 · Loading dock: Marcus walks to the monitor, push-in
  const dockT = L0('l09') + 0.35;
  add('dock', dockT, (c, t, lt) => {
    const pu = ss(seg(t, w('l09', 3), w('l09', 5) - 0.1));
    c.save(); camera(c, 1 + pu * 0.45, 230, 700);
    loadingDock(c, t, GEN);
    const wk = seg(lt, 0.05, 1.4), x = lerp(880, 430, ss(wk));
    person(c, MARCUS, { x, y: 1800, s: 0.95, face: -0.7, look: [-0.9, wk >= 1 ? -0.8 : 0], walk: wk > 0 && wk < 1 ? lt * 1.7 : null, blink: blinkAt(t, 7), breathe: breathe(t), armR: [0.12, 0.1], armL: [0.12 + (wk > 0 && wk < 1 ? Math.sin(lt * 1.7 * Math.PI * 2) * 0.22 : 0), 0.1], mouth: 'flat', t }, GEN);
    c.restore();
  });
  // 14 · Monitor close-up: solid white, 8 FT
  add('monitor', w('l09', 5) - 0.1, (c, t, lt) => { c.save(); camera(c, 1 + lt * 0.012, 490, 850); monitorScreen(c, t, GEN); c.restore(); });
  // 15 · Phone: one bar, 4:12 on the lock screen; the county alert drops
  const alertT = w('l10', 5) - 0.45;
  add('phone', L0('l10') - 0.15, (c, t, lt) => {
    c.fillStyle = '#10151E'; c.fillRect(0, 0, W, H);
    phoneScreen(c, t, { bars: 1, time: '4:12', day: 'Tuesday' });
    fingers(c);
  });
  // 16 · Office: Dana does the math (the gauge card comes in on "The generator")
  const gaugeT = w('l11', 4) - 0.1, dripT = w('l11', 13) - 0.12;
  add('office', L0('l11') + 0.25, (c, t, lt) => {
    office(c, t, GEN, { view: 'front' });
    const tap = Math.max(0, Math.sin(t * 9)) * (lt > 0.4 ? 1 : 0);
    person(c, DANA, framed(DANA, 540, 950, 104, { legs: 'sit', glasses: 'on', hold: 'calc', face: 0, look: [-0.25, 0.85], blink: blinkAt(t, 5) * 0.6, breathe: breathe(t), armL: [0.45, 3.85 + tap * 0.04], armR: [0.45, 3.55 + tap * 0.12], brows: -0.3, mouth: Math.floor(t * 6) % 3 === 0 ? 'open' : 'flat', t }), GEN);
    desk(c, 1640, GEN);
  });
  // 17 · Thawing: the freezer glass fogs, a drip runs, a puddle spreads
  add('drip', dripT, (c, t, lt) => {
    const d = L0('l12') - 0.15 - dripT;
    c.save(); camera(c, 1 + lt * 0.02, 540, 1500);
    freezerDrip(c, t, GEN, { fog: seg(lt, 0, d * 0.45), drip: seg(lt, d * 0.25, d * 0.8), puddle: seg(lt, d * 0.5, d + 0.3) });
    c.restore();
  });
  // 18 · Over the shoulder: the camera wall lights up
  const gridOn = w('l12', 2);
  add('grid', L0('l12') - 0.15, (c, t, lt) => {
    office(c, t, GEN, { view: 'grid' });
    fillRR(c, 90, 240, 800, 690, 18, '#1A1E26');
    const on = seg(t, gridOn, gridOn + 0.6);
    camGrid(c, t, { x: 110, y: 300, w: 760, h: 610 }, FEEDS, { on });
    if (on > 0) { const g = c.createLinearGradient(0, 300, 0, 1500); g.addColorStop(0, rgba('#BFD3F0', 0.14 * on)); g.addColorStop(1, rgba('#BFD3F0', 0)); c.fillStyle = g; c.fillRect(0, 0, W, H); }
    desk(c, 1440, GEN, false);
    fillRR(c, 330, 1400, 300, 40, 8, '#2A2F38');
    const lean = ss(seg(t, gridOn + 0.2, gridOn + 0.9));
    person(c, YOU, { x: 200, y: 1930, s: 1.02, back: true, rot: 0.04 + lean * 0.08, breathe: breathe(t), t }, GEN);
    person(c, MARCUS, { x: 800, y: 1990, s: 1.0, back: true, rot: -0.03 - lean * 0.08, breathe: breathe(t, 2), t }, GEN);
    const tap = ss(seg(t, gridOn - 0.35, gridOn - 0.05)) * (1 - ss(seg(t, gridOn + 0.1, gridOn + 0.4)));
    person(c, DANA, { x: 490, y: 1870, s: 1.1, back: true, legs: 'sit', armR: [0.5 + tap * 1.0, 0.5], armL: [0.3, 0.5], breathe: breathe(t, 1), t }, GEN);
  });
  // 19 · The grid: CAM 06 highlights, then expands
  add('gridUI', L0('l13') - 0.1, (c, t, lt) => {
    c.fillStyle = '#07090D'; c.fillRect(0, 0, W, H);
    c.save(); camera(c, 1 + lt * 0.01, 465, 900);
    const ex = seg(t, w('l13', 4) - 0.1, L1('l13') + 0.3);
    camGrid(c, t, { x: 30, y: 420, w: 880, h: 1000 }, FEEDS, { on: 1, hi: seg(t, w('l13', 0), w('l13', 0) + 0.15) * (1 - ex), expand: ex });
    c.restore();
  });
  // 20 · CAM 06 full screen
  const cam06Push = (s, fx, fy) => (o, t) => { o.save(); camera(o, s, fx, fy); cam06(o, t, CAM06_TURN); o.restore(); };
  add('cam06', L0('l14') - 0.15, (c, t, lt) => {
    CAM06_TURN = 0;
    return camFull(c, t, cam06Push(1.7 + lt * 0.03, 602, 930), TEXT.cam06, 12 + (t - L0('l14')));
  });
  // 21 · Dana: the key ring on her belt (close-up, head and shoulders)
  add('danaCU', L0('l15') - 0.15, (c, t, lt) => {
    c.drawImage(blurred('off', o => office(o, 0, GEN, { view: 'front' }), 12), 0, 0);
    c.save(); camera(c, 1 + lt * 0.018, 560, 900);
    fillRR(c, 250, 380, 580, 1300, 80, '#23272F');
    const down = ss(seg(t, w('l15', 1), w('l15', 1) + 0.4));
    person(c, DANA, framed(DANA, 545, 700, 190, { legs: 'sit', glasses: 'cord', face: lerp(0, 0.25, down), look: [lerp(0, 0.7, down), lerp(0, 1, down)], blink: blinkAt(t, 9) * (1 - down), brows: lerp(0, -0.7, down), mouth: down > 0.5 ? 'tight' : 'flat', breathe: breathe(t), armL: [0.1, 0.1], armR: [0.1, 0.1], t }), GEN);
    c.restore();
    const g = c.createLinearGradient(0, 0, 700, 0); g.addColorStop(0, rgba('#9FC3FF', 0.16)); g.addColorStop(1, rgba('#9FC3FF', 0)); c.fillStyle = g; c.fillRect(0, 0, W, H);
  });
  // 22 · CAM 06: the head turns; cut before the face
  const cutEnd = L1('l16') + 0.45;
  add('turn', L0('l16') - 0.1, (c, t, lt) => {
    CAM06_TURN = 0.55 * ss(seg(t, w('l16', 2), cutEnd));
    return camFull(c, t, cam06Push(1.85 + lt * 0.06, 602, 930), TEXT.cam06, 12 + (t - L0('l14')));
  });
  // 23 · Black → end card
  const endT = cutEnd;
  add('end', endT, (c, t, lt) => endCard(c, seg(lt, 0.7, 1.3)));
  return { S, lockT, buzz1, buzz2, humCut, thunkT, genCut, gapT, alertT, gridOn, pushT, openA, stopT, endT, f0, notifT, gaugeT, dripT, dockT };
}

// ---------- overlays ----------
function overlays(c, t, K) {
  const out = [];
  const cu = K.S.find(x => x.name === 'youCU'), trio = K.S.find(x => x.name === 'trio');
  if (t >= cu.t0 && t < trio.t0) out.push(...messageBubble(c, 1, 100, 150));
  if (t >= K.alertT && t < K.gaugeT) { const sh = K.S.find(s => s.name === 'phone'); const end = K.S[K.S.indexOf(sh) + 1].t0; if (t < end) out.push(...countyAlert(c, clamp((t - K.alertT) / 0.55), 90, 380)); }
  if (t >= K.gaugeT && t < K.dripT) out.push(...generatorMeter(c, clamp((t - K.gaugeT) / 0.45), 0.3));
  return out;
}
function capAt(t) {
  for (const id of IDS) {
    if (t < L0(id) - 0.1 || t > L1(id) + 0.6) continue;
    const G = CAPS[id];
    for (let i = G.length - 1; i >= 0; i--) {
      const [a, b, text] = G[i], t0 = w(id, a) - 0.04, t1 = Math.min(we(id, b) + 0.4, i + 1 < G.length ? w(id, G[i + 1][0]) - 0.04 : 1e9);
      if (t >= t0 && t < t1) {
        let key = false;
        return { k: t - t0, words: text.split(' ').map(x => { const s = x.startsWith('*'), e = x.replace(/[.,]+$/, '').endsWith('*'); if (s) key = true; const r = { w: x.replace(/\*/g, ''), key }; if (e) key = false; return r; }) };
      }
      if (t >= t0) break;
    }
  }
  return null;
}

export async function init(ctx, q = new URLSearchParams()) {
  const NOSUB = q.get('nosub') === '1';
  const [timing, lines] = await Promise.all([new URL('./voices/timing.json', import.meta.url), new URL('./lines.json', import.meta.url)].map(u => fetch(u).then(r => r.json())));
  build(timing);
  SPOKEN = Object.fromEntries(lines.lines.map(l => [l.id, l.spoken]));
  const K = shots(); const S = K.S;
  window.DUR = Math.round((K.endT + 0.7 + 4.67) * 30) / 30;
  // ---- sound events for the mixer ----
  const ev = [{ t: LEAD, type: 'vo', file: 'voices/narration.wav' }];
  for (const id of IDS) ev.push({ t: L0(id), type: 'line', id, t1: L1(id) });
  ev.push({ t: K.buzz1, type: 'buzz' }, { t: K.buzz2, type: 'buzz' }, { t: K.notifT, type: 'ping' });
  ev.push({ t: w('l02', 11) + 0.05, type: 'keys' });
  ev.push({ t: S.find(s => s.name === 'snowline').t0, type: 'windUp' }, { t: S.find(s => s.name === 'water').t0, type: 'windDown' });
  ev.push({ t: w('l04', 15) + 0.05, type: 'thump' });
  ev.push({ t: K.f0, type: 'zap' }, { t: K.f0 + 0.24, type: 'zap' });
  ev.push({ t: K.humCut, type: 'humCut' }, { t: K.thunkT, type: 'thunk' });
  ev.push({ t: K.stopT, type: 'rattle' }, { t: K.pushT, type: 'push' });
  ev.push({ t: K.gapT, type: 'gap' });
  for (let k = 0; k < 5; k++) ev.push({ t: K.dockT + 0.05 + (k + 0.5) * (1.35 / 5.2), type: 'step', i: k });
  ev.push({ t: S.find(s => s.name === 'monitor').t0, type: 'muffle' }, { t: S.find(s => s.name === 'phone').t0, type: 'unmuffle' });
  ev.push({ t: K.alertT, type: 'alert' }, { t: K.gridOn - 0.05, type: 'click' });
  const dripS = S.find(s => s.name === 'drip'), dripE = S[S.indexOf(dripS) + 1].t0, dd = dripE - dripS.t0;
  for (let n = Math.ceil(dripS.t0 * 1.1); n / 1.1 < dripE; n++) if (n / 1.1 - dripS.t0 > dd * 0.47) ev.push({ t: n / 1.1, type: 'drip' });   // each drop lands as the drawn fall ends
  ev.push({ t: L0('l13'), type: 'droneDrop' });
  ev.push({ t: K.endT, type: 'silence' }, { t: K.endT + 0.7, type: 'hit' });
  ev.push({ t: S.find(s => s.name === 'gridUI').t0, type: 'shimmer' });
  for (const s of S) ev.push({ t: s.t0, type: 'cut', name: s.name });
  window.EV = ev.sort((a, b) => a.t - b.t);
  window.CUES = IDS.map(id => ({ t0: L0(id), t1: L1(id) + 0.2, text: SPOKEN[id] }));

  let texts = [];
  window.render = t => {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none';
    let i = S.length - 1; while (i > 0 && S[i].t0 > t) i--;
    const sh = S[i];
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    ctx.save(); const r = sh.draw(ctx, t, t - sh.t0) || []; ctx.restore();
    texts = [...r];
    if (sh.name !== 'end') {
      texts.push(...overlays(ctx, t, K));
      vignette(ctx, 0.36);
      const cp = NOSUB ? null : capAt(t); if (cp) caption(ctx, cp.words, cp.k);
    } else texts = r;
  };
  window.TEXTS = t => { window.render(t); return texts; };
}
