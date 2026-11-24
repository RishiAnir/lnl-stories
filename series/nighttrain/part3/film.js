// DON'T MISS YOUR STOP — Part 3 "Your Stop". Soft style (assets/soft.js): round glowing faces, night-blue grade, blurred backgrounds.
// The narration (voices/narration.wav, Chatterbox) sets the clock; shots cut on its word times (voices/timing.json).
// Captions run continuously (every spoken word, 1-3 at a time, the Caption column's **keywords** in orange).
import { P, W, H, CAR, clamp, lerp, seg, ss, eo, camera, blinkAt, breathe, vignette, rgba, glow } from '../assets/kit.js';
import * as SO from '../assets/soft.js';
import { acrossBack, acrossBench, acrossClutter, doors, phoneCU, sheetInHands, ticketSoft, windowCU } from '../assets/softsets.js';
import { routeMap, rulesSheet, carLength, carProj, CAMLEN, RULES } from '../assets/sets.js';
import { endCard, caption, TEXT, titleTop, timeChip } from '../assets/ui.js';

const LEAD = 0.5;
TEXT.end = ['PART 4', 'Do you get off?', "Follow so you don't miss it"];
const TITLE = "Don't Miss Your Stop", CHIP = { time: '2:20', ampm: 'AM', line: 'PART 3 · YOUR STOP' };

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
  c.restore();
}
// eyes shut: the dark behind your eyelids. faint shapes can press in at the edges
const RINGS = [[260, 640, 0.45], [600, 820, 0.8], [940, 900, 1.35]];   // where each punch sounds: far down the car, closer, at your right ear
let CLK = [];
function lids(c, t, { glove = 0, smile = 0, sweep = 1 } = {}) {
  const g = c.createRadialGradient(540, 900, 100, 540, 900, 1100); g.addColorStop(0, '#140A0E'); g.addColorStop(1, '#030204'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  // the tunnel lamps outside, a dull red glow sliding across your shut eyes every few seconds
  if (sweep > 0) { const ph = (t % 2.36) / 2.36, x = lerp(-500, W + 500, ph); const r = c.createRadialGradient(x, 900, 40, x, 900, 620); r.addColorStop(0, rgba('#7A2418', 0.22 * sweep)); r.addColorStop(1, rgba('#7A2418', 0)); c.fillStyle = r; c.fillRect(0, 0, W, H); }
  CLK.forEach((ck, i) => { const a = t - ck; if (a < 0 || a > 1.6) return; const [x, y, sc] = RINGS[i];
    for (let k = 0; k < 3; k++) { const b = a - k * 0.12; if (b <= 0) continue; c.beginPath(); c.arc(x, y, b * 520 * sc, 0, Math.PI * 2); c.lineWidth = 6 * sc; c.strokeStyle = rgba('#E8E2D8', 0.5 * sc * Math.max(0, 1 - b / 1.3)); c.stroke(); }
    if (a < 0.12) { c.fillStyle = rgba('#E8E2D8', 0.08 * sc * (1 - a / 0.12)); c.fillRect(0, 0, W, H); } });
  // someone leaning over you: a shadow slides in from your right and blots out the glow behind your eyelids
  const lean = Math.max(glove, smile);
  if (lean > 0) { const sg = c.createLinearGradient(W, 0, W * 0.15, 0); sg.addColorStop(0, rgba('#000000', 0.95 * lean)); sg.addColorStop(1, rgba('#000000', 0)); c.fillStyle = sg; c.fillRect(0, 0, W, H); }
}
// the night train from outside: hills, poles flicking past, the lit windows sliding by
function outside(c, t, lt) {
  let g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#070A16'); g.addColorStop(0.55, '#141B33'); g.addColorStop(1, '#05060C'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  SO.lightPool(c, 820, 420, 260, '#DCE4FF', 0.35); c.beginPath(); c.arc(820, 420, 54, 0, Math.PI * 2); c.fillStyle = '#E8ECF6'; c.fill();
  for (let i = 0; i < 40; i++) { const x = (i * 263.7) % W, y = (i * 97.3) % 700; c.fillStyle = rgba('#DDE4FF', 0.25 + 0.2 * Math.sin(t * 2 + i)); c.fillRect(x, y, 3, 3); }
  const hills = (y0, amp, sp, col) => { c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= W; x += 20) c.lineTo(x, y0 - amp * (0.5 + 0.5 * Math.sin((x + t * sp) * 0.004) * Math.cos((x + t * sp) * 0.0017))); c.lineTo(W, H); c.closePath(); c.fillStyle = col; c.fill(); };
  hills(1060, 200, 30, '#0C1124'); hills(1180, 130, 90, '#090D1C');
  const cam = 1 + lt * 0.02; c.save(); c.translate(540, 1450); c.scale(cam, cam); c.translate(-540, -1450);
  c.fillStyle = '#05070E'; c.fillRect(0, 1640, W, 400);                                  // embankment
  c.fillStyle = '#1B2133'; c.fillRect(0, 1628, W, 12);                                   // rail
  const off = (t * 900) % 900;
  c.fillStyle = '#161C2C'; c.beginPath(); c.roundRect(-20, 1260, W + 40, 370, 30); c.fill();   // the cars
  c.fillStyle = '#20283C'; c.fillRect(0, 1260, W, 26);                                   // roof edge
  for (let k = -1; k < 3; k++) {
    const x0 = k * 900 - off;
    c.fillStyle = '#0A0D16'; c.fillRect(x0 + 876, 1260, 24, 370);                         // gap between cars
    for (let j = 0; j < 5; j++) { const wx = x0 + 50 + j * 166;
      const lg = c.createLinearGradient(0, 1320, 0, 1480); lg.addColorStop(0, '#F4E6C2'); lg.addColorStop(1, '#C9B98F');
      c.fillStyle = lg; c.beginPath(); c.roundRect(wx, 1320, 132, 160, 16); c.fill();
      c.fillStyle = rgba('#20283A', 0.55); if ((j + k) % 3 === 1) { c.beginPath(); c.arc(wx + 66, 1420, 34, Math.PI, 0); c.fill(); c.fillRect(wx + 32, 1420, 68, 60); } }
  }
  SO.lightPool(c, 540, 1400, 1000, '#F4E2B0', 0.2);
  for (let k = 0; k < 3; k++) { const x = W - ((t * 1700 + k * 520) % (W + 600)); c.fillStyle = '#020306'; c.fillRect(x, 820, 20, 1200); c.fillRect(x - 44, 880, 108, 12); }   // poles rushing past
  c.restore();
}
let EAR_A = 1.6, EAR_B = 2.9;
// ---------- Part 3 pieces ----------
const MOM = Object.assign({}, SO.passenger(7), { id: 'mom', top: '#3F5E54', legs: '#2E3440', shoe: '#1C1E22', tall: 1.0, wide: 1.0 });   // your mom: dark green work coat
const OLDMOM = Object.assign({}, SO.passenger(23), { id: 'oldmom', top: '#8A5A3C', legs: '#3A3440', tall: 0.98 });                   // June's mother, 1987
// a station platform at night seen through the train's open doors. who: the figure, near: 0..1 how close she stands, lamp: 0..1, smile: 0..1, wave: 0..1, sepia: the 1987 memory
function platform(c, t, { who = MOM, near = 0, lamp = 1, smile = 0, wave = 1, sepia = 0, doorsK = 1, frame = true, cam = 1, fy = 1100 } = {}) {
  c.save(); c.translate(540, fy); c.scale(cam, cam); c.translate(-540, -fy);
  let g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0A0C16'); g.addColorStop(0.55, '#1A2034'); g.addColorStop(1, '#0C0F18'); c.fillStyle = g; c.fillRect(-200, -200, W + 400, H + 400);
  // tiled back wall and the platform floor
  c.fillStyle = '#232A3E'; c.fillRect(-200, 360, W + 400, 760);
  for (let y = 380; y < 1100; y += 60) { c.fillStyle = 'rgba(255,255,255,0.035)'; c.fillRect(-200, y, W + 400, 3); }
  c.fillStyle = '#2C3346'; c.fillRect(-200, 1120, W + 400, 600);
  c.fillStyle = '#C9A93A'; c.fillRect(-200, 1640, W + 400, 26);                                    // yellow edge line
  c.fillStyle = '#0B0E16'; c.fillRect(-200, 1666, W + 400, 400);
  // the lamp: a post at the right with a cone of light onto the spot where she stands
  c.fillStyle = '#0D1018'; c.fillRect(860, 120, 22, 1010); c.fillRect(760, 120, 122, 18);
  if (lamp > 0) {
    c.save(); c.globalCompositeOperation = 'screen';
    const cone = c.createLinearGradient(0, 150, 0, 1500); cone.addColorStop(0, rgba('#FFE2A8', 0.55 * lamp)); cone.addColorStop(1, rgba('#FFE2A8', 0));
    c.beginPath(); c.moveTo(740, 150); c.lineTo(800, 150); c.lineTo(1040, 1500); c.lineTo(80, 1500); c.closePath(); c.fillStyle = cone; c.fill();
    SO.lightPool(c, 770, 150, 160, '#FFF1CC', 0.9 * lamp); SO.lightPool(c, 540, 1440, 520, '#FFE2A8', 0.35 * lamp);
    c.restore();
  }
  // her
  if (who) {
    const s = lerp(1.9, 3.1, near), y = lerp(1760, 2150, near);
    const a = wave ? 2.6 + Math.sin(t * 5) * 0.35 * wave : 0.12;
    SO.person(c, who, { x: 540, y, s, legs: 'stand', look: [0, 0.05], blink: 0, mouth: smile > 0.5 ? 'wide' : 'small', brows: 0.2, armR: wave ? [a, 0.4] : [0.12, 0.1], t });
    if (lamp <= 0) { c.fillStyle = 'rgba(0,0,0,0.85)'; c.fillRect(-200, -200, W + 400, H + 400); }
  }
  c.restore();
  // the open doors framing the view (dark panels at the edges, slid back)
  if (frame) {
    const o = lerp(0, 330, ss(doorsK));
    for (const s of [-1, 1]) { const x = s < 0 ? 210 - o - 400 : 870 + o; SO.blob(c, x, 0, 400, H, 10, '#5A6478', 1); c.fillStyle = '#0B0F16'; c.beginPath(); c.roundRect(x + 60, 260, 280, 420, 20); c.fill(); }
  }
  if (sepia) { c.save(); c.globalCompositeOperation = 'color'; c.globalAlpha = sepia; c.fillStyle = '#8A6A44'; c.fillRect(0, 0, W, H); c.restore(); }
}
// June's hand reaching in and pressing End
function endCall(c, t, k, ended) {
  callScreen(c, t, { answered: 9 });
  if (k > 0) { const e = ss(k); SO.limb(c, -200, 1700, lerp(-120, 520, e), lerp(1700, 1290, e), 56, '#B98A55'); SO.oval(c, lerp(-80, 560, e), lerp(1660, 1270, e), 60, 46, '#F0E6E0'); }
  if (ended > 0) { c.fillStyle = rgba('#05070C', 0.75 * ended); c.fillRect(0, 0, W, H); c.save(); c.globalAlpha = ended; c.font = '700 60px Inter'; c.fillStyle = '#E9EDF5'; c.textAlign = 'center'; c.fillText('Call Ended', 540, 820); c.restore(); }
}
// your wrist and June's hand gripping it
function wrist(c, t, k) {
  let g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1E2430'); g.addColorStop(1, '#2C3446'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  SO.limb(c, -100, 1300, 760, 900, 150, '#5B6577');            // your hoodie sleeve
  SO.oval(c, 840, 860, 110, 90, '#E3D8D2', 1, -0.4);             // your hand
  const x = lerp(1300, 600, eo(k)), y = lerp(1500, 1040, eo(k));
  SO.limb(c, 1400, 1700, x + 60, y + 60, 90, '#B98A55');
  SO.oval(c, x, y, 120, 82, '#F0E6E0', 1, 0.6);
  for (let i = 0; i < 4; i++) SO.oval(c, x - 90 - i * 6, y - 80 + i * 34, 46, 18, '#E8DCD4', 1, -0.6);
}
// the black window: your reflection, looking at the page or up; lift: head coming up, blink: lids
function reflection(c, t, { lift = 0, blink = 0, you = 0 } = {}) {
  windowCU(c, t, (o) => {
    o.save(); o.globalAlpha = 0.55;
    SO.person(o, SO.YOU, framed(SO.YOU, 540, 760, 260, { legs: 'sit', look: [0, lerp(0.9, 0, lift)], blink, brows: lerp(0.4, 0.2, lift), mouth: 'none', hold: 'sheet', armL: [-0.2, -1.1], t }));
    o.restore();
  });
}
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
  const youSit = (c, t) => { car(c, t, { blur: 11, juneGone: true, red: false }); SO.FACES.length = 0; };
  // ---- recap ----
  add('outside', 0, (c, t, lt) => outside(c, t, lt), { title: 1, chip: CHIP, grade: 'none' });
  add('vanish', ww('l00', 'man') - 0.15, (c, t, lt) => {
    const goneT = ww('l00', 'vanished');
    c.save(); camera(c, 1.12 + lt * 0.02, 700, 820); car(c, t, { blur: 3, juneGone: false, red: false }); SO.FACES.length = 0;
    const k = 1 - ss(seg(t, goneT - 0.4, goneT + 0.5)); if (k > 0) { c.save(); c.globalAlpha = k; car(c, t, { blur: 3, juneGone: false }); c.restore(); SO.FACES.length = 0; }
    c.restore();
  });
  add('rang', ww('l00', 'then') - 0.15, (c, t, lt) => { c.fillStyle = '#0A0D14'; c.fillRect(0, 0, W, H); c.save(); camera(c, 1.1 + lt * 0.03, 540, 860); callScreen(c, t); c.restore(); });
  // ---- June ends it ----
  const endT = ww('l01', 'ends');
  add('end', L0('l01') - 0.1, (c, t, lt) => { c.fillStyle = '#0A0D14'; c.fillRect(0, 0, W, H); c.save(); camera(c, 1.1, 540, 1000); endCall(c, t, seg(t, ww('l01', 'pulls') - 0.2, endT), seg(t, endT, endT + 0.4)); c.restore(); });
  add('rule5', L0('l02') - 0.1, (c, t, lt) => { youSit(c, t); juneCU(c, t, { mouth: talk(t, quoteOn('l02', t), 'small'), look: [-0.2, 0.1], brows: 1.0, hold: 'phone', armL: [-0.1, -1.0] }, 250); c.fillStyle = rgba('#000000', 0.5 * seg(t, ww('l02', 'if') - 0.2, ww('l02', 'if') + 0.3)); c.fillRect(0, 0, W, H); ruleLine(c, 5, seg(t, ww('l02', 'if'), ww('l02', 'if') + 0.5)); });
  add('shake', L0('l03') - 0.1, (c, t, lt) => { youSit(c, t); c.save(); c.translate(Math.sin(t * 41) * 3, Math.sin(t * 37) * 2); youCU(c, t, { mouth: talk(t, quoteOn('l03', t), 'none'), brows: 1.1, look: [-0.5, 0.1], blink: 0 }); c.restore(); });
  add('always', L0('l04') - 0.1, (c, t, lt) => { youSit(c, t); const miss = Math.sin(t * 11) * 0.25; juneCU(c, t, { mouth: talk(t, quoteOn('l04', t), 'meek'), look: [0.1, 0.7], brows: 0.9, t: t + miss }, 230 + lt * 4); });
  add('howknow', L0('l05') - 0.1, (c, t, lt) => twoShot(c, t, { youTalk: quoteOn('l05', t), youLook: [0.6, 0.1], juneLook: [0.2, 0.6], youBrows: 0.8 }));
  // ---- June's ticket and 1987 ----
  const tixT = ww('l06', 'holds');
  add('quiet', L0('l06') - 0.1, (c, t, lt) => {
    if (t < tixT - 0.2) { youSit(c, t); juneCU(c, t, { t: L0('l06'), look: [0.1, 0.8], brows: 0.7, blink: blinkAt(t, 4) }, 240 + lt * 6); return; }
    const up = eo(seg(t, tixT - 0.2, tixT + 0.8)); c.save(); camera(c, 1 + 0.05 * seg(t, tixT, L1('l06') + 1.5), 540, 800); ticketSoft(c, t, { lace: 1, y: lerp(1500, 780, up), rot: lerp(-0.4, 0.05, up), s: 1.1, hand: 'june' }); c.restore();
  }, { grade: 'paper' });
  add('mystop', L0('l07') - 0.1, (c, t, lt) => platform(c, t, { who: OLDMOM, near: 0.1, wave: 0, smile: 0, sepia: 0.85, doorsK: 1, cam: 1 + lt * 0.015 }), { grade: 'memory' });
  add('waving', L0('l08') - 0.1, (c, t, lt) => { const sm = ww('l08', 'smiling'); platform(c, t, { who: OLDMOM, near: lerp(0.1, 0.35, ss(seg(lt, 0, 4))), wave: 1, smile: t > sm ? 1 : 0, sepia: 0.85, cam: lerp(1, 1.5, ss(seg(t, sm - 0.3, sm + 1.2))) }); }, { grade: 'memory' });
  const shutT = ww('l09', 'stayed');
  add('stayed', L0('l09') - 0.1, (c, t, lt) => {
    if (t < ww('l09', 'she') - 0.1) { platform(c, t, { who: OLDMOM, near: 0.35, wave: 1, smile: 1, sepia: 0.85, doorsK: 1 - seg(t, shutT, shutT + 0.9) }); return; }
    youSit(c, t); juneCU(c, t, { mouth: talk(t, quoteOn('l09', t) && t > ww('l09', "I've") - 0.1, 'none'), look: [0.1, 0.8], brows: 0.6, hold: null, armL: [0.1, 0.2] }, 250 + lt * 3);
  }, { gradeAt: t => t < ww('l09', 'she') - 0.1 ? 'memory' : 'night' });
  // ---- the rules ----
  add('unfold', L0('l10') - 0.1, (c, t, lt) => { youSit(c, t); sheetInHands(c, t, ss(seg(lt, 0.1, 1.2))); });
  add('rule6', L0('l11') - 0.1, (c, t, lt) => rulesSheet(c, t, { show: 9, hi: 5, zoom: 0.5 + 0.05 * Math.sin(lt * 0.6) }), { grade: 'paper' });
  add('should', L0('l12') - 0.1, (c, t, lt) => { youSit(c, t); youCU(c, t, { mouth: talk(t, quoteOn('l12', t), 'none'), brows: 0.7, look: [-0.5, 0.1] }); });
  const stopT2 = ww('l13', 'stop');
  add('needles', L0('l13') - 0.1, (c, t, lt) => { youSit(c, t); juneCU(c, t, { t: Math.min(t, stopT2), look: [0.8, 0.6], brows: 1.0, blink: 0 }, 240 + lt * 5); }, { tense: 1 });
  add('notice', L0('l14') - 0.1, (c, t, lt) => rulesSheet(c, t, { show: 9, hi: -1, zoom: 0.1 + 0.3 * ss(seg(lt, 0, 3)) }), { grade: 'paper' });
  add('loops', L0('l15') - 0.1, (c, t, lt) => rulesSheet(c, t, { show: 9, hi: 6, zoom: lerp(0.7, 1.0, ss(seg(lt, 0, 3))) }), { grade: 'paper' });
  add('yours', L0('l16') - 0.1, (c, t, lt) => { youSit(c, t); youCU(c, t, { brows: 1.3, look: [0, 0.6], blink: 0, mouth: 'o' }, 250 + lt * 8); }, { sting: 1 });
  add('didnt', L0('l17') - 0.1, (c, t, lt) => { youSit(c, t); youCU(c, t, { mouth: talk(t, quoteOn('l17', t), 'none'), brows: 1.1, look: [-0.3, 0.3] }); });
  // ---- the reflection ----
  add('reflect', L0('l18') - 0.1, (c, t, lt) => { c.save(); camera(c, 1 + lt * 0.02, 540, 780); reflection(c, t, {}); c.restore(); }, { grade: 'cold' });
  add('isnt', L0('l19') - 0.1, (c, t, lt) => { if (t < ww('l19', 'it') - 0.1) { youSit(c, t); youCU(c, t, { look: [0.6, 0], brows: 0.8, blink: 0 }); } else { c.save(); camera(c, 1.15, 540, 760); reflection(c, t, {}); c.restore(); } }, { tense: 1 });
  const blinkT = ww('l20', 'blinks');
  add('blinks', L0('l20') - 0.1, (c, t, lt) => { c.save(); camera(c, lerp(1.15, 1.6, ss(seg(lt, 0, 3))), 540, 720); reflection(c, t, { lift: ss(seg(t, ww('l20', 'lifts') - 0.1, ww('l20', 'head') + 0.4)), blink: t > blinkT && t < blinkT + 0.25 ? 1 : 0 }); c.restore(); }, { tense: 1 });
  add('away', L0('l21') - 0.1, (c, t, lt) => { youSit(c, t); const k = ss(seg(lt, 0.05, 0.3)); c.save(); c.translate(lerp(0, -40, k), 0); youCU(c, t, { look: [lerp(0.6, -1, k), 0.1], brows: 1.2, blink: 0 }); c.restore(); if (lt < 0.3) { c.fillStyle = rgba('#FFFFFF', 0.08 * (1 - lt / 0.3)); c.fillRect(0, 0, W, H); } });
  add('rule8', L0('l22') - 0.1, (c, t, lt) => { youSit(c, t); juneCU(c, t, { mouth: talk(t, quoteOn('l22', t), 'small'), look: [-0.3, 0], brows: 1.0 }, 260); c.fillStyle = rgba('#000000', 0.5 * seg(lt, 0.2, 0.8)); c.fillRect(0, 0, W, H); ruleLine(c, 8, seg(lt, 0.2, 0.8)); });
  // ---- your name on the map ----
  const scrT = ww('l24', 'scrambles'), nameT = ww('l25', 'name');
  const swap = t => ({ i: 2, from: 'Last Light', to: '  ?????  ', k: seg(t, scrT, nameT) });
  add('mapflick', L0('l23') - 0.1, (c, t, lt) => { c.save(); camera(c, 1.25 + lt * 0.03, 560, 720); routeMap(c, t, CAR, { at: 2, glowK: Math.sin(t * 31) > 0 ? 1 : 0.3 }); c.restore(); });
  add('scramble', L0('l24') - 0.1, (c, t, lt) => { c.save(); camera(c, lerp(1.4, 1.9, ss(seg(lt, 0, 3))), 540, 650); routeMap(c, t, CAR, { at: 2, swap: swap(t) }); c.restore(); });
  add('name', L0('l25') - 0.1, (c, t, lt) => {
    c.save(); camera(c, 1.9 + lt * 0.03, 540, 650); routeMap(c, t, CAR, { at: 2, swap: swap(t) }); c.restore();
    const k = seg(t, nameT - 0.2, nameT + 0.3); SO.lightPool(c, 540, 600, 520, '#FFE2A8', 0.85 * k);   // your name burns too bright to read
  }, { sting: 1 });
  add('brakes', L0('l26') - 0.1, (c, t, lt) => { c.save(); camera(c, 1.08, 540, 760); c.translate(Math.sin(t * 30) * 4 * seg(lt, 0, 1), 0); downCar(c, t); c.restore(); });
  const grabT = ww('l27', 'grabs');
  add('grab', L0('l27') - 0.1, (c, t, lt) => { if (t < ww('l27', "Don't") - 0.15) wrist(c, t, seg(t, grabT - 0.2, grabT + 0.1)); else { youSit(c, t); juneCU(c, t, { mouth: talk(t, quoteOn('l27', t), 'small'), look: [-0.4, 0.1], brows: 1.2, hold: null, armL: [0.3, 0.6] }, 270); } }, { tense: 1 });
  // ---- the platform ----
  const openT = ww('l28', 'slide');
  add('open', L0('l28') - 0.1, (c, t, lt) => platform(c, t, { who: null, doorsK: seg(t, openT - 0.1, openT + 1.0) }), { grade: 'cold' });
  add('mom', L0('l29') - 0.1, (c, t, lt) => platform(c, t, { near: 0, wave: 1, smile: 0, cam: 1 + lt * 0.015 }), { grade: 'cold' });
  const wideT = ww('l30', 'too');
  add('toowide', L0('l30') - 0.1, (c, t, lt) => platform(c, t, { near: 0, wave: 0.4, smile: t > wideT ? 1 : 0.3, cam: lerp(1.2, 2.2, ss(seg(t, wideT - 0.4, wideT + 1.4))), fy: 640, frame: false }), { sting: 1, grade: 'cold' });
  add('never', L0('l31') - 0.1, (c, t, lt) => { youSit(c, t); juneCU(c, t, { mouth: talk(t, quoteOn('l31', t), 'small'), look: [0.5, 0.1], brows: 1.3, hold: null, armL: [0.3, 0.6] }, 270); });
  add('rulesay', L0('l32') - 0.1, (c, t, lt) => { youSit(c, t); youCU(c, t, { look: [0.7, 0.1], brows: 1.0, blink: 0 }, 250 + lt * 6); c.fillStyle = rgba('#000000', 0.5 * seg(lt, 0.4, 1)); c.fillRect(0, 0, W, H); ruleLine(c, 6, seg(lt, 0.5, 1.1)); });
  const offT = ww('l33', 'off');
  add('lampoff', L0('l33') - 0.1, (c, t, lt) => platform(c, t, { near: 0, wave: 0, smile: 1, lamp: t < offT ? (Math.sin(t * 40) > -0.3 ? 1 : 0.2) * (t > offT - 0.6 ? 1 : 1) : 0 }), { tense: 1, grade: 'cold' });
  const backT = ww('l34', 'back') + 0.1;
  add('closer', L0('l34') - 0.1, (c, t, lt) => platform(c, t, { near: t > backT ? 0.75 : 0, wave: 0, smile: 1, lamp: t > backT ? 1 : 0, cam: t > backT ? 1 + 0.02 * (t - backT) : 1 }), { tense: 1, grade: 'cold' });
  const endT2 = L1('l34') + 2.0;
  add('fin', L1('l34') + 0.9, (c, t, lt) => { c.fillStyle = '#000'; c.fillRect(0, 0, W, H); }, { grade: 'none' });
  add('endcard', endT2, (c, t, lt) => endCard(c, seg(lt, 0.7, 1.3)), { raw: 1 });
  return { S, endT: endT2, endT_call: endT, grabT, openT, offT, backT, blinkT, nameT, scrT, tixT, shutT, stopT2 };
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
  ev.push({ t: ww('l00', 'then') - 0.05, t1: L0('l01') + 0.4, type: 'ring' });                      // the call, still going as June takes it
  ev.push({ t: K.endT_call, type: 'thud', g: 0.4 });
  ev.push({ t: L0('l10') + 0.1, type: 'rustle', g: 0.5 });
  ev.push({ t: K.shutT + 0.1, type: 'whoosh' });                                                 // the 1987 doors closing
  ev.push({ t: K.blinkT, type: 'sting' }, { t: ww('l16', 'handwriting'), type: 'sting' }, { t: K.nameT, type: 'sting' });
  ev.push({ t: ww('l26', 'brakes') - 0.2, type: 'brakes' });
  ev.push({ t: K.grabT, type: 'thud' });
  ev.push({ t: ww('l28', 'chime'), type: 'chime' }, { t: K.openT, type: 'whoosh' });
  ev.push({ t: K.offT, type: 'dark' }, { t: K.backT, type: 'light' }, { t: K.backT, type: 'hit2' });
  ev.push({ t: L0('l07') - 0.2, t1: L1('l09') + 0.3, type: 'memory' });
  ev.push({ t: L0('l18') - 0.2, t1: L1('l22'), type: 'tense' }, { t: L0('l26') - 0.2, t1: L1('l34'), type: 'tense' });
  ev.push({ t: K.backT, type: 'reveal' }, { t: K.backT + 0.05, type: 'boom' });
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
      const g = sh.gradeAt ? sh.gradeAt(t) : (sh.grade || 'night');
      if (g === 'night') { SO.carAmbience(ctx, t); SO.lightPool(ctx, 420, 40, 1000, '#E2F0EA', 0.22); }
      if (g === 'memory') { SO.nightGrade(ctx, { tint: '#B0A08A' }); SO.lightPool(ctx, 540, 600, 1100, '#FFE2B0', 0.2); }
      if (g === 'cold') { SO.nightGrade(ctx, { tint: '#5866B0' }); SO.lightPool(ctx, 540, 200, 900, '#C8D8FF', 0.2); }
      if (g === 'paper') { SO.nightGrade(ctx, { tint: '#8C98D0' }); SO.lightPool(ctx, 540, 300, 1100, '#E6EEFF', 0.25); }
      if (g !== 'none') { SO.faceGlow(ctx); glow(ctx, 0.5); SO.painterly(ctx); SO.grain(ctx, 0.05); vignette(ctx, 0.42); }
      else SO.grain(ctx, 0.04);
      if (sh.title) titleTop(ctx, TITLE, 'PART 3', clamp(1 - seg(t, ww('l00', 'man') - 0.6, ww('l00', 'man') - 0.1)));
      if (sh.chip) timeChip(ctx, t, Object.assign({ y: 360, k: 1 }, sh.chip));
      const cp = NOSUB ? null : capAt(t); if (cp) caption(ctx, cp.words, cp.k);
    }
  };
  window.TEXTS = t => { window.render(t); return texts; };
}
