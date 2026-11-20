// DON'T MISS YOUR STOP — Part 1 "Wake Up". Soft style (assets/soft.js): round glowing faces, night-blue grade, blurred backgrounds.
// The narration (voices/narration.wav, Chatterbox) sets the clock; shots cut on its word times (voices/timing.json).
// Captions run continuously (every spoken word, 1-3 at a time, the Caption column's **keywords** in orange).
import { P, W, H, CAR, clamp, lerp, seg, ss, eo, camera, blinkAt, breathe, vignette, rgba, glow } from '../assets/kit.js';
import * as SO from '../assets/soft.js';
import { acrossBack, acrossBench, acrossClutter, doors, phoneCU, sheetInHands, ticketSoft, windowCU } from '../assets/softsets.js';
import { routeMap, rulesSheet, carLength, carProj, CAMLEN } from '../assets/sets.js';
import { endCard, caption, TEXT, titleTop, timeChip } from '../assets/ui.js';

const LEAD = 0.5;
TEXT.end = ['PART 2', 'Who wrote the rules?', "Follow so you don't miss it"];
const TITLE = "Don't Miss Your Stop", CHIP0 = { time: '11:52', ampm: 'PM', line: 'PART 1 · THE TRAIN HOME' }, CHIP = { time: '2:14', ampm: 'AM', line: 'PART 1 · ???' };

// ---------- timing + continuous captions ----------
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
// is this line being spoken in quotes right now (for talking mouths)?
const quoteOn = (id, t) => { const sp = LINES[id].spoken, a = sp.indexOf('"'); if (a < 0) return false; const before = sp.slice(0, a).split(/\s+/).filter(Boolean).length; return t >= w(id, before) - 0.05 && t <= L1(id); };
const talk = (t, on, rest = 'small') => on ? (Math.floor(t * 8) % 3 === 0 ? 'small' : 'o') : rest;

// ---------- the car across the aisle ----------
// ROW: who sits across from you. The man in the red tracksuit sits at 770; June sits at 330 until she moves to your side.
const ROW = [[1, 110], ['june', 330], [2, 550], ['red', 770], [5, 985]];
const who = k => k === 'june' ? SO.JUNE : k === 'red' ? SO.RED : SO.passenger(k);
const sway = (c, t, k = 1) => { c.translate(Math.sin(t * 1.3) * 3 * k, Math.sin(t * 2.1 + 1) * 2 * k); };
// opts: stare, paper (null | 0.95 over the face), lift (hands up together), wave (0..1 waving, follows the man in red), stand (0..1), step (0..1 toward him),
//       june (pose), skipJune, juneGone (her seat empty: she moved beside you), red (pose or false), before (the ordinary car)
function row(o, t, { stare = 0, paper = 0.95, lift = 0, wave = 0, stand = 0, step = 0, june = {}, skipJune = false, juneGone = false, red = {}, before = false } = {}) {
  for (const [k, x] of ROW) {
    if (k === 'june') {
      if (before || skipJune || juneGone) continue;
      SO.person(o, SO.JUNE, Object.assign({ x, y: 1010, s: 0.95, legs: 'sit', hold: 'knit', armL: [-0.1, -1.25], mouth: 'none', look: [0.15, 0.25], blink: blinkAt(t, 3), t }, june));
      continue;
    }
    if (k === 'red') {
      if (red === false) continue;
      if (before) { SO.person(o, SO.passenger(4), { x, y: 1010, s: 0.95, legs: 'sit', hold: 'phone', armL: [-0.15, -1.9], look: [0, 0.6] }); continue; }
      SO.person(o, SO.RED, Object.assign({ x, y: 1010, s: 0.95, legs: 'sit', hold: 'phone', armL: [-0.15, -1.9], look: [0, 0.5], mouth: 'none', blink: blinkAt(t, 12) }, red));
      continue;
    }
    const st = stand > 0.5, pose = { x: x + (step ? (770 - x) * 0.18 * step : 0), y: 1010 + (st ? 60 : 0) + step * 40, s: 0.95 * (1 + step * 0.06), legs: st ? 'stand' : 'sit', look: stare ? [0, 0] : [0, 0.4], blink: stare ? 0 : blinkAt(t, (+k || 3) + 5), mouth: 'none' };
    if (st) pose.y = 1010 + 120;
    if (before) { pose.hold = 'phone'; pose.armL = [-0.15, -1.9]; pose.look = [0, 0.6]; }
    else if (wave > 0) { const a = Math.sin(t * 9) * 0.35 * wave; pose.armL = [2.5 + a, 0.25]; pose.look = [0.5, 0]; }
    else if (lift > 0) { pose.armL = [lerp(0.12, 2.6, lift), lerp(0.1, 0.2, lift)]; pose.armR = [lerp(0.12, 2.6, lift), lerp(0.1, 0.2, lift)]; }
    else if (paper != null) pose.paper = paper;
    if (stand > 0.5) { pose.rot = 0; pose.look = [0.6, 0.2]; }
    SO.person(o, who(k), pose);
  }
}
function scarf(o) { o.save(); o.lineCap = 'round'; o.strokeStyle = '#8E2E36'; o.lineWidth = 26; o.beginPath(); o.moveTo(326, 900); o.bezierCurveTo(300, 1100, 470, 1180, 430, 1500); o.bezierCurveTo(400, 1700, 560, 1800, 520, 2000); o.stroke(); o.strokeStyle = '#B8434A'; o.lineWidth = 18; o.stroke(); o.restore(); }
function car(ctx, t, { blur = 0, cam = null, ...opt } = {}) {
  const draw = o => { o.save(); if (cam) camera(o, ...cam); sway(o, t); acrossBack(o, t, { speed: opt.before ? 1300 : 0, dark: opt.dark }); acrossBench(o); acrossClutter(o, { cup: !opt.before }); if (!opt.before && !opt.skipJune && !opt.juneGone) scarf(o); row(o, t, opt); o.restore(); };
  if (blur) { SO.blurred(ctx, blur, o => { o.setTransform(1, 0, 0, 1, 0, 0); draw(o); }); }
  else draw(ctx);
}
const framed = (S, x, y, r, extra = {}) => { const s = r / (SO.SOFT.head * (S.headK || 1)), pose = Object.assign({ x, y: 0, s }, extra); pose.y = y - SO.faceOf(S, pose).y; return pose; };
const juneCU = (c, t, extra = {}, r = 230, y = 760) => SO.person(c, SO.JUNE, framed(SO.JUNE, 540, y, r, Object.assign({ legs: 'sit', mouth: 'none', look: [0, 0.15], blink: blinkAt(t, 4), brows: 0.6, hold: 'knit', armL: [-0.1, -1.25], t }, extra)));
const youCU = (c, t, extra = {}, r = 240, y = 760) => SO.person(c, SO.YOU, framed(SO.YOU, 540, y, r, Object.assign({ legs: 'sit', mouth: 'none', look: [0, 0], blink: blinkAt(t, 9) }, extra)));
const redCU = (c, t, extra = {}, r = 220, y = 760) => SO.person(c, SO.RED, framed(SO.RED, 540, y, r, Object.assign({ legs: 'sit', mouth: 'none', look: [0, 0], blink: blinkAt(t, 12), hold: 'phone', armL: [-0.15, -1.9] }, extra)));
const eyelids = (c, k) => { if (k >= 1) return; const h = H * 0.5 * (1 - ss(k)); c.fillStyle = '#000'; c.fillRect(0, 0, W, h); c.fillRect(0, H - h, W, h); };
// you and June side by side on your bench, seen from across the aisle
function twoShot(c, t, { youTalk = false, juneTalk = false, juneLook = [-0.5, 0.1], youLook = [0.5, 0.1], youBrows = 0.4, juneBrows = 0.6, juneHold = 'knit' } = {}) {
  car(c, t, { blur: 9, juneGone: true }); SO.FACES.length = 0;
  SO.blob(c, 120, 820, 840, 1100, 80, '#46649A', 1.1);   // your bench behind the two of you
  SO.person(c, SO.YOU, framed(SO.YOU, 360, 760, 150, { legs: 'sit', look: youLook, mouth: talk(t, youTalk, 'none'), brows: youBrows, blink: blinkAt(t, 9) }));
  SO.person(c, SO.JUNE, framed(SO.JUNE, 730, 790, 145, { legs: 'sit', look: juneLook, mouth: talk(t, juneTalk, 'meek'), brows: juneBrows, blink: blinkAt(t, 4), hold: juneHold, armL: [-0.1, -1.25], t }));
}
// the newspaper on the floor where he stood: front page, a photo of a man in a red tracksuit
function floorPaper(c, t, k = 1) {
  let g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#3C4352'); g.addColorStop(1, '#1E222C'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 30; i++) { c.beginPath(); c.roundRect(0, i * 66, W, 3, 1); c.fillStyle = 'rgba(255,255,255,0.03)'; c.fill(); }
  c.save(); c.translate(540, 900); c.rotate(-0.12);
  SO.blob(c, -380, -460, 760, 940, 8, '#DCD8CC', 0.6);
  c.font = '400 64px "Archivo Black"'; c.fillStyle = '#2A2A30'; c.textAlign = 'center'; c.fillText('THE EVENING LINE', 0, -380);
  c.beginPath(); c.roundRect(-340, -350, 680, 6, 3); c.fillStyle = '#2A2A30'; c.fill();
  c.save(); c.beginPath(); c.roundRect(-300, -310, 600, 440, 6); c.clip(); c.fillStyle = '#9EA0A6'; c.fillRect(-300, -310, 600, 440);
  SO.person(c, SO.RED, framed(SO.RED, 0, -150, 110, { legs: 'sit', look: [0, 0], mouth: 'none', noGlow: true }));
  c.fillStyle = 'rgba(160,160,170,0.35)'; c.fillRect(-300, -310, 600, 440); c.restore();   // newsprint: washed out
  for (let r = 0; r < 7; r++) for (const x0 of [-300, 20]) { c.beginPath(); c.roundRect(x0, 170 + r * 36, 280 - (r % 3) * 30, 12, 6); c.fillStyle = 'rgba(70,70,80,0.5)'; c.fill(); }
  c.restore();
}
// two feet: June's kicks his
function kick(c, t, k) {
  // low, at floor level under the seats: his white sneaker, and June's shoe swinging in to kick it
  let g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1A1F2A'); g.addColorStop(0.55, '#141821'); g.addColorStop(0.56, '#3C4352'); g.addColorStop(1, '#262B36'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  SO.blob(c, 0, 700, W, 360, 0, '#2E4672', 0.6);                                          // seat fronts
  const jolt = k > 0.95 ? Math.sin((t * 40)) * 10 * Math.max(0, 1 - (k - 0.95) * 4) : 0;
  for (const [x, c1] of [[600, '#B42A27'], [780, '#A02420']]) { SO.limb(c, x, 700, x - 10 + (x === 600 ? jolt : 0), 1230, 46, c1); SO.oval(c, x + 10 + (x === 600 ? jolt : 0), 1260, 92, 44, '#F2F2F2'); }   // his legs and sneakers
  const kx = lerp(-60, 500, eo(k)); SO.limb(c, -160, 820, kx - 70, 1230, 40, '#8FB3CB'); SO.oval(c, kx, 1258, 86, 40, '#EDE8E2');   // June's leg, kicking
}
function shots() {
  const S = []; const add = (name, t0, draw, o = {}) => S.push(Object.assign({ name, t0, draw }, o));
  // ---- the ordinary train home ----
  // one continuous shot: you sit down on the ordinary train, then the camera eases in as your eyes close (no cut)
  const boardShot = (c, t, lt, push, close) => {
    car(c, t, { blur: 6 + push * 4, before: true }); SO.FACES.length = 0;
    const sink = ss(seg(lt, 0, 1.4));
    c.save(); camera(c, 1 + push * 0.22, 540, 700);
    SO.blob(c, 250, 760, 580, 1300, 80, '#46649A', 1.1);
    SO.person(c, SO.YOU, framed(SO.YOU, 540, lerp(700, 780, sink), 215, { legs: 'sit', look: [0.2 * (1 - close), 0.35 + 0.05 * close], blink: lerp(0.25 + blinkAt(t, 9) * 0.5, 1, close), mouth: 'none', rot: lerp(0.05, -0.02, sink) + close * 0.08 }));
    c.restore();
    if (close) { c.fillStyle = rgba('#000000', 0.85 * close); c.fillRect(0, 0, W, H); }
  };
  add('board', 0, (c, t, lt) => {
    const push = ss(seg(t, L0('l02') - 0.1, L1('l03'))), close = ss(seg(t, ww('l02', 'nap') - 0.6, L1('l02') + 0.6));
    boardShot(c, t, t, push, close);
  }, { title: 1, chip: CHIP0, grade: 'warm' });
  add('black', L0('l03') - 0.1, (c, t, lt) => { c.fillStyle = '#000'; c.fillRect(0, 0, W, H); }, { grade: 'none' });
  // ---- waking somewhere wrong ----
  add('wake', L0('l04') - 0.3, (c, t, lt) => {
    const look = Math.sin(seg(lt, 1.5, 6) * Math.PI) * 120;
    SO.blurred(c, lerp(14, 0, ss(seg(lt, 0, 2.2))), o => { o.setTransform(1, 0, 0, 1, 0, 0); o.save(); camera(o, 1.3, 540 + look, 700); car(o, t, {}); o.restore(); });
    eyelids(c, seg(lt, 0, 1.4));
  }, { chip: CHIP });
  const paxDown = [[-1.05, 2.6, 7], [1.05, 3.2, 8], [-1.05, 4.6, 9], [1.05, 5.4, 10], [-1.05, 7, 11], [1.05, 8.2, 12], [-1.05, 10, 13], [1.05, 11.5, 14]].sort((a, b) => b[1] - a[1]);
  // a rider on the side bench, seen from the aisle: back to the wall, knees toward the aisle, paper up and facing the aisle (hides the face)
  const benchRider = (c, side, z, S) => {
    const q = (X, Y, Z) => { const a = carProj(CAMLEN, side * X, Y, Z); return [a.x, a.y]; };
    const k0 = carProj(CAMLEN, 0, 0, z).k;
    const quad = (pts, col) => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fillStyle = col; c.fill(); c.lineJoin = 'round'; c.lineWidth = 0.035 * k0; c.strokeStyle = col; c.stroke(); };
    // a box from |X| x0 (aisle side) to x1 (wall side): we see its near face, its aisle face and (below eye level) its top
    const box = (x0, x1, y0, y1, z0, z1, col) => {
      quad([q(x0, y0, z0), q(x0, y0, z1), q(x0, y1, z1), q(x0, y1, z0)], SO.mixC(col, 0.78));   // aisle face
      if (y1 < CAMLEN.h) quad([q(x0, y1, z0), q(x0, y1, z1), q(x1, y1, z1), q(x1, y1, z0)], SO.mixC(col, 1.08 > 1 ? 1 : 1));   // top
      quad([q(x0, y0, z0), q(x1, y0, z0), q(x1, y1, z0), q(x0, y1, z0)], col);                  // near face
    };
    box(1.08, 1.34, 0.46, 1.1, z - 0.2, z + 0.2, S.top);                                         // torso against the wall
    const h = q(1.2, 1.3, z - 0.05); c.beginPath(); c.arc(h[0], h[1], 0.17 * k0, 0, Math.PI * 2); c.fillStyle = S.skin; c.fill();
    if (S.hairC) { c.beginPath(); c.arc(h[0], h[1] - 0.03 * k0, 0.175 * k0, Math.PI * 1.05, Math.PI * 1.95); c.fillStyle = S.hairC; c.fill(); }
    for (const dz of [0.04, -0.15]) {                                                             // the far leg first
      box(0.8, 1.1, 0.42, 0.56, z + dz, z + dz + 0.12, S.legs);                                    // thigh
      box(0.8, 0.92, 0.04, 0.44, z + dz, z + dz + 0.11, SO.mixC(S.legs, 0.85));                    // shin
      box(0.72, 0.92, 0, 0.07, z + dz - 0.01, z + dz + 0.12, S.shoe);                               // shoe
    }
    // the open paper, held up in front of the face, facing the aisle
    quad([q(0.95, 0.86, z - 0.36), q(0.95, 0.86, z + 0.3), q(0.95, 1.48, z + 0.3), q(0.95, 1.48, z - 0.36)], '#D9DEE8');
    quad([q(0.945, 0.86, z - 0.035), q(0.945, 0.86, z - 0.025), q(0.945, 1.48, z - 0.025), q(0.945, 1.48, z - 0.035)], '#A9B0BE');
    for (let r = 0; r < 6; r++) for (const [a2, b2] of [[-0.32, -0.07], [0.01, 0.26]]) { const y = 1.4 - r * 0.09; quad([q(0.945, y, z + a2), q(0.945, y, z + b2), q(0.945, y - 0.025, z + b2), q(0.945, y - 0.025, z + a2)], r ? '#9EA6B5' : '#6C7484'); }
    for (const dz of [-0.37, 0.31]) { const hnd = q(0.94, 1.12, z + dz); c.beginPath(); c.arc(hnd[0], hnd[1], 0.05 * k0, 0, Math.PI * 2); c.fillStyle = S.skin; c.fill(); }
  };
  const downCar = (c, t, beforeZ = 99, afterFn = null) => {
    carLength(c, t, CAR);
    for (const [X, Z, i] of paxDown) { if (Z <= beforeZ) continue; benchRider(c, Math.sign(X), Z, SO.passenger(i)); }
    afterFn && afterFn();
    for (const [X, Z, i] of paxDown) { if (Z > beforeZ) continue; benchRider(c, Math.sign(X), Z, SO.passenger(i)); }
  };
  add('down', L0('l05') - 0.1, (c, t, lt) => { c.save(); camera(c, 1.05 + lt * 0.015, 540, 760); sway(c, t); downCar(c, t); c.restore(); });
  add('phone', L0('l06') - 0.1, (c, t, lt) => {
    SO.blurred(c, 10, o => { o.setTransform(1, 0, 0, 1, 0, 0); acrossBack(o, t, { speed: 0 }); });
    c.save(); camera(c, 1 + lt * 0.02, 540, 800); phoneCU(c, t); c.restore();
    SO.lightPool(c, 540, 700, 700, '#9FB8FF', 0.35);
  }, { chip: CHIP });
  add('map', L0('l07') - 0.1, (c, t, lt) => { c.save(); camera(c, 1.25 + lt * 0.04, 560, 720); routeMap(c, t, CAR, { at: 1 }); c.restore(); });
  // ---- the old woman ----
  add('june', L0('l08') - 0.1, (c, t, lt) => {
    c.save(); camera(c, lerp(1.35, 1.9, ss(seg(lt, 0, 5))), lerp(540, 330, ss(seg(lt, 0, 5))), 760);
    car(c, t, { blur: 5, skipJune: true });
    scarf(c); SO.person(c, SO.JUNE, { x: 330, y: 1010, s: 0.95, legs: 'sit', hold: 'knit', armL: [-0.1, -1.25], mouth: 'none', look: [0, 0.6], blink: blinkAt(t, 3), t });
    c.restore();
  });
  add('watch', L0('l09') - 0.1, (c, t, lt) => { car(c, t, { blur: 9 }); SO.FACES.length = 0; juneCU(c, t, { look: [0, 0], blink: t > ww('l09', 'watching') ? 0 : blinkAt(t, 4), brows: 0.2 }, 200 + lt * 4); });
  add('falls', L0('l10') - 0.1, (c, t, lt) => {
    car(c, t, { blur: 9 }); SO.FACES.length = 0;
    const f = ss(seg(t, ww('l10', 'face') - 0.2, ww('l10', 'falls') + 0.4));
    juneCU(c, t, { look: [0, lerp(0, 0.1, f)], blink: 0, brows: lerp(0.2, 1, f), mouth: f > 0.5 ? 'small' : 'none', t: ww('l10', 'meet') }, 220);
  });
  add('ohno', L0('l11') - 0.1, (c, t, lt) => { car(c, t, { blur: 11 }); SO.FACES.length = 0; juneCU(c, t, { mouth: talk(t, quoteOn('l11', t), 'small'), look: [0, 0.1], brows: 1, blink: blinkAt(t, 4) }, 270 + lt * 6); });
  add('where', L0('l12') - 0.1, (c, t, lt) => { car(c, t, { blur: 10 }); SO.FACES.length = 0; youCU(c, t, { mouth: talk(t, quoteOn('l12', t), 'none'), brows: 0.7 }); });
  add('notsure', L0('l13') - 0.1, (c, t, lt) => { car(c, t, { blur: 11 }); SO.FACES.length = 0; juneCU(c, t, { mouth: talk(t, quoteOn('l13', t), 'meek'), look: [0.1, 0.2], brows: 0.8 }, 240); });
  // ---- she sits beside you; small talk ----
  add('beside', L0('l14') - 0.1, (c, t, lt) => twoShot(c, t, { juneTalk: quoteOn('l14', t) }));
  add('longday', L0('l15') - 0.1, (c, t, lt) => twoShot(c, t, { youTalk: t < ww('l15', 'they') - 0.1 && t > ww('l15', 'long') - 0.1, juneTalk: t > ww('l15', 'they') - 0.1 && t < L1('l15') }));
  add('elm', L0('l16') - 0.1, (c, t, lt) => twoShot(c, t, { juneTalk: t < ww('l16', 'she') && quoteOn('l16', t), youTalk: t > ww('l16', 'elm') - 0.1 && t < L1('l16') }));
  add('noelm', L0('l17') - 0.1, (c, t, lt) => { c.save(); camera(c, 1.35 + lt * 0.05, 540, 720); routeMap(c, t, CAR, { at: 1 }); c.restore(); });
  add('decide', L0('l18') - 0.1, (c, t, lt) => { car(c, t, { blur: 11, juneGone: true }); SO.FACES.length = 0; juneCU(c, t, { mouth: talk(t, quoteOn('l18', t), 'none'), look: [-0.1, 0.1], brows: 0.9 }, 230); });
  add('give', L0('l19') - 0.1, (c, t, lt) => {
    car(c, t, { blur: 10, juneGone: true }); SO.FACES.length = 0;
    juneCU(c, t, { mouth: talk(t, quoteOn('l19', t), 'meek'), brows: 0.7, look: [0, 0.4], hold: 'sheet', armL: [0.45, -2.0], sheetRot: -0.1 }, 170, 620);
    sheetInHands(c, t, 0.0);
  });
  // ---- the rules, one by one ----
  for (let i = 0; i < 9; i++) {
    const id = 'l' + String(20 + i).padStart(2, '0');
    add('rule' + (i + 1), L0(id) - 0.1, (c, t, lt) => { rulesSheet(c, t, { show: i + 1, hi: i, zoom: 0.55 + 0.04 * Math.sin(lt * 0.6), unfold: i === 0 ? ss(seg(lt, 0, 0.6)) : 1 }); }, { grade: 'paper' });
  }
  // ---- the conductor ----
  add('click', L0('l29') - 0.1, (c, t, lt) => {
    c.save(); camera(c, 1.05, 540, 760); sway(c, t);
    const z = lerp(14, 11, ss(seg(lt, 0, 3)));
    downCar(c, t, 99); const p = carProj(CAMLEN, 0, 0, z); SO.person(c, SO.CONDUCTOR, { x: p.x, y: p.y, s: p.s, mouth: 'wide', hold: 'punch', armL: [0.15, 2.4] });
    c.restore();
  });
  add('coming', L0('l30') - 0.1, (c, t, lt) => {
    c.save(); camera(c, 1.05, 540, 760); sway(c, t);
    const z = lerp(9, 3.6, ss(seg(lt, 0, L1('l30') - L0('l30') + 1.5)));
    downCar(c, t, z, () => { const p = carProj(CAMLEN, 0, 0, z); SO.person(c, SO.CONDUCTOR, { x: p.x, y: p.y, s: p.s, mouth: 'wide', hold: 'punch', armL: [0.15, 2.4], rot: Math.sin(t * 3) * 0.02 }); });
    c.restore();
  });
  add('filming', L0('l31') - 0.1, (c, t, lt) => {   // the man in red, phone up, filming him
    car(c, t, { blur: 10, juneGone: true, red: false }); SO.FACES.length = 0;
    redCU(c, t, { mouth: talk(t, quoteOn('l31', t), 'small'), look: [-0.4, -0.1], armL: [0.6, 2.0], phoneRot: -0.4, brows: -0.2 }, 200);
  });
  const kickT = ww('l32', 'kicks');
  add('argue', L0('l32') - 0.1, (c, t, lt) => {   // the conductor at his seat; he starts to argue
    car(c, t, { blur: 8, juneGone: true, red: false }); SO.FACES.length = 0;
    SO.person(c, SO.RED, framed(SO.RED, 330, 980, 120, { legs: 'sit', mouth: talk(t, t > ww('l32', 'argue') - 0.3, 'small'), look: [0.6, -0.4], hold: 'phone', armL: [-0.15, -1.9], brows: -0.5 }));
    SO.person(c, SO.CONDUCTOR, { x: 760, y: 2050, s: 1.75, rot: -0.04, mouth: 'wide', hold: 'punch', armL: [0.15, 2.4] });
  });
  add('kick', kickT - 0.15, (c, t, lt) => kick(c, t, seg(lt, 0.05, 0.3)));
  add('grin', L0('l33') - 0.1, (c, t, lt) => { car(c, t, { blur: 11, juneGone: true, red: false }); SO.FACES.length = 0; redCU(c, t, { mouth: t > ww('l33', 'grins') - 0.1 ? 'meek' : 'o', look: [0.6, -0.2], brows: 0.5, armL: [-0.15, -1.9] }, 220); });
  add('ticketplease', L0('l34') - 0.1, (c, t, lt) => {
    c.save(); camera(c, 1.5, 540, 700); car(c, t, { blur: 7, juneGone: true }); c.restore(); SO.FACES.length = 0;
    const lean = ss(seg(lt, 0, 1.2));
    SO.person(c, SO.CONDUCTOR, { x: 560, y: lerp(2700, 2560, lean), s: 2.7, rot: 0.05, mouth: 'wide', hold: 'punch', armL: [0.15, 2.4], armR: [0.1, 0.2], punchRot: 0.3 });
  });
  const punchT = ww('l35', 'click');
  add('pocket', L0('l35') - 0.1, (c, t, lt) => {   // a ticket you never bought; your smile; click
    car(c, t, { blur: 12, juneGone: true }); SO.FACES.length = 0;
    if (t < ww('l35', 'you', 6) - 0.1) { const up = eo(seg(lt, 0.2, 1.4)); ticketSoft(c, t, { holes: 0, y: lerp(1500, 800, up), rot: lerp(0.4, -0.08, up), s: 0.9, hand: 'left' }); }
    else if (t < punchT - 0.15) youCU(c, t, { look: [0, -0.3], mouth: 'meek', brows: 0.5 });
    else { const k = seg(t, punchT - 0.15, punchT); c.save(); camera(c, 1.25, 540, 760); ticketSoft(c, t, { holes: t > punchT ? 1 : 0, newHole: seg(t, punchT, punchT + 0.15), hand: 'left' }); c.save(); c.translate(760, lerp(560, 620, k)); c.rotate(0.3); SO.blob(c, -30, -200, 60, 220, 14, '#B7BEC8'); c.restore(); SO.oval(c, 780, lerp(400, 460, k), 70, 60, '#F4F3EE'); c.restore(); }
  });
  // ---- June's ticket ----
  add('lace', L0('l36') - 0.1, (c, t, lt) => {
    car(c, t, { blur: 12, juneGone: true }); SO.FACES.length = 0;
    const show = ww('l36', 'holds') - 0.1;
    if (t < show) { const pale = ss(seg(lt, 0.2, 1.2)); juneCU(c, t, { mouth: 'o', look: [0, 0.7], brows: 0.9, blink: 0, glow: 1 - 0.6 * pale }); c.fillStyle = rgba('#0A0F1E', 0.25 * pale); c.fillRect(0, 0, W, H); }
    else { const up = eo(seg(t, show, show + 0.9)); ticketSoft(c, t, { lace: 1, y: lerp(1500, 780, up), rot: lerp(-0.4, 0.05, up), s: lerp(0.9, 1.15, ss(seg(t, show, show + 4))), hand: 'june' }); }
  }, { sting: 1 });
  add('whisper', L0('l37') - 0.1, (c, t, lt) => { c.fillStyle = '#05070D'; c.fillRect(0, 0, W, H); car(c, t, { blur: 14, juneGone: true }); SO.FACES.length = 0; juneCU(c, t, { mouth: talk(t, quoteOn('l37', t), 'none'), look: [0.05, 0], brows: 0.8 }, 300 + lt * 8, 780); });
  // ---- the man in red and rule nine ----
  const waveT = ww('l38', 'waves');
  add('watchthis', L0('l38') - 0.1, (c, t, lt) => {
    car(c, t, { blur: 10, juneGone: true, red: false }); SO.FACES.length = 0;
    const w8 = t > waveT - 0.1 ? Math.sin(t * 9) * 0.35 : 0;
    redCU(c, t, { mouth: talk(t, quoteOn('l38', t) || t > ww('l38', 'laughs') - 0.1, 'meek'), look: [0.5, 0], armL: t > waveT - 0.1 ? [2.5 + w8, 0.25] : [-0.15, -1.9], hold: t > waveT - 0.1 ? null : 'phone' }, 200);
  });
  add('waveback', L0('l39') - 0.1, (c, t, lt) => {   // every paper drops; every hand waves back at him
    const dropT = ww('l39', 'drops');
    c.save(); camera(c, 1.2, 600, 700); car(c, t, { juneGone: true, paper: t < dropT ? 0.95 : null, stare: t >= dropT, wave: t > ww('l39', 'hand') - 0.1 ? 1 : 0, red: { armL: [2.5 + Math.sin(t * 9) * 0.35, 0.25], hold: null, mouth: 'meek', look: [-0.3, 0] } }); c.restore();
  });
  const stillT = ww('l40', 'still');
  add('freeze', L0('l40') - 0.1, (c, t, lt) => {
    car(c, t, { blur: 10, juneGone: true, wave: 1, stare: 1 }); SO.FACES.length = 0;
    if (t < ww('l40', 'you') - 0.1) juneCU(c, t, { mouth: talk(t, quoteOn('l40', t), 'small'), look: [-0.5, 0], brows: 1, hold: null }, 230);
    else if (t < ww('l40', 'he') - 0.1) youCU(c, t, { blink: 0, brows: 1, look: [0, 0] });
    else redCU(c, t, { mouth: 'meek', look: [-0.4, 0], armL: [2.5 + Math.sin(t * 9) * 0.35, 0.25], hold: null }, 200);
  });
  const bowT = ww('l41', 'bows'), laughT = ww('l41', 'laughs');
  add('bow', L0('l41') - 0.1, (c, t, lt) => {   // he stands and bows; they all stand and bow; they laugh, silently
    const stand = t > ww('l41', 'stand') - 0.1 ? 1 : 0, dip = Math.max(0, Math.sin(seg(t, bowT, bowT + 1.0) * Math.PI));
    c.save(); camera(c, 1.15, 600, 760); c.translate(0, 0);
    car(c, t, { juneGone: true, paper: null, stare: 1, stand, red: { legs: 'stand', y: 1130, mouth: t > laughT - 0.1 ? 'o' : 'meek', look: [-0.3, 0.2 + dip * 0.6], hold: null, rot: -dip * 0.05 } });
    c.restore();
  });
  const stepT = ww('l42', 'step');
  add('step', L0('l42') - 0.1, (c, t, lt) => {
    c.save(); camera(c, 1.25 + lt * 0.05, 700, 760);
    car(c, t, { juneGone: true, paper: null, stare: 1, stand: 1, step: ss(seg(t, stepT - 0.1, stepT + 0.4)), red: { legs: 'stand', y: 1130, mouth: 'o', look: [-0.6, 0], brows: 1, hold: null } });
    c.restore();
  }, { tense: 1 });
  add('dark', L0('l43') - 0.1, (c, t, lt) => { c.fillStyle = '#000'; c.fillRect(0, 0, W, H); }, { grade: 'none' });
  add('empty', L0('l44') - 0.1, (c, t, lt) => {   // the lights flicker on: everyone seated, reading; his seat empty
    const fl = lt < 0.5 ? (Math.floor(lt * 14) % 2) : 1;
    c.save(); camera(c, 1.35 + lt * 0.03, 770, 760); car(c, t, { juneGone: true, red: false }); c.restore();
    if (!fl) { c.fillStyle = '#000'; c.fillRect(0, 0, W, H); }
  });
  add('front', L0('l45') - 0.1, (c, t, lt) => { c.save(); camera(c, 1.0 + lt * 0.06, 540, 760); floorPaper(c, t); c.restore(); });
  const endT = L1('l45') + 2.0;
  add('end', endT, (c, t, lt) => endCard(c, seg(lt, 0.7, 1.3)), { raw: 1 });
  return { S, endT, punchT, kickT, stepT };
}

export async function init(ctx, q = new URLSearchParams()) {
  const NOSUB = q.get('nosub') === '1';
  const [timing, lines] = await Promise.all([new URL('./voices/timing.json', import.meta.url), new URL('./lines.json', import.meta.url)].map(u => fetch(u).then(r => r.json())));
  build(timing, lines);
  const K = shots(); const S = K.S;
  window.DUR = Math.round((K.endT + 0.7 + 4.67) * 30) / 30;
  // ---- sound events for mix.py ----
  const cut = n => S.find(s => s.name === n).t0;
  const ev = [{ t: LEAD, type: 'vo', file: 'voices/narration.wav' }];
  for (const id of IDS) ev.push({ t: L0(id), type: 'line', id, t1: L1(id) });
  ev.push({ t: ww('l39', 'drops'), type: 'rustle' }, { t: K.punchT + 0.02, type: 'punch' }, { t: ww('l33', 'click') + 0.02, type: 'punch' });
  for (const k of [0, 1]) ev.push({ t: ww('l29', 'click', k ? wi('l29', 'click') + 1 : 0), type: 'punch' });
  ev.push({ t: K.kickT, type: 'thud' }, { t: K.stepT, type: 'thud' });
  ev.push({ t: cut('rule1') + 0.2, type: 'sting' }, { t: ww('l36', 'holds'), type: 'sting' });
  ev.push({ t: L0('l29') - 0.3, t1: L1('l35') + 0.4, type: 'tense' }, { t: L0('l39') - 0.2, t1: L1('l42') + 0.3, type: 'tense' });
  ev.push({ t: L0('l43') - 0.05, type: 'dark' }, { t: L0('l44') + 0.4, type: 'light' });
  const rev = ww('l45', 'red');
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
    SO.FACES.length = 0;
    ctx.save(); const r = sh.draw(ctx, t, t - sh.t0) || []; ctx.restore();
    texts = [...r];
    if (!sh.raw) {
      const g = sh.grade || 'night';
      if (g === 'night') { SO.nightGrade(ctx, { tint: '#6474C8' }); SO.lightPool(ctx, 420, 40, 1000, '#D6E4FF', 0.3); }
      if (g === 'warm') { SO.nightGrade(ctx, { tint: '#9AA3D2' }); SO.lightPool(ctx, 420, 40, 1100, '#FFE6C8', 0.32); }   // the ordinary train home: brighter, a little warm
      if (g === 'paper') { SO.nightGrade(ctx, { tint: '#8C98D0' }); SO.lightPool(ctx, 540, 300, 1100, '#E6EEFF', 0.25); }
      if (g !== 'none') { SO.faceGlow(ctx); glow(ctx, 0.5); SO.painterly(ctx); SO.grain(ctx, 0.05); vignette(ctx, 0.42); }
      if (sh.title) titleTop(ctx, TITLE, 'PART 1', clamp(1 - seg(t, L1('l01') - 0.3, L1('l01') + 0.2)));
      if (sh.chip) timeChip(ctx, t, Object.assign({ y: 360, k: 1 }, sh.chip));
      const cp = NOSUB ? null : capAt(t); if (cp) caption(ctx, cp.words, cp.k);
    }
  };
  window.TEXTS = t => { window.render(t); return texts; };
}
