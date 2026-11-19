// DON'T MISS YOUR STOP shared kit (from BULKWAY's): palette, flat shapes, lighting states, easing, seeded noise.
// Every component in assets/ draws in a 1080×1920 design space with no outlines,
// one flat shadow tone per colour. Parts 2–5 import from here; don't redraw.

export const W = 1080, H = 1920;

// ---- palette (mirrored in STYLE_LOCK.md) ----
export const P = {
  // night / environment
  ink: '#141A24', night: '#1E2633', slate: '#2B3647', slate2: '#3A475C', steel: '#56657D',
  fog: '#8593A8', mist: '#B7C1CE', off: '#E9EDF1', white: '#F7F8FA',
  // warm store light
  warm: '#FFD99A', warm2: '#F6C26B', amber: '#E8A24A', floorW: '#A79C8C', floorW2: '#8E8475',
  // generator light
  cold: '#9FB3CC', floorC: '#4A5466', floorC2: '#3B4455',
  // lead
  orange: '#F28C28', orangeS: '#C86A14', navy: '#24365C', navyS: '#1A2744',
  hood: '#8A919C', hoodS: '#6C727C', skinA: '#E8B48C', skinAS: '#CF9670', hairA: '#1B1B22',
  // Dana
  red: '#C8463C', redS: '#A23530', gray: '#C9CCD1', grayS: '#A6AAB1', skinD: '#F0C9A8', skinDS: '#D6A887',
  // Marcus
  hivis: '#E7D23A', hivisS: '#C2AE22', skinM: '#9C6644', skinMS: '#7E4F33', beard: '#2A211C', work: '#3C4452', workS: '#2E3541',
  // racking / stock
  rack: '#4F6E91', rackS: '#3E5877', beam: '#6C88A8', pallet: '#B08A5A', palletS: '#8C6C44',
  water: '#7FB4D9', waterS: '#5E93BA', can1: '#C9584A', can2: '#D9B44A', can3: '#5C8F6E', box1: '#C7A271', box2: '#E3D3B2',
  frost: '#D8E6EE', frostS: '#B9CCD8', freezerIn: '#E9F6FF',
  alert: '#E04A3A', go: '#4CC38A', cam: '#C8D0C8',
};

// ---- math ----
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const ss = t => { t = clamp(t); return t * t * (3 - 2 * t); };
export const eo = t => 1 - Math.pow(1 - clamp(t), 3);
export const ei = t => Math.pow(clamp(t), 3);
export const back = (t, s = 1.7) => { t = clamp(t) - 1; return 1 + t * t * ((s + 1) * t + s); };
export function hash(n) { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); }
export function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---- colour ----
const hx = c => { c = c.replace('#', ''); return [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16)); };
export function mix(a, b, t) {
  const A = hx(a), B = hx(b);
  return '#' + A.map((v, i) => Math.round(lerp(v, B[i], clamp(t))).toString(16).padStart(2, '0')).join('');
}
export function rgba(c, a) { const [r, g, b] = hx(c); return `rgba(${r},${g},${b},${a})`; }
// Lighting state. L = { power: 1 full … 0 generator, flick: 0..1 extra darkening }.
// lit(colour, L): the colour as seen under the current light: generator power cools and darkens it.
export const FULL = { power: 1, flick: 0 }, GEN = { power: 0, flick: 0 }, DARK = { power: 0, flick: 0, dark: 1 };
// the train: CAR = cold green-white fluorescent; DARK = lights out (phone, map glow, platform only); PLAT = the warm, wrong platform light
export const CAR = { power: 1, flick: 0, car: 1 }, PLAT = { power: 1, flick: 0, warm: 1 };
export function lit(c, L = FULL, k = 1) {
  const g = (1 - L.power) * k;
  let out = mix(c, mix(c, '#1C2A44', 0.62), g * 0.85);            // cold, deeper
  if (L.car) out = mix(out, '#6F9A8C', 0.16 * L.car);
  if (L.warm) out = mix(out, '#C98A4A', 0.16 * L.warm);
  if (L.flick) out = mix(out, '#0E131C', L.flick * 0.7);
  if (L.dark) out = mix(out, '#070A10', L.dark * 0.55);
  return out;
}

// ---- flat shapes (no strokes, ever) ----
export function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
export function fillRR(ctx, x, y, w, h, r, c) { rr(ctx, x, y, w, h, r); ctx.fillStyle = c; ctx.fill(); }
export function ell(ctx, x, y, rx, ry, c, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill(); }
export function poly(ctx, pts, c) { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fillStyle = c; ctx.fill(); }
// a capsule from (x1,y1) to (x2,y2): limbs
export function capsule(ctx, x1, y1, x2, y2, r, c) {
  ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = c; ctx.lineWidth = r * 2;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();   // a filled ribbon, not an outline
}
// one flat shadow tone clipped inside the current path
export function shadeIn(ctx, pathFn, shadowFn, c) {
  ctx.save(); pathFn(); ctx.clip(); ctx.fillStyle = c; shadowFn(); ctx.restore();
}

// ---- camera: scale about a focus point (push-ins). No shake, ever. ----
export function camera(ctx, s = 1, fx = W / 2, fy = H / 2, dx = 0, dy = 0) {
  ctx.translate(fx + dx, fy + dy); ctx.scale(s, s); ctx.translate(-fx, -fy);
}

// ---- blink / breathe for characters (deterministic) ----
export function blinkAt(t, seed = 1) {
  // a blink every 2.6–4.6 s, 0.14 s long; returns 0 open … 1 closed
  let T = 0.4 + hash(seed) * 1.5, k = 0;
  while (T < t + 0.2 && k < 400) { const d = t - T; if (d >= 0 && d < 0.14) return Math.sin(d / 0.14 * Math.PI); T += 2.6 + hash(seed * 13 + k) * 2.0; k++; }
  return 0;
}
export const breathe = (t, seed = 0) => Math.sin(t * 2 * Math.PI / 3.6 + seed) * 0.5 + 0.5;

// ---- post: light vignette (grain is added by ffmpeg) ----
export function vignette(ctx, a = 0.38) {
  const g = ctx.createRadialGradient(W / 2, H * 0.46, H * 0.28, W / 2, H * 0.5, H * 0.72);
  g.addColorStop(0, 'rgba(8,10,16,0)'); g.addColorStop(1, `rgba(8,10,16,${a})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// ---- TikTok safe zones (design-space pixels) ----
export const SAFE = { right: Math.round(W * 0.86), bottom: Math.round(H * 0.82) };   // keep captions and key art left of x=929, above y=1574

// ---- darkness with flashlight beams (Part 2+) ----
// beams: [{ x, y, ang (rad, 0 = right, PI/2 = down), len, spread (half-angle rad), k (0..1 strength) }]
// Draws a near-black layer over the frame with soft cones cut out, then a faint warm wash inside each cone.
let _dk = null;
export function darkness(ctx, beams = [], base = 0.86, pools = []) {
  if (!_dk) _dk = new OffscreenCanvas(W, H);
  const o = _dk.getContext('2d');
  o.setTransform(1, 0, 0, 1, 0, 0); o.globalCompositeOperation = 'source-over'; o.clearRect(0, 0, W, H);
  o.fillStyle = `rgba(3,5,10,${base})`; o.fillRect(0, 0, W, H);
  o.globalCompositeOperation = 'destination-out';
  const cone = (c, b, a) => {
    const g = c.createRadialGradient(b.x, b.y, 10, b.x, b.y, b.len);
    g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(0.7, `rgba(0,0,0,${a * 0.75})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.beginPath(); c.moveTo(b.x, b.y);
    c.arc(b.x, b.y, b.len, b.ang - b.spread, b.ang + b.spread); c.closePath(); c.fill();
  };
  for (const b of beams) cone(o, b, b.k ?? 1);
  for (const q of pools) { const g = o.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.r); g.addColorStop(0, `rgba(0,0,0,${q.k ?? 0.9})`); g.addColorStop(1, 'rgba(0,0,0,0)'); o.fillStyle = g; o.fillRect(q.x - q.r, q.y - q.r, q.r * 2, q.r * 2); }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(_dk, 0, 0);
  ctx.globalCompositeOperation = 'lighter';
  for (const b of beams) {
    const g = ctx.createRadialGradient(b.x, b.y, 10, b.x, b.y, b.len);
    g.addColorStop(0, `rgba(255,214,150,${0.16 * (b.k ?? 1)})`); g.addColorStop(1, 'rgba(255,214,150,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.arc(b.x, b.y, b.len, b.ang - b.spread, b.ang + b.spread); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// ---- glow (Part 2+): light sources bloom softly. Keeps the palette; only the bright parts spread. k = strength ----
let _gl = null, _gl2 = null;
export function glow(ctx, k = 0.45) {
  const w = W / 4, h = H / 4;
  if (!_gl) { _gl = new OffscreenCanvas(w, h); _gl2 = new OffscreenCanvas(w, h); }
  const a = _gl.getContext('2d'), b = _gl2.getContext('2d');
  a.setTransform(1, 0, 0, 1, 0, 0); a.globalCompositeOperation = 'source-over'; a.filter = 'brightness(0.55) contrast(3.2) saturate(1.3)';
  a.clearRect(0, 0, w, h); a.drawImage(ctx.canvas, 0, 0, w, h); a.filter = 'none';
  b.setTransform(1, 0, 0, 1, 0, 0); b.clearRect(0, 0, w, h); b.filter = 'blur(10px)'; b.drawImage(_gl, 0, 0); b.filter = 'none';
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = k;
  ctx.drawImage(_gl2, 0, 0, W, H); ctx.globalAlpha = k * 0.6; ctx.filter = 'blur(2px)'; ctx.drawImage(_gl2, 0, 0, W, H); ctx.restore();
}
