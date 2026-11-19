// SOFT style sets for the train. Gradients and soft shapes only; lots of small lived-in details.
import { W, H, lerp, clamp, mix, rgba, hash } from './kit.js';
import { soft, blob, oval, limb } from './soft.js';

function flat(ctx, c) { ctx.fillStyle = c; ctx.fill(); }
// ---------- across the aisle: back layer (wall, windows, ads, ceiling): draw this blurred ----------
export function acrossBack(ctx, t, { speed = 1300, dark = 0 } = {}) {
  let g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#8E9BB0'); g.addColorStop(0.35, '#7A879E'); g.addColorStop(1, '#4A5368');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // ceiling and the light tube
  g = ctx.createLinearGradient(0, 0, 0, 110); g.addColorStop(0, '#B9C3D2'); g.addColorStop(1, '#8E9AAE'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 110);
  ctx.beginPath(); ctx.roundRect(100, 34, 880, 36, 18); flat(ctx, dark ? '#2A3040' : '#F4FAFF');
  // ads
  const ads = [[30, '#C9564A', '#F3D9D4'], [390, '#3F79B5', '#D8E6F4'], [750, '#4E9A6E', '#DCEFE3']];
  for (const [x, c, l] of ads) { blob(ctx, x, 124, 300, 120, 14, c, 0.8); ctx.beginPath(); ctx.roundRect(x + 20, 146, 150, 20, 6); flat(ctx, rgba(l, 0.9)); ctx.beginPath(); ctx.roundRect(x + 20, 178, 220, 12, 6); flat(ctx, rgba(l, 0.55)); ctx.beginPath(); ctx.roundRect(x + 20, 200, 170, 12, 6); flat(ctx, rgba(l, 0.4)); }
  // windows: black glass, a faint reflection of the lit car, tunnel lights streaking past
  for (const x of [26, 556]) {
    blob(ctx, x - 16, 258, 512, 380, 30, '#6A768C', 0.6);
    ctx.beginPath(); ctx.roundRect(x, 272, 480, 352, 24); ctx.save(); ctx.clip();
    g = ctx.createLinearGradient(x, 272, x + 200, 624); g.addColorStop(0, '#141A26'); g.addColorStop(1, '#070A10'); ctx.fillStyle = g; ctx.fillRect(x, 272, 480, 352);
    ctx.globalAlpha = 0.12; ctx.beginPath(); ctx.roundRect(x + 40, 290, 400, 22, 11); flat(ctx, '#DCE6FF'); ctx.globalAlpha = 1;   // reflected light tube
    if (!dark) for (let i = 0; i < 3; i++) { const px = x + 480 - ((t * speed + i * 520 + hash(i + x) * 300) % 1300) + 300, py = 330 + hash(i + 5) * 240; ctx.beginPath(); ctx.roundRect(px, py, 220 + hash(i) * 160, 6, 3); flat(ctx, rgba('#FFE2B0', 0.5)); }
    ctx.restore();
  }
}
// ---------- the bench (sharp layer, behind the people) ----------
export function acrossBench(ctx) {
  blob(ctx, 0, 610, W, 210, 0, '#3A5688', 0.6);
  for (let i = 0; i < 5; i++) blob(ctx, 18 + i * 214, 622, 194, 186, 34, '#46649A', 1.1);   // seat backs
  blob(ctx, 0, 806, W, 52, 20, '#2E4672', 1);                                                // cushion edge
  let g = ctx.createLinearGradient(0, 856, 0, 1012); g.addColorStop(0, '#141A26'); g.addColorStop(1, '#232B3A'); ctx.fillStyle = g; ctx.fillRect(0, 856, W, 156);
  // floor
  g = ctx.createLinearGradient(0, 1010, 0, H); g.addColorStop(0, '#4A5262'); g.addColorStop(0.4, '#3C4352'); g.addColorStop(1, '#262B36'); ctx.fillStyle = g; ctx.fillRect(0, 1010, W, H - 1010);
  for (let i = 0; i < 26; i++) { ctx.beginPath(); ctx.roundRect(0, 1040 + i * 34, W, 2, 1); flat(ctx, rgba('#FFFFFF', 0.025)); }   // ribbed floor
  // grab poles
  for (const x of [10, 1056]) { ctx.beginPath(); ctx.roundRect(x, 110, 16, 910, 8); const pg = ctx.createLinearGradient(x, 0, x + 16, 0); pg.addColorStop(0, '#F2D68A'); pg.addColorStop(1, '#A8862E'); ctx.fillStyle = pg; ctx.fill(); }
}
// ---------- small things on the floor and seats: a dropped coffee cup, a tote bag, a folded umbrella, a crumpled receipt ----------
export function acrossClutter(ctx, { cup = 1, bag = 1, umbrella = 1 } = {}) {
  if (bag) { ctx.save(); ctx.translate(222, 1010); blob(ctx, -46, -96, 92, 96, 14, '#B8A48A'); ctx.beginPath(); ctx.ellipse(0, -96, 32, 40, 0, Math.PI, 0); ctx.lineWidth = 7; ctx.strokeStyle = '#8E7C64'; ctx.stroke(); ctx.restore(); }
  if (umbrella) { ctx.save(); ctx.translate(1010, 1004); ctx.rotate(0.35); blob(ctx, -14, -190, 28, 190, 12, '#2F3A55'); ctx.beginPath(); ctx.arc(0, -196, 16, Math.PI, 0); ctx.lineWidth = 6; ctx.strokeStyle = '#1C2234'; ctx.stroke(); ctx.restore(); }
  if (cup) { ctx.save(); ctx.translate(700, 1180); ctx.rotate(1.35); blob(ctx, -22, -34, 44, 68, 10, '#E9E2D4'); ctx.beginPath(); ctx.roundRect(-22, -10, 44, 22, 3); flat(ctx, '#7A4A2E'); ctx.restore(); ctx.beginPath(); ctx.ellipse(760, 1196, 60, 12, 0, 0, Math.PI * 2); flat(ctx, rgba('#2A1A10', 0.45)); }
  ctx.beginPath(); ctx.ellipse(420, 1320, 24, 14, 0.4, 0, Math.PI * 2); flat(ctx, '#D8D4C8');
}

// ---------- the sliding doors at the end of the bench (the man in red yanks them): two panels, small windows, warning strip ----------
export function doors(ctx, t, { shake = 0 } = {}) {
  let g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#8E9BB0'); g.addColorStop(1, '#4A5368'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const j = shake ? Math.sin(t * 60) * 6 * shake : 0;
  for (const [x, s] of [[150, -1], [545, 1]]) {
    blob(ctx, x + (s > 0 ? j : -j), 150, 385, 1420, 18, '#A7B1C2', 0.8);
    ctx.beginPath(); ctx.roundRect(x + 50 + (s > 0 ? j : -j), 260, 285, 420, 20); ctx.fillStyle = '#0B0F16'; ctx.fill();
    ctx.beginPath(); ctx.roundRect(x + 30 + (s > 0 ? j : -j), 1400, 325, 40, 6); ctx.fillStyle = '#E8C23A'; ctx.fill();
  }
  ctx.beginPath(); ctx.roundRect(530, 150, 20, 1420, 6); ctx.fillStyle = '#2A3040'; ctx.fill();          // the seam
  blob(ctx, 470 - j, 820, 26, 160, 12, '#C9CCD8'); blob(ctx, 584 + j, 820, 26, 160, 12, '#C9CCD8');       // handles
  ctx.font = '700 30px Inter'; ctx.fillStyle = 'rgba(30,34,46,0.8)'; ctx.textAlign = 'center'; ctx.fillText('DO NOT LEAN ON DOORS', 540, 1520);
  g = ctx.createLinearGradient(0, 1570, 0, H); g.addColorStop(0, '#3C4352'); g.addColorStop(1, '#232833'); ctx.fillStyle = g; ctx.fillRect(0, 1570, W, H - 1570);
}
// ---------- your phone, close, in your hand: 2:14, no signal ----------
export function phoneCU(ctx, t, { time = '2:14', day = 'Thursday', glowK = 1 } = {}) {
  ctx.save(); ctx.translate(540, 1000); ctx.rotate(-0.06);
  blob(ctx, -250, -480, 500, 960, 70, '#15171F', 0.4);
  ctx.beginPath(); ctx.roundRect(-226, -456, 452, 912, 56); const g = ctx.createLinearGradient(0, -456, 0, 456); g.addColorStop(0, '#3A4A78'); g.addColorStop(1, '#141A2C'); ctx.fillStyle = g; ctx.fill();
  ctx.fillStyle = '#E9EDF5'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '600 30px Inter'; ctx.fillText(day, 0, -290);
  ctx.font = '700 150px Inter'; ctx.fillText(time, 0, -170);
  ctx.font = '600 26px Inter'; ctx.textAlign = 'left'; ctx.fillText('No Service', -190, -410);
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.roundRect(110 + i * 18, -400 - i * 8, 12, 10 + i * 8, 3); ctx.fillStyle = 'rgba(233,237,245,0.22)'; ctx.fill(); }
  ctx.restore();
  // your hand holding it from below
  ctx.save(); ctx.translate(540, 1180); ctx.rotate(-0.06);
  blob(ctx, -260, 150, 70, 190, 34, '#E3D8D2'); blob(ctx, 200, 120, 70, 200, 34, '#E3D8D2');   // thumb and fingers on the edges
  ctx.restore();
}

// ---------- the rules sheet in your two hands at the bottom of the frame (POV); open 0..1 unfolds it ----------
export function sheetInHands(ctx, t, open = 1) {
  const h = lerp(120, 520, open), y = 1920 - h - 60;
  ctx.save(); ctx.translate(540, y); ctx.rotate(-0.04);
  blob(ctx, -330, 0, 660, h, 10, '#F1EEE4', 0.5);
  for (let i = 0; i < Math.floor(h / 44) - 1; i++) { ctx.beginPath(); ctx.roundRect(-300, 40 + i * 44, 600, 2, 1); ctx.fillStyle = 'rgba(90,120,180,0.35)'; ctx.fill(); }
  if (open > 0.5) { ctx.font = '600 44px Caveat'; ctx.fillStyle = 'rgba(42,53,82,' + (open - 0.5) * 2 + ')'; ctx.textAlign = 'left'; ctx.fillText('RULES', -280, 34); ctx.font = '600 34px Caveat'; ctx.fillText('1. Do not make eye contact with the other', -280, 80); ctx.fillText('passengers.', -250, 122); }
  ctx.restore();
  for (const sx of [-1, 1]) { limb(ctx, 540 + sx * 420, 2100, 540 + sx * 330, y + h * 0.55, 70, '#5D6878'); oval(ctx, 540 + sx * 320, y + h * 0.5, 62, 54, '#E8DED8'); }
}
// ---------- a hand holding a ticket close-up from the side ----------
export function ticketHand(ctx, x = 260, y = 900) { limb(ctx, -120, y + 420, x - 60, y + 40, 70, '#5D6878'); oval(ctx, x, y, 70, 60, '#E8DED8'); }
