// BULKWAY characters: one rig, three specs (YOU, DANA, MARCUS) + the camera-only STRANGER.
// person(ctx, SPEC, pose, L): feet at (pose.x, pose.y), height ≈ 600·s (Marcus taller).
// Flat fills only, one shadow tone per colour, light from upper left, dot eyes on white sclera.
import { P, ell, fillRR, rr, capsule, poly, lit, clamp, lerp, mix, rgba, FULL } from './kit.js';

// ---------- specs ----------
export const YOU = {
  id: 'you', skin: P.skinA, skinS: P.skinAS, shirt: P.hood, shirtS: P.hoodS, legs: '#2C3240', legsS: '#222733', shoe: '#1B1F27',
  tall: 1, wide: 1, hair: P.hairA,
  drawHair(ctx, f, L) { hairShort(ctx, f, L, P.hairA); },
  drawHat(ctx, f, L) { beanie(ctx, f, L); },
  drawTop(ctx, b, L, pose) { hoodieVest(ctx, b, L, pose); },
  drawBack(ctx, b, L) { ell(ctx, 0, b.top + 22, b.tw * 0.62, 26, lit(P.hoodS, L)); fillRR(ctx, -b.tw - 1, b.top + 12, b.tw * 2 + 2, b.hipY - b.top + 8, 18, lit(P.navy, L)); fillRR(ctx, b.tw * 0.3, b.top + 12, b.tw * 0.7, b.hipY - b.top + 8, 16, lit(P.navyS, L)); },
  drawHeadBack(ctx, f, L) { ctx.save(); ctx.beginPath(); ctx.ellipse(0, f.cy, f.rx, f.ry, 0, 0, Math.PI * 2); ctx.clip(); ell(ctx, 0, f.cy + 10, f.rx, f.ry, lit(P.hairA, L)); ell(ctx, 50, f.cy + 50, f.rx, f.ry, lit('#121218', L)); ctx.restore(); beanie(ctx, f, L); },
};
export const DANA = {
  id: 'dana', skin: P.skinD, skinS: P.skinDS, shirt: P.red, shirtS: P.redS, legs: '#353C4C', legsS: '#2A303D', shoe: '#22252C',
  tall: 0.96, wide: 1.06,
  drawHairBack(ctx, f, L) { bobBack(ctx, f, L); },
  drawHair(ctx, f, L) { bobFront(ctx, f, L); },
  drawFace(ctx, f, L, pose) { if (pose.glasses === 'on') glasses(ctx, f, L); },
  drawTop(ctx, b, L, pose) { fleece(ctx, b, L, pose); },
  drawBack(ctx, b, L) { fillRR(ctx, -28, b.top - 6, 56, 24, 11, lit(P.redS, L)); },
  drawHeadBack(ctx, f, L) { ell(ctx, 0, f.cy + 6, f.rx + 22, f.ry + 18, lit(P.gray, L)); ctx.save(); ctx.beginPath(); ctx.ellipse(0, f.cy + 6, f.rx + 22, f.ry + 18, 0, 0, Math.PI * 2); ctx.clip(); ell(ctx, 70, f.cy + 60, f.rx + 22, f.ry + 18, lit(P.grayS, L)); ctx.restore(); },
};
export const MARCUS = {
  id: 'marcus', skin: P.skinM, skinS: P.skinMS, shirt: P.work, shirtS: P.workS, legs: '#2F3644', legsS: '#252A35', shoe: '#1A1D23',
  tall: 1.16, wide: 1.1,
  drawHair(ctx, f, L) { hairBuzz(ctx, f, L); },
  drawFace(ctx, f, L) { beard(ctx, f, L); },
  drawTop(ctx, b, L, pose) { hivis(ctx, b, L, pose); },
  drawBack(ctx, b, L) {
    fillRR(ctx, -b.tw - 2, b.top + 10, b.tw * 2 + 4, b.hipY - b.top + 10, 18, lit(P.hivis, L)); fillRR(ctx, b.tw * 0.3, b.top + 10, b.tw * 0.72, b.hipY - b.top + 10, 16, lit(P.hivisS, L));
    for (const yy of [b.hipY - 80, b.hipY - 36]) fillRR(ctx, -b.tw - 2, yy, b.tw * 2 + 4, 13, 3, lit('#D7DDE3', L));
  },
  drawHeadBack(ctx, f, L) {
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, f.cy, f.rx, f.ry, 0, 0, Math.PI * 2); ctx.clip(); ell(ctx, 0, f.cy - 20, f.rx + 4, f.ry, lit('#1E1915', L)); ctx.restore();
    fillRR(ctx, -f.rx * 0.6, f.cy + 118, f.rx * 1.2, 22, 11, lit('#2A2F38', L));
  },
};

// ---------- rig ----------
// Proportions (revision 2): about 6 heads tall. Standing height 640·s·tall (head 107, legs = half the height),
// slim torso, narrow shoulders (≈1.2 head widths), thin arms whose hands hang at mid-thigh.
// pose: { x, y, s, face(-1..1), look:[x,y], blink, breathe, brows(-1..1), mouth, armL:[a1,a2], armR:[a1,a2],
//         legs:'stand'|'sit', glasses, bounce (0..1 highlight hop), rot (whole-body rotation, rad), hold:'phone'|'calc'|null, squash }
// Arm angles: a1 = upper arm from straight down (+ = away from the body / up), a2 = elbow bend added to a1.
export const BODY = { height: 640, head: 107, headK: 0.46, hip: 320, torso: 196, shoulder: 52, upper: 140, fore: 122 };
// where the face sits in canvas pixels for a pose (to frame close-ups): centre and half-height of the head
export function headCenter(S, pose = {}) {
  const s = pose.s || 1, T = S.tall, sit = pose.legs === 'sit';
  const hipY = sit ? -175 : -BODY.hip * T, top = hipY - BODY.torso * T;
  return { x: (pose.x ?? 540), y: (pose.y ?? 1500) + (top - 18 - 53) * s, r: 53 * s };
}
export function person(ctx, S, pose, L = FULL) {
  const p = Object.assign({ x: 540, y: 1500, s: 1, face: 0, look: [0, 0], blink: 0, breathe: 0, brows: 0, mouth: 'flat',
    armL: [0.1, 0.06], armR: [0.1, 0.06], legs: 'stand', bounce: 0, rot: 0, squash: 0 }, pose);
  const T = S.tall, Wd = S.wide;
  ctx.save();
  const wk = p.walk != null ? Math.sin(p.walk * Math.PI * 2) : 0, wb = p.walk != null ? Math.abs(Math.cos(p.walk * Math.PI * 2)) * 8 : 0;
  ctx.translate(p.x, p.y - p.bounce * 46 * p.s - wb * p.s);
  ctx.rotate(p.rot);
  ctx.scale(p.s * (1 + p.squash * 0.12), p.s * (1 - p.squash * 0.12));
  const br = p.breathe * 2.5;
  const sit = p.legs === 'sit';
  const hipY = sit ? -175 : -BODY.hip * T, top = hipY - BODY.torso * T - br, sh = top + 10;
  const tw = BODY.shoulder * Wd;
  const b = { hipY, top, tw, sh, T, Wd, sit };
  if (!p.noShadow) ell(ctx, 0, 4, 70 * Wd, 11, 'rgba(10,14,22,0.28)');
  arm(ctx, S, b, +1, p.armR, L, p, true);
  // legs: thigh + shin capsules, small shoes
  if (!sit) {
    for (const sx of [-1, 1]) {
      const sw = wk * sx * 34, lift = Math.max(0, wk * sx) * 18, kx = sx * 19 * Wd + sw * 0.5, ky = hipY * 0.5 - lift * 0.6;
      const c = lit(sx < 0 ? S.legs : S.legsS, L);
      capsule(ctx, sx * 20 * Wd, hipY + 8, kx, ky, 15.5 * Wd, c);
      capsule(ctx, kx, ky, sx * 20 * Wd + sw, -12 - lift, 12.5 * Wd, c);
      ell(ctx, sx * 22 * Wd + sw + sx * 4, -8 - lift, 23, 10, lit(S.shoe, L));
    }
  } else {   // sitting, seen from the front: knees forward and apart, shins down
    for (const sx of [-1, 1]) {
      capsule(ctx, sx * 20 * Wd, hipY + 6, sx * 36 * Wd, hipY + 30, 17 * Wd, lit(sx < 0 ? S.legs : S.legsS, L));
      capsule(ctx, sx * 36 * Wd, hipY + 30, sx * 32 * Wd, -12, 13 * Wd, lit(S.legsS, L));
      ell(ctx, sx * 34 * Wd, -8, 22, 10, lit(S.shoe, L));
    }
  }
  // neck
  capsule(ctx, 0, top + 6, 0, top - 30, 10, lit(S.skinS, L));
  // torso: slim, a little narrower at the waist
  torsoPath(ctx, b); ctx.fillStyle = lit(S.shirt, L); ctx.fill();
  ctx.save(); torsoPath(ctx, b); ctx.clip();
  ctx.fillStyle = lit(S.shirtS, L); ctx.fillRect(tw * 0.38, top - 10, tw, 400); ctx.restore();
  if (p.back) { S.drawBack && S.drawBack(ctx, b, L, p); headBack(ctx, S, b, p, L); }
  else { S.drawTop && S.drawTop(ctx, b, L, p); head(ctx, S, b, p, L); }
  arm(ctx, S, b, -1, p.armL, L, p, false);
  ctx.restore();
}
function torsoPath(ctx, b) {
  const { top, hipY, tw } = b, wt = tw * 0.84, bot = hipY + 16, r = 18;
  ctx.beginPath();
  ctx.moveTo(-tw + r, top); ctx.lineTo(tw - r, top); ctx.quadraticCurveTo(tw, top, tw, top + r);
  ctx.lineTo(wt, bot - 10); ctx.quadraticCurveTo(wt, bot, wt - 10, bot); ctx.lineTo(-wt + 10, bot); ctx.quadraticCurveTo(-wt, bot, -wt, bot - 10);
  ctx.lineTo(-tw, top + r); ctx.quadraticCurveTo(-tw, top, -tw + r, top); ctx.closePath();
}
// the head is drawn in its own unit space (rx 96, ry 116, centre 0,0) and scaled by BODY.headK
function headFrame(ctx, b, p) {
  ctx.save(); ctx.translate(0, b.top - 18 - 53); ctx.scale(BODY.headK, BODY.headK);
  return { cx: p.face * 8, cy: 0, rx: 96, ry: 116, face: p.face, t: p.t || 0 };
}
function headBack(ctx, S, b, p, L) {
  const f = headFrame(ctx, b, { face: 0 }); f.cx = 0;
  ell(ctx, -f.rx + 4, 8, 15, 22, lit(S.skinS, L)); ell(ctx, f.rx - 4, 8, 15, 22, lit(S.skinS, L));
  ell(ctx, 0, 0, f.rx, f.ry, lit(S.skin, L));
  S.drawHeadBack && S.drawHeadBack(ctx, f, L, p);
  ctx.restore();
}

function arm(ctx, S, b, side, [a1, a2], L, p, back) {
  const sx = side * (b.tw - 9), sy = b.sh + 6, l1 = BODY.upper * b.T, l2 = BODY.fore * b.T;
  const ex = sx + side * Math.sin(a1) * l1, ey = sy + Math.cos(a1) * l1;
  const hx = ex + side * Math.sin(a1 + a2) * l2, hy = ey + Math.cos(a1 + a2) * l2;
  const sleeve = back ? (S.sleeveS || S.shirtS) : (S.sleeve || S.shirt);
  capsule(ctx, sx, sy, ex, ey, 11 * b.Wd, lit(sleeve, L));
  capsule(ctx, ex, ey, hx, hy, 9.5 * b.Wd, lit(sleeve, L));
  ell(ctx, hx, hy, 11, 12, lit(back ? S.skinS : S.skin, L));
  if (!back && p.hold === 'phone') phoneProp(ctx, hx + 4, hy - 16, L, p.phoneGlow ?? 1);
  if (!back && p.hold === 'phoneBack') { fillRR(ctx, hx - 17, hy - 50, 34, 64, 6, '#1A1E26'); ell(ctx, hx - 7, hy - 40, 4, 4, '#3A4150'); }
  if (!back && p.hold === 'calc') calcProp(ctx, hx + 2, hy - 18, L);
  if (!back && p.hold === 'flash') { ctx.save(); ctx.translate(hx, hy); ctx.rotate(p.flashRot ?? -0.4); fillRR(ctx, -6, -44, 18, 50, 6, lit('#2A2F38', L)); fillRR(ctx, -9, -54, 24, 14, 5, lit('#3A4150', L)); ell(ctx, 3, -56, 10, 4, '#FFE7B8'); ctx.restore(); }
  if (!back && p.hold === 'fuelcan') fuelCanProp(ctx, hx, hy, L, p.canTilt || 0);
  if (!back && p.hold === 'can') { fillRR(ctx, hx - 13, hy - 38, 26, 34, 6, lit(P.can1, L)); fillRR(ctx, hx - 13, hy - 30, 26, 9, 2, lit(P.off, L)); }
}

function head(ctx, S, b, p, L) {
  const f = headFrame(ctx, b, p), cy = 0;
  S.drawHairBack && S.drawHairBack(ctx, f, L);
  ell(ctx, -f.rx + 4 + p.face * 8, cy + 8, 15, 22, lit(S.skinS, L));
  ell(ctx, f.rx - 4 + p.face * 8, cy + 8, 15, 22, lit(S.skinS, L));
  // skull: an oval with a narrower jaw, one shadow plane
  facePath(ctx, f); ctx.fillStyle = lit(S.skin, L); ctx.fill();
  ctx.save(); facePath(ctx, f); ctx.clip();
  ell(ctx, f.cx + 66, cy + 60, f.rx, f.ry, lit(S.skinS, L)); ctx.restore();
  S.drawHair && S.drawHair(ctx, f, L);
  const ex = 34, ey = cy + 4, fx = p.face * 22;
  for (const s of [-1, 1]) {
    const x = fx + s * ex, open = 1 - clamp(p.blink);
    if (open > 0.15) {
      ell(ctx, x, ey, 15, 18 * open, lit(P.white, L, 0.5));
      ell(ctx, x + p.look[0] * 5, ey + p.look[1] * 6 * open, 7.5, 7.5 * Math.min(1, open * 1.3), lit(P.ink, L, 0.3));
    } else fillRR(ctx, x - 13, ey - 2, 26, 5, 2.5, lit(S.skinS, L));
    const by = ey - 32 - p.brows * 9, tilt = s * p.brows * -0.12 + (p.browTilt || 0) * s;
    ctx.save(); ctx.translate(x, by); ctx.rotate(tilt); fillRR(ctx, -14, -4, 28, 8, 4, lit(S.brow || '#2A2420', L)); ctx.restore();
  }
  ell(ctx, fx + 4, ey + 36, 9, 7, lit(S.skinS, L));
  mouth(ctx, fx, cy + 68, p.mouth, L, S);
  S.drawFace && S.drawFace(ctx, f, L, p);
  S.drawHat && S.drawHat(ctx, f, L, p);
  ctx.restore();
}
function facePath(ctx, f) {
  // oval skull tapering to a soft chin: no round cheeks
  const { cx, rx, ry } = f;
  ctx.beginPath();
  ctx.moveTo(cx - rx, -10);
  ctx.bezierCurveTo(cx - rx, -ry * 0.75, cx - rx * 0.6, -ry, cx, -ry);
  ctx.bezierCurveTo(cx + rx * 0.6, -ry, cx + rx, -ry * 0.75, cx + rx, -10);
  ctx.bezierCurveTo(cx + rx, ry * 0.5, cx + rx * 0.45, ry, cx, ry);
  ctx.bezierCurveTo(cx - rx * 0.45, ry, cx - rx, ry * 0.5, cx - rx, -10);
  ctx.closePath();
}

function mouth(ctx, x, y, m, L, S) {
  const dark = lit('#5A2A2A', L);
  if (m === 'flat') fillRR(ctx, x - 13, y - 3, 26, 6, 3, dark);
  else if (m === 'smile' || m === 'grin') {
    ctx.beginPath(); ctx.ellipse(x, y - 4, m === 'grin' ? 26 : 18, m === 'grin' ? 16 : 10, 0, 0, Math.PI); ctx.fillStyle = dark; ctx.fill();
    if (m === 'grin') { ctx.beginPath(); ctx.ellipse(x, y - 3, 22, 6, 0, 0, Math.PI); ctx.fillStyle = lit(P.white, L, 0.5); ctx.fill(); }
  } else if (m === 'o') ell(ctx, x, y, 9, 11, dark);
  else if (m === 'open') ell(ctx, x, y, 14, 9, dark);
  else if (m === 'tight') fillRR(ctx, x - 10, y - 2, 20, 4, 2, dark);
}

// ---------- accessories ----------
function hairShort(ctx, f, L, c) {
  // sideburn tufts under the beanie
  fillRR(ctx, f.cx - f.rx + 6, f.cy - 40, 14, 34, 7, lit(c, L));
  fillRR(ctx, f.cx + f.rx - 20, f.cy - 40, 14, 34, 7, lit(c, L));
}
function beanie(ctx, f, L) {
  const y0 = f.cy - 66;
  // dome
  ctx.beginPath(); ctx.ellipse(f.cx, y0, f.rx + 6, f.ry * 0.86, 0, Math.PI, 0); ctx.fillStyle = lit(P.orange, L, 0.7); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.ellipse(f.cx, y0, f.rx + 6, f.ry * 0.86, 0, Math.PI, 0); ctx.clip();
  ell(ctx, f.cx + 64, y0 + 30, f.rx, f.ry, lit(P.orangeS, L, 0.7));
  // knit ribs: flat darker stripes
  for (let i = -4; i <= 4; i++) fillRR(ctx, f.cx + i * 24 - 4, y0 - 100, 8, 100, 4, rgba(P.orangeS, 0.35));
  ctx.restore();
  // cuff
  fillRR(ctx, f.cx - f.rx - 10, y0 - 12, (f.rx + 10) * 2, 40, 18, lit(P.orange, L, 0.7));
  ctx.save(); rr(ctx, f.cx - f.rx - 10, y0 - 12, (f.rx + 10) * 2, 40, 18); ctx.clip();
  ctx.fillStyle = lit(P.orangeS, L, 0.7); ctx.fillRect(f.cx - f.rx - 10, y0 + 16, 300, 20); ctx.fillRect(f.cx + 50, y0 - 12, 100, 60); ctx.restore();
}
function hoodieVest(ctx, b, L, pose) {
  const { top, hipY, tw } = b;
  // hood bunched behind the neck
  ell(ctx, 0, top + 2, tw * 0.62, 15, lit(P.hoodS, L));
  // vest panels
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 18, top + 10); ctx.lineTo(s * (tw - 1), top + 12); ctx.lineTo(s * (tw * 0.86 + 2), hipY + 18); ctx.lineTo(s * 12, hipY + 18); ctx.closePath();
    ctx.fillStyle = lit(s < 0 ? P.navy : P.navyS, L); ctx.fill();
  }
  // hoodie strings
  fillRR(ctx, -8, top + 12, 4, 40, 2, lit(P.off, L, 0.5)); fillRR(ctx, 4, top + 12, 4, 34, 2, lit(P.off, L, 0.5));
  // name tag "NIGHT CREW"
  fillRR(ctx, -34, top + 50, 40, 14, 3, lit(P.white, L, 0.5));
  ctx.fillStyle = lit(P.navy, L); ctx.font = '800 5.4px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('NIGHT CREW', -14, top + 57.5);
  // box cutter clipped to the vest
  fillRR(ctx, tw - 24, top + 80, 10, 30, 3, lit('#D9B44A', L)); fillRR(ctx, tw - 23, top + 75, 8, 9, 2, lit('#8A919C', L));
  // phone in the vest pocket (buzz offsets it)
  if (pose.pocketPhone) {
    const j = pose.buzz ? Math.sin((pose.t || 0) * 140) * 3 : 0;
    fillRR(ctx, -tw + 14 + j, top + 86, 22, 34, 4, lit('#15181F', L));
    if (pose.buzz) fillRR(ctx, -tw + 16 + j, top + 88, 18, 8, 2, rgba('#BFE3FF', 0.9));
  }
}
function bobBack(ctx, f, L) {
  ell(ctx, f.cx, f.cy + 6, f.rx + 22, f.ry + 18, lit(P.grayS, L));
}
function bobFront(ctx, f, L) {
  // crown + side-parted fringe
  ctx.save(); ctx.beginPath(); ctx.ellipse(f.cx, f.cy - 8, f.rx + 16, f.ry + 6, 0, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fillStyle = lit(P.gray, L); ctx.fill(); ctx.restore();
  ell(ctx, f.cx - f.rx + 6, f.cy + 22, 26, 62, lit(P.gray, L));
  ell(ctx, f.cx + f.rx - 6, f.cy + 22, 26, 62, lit(P.grayS, L));
  poly(ctx, [[f.cx - f.rx, f.cy - 30], [f.cx + 30 + f.face * 10, f.cy - f.ry + 4], [f.cx + f.rx * 0.9, f.cy - 44], [f.cx + 10, f.cy - 46]], lit(P.gray, L));
}
function glasses(ctx, f, L) {
  const fx = f.face * 22, y = f.cy + 4;
  for (const s of [-1, 1]) {
    const x = fx + s * 34;
    ctx.save(); ctx.beginPath(); ctx.roundRect(x - 24, y - 19, 48, 38, 11); ctx.roundRect(x - 19, y - 14, 38, 28, 8); ctx.fillStyle = lit('#3A2E2A', L); ctx.fill('evenodd'); ctx.restore();
    fillRR(ctx, x - 19, y - 14, 38, 28, 8, rgba('#DDEBFF', 0.18));
  }
  fillRR(ctx, fx - 11, y - 6, 22, 5, 2.5, lit('#3A2E2A', L));
}
function glassesOnCord(ctx, b, L) {
  // folded glasses hanging at the chest
  fillRR(ctx, -22, b.top + 52, 44, 15, 6, lit('#3A2E2A', L));
  fillRR(ctx, -19, b.top + 54.5, 16, 10, 4, rgba('#DDEBFF', 0.35)); fillRR(ctx, 3, b.top + 54.5, 16, 10, 4, rgba('#DDEBFF', 0.35));
}
function fleece(ctx, b, L, pose) {
  const { top, hipY, tw } = b;
  // collar + zip
  fillRR(ctx, -28, top - 6, 56, 24, 11, lit(P.redS, L));
  fillRR(ctx, -2.5, top + 8, 5, hipY - top, 2.5, lit('#7E2A25', L));
  fillRR(ctx, -5, top + 18, 10, 14, 3, lit(P.gray, L));
  // cord
  if (pose.glasses !== 'on') glassesOnCord(ctx, b, L);
  // belt + key ring at the right hip
  fillRR(ctx, -tw * 0.86, hipY + 2, tw * 1.72, 13, 4, lit('#2B2420', L));
  const jx = pose.jingle ? Math.sin((pose.t || 0) * 38) * 6 * pose.jingle : 0;
  ctx.save(); ctx.translate(tw - 18, hipY + 14); ctx.rotate(jx * 0.03); ctx.scale(0.72, 0.72);
  ctx.beginPath(); ctx.arc(0, 14, 15, 0, Math.PI * 2); ctx.arc(0, 14, 10, 0, Math.PI * 2, true); ctx.fillStyle = lit('#C9CCD1', L); ctx.fill();
  const keyC = ['#D9B44A', '#B7C1CE', '#C99A5A', '#9AA4B2', '#D9B44A'];
  keyC.forEach((c, i) => { ctx.save(); ctx.translate(0, 22); ctx.rotate(-0.7 + i * 0.35 + jx * 0.02 * (i - 2)); fillRR(ctx, -4, 0, 8, 34, 3, lit(c, L)); ell(ctx, 0, 2, 7, 7, lit(c, L)); ctx.restore(); });
  ctx.restore();
}
function hairBuzz(ctx, f, L) {
  ctx.save(); ctx.beginPath(); ctx.ellipse(f.cx, f.cy - 4, f.rx + 2, f.ry + 2, 0, Math.PI * 1.04, Math.PI * 1.96); ctx.lineTo(f.cx + f.rx * 0.8, f.cy - 40); ctx.lineTo(f.cx - f.rx * 0.8, f.cy - 40); ctx.closePath();
  ctx.fillStyle = lit('#1E1915', L); ctx.fill(); ctx.restore();
}
function beard(ctx, f, L) {
  // short beard: jaw band below the nose, cheek strips up to the ears, mouth window open
  ctx.save(); facePath(ctx, f); ctx.clip();
  ctx.beginPath(); ctx.moveTo(f.cx - f.rx, f.cy - 4); ctx.lineTo(f.cx - f.rx + 22, f.cy - 4);
  ctx.quadraticCurveTo(f.cx - 40 + f.face * 24, f.cy + 46, f.cx + f.face * 24, f.cy + 44);
  ctx.quadraticCurveTo(f.cx + 40 + f.face * 24, f.cy + 46, f.cx + f.rx - 22, f.cy - 4); ctx.lineTo(f.cx + f.rx, f.cy - 4);
  ctx.lineTo(f.cx + f.rx, f.cy + f.ry + 4); ctx.lineTo(f.cx - f.rx, f.cy + f.ry + 4); ctx.closePath();
  ctx.fillStyle = lit(P.beard, L); ctx.fill(); ctx.restore();
  ell(ctx, f.cx + f.face * 22, f.cy + 68, 22, 11, lit('#6E4632', L));   // lips window
  fillRR(ctx, f.cx + f.face * 22 - 12, f.cy + 65, 24, 6, 3, lit('#3A1E1A', L));
}
function hivis(ctx, b, L, pose) {
  const { top, hipY, tw } = b;
  // ear defenders resting around the neck
  fillRR(ctx, -tw * 0.55, top - 8, tw * 1.1, 11, 5, lit('#2A2F38', L));
  for (const s of [-1, 1]) { fillRR(ctx, s * tw * 0.55 - 14, top - 20, 28, 34, 11, lit('#C9423A', L)); fillRR(ctx, s * tw * 0.55 - 14 + (s > 0 ? 12 : 0), top - 20, 16, 34, 8, lit('#9E3029', L)); }
  // vest panels
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(s * 16, top + 12); ctx.lineTo(s * (tw + 1), top + 14); ctx.lineTo(s * (tw * 0.86 + 3), hipY + 18); ctx.lineTo(s * 12, hipY + 18); ctx.closePath();
    ctx.fillStyle = lit(s < 0 ? P.hivis : P.hivisS, L); ctx.fill();
    // reflective bands
    for (const yy of [hipY - 80, hipY - 36]) { ctx.save(); ctx.beginPath(); ctx.moveTo(s * 16, yy); ctx.lineTo(s * (tw * 0.9 + 3), yy); ctx.lineTo(s * (tw * 0.9 + 3), yy + 13); ctx.lineTo(s * 14, yy + 13); ctx.closePath(); ctx.fillStyle = lit('#D7DDE3', L); ctx.fill(); ctx.restore(); }
  }
}
function phoneProp(ctx, x, y, L, glow) {
  fillRR(ctx, x - 22, y - 38, 44, 76, 8, '#14171E');
  fillRR(ctx, x - 18, y - 33, 36, 64, 5, mix('#2A3446', '#CFE8FF', glow));
}
function calcProp(ctx, x, y, L) {
  fillRR(ctx, x - 26, y - 36, 52, 72, 8, lit('#3A4150', L));
  fillRR(ctx, x - 20, y - 30, 40, 16, 3, lit('#B9D3B0', L));
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) fillRR(ctx, x - 19 + c * 14, y - 8 + r * 13, 10, 9, 2, lit('#8593A8', L));
}

// ---------- the stranger: only on security camera in Part 1 (grayscale, hood up, face never visible) ----------
// turn: 0 = facing down-left into the bag, 1 = facing the camera (never render past ~0.55)
export function stranger(ctx, x, y, s, t, turn = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const g = v => `rgb(${v},${v},${v})`;
  ell(ctx, 0, 8, 150, 24, 'rgba(0,0,0,0.35)');
  // crossed legs: long shins folded in front
  capsule(ctx, -110, -8, 80, 2, 21, g(58)); capsule(ctx, 110, -12, -70, 6, 21, g(48));
  ell(ctx, -122, -4, 22, 12, g(36)); ell(ctx, 122, -6, 22, 12, g(30));
  // torso, hunched: slim and long
  ctx.save(); ctx.rotate(0.06);
  rr(ctx, -58, -262, 116, 268, 44); ctx.fillStyle = g(74); ctx.fill();
  ctx.save(); rr(ctx, -58, -262, 116, 268, 44); ctx.clip(); ctx.fillStyle = g(60); ctx.fillRect(22, -270, 90, 290); ctx.restore();
  // hood (head): smaller and oval; the opening rotates toward camera as turn rises; the void inside stays black
  const hx = lerp(-22, 0, turn), hy = -318;
  capsule(ctx, 0, -262, hx * 0.3, hy + 30, 26, g(70));
  ell(ctx, hx * 0.3, hy, 52, 60, g(80));
  ctx.save(); ctx.beginPath(); ctx.ellipse(hx * 0.3, hy, 52, 60, 0, 0, Math.PI * 2); ctx.clip(); ell(ctx, hx * 0.3 + 30, hy + 28, 52, 60, g(64)); ctx.restore();
  const ow = lerp(11, 29, turn), oh = lerp(26, 38, turn);
  ell(ctx, hx - 19 * (1 - turn), hy + 12, ow, oh, g(14));
  // thin arm reaching into a torn bag
  const dip = Math.sin(t * 1.3) * 4;
  capsule(ctx, -44, -228, -100, -150, 14, g(70)); capsule(ctx, -100, -150, -118, -98 + dip, 13, g(70));
  ctx.restore();
  // bag of pet food
  poly(ctx, [[-178, -2], [-196, -128], [-150, -150], [-96, -138], [-82, -4]], g(150));
  poly(ctx, [[-196, -128], [-176, -146], [-152, -138], [-130, -152], [-108, -140], [-96, -138], [-150, -150]], g(120));
  fillRR(ctx, -170, -100, 64, 42, 6, g(110));
  ell(ctx, -118, -98 + Math.sin(t * 1.3) * 4, 11, 10, g(88));   // hand inside the tear
  for (let i = 0; i < 14; i++) ell(ctx, -150 + ((i * 37) % 110), 4 + ((i * 13) % 14), 5, 3.5, g(98));
  ctx.restore();
}

// ---------- Ray (revealed in Part 2): the customer who hid at closing ----------
// Gray-green hoodie, hood always up (a soft hood shell around the head), stubble, tired eyes. 6-head rig like the others.
const RAYC = { hood: '#66735F', hoodS: '#505B4A', skin: '#D8A27E', skinS: '#BE8865', legs: '#3B3F47', legsS: '#2E3138' };
export const RAY = {
  id: 'ray', skin: RAYC.skin, skinS: RAYC.skinS, shirt: RAYC.hood, shirtS: RAYC.hoodS, legs: RAYC.legs, legsS: RAYC.legsS, shoe: '#1B1D22',
  tall: 1.02, wide: 0.94,
  drawHairBack(ctx, f, L) { ell(ctx, f.cx, f.cy - 6, f.rx + 20, f.ry + 18, lit(RAYC.hoodS, L)); },
  drawFace(ctx, f, L) { for (let i = 0; i < 16; i++) ell(ctx, f.cx - 34 + (i % 8) * 10, f.cy + 34 + Math.floor(i / 8) * 9, 2.2, 2.2, lit('#7E5E48', L)); ell(ctx, f.cx - 22, f.cy - 2, 13, 4, rgba('#6B4A3A', 0.35)); ell(ctx, f.cx + 22, f.cy - 2, 13, 4, rgba('#6B4A3A', 0.35)); },
  drawHat(ctx, f, L) {
    // hood rim: a thick arc over the brow and down both cheeks
    ctx.save(); ctx.beginPath(); ctx.ellipse(f.cx, f.cy - 4, f.rx + 20, f.ry + 18, 0, 0, Math.PI * 2); ctx.ellipse(f.cx, f.cy + 6, f.rx - 2, f.ry - 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = lit(RAYC.hood, L); ctx.fill('evenodd');
    ctx.beginPath(); ctx.ellipse(f.cx, f.cy - 4, f.rx + 20, f.ry + 18, 0, 0, Math.PI * 2); ctx.ellipse(f.cx, f.cy + 6, f.rx - 2, f.ry - 4, 0, 0, Math.PI * 2); ctx.clip('evenodd');
    ell(ctx, f.cx + 70, f.cy + 30, f.rx + 20, f.ry + 18, lit(RAYC.hoodS, L)); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(f.cx - f.rx - 30, f.cy + f.ry - 22, (f.rx + 30) * 2, 60); ctx.clip(); ell(ctx, f.cx, f.cy + f.ry + 6, f.rx + 6, 20, lit(RAYC.hoodS, L)); ctx.restore();
  },
  drawTop(ctx, b, L) {
    const { top, hipY, tw } = b;
    fillRR(ctx, -tw * 0.62, hipY - 92, tw * 1.24, 62, 14, lit(RAYC.hoodS, L));                 // kangaroo pocket
    fillRR(ctx, -9, top + 10, 4, 46, 2, lit('#C9CCD1', L, 0.5)); fillRR(ctx, 5, top + 10, 4, 40, 2, lit('#C9CCD1', L, 0.5));
    fillRR(ctx, -tw - 1, hipY - 6, tw * 2 + 2, 16, 6, lit(RAYC.hoodS, L));                    // ribbed hem
  },
  drawBack(ctx, b, L) { fillRR(ctx, -b.tw - 1, b.top + 4, b.tw * 2 + 2, b.hipY - b.top + 10, 18, lit(RAYC.hood, L)); fillRR(ctx, b.tw * 0.3, b.top + 4, b.tw * 0.7, b.hipY - b.top + 10, 16, lit(RAYC.hoodS, L)); },
  drawHeadBack(ctx, f, L) { ell(ctx, 0, f.cy - 6, f.rx + 20, f.ry + 18, lit(RAYC.hood, L)); ctx.save(); ctx.beginPath(); ctx.ellipse(0, f.cy - 6, f.rx + 20, f.ry + 18, 0, 0, Math.PI * 2); ctx.clip(); ell(ctx, 66, f.cy + 40, f.rx + 20, f.ry + 18, lit(RAYC.hoodS, L)); ctx.restore(); },
};
// red plastic jerry can (Part 2), hand at the handle; tilt in rad
export function fuelCanProp(ctx, x, y, L = FULL, tilt = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
  fillRR(ctx, -46, 6, 92, 118, 14, lit('#C8463C', L)); fillRR(ctx, 6, 6, 40, 118, 12, lit('#A23530', L));
  fillRR(ctx, -26, -4, 52, 18, 8, lit('#A23530', L));                      // handle
  fillRR(ctx, 30, -14, 12, 28, 4, lit('#2A2F38', L)); ell(ctx, 36, -16, 8, 5, lit('#1A1D23', L));   // spout
  fillRR(ctx, -32, 40, 64, 30, 6, lit('#E9EDF1', L, 0.4));
  ctx.restore();
}
