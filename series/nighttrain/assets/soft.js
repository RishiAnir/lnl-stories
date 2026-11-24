// SOFT style (Rishi's reference: the "3:17 AM stories" look). Round heads with pale, softly glowing faces and two dot eyes,
// no nose, soft simple bodies shaded with gradients (no flat fills, no outlines), clumped soft hair, cozy detailed sets,
// a night-blue grade with light sources that bloom, a little depth of field and grain.
// person(ctx, S, pose, L): feet at (pose.x, pose.y). About 4.5 heads tall at s = 1 (head Ø 140, height ≈ 640).
import { W, H, lerp, clamp, mix, rgba, hash, rng } from './kit.js';

// ---------- soft shading ----------
// fill the current path with a top-left-lit gradient of base colour c; k = shading strength
export function soft(ctx, c, x0, y0, x1, y1, k = 1) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, mix(c, '#FFFFFF', 0.10 * k)); g.addColorStop(0.55, c); g.addColorStop(1, mix(c, '#05060C', 0.32 * k));
  ctx.fillStyle = g; ctx.fill();
}
function rrect(ctx, x, y, w, h, r) { r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2); ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
export function blob(ctx, x, y, w, h, r, c, k = 1) { rrect(ctx, x, y, w, h, r); soft(ctx, c, x, y, x + w * 0.7, y + h, k); }
export function oval(ctx, x, y, rx, ry, c, k = 1, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, Math.PI * 2); soft(ctx, c, x - rx, y - ry, x + rx * 0.6, y + ry, k); }
function flat(ctx, c) { ctx.fillStyle = c; ctx.fill(); }
// a soft limb: a rounded tube with a lit edge and a shadow edge
export function limb(ctx, x1, y1, x2, y2, r, c) {
  ctx.save(); ctx.lineCap = 'round';
  ctx.strokeStyle = mix(c, '#05060C', 0.28); ctx.lineWidth = r * 2; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  const nx = -(y2 - y1), ny = x2 - x1, n = Math.hypot(nx, ny) || 1, o = r * 0.28;
  ctx.strokeStyle = c; ctx.lineWidth = r * 1.45; ctx.beginPath(); ctx.moveTo(x1 - nx / n * o, y1 - ny / n * o); ctx.lineTo(x2 - nx / n * o, y2 - ny / n * o); ctx.stroke();
  ctx.restore();
}

// ---------- the rig ----------
export const SOFT = { head: 70, height: 640 };
// where the face is on the canvas for a pose (for framing and the face glow pass)
export const FACES = [];   // filled each frame: { x, y, r, k } (k = how much the face glows)
export function faceOf(S, p) {
  const s = p.s || 1, T = S.tall || 1, sit = p.legs === 'sit';
  const shoulder = (sit ? -150 - 205 * T : -270 * T - 205 * T), hy = shoulder - 64;
  return { x: p.x, y: p.y + hy * s, r: SOFT.head * s * (S.headK || 1) };
}
export function person(ctx, S, pose) {
  const p = Object.assign({ x: 540, y: 1500, s: 1, look: [0, 0], blink: 0, mouth: 'none', armL: [0.12, 0.1], armR: [0.12, 0.1], legs: 'stand', face: 0, glow: 1, rot: 0, t: 0 }, pose);
  const T = S.tall || 1, Wd = S.wide || 1, sit = p.legs === 'sit';
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(p.s, p.s);
  const hip = sit ? -150 : -270 * T, shoulder = hip - 205 * T, tw = 70 * Wd, hr = SOFT.head * (S.headK || 1);
  const B = { hip, shoulder, tw, T, Wd, sit, hr };
  // contact shadow
  ctx.beginPath(); ctx.ellipse(0, 4, 80 * Wd, 13, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(5,6,14,0.35)'; ctx.fill();
  arm(ctx, S, B, +1, p.armR, p, true);
  legs(ctx, S, B, p);
  // torso: a soft rounded shape, wider at the shoulders
  ctx.beginPath(); ctx.moveTo(-tw + 22, shoulder); ctx.lineTo(tw - 22, shoulder); ctx.quadraticCurveTo(tw + 4, shoulder + 4, tw, shoulder + 40);
  ctx.lineTo(tw * 0.9, hip + 14); ctx.quadraticCurveTo(tw * 0.9, hip + 26, tw * 0.9 - 16, hip + 26); ctx.lineTo(-tw * 0.9 + 16, hip + 26); ctx.quadraticCurveTo(-tw * 0.9, hip + 26, -tw * 0.9, hip + 14);
  ctx.lineTo(-tw, shoulder + 40); ctx.quadraticCurveTo(-tw - 4, shoulder + 4, -tw + 22, shoulder); ctx.closePath();
  soft(ctx, S.top, -tw, shoulder, tw * 0.8, hip + 26, 1.2);
  if (p.back) { S.back && S.back(ctx, B, p); head(ctx, S, B, p, true); }
  else { S.front && S.front(ctx, B, p); head(ctx, S, B, p, false); }
  if (p.paper != null && !p.back) { arm(ctx, S, B, -1, p.armL, p, false); newspaper(ctx, S, B, p); }   // arms go behind the paper
  else arm(ctx, S, B, -1, p.armL, p, false);
  S.over && S.over(ctx, B, p);
  // where the face landed on the canvas (camera moves included), for the face-glow pass
  const m = ctx.getTransform(), fc = m.transformPoint(new DOMPoint(p.face * 10, shoulder - 64));
  if (!p.noGlow) FACES.push({ x: fc.x, y: fc.y, r: hr * Math.hypot(m.a, m.b), k: p.back ? 0 : (S.faceGlow ?? 0.12) * p.glow });
  ctx.restore();
}
function legs(ctx, S, B, p) {
  const { hip, Wd, sit } = B, c = S.legs, cS = mix(c, '#05060C', 0.2);
  if (!sit) {
    for (const sx of [-1, 1]) { limb(ctx, sx * 24 * Wd, hip + 10, sx * 26 * Wd, -14, 26 * Wd, sx < 0 ? c : cS); shoe(ctx, sx * 26 * Wd, -6, S.shoe, sx); }
  } else {   // seated, facing us: on a seat cushion, thighs coming toward the camera (a lap with two knees), short shins down
    if (p.seat !== false) {   // the cushion they sit on, wider than they are, so the pose never reads as standing
      const sc = p.seatColor || '#3E5C92', sw = B.tw * 1.7;
      ctx.beginPath(); ctx.roundRect(-sw, hip - 4, sw * 2, 30, 14); soft(ctx, sc, -sw, hip - 4, sw * 0.6, hip + 26, 1.1);
      ctx.beginPath(); ctx.roundRect(-sw + 6, hip + 22, sw * 2 - 12, 46, 10); soft(ctx, mix(sc, '#05060C', 0.45), -sw, hip + 22, sw, hip + 68);
    }
    for (const sx of [-1, 1]) { limb(ctx, sx * 32 * Wd, hip + 60, sx * 36 * Wd, -14, 24 * Wd, cS); shoe(ctx, sx * 36 * Wd, -6, S.shoe, sx); }
    for (const sx of [-1, 1]) {   // thighs, foreshortened, ending in round knees
      ctx.beginPath(); ctx.roundRect(sx < 0 ? -64 * Wd : 2 * Wd, hip - 4, 62 * Wd, 56, 22); soft(ctx, sx < 0 ? c : cS, sx * 30 * Wd - 32, hip - 4, sx * 30 * Wd + 30, hip + 52);
      ctx.beginPath(); ctx.ellipse(sx * 33 * Wd, hip + 52, 30 * Wd, 20, 0, 0, Math.PI * 2); soft(ctx, mix(sx < 0 ? c : cS, '#FFFFFF', 0.08), sx * 33 * Wd - 30, hip + 34, sx * 33 * Wd + 24, hip + 72);
    }
  }
}
function shoe(ctx, x, y, c, sx) { ctx.beginPath(); ctx.ellipse(x + sx * 4, y, 27, 13, 0, 0, Math.PI * 2); soft(ctx, c, x - 27, y - 13, x + 20, y + 13); }
function arm(ctx, S, B, side, [a1, a2], p, back) {
  const { shoulder, tw, T } = B, sx = side * (tw - 12), sy = shoulder + 22, l1 = 128 * T, l2 = 112 * T;
  let ex = sx + side * Math.sin(a1) * l1, ey = sy + Math.cos(a1) * l1, hx = ex + side * Math.sin(a1 + a2) * l2, hy = ey + Math.cos(a1 + a2) * l2;
  if (p.paper != null && !p.back) { hx = side * (tw * 1.75); hy = lerp(shoulder + 70, shoulder - 110, clamp(p.paper)) + 60; ex = side * (tw + 30); ey = (sy + hy) / 2 + 50; }
  const c = back ? mix(S.sleeve || S.top, '#05060C', 0.18) : (S.sleeve || S.top);
  limb(ctx, sx, sy, ex, ey, 25 * B.Wd, c); limb(ctx, ex, ey, hx, hy, 22 * B.Wd, c);
  if (p.paper == null || p.back) { ctx.beginPath(); ctx.ellipse(hx, hy, 17, 15, 0, 0, Math.PI * 2); soft(ctx, S.hand || S.skin, hx - 17, hy - 15, hx + 12, hy + 15); }
  if (!back && p.hold && PROPS[p.hold]) PROPS[p.hold](ctx, hx, hy, p, S);
}
function head(ctx, S, B, p, back) {
  const { shoulder, hr } = B, cy = shoulder - 64, cx = back ? 0 : p.face * 10;
  S.hairBack && S.hairBack(ctx, cx, cy, hr, p);
  // neck
  ctx.beginPath(); ctx.roundRect(-18, cy + hr * 0.6, 36, 50, 14); flat(ctx, mix(S.skin, '#05060C', 0.35));
  // the face: a round, slightly wider-than-tall head, pale and lit from inside
  ctx.beginPath(); ctx.ellipse(cx, cy, hr * 1.04, hr, 0, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(cx - hr * 0.2, cy - hr * 0.25, hr * 0.1, cx, cy, hr * 1.1);
  g.addColorStop(0, mix(S.skin, '#FFFFFF', 0.35)); g.addColorStop(0.7, S.skin); g.addColorStop(1, mix(S.skin, '#20243A', 0.35));
  ctx.fillStyle = g; ctx.fill();
  if (back) { S.hairBackView && S.hairBackView(ctx, cx, cy, hr, p); return; }
  if (S.rim) {   // the train's light catching the top of the face: a soft bright crescent
    ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, hr * 1.04, hr, 0, 0, Math.PI * 2); ctx.clip();
    const rg = ctx.createRadialGradient(cx - hr * 0.25, cy - hr * 1.2, hr * 0.3, cx - hr * 0.25, cy - hr * 1.2, hr * 1.5);
    rg.addColorStop(0, 'rgba(240,248,255,0.65)'); rg.addColorStop(0.55, 'rgba(225,238,255,0.18)'); rg.addColorStop(1, 'rgba(225,238,255,0)');
    ctx.fillStyle = rg; ctx.fillRect(cx - hr * 1.2, cy - hr * 1.2, hr * 2.4, hr * 2.4); ctx.restore();
  }
  if (!S.noEyes) {   // two dot eyes, nothing else unless asked
    const open = 1 - clamp(p.blink), ex = hr * 0.36, ey = cy + hr * 0.05;
    for (const s of [-1, 1]) {
      const x = cx + p.face * hr * 0.25 + s * ex + p.look[0] * 7, y = ey + p.look[1] * 7;
      if (open > 0.2) { ctx.beginPath(); ctx.ellipse(x, y, 8.5, 9.5 * open, 0, 0, Math.PI * 2); flat(ctx, '#15161F'); }
      else { ctx.beginPath(); ctx.roundRect(x - 9, y - 1.5, 18, 3, 1.5); flat(ctx, '#3A3B4A'); }
      if (p.brows) { ctx.save(); ctx.translate(x, y - 26); ctx.rotate(s * p.brows * -0.25); ctx.beginPath(); ctx.roundRect(-12, -2.5, 24, 5, 2.5); flat(ctx, rgba('#2A2B38', 0.7)); ctx.restore(); }
    }
  }
  const mx = cx + p.face * hr * 0.25, my = cy + hr * 0.48;
  if (p.mouth === 'o') { ctx.beginPath(); ctx.ellipse(mx, my, 7, 9, 0, 0, Math.PI * 2); flat(ctx, '#2A1E26'); }
  else if (p.mouth === 'small') { ctx.beginPath(); ctx.roundRect(mx - 8, my - 1.5, 16, 3, 1.5); flat(ctx, rgba('#2A1E26', 0.8)); }
  else if (p.mouth === 'meek') { ctx.beginPath(); ctx.ellipse(mx, my - 3, 10, 4, 0, 0.25, Math.PI - 0.25); ctx.lineWidth = 3; ctx.strokeStyle = rgba('#2A1E26', 0.8); ctx.stroke(); }
  else if (p.mouth === 'wide') { ctx.beginPath(); ctx.ellipse(mx, my - 10, hr * 0.62, 20, 0, 0.12, Math.PI - 0.12); ctx.ellipse(mx, my - 7, hr * 0.56, 10, 0, Math.PI - 0.14, 0.14, true); ctx.closePath(); flat(ctx, '#1A1418'); }
  S.hair && S.hair(ctx, cx, cy, hr, p);
  S.faceOver && S.faceOver(ctx, cx, cy, hr, p);
}
// hair helper: a cap of soft clumps over the top of the head
export function clumps(ctx, cx, cy, hr, c, { fringe = 0.55, n = 7, spread = 1.08, rough = 1 } = {}) {
  ctx.save();
  ctx.beginPath(); ctx.ellipse(cx, cy - hr * 0.12, hr * spread, hr * 0.98, 0, Math.PI * 0.96, Math.PI * 2.04); ctx.closePath(); soft(ctx, c, cx - hr, cy - hr, cx + hr * 0.6, cy + hr * 0.2, 1.2);
  for (let i = 0; i < n; i++) {   // fringe tufts falling over the forehead
    const u = i / (n - 1) - 0.5, x = cx + u * hr * 1.8, len = hr * fringe * (0.7 + 0.5 * hash(i * 3.3 + rough)), w = hr * 0.42;
    ctx.beginPath(); ctx.moveTo(x - w / 2, cy - hr * 0.55); ctx.quadraticCurveTo(x - w * 0.3, cy - hr * 0.55 + len * 0.8, x + u * 12, cy - hr * 0.55 + len); ctx.quadraticCurveTo(x + w * 0.35, cy - hr * 0.5 + len * 0.5, x + w / 2, cy - hr * 0.6);
    ctx.closePath(); soft(ctx, c, x - w, cy - hr, x + w, cy - hr * 0.2 + len);
  }
  strands(ctx, cx, cy, hr, c, rough);
  ctx.restore();
}

// fine strands over a hair shape: a few soft lighter and darker curves, so hair reads as hair, not a helmet
export function strands(ctx, cx, cy, hr, c, seed = 1) {
  ctx.save(); ctx.lineCap = 'round';
  for (let i = 0; i < 14; i++) {
    const u = hash(i * 1.7 + seed) - 0.5, x0 = cx + u * hr * 1.7, y0 = cy - hr * (0.95 - 0.1 * hash(i + seed)), bend = (hash(i * 3.1 + seed) - 0.5) * hr * 0.5;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x0 + bend, y0 + hr * 0.3, x0 + u * 30 + bend * 0.6, y0 + hr * (0.42 + 0.2 * hash(i + 9)));
    ctx.lineWidth = 2.5 + hash(i) * 2.5; ctx.strokeStyle = i % 3 ? rgba(mix(c, '#05060C', 0.4), 0.35) : rgba(mix(c, '#FFFFFF', 0.35), 0.3); ctx.stroke();
  }
  ctx.restore();
}
// painterly: large soft brush blotches (soft-light) and a hair of blur, so the flat shapes feel painted
let _brush = null;
export function painterly(ctx, a = 0.16) {
  if (!_brush) { const c0 = new OffscreenCanvas(270, 480), o = c0.getContext('2d'), r = rng(11);
    for (let i = 0; i < 260; i++) { const x = r() * 270, y = r() * 480, rr = 6 + r() * 26, v = Math.round(90 + r() * 120); o.fillStyle = `rgba(${v},${v},${v},0.35)`; o.beginPath(); o.ellipse(x, y, rr * (1.4 + r()), rr, r() * 3, 0, 7); o.fill(); }
    _brush = new OffscreenCanvas(270, 480); const b = _brush.getContext('2d'); b.fillStyle = '#808080'; b.fillRect(0, 0, 270, 480); b.filter = 'blur(3px)'; b.drawImage(c0, 0, 0); }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.filter = 'blur(0.8px)'; ctx.drawImage(ctx.canvas, 0, 0); ctx.filter = 'none';
  ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = a; ctx.drawImage(_brush, 0, 0, W, H); ctx.restore();
}

// ---------- props ----------
export const PROPS = {
  knit(ctx, x, y, p) {
    const k = Math.sin((p.t || 0) * 6) * 0.12;
    blob(ctx, x - 34, y - 6, 68, 70, 16, '#B8434A'); for (let r = 0; r < 5; r++) { ctx.beginPath(); ctx.roundRect(x - 32, y + 4 + r * 13, 64, 4, 2); flat(ctx, rgba('#7A2A30', 0.6)); }
    for (const s of [-1, 1]) { ctx.save(); ctx.translate(x, y); ctx.rotate(s * (0.7 + k)); ctx.beginPath(); ctx.roundRect(-3, -80, 6, 120, 3); flat(ctx, '#C9CCD8'); ctx.beginPath(); ctx.arc(0, -82, 7, 0, 7); flat(ctx, '#E8C23A'); ctx.restore(); }
  },
  punch(ctx, x, y, p) { ctx.save(); ctx.translate(x, y); ctx.rotate(p.punchRot ?? 0.2); blob(ctx, -12, -84, 24, 90, 8, '#B7BEC8'); blob(ctx, 4, -84, 22, 70, 8, '#8E96A2'); ctx.restore(); },
  ticket(ctx, x, y, p) { ctx.save(); ctx.translate(x, y); ctx.rotate(p.ticketRot ?? -0.3); blob(ctx, -8, -76, 54, 82, 6, '#EFE8CE'); ctx.beginPath(); ctx.roundRect(-8, -76, 54, 16, 6); flat(ctx, '#B8434A'); for (let i = 0; i < (p.holes || 0); i++) { ctx.beginPath(); ctx.arc(8 + (i % 3) * 13, -42 + Math.floor(i / 3) * 14, 4, 0, 7); flat(ctx, '#15161F'); } ctx.restore(); },
  sheet(ctx, x, y, p) { ctx.save(); ctx.translate(x, y); ctx.rotate(p.sheetRot ?? -0.15); blob(ctx, -50, -130, 100, 130, 4, '#F1EEE4', 0.6); for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.roundRect(-40, -116 + i * 18, 76, 3, 1.5); flat(ctx, rgba('#3A4A7A', 0.55)); } ctx.restore(); },
  phone(ctx, x, y, p) { ctx.save(); ctx.translate(x, y); ctx.rotate(p.phoneRot ?? -0.1); blob(ctx, -24, -88, 48, 92, 10, '#14161E', 0.4); ctx.beginPath(); ctx.roundRect(-19, -82, 38, 80, 7); ctx.fillStyle = p.phoneOn === 0 ? '#1A1E28' : '#CFE4FF'; ctx.fill(); ctx.restore(); },
};
function newspaper(ctx, S, B, p) {
  const { shoulder, tw } = B, y0 = lerp(shoulder + 70, shoulder - 110, clamp(p.paper)), w = tw * 3.5, h = 160;
  ctx.save(); ctx.translate(0, y0);
  blob(ctx, -w / 2, 0, w / 2 + 2, h, 6, '#DCD8CC', 0.7); blob(ctx, 0, 0, w / 2, h, 6, '#C9C4B6', 0.7);
  for (const x0 of [-w / 2 + 16, 16]) { ctx.beginPath(); ctx.roundRect(x0, 16, w * 0.4, 16, 3); flat(ctx, rgba('#3A3A44', 0.7)); for (let r = 0; r < 5; r++) { ctx.beginPath(); ctx.roundRect(x0, 46 + r * 20, w * 0.4 - (r % 3) * 14, 6, 3); flat(ctx, rgba('#6A6870', 0.5)); } }
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * (w / 2 - 6), 60, 16, 0, 7); soft(ctx, S.skin, s * (w / 2) - 16, 44, s * (w / 2) + 12, 76); }
  ctx.restore();
}

// ---------- cast ----------
export const CAST = {
  YOU: {
    id: 'you', faceGlow: 1, rim: 1, skin: '#E8DED8', top: '#5D6878', legs: '#2C3446', shoe: '#E6E8EE', tall: 1, wide: 1,
    hairBack(ctx, cx, cy, hr) { ctx.beginPath(); ctx.ellipse(cx, cy - hr * 0.25, hr * 1.12, hr * 0.95, 0, 0, Math.PI * 2); soft(ctx, '#3A2A22', cx - hr, cy - hr, cx + hr, cy); },
    hair(ctx, cx, cy, hr) {
      for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + sx * hr * 0.95, cy - hr * 0.2, hr * 0.22, hr * 0.42, sx * 0.25, 0, Math.PI * 2); soft(ctx, '#4A3428', cx - hr, cy - hr, cx + hr, cy); }   // tufts over the ears
      clumps(ctx, cx, cy, hr, '#4A3428', { fringe: 0.78, n: 7, rough: 2, spread: 1.12 });
      for (const [dx, a] of [[-0.35, -0.5], [0.1, 0.3], [0.45, 0.7]]) { ctx.save(); ctx.translate(cx + dx * hr, cy - hr * 1.02); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, -8, hr * 0.12, hr * 0.26, 0, 0, Math.PI * 2); soft(ctx, '#4A3428', -20, -40, 20, 20); ctx.restore(); }   // a few strands sticking up
    },
    hairBackView(ctx, cx, cy, hr) { ctx.beginPath(); ctx.ellipse(cx, cy - hr * 0.1, hr * 1.1, hr * 1.02, 0, 0, Math.PI * 2); soft(ctx, '#3A2A22', cx - hr, cy - hr, cx + hr, cy + hr); },
    front(ctx, B) {
      const { shoulder, tw, hip } = B;
      for (const s of [-1, 1]) blob(ctx, s * (tw - 26) - 11, shoulder + 4, 22, hip - shoulder - 20, 10, '#56633A');   // backpack straps
      blob(ctx, -tw * 0.6, hip - 96, tw * 1.2, 66, 18, '#4F5968');                                               // hoodie pocket
      // yellow headphones resting round the neck
      ctx.save(); ctx.beginPath(); ctx.ellipse(0, shoulder - 6, 40, 18, 0, Math.PI * 1.08, Math.PI * 1.92); ctx.lineWidth = 11; ctx.strokeStyle = '#C99C18'; ctx.stroke(); ctx.restore();
      for (const s of [-1, 1]) { ctx.save(); ctx.translate(s * 38, shoulder + 8); ctx.rotate(s * 0.5); blob(ctx, -22, -18, 44, 38, 16, '#F2C230'); ctx.beginPath(); ctx.roundRect(-18, -22, 36, 12, 6); flat(ctx, '#23242C'); ctx.restore(); }
    },
    back(ctx, B) { const { shoulder, tw, hip } = B; blob(ctx, -tw + 8, shoulder + 20, tw * 2 - 16, hip - shoulder - 30, 30, '#5E6B3A'); },
  },
  JUNE: {
    id: 'june', faceGlow: 1, rim: 1, skin: '#F0E6E0', top: '#B98A55', legs: '#8FB3CB', shoe: '#EDE8E2', tall: 0.94, wide: 1.06,
    hairBack(ctx, cx, cy, hr) { ctx.beginPath(); ctx.ellipse(cx, cy - hr * 0.15, hr * 1.12, hr * 1.02, 0, 0, Math.PI * 2); soft(ctx, '#C3C7D2', cx - hr, cy - hr, cx + hr, cy + hr); },
    hair(ctx, cx, cy, hr) {
      // a soft silver cap of hair with a side part, swept back into the bun
      ctx.beginPath(); ctx.ellipse(cx, cy - hr * 0.15, hr * 1.1, hr * 0.95, 0, Math.PI * 0.92, Math.PI * 2.08); ctx.quadraticCurveTo(cx + hr * 0.5, cy - hr * 0.62, cx - hr * 0.2, cy - hr * 0.55); ctx.quadraticCurveTo(cx - hr * 0.8, cy - hr * 0.45, cx - hr * 1.02, cy + hr * 0.1); ctx.closePath(); soft(ctx, '#D3D7E0', cx - hr, cy - hr, cx + hr, cy); strands(ctx, cx, cy, hr, '#D3D7E0', 5);
      ctx.save(); ctx.translate(cx + 14, cy - hr * 1.08); ctx.rotate(-0.5); ctx.beginPath(); ctx.roundRect(-74, -7, 148, 14, 4); flat(ctx, '#E8C23A'); ctx.restore();   // the pencil
      oval(ctx, cx + 12, cy - hr * 1.1, hr * 0.55, hr * 0.45, '#D3D7E0');                                                                         // bun
    },
    hairBackView(ctx, cx, cy, hr) { ctx.beginPath(); ctx.ellipse(cx, cy - hr * 0.05, hr * 1.1, hr * 1.02, 0, 0, Math.PI * 2); soft(ctx, '#C3C7D2', cx - hr, cy - hr, cx + hr, cy + hr); oval(ctx, cx, cy - hr * 1.1, hr * 0.55, hr * 0.45, '#D3D7E0'); },
    front(ctx, B) {
      const { shoulder, tw, hip } = B;
      ctx.beginPath(); ctx.moveTo(-34, shoulder + 2); ctx.lineTo(34, shoulder + 2); ctx.lineTo(0, shoulder + 84); ctx.closePath(); soft(ctx, '#9CC3D8', -34, shoulder, 34, shoulder + 84);   // scrubs
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 34, shoulder); ctx.lineTo(s * 66, shoulder + 8); ctx.lineTo(s * 22, shoulder + 110); ctx.lineTo(s * 6, shoulder + 92); ctx.closePath(); soft(ctx, '#9A6F40', s * 6, shoulder, s * 66, shoulder + 110); }   // lapels
    },
    back(ctx, B) { },
  },
  CONDUCTOR: {
    id: 'conductor', skin: '#B8B6C4', top: '#1F2A44', legs: '#1A2338', shoe: '#0C0E16', hand: '#F4F3EE', tall: 1.38, wide: 0.82, headK: 0.92, faceGlow: 0,
    noEyes: true,
    hair(ctx, cx, cy, hr) {
      // the eyes sit in the cap's shadow: a soft dark band, then the cap
      ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, hr * 1.04, hr, 0, 0, Math.PI * 2); ctx.clip();
      const g = ctx.createLinearGradient(0, cy - hr, 0, cy + hr * 0.35); g.addColorStop(0, 'rgba(4,5,10,1)'); g.addColorStop(0.8, 'rgba(4,5,10,0.97)'); g.addColorStop(1, 'rgba(4,5,10,0)');
      ctx.fillStyle = g; ctx.fillRect(cx - hr * 1.2, cy - hr * 1.2, hr * 2.4, hr * 1.5); ctx.restore();
      blob(ctx, cx - hr * 1.0, cy - hr * 1.32, hr * 2.0, hr * 0.85, 26, '#1F2A44');
      ctx.beginPath(); ctx.ellipse(cx, cy - hr * 0.48, hr * 1.32, hr * 0.26, 0, 0, Math.PI); flat(ctx, '#0B0F1A');
      oval(ctx, cx, cy - hr * 1.0, 14, 17, '#C9A24A');
    },
    front(ctx, B) {
      const { shoulder } = B;
      ctx.beginPath(); ctx.moveTo(-28, shoulder); ctx.lineTo(28, shoulder); ctx.lineTo(0, shoulder + 50); ctx.closePath(); flat(ctx, '#D8DCE6');
      ctx.beginPath(); ctx.roundRect(-6, shoulder + 12, 12, 52, 4); flat(ctx, '#5A1E22');
      for (let i = 0; i < 4; i++) oval(ctx, -14, shoulder + 84 + i * 34, 6, 6, '#C9A24A');
    },
  },
  RED: {
    id: 'red', skin: '#E2D6D0', top: '#C8302C', legs: '#B42A27', shoe: '#F2F2F2', tall: 1.04, wide: 1.1,
    hair(ctx, cx, cy, hr) { ctx.beginPath(); ctx.ellipse(cx, cy - hr * 0.2, hr * 1.06, hr * 0.92, 0, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); soft(ctx, '#1E1612', cx - hr, cy - hr, cx + hr, cy); },
    front(ctx, B) { const { shoulder, tw, hip } = B; for (const s of [-1, 1]) { ctx.beginPath(); ctx.roundRect(s * (tw - 12) - 5, shoulder + 10, 10, hip - shoulder, 5); flat(ctx, '#F2F2F2'); } ctx.save(); ctx.beginPath(); ctx.ellipse(0, shoulder + 14, 34, 34, 0, 0.25, Math.PI - 0.25); ctx.lineWidth = 6; ctx.strokeStyle = '#E2B43C'; ctx.stroke(); ctx.restore(); },
  },
};
const PAXC = { skins: ['#EADFD8', '#E2D2C4', '#D9C2B0', '#C7A994', '#B48E78', '#F0E6E2'], tops: ['#C9A23A', '#2F7F86', '#7E2E3A', '#3E5E8C', '#3F6B4A', '#8C7BB0', '#B08A5A', '#4A4F5C'], hair: ['#1E1A18', '#5A3A24', '#D9B45A', '#8A3E22', '#A9ADB4', '#2E2A26'], legs: ['#2C3240', '#4A4038', '#2A3A55', '#55504A'] };
const PAX = {};
export function passenger(i) {
  if (PAX[i]) return PAX[i];
  const hairC = PAXC.hair[(i * 7 + 1) % 6], style = ['short', 'bob', 'long', 'bald', 'curly', 'bun'][(i * 5) % 6], acc = ['glasses', 'beanie', 'scarf', 'cap', 'none', 'none'][(i * 3 + 1) % 6], ac = ['#E1574A', '#F2C230', '#4A8FC9', '#5FAF7A'][(i * 2 + 3) % 4];
  return (PAX[i] = {
    id: 'pax' + i, hairC: style === 'bald' ? null : hairC, skin: PAXC.skins[(i * 5 + 2) % 6], top: PAXC.tops[(i * 3) % 8], legs: PAXC.legs[i % 4], shoe: ['#1C1E22', '#5A3A24', '#E9EDF1'][i % 3], tall: 0.94 + (i % 5) * 0.035, wide: 0.95 + (i % 3) * 0.06,
    hairBack(ctx, cx, cy, hr) { if (style === 'bob' || style === 'long') { ctx.beginPath(); ctx.ellipse(cx, cy + (style === 'long' ? hr * 0.4 : 0), hr * 1.18, hr * (style === 'long' ? 1.4 : 1.08), 0, 0, Math.PI * 2); soft(ctx, hairC, cx - hr, cy - hr, cx + hr, cy + hr); } if (style === 'curly') for (let k = 0; k < 9; k++) oval(ctx, cx + Math.cos(k / 9 * 6.28) * hr, cy - hr * 0.2 + Math.sin(k / 9 * 6.28) * hr * 0.9, hr * 0.42, hr * 0.42, hairC); },
    hair(ctx, cx, cy, hr) {
      if (style !== 'bald') clumps(ctx, cx, cy, hr, hairC, { fringe: style === 'short' ? 0.3 : 0.45, n: 6, rough: i });
      if (style === 'bun') oval(ctx, cx, cy - hr * 1.1, hr * 0.5, hr * 0.42, hairC);
      if (acc === 'glasses') { for (const s of [-1, 1]) { ctx.beginPath(); ctx.roundRect(cx + s * hr * 0.36 - 20, cy - 12, 40, 32, 10); ctx.lineWidth = 4.5; ctx.strokeStyle = '#1E1E26'; ctx.stroke(); } }
      if (acc === 'beanie') { ctx.beginPath(); ctx.ellipse(cx, cy - hr * 0.42, hr * 1.06, hr * 0.8, 0, Math.PI, 0); soft(ctx, ac, cx - hr, cy - hr * 1.2, cx + hr, cy - hr * 0.4); blob(ctx, cx - hr * 1.08, cy - hr * 0.56, hr * 2.16, hr * 0.3, 14, mix(ac, '#000000', 0.2)); }
      if (acc === 'cap') { ctx.beginPath(); ctx.ellipse(cx, cy - hr * 0.4, hr * 1.04, hr * 0.72, 0, Math.PI, 0); soft(ctx, ac, cx - hr, cy - hr, cx + hr, cy - hr * 0.4); ctx.beginPath(); ctx.ellipse(cx + hr * 0.4, cy - hr * 0.4, hr * 0.8, 16, 0, 0, Math.PI); flat(ctx, mix(ac, '#000000', 0.3)); }
    },
    front(ctx, B) { if (acc === 'scarf') { blob(ctx, -46, B.shoulder - 12, 92, 34, 16, ac); blob(ctx, 12, B.shoulder + 12, 26, 96, 10, mix(ac, '#000000', 0.15)); } },
  });
}
export const { YOU, JUNE, CONDUCTOR, RED } = CAST;

// ---------- post: night grade, glowing faces, depth of field helper, grain ----------
// grade: pull everything toward deep night blue (multiply), keep highlights
export function nightGrade(ctx, { tint = '#6C7AB8', k = 1 } = {}) {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = k; ctx.fillStyle = tint; ctx.fillRect(0, 0, W, H); ctx.restore();
}
// glow: every visible face softly lights up (the look's signature), plus any extra light sources
export function faceGlow(ctx, extra = [], k = 1) {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'screen';
  for (const f of FACES.concat(extra)) {
    if (!f.k) continue;
    const g = ctx.createRadialGradient(f.x, f.y, f.r * 0.2, f.x, f.y, f.r * 2.2); g.addColorStop(0, `rgba(205,215,255,${0.32 * f.k * k})`); g.addColorStop(0.45, `rgba(150,165,235,${0.12 * f.k * k})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(f.x - f.r * 2.2, f.y - f.r * 2.2, f.r * 4.4, f.r * 4.4);
  }
  ctx.restore(); FACES.length = 0;
}
// light: a soft light pool (screen) — the train's tubes, a phone, a platform lamp
export function lightPool(ctx, x, y, r, c = '#BFD8FF', a = 0.35) {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'screen';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(c, a)); g.addColorStop(1, rgba(c, 0)); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
}
// draw a background layer blurred (depth of field)
let _bg = null;
export function blurred(ctx, px, draw) {
  if (!_bg) _bg = new OffscreenCanvas(W, H);
  const o = _bg.getContext('2d'); o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, W, H); draw(o);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.filter = `blur(${px}px)`; ctx.drawImage(_bg, 0, 0); ctx.restore();
}
let _grain = null;
export function grain(ctx, a = 0.07) {
  if (!_grain) { _grain = new OffscreenCanvas(360, 640); const o = _grain.getContext('2d'), im = o.createImageData(360, 640), r = rng(3); for (let i = 0; i < im.data.length; i += 4) { const v = r() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } o.putImageData(im, 0, 0); }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = a; ctx.drawImage(_grain, 0, 0, W, H); ctx.restore();
}

export const mixC = (c, k) => mix(c, '#05060C', 1 - k);   // darken a colour to k of its brightness
// ---------- the car's own light (Part 3 on): a cooler multiply that leaves the ceiling bright and sinks the floor, the tubes' greenish wash from above,
// and warm platform/street lamps sliding past the windows every few seconds (the car is moving), with window-frame shadows inside each sweep ----------
export function carAmbience(ctx, t, { k = 1, sweeps = 1, speed = 1 } = {}) {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  let g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#A9B2E0'); g.addColorStop(0.5, '#7C86C4'); g.addColorStop(1, '#3E4684');
  ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = k; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 1;
  g = ctx.createLinearGradient(0, 0, 0, 900); g.addColorStop(0, 'rgba(214,240,232,0.30)'); g.addColorStop(1, 'rgba(214,240,232,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 900);
  if (sweeps > 0) {   // a warm lamp outside sliding past the windows, every five seconds or so
    const P = 5.2 / speed, ph = ((t + 1.3) % P) / P, x = lerp(W + 900, -900, ph);
    ctx.save(); ctx.translate(x, 0); ctx.transform(1, 0, -0.22, 1, 0, 0);
    g = ctx.createLinearGradient(-520, 0, 520, 0); g.addColorStop(0, 'rgba(255,170,96,0)'); g.addColorStop(0.5, `rgba(255,170,96,${0.2 * sweeps})`); g.addColorStop(1, 'rgba(255,170,96,0)');
    ctx.fillStyle = g; ctx.fillRect(-520, 0, 1040, H);
    ctx.restore();
  }
  ctx.restore();
}
