// DON'T MISS YOUR STOP — Part 1 "Wake Up". Soft style (assets/soft.js): round glowing faces, night-blue grade, blurred backgrounds.
// The narration (voices/narration.wav, Chatterbox) sets the clock; shots cut on its word times (voices/timing.json).
// Captions run continuously (every spoken word, 1-3 at a time, the Caption column's **keywords** in orange).
import { P, W, H, CAR, clamp, lerp, seg, ss, eo, camera, blinkAt, breathe, vignette, rgba, glow } from '../assets/kit.js';
import * as SO from '../assets/soft.js';
import { acrossBack, acrossBench, acrossClutter, doors, phoneCU, sheetInHands, ticketSoft, windowCU } from '../assets/softsets.js';
import { routeMap, rulesSheet, carLength, carProj, CAMLEN } from '../assets/sets.js';
import { endCard, caption, TEXT, titleTop, timeChip } from '../assets/ui.js';

const LEAD = 0.5;
TEXT.end = ['PART 2', 'How long has June been riding?', "Follow so you don't miss it"];
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
const ROW = [[1, 110], ['june', 330], [2, 550], [4, 770], [5, 985]];
const who = k => k === 'june' ? SO.JUNE : SO.passenger(k);
// the whole car sways a little with the tracks
const sway = (c, t, k = 1) => { c.translate(Math.sin(t * 1.3) * 3 * k, Math.sin(t * 2.1 + 1) * 2 * k); };
// opts: stare (look at camera), paper (null = no paper / 0.15 held / 0.6 up over the face), lift (0..1 hands up together), june pose, before (the ordinary car before you fell asleep)
function row(o, t, { stare = 0, paper = 0.95, lift = 0, june = {}, skipJune = false, before = false } = {}) {
  for (const [k, x] of ROW) {
    if (k === 'june') {
      if (before || skipJune) continue;
      SO.person(o, SO.JUNE, Object.assign({ x, y: 1010, s: 0.95, legs: 'sit', hold: 'knit', armL: [-0.1, -1.25], mouth: 'none', look: [0.15, 0.25], blink: blinkAt(t, 3), t }, june));
      continue;
    }
    const pose = { x, y: 1010, s: 0.95, legs: 'sit', look: stare ? [0, 0] : [0, 0.4], blink: stare ? 0 : blinkAt(t, k + 5), mouth: 'none' };
    if (before) { pose.hold = 'phone'; pose.armL = [-0.15, -1.9]; pose.look = [0, 0.6]; pose.phoneRot = 0.1; }
    else if (lift > 0) { pose.armL = [lerp(0.12, 2.6, lift), lerp(0.1, 0.2, lift)]; pose.armR = [lerp(0.12, 2.6, lift), lerp(0.1, 0.2, lift)]; }
    else if (paper != null) pose.paper = paper;
    SO.person(o, who(k), pose);
  }
}
function scarf(o) { o.save(); o.lineCap = 'round'; o.strokeStyle = '#8E2E36'; o.lineWidth = 26; o.beginPath(); o.moveTo(326, 900); o.bezierCurveTo(300, 1100, 470, 1180, 430, 1500); o.bezierCurveTo(400, 1700, 560, 1800, 520, 2000); o.stroke(); o.strokeStyle = '#B8434A'; o.lineWidth = 18; o.stroke(); o.restore(); }
function car(ctx, t, { blur = 0, cam = null, ...opt } = {}) {
  const draw = o => { o.save(); if (cam) camera(o, ...cam); sway(o, t); acrossBack(o, t, { speed: opt.before ? 1300 : 0 }); acrossBench(o); acrossClutter(o, { cup: !opt.before }); if (!opt.before && !opt.skipJune) scarf(o); row(o, t, opt); o.restore(); };
  if (blur) { SO.blurred(ctx, blur, o => { o.setTransform(1, 0, 0, 1, 0, 0); draw(o); }); }
  else draw(ctx);
}
// a lead framed large: face centre at (x, y) with head radius r
const framed = (S, x, y, r, extra = {}) => { const s = r / (SO.SOFT.head * (S.headK || 1)), pose = Object.assign({ x, y: 0, s }, extra); pose.y = y - SO.faceOf(S, pose).y; return pose; };
const juneCU = (c, t, extra = {}, r = 230, y = 760) => SO.person(c, SO.JUNE, framed(SO.JUNE, 540, y, r, Object.assign({ legs: 'sit', mouth: 'none', look: [0, 0.15], blink: blinkAt(t, 4), brows: 0.6, hold: 'knit', armL: [-0.1, -1.25], t }, extra)));
const youCU = (c, t, extra = {}, r = 240, y = 760) => SO.person(c, SO.YOU, framed(SO.YOU, 540, y, r, Object.assign({ legs: 'sit', mouth: 'none', look: [0, 0], blink: blinkAt(t, 9) }, extra)));
// the line between two pops of the same line: is a quote being spoken now?
const eyelids = (c, k) => { if (k >= 1) return; const h = H * 0.5 * (1 - ss(k)); c.fillStyle = '#000'; c.fillRect(0, 0, W, h); c.fillRect(0, H - h, W, h); };

function shots() {
  const S = []; const add = (name, t0, draw, o = {}) => S.push(Object.assign({ name, t0, draw }, o));
  // ---- Act 1: the ordinary train home ----
  add('board', 0, (c, t, lt) => {   // you drop into your seat after a long day: medium shot from across the aisle, tired
    car(c, t, { blur: 6, before: true }); SO.FACES.length = 0;
    const sink = ss(seg(lt, 0, 1.4));
    SO.blob(c, 250, 760, 580, 1300, 80, '#46649A', 1.1);   // your seat: the back behind you, the cushion edge
    SO.person(c, SO.YOU, framed(SO.YOU, 540, lerp(700, 780, sink), 215, { legs: 'sit', look: [0.2, 0.35], blink: 0.25 + blinkAt(t, 9) * 0.5, mouth: 'none', rot: lerp(0.05, -0.02, sink) }));
  }, { title: 1, chip: CHIP0, grade: 'warm' });
  add('doze', L0('l02') - 0.1, (c, t, lt) => {   // close: your eyes getting heavy, then closing
    car(c, t, { blur: 10, before: true }); SO.FACES.length = 0;
    const close = ss(seg(t, ww('l02', 'nap') - 0.6, L1('l02') + 0.6));
    youCU(c, t, { blink: lerp(0.35, 1, close), look: [0, 0.4], rot: close * 0.08 }, 250);
    c.fillStyle = rgba('#000000', 0.85 * close); c.fillRect(0, 0, W, H);
  }, { grade: 'warm', chip: CHIP0 });
  add('black', L0('l03') - 0.1, (c, t, lt) => { c.fillStyle = '#000'; c.fillRect(0, 0, W, H); }, { grade: 'none' });
  // ---- Act 2: waking somewhere wrong ----
  add('wake', L0('l04') - 0.3, (c, t, lt) => {   // eyes open on the car; it slides into focus; you look left, then right
    const look = Math.sin(seg(lt, 1.5, 6) * Math.PI) * 120;
    SO.blurred(c, lerp(14, 0, ss(seg(lt, 0, 2.2))), o => { o.setTransform(1, 0, 0, 1, 0, 0); o.save(); camera(o, 1.3, 540 + look, 700); car(o, t, {}); o.restore(); });
    eyelids(c, seg(lt, 0, 1.4));
  }, { chip: CHIP });
  add('down', L0('l05') - 0.1, (c, t, lt) => {   // down the car: every passenger behind a newspaper
    c.save(); camera(c, 1.05 + lt * 0.015, 540, 760); sway(c, t);
    carLength(c, t, CAR, { flick: 0 });
    for (const [X, Z, i] of [[-1.05, 2.6, 7], [1.05, 3.2, 8], [-1.05, 4.6, 9], [1.05, 5.4, 10], [-1.05, 7, 11], [1.05, 8.2, 12], [-1.05, 10, 13], [1.05, 11.5, 14]]) { const p = carProj(CAMLEN, X, 0.45, Z); SO.person(c, SO.passenger(i), { x: p.x, y: p.y, s: p.s * 0.95, legs: 'sit', paper: 0.95 }); }
    c.restore();
  });
  add('phone', L0('l06') - 0.1, (c, t, lt) => {
    SO.blurred(c, 10, o => { o.setTransform(1, 0, 0, 1, 0, 0); acrossBack(o, t, { speed: 0 }); });
    c.save(); camera(c, 1 + lt * 0.02, 540, 800); phoneCU(c, t); c.restore();
    SO.lightPool(c, 540, 700, 700, '#9FB8FF', 0.35);
  }, { chip: CHIP });
  add('window', L0('l07') - 0.1, (c, t, lt) => {   // nothing outside: only your faint reflection
    c.save(); camera(c, 1.05 + lt * 0.02, 540, 760);
    windowCU(c, t, o => { SO.person(o, SO.YOU, framed(SO.YOU, 560, 720, 200, { legs: 'sit', noGlow: true, look: [0, 0] })); });
    c.restore();
  });
  add('map', L0('l08') - 0.1, (c, t, lt) => { c.save(); camera(c, 1.25 + lt * 0.04, 560, 720); routeMap(c, t, CAR, { at: 1 }); c.restore(); });
  // ---- the old woman ----
  add('june', L0('l09') - 0.1, (c, t, lt) => {   // across the aisle: knitting, the scarf trailing across the floor (slow push in)
    c.save(); camera(c, lerp(1.35, 1.9, ss(seg(lt, 0, 5))), lerp(540, 330, ss(seg(lt, 0, 5))), 760);
    car(c, t, { blur: 5, skipJune: true });
    scarf(c); SO.person(c, SO.JUNE, { x: 330, y: 1010, s: 0.95, legs: 'sit', hold: 'knit', armL: [-0.1, -1.25], mouth: 'none', look: [0, 0.6], blink: blinkAt(t, 3), t });
    c.restore();
  });
  add('watch', L0('l10') - 0.1, (c, t, lt) => {   // her face: she isn't reading. She's watching you.
    car(c, t, { blur: 9 }); SO.FACES.length = 0;
    juneCU(c, t, { look: [0, 0], blink: t > ww('l10', 'watching') ? 0 : blinkAt(t, 4), brows: 0.2 }, 200 + lt * 4);
  });
  add('stop', L0('l11') - 0.1, (c, t, lt) => {   // her needles stop; then her face falls
    car(c, t, { blur: 9 }); SO.FACES.length = 0;
    const falls = ss(seg(t, ww('l11', 'face') - 0.2, ww('l11', 'falls') + 0.4));
    juneCU(c, t, { look: [0, lerp(0, 0.1, falls)], blink: 0, brows: lerp(0.2, 1, falls), mouth: falls > 0.5 ? 'small' : 'none', t: t < ww('l11', 'stop') ? t : ww('l11', 'stop') }, 220);
  });
  add('ohno', L0('l12') - 0.1, (c, t, lt) => { car(c, t, { blur: 11 }); SO.FACES.length = 0; juneCU(c, t, { mouth: talk(t, quoteOn('l12', t), 'small'), look: [0, 0.1], brows: 1, blink: blinkAt(t, 4) }, 270 + lt * 6); });
  add('where', L0('l13') - 0.1, (c, t, lt) => { car(c, t, { blur: 10 }); SO.FACES.length = 0; youCU(c, t, { mouth: talk(t, quoteOn('l13', t), 'none'), brows: 0.7, look: [0, 0] }); });
  add('intro', L0('l14') - 0.1, (c, t, lt) => {   // she introduces herself
    car(c, t, { blur: 9 }); SO.FACES.length = 0;
    juneCU(c, t, { mouth: talk(t, quoteOn('l14', t), 'meek'), brows: 0.7, look: [0, 0.05] }, 210, 720);
  });
  add('give', L0('l15') - 0.1, (c, t, lt) => {   // she presses the folded sheet into your hands
    car(c, t, { blur: 10 }); SO.FACES.length = 0;
    juneCU(c, t, { mouth: 'meek', brows: 0.7, look: [0, 0.4], hold: 'sheet', armL: [0.45, -2.0], sheetRot: -0.1 }, 170, 620);
    sheetInHands(c, t, 0.0);
  });
  add('readit', L0('l16') - 0.1, (c, t, lt) => { car(c, t, { blur: 11 }); SO.FACES.length = 0; juneCU(c, t, { mouth: talk(t, quoteOn('l16', t), 'none'), brows: 0.9, look: [0, 0] }, 260); });
  // ---- the rules, one by one: the page drifts down to each new line as it's read ----
  for (let i = 0; i < 9; i++) {
    const id = 'l' + String(17 + i).padStart(2, '0');
    add('rule' + (i + 1), L0(id) - 0.1, (c, t, lt) => { rulesSheet(c, t, { show: i + 1, hi: i, zoom: 0.55 + 0.04 * Math.sin(lt * 0.6), unfold: i === 0 ? ss(seg(lt, 0, 0.6)) : 1 }); }, { grade: 'paper' });
  }
  // ---- they copy you ----
  add('stare', L0('l26') - 0.1, (c, t, lt) => {   // every newspaper is down; every face on you
    const down = ss(seg(t, ww('l26', 'newspaper') - 0.2, ww('l26', 'newspaper') + 0.3));
    c.save(); camera(c, 1.25 + lt * 0.02, 540, 700); car(c, t, { paper: down < 0.5 ? 0.95 : null, stare: down > 0.5 ? 1 : 0, june: { look: [0.3, 0.1], brows: 0.8 } }); c.restore();
  });
  const liftT = ww('l27', 'lift'), theyT = ww('l27', 'every');
  add('lift', L0('l27') - 0.1, (c, t, lt) => {
    c.save(); camera(c, 1.25, 540, 700); car(c, t, { paper: null, stare: 1, lift: ss(seg(t, theyT, theyT + 0.35)), june: { look: [0.3, 0.1], brows: 0.8 } }); c.restore();
    const up = ss(seg(t, liftT - 0.1, liftT + 0.5)); SO.limb(c, 900, 2200, 800, lerp(2100, 1500, up), 70, '#5D6878'); SO.oval(c, 800, lerp(2080, 1480, up), 62, 56, '#E8DED8');
  });
  add('freeze', L0('l28') - 0.1, (c, t, lt) => {   // you, frozen, hand still up; they're still staring behind you
    car(c, t, { blur: 8, paper: null, stare: 1, lift: 1 }); SO.FACES.length = 0;
    youCU(c, t, { look: [0, 0], blink: 0, brows: 1, armL: [2.4, 0.2], breathe: 0 }, 240);
  });
  add('rustle', L0('l29') - 0.1, (c, t, lt) => {   // the papers snap back up, all at once
    const up = t > ww('l29', 'rustle') - 0.1;
    c.save(); camera(c, 1.25, 540, 700); car(c, t, { paper: up ? lerp(0.15, 0.95, eo(seg(t, ww('l29', 'rustle') - 0.1, ww('l29', 'rustle') + 0.25))) : null, stare: up ? 0 : 1 }); c.restore();
  });
  // ---- the man in red ----
  add('red', L0('l30') - 0.1, (c, t, lt) => {
    const yank = t > L0('l31') - 0.1 && t < L1('l31') + 0.3;
    doors(c, t, { shake: yank ? 1 : 0 });
    SO.person(c, SO.RED, { x: 640, y: 1600, s: 1.55, rot: yank ? Math.sin(t * 30) * 0.03 : 0, mouth: talk(t, quoteOn('l30', t) || (t > ww('l30', 'laughs') - 0.1 && t < ww('l30', 'laughs') + 0.6), 'small'), look: [yank ? -0.6 : 0.4, 0], armL: yank ? [1.2, 0.5] : [0.2, 0.3] });
  });
  // ---- the conductor ----
  add('click', L0('l32') - 0.1, (c, t, lt) => {   // far down the car: a tall shape in the aisle
    c.save(); camera(c, 1.05, 540, 760); sway(c, t);
    carLength(c, t, CAR);
    for (const [X, Z, i] of [[-1.05, 2.6, 7], [1.05, 3.2, 8], [-1.05, 4.6, 9], [1.05, 5.4, 10], [-1.05, 7, 11], [1.05, 8.2, 12]]) { const p = carProj(CAMLEN, X, 0.45, Z); SO.person(c, SO.passenger(i), { x: p.x, y: p.y, s: p.s * 0.95, legs: 'sit', paper: 0.95 }); }
    const z = lerp(14, 11, ss(seg(lt, 0, 3))), p = carProj(CAMLEN, 0, 0, z); SO.person(c, SO.CONDUCTOR, { x: p.x, y: p.y, s: p.s, mouth: 'wide', hold: 'punch', armL: [0.15, 2.4] });
    c.restore();
  });
  add('coming', L0('l33') - 0.1, (c, t, lt) => {   // he comes down the aisle toward you; cap low, the smile
    c.save(); camera(c, 1.05, 540, 760); sway(c, t);
    carLength(c, t, CAR);
    const z = lerp(9, 3.2, ss(seg(lt, 0, L1('l33') - L0('l33') + 2)));
    for (const [X, Z, i] of [[-1.05, 2.6, 7], [1.05, 3.2, 8], [-1.05, 4.6, 9], [1.05, 5.4, 10], [-1.05, 7, 11], [1.05, 8.2, 12]]) { if (Z > z) continue; const p = carProj(CAMLEN, X, 0.45, Z); SO.person(c, SO.passenger(i), { x: p.x, y: p.y, s: p.s * 0.95, legs: 'sit', paper: 0.95 }); }
    const p = carProj(CAMLEN, 0, 0, z); SO.person(c, SO.CONDUCTOR, { x: p.x, y: p.y, s: p.s, mouth: 'wide', hold: 'punch', armL: [0.15, 2.4], rot: Math.sin(t * 3) * 0.02 });
    for (const [X, Z, i] of [[-1.05, 2.6, 7], [1.05, 3.2, 8], [-1.05, 4.6, 9], [1.05, 5.4, 10], [-1.05, 7, 11], [1.05, 8.2, 12]]) { if (Z <= z) continue; const q = carProj(CAMLEN, X, 0.45, Z); SO.person(c, SO.passenger(i), { x: q.x, y: q.y, s: q.s * 0.95, legs: 'sit', paper: 0.95 }); }
    c.restore();
  });
  add('ticketplease', L0('l34') - 0.1, (c, t, lt) => {   // low and close at your seat
    c.save(); camera(c, 1.5, 540, 700); car(c, t, { blur: 7 }); c.restore(); SO.FACES.length = 0;
    const lean = ss(seg(lt, 0, 1.2));
    SO.person(c, SO.CONDUCTOR, { x: 560, y: lerp(2700, 2560, lean), s: 2.7, rot: 0.05, mouth: 'wide', hold: 'punch', armL: [0.15, 2.4], armR: [0.1, 0.2], punchRot: 0.3 });
  });
  add('pocket', L0('l35') - 0.1, (c, t, lt) => {   // a ticket in your pocket you don't remember buying
    car(c, t, { blur: 12 }); SO.FACES.length = 0;
    const up = eo(seg(lt, 0.2, 1.4));
    ticketSoft(c, t, { holes: 0, y: lerp(1500, 800, up), rot: lerp(0.4, -0.08, up), s: 0.9, hand: 'left' });
  });
  add('smile', L0('l36') - 0.1, (c, t, lt) => { car(c, t, { blur: 10 }); SO.FACES.length = 0; youCU(c, t, { look: [0, -0.3], mouth: t > ww('l36', 'smile') ? 'meek' : 'none', brows: 0.5, hold: 'ticket', armL: [-0.2, -1.6], ticketRot: 0.2 }); });
  const punchT = ww('l37', 'punches');
  add('punch', L0('l37') - 0.1, (c, t, lt) => {   // click
    car(c, t, { blur: 14 }); SO.FACES.length = 0;
    const k = seg(t, punchT - 0.15, punchT);
    c.save(); camera(c, 1.25, 540, 760); ticketSoft(c, t, { holes: t > punchT ? 1 : 0, newHole: seg(t, punchT, punchT + 0.15), hand: 'left' });
    c.save(); c.translate(760, lerp(560, 620, k)); c.rotate(0.3); SO.blob(c, -30, -200, 60, 220, 14, '#B7BEC8'); c.restore(); SO.oval(c, 780, lerp(400, 460, k), 70, 60, '#F4F3EE'); c.restore();
  });
  // ---- June's ticket ----
  add('pale', L0('l38') - 0.1, (c, t, lt) => {
    car(c, t, { blur: 9 }); SO.FACES.length = 0;
    const pale = ss(seg(t, ww('l38', 'drains') - 0.3, ww('l38', 'drains') + 0.6));
    juneCU(c, t, { mouth: pale > 0.5 ? 'o' : 'none', look: [0, 0.7], brows: 0.9, blink: 0, glow: 1 - 0.6 * pale });
    c.fillStyle = rgba('#0A0F1E', 0.25 * pale); c.fillRect(0, 0, W, H);
  });
  add('lace', L0('l39') - 0.1, (c, t, lt) => { car(c, t, { blur: 14 }); SO.FACES.length = 0; const up = eo(seg(lt, 0, 0.9)); ticketSoft(c, t, { lace: 1, y: lerp(1500, 780, up), rot: lerp(-0.4, 0.05, up), s: lerp(0.9, 1.15, ss(seg(lt, 0, 4))), hand: 'june' }); }, { sting: 0.3 });
  add('whisper', L0('l40') - 0.1, (c, t, lt) => { c.fillStyle = '#05070D'; c.fillRect(0, 0, W, H); car(c, t, { blur: 14 }); SO.FACES.length = 0; juneCU(c, t, { mouth: talk(t, quoteOn('l40', t), 'none'), look: [0.05, 0], brows: 0.8 }, 300 + lt * 8, 780); });
  add('mine', L0('l41') - 0.1, (c, t, lt) => { car(c, t, { blur: 14 }); SO.FACES.length = 0; c.save(); camera(c, 1.2 + lt * 0.04, 540, 760); ticketSoft(c, t, { holes: 1, hand: 'left' }); c.restore(); });
  add('hers', L0('l42') - 0.1, (c, t, lt) => { car(c, t, { blur: 14 }); SO.FACES.length = 0; c.save(); camera(c, 1.25 + lt * 0.05, 540, 760); ticketSoft(c, t, { lace: 1, hand: 'june', rot: 0.05 }); c.restore(); });
  const endT = L1('l42') + 1.8;
  add('end', endT, (c, t, lt) => endCard(c, seg(lt, 0.7, 1.3)), { raw: 1 });
  return { S, endT, punchT, liftT };
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
  ev.push({ t: ww('l26', 'newspaper'), type: 'rustle' }, { t: ww('l29', 'rustle'), type: 'rustle' }, { t: K.punchT + 0.02, type: 'punch' });
  for (const k of [0, 1]) ev.push({ t: ww('l32', 'click', k ? wi('l32', 'click') + 1 : 0), type: 'punch' });
  ev.push({ t: cut('rule1') + 0.2, type: 'sting' }, { t: cut('lace') + 0.3, type: 'sting' });
  ev.push({ t: L0('l32') - 0.3, t1: L1('l37') + 0.4, type: 'tense' });
  const rev = ww('l42', 'hundreds');
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
