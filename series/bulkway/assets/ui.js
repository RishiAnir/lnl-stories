// BULKWAY UI cards, drawn in code, every word spelled exactly as in the series bible.
// Each card takes k (0 → 1 entrance progress) and draws in the safe area (x < 929, y < 1574).
import { P, W, H, fillRR, rr, ell, poly, rgba, mix, clamp, eo, back, seg, hash, lerp } from './kit.js';

const CARD = '#F3F5F8', CARD_T = '#1E2633', CARD_SUB = '#5B6578';
function cardShadow(ctx, x, y, w, h, r) { fillRR(ctx, x + 6, y + 14, w, h, r, 'rgba(6,9,14,0.35)'); }
function txt(ctx, s, x, y, font, c, align = 'left', base = 'alphabetic') { ctx.font = font; ctx.fillStyle = c; ctx.textAlign = align; ctx.textBaseline = base; ctx.fillText(s, x, y); }
// slide up + fade
function enter(ctx, k, dy = 80) { const e = eo(k); ctx.globalAlpha *= clamp(k * 2.5); ctx.translate(0, (1 - e) * dy); }

export const TEXT = {
  bubbleFrom: 'Dana (Mgr)', bubble: "Storm's early. Lock up behind the last customer.",
  alert: ['EMERGENCY ALERT', 'Plows suspended. Shelter in place.'],
  gen: ['GENERATOR FUEL', '3 DAYS'],
  cam06: 'CAM 06 · AISLE 22 · PET FOOD', stamp: '04:37 AM',
  end: ['PART 2', 'Who stayed after close?', "Follow so you don't miss it"],
};

// ---------- text message bubble ----------
export function messageBubble(ctx, k, x = 100, y = 150) {
  if (k <= 0) return [];
  ctx.save(); enter(ctx, k, 120);
  const w = 760, h = 250;
  cardShadow(ctx, x, y, w, h, 40);
  fillRR(ctx, x, y, w, h, 40, 'rgba(243,245,248,0.97)');
  ell(ctx, x + 70, y + 66, 34, 34, P.red); txt(ctx, 'D', x + 70, y + 67, '800 34px Inter', P.white, 'center', 'middle');
  txt(ctx, TEXT.bubbleFrom, x + 124, y + 64, '700 34px Inter', CARD_T, 'left', 'middle');
  txt(ctx, 'now', x + w - 40, y + 64, '500 26px Inter', CARD_SUB, 'right', 'middle');
  fillRR(ctx, x + 36, y + 112, w - 72, 108, 30, '#DCE3EC');
  txt(ctx, "Storm's early. Lock up behind", x + 64, y + 154, '600 34px Inter', CARD_T);
  txt(ctx, 'the last customer.', x + 64, y + 198, '600 34px Inter', CARD_T);
  ctx.restore();
  return [{ id: 'bubble', text: TEXT.bubbleFrom + ' ' + TEXT.bubble, x0: x, y0: y, x1: x + w, y1: y + h }];
}

// ---------- forecast card ----------
// Default placement sits inside the phone (x 110..870) below the lock-screen clock. Part 1 (posted) passed 90, 380 and spilled past the phone edge.
export function countyAlert(ctx, k, x = 144, y = 760) {
  if (k <= 0) return [];
  ctx.save(); const e = back(clamp(k * 1.4), 1.4); ctx.globalAlpha *= clamp(k * 4); ctx.translate(0, (1 - e) * -260);
  const w = 692, h = 300;
  cardShadow(ctx, x, y, w, h, 34);
  fillRR(ctx, x, y, w, h, 34, 'rgba(243,245,248,0.98)');
  ctx.save(); rr(ctx, x, y, w, h, 34); ctx.clip(); ctx.fillStyle = P.alert; ctx.fillRect(x, y, w, 100); ctx.restore();
  // warning triangle
  poly(ctx, [[x + 66, y + 22], [x + 100, y + 80], [x + 32, y + 80]], P.white); fillRR(ctx, x + 63, y + 40, 6, 24, 3, P.alert); ell(ctx, x + 66, y + 71, 3.5, 3.5, P.alert);
  txt(ctx, TEXT.alert[0], x + 124, y + 52, '400 44px "Archivo Black"', P.white, 'left', 'middle');
  txt(ctx, 'Plows suspended.', x + 48, y + 166, '800 54px Inter', CARD_T, 'left', 'middle');
  txt(ctx, 'Shelter in place.', x + 48, y + 236, '700 48px Inter', CARD_SUB, 'left', 'middle');
  ctx.restore();
  return [{ id: 'alert', text: TEXT.alert.join(' '), x0: x, y0: y, x1: x + w, y1: y + h }];
}

// ---------- generator fuel gauge ----------
// fill 0..1 is the needle (3 days ≈ 0.3 of the dial)
export function generatorMeter(ctx, k, fill = 0.3, x = 140, y = 240) {
  if (k <= 0) return [];
  ctx.save(); enter(ctx, k);
  const w = 680, h = 480, cx = x + w / 2, cy = y + 330, R = 210;
  cardShadow(ctx, x, y, w, h, 30); fillRR(ctx, x, y, w, h, 30, CARD);
  txt(ctx, TEXT.gen[0], cx, y + 64, '400 42px "Archivo Black"', CARD_T, 'center', 'middle');
  // dial: red → amber → green bands
  const bands = [[P.alert, 0, 0.25], [P.amber, 0.25, 0.55], [P.go, 0.55, 1]];
  for (const [c, a, b] of bands) { ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI + a * Math.PI, Math.PI + b * Math.PI); ctx.arc(cx, cy, R - 46, Math.PI + b * Math.PI, Math.PI + a * Math.PI, true); ctx.closePath(); ctx.fillStyle = c; ctx.fill(); }
  txt(ctx, 'E', cx - R + 22, cy + 34, '800 30px Inter', CARD_SUB, 'center', 'middle'); txt(ctx, 'F', cx + R - 22, cy + 34, '800 30px Inter', CARD_SUB, 'center', 'middle');
  const a = Math.PI + Math.PI * lerp(1, fill, eo(seg(k, 0.2, 1)));
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(a); fillRR(ctx, -6, -6, R - 20, 12, 6, CARD_T); ctx.restore(); ell(ctx, cx, cy, 18, 18, CARD_T);
  txt(ctx, TEXT.gen[1], cx, cy + 92, '400 64px "Archivo Black"', P.alert, 'center', 'middle');
  ctx.restore();
  return [{ id: 'gen', text: TEXT.gen.join(' '), x0: x, y0: y, x1: x + w, y1: y + h }];
}

// ---------- frozen stock card ----------

// ---------- phone close-up (signal bars + lock screen); the alert lands on top ----------
// Phone lock screen. time/ampm/day are drawn as part of the art (the time of night in a shot instead of a card).
// notif: 0..1 slide-in of a message notification (TEXT.bubbleFrom / TEXT.bubble); alerts are drawn on top by countyAlert().
export function phoneScreen(ctx, t, { bars = 1, x = 110, y = 140, w = 760, h = 1480, glow = 1, time = '4:12', ampm = '', day = 'Tuesday', notif = 0 } = {}) {
  fillRR(ctx, x - 26, y - 26, w + 52, h + 52, 96, '#101318');
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#24314A'); g.addColorStop(1, '#0F1520');
  ctx.save(); rr(ctx, x, y, w, h, 76); ctx.clip(); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = glow;
  // status bar: signal bars, battery
  for (let i = 0; i < 4; i++) fillRR(ctx, x + 70 + i * 26, y + 86 - i * 12, 18, 22 + i * 12, 4, i < bars ? P.white : 'rgba(255,255,255,0.22)');
  fillRR(ctx, x + w - 150, y + 66, 76, 36, 9, 'rgba(255,255,255,0.85)'); fillRR(ctx, x + w - 146, y + 70, 22, 28, 6, P.alert); fillRR(ctx, x + w - 72, y + 76, 6, 16, 3, 'rgba(255,255,255,0.85)');
  txt(ctx, day, x + w / 2, y + 290, '600 44px Inter', 'rgba(255,255,255,0.75)', 'center', 'middle');
  ctx.font = '700 200px Inter'; const tw = ctx.measureText(time).width; ctx.font = '700 64px Inter'; const aw = ampm ? ctx.measureText(ampm).width + 18 : 0;
  txt(ctx, time, x + w / 2 - aw / 2, y + 470, '700 200px Inter', P.white, 'center', 'middle');
  if (ampm) txt(ctx, ampm, x + w / 2 + tw / 2 - aw / 2 + 18, y + 520, '700 64px Inter', P.white, 'left', 'alphabetic');
  fillRR(ctx, x + w / 2 - 110, y + h - 40, 220, 10, 5, 'rgba(255,255,255,0.6)');
  ctx.restore();
  const out = [];
  if (notif > 0) {
    ctx.save(); const e = eo(notif); ctx.globalAlpha *= clamp(notif * 3); ctx.translate(0, (1 - e) * -120);
    const nx = x + 34, ny = y + 640, nw = w - 68, nh = 230;
    fillRR(ctx, nx, ny, nw, nh, 36, 'rgba(236,240,246,0.94)');
    ell(ctx, nx + 62, ny + 62, 30, 30, P.red); txt(ctx, 'D', nx + 62, ny + 63, '800 30px Inter', P.white, 'center', 'middle');
    txt(ctx, TEXT.bubbleFrom, nx + 110, ny + 62, '700 32px Inter', CARD_T, 'left', 'middle');
    txt(ctx, 'now', nx + nw - 34, ny + 62, '500 26px Inter', CARD_SUB, 'right', 'middle');
    txt(ctx, "Storm's early. Lock up behind", nx + 40, ny + 140, '600 34px Inter', CARD_T);
    txt(ctx, 'the last customer.', nx + 40, ny + 186, '600 34px Inter', CARD_T);
    ctx.restore();
    out.push({ id: 'bubble', text: TEXT.bubbleFrom + ' ' + TEXT.bubble, x0: nx, y0: ny, x1: nx + nw, y1: ny + nh });
  }
  return out;
}
export function camGrid(ctx, t, rect, feeds, o = {}) {
  const { on = 1, hi = 0, expand = 0 } = o;
  const { x, y, w, h } = rect, gap = 10, tw = (w - gap * 4) / 3, th = (h - gap * 4) / 3;
  fillRR(ctx, x, y, w, h, 14, '#0B0E13');
  const out = [];
  for (let i = 0; i < 9; i++) {
    const r = Math.floor(i / 3), c = i % 3, idx = i + 1;
    let tx = x + gap + c * (tw + gap), ty = y + gap + r * (th + gap), tW = tw, tH = th;
    if (idx === 6) continue;
    const lit_ = clamp(on * 9 - i * 0.6);                              // tiles light in sequence
    camTile(ctx, t, tx, ty, tW, tH, feeds[i], `CAM ${String(idx).padStart(2, '0')}`, lit_);
  }
  // CAM 06 last, so it can expand over the others
  const r = 1, c = 2;
  let tx = x + gap + c * (tw + gap), ty = y + gap + r * (th + gap);
  const e = eo(expand);
  const X = lerp(tx, x, e), Y = lerp(ty, y, e), WW = lerp(tw, w, e), HH = lerp(th, h, e);
  camTile(ctx, t, X, Y, WW, HH, feeds[5], TEXT.cam06, clamp(on * 9 - 5 * 0.6), e);
  if (hi > 0) { ctx.save(); ctx.globalAlpha = hi * (0.75 + 0.25 * Math.sin(t * 10)); ctx.beginPath(); ctx.roundRect(X - 6, Y - 6, WW + 12, HH + 12, 10); ctx.roundRect(X + 2, Y + 2, WW - 4, HH - 4, 6); ctx.fillStyle = P.orange; ctx.fill('evenodd'); ctx.restore(); }
  // timestamp across the wall
  if (on > 0.5) { fillRR(ctx, x + w - 210, y - 56, 210, 46, 8, 'rgba(11,14,19,0.9)'); txt(ctx, TEXT.stamp, x + w - 105, y - 33, '600 30px "Plex Mono"', '#E9EDF1', 'center', 'middle'); out.push({ id: 'stamp', text: TEXT.stamp, x0: x + w - 210, y0: y - 56, x1: x + w, y1: y - 10, pass: true }); }
  return out;
}
const tileCache = new Map();
function camTile(ctx, t, x, y, w, h, feed, label, lit_ = 1, big = 0) {
  ctx.save(); rr(ctx, x, y, w, h, 6); ctx.clip();
  ctx.fillStyle = '#0B0E13'; ctx.fillRect(x, y, w, h);
  if (lit_ > 0 && feed) {
    // draw the feed at 540×960 into an offscreen canvas, then grayscale it into the tile
    let oc = tileCache.get(feed); if (!oc) { oc = new OffscreenCanvas(540, 960); tileCache.set(feed, oc); }
    const o = oc.getContext('2d'); o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, 540, 960); o.scale(0.5, 0.5); feed(o, t); o.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = lit_; ctx.filter = 'grayscale(1) contrast(1.15) brightness(0.92)';
    const s = Math.max(w / 540, h / 960); ctx.drawImage(oc, x + (w - 540 * s) / 2, y + (h - 960 * s) / 2, 540 * s, 960 * s);
    ctx.filter = 'none';
    // grain + scanlines
    const k = Math.floor(t * 15);
    for (let i = 0; i < 40 + big * 360; i++) { const a = hash(i * 1.3 + k * 7.1); ctx.fillStyle = a > 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.16)'; ctx.fillRect(x + hash(i + k) * w, y + hash(i * 2.1 + k) * h, 2 + big * 2, 2 + big * 2); }
    ctx.fillStyle = 'rgba(0,0,0,0.10)'; for (let yy = y; yy < y + h; yy += 4 + big * 2) ctx.fillRect(x, yy, w, 1 + big);
    ctx.globalAlpha = 1;
  }
  const fs = lerp(15, 34, big);
  ctx.font = `600 ${fs}px "Plex Mono"`; const lw = ctx.measureText(label).width;
  fillRR(ctx, x + 8, y + 8, lw + 16, fs + 12, 4, 'rgba(11,14,19,0.75)');
  txt(ctx, label, x + 16, y + 14 + fs / 2, `600 ${fs}px "Plex Mono"`, '#E9EDF1', 'left', 'middle');
  ctx.restore();
}

// full-screen camera view with timestamp + REC (CAM 06)
export function camFull(ctx, t, feed, label, stampSecs = 0) {
  camTile(ctx, t, 0, 0, W, H, feed, '', 1, 1);
  const out = [];
  fillRR(ctx, 48, 120, 620, 64, 8, 'rgba(11,14,19,0.75)');
  txt(ctx, label, 70, 152, '600 34px "Plex Mono"', '#E9EDF1', 'left', 'middle');
  fillRR(ctx, 48, 196, 230, 60, 8, 'rgba(11,14,19,0.75)');
  txt(ctx, TEXT.stamp, 70, 226, '600 34px "Plex Mono"', '#E9EDF1', 'left', 'middle');
  const ss = String(Math.floor(stampSecs) % 60).padStart(2, '0');
  fillRR(ctx, 48, 268, 230, 50, 8, 'rgba(11,14,19,0.6)');
  if (Math.floor(t * 2) % 2 === 0) ell(ctx, 76, 293, 10, 10, P.alert);
  txt(ctx, `REC  :${ss}`, 98, 294, '600 28px "Plex Mono"', '#E9EDF1', 'left', 'middle');
  out.push({ id: 'camlabel', text: label, x0: 48, y0: 120, x1: 668, y1: 184 }, { id: 'stamp', text: TEXT.stamp, x0: 48, y0: 196, x1: 278, y1: 256 });
  return out;
}

// ---------- end card ----------
export function endCard(ctx, k) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (k <= 0) return [];
  ctx.save(); ctx.globalAlpha = clamp(k);
  const sc = 0.96 + 0.04 * eo(k);
  ctx.translate(540, 900); ctx.scale(sc, sc); ctx.translate(-540, -900);
  txt(ctx, TEXT.end[0], 540, 760, '400 196px "Archivo Black"', P.white, 'center', 'middle');
  ctx.font = '400 58px "Archivo Black"'; const sub = Math.min(58, Math.floor(58 * 760 / ctx.measureText(TEXT.end[1]).width));   // long questions shrink to stay in the safe area
  txt(ctx, TEXT.end[1], 540, 940, `400 ${sub}px "Archivo Black"`, P.orange, 'center', 'middle');
  txt(ctx, TEXT.end[2], 540, 1050, '600 40px Inter', 'rgba(233,237,241,0.75)', 'center', 'middle');
  ctx.restore();
  return [{ id: 'end', text: TEXT.end.join(' '), x0: 150, y0: 640, x1: 930, y1: 1090 }];
}

// ---------- word captions ----------
// words: [{w:'STORM', key:true}, …] (1–3 words). k = seconds since the caption appeared (for the pop).
export const CAPTION = { font: '"Archivo Black"', size: 96, y: Math.round(H * 0.6), cx: 540, maxW: 760, fill: '#FFFFFF', key: '#F28C28', stroke: '#0E121A', strokeW: 9, shadow: 'rgba(0,0,0,0.55)' };
export function caption(ctx, words, k = 1) {
  if (!words || !words.length) return;
  const C = CAPTION;
  ctx.save();
  let size = C.size; ctx.font = `400 ${size}px ${C.font}`;
  const full = words.map(w => w.w.toUpperCase()).join(' ');
  let tw = ctx.measureText(full).width;
  if (tw > C.maxW) { size = Math.floor(size * C.maxW / tw); ctx.font = `400 ${size}px ${C.font}`; tw = ctx.measureText(full).width; }
  const pop = 0.9 + 0.1 * back(clamp(k / 0.12), 2.2);
  ctx.translate(C.cx, C.y); ctx.scale(pop, pop);
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.lineJoin = 'round';
  let x = -tw / 2; const sp = ctx.measureText(' ').width;
  for (const wd of words) {
    const s = wd.w.toUpperCase(), ww = ctx.measureText(s).width;
    ctx.shadowColor = C.shadow; ctx.shadowBlur = 22; ctx.shadowOffsetY = 8;
    ctx.strokeStyle = C.stroke; ctx.lineWidth = C.strokeW * size / C.size; ctx.strokeText(s, x, 0);
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = wd.key ? C.key : C.fill; ctx.fillText(s, x, 0);
    x += ww + sp;
  }
  ctx.restore();
}

// ---- story title at the top of the first shot (Part 3+): "SNOWED IN AT BULKWAY" over an orange "PART 3" ----
// k 0..1 fades it in/out. Sits in the top band (y 150-330), clear of the caption band and TikTok's top bar.
export function titleTop(ctx, title, part, k = 1) {
  if (k <= 0) return;
  ctx.save(); ctx.globalAlpha = k;
  const g = ctx.createLinearGradient(0, 0, 0, 420); g.addColorStop(0, 'rgba(5,7,12,0.7)'); g.addColorStop(1, 'rgba(5,7,12,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1080, 420);
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
  let size = 76; ctx.font = `400 ${size}px "Archivo Black"`;
  while (ctx.measureText(title.toUpperCase()).width > 900 && size > 40) { size -= 2; ctx.font = `400 ${size}px "Archivo Black"`; }
  txt(ctx, title.toUpperCase(), 540, 230, `400 ${size}px "Archivo Black"`, P.white, 'center', 'alphabetic');
  txt(ctx, part.toUpperCase(), 540, 310, '400 50px "Archivo Black"', P.orange, 'center', 'alphabetic');
  ctx.restore();
}

// ---- time + place chip (top left, like a timestamp burned into the footage): "● 2:14 AM" over "PART 1 · THE LAST CAR" ----
// time: '2:14', ampm: 'AM', line: 'PART 1 · THE LAST CAR'; k fades it; blink: the red dot pulses
export function timeChip(ctx, t, { time = '2:14', ampm = 'AM', line = '', k = 1, x = 96, y = 330 } = {}) {
  if (k <= 0) return;
  ctx.save(); ctx.globalAlpha = k;
  ctx.font = '600 22px "Plex Mono"'; const lw = ctx.measureText(line).width;
  ctx.font = '700 64px "Plex Mono"'; const tw = ctx.measureText(time).width;
  const w = Math.max(tw + 130, lw + 48), h = 128;
  ctx.fillStyle = 'rgba(10,12,18,0.72)'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 14); ctx.fill();
  ctx.fillStyle = `rgba(226,64,52,${0.55 + 0.45 * (Math.sin(t * 4) > 0 ? 1 : 0.3)})`; ctx.beginPath(); ctx.arc(x + 30, y + 44, 8, 0, 7); ctx.fill();
  ctx.fillStyle = '#F2C230'; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.font = '700 64px "Plex Mono"'; ctx.fillText(time, x + 50, y + 66);
  ctx.font = '700 26px "Plex Mono"'; ctx.fillText(ampm, x + 58 + tw, y + 66);
  ctx.fillStyle = 'rgba(233,237,241,0.7)'; ctx.font = '600 22px "Plex Mono"'; ctx.fillText(line, x + 24, y + 104);
  ctx.restore();
}
