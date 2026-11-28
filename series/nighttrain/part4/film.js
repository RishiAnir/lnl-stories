// DON'T MISS YOUR STOP — Part 4 "Get Off" (the finale). Soft style (assets/soft.js): round glowing faces, night-blue grade, blurred backgrounds.
// The narration (voices/narration.wav, Chatterbox) sets the clock; shots cut on its word times (voices/timing.json).
// Captions run continuously (every spoken word, 1-3 at a time, the Caption column's **keywords** in orange).
import { P, W, H, CAR, clamp, lerp, seg, ss, eo, camera, blinkAt, breathe, vignette, rgba, glow } from '../assets/kit.js';
import * as SO from '../assets/soft.js';
import { acrossBack, acrossBench, acrossClutter, doors, phoneCU, sheetInHands, ticketSoft, windowCU } from '../assets/softsets.js';
import { routeMap, rulesSheet, carLength, carProj, CAMLEN, RULES } from '../assets/sets.js';
import { endCard, caption, TEXT, titleTop, timeChip } from '../assets/ui.js';

const LEAD = 0.5;
TEXT.end = ['THE END', "Don't Miss Your Stop", 'Thanks for riding.'];
const TITLE = "Don't Miss Your Stop", CHIP = { time: '2:24', ampm: 'AM', line: 'FINAL PART · GET OFF' };

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
function platform(c, t, { who = MOM, near = 0, lamp = 1, smile = 0, wave = 1, sepia = 0, doorsK = 1, frame = true, cam = 1, fy = 1100, dawn = 0 } = {}) {
  c.save(); c.translate(540, fy); c.scale(cam, cam); c.translate(-540, -fy);
  let g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, dawn ? '#E7A58A' : '#0A0C16'); g.addColorStop(0.55, dawn ? '#8A7A9E' : '#1A2034'); g.addColorStop(1, dawn ? '#3A3A52' : '#0C0F18'); c.fillStyle = g; c.fillRect(-200, -200, W + 400, H + 400);
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
    SO.person(c, who, { x: 540, y, s, legs: 'stand', look: [0, 0.05], blink: 0, mouth: who === MOM && smile > 0.5 ? 'none' : (smile > 0.5 ? 'wide' : 'small'), brows: 0.2, armR: wave ? [a, 0.4] : [0.12, 0.1], t });
    if (lamp <= 0) { c.fillStyle = 'rgba(0,0,0,0.85)'; c.fillRect(-200, -200, W + 400, H + 400); }
  }
  c.restore();
  if (who === MOM && smile > 0.5 && lamp > 0) creepFace(c, SO.FACES[SO.FACES.length - 1], 1);
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
function reflection(c, t, { lift = 0, blink = 0 } = {}) {
  // the car wall around a big dark window; tunnel lights streak past outside; your reflection sits in the glass, cold and a little see-through
  let g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#8A96B4'); g.addColorStop(1, '#4E5872'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.save(); c.beginPath(); c.roundRect(90, 110, 900, 1500, 60); c.clip();
  g = c.createLinearGradient(0, 110, 0, 1610); g.addColorStop(0, '#05070D'); g.addColorStop(1, '#0B0F1A'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  for (let k = 0; k < 3; k++) { const x = W - ((t * 1400 + k * 700) % (W + 900)); const lg = c.createLinearGradient(x - 160, 0, x + 160, 0); lg.addColorStop(0, 'rgba(255,190,120,0)'); lg.addColorStop(0.5, 'rgba(255,190,120,0.10)'); lg.addColorStop(1, 'rgba(255,190,120,0)'); c.fillStyle = lg; c.fillRect(x - 160, 110, 320, 1500); }
  // creep: once it lifts its head it stops being you: the head tilts, the eyes go black with pinpoint lights, a thin smile spreads too wide
  const creep = ss(seg(lift, 0.35, 1)), tilt = 0.16 * creep, jit = creep * (Math.sin(t * 37) > 0.93 ? 6 : 0);
  const pose = framed(SO.YOU, 540, lerp(800, 760, lift), 230, { legs: 'sit', look: [0, lerp(0.95, 0.4, lift)], blink: creep > 0.05 ? 0 : Math.max(blink, 0.65), brows: lerp(0.3, -0.2, creep), mouth: 'none', hold: 'sheet', armL: [-0.2, -1.1], t });
  const drawMe = (a, dx) => { c.save(); c.globalAlpha = a; c.filter = 'saturate(0.3) brightness(1.15) contrast(1.25)'; c.translate(540 + dx + jit, 560); c.rotate(tilt); c.translate(-540, -560); SO.person(c, SO.YOU, pose); c.restore(); };
  if (creep > 0) drawMe(0.22 * creep, 18);     // a faint second image, a beat behind
  drawMe(0.9, 0);
  const f = SO.FACES[SO.FACES.length - 1]; SO.FACES.length = 0;
  if (f && creep > 0) {
    c.save(); c.translate(540 + jit, 560); c.rotate(tilt); c.translate(-540, -560);
    const r = f.r, ey = f.y + 0.08 * r;
    for (const sx of [-1, 1]) {
      const ex = f.x + sx * 0.36 * r;
      if (blink) { c.strokeStyle = rgba('#05060A', creep); c.lineWidth = 0.05 * r; c.beginPath(); c.moveTo(ex - 0.2 * r, ey); c.lineTo(ex + 0.2 * r, ey); c.stroke(); continue; }
      c.fillStyle = rgba('#020306', 0.95 * creep); c.beginPath(); c.ellipse(ex, ey, 0.17 * r, 0.21 * r, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = rgba('#F4F6FF', creep); c.beginPath(); c.arc(ex + sx * 0.02 * r, ey - 0.02 * r, 0.04 * r, 0, Math.PI * 2); c.fill();
    }
    const sw = lerp(0.2, 0.62, creep) * r, my = f.y + 0.5 * r;
    c.strokeStyle = rgba('#05060A', 0.9 * creep); c.lineWidth = 0.045 * r; c.lineCap = 'round';
    c.beginPath(); c.moveTo(f.x - sw, my - 0.12 * r * creep); c.quadraticCurveTo(f.x, my + 0.22 * r * creep, f.x + sw, my - 0.12 * r * creep); c.stroke();
    c.restore();
  }
  if (creep > 0 && Math.sin(t * 23) > 0.97) { c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(0, 0, W, H); }   // the glass flickers
  c.save(); c.globalCompositeOperation = 'multiply'; c.fillStyle = '#A8B4E6'; c.fillRect(0, 0, W, H); c.restore();   // the glass tints it blue
  c.save(); c.globalCompositeOperation = 'screen'; c.fillStyle = 'rgba(200,215,255,0.06)'; c.beginPath(); c.moveTo(140, 110); c.lineTo(420, 110); c.lineTo(180, 1610); c.lineTo(90, 1610); c.closePath(); c.fill(); c.restore();   // a glare stripe
  c.restore();
  c.lineWidth = 26; c.strokeStyle = '#3A4256'; c.beginPath(); c.roundRect(90, 110, 900, 1500, 60); c.stroke();
}
// ---------- Part 4 pieces ----------
// the train from the platform side: the car wall with lit windows and the doors; doorsK 1 = open, 0 = shut; off: how far it has pulled away (px); june: her face in the window
function trainSide(c, t, { doorsK = 1, off = 0, june = 0, juneMouth = 'none' } = {}) {
  let g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0A0C16'); g.addColorStop(1, '#151A2A'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.fillStyle = '#2C3346'; c.fillRect(0, 1500, W, 420); c.fillStyle = '#C9A93A'; c.fillRect(0, 1480, W, 24);
  c.save(); c.translate(-off, 0);
  c.fillStyle = '#5A6478'; c.beginPath(); c.roundRect(-400, 220, 2200, 1240, 30); c.fill();
  for (const wx of [-260, 700, 1250]) { const lg = c.createLinearGradient(0, 380, 0, 760); lg.addColorStop(0, '#F4E6C2'); lg.addColorStop(1, '#C9B98F'); c.fillStyle = lg; c.beginPath(); c.roundRect(wx, 380, 300, 380, 24); c.fill(); }
  // the window you're looking back into: June
  if (june > 0) { c.save(); c.beginPath(); c.roundRect(700, 380, 300, 380, 24); c.clip(); SO.person(c, SO.JUNE, framed(SO.JUNE, 850, 600, 95, { legs: 'sit', look: [-0.3, 0], blink: 0, brows: 1.2, mouth: juneMouth, hold: 'ticket', armL: [-0.4, -1.6], ticketRot: 0.1, t })); c.restore(); SO.FACES.length = 0; }
  // the doors (centre-left), sliding shut
  const o = lerp(0, 150, ss(doorsK));
  c.fillStyle = '#C8D2E2'; c.fillRect(140, 300, 460, 1160);
  c.fillStyle = lerp(0, 1, doorsK) > 0.05 ? '#F4E6C2' : '#C8D2E2'; c.fillRect(370 - o, 300, o * 2, 1160);   // the lit car seen through the gap
  for (const s of [-1, 1]) { const x = s < 0 ? 140 - o : 370 + o; c.fillStyle = '#7A8498'; c.fillRect(x, 300, 230, 1160); c.fillStyle = '#0B0F16'; c.beginPath(); c.roundRect(x + 40, 400, 150, 300, 16); c.fill(); }
  c.restore();
}
// the thing up close: your mom's face, the smile running back to her ears
// what's wearing your mom: black eyes with pinpoint lights, a grin that runs past her cheeks, small square teeth. f: a FACES entry (screen space)
function creepFace(c, f, k = 1, { teeth = 1 } = {}) {
  if (!f || k <= 0) return;
  const r = f.r, ey = f.y + 0.05 * r;
  c.save(); c.globalAlpha = clamp(k);
  for (const sx of [-1, 1]) { const ex = f.x + sx * 0.36 * r; c.fillStyle = '#020306'; c.beginPath(); c.ellipse(ex, ey, 0.16 * r, 0.2 * r, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#F4F6FF'; c.beginPath(); c.arc(ex, ey - 0.03 * r, 0.035 * r, 0, Math.PI * 2); c.fill(); }
  const w = 1.05 * r, top = f.y + 0.3 * r, bot = f.y + 0.78 * r;
  c.beginPath(); c.moveTo(f.x - w, f.y + 0.12 * r); c.quadraticCurveTo(f.x, top + 0.34 * r, f.x + w, f.y + 0.12 * r); c.quadraticCurveTo(f.x, bot + 0.22 * r, f.x - w, f.y + 0.12 * r); c.closePath();
  c.fillStyle = '#0A0508'; c.fill();
  if (teeth) { c.save(); c.clip(); c.fillStyle = '#ECE6DA'; for (let i = -7; i <= 7; i++) { const x = f.x + i * 0.13 * r, yy = f.y + 0.12 * r + (1 - Math.pow(i / 8, 2)) * 0.36 * r; c.fillRect(x - 0.05 * r, yy - 0.04 * r, 0.1 * r, 0.12 * r); } c.restore(); }
  c.restore();
}
function momFace(c, t, { smile = 1, cam = 1.6 } = {}) {
  platform(c, t, { near: 0.3, wave: 0, smile: 0, cam, fy: 620, frame: false });
  const f = SO.FACES[SO.FACES.length - 1]; SO.FACES.length = 0;
  if (!f) return;
  const tilt = 0.12 * smile; c.save(); c.translate(f.x, f.y); c.rotate(tilt); c.translate(-f.x, -f.y);
  creepFace(c, { x: f.x, y: f.y, r: f.r * lerp(0.9, 1.15, smile) }, 1);
  c.restore();
}
// your phone at dawn: full bars, the time, and the missed calls stacking up
function dawnPhone(c, t, { missed = 0 } = {}) {
  let g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#E7A58A'); g.addColorStop(1, '#5B5A86'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.save(); c.translate(540, 1000); c.rotate(-0.06);
  SO.blob(c, -250, -480, 500, 960, 70, '#15171F', 0.4);
  c.beginPath(); c.roundRect(-226, -456, 452, 912, 56); g = c.createLinearGradient(0, -456, 0, 456); g.addColorStop(0, '#E8A48C'); g.addColorStop(1, '#4C4F80'); c.fillStyle = g; c.fill();
  c.fillStyle = '#FFFFFF'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = '600 30px Inter'; c.fillText('Friday', 0, -290); c.font = '700 150px Inter'; c.fillText('5:52', 0, -170);
  for (let i = 0; i < 4; i++) { c.beginPath(); c.roundRect(110 + i * 18, -400 - i * 8, 12, 10 + i * 8, 3); c.fillStyle = '#FFFFFF'; c.fill(); }
  if (missed > 0) { const k = ss(missed); c.globalAlpha = k;
    for (let i = 0; i < 3; i++) { c.beginPath(); c.roundRect(-200, -40 + i * 26 - (2 - i) * 0, 400, 150, 30); c.fillStyle = rgba('#F4F2FA', 0.92 - i * 0.25); c.fill(); }
    c.textAlign = 'left'; c.fillStyle = '#1C1E2C'; c.font = '700 40px Inter'; c.fillText('Mom', -160, 0); c.font = '600 30px Inter'; c.fillStyle = '#E0473F'; c.fillText(`${Math.min(23, Math.round(23 * k))} missed calls`, -160, 50);
    c.globalAlpha = 1; }
  c.restore();
  c.save(); c.translate(540, 1180); c.rotate(-0.06); SO.blob(c, -260, 150, 70, 190, 34, '#E3D8D2'); SO.blob(c, 200, 120, 70, 200, 34, '#E3D8D2'); c.restore();
}
// the bottom of the rules sheet, close: rule nine, then a tenth line you don't remember writing
function ruleTen(c, t, k) {
  c.fillStyle = '#1C2030'; c.fillRect(0, 0, W, H);
  c.save(); c.translate(540, 900); c.rotate(-0.03); c.scale(1.6, 1.6);
  c.fillStyle = '#F1EEE4'; c.fillRect(-420, -420, 840, 840);
  for (let i = 0; i < 18; i++) { c.fillStyle = rgba('#5A78B4', 0.35); c.fillRect(-420, -380 + i * 48, 840, 2); }
  c.fillStyle = rgba('#C8463C', 0.45); c.fillRect(-340, -420, 3, 840);
  c.font = '600 42px Caveat'; c.fillStyle = '#2A3552'; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  c.fillText("9. If the passengers start copying you, freeze.", -320, -250); c.fillText("   Don't move until they go back to their newspapers.", -320, -202);
  c.save(); c.globalAlpha = clamp(k); c.font = '700 64px Caveat'; c.fillStyle = '#3A2230'; c.fillText('10. Come back for June.', -320, -60); c.restore();
  c.restore();
}
function rain(c, t, a = 0.35) { c.save(); c.strokeStyle = rgba('#B8C6E8', a); c.lineWidth = 2; for (let i = 0; i < 90; i++) { const x = (i * 137.7 + t * 120) % (W + 200) - 100, y = (i * 263.3 + t * 1500) % (H + 200) - 100; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 14, y + 46); c.stroke(); } c.restore(); }
const tear = (c, t, k) => {   // wet eyes and tears running down both cheeks
  if (k <= 0) return; const f = SO.FACES[SO.FACES.length - 1]; if (!f) return; const r = f.r;
  c.save(); c.globalAlpha = clamp(k);
  for (const s of [-1, 1]) {
    const ex = f.x + s * 0.36 * r, ey = f.y + 0.05 * r;
    c.fillStyle = 'rgba(220,235,255,0.9)'; c.beginPath(); c.arc(ex + 3, ey - 3, 3.5, 0, Math.PI * 2); c.fill();                          // shine on the eye
    c.strokeStyle = 'rgba(200,225,255,0.55)'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(ex + s * 4, ey + 0.14 * r); c.quadraticCurveTo(ex + s * 10, ey + 0.4 * r, ex + s * 6, ey + 0.62 * r); c.stroke();
    const d = ((t * 0.7 + (s > 0 ? 0.5 : 0)) % 1); c.fillStyle = 'rgba(215,235,255,0.95)'; c.beginPath(); c.ellipse(ex + s * 8, ey + 0.16 * r + d * 0.5 * r, 5, 7, 0, 0, Math.PI * 2); c.fill();
  }
  c.restore();
};
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
  // ---- the hook ----
  add('hook', 0, (c, t, lt) => platform(c, t, { near: 0.75, wave: 0, smile: 1, lamp: 1, cam: 1 + lt * 0.01 }), { title: 1, chip: CHIP, grade: 'cold', tense: 1 });
  add('closer', L0('l01') - 0.1, (c, t, lt) => { const fl = Math.sin(t * 40) > -0.2; platform(c, t, { near: lerp(0.75, 0.95, ss(seg(lt, 0.5, 2.5))), wave: 0, smile: 1, lamp: lt < 1.2 ? (fl ? 1 : 0.15) : 1 }); }, { grade: 'cold', tense: 1 });
  add('comehere', L0('l02') - 0.1, (c, t, lt) => momFace(c, t, { smile: 0.6, cam: lerp(1.5, 1.9, ss(seg(lt, 0, 4))) }), { grade: 'cold', tense: 1 });
  const nailT = ww('l03', 'nails');
  add('nails', L0('l03') - 0.1, (c, t, lt) => { if (t < ww('l03', 'stay') - 0.1) { c.save(); c.translate(Math.sin(t * 50) * 3 * seg(t, nailT, nailT + 0.3), 0); wrist(c, t, seg(t, nailT - 0.3, nailT)); c.restore(); } else { youSit(c, t); juneCU(c, t, { mouth: talk(t, quoteOn('l03', t), 'small'), look: [-0.4, 0.1], brows: 1.3, hold: null, armL: [0.3, 0.6] }, 270); } }, { tense: 1 });
  add('rule6', L0('l04') - 0.1, (c, t, lt) => rulesSheet(c, t, { show: 9, hi: 5, zoom: 0.5 + 0.06 * ss(seg(lt, 0, 4)) }), { grade: 'paper' });
  add('who', L0('l05') - 0.1, (c, t, lt) => { youSit(c, t); youCU(c, t, { mouth: talk(t, quoteOn('l05', t), 'none'), brows: 1.0, look: [-0.5, 0.1] }); });
  add('youdid', L0('l06') - 0.1, (c, t, lt) => { youSit(c, t); c.save(); c.translate(0, Math.sin(t * 9) * 2 * seg(lt, 0.4, 1)); juneCU(c, t, { mouth: quoteOn('l06', t) ? (Math.floor(t * 7) % 3 === 0 ? 'sad' : 'sob') : 'sad', look: [0.1, 0.55], brows: 1.5, blink: 0.25 + blinkAt(t, 3) * 0.75, hold: null, armL: [0.3, 0.6] }, 260); tear(c, t, seg(lt, 0.4, 1.4)); c.restore(); SO.FACES.length = 0; });
  add('everytime', L0('l07') - 0.1, (c, t, lt) => { youSit(c, t); c.save(); c.translate(0, Math.sin(t * 9) * 2); juneCU(c, t, { mouth: quoteOn('l07', t) ? (Math.floor(t * 7) % 3 === 0 ? 'sad' : 'sob') : 'sad', look: [0.1, 0.55], brows: 1.5, blink: 0.25 + blinkAt(t, 3) * 0.75, hold: null, armL: [0.3, 0.6] }, 270 + lt * 4); tear(c, t, 1); c.restore(); SO.FACES.length = 0; });
  add('lace', L0('l08') - 0.1, (c, t, lt) => { c.save(); camera(c, 1 + lt * 0.02, 540, 800); ticketSoft(c, t, { lace: 1, s: 1.1, hand: 'june' }); c.restore(); }, { grade: 'paper' });
  add('onehole', L0('l09') - 0.1, (c, t, lt) => { c.save(); camera(c, 1.15 + lt * 0.03, 540, 780); ticketSoft(c, t, { holes: 1, hand: 'left' }); c.restore(); }, { grade: 'paper', sting: 1 });
  add('howmany', L0('l10') - 0.1, (c, t, lt) => { youSit(c, t); youCU(c, t, { mouth: talk(t, quoteOn('l10', t), 'none'), brows: 1.2, look: [-0.5, 0.1], blink: 0 }, 250 + lt * 6); });
  add('tighter', L0('l11') - 0.1, (c, t, lt) => { c.save(); c.translate(Math.sin(t * 40) * 3, 0); wrist(c, t, 1); c.restore(); }, { tense: 1 });
  const chimeT = ww('l12', 'chime');
  add('chime', L0('l12') - 0.1, (c, t, lt) => platform(c, t, { near: 0.95, wave: 0, smile: 1, doorsK: 1 - 0.12 * seg(t, chimeT + 0.6, L1('l12') + 0.5) }), { grade: 'cold', tense: 1 });
  const freeT = ww('l13', 'free');
  add('free', L0('l13') - 0.1, (c, t, lt) => { if (t < ww('l13', "I'm") - 0.1) wrist(c, t, 1 - seg(t, freeT - 0.4, freeT)); else { youSit(c, t); youCU(c, t, { mouth: talk(t, quoteOn('l13', t), 'none'), brows: 0.9, look: [-0.6, 0.1] }); } });
  const stepT = ww('l14', 'step');
  add('step', L0('l14') - 0.1, (c, t, lt) => platform(c, t, { who: null, doorsK: 1, cam: lerp(1, 1.9, ss(seg(t, stepT - 0.2, L1('l14') + 1.2))) }), { grade: 'cold' });
  add('cold', L0('l15') - 0.1, (c, t, lt) => { platform(c, t, { near: 0.3, wave: 0, smile: 1, frame: false, cam: 1 + lt * 0.01 }); rain(c, t); }, { grade: 'cold' });
  add('ears', L0('l16') - 0.1, (c, t, lt) => { momFace(c, t, { smile: ss(seg(t, ww('l16', 'smile'), ww('l16', 'ears') + 0.3)), cam: lerp(1.7, 2.1, ss(seg(lt, 0, 5))) }); rain(c, t, 0.25); }, { grade: 'cold', sting: 1 });
  add('rule6b', L0('l17') - 0.1, (c, t, lt) => { momFace(c, t, { smile: 1, cam: 2.1 }); c.fillStyle = rgba('#000000', 0.6 * seg(lt, 0, 0.5)); c.fillRect(0, 0, W, H); ruleLine(c, 6, seg(lt, 0.1, 0.7)); }, { grade: 'cold' });
  const walk = (c, t, lt, { thing = 1 } = {}) => {
    const ph = t * 6.2, bob = Math.abs(Math.sin(ph)) * 14;
    SO.blurred(c, 12, o => { o.setTransform(1, 0, 0, 1, 0, 0); platform(o, t, { who: null, frame: false, cam: 1.15 + (lt % 9) * 0.03, fy: 900 }); });
    if (thing > 0) { const k = ss(seg(lt, 0, 3.2)); c.save(); c.globalAlpha = thing; SO.person(c, MOM, { x: lerp(300, -260, k), y: lerp(2050, 2350, k), s: lerp(2.9, 3.8, k), legs: 'stand', look: [0.8, 0], blink: 0, mouth: 'none', t }); c.restore(); creepFace(c, SO.FACES[SO.FACES.length - 1], thing); SO.FACES.length = 0; }
    c.save(); c.translate(Math.sin(ph / 2) * 8, bob);
    youCU(c, t, { legs: 'stand', walk: ph, look: [0, 0.3], brows: 1.1, blink: 0, mouth: 'none', armL: [0.18 + Math.sin(ph) * 0.22, 0.2], armR: [0.18 - Math.sin(ph) * 0.22, 0.2], rot: Math.sin(ph / 2) * 0.02 }, 200, 760);
    c.restore();
    rain(c, t, 0.3);
  };
  add('walkpast', L0('l18') - 0.1, (c, t, lt) => walk(c, t, lt), { grade: 'cold', tense: 1 });
  add('whisper', L0('l19') - 0.1, (c, t, lt) => { walk(c, t, lt + 3); c.fillStyle = rgba('#000000', 0.35); c.fillRect(0, 0, W, H); }, { grade: 'cold', tense: 1 });
  add('keep', L0('l20') - 0.1, (c, t, lt) => walk(c, t, lt + 3, { thing: 0 }), { grade: 'cold' });
  const shutT = ww('l21', 'shut');
  add('shut', L0('l21') - 0.1, (c, t, lt) => trainSide(c, t, { doorsK: 1 - seg(t, ww('l21', 'hiss') - 0.2, shutT + 0.3) }), { grade: 'cold' });
  add('turn', L0('l22') - 0.1, (c, t, lt) => { c.save(); camera(c, 1 + lt * 0.03, 850, 600); trainSide(c, t, { doorsK: 0 }); c.restore(); }, { grade: 'cold' });
  const goT = ww('l23', 'go');
  add('go', L0('l23') - 0.1, (c, t, lt) => { c.save(); camera(c, lerp(1.3, 2.2, ss(seg(lt, 0, 3))), 850, 570); trainSide(c, t, { doorsK: 0, june: 1, juneMouth: t > goT && t < goT + 0.6 ? 'o' : 'meek' }); c.restore(); }, { grade: 'cold' });
  const pullT = L0('l24');
  add('away', L0('l24') - 0.1, (c, t, lt) => { const off = 900 * Math.pow(Math.max(0, lt - 0.2), 2); if (off < 2400) trainSide(c, t, { doorsK: 0, off }); else platform(c, t, { who: null, frame: false }); }, { grade: 'cold' });
  add('buzz', L0('l25') - 0.1, (c, t, lt) => { c.save(); c.translate(Math.sin(t * 70) * 4 * (Math.floor(t * 1.4) % 2), 0); dawnPhone(c, t); c.restore(); }, { grade: 'dawn' });
  add('missed', L0('l26') - 0.1, (c, t, lt) => { c.save(); camera(c, 1.15, 540, 980); dawnPhone(c, t, { missed: seg(lt, 0.3, 1.6) }); c.restore(); }, { grade: 'dawn' });
  const ear = { hold: 'phone', armL: [EAR_A, EAR_B], phoneRot: 0.15 };
  const dawnBg = (c, t) => SO.blurred(c, 12, o => { o.setTransform(1, 0, 0, 1, 0, 0); platform(o, t, { who: null, frame: false, lamp: 0.3, dawn: 1 }); });
  add('callback', L0('l27') - 0.1, (c, t, lt) => { dawnBg(c, t); youCU(c, t, Object.assign({ legs: 'stand', blink: blinkAt(t, 9), brows: 0.6, look: [0, 0.1], mouth: 'none' }, ear), 250); }, { grade: 'dawn' });
  add('gotoff', L0('l28') - 0.1, (c, t, lt) => { dawnBg(c, t); youCU(c, t, Object.assign({ legs: 'stand', blink: blinkAt(t, 9), brows: 0.3, look: [0, 0.2], mouth: talk(t, quoteOn('l28', t), 'meek') }, ear), 260 + lt * 4); }, { grade: 'dawn' });
  add('pocket', L0('l29') - 0.1, (c, t, lt) => { dawnBg(c, t); sheetInHands(c, t, ss(seg(lt, 0.2, 1.4))); }, { grade: 'dawn' });
  const dropT = ww('l30', 'drop');
  add('trash', L0('l30') - 0.1, (c, t, lt) => {
    if (t < dropT - 0.2) { dawnBg(c, t); sheetInHands(c, t, 1); return; }
    // a station trash can at dawn; the folded sheet falls in
    dawnBg(c, t);
    c.save(); c.translate(540, 1500); SO.blob(c, -170, -420, 340, 440, 40, '#3A4152', 1); SO.blob(c, -190, -440, 380, 60, 24, '#2A303E', 1); c.fillStyle = '#0B0D14'; c.beginPath(); c.ellipse(0, -410, 150, 22, 0, 0, Math.PI * 2); c.fill(); c.restore();
    const k = ss(seg(t, dropT - 0.1, dropT + 0.7));
    if (k < 1) { c.save(); c.translate(540 + Math.sin(k * 5) * 30, lerp(500, 1090, k)); c.rotate(k * 2.4); c.fillStyle = '#F1EEE4'; c.fillRect(-70, -50, 140, 100); c.fillStyle = 'rgba(90,120,180,0.4)'; for (let r = 0; r < 4; r++) c.fillRect(-60, -30 + r * 20, 120, 3); c.restore(); }
  }, { grade: 'dawn' });
  const sunrise = (c, t, lt, k) => {   // the station from the far end of the platform: the sun coming up behind the stairs, you walking away
    let g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#F2B48E'); g.addColorStop(0.5, '#E89A84'); g.addColorStop(1, '#4A4A66'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    SO.lightPool(c, 540, 980, 520, '#FFE6B0', 0.9); c.beginPath(); c.arc(540, 1000, 110, 0, Math.PI * 2); c.fillStyle = '#FFE9C4'; c.fill();
    c.fillStyle = '#3A3E58'; c.fillRect(0, 1040, W, 900);                                              // the platform
    c.fillStyle = '#C9A93A'; for (const s_ of [-1, 1]) { c.beginPath(); c.moveTo(540 + s_ * 40, 1040); c.lineTo(540 + s_ * 700, H); c.lineTo(540 + s_ * 680, H); c.lineTo(540 + s_ * 34, 1040); c.fill(); }
    c.fillStyle = '#2A2E44'; for (let i = 0; i < 6; i++) { const y = 1040 - i * 30; c.fillRect(380 + i * 12, y - 30, 320 - i * 24, 30); }   // the stairs up to the street
    if (k != null) { const d = ss(k); SO.person(c, SO.YOU, { x: 540, y: lerp(1900, 1250, d), s: lerp(1.4, 0.45, d), back: true, legs: 'stand', walk: t * 6.2, armL: [0.18 + Math.sin(t * 6.2) * 0.22, 0.2], armR: [0.18 - Math.sin(t * 6.2) * 0.22, 0.2], t }); SO.FACES.length = 0; }
  };
  add('home', L0('l31') - 0.1, (c, t, lt) => sunrise(c, t, lt, seg(lt, 0, (L1('l31') - L0('l31')) + 2.2)), { grade: 'none' });
  add('never', L0('l32') - 0.1, (c, t, lt) => { sunrise(c, t, lt, null); c.fillStyle = rgba('#000000', ss(seg(t, L1('l32') + 1.0, L1('l32') + 2.4))); c.fillRect(0, 0, W, H); }, { grade: 'none' });
  const endT2 = L1('l32') + 2.8;
  return { S, endT: endT2, nailT, chimeT, freeT, stepT, shutT, goT, pullT, dropT };
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
  ev.push({ t: K.nailT, type: 'thud', g: 0.4 }, { t: L0('l04') + 0.1, type: 'rustle', g: 0.5 }, { t: ww('l09', 'one'), type: 'sting' });
  ev.push({ t: K.chimeT, type: 'chime' }, { t: K.freeT, type: 'thud' }, { t: K.stepT, type: 'whoosh' });
  ev.push({ t: ww('l16', 'ears'), type: 'sting' });
  for (const [w_, p_] of [['voice', -0.6], ["June's", 0.6], ['yours', 0]]) ev.push({ t: ww('l19', w_) - 0.3, type: 'breath', pan: p_, g: 0.8 });
  ev.push({ t: K.shutT - 0.3, type: 'whoosh' }, { t: K.pullT + 0.2, type: 'brakes' });
  ev.push({ t: L0('l25') - 0.05, t1: L0('l25') + 2.4, type: 'buzz' });
  ev.push({ t: K.dropT + 0.6, type: 'thud', g: 0.3 });
  ev.push({ t: L0('l00') - 0.2, t1: L1('l03'), type: 'tense' }, { t: L0('l15') - 0.2, t1: L1('l20'), type: 'tense' });
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
      if (g === 'dawn') { SO.nightGrade(ctx, { tint: '#E8C2B8' }); SO.lightPool(ctx, 540, 200, 1100, '#FFD9B8', 0.3); }
      if (g === 'memory') { SO.nightGrade(ctx, { tint: '#B0A08A' }); SO.lightPool(ctx, 540, 600, 1100, '#FFE2B0', 0.2); }
      if (g === 'cold') { SO.nightGrade(ctx, { tint: '#5866B0' }); SO.lightPool(ctx, 540, 200, 900, '#C8D8FF', 0.2); }
      if (g === 'paper') { SO.nightGrade(ctx, { tint: '#8C98D0' }); SO.lightPool(ctx, 540, 300, 1100, '#E6EEFF', 0.25); }
      if (g !== 'none') { SO.faceGlow(ctx); glow(ctx, 0.5); SO.painterly(ctx); SO.grain(ctx, 0.05); vignette(ctx, 0.42); }
      else SO.grain(ctx, 0.04);
      if (sh.title) titleTop(ctx, TITLE, 'FINAL PART', clamp(1 - seg(t, L1('l00') - 0.3, L1('l00') + 0.2)));
      if (sh.chip) timeChip(ctx, t, Object.assign({ y: 360, k: 1 }, sh.chip));
      const cp = NOSUB ? null : capAt(t); if (cp) caption(ctx, cp.words, cp.k);
    }
  };
  window.TEXTS = t => { window.render(t); return texts; };
}
