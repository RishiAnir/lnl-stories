// BULKWAY sets. Each set is built once and takes a lighting state L (FULL / GEN / flicker) — see kit.js lit().
// entrance · aisle (14 dry goods, water, pet food, any stock) · bedding · frozenWall · loadingDock · office · doorGap · monitorScreen
import { P, W, H, ell, fillRR, rr, poly, lit, mix, rgba, hash, clamp, lerp, ss, ei, eo, seg, FULL, GEN, DARK } from './kit.js';

// ---------- weather ----------
// snow particles inside a clip region, wind blowing left→right and down
export function snow(ctx, t, { n = 160, wind = 70, fall = 160, x0 = 0, y0 = 0, w = W, h = H, size = 1, alpha = 0.9 } = {}) {
  for (let i = 0; i < n; i++) {
    const d = 0.35 + hash(i * 3.1) * 0.65;                         // depth: near flakes bigger and faster
    const x = ((hash(i) * w + (wind * d) * t + Math.sin(t * 1.3 + i) * 10) % w + w) % w + x0;
    const y = ((hash(i * 7.7) * h + (fall * d) * t) % h + h) % h + y0;
    ell(ctx, x, y, 3.6 * d * size, 3.6 * d * size, rgba('#F3F6FA', alpha * (0.45 + d * 0.55)));
  }
}

// ---------- front entrance (seen from inside) ----------
// o: { doorOpen px each panel, drift 0..1 snow piled on glass, storm 0..1 whiteout, lamps 0..1, t }
export function entrance(ctx, t, L = FULL, o = {}) {
  const { doorOpen = 0, drift = 0, storm = 0.3, lamps = 1 } = o;
  // back wall + floor
  ctx.fillStyle = lit('#6E7480', L); ctx.fillRect(0, 0, W, 1420);
  ctx.fillStyle = lit('#5E6470', L); ctx.fillRect(0, 0, W, 300);
  ctx.fillStyle = lit(P.floorW, L); ctx.fillRect(0, 1420, W, H - 1420);
  for (let i = 0; i < 6; i++) fillRR(ctx, -40 + i * 220, 1420, 6, H, 0, rgba('#000000', 0.06));
  ell(ctx, 540, 1460, 520, 60, rgba(L.power > 0.5 ? P.warm : P.cold, 0.10));
  // sign header
  fillRR(ctx, 120, 330, 840, 150, 18, lit('#2A3140', L));
  ctx.save(); ctx.font = '400 44px "Archivo Black"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = L.power > 0.5 ? P.warm : mix(P.warm, '#6B7486', 0.75); ctx.fillText('BULKWAY', 540, 380);
  ctx.font = '700 30px Inter'; ctx.fillStyle = L.power > 0.5 ? P.off : '#8C95A6'; ctx.fillText('WAREHOUSE  CLUB', 540, 434); ctx.restore();
  // glass opening: the outside
  const gx = 150, gy = 520, gw = 780, gh = 900;
  ctx.save(); rr(ctx, gx, gy, gw, gh, 6); ctx.clip();
  const sky = ctx.createLinearGradient(0, gy, 0, gy + gh);
  sky.addColorStop(0, mix('#1A2436', '#8E9AAD', storm * 0.8)); sky.addColorStop(1, mix('#3A4860', '#C9D3DE', storm));
  ctx.fillStyle = sky; ctx.fillRect(gx, gy, gw, gh);
  // parking lot: lamp posts, cars as snow lumps
  for (const [lx, ly, s] of [[260, 980, 1], [620, 940, 0.75], [860, 920, 0.6]]) {
    fillRR(ctx, lx - 5 * s, ly, 10 * s, 330 * s + 200, 4, rgba('#1E2633', 0.8 - storm * 0.6));
    const a = lamps * (1 - storm * 0.55);
    ell(ctx, lx, ly, 80 * s, 80 * s, rgba(P.warm, 0.18 * a)); ell(ctx, lx, ly, 18 * s, 10 * s, rgba(P.warm, 0.9 * a));
    poly(ctx, [[lx - 10, ly], [lx + 10, ly], [lx + 110 * s, ly + 420 * s], [lx - 110 * s, ly + 420 * s]], rgba(P.warm, 0.07 * a));
  }
  ctx.fillStyle = mix('#C9D3DE', '#E6ECF2', storm); ctx.fillRect(gx, 1230, gw, 200);
  for (const [cx, cw] of [[300, 180], [560, 160], [790, 170]]) { ell(ctx, cx, 1240, cw / 2, 46, mix('#AEB9C7', '#E1E7EE', storm)); }
  snow(ctx, t, { n: 120 + storm * 200, wind: 90 + storm * 160, fall: 170 + storm * 120, x0: gx, y0: gy, w: gw, h: gh, size: 1 + storm * 0.4 });
  // whiteout veil
  ctx.fillStyle = rgba('#DDE4EC', storm * 0.45); ctx.fillRect(gx, gy, gw, gh);
  // drift piled against the glass
  if (drift > 0) {
    const top = 1420 - drift * 860;
    ctx.beginPath(); ctx.moveTo(gx, 1420);
    for (let x = gx; x <= gx + gw; x += 30) ctx.lineTo(x, top + Math.sin(x * 0.012) * 50 * drift + Math.sin(x * 0.031) * 18);
    ctx.lineTo(gx + gw, 1420); ctx.closePath(); ctx.fillStyle = mix('#E9EEF3', lit('#D4DDE6', L), 0.5); ctx.fill();
    ctx.save(); ctx.clip(); for (let i = 0; i < 9; i++) ell(ctx, gx + hash(i + 40) * gw, top + 80 + hash(i + 9) * 600, 70, 26, rgba('#A9B8C8', 0.35)); ctx.restore();
  }
  ctx.restore();
  // door frames: fixed sidelights + two sliding panels
  const fr = lit('#2E3542', L);
  fillRR(ctx, gx - 22, gy - 22, gw + 44, 22, 4, fr); fillRR(ctx, gx - 22, gy - 22, 22, gh + 22, 4, fr); fillRR(ctx, gx + gw, gy - 22, 22, gh + 22, 4, fr);
  for (const s of [-1, 1]) {
    const x = 540 + s * doorOpen, pw = 300;
    const px = s < 0 ? x - pw : x;
    fillRR(ctx, px, gy, 16, gh, 3, fr); fillRR(ctx, px + pw - 16, gy, 16, gh, 3, fr);
    fillRR(ctx, px, gy + gh - 60, pw, 60, 3, fr);
    fillRR(ctx, px + 30, gy + 30, pw - 60, 30, 8, rgba('#FFFFFF', 0.05));
    // handle bar
    fillRR(ctx, s < 0 ? px + pw - 50 : px + 34, gy + 380, 14, 160, 7, lit('#9AA4B2', L));
  }
  fillRR(ctx, 528 - doorOpen, gy, 24 + doorOpen * 2, gh, 0, rgba('#0B0F16', doorOpen > 0 ? 0 : 0.4));
  // glass sheen
  poly(ctx, [[gx + 40, gy], [gx + 160, gy], [gx + 40, gy + 240]], rgba('#FFFFFF', 0.06));
  // nested carts on the left
  for (let i = 0; i < 3; i++) cart(ctx, 30 + i * 26, 1430, 0.9, L);
}
function cart(ctx, x, y, s, L) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const c = lit('#8A93A3', L), d = lit('#6C7484', L);
  poly(ctx, [[-10, -300], [150, -300], [130, -150], [10, -150]], rgba(lit('#8A93A3', L), 0.55));
  for (let i = 0; i < 6; i++) fillRR(ctx, -8 + i * 27, -300, 5, 150, 2, d);
  fillRR(ctx, -14, -306, 170, 10, 5, c); fillRR(ctx, 0, -150, 140, 10, 5, c);
  fillRR(ctx, 10, -140, 8, 120, 4, d); fillRR(ctx, 120, -140, 8, 120, 4, d);
  ell(ctx, 18, -12, 14, 14, lit('#22262E', L)); ell(ctx, 124, -12, 14, 14, lit('#22262E', L));
  fillRR(ctx, -30, -330, 40, 14, 7, lit(P.red, L));
  ctx.restore();
}

// ---------- aisle (one-point perspective, steel racking to the ceiling) ----------
// o: { stock:'cans'|'water'|'pet'|'mixed', cam:{x,h,z,f,vy}, fixturesOn:(i)=>bool, light:'warm'|'cold'|'cam', back }
const STOCK = {
  cans: [[P.can1, P.off], [P.can2, '#8C5A2B'], [P.can3, P.off], [P.box1, P.box2], ['#7A8FB0', P.off], ['#B9774E', P.box2]],
  water: [[P.water, '#EAF4FB'], ['#8CC0E0', '#F4FAFE'], [P.water, '#DDEBF6']],
  pet: [['#9C7B4E', '#E1C78E'], ['#6E8C5A', '#D8E2B0'], ['#A8574A', '#F0D3B8'], ['#5E7590', '#D6E0EA']],
  mixed: [[P.box1, P.box2], [P.can3, P.off], ['#7A8FB0', P.off], [P.can1, P.off]],
};
export function aisle(ctx, t, L = FULL, o = {}) {
  const cam = Object.assign({ x: 0, h: 1.6, z: 0, f: 760, vy: 820 }, o.cam || {});
  const pr = (X, Y, Z) => { const d = Math.max(0.05, Z - cam.z); return [540 + (X - cam.x) * cam.f / d, cam.vy - (Y - cam.h) * cam.f / d]; };
  const quad = (pts, c) => poly(ctx, pts.map(q => pr(...q)), c);
  const A = 1.75, TOP = 7.0, CEIL = 8.2, BAY = 2.7, NB = 14, Z0 = 0.4;
  const warm = L.power > 0.5;
  const on = o.fixturesOn || (i => warm || i % 2 === 0);
  const stock = STOCK[o.stock || 'cans'];
  // ceiling + back wall
  ctx.fillStyle = lit('#2A303B', L); ctx.fillRect(0, 0, W, cam.vy + 40);
  ctx.fillStyle = lit(P.floorW, L); ctx.fillRect(0, cam.vy, W, H - cam.vy);
  const far = Z0 + NB * BAY;
  quad([[-A - 2, 0, far], [A + 2, 0, far], [A + 2, CEIL, far], [-A - 2, CEIL, far]], lit('#3B414D', L));
  // floor shading: darker toward the racking, light pools under lit fixtures
  quad([[-A, 0, Z0], [A, 0, Z0], [A, 0, far], [-A, 0, far]], lit(P.floorW, L));
  for (const s of [-1, 1]) quad([[s * A, 0, Z0], [s * (A - 0.35), 0, Z0], [s * (A - 0.35), 0, far], [s * A, 0, far]], lit(P.floorW2, L));
  for (let i = NB - 1; i >= 0; i--) {
    if (!on(i)) continue;
    const z = Z0 + (i + 0.5) * BAY, [x, y] = pr(0, 0, z), [, y2] = pr(0, 0, z + 1.2);
    ell(ctx, x, y, (A * 0.8) * cam.f / Math.max(0.3, z - cam.z), Math.max(2, (y - y2) * 0.9), rgba(warm ? '#FFF1D0' : '#C9DAF0', warm ? 0.16 : 0.09));
  }
  // racking, far to near, both sides
  for (let i = NB - 1; i >= 0; i--) {
    const za = Z0 + i * BAY, zb = za + BAY;
    for (const s of [-1, 1]) {
      const X = s * A;
      const levels = o.stock === 'water' ? [0.12, 1.6, 3.1, 4.6, 6.1] : [0.12, 1.7, 3.3, 4.9];
      levels.forEach((Y, li) => {
        const Y2 = (levels[li + 1] ?? TOP) - (o.stock === 'water' ? 0.08 : 0.32);
        // pallets: 3 per bay along the depth
        for (let k = 0; k < 3; k++) {
          const z1 = za + 0.08 + k * BAY / 3, z2 = z1 + BAY / 3 - 0.1;
          const pal = stock[Math.floor(hash(i * 31 + li * 7 + k + (s > 0 ? 100 : 0)) * stock.length)];
          const hgt = Y + (Y2 - Y) * (o.stock === 'water' ? 1 : 0.62 + hash(i * 3 + k + li) * 0.38);
          quad([[X, Y + 0.14, z1], [X, Y + 0.14, z2], [X, hgt, z2], [X, hgt, z1]], lit(pal[0], L));
          // label band / shrink-wrap highlight
          const bandY = Y + 0.14 + (hgt - Y) * 0.42;
          quad([[X, bandY, z1], [X, bandY, z2], [X, bandY + (hgt - Y) * 0.16, z2], [X, bandY + (hgt - Y) * 0.16, z1]], lit(pal[1], L));
          if (o.stock === 'water') for (let r = 1; r < 4; r++) { const yy = Y + 0.14 + (hgt - Y - 0.14) * r / 4; quad([[X, yy, z1], [X, yy, z2], [X, yy + 0.03, z2], [X, yy + 0.03, z1]], lit(P.waterS, L)); }
          // pallet base
          quad([[X, Y, z1], [X, Y, z2], [X, Y + 0.14, z2], [X, Y + 0.14, z1]], lit(P.pallet, L));
        }
        // beam
        quad([[X, Y - 0.02, za], [X, Y - 0.02, zb], [X, Y - 0.14, zb], [X, Y - 0.14, za]], lit(o.light === 'cam' ? '#8C8C8C' : '#C9773A', L, 1));
      });
      // upright
      quad([[X, 0, za - 0.06], [X, 0, za + 0.06], [X, TOP + 0.4, za + 0.06], [X, TOP + 0.4, za - 0.06]], lit(P.rack, L));
      // top overstock: shrink-wrapped pallets to the ceiling
      quad([[X, TOP, za + 0.1], [X, TOP, zb - 0.1], [X, TOP + 0.9, zb - 0.1], [X, TOP + 0.9, za + 0.1]], lit(o.stock === 'water' ? P.water : '#9EA6B3', L));
    }
    // ceiling fixture for this bay
    const z = Z0 + (i + 0.5) * BAY;
    const lc = on(i) ? (warm ? '#FFF4DC' : '#D8E6F8') : lit('#4A5160', L);
    quad([[-0.16, CEIL - 0.3, z - 0.6], [0.16, CEIL - 0.3, z - 0.6], [0.16, CEIL - 0.3, z + 0.6], [-0.16, CEIL - 0.3, z + 0.6]], lc);
    if (on(i)) { const [x, y] = pr(0, CEIL - 0.3, z), r = 0.9 * cam.f / Math.max(0.3, z - cam.z); ell(ctx, x, y, r, r * 0.5, rgba(warm ? P.warm : '#BFD3F0', warm ? 0.10 : 0.06)); }
  }
  // aisle marker sign hanging at the near end
  if (o.sign) {
    const [x, y] = pr(0, CEIL - 1.3, Z0 + 2.2), s = cam.f / Math.max(0.3, Z0 + 2.2 - cam.z);
    fillRR(ctx, x - 0.55 * s, y - 0.35 * s, 1.1 * s, 0.7 * s, 0.06 * s, lit('#2A4A7A', L));
    ctx.save(); ctx.fillStyle = lit(P.off, L, 0.5); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `400 ${0.38 * s}px "Archivo Black"`; ctx.fillText(o.sign, x, y + 0.02 * s); ctx.restore();
  }
}
// screen projection for placing characters inside an aisle (same cam defaults)
export function aisleProj(cam0, X, Y, Z) {
  const cam = Object.assign({ x: 0, h: 1.6, z: 0, f: 760, vy: 820 }, cam0 || {});
  const d = Math.max(0.05, Z - cam.z); return { x: 540 + (X - cam.x) * cam.f / d, y: cam.vy - (Y - cam.h) * cam.f / d, s: cam.f / d };
}

// rolling stair ladder (flat, screen space): platform top at (x, y)
export function ladder(ctx, x, y, s, L = FULL) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const c = lit('#9AA4B2', L), d = lit('#6C7484', L);
  poly(ctx, [[-120, 0], [120, 0], [170, 560], [-150, 560]], rgba('#000000', 0));
  for (const [x1, x2] of [[-110, -150], [110, 170]]) { ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = d; ctx.lineWidth = 22; ctx.beginPath(); ctx.moveTo(x1, 0); ctx.lineTo(x2, 560); ctx.stroke(); ctx.restore(); }
  for (let i = 1; i < 6; i++) fillRR(ctx, -116 - i * 6, i * 92, 240 + i * 12, 16, 6, c);
  fillRR(ctx, -130, -12, 260, 26, 8, c);                               // platform
  fillRR(ctx, -126, -240, 14, 240, 7, d); fillRR(ctx, 112, -240, 14, 240, 7, d);   // handrails
  fillRR(ctx, -126, -246, 252, 14, 7, c);
  for (const wx of [-150, 170]) ell(ctx, wx, 572, 20, 20, lit('#22262E', L));
  ctx.restore();
}

// ---------- bedding aisle (elevation) ----------
export function bedding(ctx, t, L = FULL) {
  ctx.fillStyle = lit('#5C6474', L); ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = lit(P.floorW, L); ctx.fillRect(0, 1360, W, H - 1360);
  // shelves of folded comforters and pillows
  const cols = ['#8FA6C4', '#C9B9A6', '#A8B8A0', '#D7C7D0', '#B4C3D3', '#E1D6C2'];
  for (let r = 0; r < 4; r++) {
    const y = 160 + r * 250;
    fillRR(ctx, 0, y + 190, W, 22, 0, lit('#C9773A', L));
    for (let i = 0; i < 7; i++) {
      const c = cols[Math.floor(hash(r * 11 + i) * cols.length)], x = 20 + i * 152;
      for (let k = 0; k < 3; k++) { fillRR(ctx, x, y + 120 - k * 52, 136, 50, 14, lit(c, L)); fillRR(ctx, x + 70, y + 120 - k * 52, 66, 50, 14, lit(mix(c, '#3A4050', 0.2), L)); }
    }
  }
  fillRR(ctx, 0, 1150, W, 40, 0, lit('#4A5160', L));
  // sign
  fillRR(ctx, 270, 60, 540, 90, 12, lit('#2A4A7A', L));
  ctx.save(); ctx.font = '400 50px "Archivo Black"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = lit(P.off, L, 0.5); ctx.fillText('BEDDING', 540, 106); ctx.restore();
  ell(ctx, 520, 1430, 520, 50, rgba(P.warm, 0.08));
}
// display mattress on its plinth; squash 0..1 when someone lands on it
export function mattress(ctx, x, y, L = FULL, squash = 0) {
  const dip = squash * 22;
  fillRR(ctx, x - 400, y, 800, 70, 10, lit('#4A5160', L));                   // plinth
  ctx.save(); ctx.beginPath(); ctx.moveTo(x - 390, y - 110); ctx.quadraticCurveTo(x, y - 110 + dip * 2, x + 390, y - 110); ctx.lineTo(x + 390, y); ctx.lineTo(x - 390, y); ctx.closePath();
  ctx.fillStyle = lit('#E6E2DA', L); ctx.fill(); ctx.clip(); ctx.fillStyle = lit('#C9C3B8', L); ctx.fillRect(x - 390, y - 40, 780, 40);
  for (let i = 0; i < 9; i++) ell(ctx, x - 340 + i * 85, y - 75 + dip * Math.sin(i / 8 * Math.PI) * 0.6, 6, 4, lit('#BDB6AA', L));
  ctx.restore();
  fillRR(ctx, x - 360, y - 150 + dip * 0.3, 190, 60, 26, lit('#F2F0EC', L)); fillRR(ctx, x - 250, y - 150 + dip * 0.3, 80, 60, 26, lit('#D8D4CC', L));   // pillow
  fillRR(ctx, x + 120, y - 30, 220, 50, 8, lit(P.orange, L, 0.5));                                                                 // price tag
  ctx.save(); ctx.font = '400 28px "Archivo Black"'; ctx.fillStyle = lit(P.white, L, 0.5); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$399.99', x + 230, y - 4); ctx.restore();
}

// ---------- frozen wall (elevation) ----------
// o: { dark: 0..1 sweep of interior lights going out, left → right; humming (visual only) }
export function frozenWall(ctx, t, L = FULL, o = {}) {
  const { dark = 0 } = o;
  ctx.fillStyle = lit('#5A6272', L); ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = lit(P.floorW, L); ctx.fillRect(0, 1480, W, H - 1480);
  fillRR(ctx, 0, 300, W, 120, 0, lit('#2A4A7A', L));
  ctx.save(); ctx.font = '400 64px "Archivo Black"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = lit(P.off, L, 0.5); ctx.fillText('FROZEN FOODS', 540, 362); ctx.restore();
  const N = 5, dw = 250, x0 = -85;
  for (let i = 0; i < N; i++) {
    const x = x0 + i * (dw + 14), y = 450, h = 1030;
    const off = clamp((dark * (N + 1) - i));                          // 0 lit … 1 dark for this door
    const inside = mix(P.freezerIn, '#202836', off), shelf = mix('#BCCBD8', '#2C3444', off);
    fillRR(ctx, x - 8, y - 8, dw + 16, h + 16, 8, lit('#3A4150', L));
    fillRR(ctx, x, y, dw, h, 4, inside);
    // shelves of boxed frozen stock
    for (let r = 0; r < 5; r++) {
      const sy = y + 150 + r * 180;
      fillRR(ctx, x, sy, dw, 10, 2, shelf);
      for (let k = 0; k < 4; k++) {
        const c = ['#4F7FB8', '#C9584A', '#E3D3B2', '#5C8F6E', '#D9B44A'][Math.floor(hash(i * 13 + r * 5 + k) * 5)];
        const bh = 90 + hash(i + r + k * 3) * 50;
        fillRR(ctx, x + 10 + k * 60, sy - bh, 52, bh, 4, mix(c, '#1A2030', 0.15 + off * 0.65));
      }
    }
    // interior light bar
    fillRR(ctx, x + 10, y + 12, dw - 20, 16, 8, mix('#FFFFFF', '#2A3140', off));
    if (off < 1) ell(ctx, x + dw / 2, y + 40, dw * 0.5, 60, rgba('#FFFFFF', 0.25 * (1 - off)));
    // frost on the glass: soft white blooms along the frame
    ctx.save(); rr(ctx, x, y, dw, h, 4); ctx.clip();
    for (let k = 0; k < 14; k++) {
      const fx = x + (hash(i * 50 + k) < 0.5 ? hash(k + i) * 50 : dw - hash(k * 2 + i) * 50), fy = y + hash(i * 9 + k * 4) * h;
      ell(ctx, fx, fy, 40 + hash(k) * 40, 60 + hash(k + 3) * 60, rgba(P.frost, 0.35));
    }
    ell(ctx, x + dw / 2, y + h, dw * 0.7, 120, rgba(P.frost, 0.45));
    poly(ctx, [[x + 20, y], [x + 90, y], [x + 20, y + 300]], rgba('#FFFFFF', 0.08));
    ctx.restore();
    // handle
    fillRR(ctx, x + dw - 34, y + 380, 14, 260, 7, lit('#9AA4B2', L));
  }
  fillRR(ctx, 0, 1480, W, 26, 0, lit('#3A4150', L));
}

// ---------- the 2-inch gap, floor level ----------
// crumble 0..1: snow sifting through; pile grows
export function doorGap(ctx, t, L, crumble = 0) {
  ctx.fillStyle = lit('#3B4455', L); ctx.fillRect(0, 0, W, H);
  // packed snow behind the glass: a wall of white with blue-gray clumps
  ctx.fillStyle = '#DCE3EA'; ctx.fillRect(0, 0, W, 1360);
  for (let i = 0; i < 30; i++) ell(ctx, hash(i) * W, hash(i + 7) * 1360, 60 + hash(i + 3) * 120, 30 + hash(i + 5) * 60, rgba('#9EAEC2', 0.35));
  // glass tint
  ctx.fillStyle = rgba('#2B3647', 0.25); ctx.fillRect(0, 0, W, 1360);
  // two door panels, frames meeting at a 2-inch gap
  const gap = 66, cx = 470;
  fillRR(ctx, cx - gap / 2 - 70, 0, 70, 1380, 0, lit('#2E3542', L));
  fillRR(ctx, cx + gap / 2, 0, 70, 1380, 0, lit('#2E3542', L));
  fillRR(ctx, cx - gap / 2 - 30, 0, 16, 1380, 0, lit('#454E5E', L));
  // the gap itself: snow face, pushing through
  ctx.fillStyle = '#EEF2F6'; ctx.fillRect(cx - gap / 2, 0, gap, 1380);
  // floor
  ctx.fillStyle = lit(P.floorW, L); ctx.fillRect(0, 1380, W, H - 1380);
  fillRR(ctx, 0, 1372, W, 20, 0, lit('#2E3542', L));
  // falling crumbs (deterministic) and the growing pile
  for (let i = 0; i < 26; i++) {
    const ph = ((t * 0.9 + hash(i)) % 1), x = cx + (hash(i * 3) - 0.5) * gap * 0.8 + ph * (hash(i + 9) - 0.5) * 120;
    const y = 1180 + ph * ph * 330;
    if (crumble > hash(i * 5) * 0.8) ell(ctx, x, y, 7 + hash(i) * 9, 6 + hash(i) * 7, rgba('#F3F6FA', 0.95));
  }
  const ph = 30 + crumble * 120;
  ctx.beginPath(); ctx.moveTo(cx - 60 - crumble * 160, 1392); ctx.quadraticCurveTo(cx, 1392 - ph * 1.6, cx + 60 + crumble * 160, 1392); ctx.closePath(); ctx.fillStyle = '#EEF2F6'; ctx.fill();
  ell(ctx, cx + 20, 1392 - ph * 0.3, 40 + crumble * 80, ph * 0.25, rgba('#B9C6D4', 0.6));
}

// ---------- loading dock ----------
// o: { monitorWhite: true }
export function loadingDock(ctx, t, L, o = {}) {
  ctx.fillStyle = lit('#5A606B', L); ctx.fillRect(0, 0, W, H);
  // block wall coursing
  for (let r = 0; r < 26; r++) for (let c = 0; c < 6; c++) fillRR(ctx, c * 200 + (r % 2) * 100 - 100 + 4, r * 60 + 4, 192, 52, 4, lit(hash(r * 7 + c) > 0.5 ? '#626875' : '#5D636F', L));
  ctx.fillStyle = lit(P.floorW2, L); ctx.fillRect(0, 1440, W, H - 1440);
  fillRR(ctx, 0, 1430, W, 20, 0, lit('#C9A23A', L));       // painted dock edge
  // roll-up bay door
  const dx = 380, dy = 380, dw = 760, dh = 1060;
  fillRR(ctx, dx - 30, dy - 60, dw + 60, dh + 60, 6, lit('#3A404C', L));
  for (let i = 0; i < 22; i++) { const y = dy + i * (dh / 22); fillRR(ctx, dx, y, dw, dh / 22 - 6, 3, lit(i % 2 ? '#7D8594' : '#747C8B', L)); }
  fillRR(ctx, dx + dw / 2 - 60, dy + dh - 50, 120, 20, 6, lit('#2E3440', L));
  // snow pushing at the bottom seam
  fillRR(ctx, dx, dy + dh - 8, dw, 10, 0, rgba('#E9EEF3', 0.85));
  // hazard stripes on the bumpers
  for (const bx of [dx - 70, dx + dw + 10]) { fillRR(ctx, bx, 1240, 60, 190, 6, lit('#2A2F38', L)); for (let k = 0; k < 4; k++) fillRR(ctx, bx, 1260 + k * 44, 60, 20, 0, lit('#C9A23A', L)); }
  // camera monitor on the wall (left)
  monitorWall(ctx, 210, 690, 1, L, o.monitorWhite !== false);
  // cage light
  ell(ctx, 210, 260, 34, 22, lit('#2E3440', L)); ell(ctx, 210, 272, 22, 14, L.power > 0.5 ? P.warm : '#CFDDF0');
  ell(ctx, 210, 300, 260, 160, rgba(L.power > 0.5 ? P.warm : '#BFD3F0', 0.07));
  // pallet jack + forklift in the foreground
  palletJack(ctx, 760, 1640, 1, L);
  forklift(ctx, -60, 1600, 1, L);
}
export function monitorWall(ctx, x, y, s, L, white = true) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  fillRR(ctx, -14, -160, 28, 90, 6, lit('#2A2F38', L));                      // mount arm
  fillRR(ctx, -150, -100, 300, 210, 14, lit('#1E2229', L));
  fillRR(ctx, -134, -86, 268, 170, 6, white ? '#F2F5F8' : '#2A3446');
  if (white) { for (let i = 0; i < 6; i++) fillRR(ctx, 90, -70 + i * 26, 22, 3, 1, rgba('#6C7A8E', 0.35)); }
  ell(ctx, 120, 96, 5, 5, '#E04A3A');
  ctx.restore();
}
function forklift(ctx, x, y, s, L) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const body = lit('#D4A23C', L), bodyS = lit('#AE8226', L), dark = lit('#2A2F38', L);
  fillRR(ctx, 330, -620, 26, 600, 6, dark); fillRR(ctx, 370, -620, 26, 600, 6, dark);   // mast
  fillRR(ctx, 330, -40, 200, 18, 4, lit('#3A404C', L));                               // forks
  fillRR(ctx, 20, -300, 320, 230, 30, body); fillRR(ctx, 200, -300, 140, 230, 30, bodyS);
  fillRR(ctx, 40, -560, 18, 270, 6, dark); fillRR(ctx, 280, -560, 18, 270, 6, dark); fillRR(ctx, 40, -570, 258, 20, 8, dark);   // cage
  fillRR(ctx, 110, -390, 90, 100, 14, lit('#2E3440', L));                                                                           // seat
  ell(ctx, 90, -40, 70, 70, dark); ell(ctx, 90, -40, 30, 30, lit('#5A606B', L));
  ell(ctx, 290, -40, 56, 56, dark); ell(ctx, 290, -40, 24, 24, lit('#5A606B', L));
  ctx.restore();
}
function palletJack(ctx, x, y, s, L) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const r = lit('#B94A3C', L), d = lit('#2A2F38', L);
  fillRR(ctx, -20, -30, 420, 26, 6, r);
  fillRR(ctx, -40, -120, 70, 100, 14, r);
  ctx.save(); ctx.translate(-10, -110); ctx.rotate(-0.35); fillRR(ctx, -8, -300, 16, 300, 8, d); fillRR(ctx, -40, -320, 80, 22, 11, d); ctx.restore();
  ell(ctx, 0, -6, 20, 20, d); ell(ctx, 380, -6, 14, 14, d);
  ctx.restore();
}

// ---------- monitor close-up: bay cam buried in snow ----------
export function monitorScreen(ctx, t, L) {
  ctx.fillStyle = lit('#3A404C', L); ctx.fillRect(0, 0, W, H);
  fillRR(ctx, 40, 380, 900, 980, 40, '#16191F');
  fillRR(ctx, 80, 420, 820, 860, 14, '#F1F4F7');
  ctx.save(); rr(ctx, 80, 420, 820, 860, 14); ctx.clip();
  // packed snow texture, very faint
  for (let i = 0; i < 24; i++) ell(ctx, 80 + hash(i) * 820, 420 + hash(i + 5) * 860, 50 + hash(i + 2) * 90, 30 + hash(i + 8) * 50, rgba('#C9D4DF', 0.35));
  // sensor noise
  for (let i = 0; i < 260; i++) { const k = Math.floor(t * 30); ell(ctx, 80 + hash(i + k * 0.37) * 820, 420 + hash(i * 1.7 + k) * 860, 1.6, 1.6, rgba('#7F8A99', 0.4)); }
  // ruler overlay on the left
  for (let f = 0; f <= 8; f++) {
    const y = 1240 - f * 100;
    fillRR(ctx, 100, y, f % 2 ? 26 : 48, 4, 2, rgba('#5E6B7E', 0.55));
    if (f % 2 === 0 && f) { ctx.font = '600 26px "Plex Mono"'; ctx.fillStyle = rgba('#5E6B7E', 0.75); ctx.fillText(`${f} FT`, 160, y + 10); }
  }
  fillRR(ctx, 100, 440, 4, 800, 2, rgba('#5E6B7E', 0.45));
  ctx.font = '600 28px "Plex Mono"'; ctx.fillStyle = rgba('#3E4A5C', 0.8); ctx.fillText('BAY CAM 01', 560, 470);
  if (Math.floor(t * 2) % 2 === 0) ell(ctx, 870, 460, 9, 9, '#E04A3A');
  ctx.restore();
}

// ---------- manager's office ----------
// o: { view:'front'|'grid', gridOn 0..1, feeds(fn), map true }
export function office(ctx, t, L, o = {}) {
  ctx.fillStyle = lit('#5E6573', L); ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = lit('#555B68', L); ctx.fillRect(0, 0, W, 120);
  if (o.view !== 'grid') {
    // printed store map on the wall
    storeMap(ctx, 120, 230, 1, L);
    // wall clock: 04:31
    ell(ctx, 830, 330, 74, 74, lit('#2E3440', L)); ell(ctx, 830, 330, 62, 62, lit(P.off, L, 0.5));
    hand(ctx, 830, 330, 34, (4 + 31 / 60) / 12 * Math.PI * 2, 8, L); hand(ctx, 830, 330, 50, 31 / 60 * Math.PI * 2, 5, L);
    // monitor glow from the side
    const g = ctx.createLinearGradient(0, 0, 500, 0); g.addColorStop(0, rgba('#9FC3FF', 0.10)); g.addColorStop(1, rgba('#9FC3FF', 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
}
export function desk(ctx, y, L, items = true) {
  fillRR(ctx, -20, y, W + 40, 40, 6, lit('#6E5A48', L));
  fillRR(ctx, -20, y + 40, W + 40, H - y, 0, lit('#5A4A3C', L));
  fillRR(ctx, 120, y + 90, 300, 14, 7, lit('#4A3C30', L)); fillRR(ctx, 620, y + 90, 300, 14, 7, lit('#4A3C30', L));
  if (items) {
    fillRR(ctx, 640, y - 40, 70, 60, 10, lit('#E9EDF1', L, 0.6)); fillRR(ctx, 700, y - 26, 26, 30, 12, rgba('#000', 0)); ell(ctx, 712, y - 12, 14, 16, lit('#CFD6DE', L, 0.6));   // mug
    for (let i = 0; i < 3; i++) { ctx.save(); ctx.translate(250 + i * 6, y - 6 - i * 4); ctx.rotate(-0.05 + i * 0.04); fillRR(ctx, -100, -6, 200, 12, 2, lit(P.off, L, 0.5)); ctx.restore(); }
  }
}
function hand(ctx, x, y, len, a, w, L) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); fillRR(ctx, -w / 2, -len, w, len + 6, w / 2, lit('#1E2229', L)); ctx.restore(); }
export function storeMap(ctx, x, y, s, L) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(-0.015);
  fillRR(ctx, 0, 0, 560, 400, 4, lit('#ECEAE4', L, 0.6));
  fillRR(ctx, 20, 20, 520, 360, 2, lit('#DCD8CF', L, 0.6));
  for (let i = 0; i < 12; i++) fillRR(ctx, 40 + i * 40, 60, 22, 220, 2, lit(i === 9 ? '#E2A866' : '#9AA4B2', L, 0.6));
  fillRR(ctx, 40, 300, 200, 60, 2, lit('#9FC3E0', L, 0.6)); fillRR(ctx, 300, 300, 220, 60, 2, lit('#B9B2A6', L, 0.6));
  ctx.font = '700 18px Inter'; ctx.fillStyle = lit('#3A4150', L); ctx.fillText('STORE MAP', 24, 44);
  fillRR(ctx, 240, -12, 70, 26, 3, rgba('#F4E3A1', 0.8));        // tape
  ctx.restore();
}
// the 3x3 camera wall the crew looks at (drawn inside an office "grid" view): uses ui.camGrid for the tiles

// ---------- revision 2 sets ----------
// Water wall: shrink-wrapped water pallets on racking to the ceiling, drawn tall (world height ≈ 3600 px).
// pan: 0 = floor 340 px above the bottom of frame (clear of the TikTok UI) … 1 = ceiling at the top. Returns the floor line in canvas y (to stand people on).
export function waterWall(ctx, t, L = FULL, { pan = 0 } = {}) {
  const WH = 3600, floor = lerp(H - 340, WH + 250, pan);       // canvas y of the floor line (pan 1: ceiling 250 px from the top)
  const Y = v => floor - v;                                      // world height above the floor → canvas y
  ctx.fillStyle = lit('#2A303B', L); ctx.fillRect(0, 0, W, H);
  // ceiling: dark deck, joists, a row of warm fixtures
  const ceil = Y(WH);
  ctx.fillStyle = lit('#20252E', L); ctx.fillRect(0, ceil - 900, W, 900);
  for (let i = 0; i < 9; i++) fillRR(ctx, i * 130 - 20, ceil - 70, 18, 70, 2, lit('#2E3542', L));
  for (const x of [200, 540, 880]) { fillRR(ctx, x - 90, ceil - 40, 180, 22, 6, L.power > 0.5 ? '#FFF4DC' : '#D8E6F8'); ell(ctx, x, ceil - 10, 220, 60, rgba(P.warm, 0.12)); }
  // racking bays
  const BAY = 360, LV = [0, 620, 1240, 1860, 2480, 3100], x0 = -60;
  for (let b = 0; b < 4; b++) {
    const bx = x0 + b * BAY;
    LV.forEach((lv, li) => {
      const next = LV[li + 1] ?? (WH - 40), room = next - lv - 26;
      // two pallets stacked per level, each case-banded and shrink-wrapped
      for (const k of [0, 1]) {
        const ph = room / 2 - 6, py = lv + 26 + k * (ph + 6);
        const px = bx + 22, pw = BAY - 44;
        fillRR(ctx, px, Y(py + 22), pw, 22, 2, lit(P.pallet, L));
        fillRR(ctx, px + 8, Y(py + ph), pw - 16, ph - 22, 10, lit(P.water, L));
        ctx.save(); rr(ctx, px + 8, Y(py + ph), pw - 16, ph - 22, 10); ctx.clip();
        fillRR(ctx, px + pw * 0.62, Y(py + ph), pw, ph, 0, lit(P.waterS, L));
        for (let r = 1; r < 5; r++) fillRR(ctx, px, Y(py + 22 + (ph - 22) * r / 5) - 3, pw, 6, 0, lit('#4F7FA6', L));
        for (let c = 1; c < 4; c++) fillRR(ctx, px + pw * c / 4 - 2, Y(py + ph), 4, ph, 0, rgba('#3E6A90', 0.35));
        poly(ctx, [[px + 20, Y(py + ph)], [px + 70, Y(py + ph)], [px + 20, Y(py + ph * 0.45)]], rgba('#FFFFFF', 0.16));   // wrap sheen
        ctx.restore();
      }
      if (li) fillRR(ctx, bx, Y(lv + 4), BAY, 22, 3, lit('#C9773A', L));          // orange beam
    });
    fillRR(ctx, bx - 12, Y(WH - 40), 24, WH - 40, 4, lit(P.rack, L));           // upright
  }
  fillRR(ctx, x0 + 4 * BAY - 12, Y(WH - 40), 24, WH - 40, 4, lit(P.rack, L));
  // floor
  ctx.fillStyle = lit(P.floorW, L); ctx.fillRect(0, floor, W, H);
  fillRR(ctx, 0, floor, W, 10, 0, lit(P.floorW2, L));
  ell(ctx, 540, floor + 60, 520, 40, rgba(P.warm, 0.10));
  return floor;
}

// Wall clock (analog: hour and minute hands only, no numerals). h, m = the time shown.
export function wallClock(ctx, x, y, r, h, m, L = FULL) {
  ell(ctx, x + 4, y + 8, r + 4, r + 4, 'rgba(6,9,14,0.35)');
  ell(ctx, x, y, r + 10, r + 10, lit('#2E3542', L));
  ell(ctx, x, y, r, r, lit('#E9EDF1', L, 0.6));
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2, big = i % 3 === 0, l = big ? r * 0.2 : r * 0.1, w = big ? r * 0.08 : r * 0.04;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); fillRR(ctx, -w / 2, -r * 0.9, w, l, w / 2, lit('#1E2633', L, 0.6)); ctx.restore();
  }
  const hand = (a, len, w) => { ctx.save(); ctx.translate(x, y); ctx.rotate(a); fillRR(ctx, -w / 2, -len, w, len + w, w / 2, lit('#141A24', L, 0.6)); ctx.restore(); };
  hand(((h % 12) + m / 60) / 12 * Math.PI * 2, r * 0.52, r * 0.11);
  hand(m / 60 * Math.PI * 2, r * 0.78, r * 0.07);
  ell(ctx, x, y, r * 0.08, r * 0.08, lit(P.alert, L, 0.6));
}

// Freezer door close-up, power off: the glass fogs, drips run, a puddle spreads on the floor.
// fog, drip, puddle: 0..1 progress of each stage.
export function freezerDrip(ctx, t, L = GEN, { fog = 0, drip = 0, puddle = 0 } = {}) {
  ctx.fillStyle = lit('#3A4150', L); ctx.fillRect(0, 0, W, H);
  const gx = 120, gy = -40, gw = 760, gh = 1460;
  fillRR(ctx, gx - 40, gy, gw + 80, gh + 50, 18, lit('#4A5160', L));
  // dark interior: shelves of boxed stock
  fillRR(ctx, gx, gy, gw, gh, 8, '#1D2431');
  for (let r = 0; r < 4; r++) {
    const sy = gy + 300 + r * 330;
    fillRR(ctx, gx, sy, gw, 14, 2, '#2C3444');
    for (let k = 0; k < 5; k++) {
      const c = ['#4F7FB8', '#C9584A', '#E3D3B2', '#5C8F6E', '#D9B44A'][Math.floor(hash(r * 7 + k) * 5)];
      const bh = 150 + hash(r + k * 5) * 90;
      fillRR(ctx, gx + 20 + k * 150, sy - bh, 130, bh, 6, mix(c, '#141A24', 0.62));
    }
  }
  // condensation: a milky veil rising from the bottom of the glass, beaded with tiny droplets
  const fz = ss(fog), line = gy + gh - gh * 0.95 * fz;
  const fg = ctx.createLinearGradient(0, line - 160, 0, gy + gh);
  fg.addColorStop(0, rgba('#C9D6E2', 0)); fg.addColorStop(0.25, rgba('#C9D6E2', 0.30 * fz)); fg.addColorStop(1, rgba('#DCE6EF', 0.62 * fz));
  ctx.fillStyle = fg; ctx.fillRect(gx, line - 160, gw, gy + gh - line + 160);
  for (let k = 0; k < 260; k++) {
    const dx = gx + hash(k * 3.1) * gw, dy = gy + gh - hash(k * 7.7) * gh;
    if (dy < line) continue;
    const r = 2 + hash(k * 1.3) * 4;
    ell(ctx, dx, dy, r, r, rgba('#F2F7FB', 0.55 * fz)); ell(ctx, dx + r * 0.3, dy + r * 0.35, r * 0.6, r * 0.5, rgba('#7F92A6', 0.35 * fz));
  }
  // drips: beads that run down the glass, leaving clear trails
  const runs = [[0.22, 0.0], [0.47, 0.25], [0.71, 0.1], [0.33, 0.55], [0.6, 0.7]];
  runs.forEach(([u, d0], i) => {
    const k = clamp((drip - d0 * 0.6) / 0.5); if (k <= 0) return;
    const x = gx + u * gw, y0 = gy + gh * (0.35 + hash(i) * 0.2), y = lerp(y0, gy + gh - 10, ei(k));
    fillRR(ctx, x - 6, y0, 12, Math.max(1, y - y0), 6, rgba('#1D2431', 0.55));
    ell(ctx, x, y, 10, 13, rgba('#E9F6FF', 0.85)); ell(ctx, x - 3, y - 4, 3, 4, rgba('#FFFFFF', 0.9));
  });
  ctx.restore();
  poly(ctx, [[gx + 30, gy], [gx + 140, gy], [gx + 30, gy + 420]], rgba('#FFFFFF', 0.06));
  fillRR(ctx, gx + gw - 70, gy + 520, 22, 380, 11, lit('#9AA4B2', L));
  // kick plate, then the floor
  const fy = gy + gh + 50;
  fillRR(ctx, gx - 40, fy - 40, gw + 80, 40, 4, lit('#2E3542', L));
  ctx.fillStyle = lit(P.floorW, L); ctx.fillRect(0, fy, W, H - fy);
  ell(ctx, 540, fy + 6, 560, 26, rgba('#000000', 0.18));
  // a drop swells at the gasket and falls, about once a second
  if (drip > 0.4) {
    const ph = ((t * 1.1) % 1), dx = gx + gw * 0.47;
    if (ph < 0.55) ell(ctx, dx, fy + 2 + ph * 10, 6 + ph * 2, 6 + ph * 10, rgba('#E9F6FF', 0.9));
    else { const k = (ph - 0.55) / 0.45; ell(ctx, dx, lerp(fy + 8, fy + 180, k * k), 6, 10, rgba('#E9F6FF', 0.9)); }
  }
  // puddle: a flat cold sheet that spreads, with a ring where the drops land
  if (puddle > 0) {
    const p = eo(puddle), cx = gx + gw * 0.47, cy = fy + 190;
    ctx.beginPath();
    for (let a = 0; a <= 64; a++) {
      const th = a / 64 * Math.PI * 2, r2 = (60 + 340 * p) * (1 + 0.12 * Math.sin(th * 3 + 1) + 0.07 * Math.sin(th * 5));
      ctx.lineTo(cx + Math.cos(th) * r2, cy + Math.sin(th) * r2 * 0.22);
    }
    ctx.closePath(); ctx.fillStyle = rgba('#9FB3CC', 0.55); ctx.fill();
    ell(ctx, cx - 60 * p, cy - 10, 150 * p + 20, 12 * p + 3, rgba('#E9F6FF', 0.35));
    const rip = (t * 1.1) % 1;
    ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy - 6, 20 + rip * 120, (20 + rip * 120) * 0.22, 0, 0, Math.PI * 2);
    ctx.ellipse(cx, cy - 6, 14 + rip * 116, (14 + rip * 116) * 0.22, 0, 0, Math.PI * 2); ctx.fillStyle = rgba('#E9F6FF', 0.35 * (1 - rip)); ctx.fill('evenodd'); ctx.restore();
  }
}

// =================== Part 2 sets ===================
// ---------- fire exit: steel door at floor level, snow packed in the seam; kick 0..1 (boot strike), hiss 0..1 ----------
export function fireExit(ctx, t, L, { kick = 0, hiss = 0 } = {}) {
  ctx.fillStyle = lit('#4C5361', L); ctx.fillRect(0, 0, W, H);
  for (let r = 0; r < 26; r++) for (let c = 0; c < 6; c++) fillRR(ctx, c * 200 + (r % 2) * 100 - 100 + 4, r * 60 + 4, 192, 52, 4, lit(hash(r * 5 + c) > 0.5 ? '#525967' : '#4E5563', L));
  ctx.fillStyle = lit(P.floorW2, L); ctx.fillRect(0, 1460, W, H - 1460);
  const shake = kick > 0 && kick < 1 ? Math.sin(kick * 40) * 6 * (1 - kick) : 0;
  ctx.save(); ctx.translate(shake, 0);
  fillRR(ctx, 200, 260, 620, 1210, 6, lit('#2E3440', L));
  fillRR(ctx, 226, 286, 568, 1170, 4, lit('#8E3B34', L));                       // red steel door
  fillRR(ctx, 520, 286, 274, 1170, 4, lit('#7A322C', L));
  fillRR(ctx, 250, 820, 520, 40, 10, lit('#C9CCD1', L));                        // push bar
  fillRR(ctx, 300, 380, 420, 110, 10, lit('#2B6E4A', L));
  ctx.save(); ctx.fillStyle = lit('#E9EDF1', L, 0.5); ctx.font = '400 54px "Archivo Black"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('FIRE EXIT', 510, 437); ctx.restore();
  ctx.restore();
  // snow packed in the seam and fanning across the floor
  fillRR(ctx, 226, 1446, 568, 16, 0, '#E9EEF3');
  for (let i = 0; i < 40; i++) { const ph = (t * 1.3 + hash(i)) % 1, k = hiss * (hash(i * 3) < 0.9 ? 1 : 0); if (k <= 0) continue; ell(ctx, 240 + hash(i * 7) * 540 + ph * (hash(i) - 0.5) * 200, 1462 + ph * 120, 4 + hash(i) * 6, 3, rgba('#F3F6FA', 0.9 * k * (1 - ph))); }
  ell(ctx, 510, 1470, 240 + hiss * 120, 18 + hiss * 16, rgba('#EEF2F6', 0.7 * hiss));
}

// ---------- the bay door raised a foot: white drift in the gap; open 0..1 of one foot ----------
export function bayGap(ctx, t, L, { open = 1, close = false } = {}) {
  ctx.fillStyle = lit('#5A606B', L); ctx.fillRect(0, 0, W, H);
  const dy = 140, gapH = 300 * open;
  // the drift behind: packed white with blue clumps, a thin blade of daylight across the top of the gap
  ctx.fillStyle = '#E3E9EF'; ctx.fillRect(0, 980 - gapH, W, gapH + 20);
  for (let i = 0; i < 18; i++) ell(ctx, hash(i) * W, 980 - gapH + hash(i + 3) * gapH, 50 + hash(i + 5) * 90, 20 + hash(i + 9) * 30, rgba('#A9B8C9', 0.35));
  ctx.fillStyle = rgba('#FFFFFF', 0.55 * open); ctx.fillRect(0, 980 - gapH, W, 10);
  // door slats above the gap
  for (let i = 0; i < 18; i++) { const y = dy + i * 46 - gapH; if (y + 40 < 0) continue; fillRR(ctx, -10, y, W + 20, 40, 3, lit(i % 2 ? '#7D8594' : '#747C8B', L)); }
  fillRR(ctx, -10, 960 - gapH, W + 20, 30, 4, lit('#2E3440', L));
  // floor + sifting snow
  ctx.fillStyle = lit(P.floorW2, L); ctx.fillRect(0, 1000, W, H - 1000);
  fillRR(ctx, 0, 996, W, 18, 0, lit('#C9A23A', L));
  for (let i = 0; i < 30; i++) { const ph = (t * 0.8 + hash(i)) % 1; ell(ctx, hash(i * 5) * W, 1010 + ph * 260, 5 + hash(i) * 7, 4, rgba('#F3F6FA', 0.8 * open * (1 - ph))); }
}

// ---------- the drift freezer: pallets of shrink-wrapped chicken packed into a snow tunnel; n pallets in place, slide 0..1 for the next ----------
function chickenPallet(ctx, x, y, s, L) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  fillRR(ctx, -150, -24, 300, 26, 4, lit(P.pallet, L));
  fillRR(ctx, -140, -230, 280, 208, 14, lit('#E7D6C4', L));
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) fillRR(ctx, -128 + c * 66, -218 + r * 66, 58, 56, 8, lit(hash(r * 4 + c) > 0.5 ? '#F0D9C2' : '#E5C9AE', L));
  ctx.fillStyle = rgba('#FFFFFF', 0.18); ctx.fillRect(-140, -230, 70, 208);                     // shrink-wrap sheen
  fillRR(ctx, -60, -150, 120, 40, 6, lit('#C9584A', L));
  ctx.restore();
}
export function driftTunnel(ctx, t, L, { n = 1, slide = 0, pull = 0 } = {}) {
  ctx.fillStyle = '#C9D3DE'; ctx.fillRect(0, 0, W, H);
  ctx.save(); const z = 1 - pull * 0.45; ctx.translate(540, 1000); ctx.scale(z, z); ctx.translate(-540, -1000);
  // snow walls of the tunnel, receding
  for (let i = 0; i < 7; i++) { const k = i / 7, y = 600 + k * 340; ell(ctx, 540, y, 1200 - k * 900, 520 - k * 330, mix('#EEF2F6', '#AFBCCB', k)); }
  ell(ctx, 540, 960, 240, 140, '#8796A8');
  // pallets packed along the tunnel, far to near
  for (let i = Math.min(n, 6) - 1; i >= 0; i--) { const k = i / 6, side = i % 2 ? 1 : -1; chickenPallet(ctx, 540 + side * (130 + (1 - k) * 260), 1020 + (1 - k) * 520, 0.45 + (1 - k) * 0.85, L); }
  // the pallet being shoved in: slides from the bottom of frame into its slot
  if (slide > 0 && slide < 1) chickenPallet(ctx, 540, lerp(2300, 1640, eo(slide)), 1.3, L);
  // snow piling over the tops
  for (let i = 0; i < 20; i++) ell(ctx, hash(i) * W, 620 + hash(i + 4) * 300, 90 + hash(i + 2) * 120, 40 + hash(i + 6) * 50, rgba('#F3F6FA', 0.7));
  ctx.restore();
  ctx.fillStyle = rgba('#9FB3CC', 0.12); ctx.fillRect(0, 0, W, H);
}

// ---------- the generator against the dock wall; cough 0..1 (two shudders), dead → no glow ----------
export function generator(ctx, t, L, { cough = 0, dead = false } = {}) {
  ctx.fillStyle = lit('#5A606B', L); ctx.fillRect(0, 0, W, H);
  for (let r = 0; r < 26; r++) for (let c = 0; c < 6; c++) fillRR(ctx, c * 200 + (r % 2) * 100 - 100 + 4, r * 60 + 4, 192, 52, 4, lit(hash(r * 3 + c) > 0.5 ? '#626875' : '#5D636F', L));
  ctx.fillStyle = lit(P.floorW2, L); ctx.fillRect(0, 1380, W, H - 1380);
  const sh = (cough > 0.15 && cough < 0.3) || (cough > 0.45 && cough < 0.6) ? Math.sin(t * 90) * 7 : 0;
  ctx.save(); ctx.translate(sh, 0);
  fillRR(ctx, 120, 760, 840, 640, 30, lit('#2F6B4F', L)); fillRR(ctx, 560, 760, 400, 640, 30, lit('#265840', L));
  for (let i = 0; i < 7; i++) fillRR(ctx, 200 + i * 70, 860, 40, 260, 12, lit('#1E4835', L));                // vents
  fillRR(ctx, 640, 860, 240, 150, 14, lit('#1A1E26', L));                                               // panel
  ell(ctx, 700, 935, 22, 22, dead ? lit('#3A4150', L) : '#57E08A'); ell(ctx, 790, 935, 22, 22, cough > 0.2 && !dead && Math.floor(t * 8) % 2 ? P.alert : lit('#3A4150', L));
  fillRR(ctx, 860, 640, 40, 140, 10, lit('#2A2F38', L)); fillRR(ctx, 830, 600, 100, 50, 14, lit('#2A2F38', L));   // exhaust
  ctx.restore();
  // exhaust puffs on each cough
  for (const [a, b] of [[0.15, 0.4], [0.45, 0.7]]) { const k = seg(cough, a, b); if (k > 0 && k < 1) ell(ctx, 880 + k * 40, 560 - k * 200, 40 + k * 90, 30 + k * 70, rgba('#2A2F38', 0.55 * (1 - k))); }
  fillRR(ctx, 120, 1390, 840, 14, 6, 'rgba(10,14,22,0.35)');
}
// red alarm beacon over the freezers (Part 2): on 0..1
export function alarmBeacon(ctx, t, x, y, on = 1) {
  const blink = on * (0.5 + 0.5 * Math.sin(t * 12));
  fillRR(ctx, x - 26, y - 40, 52, 48, 10, '#2A2F38');
  ell(ctx, x, y - 40, 30, 26, mix('#5A1E1A', '#FF3B2E', blink));
  if (blink > 0.1) { const g = ctx.createRadialGradient(x, y - 40, 10, x, y - 40, 420); g.addColorStop(0, rgba('#FF3B2E', 0.35 * blink)); g.addColorStop(1, rgba('#FF3B2E', 0)); ctx.fillStyle = g; ctx.fillRect(x - 420, y - 460, 840, 840); }
}

// =================== Part 2 (rework) sets ===================
// ---------- the nest on top of the racking in aisle 22, seen from shelf level; reveal 0..1 (flashlight pan) ----------
export function nest(ctx, t, L, { reveal = 1 } = {}) {
  ctx.fillStyle = lit('#2A303B', L); ctx.fillRect(0, 0, W, H);
  // ceiling joists and a dead fixture above
  for (let i = 0; i < 6; i++) fillRR(ctx, -40 + i * 220, 0, 40, 420, 4, lit('#353C49', L));
  fillRR(ctx, 0, 380, W, 50, 0, lit('#3B414D', L));
  // the top shelf deck (overstock level): beam edge in orange, deck receding
  poly(ctx, [[0, 1180], [W, 1120], [W, H], [0, H]], lit('#4F6E91', L));
  fillRR(ctx, 0, 1150, W, 34, 0, lit('#C9773A', L));
  // sleeping bag: gray, rumpled, one end hanging over the beam
  ctx.save(); ctx.translate(300, 1180);
  poly(ctx, [[-260, -60], [140, -110], [240, -40], [220, 30], [-220, 60]], lit('#6E7480', L));
  poly(ctx, [[-200, -40], [120, -80], [180, -40], [-160, 20]], lit('#5D636E', L));
  poly(ctx, [[-260, -20], [-200, 40], [-230, 300], [-300, 320], [-320, 60]], lit('#666C78', L));   // hanging end
  ell(ctx, -60, -70, 90, 34, lit('#7C8290', L));                                                   // pillow of hoodies
  ctx.restore();
  // stacked cans
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4 - r; c++) { const x = 640 + c * 64 + r * 32, y = 1140 - r * 74; fillRR(ctx, x, y - 70, 56, 70, 8, lit(['#C9584A', '#D9B44A', '#5C8F6E'][(r + c) % 3], L)); fillRR(ctx, x, y - 48, 56, 18, 2, lit(P.off, L, 0.5)); }
  // folded store hoodies, orange tags
  for (let i = 0; i < 3; i++) { const y = 1140 - i * 40; fillRR(ctx, 880, y - 40, 170, 40, 10, lit(i % 2 ? P.navyS : P.navy, L)); fillRR(ctx, 1010, y - 36, 22, 30, 4, lit(P.orange, L)); }
  // flashlight lying on its side
  ctx.save(); ctx.translate(560, 1230); ctx.rotate(0.2); fillRR(ctx, -60, -14, 110, 28, 10, lit('#2A2F38', L)); fillRR(ctx, 46, -18, 26, 36, 6, lit('#3A4150', L)); ctx.restore();
  // the beam pans across from left to right: everything outside it stays dark
  darknessPan(ctx, reveal);
}
function darknessPan(ctx, k) {
  const x = lerp(-200, 1100, k);
  const g = ctx.createRadialGradient(x, 1100, 40, x, 1100, 820); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.6, 'rgba(3,5,10,0.25)'); g.addColorStop(1, 'rgba(3,5,10,0.6)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// ---------- the notebook: three handwritten columns; your column is a doodle of an orange beanie ----------
// focus: 0 = whole page, 1 = close on Dana's column with the code; thumb 0..1 slides off the digits
export function notebook(ctx, t, L, { focus = 0, thumb = 1 } = {}) {
  ctx.fillStyle = '#0B0E13'; ctx.fillRect(0, 0, W, H);
  ctx.save();
  const s = lerp(1, 1.8, focus), fx = lerp(540, 260, focus), fy = lerp(960, 780, focus);
  ctx.translate(540, 960); ctx.scale(s, s); ctx.translate(-fx, -fy);
  ctx.save(); ctx.translate(540, 980); ctx.rotate(-0.03);
  fillRR(ctx, -430, -620, 860, 1180, 18, '#E9E4D6'); fillRR(ctx, -430, -620, 860, 1180, 18, 'rgba(0,0,0,0.04)');
  for (let i = 0; i < 26; i++) fillRR(ctx, -430, -520 + i * 42, 860, 2, 1, 'rgba(90,120,170,0.35)');
  fillRR(ctx, -340, -620, 3, 1180, 1, 'rgba(200,70,60,0.45)');
  for (let i = 0; i < 14; i++) ell(ctx, -405, -580 + i * 84, 11, 11, '#0B0E13');             // spiral holes
  const ink = '#2A3550', hand = (s_, x, y, size = 40) => { ctx.save(); ctx.font = `italic 600 ${size}px Inter`; ctx.fillStyle = ink; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.translate(x, y); ctx.rotate(-0.02); ctx.fillText(s_, 0, 0); ctx.restore(); };
  hand('DANA', -300, -530, 46); hand('MARCUS', -20, -530, 46);
  // the beanie doodle as the third heading (orange pencil)
  ctx.save(); ctx.translate(310, -548);
  ctx.beginPath(); ctx.ellipse(0, 0, 58, 42, 0, Math.PI, 0); ctx.fillStyle = '#F28C28'; ctx.fill();
  fillRR(ctx, -64, -6, 128, 20, 6, '#C86A14'); for (let i = -2; i <= 2; i++) fillRR(ctx, i * 20 - 3, -38, 5, 34, 2, 'rgba(200,106,20,0.6)');
  ctx.restore();
  fillRR(ctx, -300, -505, 720, 3, 1, ink);
  const rows = ['Mon 10p-6a', 'Tue 10p-6a', 'Thu 10p-6a', 'Fri 10p-6a', 'Sat 10p-6a', 'Sun 10p-6a'];
  rows.forEach((r_, i) => { hand(r_, -300, -440 + i * 84, 32); if (i % 2 === 0) hand(r_, -20, -440 + i * 84, 32); if (i !== 2) hand(r_, 250, -440 + i * 84, 32); });
  // Dana's code: four digits under her column, a thumb covers them until it slides away
  hand('4 1 7 9', -300, 130, 64);
  if (thumb > 0) ell(ctx, lerp(-210, -520, 1 - thumb), 110, 150, 90, '#E8B48C');
  ctx.restore(); ctx.restore();
}

// ---------- Marcus's climb: low angle up the racking (the climber is drawn by the film) ----------
export function rackingUp(ctx, t, L) {
  ctx.fillStyle = lit('#2A303B', L); ctx.fillRect(0, 0, W, H);
  // one bay seen from the floor, converging upward
  const cx = 540, top = -200;
  for (const s of [-1, 1]) { poly(ctx, [[cx + s * 520, H], [cx + s * 620, H], [cx + s * 170, top], [cx + s * 140, top]], lit(P.rack, L)); }
  for (let i = 0; i < 9; i++) { const y = H - i * 260, k = i / 9, half = lerp(560, 160, k); fillRR(ctx, cx - half, y - 22, half * 2, 22, 4, lit('#C9773A', L)); for (let j = 0; j < 5; j++) fillRR(ctx, cx - half + 20 + j * (half * 2 - 40) / 5, y - 22 - 130 * (1 - k * 0.6), (half * 2 - 40) / 5 - 14, 130 * (1 - k * 0.6), 6, lit(['#C9A24A', '#8A5A2A', '#5C8F6E', '#C9584A'][(i + j) % 4], L)); }
  // the sleeping bag hanging over the top edge
  poly(ctx, [[cx + 40, 140], [cx + 150, 130], [cx + 170, 360], [cx + 100, 380], [cx + 50, 300]], lit('#6E7480', L));
}

// ---------- the fuel can tipped over in a fresh puddle (dock floor, close) ----------
export function fuelSpill(ctx, t, L, { drip = 0 } = {}) {
  ctx.fillStyle = lit(P.floorW2, L); ctx.fillRect(0, 0, W, H);
  ell(ctx, 560, 900, 440, 160, 'rgba(60,70,90,0.55)'); ell(ctx, 520, 890, 320, 110, 'rgba(150,170,200,0.25)');   // the wet puddle, catching light
  ctx.save(); ctx.translate(600, 700); ctx.rotate(Math.PI / 2 - 0.08); ctx.scale(2.8, 2.8);
  fillRR(ctx, -46, 6, 92, 118, 14, lit('#C8463C', L)); fillRR(ctx, 6, 6, 40, 118, 12, lit('#A23530', L));
  fillRR(ctx, -26, -4, 52, 18, 8, lit('#A23530', L)); fillRR(ctx, 30, -14, 12, 28, 4, lit('#2A2F38', L));
  ctx.restore();
  const dy = (t * 1.4 % 1); ell(ctx, 650, 720 + dy * 150, 12, 16, rgba('#B9C6D4', 0.8 * (1 - dy)));
}
