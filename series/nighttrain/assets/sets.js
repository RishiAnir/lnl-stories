// DON'T MISS YOUR STOP sets: the train car (across the aisle and down its length), the route map, the rules sheet,
// tickets. Flat fills only. All take a lighting state L from kit.js (CAR, DARK, PLAT).
import { P, W, H, CAR, DARK, lit, mix, rgba, fillRR, rr, ell, poly, capsule, lerp, clamp, hash, seg, ss } from './kit.js';

export const T = {
  wall: '#B9C4BC', wallS: '#9FAAA2', panel: '#C9D2CB', ceil: '#D5DCD6', tube: '#EAF7EE',
  glass: '#0B0F14', glassR: '#1A222C', frame: '#7E8A84', frameS: '#66716B',
  seat: '#3E5C8A', seatS: '#2F4870', seatEdge: '#24385A', floor: '#5C6460', floorS: '#4E5551', fleck: '#6E7672',
  pole: '#D9B24A', poleS: '#B8932E', strap: '#2A2E34', ring: '#E9EDF1',
  ad1: '#E1574A', ad2: '#F2C230', ad3: '#4A8FC9', ad4: '#5FAF7A', mapBg: '#121820', mapLine: '#E1574A',
};

// tunnel lights streaking past the black windows (moving right to left); speed in px/s
function streaks(ctx, x, y, w, h, t, L, speed = 1400) {
  if (L.dark) return;
  ctx.save(); rr(ctx, x, y, w, h, 18); ctx.clip();
  for (let i = 0; i < 4; i++) {
    const px = x + w - ((t * speed + i * 640 + hash(i) * 400) % (w + 900)) + 300, py = y + h * (0.25 + 0.5 * hash(i + 3));
    fillRR(ctx, px, py, 260 + hash(i + 7) * 200, 5, 2.5, 'rgba(255,236,190,0.35)');
  }
  ctx.restore();
}

// ---------- across the aisle: the opposite wall, black windows, the blue bench. Seated people go on top (feet at y≈1010, s≈1). ----------
// flick 0..1 darkens the car (the tubes stutter); refl: draw faint reflections of whoever sits on our side
export function carAcross(ctx, t, L = CAR, { flick = 0, speed = 1400, ads = true } = {}) {
  const Lf = Object.assign({}, L, { flick: (L.flick || 0) + flick });
  ctx.fillStyle = lit(T.wall, Lf); ctx.fillRect(0, 0, W, H);
  // ceiling + light tube
  fillRR(ctx, 0, 0, W, 96, 0, lit(T.ceil, Lf));
  fillRR(ctx, 120, 30, 840, 34, 17, L.dark ? '#1A1F24' : mix(T.tube, '#3A4A44', Lf.flick * 0.8));
  // ad strip
  fillRR(ctx, 0, 96, W, 150, 0, lit(T.panel, Lf));
  if (ads) {
    const A = [[40, T.ad1, 'MATTRESS SALE'], [400, T.ad3, 'HALLOWAY LINE'], [760, T.ad4, 'SEE SOMETHING?']];
    for (const [x, c, s] of A) { fillRR(ctx, x, 116, 290, 110, 10, lit(c, Lf)); fillRR(ctx, x + 18, 136, 150, 20, 4, lit('#FFFFFF', Lf, 0.4)); fillRR(ctx, x + 18, 166, 220, 12, 4, rgba('#FFFFFF', 0.45)); fillRR(ctx, x + 18, 188, 180, 12, 4, rgba('#FFFFFF', 0.35)); }
  }
  // windows
  for (const x of [30, 560]) {
    fillRR(ctx, x - 14, 254, 504, 372, 26, lit(T.frame, Lf));
    fillRR(ctx, x, 268, 476, 344, 20, T.glass);
    const g = ctx.createLinearGradient(x, 268, x + 476, 612); g.addColorStop(0, 'rgba(120,140,150,0.10)'); g.addColorStop(0.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(120,140,150,0.06)');
    ctx.fillStyle = g; ctx.fillRect(x, 268, 476, 344);
    streaks(ctx, x, 268, 476, 344, t, L, speed);
  }
  // bench: back, cushion, front, the dark under the seat
  fillRR(ctx, 0, 600, W, 210, 0, lit(T.seat, Lf));
  for (let i = 0; i < 5; i++) fillRR(ctx, 20 + i * 214, 612, 190, 186, 26, lit(mix(T.seat, '#FFFFFF', 0.06), Lf));   // seat-back pads
  fillRR(ctx, 0, 800, W, 40, 0, lit(T.seatEdge, Lf));
  fillRR(ctx, 0, 840, W, 34, 0, lit(T.seatS, Lf));
  fillRR(ctx, 0, 874, W, 140, 0, lit('#2A302D', Lf));
  // floor (the aisle), with flecks
  ctx.fillStyle = lit(T.floor, Lf); ctx.fillRect(0, 1010, W, H - 1010);
  for (let i = 0; i < 70; i++) ell(ctx, hash(i) * W, 1030 + hash(i + 50) * 880, 5, 3, lit(T.fleck, Lf));
  // grab poles
  for (const x of [8, 1060]) { fillRR(ctx, x, 96, 16, 920, 8, lit(T.pole, Lf)); fillRR(ctx, x + 9, 96, 7, 920, 4, lit(T.poleS, Lf)); }
}

// ---------- down the car: one-point perspective. carProj(cam, X, Y, Z) places people (metres; X -1.5..1.5, Y up, Z away) ----------
export const CAMLEN = { h: 1.55, vy: 760, f: 900, x: 0 };
export function carProj(cam, X, Y, Z) { const k = cam.f / Z; return { x: 540 + (X - (cam.x || 0)) * k, y: cam.vy + (cam.h - Y) * k, k, s: 1.7 * k / 640 }; }
export function carLength(ctx, t, L = CAR, { cam = CAMLEN, flick = 0, far = 16, doorLit = 0 } = {}) {
  const Lf = Object.assign({}, L, { flick: (L.flick || 0) + flick });
  const p = (X, Y, Z) => carProj(cam, X, Y, Z), q = (X, Y, Z) => { const a = p(X, Y, Z); return [a.x, a.y]; };
  const z0 = 0.6, z1 = far, top = 2.3, wx = 1.5;
  ctx.fillStyle = lit(T.wall, Lf); ctx.fillRect(0, 0, W, H);
  poly(ctx, [q(-wx, top, z0), q(wx, top, z0), q(wx, top, z1), q(-wx, top, z1)], lit(T.ceil, Lf));                    // ceiling
  poly(ctx, [q(-wx, 0, z0), q(wx, 0, z0), q(wx, 0, z1), q(-wx, 0, z1)], lit(T.floor, Lf));                           // floor
  for (const s of [-1, 1]) {
    poly(ctx, [q(s * wx, 0, z0), q(s * wx, top, z0), q(s * wx, top, z1), q(s * wx, 0, z1)], lit(s < 0 ? T.wall : T.wallS, Lf));
    poly(ctx, [q(s * wx, 1.0, z0), q(s * wx, 1.85, z0), q(s * wx, 1.85, z1), q(s * wx, 1.0, z1)], T.glass);            // window band
    for (let z = 2; z < z1; z += 2.4) poly(ctx, [q(s * wx, 1.0, z), q(s * wx, 1.85, z), q(s * wx, 1.85, z + 0.25), q(s * wx, 1.0, z + 0.25)], lit(T.frame, Lf));   // window posts
    poly(ctx, [q(s * wx, 1.9, z0), q(s * wx, 2.2, z0), q(s * wx, 2.2, z1), q(s * wx, 1.9, z1)], lit(T.panel, Lf));      // ad strip
    // benches along both walls
    poly(ctx, [q(s * wx, 0.45, z0), q(s * (wx - 0.45), 0.45, z0), q(s * (wx - 0.45), 0.45, z1), q(s * wx, 0.45, z1)], lit(T.seat, Lf));
    poly(ctx, [q(s * (wx - 0.45), 0, z0), q(s * (wx - 0.45), 0.45, z0), q(s * (wx - 0.45), 0.45, z1), q(s * (wx - 0.45), 0, z1)], lit(T.seatS, Lf));
    poly(ctx, [q(s * wx, 0.45, z0), q(s * wx, 0.95, z0), q(s * wx, 0.95, z1), q(s * wx, 0.45, z1)], lit(T.seat, Lf, 0.9));
  }
  // light tubes
  for (const s of [-1, 1]) for (let z = 1.2; z < z1; z += 1.6) poly(ctx, [q(s * 0.45, top - 0.01, z), q(s * 0.3, top - 0.01, z), q(s * 0.3, top - 0.01, z + 1.1), q(s * 0.45, top - 0.01, z + 1.1)], L.dark ? '#1A1F24' : mix(T.tube, '#2A3632', Lf.flick * 0.85));
  // the end wall and the door to the next car (the last car)
  poly(ctx, [q(-wx, 0, z1), q(wx, 0, z1), q(wx, top, z1), q(-wx, top, z1)], lit(T.wallS, Lf));
  poly(ctx, [q(-0.45, 0, z1), q(0.45, 0, z1), q(0.45, 2.0, z1), q(-0.45, 2.0, z1)], lit(T.frameS, Lf));
  poly(ctx, [q(-0.3, 1.1, z1), q(0.3, 1.1, z1), q(0.3, 1.8, z1), q(-0.3, 1.8, z1)], doorLit ? mix(T.glass, '#3A2A20', doorLit) : '#05070A');
  // poles
  for (let z = 2.5; z < z1; z += 3) for (const s of [-1, 1]) { const a = p(s * 0.95, 0, z), b = p(s * 0.95, top, z); fillRR(ctx, a.x - 7 * a.k / 200, b.y, 14 * a.k / 200, a.y - b.y, 6, lit(T.pole, Lf)); }
}

// ---------- the route map above the doors ----------
// stops: names; at: index of the next stop (it blinks); swap: { i, from, to, k } letters of stop i flicker from one name to another
export function routeMap(ctx, t, L = CAR, { stops = ['Halloway', 'Ninefield', 'Last Light', 'Ash Street', 'Copper Hill'], at = 1, swap = null, glowK = 1 } = {}) {
  ctx.fillStyle = lit(T.panel, L); ctx.fillRect(0, 0, W, H);
  fillRR(ctx, 40, 520, 1000, 420, 30, lit(T.frame, L));
  fillRR(ctx, 64, 544, 952, 372, 22, T.mapBg);
  const y = 700, x0 = 150, dx = 195;
  fillRR(ctx, x0, y - 8, dx * (stops.length - 1), 16, 8, T.mapLine);
  stops.forEach((name, i) => {
    const x = x0 + i * dx, isAt = i === at, on = isAt ? (Math.floor(t * 2.5) % 2 === 0 ? 1 : 0.35) : 1;
    ell(ctx, x, y, isAt ? 26 : 18, isAt ? 26 : 18, rgba('#FFFFFF', on * glowK));
    ell(ctx, x, y, isAt ? 14 : 9, isAt ? 14 : 9, T.mapLine);
    let label = name;
    if (swap && swap.i === i) {   // letters scramble from the old name to the new one
      const n = Math.max(swap.from.length, swap.to.length), k = clamp(swap.k);
      label = Array.from({ length: n }, (_, j) => (j / n < k ? swap.to[j] : (hash(j + Math.floor(t * 18)) > 0.5 ? swap.from[j] : '#%&?*'[Math.floor(hash(j * 7 + Math.floor(t * 18)) * 5)])) || '').join('');
    }
    ctx.save(); ctx.translate(Math.min(Math.max(x, 150), 930), y + (i % 2 ? 70 : -70)); ctx.font = '700 32px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = isAt || (swap && swap.i === i) ? '#FFE2A8' : rgba('#E9EDF1', 0.8); ctx.fillText(label, 0, 0); ctx.restore();
  });
  fillRR(ctx, 64, 544, 952, 46, 22, rgba('#FFFFFF', 0.04));
  ctx.font = '700 28px Inter'; ctx.fillStyle = rgba('#E9EDF1', 0.55); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('NEXT STOP', 96, 868);
}

// ---------- the rules: a folded sheet of lined paper, handwritten (Caveat). show: how many lines are visible; hi: the line that's underlined ----------
export const RULES = [
  'Do not make eye contact with the other passengers.',
  'When the conductor asks for your ticket, smile. Do not speak.',
  'If the lights go out, keep your eyes closed until the doors chime.',
  'Never go into the last car.',
  "If someone calls your name, it isn't them.",
  'Your stop is the one that shows your name on the map. Get off, no matter what is on the platform.',
  'Do not fall asleep again.',
  'If your reflection blinks before you do, look away.',
  "If the passengers start copying you, freeze. Don't move until they go back to their newspapers.",
];
function wrap(ctx, s, maxW) { const out = []; let line = ''; for (const w of s.split(' ')) { const tr = line ? line + ' ' + w : w; if (ctx.measureText(tr).width > maxW && line) { out.push(line); line = w; } else line = tr; } if (line) out.push(line); return out; }
export function rulesSheet(ctx, t, { show = 9, hi = -1, zoom = 0, L = CAR, unfold = 1 } = {}) {
  ctx.fillStyle = lit('#20262B', L); ctx.fillRect(0, 0, W, H);
  ctx.save();
  // zoom: 0 = whole page; > 0 pushes in on the highlighted line
  const s = 1 + zoom * 0.8, fy = hi >= 0 ? 330 + hi * 112 : 900;
  ctx.translate(540, 760); ctx.scale(s, s * lerp(0.2, 1, ss(unfold))); ctx.translate(-540, -lerp(760, fy, clamp(zoom)));
  ctx.save(); ctx.translate(540, 900); ctx.rotate(-0.02);
  fillRR(ctx, -440, -700, 880, 1300, 10, lit('#F1EEE4', L));
  fillRR(ctx, -440, -110, 880, 6, 0, rgba('#000000', 0.06)); fillRR(ctx, -440, 290, 880, 6, 0, rgba('#000000', 0.06));   // fold creases
  for (let i = 0; i < 28; i++) fillRR(ctx, -440, -620 + i * 44, 880, 2, 1, rgba('#5A78B4', 0.35));
  fillRR(ctx, -360, -700, 3, 1300, 1, rgba('#C8463C', 0.45));
  ctx.font = '600 50px Caveat'; ctx.fillStyle = '#2A3552'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillText('RULES', -330, -640);
  let y = -570;
  RULES.forEach((r, i) => {
    ctx.font = '600 40px Caveat';
    const lines = wrap(ctx, `${i + 1}. ${r}`, 700);
    if (i < show) {
      lines.forEach((ln, j) => { ctx.fillStyle = '#2A3552'; ctx.fillText(ln, -330 + (j ? 34 : 0), y + j * 44); });
      if (i === hi) { const w = Math.min(700, ctx.measureText(lines[0]).width); fillRR(ctx, -334, y + 10 + (lines.length - 1) * 44, w, 5, 2, rgba('#C8463C', 0.75)); }
    }
    y += lines.length * 44 + 22;
  });
  ctx.restore(); ctx.restore();
}

// ---------- tickets, close: yours (clean) and June's (punched so many times it's almost lace) ----------
export function ticketCU(ctx, t, { holes = 0, lace = 0, L = CAR, newHole = 0 } = {}) {
  ctx.fillStyle = lit('#1C2228', L); ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(540, 720); ctx.rotate(-0.06);
  const old = lace > 0;
  fillRR(ctx, -300, -170, 600, 340, 16, lit(old ? '#D9CBA0' : '#EFE8CE', L));
  fillRR(ctx, -300, -170, 600, 70, 14, lit(old ? '#9A5A4A' : '#B8434A', L));
  ctx.font = '800 40px Inter'; ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('ONE WAY', -270, -135);
  ctx.font = '600 32px "Plex Mono"'; ctx.fillStyle = '#3A3A40'; ctx.fillText(old ? 'ISSUED  11 · 03 · 1987' : 'ISSUED  TONIGHT', -270, -50);
  ctx.fillText('TO: ____________', -270, 0);
  // holes: yours in a row; June's everywhere
  const n = old ? Math.round(lace * 120) : holes;
  for (let i = 0; i < n; i++) {
    const x = old ? -280 + hash(i * 3.1) * 560 : 120 + i * 50, y = old ? -100 + hash(i * 7.7) * 250 : 90;
    const r = old ? 7 + hash(i) * 4 : i === n - 1 ? 13 * (0.6 + 0.4 * clamp(newHole)) : 13;
    ell(ctx, x, y, r, r, '#1C2228');
  }
  ctx.restore();
}
