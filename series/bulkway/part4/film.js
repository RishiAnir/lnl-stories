// BULKWAY — Part 4 "Morning" (the finale). The truck crew, the roof hatch, the tow chain, Marcus, dawn. Painted backgrounds (assets/bg) for the outside shots. The narration track
// (voices/narration.wav: Chatterbox lines laid end to end by voice.py) sets the clock; shots cut on its word times.
// Same caption + timing machinery as Part 2. New: title at the top of the first shot, the time chip, Ray with his hood down.
import { P, W, H, FULL, GEN, DARK, clamp, lerp, seg, ss, eo, camera, blinkAt, breathe, vignette, rgba, mix, fillRR, ell, poly, capsule, lit, darkness, glow } from '../assets/kit.js';
import { person, YOU, DANA, MARCUS, RAY, stranger, headCenter, LAMP } from '../assets/chars.js';
import { aisle, aisleProj, loadingDock, office, desk, notebook, rackingUp, wallClock, snow } from '../assets/sets.js';
import { camGrid, endCard, caption, TEXT, titleTop, timeChip } from '../assets/ui.js';

const LEAD = 0.5;
TEXT.end = ['THE END', 'Snowed In at Bulkway', 'Thanks for watching.'];
const TITLE = 'Snowed In at Bulkway', PART = 'Final Part';
const BG = {};   // painted backgrounds, loaded in init
const bg = (c, k, { cam = 1, fx = 540, fy = 960, dx = 0 } = {}) => { const im = BG[k]; c.save(); c.translate(fx + dx, fy); c.scale(cam, cam); c.translate(-fx, -fy); if (im) c.drawImage(im, 0, (H - W * im.height / im.width) / 2, W, W * im.height / im.width); else { c.fillStyle = '#1A2030'; c.fillRect(0, 0, W, H); } c.restore(); };

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
// is this line being spoken inside its quotes right now (for talking mouths)?
const quoteOn = (id, t) => { const sp = LINES[id].spoken, a = sp.indexOf('"'); if (a < 0) return t >= L0(id) && t <= L1(id); const before = sp.slice(0, a).split(/\s+/).filter(Boolean).length; return t >= w(id, before) - 0.05 && t <= L1(id); };
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

// ---------- Part 4 pieces ----------
// a man of the truck crew: a dark winter shape, a headlamp burning where his face should be
function crewman(c, x, y, s, t, { lamp = 1, dig = 0, ph = 0 } = {}) {
  c.save(); c.translate(x, y); c.scale(s, s);
  const sw = dig ? Math.sin(t * 4 + ph) * 0.5 : 0;
  ell(c, 0, 6, 90, 18, 'rgba(0,0,0,0.35)');
  capsule(c, -26, -300, -30, 0, 30, '#12151C'); capsule(c, 26, -300, 30, 0, 30, '#0E1117');                 // legs
  fillRR(c, -70, -560, 140, 290, 40, '#171B24');                                                            // parka
  capsule(c, -60, -520, -100 + sw * 60, -330 - sw * 80, 24, '#141821'); capsule(c, 60, -520, 100 + sw * 40, -340 + sw * 60, 24, '#141821');
  if (dig) { c.save(); c.translate(100 + sw * 40, -340 + sw * 60); c.rotate(0.6 + sw); fillRR(c, -6, -10, 12, 220, 4, '#3A3226'); fillRR(c, -40, 200, 80, 70, 10, '#5A606B'); c.restore(); }
  ell(c, 0, -620, 62, 68, '#1C2029'); fillRR(c, -66, -700, 132, 60, 26, '#0F1218');                           // head + knit cap
  if (lamp) { ell(c, 0, -640, 16, 12, '#FFF4D0'); c.globalCompositeOperation = 'screen'; const g = c.createRadialGradient(0, -640, 4, 0, -640, 160); g.addColorStop(0, 'rgba(255,240,200,0.8)'); g.addColorStop(1, 'rgba(255,240,200,0)'); c.fillStyle = g; c.fillRect(-160, -800, 320, 320); }
  c.restore();
}
// the keypad by the bay door: amber screen, the light under it (red, then green)
function keypad(c, t, { green = 0, beeps = [] } = {}) {
  c.fillStyle = lit('#555B66', DARK); c.fillRect(0, 0, W, H);
  for (let r = 0; r < 34; r++) for (let k = 0; k < 6; k++) fillRR(c, k * 200 + (r % 2) * 100 - 100 + 4, r * 60 + 4, 192, 52, 4, lit((r * 7 + k) % 3 ? '#5D636F' : '#626875', DARK));
  fillRR(c, 300, 460, 480, 820, 40, '#1E2229'); fillRR(c, 330, 490, 420, 760, 30, '#2A2F38');
  fillRR(c, 380, 540, 320, 120, 14, green ? '#1E3A24' : '#2A1E14');
  c.font = '700 64px "Plex Mono"'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = green ? '#7CF0A0' : '#F2A64A';
  const n = beeps.filter(b => t > b).length; c.fillText(green ? 'OPEN' : '* '.repeat(Math.min(4, n)).trim() || '- - - -', 540, 600);
  for (let r = 0; r < 4; r++) for (let k = 0; k < 3; k++) { const lit_ = beeps.some(b => t > b && t < b + 0.15 && (r * 3 + k) % 4 === beeps.indexOf(b) % 4); fillRR(c, 390 + k * 105, 710 + r * 120, 90, 96, 14, lit_ ? '#8A93A6' : '#4A5160'); c.fillStyle = '#D9DEE8'; c.font = '600 40px Inter'; c.fillText(['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'][r * 3 + k], 435 + k * 105, 760 + r * 120); }
  const col = green ? '#3BE07A' : '#E0473F'; ell(c, 540, 1210, 22, 22, col); c.globalCompositeOperation = 'screen'; const g = c.createRadialGradient(540, 1210, 4, 540, 1210, 160); g.addColorStop(0, rgba(col, 0.8)); g.addColorStop(1, rgba(col, 0)); c.fillStyle = g; c.fillRect(380, 1050, 320, 320); c.globalCompositeOperation = 'source-over';
}
// the bay door's bottom seam from inside: a gap, headlight glare and snow pouring under; pallets of water against it
function seam(c, t, { gap = 0, pallets = 0, slide = 0, hand = 0, cam = 2.2 } = {}) {
  c.save(); camera(c, cam, 760, 1380);
  loadingDock(c, t, DARK);
  if (gap > 0) {
    fillRR(c, 380, 1440 - gap, 760, gap, 0, '#E8EEF8');
    for (let i = 0; i < 26; i++) ell(c, 400 + (i * 61 + t * 40) % 740, 1440 - gap * (0.2 + (i * 0.37) % 0.8), 4, 3, rgba('#FFFFFF', 0.9));
    for (let i = 18; i < 22; i++) { const y = 380 + i * (1060 / 22) - gap; fillRR(c, 380, y, 760, 1060 / 22 - 6, 3, lit(i % 2 ? '#7D8594' : '#747C8B', DARK)); }
    fillRR(c, 380, 1440 - gap - 8, 760, 8, 2, lit('#2E3440', DARK));
    for (let i = 0; i < 18; i++) ell(c, 420 + i * 40, 1446 + (i % 3) * 6, 18 + (i % 4) * 6, 6, rgba('#E9EEF3', 0.6));
  }
  if (hand > 0) { const y = 1440 - gap + 10; capsule(c, 700, y - 30, lerp(700, 820, hand), y + 60 * hand, 30, '#1A1D24'); ell(c, lerp(700, 830, hand), y + 70 * hand, 40, 30, '#22262E'); }
  if (pallets > 0) for (let i = 0; i < 3; i++) {   // pallets of bottled water shoved against the door
    const x = 400 + i * 250 + slide * (i - 1) * 40, y = 1480 + slide * 30, k = clamp(pallets * 3 - i);
    if (k <= 0) continue; c.save(); c.globalAlpha = k; fillRR(c, x, y - 260, 230, 240, 10, lit('#5A8EC9', DARK)); for (let r = 0; r < 4; r++) for (let q = 0; q < 4; q++) ell(c, x + 30 + q * 56, y - 230 + r * 58, 22, 24, lit('#9CC7EE', DARK)); fillRR(c, x - 6, y - 24, 242, 26, 4, lit(P.pallet, DARK)); c.restore();
  }
  c.restore();
  if (gap > 0) { c.save(); c.globalCompositeOperation = 'screen'; const g = c.createRadialGradient(760, 1700, 40, 760, 1700, 1100); g.addColorStop(0, `rgba(255,245,215,${Math.min(0.7, gap / 160)})`); g.addColorStop(1, 'rgba(255,245,215,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H); c.restore(); }
}

// ---------- outside, drawn flat in the series style (Parts 1-3): no painted images ----------
// sky bands: night (deep slate) or dawn (peach low, slate-blue high)
function sky(c, dawn) {
  const bands = dawn ? ['#5D6C93', '#7C7FA0', '#A98A9C', '#D9A08C', '#F2BE93'] : ['#121823', '#161D2A', '#1A2231', '#1E2738', '#222C3F'];
  bands.forEach((b, i) => { c.fillStyle = b; c.fillRect(0, i * 180, W, 186); });
}
const SNOW = '#E6ECF2', SNOWS = '#B9C6D4', SNOWD = '#7F8EA3';
function drift(c, x, y, w, h, L, dawn) { ell(c, x, y, w, h, lit(dawn ? '#F4EEEA' : SNOW, L)); ell(c, x + w * 0.25, y + h * 0.25, w * 0.75, h * 0.7, lit(dawn ? '#D9CFD6' : SNOWS, L)); }
// the yellow county plow, facing us: blade with stripes, cab, headlights. dir 1 facing camera
function plowTruck(c, x, y, s, t, L, { lights = 1 } = {}) {
  c.save(); c.translate(x, y); c.scale(s, s);
  ell(c, 0, 10, 330, 34, 'rgba(10,14,22,0.35)');
  fillRR(c, -230, -470, 460, 300, 24, lit('#D9A92E', L));                 // box / body
  fillRR(c, -170, -640, 340, 200, 26, lit('#E3B83A', L));                 // cab
  fillRR(c, -140, -610, 280, 110, 14, lit('#26303F', L)); fillRR(c, -140, -610, 120, 110, 14, lit('#2F3A4B', L));   // windshield
  fillRR(c, -60, -668, 120, 26, 10, lit('#E0473F', L)); if (lights && Math.floor(t * 3) % 2) ell(c, 0, -656, 70, 26, 'rgba(255,170,60,0.55)');   // amber beacon
  for (const sx of [-1, 1]) { fillRR(c, sx * 210 - 40, -250, 80, 250, 20, lit('#1A1D23', L)); }   // wheels
  for (const sx of [-1, 1]) { ell(c, sx * 160, -300, 34, 26, lights ? '#FFF2C8' : lit('#9AA3B0', L)); }
  c.save(); c.rotate(-0.04);                                              // the blade, angled
  fillRR(c, -330, -200, 660, 150, 18, lit('#E8B43A', L)); for (let i = 0; i < 7; i++) poly(c, [[-300 + i * 95, -200], [-260 + i * 95, -200], [-300 + i * 95 + 40, -50], [-340 + i * 95 + 40, -50]], lit('#2A2F38', L));
  fillRR(c, -330, -64, 660, 16, 6, lit('#9AA3B0', L)); c.restore();
  if (lights) { c.globalCompositeOperation = 'screen'; for (const sx of [-1, 1]) { const g = c.createRadialGradient(sx * 160, -300, 6, sx * 160, -300, 260); g.addColorStop(0, 'rgba(255,242,200,0.75)'); g.addColorStop(1, 'rgba(255,242,200,0)'); c.fillStyle = g; c.fillRect(sx * 160 - 260, -560, 520, 520); } c.globalCompositeOperation = 'source-over'; }
  c.restore();
}
// a police cruiser, three-quarter front: white doors, dark hood, a light bar flashing red/blue
function cruiser(c, x, y, s, t, L, ph = 0) {
  c.save(); c.translate(x, y); c.scale(s, s);
  ell(c, 0, 8, 250, 26, 'rgba(10,14,22,0.35)');
  fillRR(c, -230, -170, 460, 130, 30, lit('#1E2430', L)); fillRR(c, -230, -150, 220, 100, 26, lit('#F3F5F8', L));   // body, white door
  fillRR(c, -140, -260, 280, 110, 30, lit('#1E2430', L)); fillRR(c, -110, -246, 220, 80, 16, lit('#3A4A62', L));  // cabin + glass
  for (const sx of [-1, 1]) fillRR(c, sx * 160 - 40, -70, 80, 76, 20, lit('#111318', L));
  const on = (Math.floor(t * 3 + ph) % 2) === 0;
  fillRR(c, -90, -290, 90, 30, 10, on ? '#FF4B4B' : lit('#7A2A2A', L)); fillRR(c, 0, -290, 90, 30, 10, on ? lit('#2A3A7A', L) : '#4B7BFF');
  c.globalCompositeOperation = 'screen'; const g = c.createRadialGradient(on ? -45 : 45, -275, 4, on ? -45 : 45, -275, 280); g.addColorStop(0, on ? 'rgba(255,70,70,0.7)' : 'rgba(70,120,255,0.7)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(-330, -560, 660, 560);
  c.restore();
}
// police light washing over a whole scene (red/blue, alternating)
function policeWash(c, t, k = 1) { const on = Math.floor(t * 3) % 2; c.save(); c.globalCompositeOperation = 'screen'; c.fillStyle = on ? `rgba(255,60,60,${0.12 * k})` : `rgba(60,110,255,${0.12 * k})`; c.fillRect(0, 0, W, H); c.restore(); }
// the loading dock from outside: block wall, the roll-up bay door under two cage lamps, drifts, tire tracks
function dockExt(c, t, { dawn = 0, open = 0, chainK = 0, plow = 1, lights = 1 } = {}) {
  const L = dawn ? FULL : GEN;
  sky(c, dawn);
  c.fillStyle = lit('#4F5664', L); c.fillRect(0, 300, W, 1260);
  for (let r = 0; r < 21; r++) for (let k = 0; k < 6; k++) fillRR(c, k * 200 + (r % 2) * 100 - 100 + 4, 304 + r * 60, 192, 52, 4, lit(((r * 7 + k) % 3) ? '#545B69' : '#5A6170', L));
  fillRR(c, -10, 280, W + 20, 40, 6, lit('#3A404C', L)); for (let i = 0; i < 12; i++) ell(c, i * 100, 282, 70, 18, lit(SNOW, L));   // parapet with snow on it
  const dx = 200, dy = 560, dw = 680, dh = 960;
  fillRR(c, dx - 26, dy - 50, dw + 52, dh + 50, 6, lit('#2E3440', L));
  const up = open * (dh - 40);
  if (open > 0) { fillRR(c, dx, dy + dh - up, dw, up, 0, dawn ? '#3C3A3E' : '#0C0E12'); }
  for (let i = 0; i < 20; i++) { const y = dy + i * (dh / 20) - up; if (y + dh / 20 < dy) continue; fillRR(c, dx, Math.max(dy, y), dw, dh / 20 - 6, 3, lit(i % 2 ? '#7D8594' : '#747C8B', L)); }
  for (const lx of [150, 930]) { ell(c, lx, 500, 30, 20, lit('#2E3440', L)); ell(c, lx, 512, 20, 13, lights ? P.warm : '#9AA3B0'); }
  if (lights) { c.save(); c.globalCompositeOperation = 'screen'; for (const lx of [150, 930]) { const g = c.createRadialGradient(lx, 520, 10, lx, 520, 520); g.addColorStop(0, 'rgba(255,217,154,0.35)'); g.addColorStop(1, 'rgba(255,217,154,0)'); c.fillStyle = g; c.fillRect(lx - 520, 0, 1040, 1100); } c.restore(); }
  for (const hx of [dx + 90, dx + dw - 90]) fillRR(c, hx - 22, dy + dh - 90, 44, 70, 10, lit('#2A2F38', L));   // door handles
  if (chainK > 0) { c.save(); c.globalAlpha = clamp(chainK); c.strokeStyle = lit('#9AA0AA', L); c.lineWidth = 12; c.setLineDash([18, 8]); c.beginPath(); c.moveTo(dx + 90, dy + dh - 60); c.quadraticCurveTo(540, dy + dh + 20, dx + dw - 90, dy + dh - 60); c.stroke(); c.setLineDash([]); fillRR(c, 512, dy + dh - 10, 56, 64, 12, lit('#C9A23A', L)); c.restore(); }
  // ground: snow with two tire tracks, drifts against the wall
  c.fillStyle = lit(dawn ? '#EEE7E4' : SNOW, L); c.fillRect(0, 1500, W, H - 1500);
  for (const tx of [330, 750]) poly(c, [[tx - 30, 1500], [tx + 30, 1500], [tx + 150, H], [tx - 90, H]], lit(dawn ? '#CFC4CB' : SNOWS, L));
  drift(c, -40, 1500, 260, 120, L, dawn); drift(c, 1120, 1490, 300, 150, L, dawn); drift(c, 100, 1900, 380, 160, L, dawn);
  if (plow) plowTruck(c, 540, 1660, 0.62, t, L, { lights: !dawn });
}
// the store front: the BULKWAY sign (as inside, Part 1), the glass sliding doors (open 0..1), drifts, the lot
function frontExt(c, t, { open = 0, bank = 1, glowIn = 0 } = {}) {
  const L = FULL;
  sky(c, 1);
  ell(c, 540, 1060, 900, 160, 'rgba(255,214,170,0.35)');                                     // the sun just under the roofline
  c.fillStyle = lit('#9A9488', L); c.fillRect(60, 420, 960, 900); c.fillStyle = lit('#857F74', L); c.fillRect(60, 420, 960, 70);
  for (let i = 0; i < 14; i++) ell(c, 70 + i * 70, 420, 56, 16, lit(SNOW, L));
  fillRR(c, 150, 520, 780, 170, 18, lit('#2A3140', L));
  c.save(); c.font = '400 92px "Archivo Black"'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = P.warm; c.fillText('BULKWAY', 540, 585);
  c.font = '700 34px Inter'; c.fillStyle = P.off; c.fillText('WAREHOUSE  CLUB', 540, 655); c.restore();
  // the entrance: frame, store light behind, two glass panels sliding apart
  const ex = 330, ey = 820, ew = 420, eh = 500, o = ss(open);
  fillRR(c, ex - 24, ey - 24, ew + 48, eh + 24, 8, lit('#3A404C', L));
  c.fillStyle = mix('#3B4556', P.warm, clamp(glowIn)); c.fillRect(ex, ey, ew, eh);
  if (glowIn > 0) { c.save(); c.globalAlpha = clamp(glowIn); for (let i = 0; i < 3; i++) fillRR(c, ex + 40 + i * 130, ey + 260, 90, 120, 8, '#D8B57E'); fillRR(c, ex, ey + eh - 40, ew, 40, 0, '#E9D2A8'); c.restore(); }   // registers inside, the floor
  for (const sx of [-1, 1]) {
    const pw = ew / 2, px = sx < 0 ? ex - pw * o : ex + pw + pw * o;
    c.save(); c.beginPath(); c.rect(ex - 10, ey, ew + 20, eh); c.clip();
    fillRR(c, px, ey, pw, eh, 0, lit('#2E3440', L)); fillRR(c, px + 12, ey + 12, pw - 24, eh - 24, 4, glowIn ? rgba('#FFE9C4', 0.35) : rgba('#8FA6C4', 0.55));
    c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(px + 30, ey + 30, 18, eh - 60); c.restore();
  }
  for (const wx of [110, 790]) { fillRR(c, wx, 860, 180, 300, 6, lit('#3A404C', L)); fillRR(c, wx + 10, 870, 160, 280, 4, lit('#6F7F98', L)); }
  // the drift that sealed the doors, plowed back to a bank (bank 1 = still against the glass)
  c.fillStyle = '#EEE7E4'; c.fillRect(0, 1300, W, H - 1300);
  if (bank > 0) drift(c, 540, 1330, 560 * bank, 150 * bank, L, 1);
  drift(c, -60, 1340, 300, 140, L, 1); drift(c, 1140, 1340, 300, 150, L, 1);
  for (const tx of [260, 820]) poly(c, [[tx - 20, 1400], [tx + 20, 1400], [tx + 160 * Math.sign(tx - 540), H], [tx - 60 + 120 * (tx > 540), H]], '#D4CACF');
  if (glowIn > 0) { c.save(); c.globalCompositeOperation = 'screen'; const g = c.createRadialGradient(540, 1100, 20, 540, 1100, 800 * glowIn); g.addColorStop(0, `rgba(255,225,170,${0.5 * glowIn})`); g.addColorStop(1, 'rgba(255,225,170,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H); c.restore(); }
}
// the roof at night: flat, snowed over, HVAC boxes, the hatch (pop 0..1 light pouring out)
function roofExt(c, t, { pop = 0 } = {}) {
  const L = GEN; sky(c, 0);
  for (let i = 0; i < 40; i++) ell(c, (i * 173) % W, (i * 97) % 420, 2, 2, 'rgba(230,236,245,0.5)');
  poly(c, [[-200, 900], [1280, 900], [1600, H], [-520, H]], lit(SNOW, L));
  poly(c, [[-200, 900], [1280, 900], [1290, 930], [-210, 930]], lit(SNOWS, L));
  for (const [x, y, s_] of [[140, 980, 0.6], [880, 1000, 0.7], [260, 1300, 1]]) { fillRR(c, x - 90 * s_, y - 120 * s_, 180 * s_, 120 * s_, 8, lit('#6F7887', L)); fillRR(c, x - 90 * s_, y - 130 * s_, 180 * s_, 20 * s_, 8, lit(SNOW, L)); for (let k = 0; k < 4; k++) fillRR(c, x - 70 * s_ + k * 38 * s_, y - 90 * s_, 22 * s_, 70 * s_, 3, lit('#555E6C', L)); }
  // the hatch
  fillRR(c, 470, 1180, 200, 130, 8, lit('#3A404C', L));
  if (pop > 0) { fillRR(c, 482, 1190, 176, 110, 4, '#FFDDA0'); c.save(); c.translate(470, 1180); c.rotate(-1.2 * ss(pop)); fillRR(c, 0, -10, 200, 24, 6, lit('#5A606B', L)); c.restore(); c.save(); c.globalCompositeOperation = 'screen'; const g = c.createRadialGradient(570, 1240, 10, 570, 1100, 520); g.addColorStop(0, `rgba(255,220,160,${0.6 * pop})`); g.addColorStop(1, 'rgba(255,220,160,0)'); c.fillStyle = g; c.fillRect(0, 500, W, 1400); c.restore(); }
  else fillRR(c, 482, 1170, 176, 24, 6, lit('#5A606B', L));
}
const OFFICER = {
  id: 'officer', skin: P.skinD, skinS: P.skinDS, shirt: '#2A3550', shirtS: '#202A40', legs: '#222A3A', legsS: '#1A2030', shoe: '#14171D', tall: 1.08, wide: 1.08,
  drawHair(c, f, L) { fillRR(c, -f.rx * 1.02, f.cy - f.ry * 1.12, f.rx * 2.04, f.ry * 0.62, 16, lit('#1E2638', L)); ell(c, 0, f.cy - f.ry * 0.5, f.rx * 1.08, f.ry * 0.14, lit('#141A26', L)); ell(c, 0, f.cy - f.ry * 0.82, 9, 10, '#E2B84A'); },
  drawTop(c, b, L) { ell(c, -b.tw * 0.45, b.top + 60, 10, 12, '#E2B84A'); },
};
function shots() {
  const S = []; const add = (name, t0, draw, o = {}) => S.push(Object.assign({ name, t0, draw }, o));
  const cu = (c, Sp, extra = {}, r = 200, hy = 760) => person(c, Sp, framed(Sp, 540, hy, r, Object.assign({ blink: blinkAt(t_, 5), breathe: breathe(t_, 1), t: t_ }, extra)), GEN);
  let t_ = 0;
  const dark = (c, lt, k = 0.62) => darkness(c, [{ x: 560, y: 1750, ang: -Math.PI / 2 + 0.05, len: 1500, spread: 0.32 }], k);
  const outside = (c, t, k = 'night', o = {}) => { c.drawImage(blurred('ext_' + k + (o.blur || 12), o2 => { o2.save(); camera(o2, 1.15, 540, 1100); dockExt(o2, 0, { dawn: k === 'dawn', chainK: 1, plow: 1 }); o2.restore(); }, o.blur || 12), 0, 0); };
  const flakes = (c, t, a = 0.9) => snow(c, t, { n: 120, alpha: a });
  // 0 · hook: the seam, a crack of headlight under the door
  add('hook', 0, (c, t, lt) => seam(c, t, { gap: 22 + Math.sin(t * 3) * 2, cam: 1.6 }), { title: 1, chip: { time: '2:04', ampm: 'AM', line: 'FINAL PART · NIGHT 2' } });
  const upT = ww('l01', 'inch');
  add('screams', L0('l01') - 0.1, (c, t, lt) => { const g = lerp(24, 70, ss(seg(t, ww('l01', 'screams') - 0.2, upT + 0.2))); c.save(); c.translate(Math.sin(t * 80) * 5 * (g < 69 ? 1 : 0), 0); seam(c, t, { gap: g, cam: 2.0 }); c.restore(); });
  add('who', L0('l02') - 0.1, (c, t, lt) => { t_ = t; c.fillStyle = '#07090D'; c.fillRect(0, 0, W, H); cu(c, DANA, { face: 0.2, look: [0.6, 0.3], brows: -0.6, mouth: talk(t, t > L0('l02') && t < L1('l02')), glasses: 'cord' }, 200); darkness(c, [{ x: 760, y: 1700, ang: -2.0, len: 1500, spread: 0.3 }], 0.62, [{ x: 540, y: 760, r: 420, k: 0.5 }]); });
  const rayFloor = (c, t, extra = {}, r = 175, hx = 540, hy = 780) => person(c, RAY, framed(RAY, hx, hy, r, Object.assign({ hoodDown: true, legs: 'sit', ...BOUND, blink: blinkAt(t, 4), breathe: breathe(t, 1), t }, extra)), GEN);
  add('lot', L0('l03') - 0.1, (c, t, lt) => { c.fillStyle = '#07090D'; c.fillRect(0, 0, W, H); c.save(); camera(c, 1 + lt * 0.015, 540, 780); rayFloor(c, t, { face: -0.1, look: [0.2, 0.2], brows: 0.6, mouth: talk(t, quoteOn('l03', t)) }, 200, 540, 780); c.restore(); darkness(c, [{ x: 860, y: 1700, ang: -2.0, len: 1500, spread: 0.3 }], 0.62); });
  add('truck', L0('l04') - 0.1, (c, t, lt) => { c.save(); camera(c, 1.1 + lt * 0.02, 540, 1300); dockExt(c, t, { plow: 1 }); c.restore(); for (const [x, y, s_, ph] of [[230, 1760, 0.7, 0], [850, 1800, 0.75, 1.7], [700, 1600, 0.5, 3.1]]) crewman(c, x, y, s_, t, { dig: 1, ph }); flakes(c, t); }, { raw2: 1 });
  add('barricade', L0('l05') - 0.1, (c, t, lt) => { t_ = t; c.fillStyle = '#07090D'; c.fillRect(0, 0, W, H); cu(c, DANA, { face: -0.1, look: [-0.4, 0.1], brows: -0.8, mouth: talk(t, quoteOn('l05', t)), glasses: 'cord', hold: 'flash', armL: [0.7, 0.9], flashRot: -1.9 }, 205); darkness(c, [{ x: 540, y: 1750, ang: -Math.PI / 2, len: 1500, spread: 0.32 }], 0.6, [{ x: 540, y: 760, r: 460, k: 0.5 }]); });
  add('pallets', L0('l06') - 0.1, (c, t, lt) => {
    c.save(); camera(c, 1.05, 540, 1000); loadingDock(c, t, DARK);
    person(c, MARCUS, { x: 280, y: 1860, s: 1.5, face: 0.4, look: [0.6, 0], brows: -0.3, mouth: 'tight', armL: [1.2, 0.6], armR: [1.2, 0.6], t }, GEN);
    person(c, YOU, { x: 780, y: 1880, s: 1.45, face: -0.4, look: [-0.6, 0.4], brows: 0.4, mouth: 'flat', armL: [0.9, 0.9], armR: [0.9, 0.9], rot: -0.08, t }, GEN);
    c.restore();
    const k = ss(seg(t, ww('l06', 'drag') - 0.2, L1('l06') + 0.6)); for (let i = 0; i < 3; i++) { const x = 330 + i * 160, y = lerp(2100, 1460, clamp(k * 3 - i)); if (k * 3 - i > 0) { fillRR(c, x, y - 180, 150, 170, 8, lit('#5A8EC9', DARK)); fillRR(c, x - 4, y - 14, 158, 18, 3, lit(P.pallet, DARK)); } }
    darkness(c, [{ x: 860, y: 1700, ang: -2.0, len: 1800, spread: 0.34 }], 0.62, [{ x: 540, y: 1300, r: 600, k: 0.5 }]);
  });
  const beeps = () => [ww('l07', 'beeps'), ww('l07', 'once'), ww('l07', 'twice')];
  add('keypad', L0('l07') - 0.1, (c, t, lt) => { c.save(); camera(c, 1 + lt * 0.03, 540, 860); keypad(c, t, { beeps: beeps() }); c.restore(); darkness(c, [], 0.45, [{ x: 540, y: 860, r: 700, k: 0.7 }]); });
  const greenT = ww('l08', 'green');
  add('green', L0('l08') - 0.1, (c, t, lt) => { c.save(); camera(c, 1.25 + lt * 0.03, 540, 700); keypad(c, t, { beeps: beeps(), green: t > greenT - 0.05 }); c.restore(); darkness(c, [], 0.45, [{ x: 540, y: 860, r: 700, k: 0.7 }]); }, { sting: 1 });
  const tornT = ww('l09', 'torn');
  add('torn', L0('l09') - 0.1, (c, t, lt) => {
    c.save(); camera(c, 1 + lt * 0.02, 540, 900); notebook(c, t, GEN, { focus: 0.35, thumb: 0 });
    if (t > tornT - 0.3) { c.fillStyle = '#0B0E13'; c.fillRect(150, 300, 900, 1500); c.fillStyle = '#E9E4D6'; c.beginPath(); c.moveTo(130, 300); for (let y = 300; y <= 1800; y += 40) c.lineTo(150 + (y / 40 % 2) * 26, y); c.lineTo(110, 1800); c.closePath(); c.fill(); }   // only a ragged stub left by the spiral
    c.restore(); darkness(c, [], 0.55, [{ x: 540, y: 900, r: 700, k: 0.8 }]);
  }, { sting: 1 });
  add('swear', L0('l10') - 0.1, (c, t, lt) => { c.fillStyle = '#07090D'; c.fillRect(0, 0, W, H); c.save(); camera(c, 1 + lt * 0.03, 540, 760); rayFloor(c, t, { face: 0, look: [0, 0], brows: 0.9, mouth: talk(t, quoteOn('l10', t), 'tight') }, 210, 540, 760); c.restore(); darkness(c, [{ x: 560, y: 1700, ang: -Math.PI / 2, len: 1500, spread: 0.32 }], 0.6); });
  const handT = ww('l11', 'gloved');
  add('slide', L0('l11') - 0.1, (c, t, lt) => { const g = lerp(70, 180, ss(seg(t, ww('l11', 'rises') - 0.2, ww('l11', 'foot') + 0.3))); c.save(); c.translate(Math.sin(t * 60) * 4, 0); seam(c, t, { gap: g, pallets: 1, slide: ss(seg(t, L0('l11'), ww('l11', 'sliding') + 0.6)), hand: ss(seg(t, handT - 0.2, handT + 0.5)), cam: 1.5 }); c.restore(); }, { tense: 1 });
  add('wayout', L0('l12') - 0.1, (c, t, lt) => { t_ = t; c.fillStyle = '#07090D'; c.fillRect(0, 0, W, H); cu(c, YOU, { face: 0.3, look: [0.6, 0.2], brows: 0.9, mouth: talk(t, quoteOn('l12', t)) }, 205); darkness(c, [{ x: 860, y: 1700, ang: -2.0, len: 1500, spread: 0.3 }], 0.6, [{ x: 540, y: 760, r: 460, k: 0.5 }]); }, { tense: 1 });
  add('hatch', L0('l13') - 0.1, (c, t, lt) => { c.fillStyle = '#07090D'; c.fillRect(0, 0, W, H); rayFloor(c, t, { face: 0, look: [0, -0.9], brows: 0.4, mouth: talk(t, quoteOn('l13', t), 'tight') }, 210, 540, 780); darkness(c, [{ x: 560, y: 1700, ang: -Math.PI / 2, len: 1500, spread: 0.32 }], 0.6); });
  const cutT = ww('l14', 'cut');
  add('cut', L0('l14') - 0.1, (c, t, lt) => {
    if (t < ww('l14', 'then') - 0.1) { t_ = t; c.fillStyle = '#07090D'; c.fillRect(0, 0, W, H); cu(c, DANA, { face: -0.2, look: [-0.5, 0.4], brows: 0.5, blink: 0, mouth: 'tight', glasses: 'cord' }, 200 + lt * 6); darkness(c, [{ x: 540, y: 1750, ang: -Math.PI / 2, len: 1500, spread: 0.32 }], 0.6); return; }
    c.fillStyle = '#0B0E14'; c.fillRect(0, 0, W, H); c.save(); camera(c, 1.1, 540, 900);
    capsule(c, -60, 1260, 560, 940, 92, lit(RAY.shirtS, GEN)); capsule(c, 1140, 1280, 520, 960, 92, lit(RAY.shirt, GEN));
    ell(c, 610, 930, 66, 56, lit(RAY.skin, GEN)); ell(c, 470, 950, 66, 56, lit(RAY.skinS, GEN));
    const snap = ss(seg(t, cutT, cutT + 0.4));
    c.save(); c.translate(540, 940 + snap * 300); c.rotate(-0.15 + snap * 1.4); c.globalAlpha = 1 - snap * 0.6; c.beginPath(); c.arc(0, 0, 100, 0.3, Math.PI * 2 - 0.3); c.lineWidth = 22; c.strokeStyle = '#111318'; c.stroke(); c.restore();
    c.save(); c.translate(lerp(820, 600, ss(seg(t, cutT - 0.5, cutT))), 900); c.rotate(-0.5); fillRR(c, -20, -12, 160, 24, 6, '#C9773A'); fillRR(c, -70, -6, 60, 12, 2, '#D8DDE4'); c.restore();   // the box cutter
    c.restore(); darkness(c, [{ x: 200, y: 200, ang: 0.95, len: 1500, spread: 0.36 }], 0.66);
  });
  // ---- up and out ----
  add('climb', L0('l15') - 0.1, (c, t, lt) => {
    c.save(); camera(c, 1 + lt * 0.02, 560, 700); rackingUp(c, t, DARK); c.restore();
    const k = seg(lt, 0, 3.5), y = lerp(2300, 900, k), reach = Math.sin(t * 5);
    person(c, RAY, { x: 560, y, s: 1.4, hoodDown: true, back: true, armL: [2.8 + reach * 0.2, 0.2], armR: [2.8 - reach * 0.2, 0.2], legs: 'stand', t }, GEN);
    darkness(c, [{ x: 760, y: 1700, ang: -1.75 + lt * 0.05, len: 1900, spread: 0.26 }], 0.66);
  }, { scene: 1 });
  add('crawl', L0('l16') - 0.1, (c, t, lt) => {   // the crawlspace above the racking: joists, ducts, a narrow way forward
    c.fillStyle = '#0A0C11'; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 9; i++) { const k = i / 9, w = lerp(1400, 120, k), y = lerp(1900, 860, k), h = lerp(70, 8, k); fillRR(c, 540 - w / 2, y - (lt * 160 % 120) * (1 - k), w, h, 4, lit('#3A3328', DARK)); fillRR(c, 540 - w / 2, lerp(-20, 820, k), w, h * 0.8, 4, lit('#2C2720', DARK)); }
    fillRR(c, 700, 200, 120, 1500, 50, lit('#6A7282', DARK)); for (let i = 0; i < 12; i++) fillRR(c, 700, 260 + i * 120, 120, 8, 3, lit('#4A5160', DARK));   // a duct
    person(c, RAY, { x: 500, y: 1500, s: 0.9, back: true, hoodDown: true, armL: [1.6, 0.4], armR: [1.4, 0.5], t }, GEN);
    darkness(c, [{ x: 540, y: 1900, ang: -Math.PI / 2, len: 1600, spread: 0.24 }], 0.7);
  }, { tense: 1 });
  add('below', L0('l17') - 0.1, (c, t, lt) => {   // through the grate: the dock floor below, headlamps crawling under the door
    c.save(); camera(c, 1.2, 760, 1250); seam(c, t, { gap: 240, cam: 1 }); c.restore();
    for (let i = 0; i < 4; i++) { const k = seg(lt, i * 0.5, i * 0.5 + 1.4); if (k > 0) crewman(c, lerp(700, 220 + i * 190, k), lerp(1500, 1700, k), 0.6, t, {}); }
    c.strokeStyle = 'rgba(10,12,16,0.85)'; c.lineWidth = 14; for (let x = -40; x < W + 80; x += 110) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); } for (let y = 0; y < H; y += 110) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  }, { tense: 1 });
  const popT = ww('l18', 'pops');
  add('roof', L0('l18') - 0.1, (c, t, lt) => { c.save(); camera(c, 1.05 + lt * 0.02, 570, 1240); roofExt(c, t, { pop: ss(seg(t, popT - 0.1, popT + 0.5)) }); c.restore(); if (t > popT) person(c, RAY, { x: 600, y: 1290, s: 0.62, hoodDown: true, back: true, armL: [2.4, 0.3], armR: [2.2, 0.3], t }, GEN); flakes(c, t); }, { scene: 1 });
  add('slidedown', L0('l19') - 0.1, (c, t, lt) => { dockExt(c, t, { plow: 1 }); drift(c, 60, 1320, 330, 420, GEN, 0); const k = ss(seg(lt, 0, 1.8)); person(c, YOU, { x: lerp(60, 300, k), y: lerp(1150, 1760, k), s: 0.85, face: 0.4, look: [0.6, 0], brows: 0.6, mouth: 'o', armL: [1.4, 0.4], armR: [1.4, 0.4], rot: lerp(-0.6, 0, k), legs: k < 1 ? 'sit' : 'stand', t }, GEN); for (let i = 0; i < 6; i++) { const ph = (t * 0.6 + i / 6) % 1; ell(c, 600 + i * 12 + ph * 60, 1420 - ph * 200, 20 + ph * 40, 14 + ph * 24, rgba('#C8D0DC', 0.4 * (1 - ph))); } flakes(c, t); }, { scene: 1 });
  const lockT = ww('l20', 'snaps');
  const doorOut = (c, t, lt, { shake = 0, chainK = 1, people = 1 } = {}) => {
    c.save(); c.translate(Math.sin(t * 70) * 8 * shake, 0); camera(c, 1.3, 540, 1300); dockExt(c, t, { chainK, plow: 0 }); c.restore();
    if (people) { person(c, DANA, { x: 260, y: 1880, s: 1.2, back: true, armL: [1.2, 0.6], armR: [1.4, 0.4], t }, GEN); person(c, YOU, { x: 560, y: 1900, s: 1.25, back: true, armL: [2.2, 0.3], armR: [2.2, 0.3], t }, GEN); person(c, RAY, { x: 840, y: 1880, s: 1.25, back: true, hoodDown: true, armL: [2.2, 0.3], armR: [2.2, 0.3], t }, GEN); }
    flakes(c, t, 0.7);
  };
  add('haul', L0('l20') - 0.1, (c, t, lt) => doorOut(c, t, lt, { chainK: seg(t, ww('l20', 'wraps') - 0.2, lockT) }));
  const fists = () => [ww('l21', 'fists'), ww('l21', 'hammer'), ww('l21', 'door'), ww('l21', 'trapped')];
  add('trapped', L0('l21') - 0.1, (c, t, lt) => { let sh = 0; for (const f of fists()) if (t > f) sh = Math.max(sh, Math.exp(-(t - f) * 8)); doorOut(c, t, lt, { shake: sh, people: 0 }); }, { tense: 1 });
  add('marcus', L0('l22') - 0.1, (c, t, lt) => { outside(c, t); const look = Math.sin(lt * 1.6); person(c, DANA, framed(DANA, 300, 760, 120, { face: look * 0.5, look: [look, 0], brows: 0.6, glasses: 'cord', t }), GEN); person(c, YOU, framed(YOU, 560, 720, 125, { face: -look * 0.5, look: [-look, 0], brows: 0.8, t }), GEN); person(c, RAY, framed(RAY, 820, 770, 118, { hoodDown: true, face: 0.3, look: [0.5, 0.2], brows: 0.5, t }), GEN); flakes(c, t, 0.6); });
  add('crack', L0('l23') - 0.1, (c, t, lt) => {   // under the door from outside: headlamp light, boots, and a strip of yellow hi-vis
    // the bay door from outside, close and low: steel slats, snow piled at the foot, a hand-high gap of headlamp light
    c.fillStyle = '#1A1E26'; c.fillRect(0, 0, W, H);
    for (let r = 0; r < 24; r++) fillRR(c, -10, r * 52, W + 20, 46, 3, r % 2 ? '#3A404C' : '#353B46');
    c.fillStyle = '#06070A'; c.fillRect(0, 1250, W, 150);
    c.fillStyle = '#F4E8C2'; c.fillRect(0, 1290, W, 70);
    for (const [x, col] of [[200, '#14171E'], [280, '#14171E'], [760, '#14171E'], [840, '#14171E']]) fillRR(c, x, 1300, 56, 60, 8, col);
    fillRR(c, 470, 1296, 70, 64, 8, '#2F3644'); fillRR(c, 560, 1296, 70, 64, 8, '#2F3644');
    c.save(); c.beginPath(); c.rect(0, 1290, W, 70); c.clip(); fillRR(c, 430, 1286, 240, 74, 10, '#E8D23A'); fillRR(c, 430, 1318, 240, 12, 3, '#D7DDE3'); c.restore();   // his hi-vis, just showing
    c.fillStyle = '#E9EEF3'; for (let i = 0; i < 14; i++) ell(c, 40 + i * 80, 1420 + (i % 3) * 20, 90, 40, '#E3E9EF'); c.fillRect(0, 1440, W, 480);
    darkness(c, [], 0.5, [{ x: 540, y: 1240, r: 700, k: 0.7 }]); flakes(c, t, 0.4);
  }, { sting: 1 });
  add('page', L0('l24') - 0.1, (c, t, lt) => {
    c.fillStyle = '#0C0E14'; c.fillRect(0, 0, W, H); c.save(); camera(c, 1.6 + lt * 0.03, 540, 1150);
    person(c, MARCUS, framed(MARCUS, 540, 560, 150, { face: 0.3, look: [0.6, 0.2], brows: -0.2, mouth: 'tight', t }), GEN);
    c.save(); c.translate(470, 1080); c.rotate(-0.25); fillRR(c, 0, 0, 90, 120, 4, '#EDE7D8'); c.strokeStyle = '#B8B0A0'; c.beginPath(); c.moveTo(0, 0); for (let x = 0; x <= 90; x += 10) c.lineTo(x, (x / 10) % 2 ? 6 : 0); c.stroke(); for (let r = 0; r < 4; r++) fillRR(c, 10, 30 + r * 20, 70, 2, 1, 'rgba(90,120,170,0.5)'); c.restore();
    c.restore(); darkness(c, [{ x: 900, y: 1500, ang: -2.4, len: 1400, spread: 0.3 }], 0.55, [{ x: 540, y: 1150, r: 500, k: 0.6 }]);
  }, { sting: 1 });
  add('cracks', L0('l25') - 0.1, (c, t, lt) => { t_ = t; outside(c, t); c.fillStyle = 'rgba(5,8,14,0.45)'; c.fillRect(0, 0, W, H); cu(c, DANA, { face: 0.1, look: [0.2, 0.5], brows: 0.95, blink: 0.3, mouth: talk(t, quoteOn('l25', t), 'flat'), glasses: 'cord' }, 205); flakes(c, t, 0.5); });
  add('saw', L0('l26') - 0.1, (c, t, lt) => { outside(c, t); c.fillStyle = 'rgba(5,8,14,0.45)'; c.fillRect(0, 0, W, H); person(c, RAY, framed(RAY, 540, 760, 205, { hoodDown: true, face: -0.1, look: [-0.3, 0.2], brows: 0.3, blink: blinkAt(t, 4), mouth: talk(t, quoteOn('l26', t), 'tight'), t }), GEN); flakes(c, t, 0.5); });
  // ---- dawn ----
  // ---- dawn: the same flat outside, lit warm ----
  const crest = (c, t) => { poly(c, [[-40, 1250], [300, 1120], [700, 1060], [1120, 1180], [1120, H], [-40, H]], '#F1EAE6'); poly(c, [[-40, 1330], [420, 1190], [1120, 1300], [1120, H], [-40, H]], '#DCD1D7'); const on = Math.floor(t * 3) % 2; c.save(); c.globalCompositeOperation = 'screen'; for (const [x, k] of [[420, 1], [700, 0.8]]) { const g = c.createRadialGradient(x, 1060, 10, x, 1060, 420); const col = (on ^ (x > 500)) ? '255,60,60' : '60,110,255'; g.addColorStop(0, `rgba(${col},${0.75 * k})`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.fillRect(x - 420, 640, 840, 840); } c.restore(); };
  add('dawn', L0('l27') - 0.1, (c, t, lt) => { c.save(); camera(c, 1.12 - lt * 0.015, 540, 900); dockExt(c, t, { dawn: 1, chainK: 1, plow: 0, lights: 0 }); c.restore(); crest(c, t); }, { scene: 1, chip: { time: '6:41', ampm: 'AM', line: 'MORNING' } });
  add('plow', L0('l28') - 0.1, (c, t, lt) => {
    const d = L1('l28') - L0('l28') + 0.6, k = seg(lt, 0, d);
    frontExt(c, t, { bank: lerp(1, 0.35, ss(k)) });
    for (let i = 2; i >= 0; i--) { const ck = ss(seg(lt, 0.4 + i * 0.35, d)); cruiser(c, lerp(1350, 260 + i * 280, ck), 1500 + i * 40, 0.6, t, FULL, i); }
    plowTruck(c, lerp(880, 300, ss(k)), 1780, 0.7, t, FULL, { lights: 1 });
    policeWash(c, t, 0.6);
  });
  add('cuffs', L0('l29') - 0.1, (c, t, lt) => {
    const unchain = ss(seg(lt, 0.1, 0.8)), up = ss(seg(lt, 0.6, 1.8));
    c.save(); camera(c, 1.08, 540, 1200); dockExt(c, t, { dawn: 1, chainK: 1 - unchain, open: up * 0.85, plow: 0, lights: 0 }); c.restore();
    person(c, OFFICER, { x: 130, y: 1840, s: 1.05, face: 0.4, look: [0.6, 0], brows: 0.2, armL: [0.3, 0.6], armR: [0.3, 0.6], t }, FULL);
    person(c, OFFICER, { x: 960, y: 1860, s: 1.05, face: -0.4, look: [-0.6, 0], brows: 0.2, armL: [0.3, 0.6], armR: [0.3, 0.6], t }, FULL);
    for (let i = 0; i < 4; i++) { const k = seg(lt, 1.4 + i * 0.5, 3.2 + i * 0.5); if (k > 0) crewman(c, lerp(540, 300 + i * 150, ss(k)), lerp(1500, 1740 + (i % 2) * 30, ss(k)), lerp(0.5, 0.62, k), t, { lamp: 0 }); }
    const mk = ss(seg(t, ww('l29', 'marcus') - 0.3, ww('l29', 'marcus') + 1.2));
    if (mk > 0) person(c, MARCUS, { x: lerp(560, 700, mk), y: lerp(1500, 1800, mk), s: lerp(0.62, 0.8, mk), face: -0.3, look: [-0.3, 1], brows: 0.6, mouth: 'tight', armL: [-0.25, -0.4], armR: [-0.25, -0.4], walk: t * 0.9, t }, FULL);
    policeWash(c, t, 0.45);
  });
  add('hedid', L0('l30') - 0.1, (c, t, lt) => { c.drawImage(blurred('ext_front', o2 => { o2.save(); camera(o2, 1.25, 540, 1250); frontExt(o2, 0, { bank: 0 }); cruiser(o2, 820, 1520, 0.7, 0, FULL); o2.restore(); }, 12), 0, 0); const pt = ss(seg(t, ww('l30', 'points') - 0.2, ww('l30', 'points') + 0.2)); person(c, DANA, framed(DANA, 320, 780, 150, { face: 0.4, look: [0.7, 0.1], brows: 0.2, mouth: talk(t, quoteOn('l30', t), 'smile'), glasses: 'cord', armR: [lerp(0.1, 1.5, pt), lerp(0.1, 0.1, pt)], t }), FULL); person(c, RAY, framed(RAY, 780, 800, 150, { hoodDown: true, face: -0.3, look: [-0.5, 0.2], brows: lerp(0.3, -0.2, pt), mouth: pt > 0.5 ? 'smile' : 'flat', blink: blinkAt(t, 4), t }), FULL); policeWash(c, t, 0.3); });
  const openT = ww('l31', 'slide');
  add('doors', L0('l31') - 0.1, (c, t, lt) => {
    const o = seg(t, openT - 0.3, openT + 1.6), cam = lerp(1.45, 1.7, ss(seg(lt, 0, 5)));
    c.save(); camera(c, cam, 540, 1080); frontExt(c, t, { open: o, bank: 0, glowIn: ss(o) }); c.restore();
    SO_glow(c, 540, 1080, ss(o) * 0.8);
  }, { sting: 1 });
  const endT = L1('l31') + 2.4;
  add('fin', L1('l31') + 1.6, (c, t, lt) => { c.fillStyle = '#000'; c.fillRect(0, 0, W, H); });
  add('end', endT, (c, t, lt) => endCard(c, seg(lt, 0.7, 1.3)));
  return { S, endT, upT, beeps: beeps(), greenT, tornT, handT, cutT, popT, lockT, fists: fists(), openT };
}
function SO_glow(c, x, y, k) { if (k <= 0) return; c.save(); c.globalCompositeOperation = 'screen'; const g = c.createRadialGradient(x, y, 10, x, y, 900); g.addColorStop(0, `rgba(255,230,190,${0.45 * k})`); g.addColorStop(1, 'rgba(255,230,190,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H); c.restore(); }

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
  ev.push({ t: ww('l01', 'screams'), type: 'scream' }, { t: L0('l03') + 0.2, type: 'static' });
  ev.push({ t: L0('l04') - 0.1, t1: L1('l04') + 0.3, type: 'engine', g: 0.4 });
  ev.push({ t: ww('l06', 'fires') - 0.1, t1: L1('l06') + 0.4, type: 'engine', g: 0.3 }, { t: ww('l06', 'drag'), type: 'thud' });
  for (const b of K.beeps) ev.push({ t: b, type: 'beep' });
  ev.push({ t: K.greenT, type: 'beep' }, { t: K.greenT + 0.12, type: 'beep' }, { t: K.greenT, type: 'sting' }, { t: K.tornT, type: 'sting' });
  ev.push({ t: ww('l11', 'sliding'), type: 'scream' }, { t: K.handT, type: 'thud' });
  ev.push({ t: K.cutT, type: 'click' }, { t: K.popT, type: 'whoosh' }, { t: L0('l19'), type: 'whoosh' });
  ev.push({ t: L0('l19') - 0.1, t1: L1('l20') + 1, type: 'engine', g: 0.5 });
  ev.push({ t: ww('l20', 'haul') + 0.2, type: 'scream' }, { t: K.lockT - 0.7, type: 'chain' });
  for (const f of K.fists) ev.push({ t: f, type: 'knock' });
  ev.push({ t: ww('l23', 'yellow'), type: 'sting' }, { t: ww('l24', 'torn'), type: 'sting' });
  ev.push({ t: L0('l27') - 0.2, t1: L1('l29'), type: 'siren' });
  ev.push({ t: K.openT, type: 'reveal' }, { t: K.openT, type: 'whoosh' });
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
      if (sh.title) titleTop(ctx, TITLE, PART, clamp(1 - seg(t, L1('l00') - 0.3, L1('l00') + 0.2)));
      if (sh.chip) { const from = sh.chip.from ? sh.chip.from() : sh.t0; const k = ss(seg(t, from, from + 0.3)); timeChip(ctx, t, Object.assign({}, sh.chip, { k: sh.title ? 1 : k, y: sh.title ? 360 : 330 })); }
      const cp = NOSUB ? null : capAt(t); if (cp) caption(ctx, cp.words, cp.k);
    }
  };
  window.TEXTS = t => { window.render(t); return texts; };
}
