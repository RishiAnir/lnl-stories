// BULKWAY — Part 4 "Morning" (the finale). The truck crew, the roof hatch, the tow chain, Marcus, dawn. Painted backgrounds (assets/bg) for the outside shots. The narration track
// (voices/narration.wav: Chatterbox lines laid end to end by voice.py) sets the clock; shots cut on its word times.
// Same caption + timing machinery as Part 2. New: title at the top of the first shot, the time chip, Ray with his hood down.
import { P, W, H, FULL, GEN, DARK, clamp, lerp, seg, ss, eo, camera, blinkAt, breathe, vignette, rgba, fillRR, ell, poly, capsule, lit, darkness, glow } from '../assets/kit.js';
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

