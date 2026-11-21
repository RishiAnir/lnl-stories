// DON'T MISS YOUR STOP — Part 2 "The Last Car". Soft style (assets/soft.js): round glowing faces, night-blue grade, blurred backgrounds.
// The narration (voices/narration.wav, Chatterbox) sets the clock; shots cut on its word times (voices/timing.json).
// Captions run continuously (every spoken word, 1-3 at a time, the Caption column's **keywords** in orange).
import { P, W, H, CAR, clamp, lerp, seg, ss, eo, camera, blinkAt, breathe, vignette, rgba, glow } from '../assets/kit.js';
import * as SO from '../assets/soft.js';
import { acrossBack, acrossBench, acrossClutter, doors, phoneCU, sheetInHands, ticketSoft, windowCU } from '../assets/softsets.js';
import { routeMap, rulesSheet, carLength, carProj, CAMLEN, RULES } from '../assets/sets.js';
import { endCard, caption, TEXT, titleTop, timeChip } from '../assets/ui.js';

const LEAD = 0.5;
TEXT.end = ['PART 3', 'Whose handwriting is it?', "Follow so you don't miss it"];
const TITLE = "Don't Miss Your Stop", CHIP = { time: '2:14', ampm: 'AM', line: 'PART 2 · THE LAST CAR' };

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
// the newspaper: front page, a photo of a man in a red tracksuit, and the date. held: in your hands (no floor), yellow: 0..1 aged
function newsPage(c, t, { held = 0, yellow = 0, dateHi = 0, rot = -0.12, x = 540, y = 900 } = {}) {
  if (!held) { let g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#3C4352'); g.addColorStop(1, '#1E222C'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 30; i++) { c.beginPath(); c.roundRect(0, i * 66, W, 3, 1); c.fillStyle = 'rgba(255,255,255,0.03)'; c.fill(); } }
  c.save(); c.translate(x, y); c.rotate(rot);
  SO.blob(c, -380, -460, 760, 940, 8, lerpC('#DCD8CC', '#D9C48E', yellow), 0.6);
  c.font = '400 64px "Archivo Black"'; c.fillStyle = '#2A2A30'; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillText('THE EVENING LINE', 0, -380);
  c.beginPath(); c.roundRect(-340, -360, 680, 5, 3); c.fillStyle = '#2A2A30'; c.fill();
  if (dateHi) { c.beginPath(); c.roundRect(-300, -350, 600, 40, 8); c.fillStyle = rgba('#F2C14E', 0.55 * dateHi); c.fill(); }
  c.font = '600 30px "Plex Mono"'; c.fillStyle = '#2A2A30'; c.textBaseline = 'middle'; c.fillText('TUESDAY, NOVEMBER 3, 1987', 0, -330);
  c.beginPath(); c.roundRect(-340, -306, 680, 3, 2); c.fillStyle = '#2A2A30'; c.fill();
  c.save(); c.beginPath(); c.roundRect(-300, -280, 600, 420, 6); c.clip(); c.fillStyle = '#9EA0A6'; c.fillRect(-300, -280, 600, 420);
  SO.person(c, SO.RED, framed(SO.RED, 0, -120, 110, { legs: 'sit', look: [0, 0], mouth: 'meek', noGlow: true }));
  c.fillStyle = 'rgba(160,160,170,0.35)'; c.fillRect(-300, -280, 600, 420); c.restore();   // newsprint: washed out
  for (let r = 0; r < 7; r++) for (const x0 of [-300, 20]) { c.beginPath(); c.roundRect(x0, 176 + r * 36, 280 - (r % 3) * 30, 12, 6); c.fillStyle = 'rgba(70,70,80,0.5)'; c.fill(); }
  if (yellow) { c.fillStyle = rgba('#A8823A', 0.18 * yellow); c.beginPath(); c.roundRect(-380, -460, 760, 940, 8); c.fill(); }
  if (held) for (const sx of [-1, 1]) { SO.oval(c, sx * 372, 60, 62, 54, '#E8DED8'); }
  c.restore();
}
function lerpC(a, b, k) { const h = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)); const A = h(a), B = h(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); }
// the door at the end of the car, close: its little window onto the last car. Dark inside; one hanging handle swinging.
// swing: amplitude (0 = hanging dead still, even mid-swing if `freeze` is set); ring: 0..1 a phone glowing on the floor in there
function lastCarDoor(c, t, { swing = 1, ring = 0, freezeAt = null } = {}) {
  let g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#7E8AA0'); g.addColorStop(1, '#3E4658'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  SO.blob(c, 170, 120, 740, 1560, 26, '#9AA4B6', 0.8);                       // the door
  SO.blob(c, 200, 150, 680, 1500, 20, '#AEB7C6', 0.6);
  c.beginPath(); c.roundRect(190, 1180, 700, 34, 6); c.fillStyle = '#E8C23A'; c.fill();   // warning strip
  c.font = '700 30px Inter'; c.fillStyle = 'rgba(30,34,46,0.75)'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('NO PASSAGE BETWEEN CARS', 540, 1260);
  SO.blob(c, 700, 760, 40, 200, 16, '#C9CCD8');                            // the handle
  // the window
  const wx = 300, wy = 290, ww_ = 480, wh = 560;
  SO.blob(c, wx - 18, wy - 18, ww_ + 36, wh + 36, 34, '#5E687C', 0.6);
  c.save(); c.beginPath(); c.roundRect(wx, wy, ww_, wh, 26); c.clip();
  g = c.createLinearGradient(wx, wy, wx, wy + wh); g.addColorStop(0, '#0B0E15'); g.addColorStop(1, '#05070B'); c.fillStyle = g; c.fillRect(wx, wy, ww_, wh);
  // the last car beyond: a faint corridor, a rail along the ceiling
  c.strokeStyle = 'rgba(120,135,165,0.12)'; c.lineWidth = 6; c.beginPath(); c.moveTo(wx, wy + 60); c.lineTo(540, wy + 230); c.lineTo(wx + ww_, wy + 60); c.stroke();
  c.beginPath(); c.moveTo(wx, wy + wh - 40); c.lineTo(540, wy + 330); c.lineTo(wx + ww_, wy + wh - 40); c.stroke();
  if (ring > 0) {   // a phone face-up on the floor in there, lighting a small circle
    const pul = ring * (0.75 + 0.25 * Math.sin(t * 9));
    const rg = c.createRadialGradient(560, wy + 470, 4, 560, wy + 470, 220); rg.addColorStop(0, rgba('#A8C4FF', 0.55 * pul)); rg.addColorStop(1, rgba('#A8C4FF', 0)); c.fillStyle = rg; c.fillRect(wx, wy, ww_, wh);
    c.save(); c.translate(560, wy + 470); c.scale(1, 0.4); c.beginPath(); c.roundRect(-22, -40, 44, 80, 8); c.fillStyle = rgba('#DCE8FF', 0.9 * pul); c.fill(); c.restore();
  }
  // one hanging strap handle, swinging from the ceiling rail
  const tt = freezeAt != null ? Math.min(t, freezeAt) : t, a = Math.sin(tt * 2.2) * 0.35 * swing;
  c.save(); c.translate(540, wy + 150); c.rotate(a);
  c.strokeStyle = 'rgba(150,160,185,0.55)'; c.lineWidth = 8; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 120); c.stroke();
  c.beginPath(); c.ellipse(0, 150, 26, 30, 0, 0, Math.PI * 2); c.lineWidth = 9; c.strokeStyle = 'rgba(190,198,215,0.6)'; c.stroke();
  c.restore();
  c.globalAlpha = 0.1; c.beginPath(); c.roundRect(wx + 30, wy + 20, 140, wh - 40, 30); c.fillStyle = '#DCE6FF'; c.fill(); c.globalAlpha = 1;   // glare
  c.restore();
}
// the across-the-aisle row, with each newspaper's date printed on it (the same date on every one). turned: every paper on a new page
function rowDates(c, t, k = 1, turned = 0) {
  c.save(); c.globalAlpha = k; c.font = '800 30px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle';
  for (const [kk, x] of ROW) {
    if (kk === 'june' || kk === 'red') continue;
    const top = 1010 - 456 * 0.95;
    c.fillStyle = 'rgba(40,40,48,0.85)'; c.fillStyle = 'rgba(236,232,222,0.95)'; c.beginPath(); c.roundRect(x - 112, top - 4, 224, 40, 4); c.fill(); c.fillStyle = 'rgba(30,30,38,0.95)'; c.fillText('NOV 3, 1987', x, top + 16);
    if (turned) { c.fillStyle = rgba('#5A5E68', 0.75 * turned); c.beginPath(); c.roundRect(x + 8, top + 26, 100, 90, 4); c.fill(); }
  }
  c.restore();
}
// your phone, close: an incoming call with no signal. press: 0..1 your thumb moving onto the green button
function callScreen(c, t, { press = 0, name = 'Mom', buzz = 1, answered = 0 } = {}) {
  const j = buzz && !answered ? Math.sin(t * 70) * 4 * (Math.floor(t * 1.4) % 2) : 0;
  c.save(); c.translate(540 + j, 1000); c.rotate(-0.06);
  SO.blob(c, -250, -480, 500, 960, 70, '#15171F', 0.4);
  c.beginPath(); c.roundRect(-226, -456, 452, 912, 56); const g = c.createLinearGradient(0, -456, 0, 456); g.addColorStop(0, '#2E3A5E'); g.addColorStop(1, '#10141F'); c.fillStyle = g; c.fill();
  c.fillStyle = '#E9EDF5'; c.textAlign = 'left'; c.textBaseline = 'middle';
  c.font = '600 26px Inter'; c.fillText('No Service', -190, -410); c.textAlign = 'right'; c.fillText('2:14', 190, -410);
  c.textAlign = 'center';
  c.font = '600 30px Inter'; c.fillStyle = 'rgba(233,237,245,0.7)'; c.fillText(answered ? '00:0' + Math.min(9, Math.floor(answered)) : 'incoming call', 0, -300);
  c.font = '700 96px Inter'; c.fillStyle = '#F2F4F8'; c.fillText(name, 0, -210);
  c.font = '600 30px Inter'; c.fillStyle = 'rgba(233,237,245,0.55)'; c.fillText('mobile', 0, -140);
  // her photo: a soft round portrait
  c.beginPath(); c.arc(0, 30, 120, 0, Math.PI * 2); const pg = c.createRadialGradient(-30, 0, 10, 0, 30, 130); pg.addColorStop(0, '#E9CFC0'); pg.addColorStop(1, '#8A6A60'); c.fillStyle = pg; c.fill();
  c.save(); c.beginPath(); c.arc(0, 30, 120, 0, Math.PI * 2); c.clip(); c.beginPath(); c.ellipse(0, -30, 120, 90, 0, Math.PI, 0); c.fillStyle = '#4A3328'; c.fill(); c.beginPath(); c.ellipse(0, 170, 110, 70, 0, 0, Math.PI * 2); c.fillStyle = '#7C5E8A'; c.fill(); c.restore();
  if (!answered) {
    for (const [x, col] of [[-130, '#E0473F'], [130, '#3DBB5C']]) { c.beginPath(); c.arc(x, 300, 62 * (x > 0 ? 1 + 0.08 * press : 1), 0, Math.PI * 2); c.fillStyle = col; c.fill(); }
    c.font = '600 26px Inter'; c.fillStyle = 'rgba(233,237,245,0.75)'; c.fillText('Decline', -130, 395); c.fillText('Accept', 130, 395);
  } else { c.beginPath(); c.arc(0, 300, 62, 0, Math.PI * 2); c.fillStyle = '#E0473F'; c.fill(); }
  c.restore();
  // your hand: fingers on the edges, the thumb coming in
  c.save(); c.translate(540 + j, 1180); c.rotate(-0.06);
  SO.blob(c, -260, 150, 70, 190, 34, '#E3D8D2'); SO.blob(c, 200, 120, 70, 200, 34, '#E3D8D2');
  if (press > 0) { const k = ss(press); SO.limb(c, 330, 420, lerp(330, 150, k), lerp(420, 140, k), 40, '#E3D8D2'); }
  c.restore();
}
// your hoodie pocket, glowing and buzzing
function pocket(c, t) {
  const j = Math.sin(t * 70) * 5 * (Math.floor(t * 1.4) % 2);
  let g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#5D6878'); g.addColorStop(1, '#3A4352'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  SO.blob(c, 140, 820, 800, 620, 120, '#535E6E', 0.9);   // the pocket
  c.beginPath(); c.roundRect(170, 840, 740, 16, 8); c.fillStyle = 'rgba(20,24,32,0.35)'; c.fill();
  const pul = Math.floor(t * 1.4) % 2 ? 1 : 0.55;
  const rg = c.createRadialGradient(540 + j, 1080, 10, 540 + j, 1080, 300); rg.addColorStop(0, rgba('#B8CCFF', 0.5 * pul)); rg.addColorStop(1, rgba('#B8CCFF', 0)); c.fillStyle = rg; c.fillRect(0, 700, W, 800);
  c.save(); c.translate(540 + j, 1080); c.rotate(0.08); c.beginPath(); c.roundRect(-110, -200, 220, 400, 34); c.fillStyle = rgba('#20283A', 0.55); c.fill(); c.restore();
  SO.blob(c, 140, 1440, 800, 480, 40, '#2C3446', 1);   // your lap
}
// June's hand clamping onto your knee
function knee(c, t, k) {
  let g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1E2430'); g.addColorStop(1, '#2C3446'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  SO.blob(c, -100, 820, 1300, 520, 260, '#2C3446', 1.1);    // your thigh and knee (dark jeans)
  SO.oval(c, 760, 1060, 260, 250, '#344058');
  const x = lerp(-200, 640, eo(k)), y = lerp(1300, 1020, eo(k));
  SO.limb(c, -300, 1500, x - 80, y + 60, 90, '#B98A55');    // her camel coat sleeve
  SO.limb(c, x - 100, y + 40, x - 30, y + 20, 70, '#8FB3CB'); // scrubs cuff
  SO.oval(c, x + 40, y, 120, 82, '#F0E6E0', 1, -0.2);       // her hand, gripping
  for (let i = 0; i < 4; i++) SO.oval(c, x + 120 + i * 6, y - 40 + i * 30, 46, 18, '#E8DCD4', 1, 0.5);   // fingers
}
// a handwritten rule glowing faintly in the dark (the rule matters now)
function ruleLine(c, n, k) {
  if (k <= 0) return;
  c.save(); c.globalAlpha = clamp(k); c.font = '600 74px Caveat'; c.fillStyle = '#E9E6DA'; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  const words = `${n}. ${RULES[n - 1]}`.split(' '); let line = '', y = 520; const out = [];
  for (const w_ of words) { const tr = line ? line + ' ' + w_ : w_; if (c.measureText(tr).width > 760 && line) { out.push(line); line = w_; } else line = tr; }
  out.push(line); out.forEach((ln, i) => c.fillText(ln, 150 + (i ? 38 : 0), y + i * 76));
  c.beginPath(); c.roundRect(150, y + (out.length - 1) * 76 + 18, Math.min(760, c.measureText(out[0]).width), 5, 2); c.fillStyle = rgba('#C8463C', 0.8); c.fill();
  c.restore();
}
// eyes shut: the dark behind your eyelids. faint shapes can press in at the edges
function lids(c, t, { glove = 0, smile = 0 } = {}) {
  const g = c.createRadialGradient(540, 900, 100, 540, 900, 1100); g.addColorStop(0, '#120A0E'); g.addColorStop(1, '#030204'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  if (glove > 0) { c.save(); c.globalAlpha = 0.16 * glove; SO.oval(c, 980, 820, 120, 100, '#F4F3EE'); for (let i = 0; i < 4; i++) SO.oval(c, 880 - i * 4, 760 + i * 40, 60, 20, '#F4F3EE', 1, 0.3); c.restore(); }
  if (smile > 0) { c.save(); c.globalAlpha = 0.14 * smile; c.beginPath(); c.ellipse(540, 760, 300, 70, 0, 0.12, Math.PI - 0.12); c.ellipse(540, 775, 270, 34, 0, Math.PI - 0.14, 0.14, true); c.closePath(); c.fillStyle = '#EDE6E2'; c.fill(); c.restore(); }
}
let EAR_A = 1.6, EAR_B = 2.9;
function shots() {
  const S = []; const add = (name, t0, draw, o = {}) => S.push(Object.assign({ name, t0, draw }, o));
  const paxDown = [[-1.05, 2.6, 7], [1.05, 3.2, 8], [-1.05, 4.6, 9], [1.05, 5.4, 10], [-1.05, 7, 11], [1.05, 8.2, 12], [-1.05, 10, 13], [1.05, 11.5, 14]].sort((a, b) => b[1] - a[1]);
  const benchRider = (c, side, z, S) => {
    const q = (X, Y, Z) => { const a = carProj(CAMLEN, side * X, Y, Z); return [a.x, a.y]; };
    const k0 = carProj(CAMLEN, 0, 0, z).k;
    const quad = (pts, col) => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fillStyle = col; c.fill(); c.lineJoin = 'round'; c.lineWidth = 0.035 * k0; c.strokeStyle = col; c.stroke(); };
    const box = (x0, x1, y0, y1, z0, z1, col) => {
      quad([q(x0, y0, z0), q(x0, y0, z1), q(x0, y1, z1), q(x0, y1, z0)], SO.mixC(col, 0.78));
      if (y1 < CAMLEN.h) quad([q(x0, y1, z0), q(x0, y1, z1), q(x1, y1, z1), q(x1, y1, z0)], col);
      quad([q(x0, y0, z0), q(x1, y0, z0), q(x1, y1, z0), q(x0, y1, z0)], col);
    };
    box(1.08, 1.34, 0.46, 1.1, z - 0.2, z + 0.2, S.top);
    const h = q(1.2, 1.3, z - 0.05); c.beginPath(); c.arc(h[0], h[1], 0.17 * k0, 0, Math.PI * 2); c.fillStyle = S.skin; c.fill();
    if (S.hairC) { c.beginPath(); c.arc(h[0], h[1] - 0.03 * k0, 0.175 * k0, Math.PI * 1.05, Math.PI * 1.95); c.fillStyle = S.hairC; c.fill(); }
    for (const dz of [0.04, -0.15]) {
      box(0.8, 1.1, 0.42, 0.56, z + dz, z + dz + 0.12, S.legs);
      box(0.8, 0.92, 0.04, 0.44, z + dz, z + dz + 0.11, SO.mixC(S.legs, 0.85));
      box(0.72, 0.92, 0, 0.07, z + dz - 0.01, z + dz + 0.12, S.shoe);
    }
    quad([q(0.95, 0.86, z - 0.36), q(0.95, 0.86, z + 0.3), q(0.95, 1.48, z + 0.3), q(0.95, 1.48, z - 0.36)], '#D9DEE8');
    quad([q(0.945, 0.86, z - 0.035), q(0.945, 0.86, z - 0.025), q(0.945, 1.48, z - 0.025), q(0.945, 1.48, z - 0.035)], '#A9B0BE');
    for (let r = 0; r < 6; r++) for (const [a2, b2] of [[-0.32, -0.07], [0.01, 0.26]]) { const y = 1.4 - r * 0.09; quad([q(0.945, y, z + a2), q(0.945, y, z + b2), q(0.945, y - 0.025, z + b2), q(0.945, y - 0.025, z + a2)], r ? '#9EA6B5' : '#6C7484'); }
    for (const dz of [-0.37, 0.31]) { const hnd = q(0.94, 1.12, z + dz); c.beginPath(); c.arc(hnd[0], hnd[1], 0.05 * k0, 0, Math.PI * 2); c.fillStyle = S.skin; c.fill(); }
  };
  const downCar = (c, t, o = {}) => { carLength(c, t, CAR, o); for (const [X, Z, i] of paxDown) benchRider(c, Math.sign(X), Z, SO.passenger(i)); };
  // ---- the front page ----
  add('front', 0, (c, t, lt) => { c.save(); camera(c, 0.92 + lt * 0.04, 540, 700); newsPage(c, t, { y: 1060 }); c.restore(); }, { title: 1, chip: CHIP });
  add('pickup', L0('l02') - 0.1, (c, t, lt) => {
    car(c, t, { blur: 12, juneGone: true, red: false }); SO.FACES.length = 0;
    const up = eo(seg(lt, 0, 1.3)); newsPage(c, t, { held: 1, yellow: ss(seg(lt, 0.8, 3)), rot: lerp(-0.4, -0.04, up), y: lerp(1700, 960, up), x: 540 });
  });
  add('date', L0('l03') - 0.1, (c, t, lt) => {
    car(c, t, { blur: 14, juneGone: true, red: false }); SO.FACES.length = 0;
    c.save(); camera(c, lerp(1.6, 2.3, ss(seg(lt, 0, 3))), 540, 560); newsPage(c, t, { held: 1, yellow: 1, rot: -0.04, y: 960, dateHi: ss(seg(t, ww('l03', 'nineteen') - 0.2, ww('l03', 'nineteen') + 0.3)) }); c.restore();
  }, { grade: 'paper' });
  add('same', L0('l04') - 0.1, (c, t, lt) => {
    const pan = ss(seg(lt, 0.4, 4));
    c.save(); camera(c, 1.22, lerp(330, 760, pan), 700); car(c, t, { juneGone: true, red: false }); rowDates(c, t, 1); c.restore();
  });
  // ---- June: put it down ----
  add('putdown', L0('l05') - 0.1, (c, t, lt) => twoShot(c, t, { juneTalk: quoteOn('l05', t), juneLook: [0, 0.6], youLook: [0.4, 0.4], youBrows: 0.7 }));
  add('wherego', L0('l06') - 0.1, (c, t, lt) => { car(c, t, { blur: 10, juneGone: true, red: false }); SO.FACES.length = 0; youCU(c, t, { mouth: talk(t, quoteOn('l06', t), 'none'), brows: 0.8, look: [-0.4, 0.1] }); });
  add('eyesdoor', L0('l07') - 0.1, (c, t, lt) => {
    car(c, t, { blur: 11, juneGone: true, red: false }); SO.FACES.length = 0;
    const stop = ww('l07', 'stop'), turn = ss(seg(t, ww('l07', 'eyes') - 0.2, ww('l07', 'door') + 0.2));
    juneCU(c, t, { t: Math.min(t, stop), look: [lerp(0, 0.9, turn), lerp(0.3, -0.05, turn)], brows: lerp(0.5, 0.9, turn), blink: 0 }, 230);
  });
  add('window', L0('l08') - 0.1, (c, t, lt) => { c.save(); camera(c, lerp(1.0, 1.25, ss(seg(lt, 0, 5))), 540, 600); lastCarDoor(c, t); c.restore(); }, { grade: 'cold' });
  add('notanymore', L0('l09') - 0.1, (c, t, lt) => { car(c, t, { blur: 11, juneGone: true, red: false }); SO.FACES.length = 0; juneCU(c, t, { mouth: talk(t, quoteOn('l09', t), 'meek'), look: [0.2, 0.3], brows: 0.9, hold: null, armL: [0.1, 0.2] }, 240 + lt * 4); });
  // ---- the phone in the last car ----
  const ringT = ww('l10', 'ringing') - 0.3;
  add('ring', L0('l10') - 0.1, (c, t, lt) => { c.save(); camera(c, 1.3 + lt * 0.04, 540, 640); lastCarDoor(c, t, { ring: seg(t, ringT, ringT + 0.2), swing: 1 }); c.restore(); }, { grade: 'cold' });
  add('nobody', L0('l11') - 0.1, (c, t, lt) => { c.save(); camera(c, 1.08 + lt * 0.01, 540, 760); sway(c, t, 0.6); downCar(c, t, { doorLit: 0.4 + 0.3 * Math.sin(t * 9) }); c.restore(); });
  add('stand', L0('l12') - 0.1, (c, t, lt) => {
    car(c, t, { blur: 11, juneGone: true, red: false }); SO.FACES.length = 0;
    const rise = ss(seg(t, ww('l12', 'stand') - 0.5, ww('l12', 'stand') + 0.5));
    youCU(c, t, { look: [0.8, -0.1], brows: 0.3, blink: 0 }, 240, lerp(800, 560, rise));
  });
  const clampT = ww('l13', 'clamps');
  add('knee', L0('l13') - 0.1, (c, t, lt) => {
    if (t < ww('l13', 'never') - 0.15) knee(c, t, seg(t, clampT - 0.25, clampT + 0.05));
    else { car(c, t, { blur: 11, juneGone: true, red: false }); SO.FACES.length = 0; juneCU(c, t, { mouth: talk(t, quoteOn('l13', t), 'small'), look: [-0.3, 0], brows: 1.2, hold: null, armL: [0.1, 0.2] }, 270); }
  }, { tense: 1 });
  const stopT = L0('l14') + 0.2;
  add('stops', L0('l14') - 0.1, (c, t, lt) => { c.save(); camera(c, 1.45, 540, 600); lastCarDoor(c, t, { freezeAt: stopT + 0.3 }); c.restore(); }, { grade: 'cold' });
  // ---- lights out ----
  add('flicker', L0('l15') - 0.1, (c, t, lt) => {
    const fl = Math.max(0, Math.sin(lt * 23) * Math.sin(lt * 7.1)) > 0.45 ? 1 : 0;
    c.save(); camera(c, 1.08, 540, 760); sway(c, t, 0.6); downCar(c, t, { flick: fl ? 0.9 : 0.1 }); c.restore();
    if (fl) { c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(0, 0, W, H); }
  });
  add('eyesshut', L0('l16') - 0.1, (c, t, lt) => {
    car(c, t, { blur: 12, juneGone: true, red: false }); SO.FACES.length = 0;
    juneCU(c, t, { mouth: talk(t, quoteOn('l16', t), 'small'), look: [-0.4, 0], brows: 1.2, hold: null, armL: [0.1, 0.2], blink: 0 }, 300 + lt * 10, 800);
    if (Math.floor(lt * 9) % 5 === 0) { c.fillStyle = 'rgba(0,0,0,0.45)'; c.fillRect(0, 0, W, H); }
  });
  const outT = ww('l17', 'out'), shutT = ww('l17', 'shut');
  add('out', L0('l17') - 0.1, (c, t, lt) => {
    if (t < outT) { c.save(); camera(c, 1.08, 540, 760); downCar(c, t, { flick: 0.3 }); c.restore(); return; }
    lids(c, t); ruleLine(c, 3, seg(t, shutT + 0.2, shutT + 0.8) - seg(t, L1('l17') + 1.0, L1('l17') + 1.6));
  }, { grade: 'none' });
  add('clack', L0('l18') - 0.1, (c, t, lt) => lids(c, t), { grade: 'none' });
  const clk = [ww('l19', 'click'), ww('l20', 'click'), ww('l21', 'click')];
  add('click1', L0('l19') - 0.1, (c, t, lt) => lids(c, t), { grade: 'none' });
  add('click2', L0('l20') - 0.1, (c, t, lt) => lids(c, t), { grade: 'none' });
  add('click3', L0('l21') - 0.1, (c, t, lt) => lids(c, t, { glove: seg(t, clk[2], clk[2] + 0.6) }), { grade: 'none' });
  add('bend', L0('l22') - 0.1, (c, t, lt) => lids(c, t, { glove: 1, smile: ss(seg(lt, 0.6, 3)) }), { grade: 'none' });
  add('dontlook', L0('l23') - 0.1, (c, t, lt) => lids(c, t, { glove: 1 - seg(lt, 0.6, 2), smile: 1 - seg(lt, 0.6, 2) }), { grade: 'none' });
  const chimeT = ww('l24', 'chime');
  add('chime', L0('l24') - 0.1, (c, t, lt) => {
    if (t < chimeT + 0.25) { lids(c, t); return; }
    const k = seg(t, chimeT + 0.25, chimeT + 0.9); c.save(); camera(c, 1.08, 540, 760); downCar(c, t); c.restore(); SO.FACES.length = 0;
    c.fillStyle = rgba('#000000', 1 - ss(k)); c.fillRect(0, 0, W, H);
  });
  add('good', L0('l25') - 0.1, (c, t, lt) => twoShot(c, t, { juneTalk: quoteOn('l25', t), juneLook: [-0.5, 0.2], youLook: [0.3, 0.2], juneBrows: 0.9, youBrows: 0.9 }));
  add('notice', L0('l26') - 0.1, (c, t, lt) => { car(c, t, { blur: 11, juneGone: true, red: false }); SO.FACES.length = 0; youCU(c, t, { look: [lerp(0.3, -0.8, ss(seg(lt, 0.3, 1.2))), 0], brows: 0.6, blink: 0 }); });
  const turnT = ww('l27', 'turned');
  add('turned', L0('l27') - 0.1, (c, t, lt) => {
    const flip = seg(t, turnT - 0.25, turnT + 0.3), bob = Math.sin(flip * Math.PI) * 0.12;
    c.save(); camera(c, 1.25 + lt * 0.02, 600, 680); car(c, t, { juneGone: true, red: false, paper: 0.95 - bob }); rowDates(c, t, 1 - Math.sin(flip * Math.PI), t > turnT ? 1 : 0); c.restore();
  }, { sting: 1 });
  // ---- the call ----
  add('buzz', L0('l28') - 0.1, (c, t, lt) => pocket(c, t));
  add('call', L0('l29') - 0.1, (c, t, lt) => { SO.blurred(c, 10, o => { o.setTransform(1, 0, 0, 1, 0, 0); acrossBack(o, t, { speed: 0 }); }); c.save(); camera(c, 1 + lt * 0.02, 540, 800); callScreen(c, t); c.restore(); SO.lightPool(c, 540, 700, 700, '#9FB8FF', 0.35); });
  add('mom', L0('l30') - 0.1, (c, t, lt) => { c.fillStyle = '#0A0D14'; c.fillRect(0, 0, W, H); c.save(); camera(c, lerp(1.3, 1.7, ss(seg(lt, 0, 3))), 540, 860); callScreen(c, t); c.restore(); });
  add('dont', L0('l31') - 0.1, (c, t, lt) => { car(c, t, { blur: 12, juneGone: true, red: false }); SO.FACES.length = 0; juneCU(c, t, { mouth: talk(t, quoteOn('l31', t), 'small'), look: [0.1, 0.5], brows: 1.1, hold: null, armL: [0.1, 0.2], blink: 0 }, 260); });
  const pressT = ww('l32', 'button');
  add('answer', L0('l32') - 0.1, (c, t, lt) => { c.fillStyle = '#0A0D14'; c.fillRect(0, 0, W, H); c.save(); camera(c, 1.15, 540, 1000); callScreen(c, t, { press: seg(t, ww('l32', 'thumb') - 0.2, pressT + 0.2) }); c.restore(); });
  const ear = { hold: 'phone', armL: [EAR_A, EAR_B], phoneRot: 0.15 };
  add('momq', L0('l33') - 0.1, (c, t, lt) => { car(c, t, { blur: 13, juneGone: true, red: false }); SO.FACES.length = 0; youCU(c, t, Object.assign({ mouth: talk(t, quoteOn('l33', t), 'none'), brows: 0.6, look: [0, 0.1] }, ear), 250); });
  const nameT = ww('l34', 'name');
  add('name', L0('l34') - 0.1, (c, t, lt) => {
    car(c, t, { blur: 14, juneGone: true, red: false, dark: 1 }); SO.FACES.length = 0;
    youCU(c, t, Object.assign({ blink: 0, brows: lerp(0.6, 1.3, seg(t, nameT - 0.3, nameT + 0.2)), look: [0, 0] }, ear), 270 + lt * 8);
    c.fillStyle = rgba('#000000', 0.55 * seg(t, nameT, nameT + 0.6)); c.fillRect(0, 0, W, H);
    ruleLine(c, 5, seg(t, nameT + 0.1, nameT + 0.7));
  }, { tense: 1 });
  const revT = ww('l35', 'waiting');
  add('waiting', L0('l35') - 0.1, (c, t, lt) => {
    car(c, t, { blur: 16, juneGone: true, red: false, dark: 1 }); SO.FACES.length = 0;
    youCU(c, t, Object.assign({ blink: 0, brows: 1.3, look: [0, 0] }, ear), 330 + lt * 22, 820);
    c.fillStyle = rgba('#000000', 0.35 + 0.65 * ss(seg(t, L1('l35') - 0.2, L1('l35') + 0.8))); c.fillRect(0, 0, W, H);
  });
  const endT = L1('l35') + 2.0;
  add('end', endT, (c, t, lt) => endCard(c, seg(lt, 0.7, 1.3)), { raw: 1 });
  return { S, endT, ringT, stopT, clk, chimeT, turnT, pressT, revT, clampT, outT };
}

export async function init(ctx, q = new URLSearchParams()) {
  const NOSUB = q.get('nosub') === '1';
  if (q.get('ea')) { EAR_A = +q.get('ea'); EAR_B = +q.get('eb'); }
  const [timing, lines] = await Promise.all([new URL('./voices/timing.json', import.meta.url), new URL('./lines.json', import.meta.url)].map(u => fetch(u).then(r => r.json())));
  build(timing, lines);
  const K = shots(); const S = K.S;
  window.DUR = Math.round((K.endT + 0.7 + 4.67) * 30) / 30;
  // ---- sound events for mix.py ----
  const cut = n => S.find(s => s.name === n).t0;
  const ev = [{ t: LEAD, type: 'vo', file: 'voices/narration.wav' }];
  for (const id of IDS) ev.push({ t: L0(id), type: 'line', id, t1: L1(id) });
  ev.push({ t: L0('l02') + 0.1, type: 'rustle', g: 0.4 }, { t: K.turnT - 0.2, type: 'rustle' });
  ev.push({ t: K.ringT, t1: K.stopT, type: 'ring', far: 1 });                                   // his phone, muffled, in the last car
  ev.push({ t: L0('l28') - 0.05, t1: K.pressT, type: 'ring' }, { t: L0('l28') - 0.05, t1: K.pressT, type: 'buzz' });   // yours
  ev.push({ t: K.clampT, type: 'thud' });
  K.clk.forEach((c, i) => ev.push({ t: c + 0.02, type: 'punch', g: [0.25, 0.5, 0.9][i], pan: [0.0, 0.35, 0.8][i] }));
  ev.push({ t: K.chimeT, type: 'chime' });
  ev.push({ t: K.outT - 0.05, type: 'dark' }, { t: K.chimeT + 0.25, type: 'light' });
  ev.push({ t: L0('l10') - 0.2, t1: L1('l14') + 0.4, type: 'tense' }, { t: L0('l19') - 0.2, t1: L1('l23') + 0.3, type: 'tense' }, { t: L0('l28') - 0.2, t1: L1('l35'), type: 'tense' });
  ev.push({ t: ww('l27', 'turned'), type: 'sting' }, { t: ww('l03', 'nineteen'), type: 'sting' });
  ev.push({ t: K.revT, type: 'reveal' }, { t: ww('l35', 'train'), type: 'boom' });
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
      if (g === 'cold') { SO.nightGrade(ctx, { tint: '#5866B0' }); SO.lightPool(ctx, 540, 200, 900, '#C8D8FF', 0.2); }
      if (g === 'paper') { SO.nightGrade(ctx, { tint: '#8C98D0' }); SO.lightPool(ctx, 540, 300, 1100, '#E6EEFF', 0.25); }
      if (g !== 'none') { SO.faceGlow(ctx); glow(ctx, 0.5); SO.painterly(ctx); SO.grain(ctx, 0.05); vignette(ctx, 0.42); }
      else SO.grain(ctx, 0.04);
      if (sh.title) titleTop(ctx, TITLE, 'PART 2', clamp(1 - seg(t, L1('l01') - 0.3, L1('l01') + 0.2)));
      if (sh.chip) timeChip(ctx, t, Object.assign({ y: 360, k: 1 }, sh.chip));
      const cp = NOSUB ? null : capAt(t); if (cp) caption(ctx, cp.words, cp.k);
    }
  };
  window.TEXTS = t => { window.render(t); return texts; };
}
