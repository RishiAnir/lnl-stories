// DON'T MISS YOUR STOP characters: the BULKWAY rig (6 heads, flat fills, one shadow tone) with this story's cast.
// person(ctx, SPEC, pose, L): feet at (pose.x, pose.y). Specs: YOU, JUNE, CONDUCTOR, RED, passenger(i).
// Extra holds: 'knit' (June's needles), 'ticket', 'punch' (the conductor's ticket punch), 'sheet' (the folded rules).
// pose.paper (0..1): a newspaper held open in both hands, 0 at the chest, 1 raised over the face (passengers).
import { P, ell, fillRR, rr, capsule, poly, lit, clamp, lerp, mix, rgba, FULL } from './kit.js';

export const C = {
  // you
  youSkin: '#C8916A', youSkinS: '#AE7853', hoodie: '#7D848F', hoodieS: '#646A74', youHair: '#2A1E18', phones: '#F2C230', phonesS: '#C99C18', pack: '#5E6B3A', packS: '#4A552D',
  // June
  juneSkin: '#EBC6A6', juneSkinS: '#D2A784', silver: '#D5D8DE', silverS: '#AEB3BC', camel: '#B98A55', camelS: '#9A6F40', scrub: '#9CC3D8', scrubS: '#7FA7BE', yarn: '#B8434A', yarnS: '#93333A',
  // the conductor
  condSkin: '#D9D2C8', condSkinS: '#BDB4A8', uni: '#1F2A44', uniS: '#161E33', brass: '#C9A24A', glove: '#F2F1EC', gloveS: '#D6D4CC',
  // the man in red
  redSkin: '#A8714C', redSkinS: '#8C5A38', track: '#C8302C', trackS: '#A02420', stripe: '#F2F2F2', gold: '#E2B43C',
  // passengers
  paxSkin: '#BDB8B1', paxSkinS: '#A29C94', coats: [['#5B6170', '#4A4F5C'], ['#6B6E73', '#575A5F'], ['#4E5560', '#3E444E'], ['#73706A', '#5E5B56']], paxHair: ['#4A4A50', '#77777D', '#2E2E33', '#9A9AA0'],
  paper: '#DCD8CC', paperS: '#C4BFB1', ink: '#3A3A40',
};

// ---------- you: yellow headphones round your neck, gray hoodie, olive backpack ----------
export const YOU = {
  id: 'you', skin: C.youSkin, skinS: C.youSkinS, shirt: C.hoodie, shirtS: C.hoodieS, legs: '#2C3240', legsS: '#222733', shoe: '#ECEDEF',
  tall: 1, wide: 1,
  drawHairBack(ctx, f, L) { ell(ctx, f.cx, f.cy - 30, f.rx + 6, f.ry * 0.9, lit(C.youHair, L)); },
  drawHair(ctx, f, L) { hairTop(ctx, f, L, C.youHair); },
  drawTop(ctx, b, L) {
    const { top, hipY, tw } = b;
    ell(ctx, 0, top + 2, tw * 0.62, 15, lit(C.hoodieS, L));                                      // hood bunched behind the neck
    fillRR(ctx, -tw * 0.62, hipY - 92, tw * 1.24, 62, 14, lit(C.hoodieS, L));                    // kangaroo pocket
    for (const s of [-1, 1]) fillRR(ctx, s * (tw - 22) - 9, top + 2, 18, hipY - top - 30, 7, lit(s < 0 ? C.pack : C.packS, L));   // backpack straps
    headphones(ctx, top, L);
  },
  drawBack(ctx, b, L) { fillRR(ctx, -b.tw + 4, b.top + 18, b.tw * 2 - 8, b.hipY - b.top - 20, 22, lit(C.pack, L)); fillRR(ctx, b.tw * 0.25, b.top + 18, b.tw * 0.75 - 4, b.hipY - b.top - 20, 20, lit(C.packS, L)); fillRR(ctx, -b.tw * 0.6, b.top + 90, b.tw * 1.2, 60, 14, lit(C.packS, L)); headphonesBack(ctx, b.top, L); },
  drawHeadBack(ctx, f, L) { ell(ctx, 0, f.cy - 8, f.rx + 4, f.ry, lit(C.youHair, L)); },
};
function hairTop(ctx, f, L, c) {
  ctx.save(); ctx.beginPath(); ctx.ellipse(f.cx, f.cy - 10, f.rx + 6, f.ry + 4, 0, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fillStyle = lit(c, L); ctx.fill(); ctx.restore();
  poly(ctx, [[f.cx - f.rx - 4, f.cy - 34], [f.cx - 20 + f.face * 10, f.cy - f.ry + 8], [f.cx + f.rx * 0.95, f.cy - 40], [f.cx + 30, f.cy - 58], [f.cx - 30, f.cy - 50]], lit(c, L));
  fillRR(ctx, f.cx - f.rx + 2, f.cy - 46, 16, 40, 8, lit(c, L)); fillRR(ctx, f.cx + f.rx - 18, f.cy - 46, 16, 40, 8, lit(c, L));
  // a messy fringe: a few tufts falling over the forehead
  for (const [x, w, d] of [[-60, 40, 34], [-22, 44, 44], [20, 40, 30], [56, 34, 22]]) poly(ctx, [[f.cx + x - w / 2, f.cy - 60], [f.cx + x + w / 2, f.cy - 60], [f.cx + x + w * 0.1 + f.face * 6, f.cy - 60 + d]], lit(c, L));
}
function headphones(ctx, top, L) {
  // over-ear headphones round the neck: the band wraps behind the neck (a yellow arc peeking out either side of it),
  // the two cups rest on the collarbones, cushions turned up
  ctx.save(); ctx.beginPath(); ctx.ellipse(0, top - 12, 30, 14, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.lineWidth = 8; ctx.strokeStyle = lit(C.phonesS, L); ctx.stroke(); ctx.restore();
  for (const sx of [-1, 1]) {
    ctx.save(); ctx.translate(sx * 30, top + 4); ctx.rotate(sx * 0.5);
    fillRR(ctx, -17, -15, 34, 30, 14, lit(sx < 0 ? C.phones : C.phonesS, L));     // cup
    fillRR(ctx, -14, -19, 28, 10, 5, lit('#2A2A30', L));                          // cushion
    ctx.restore();
  }
}
function headphonesBack(ctx, top, L) { fillRR(ctx, -46, top - 4, 92, 12, 6, lit(C.phonesS, L)); }

// ---------- June: silver bun with a pencil through it, camel coat over pale blue scrubs, always knitting ----------
export const JUNE = {
  id: 'june', skin: C.juneSkin, skinS: C.juneSkinS, shirt: C.camel, shirtS: C.camelS, legs: C.scrub, legsS: C.scrubS, shoe: '#E9E6E0',
  tall: 0.93, wide: 1.04, brow: '#9AA0AA',
  drawHairBack(ctx, f, L) { ell(ctx, f.cx, f.cy - 14, f.rx + 10, f.ry + 4, lit(C.silverS, L)); },
  drawHair(ctx, f, L) {
    ctx.save(); ctx.beginPath(); ctx.ellipse(f.cx, f.cy - 12, f.rx + 10, f.ry + 6, 0, Math.PI * 1.0, Math.PI * 2.0); ctx.lineTo(f.cx + f.rx * 0.7, f.cy - 46); ctx.quadraticCurveTo(f.cx, f.cy - 70, f.cx - f.rx * 0.7, f.cy - 46); ctx.closePath(); ctx.fillStyle = lit(C.silver, L); ctx.fill(); ctx.restore();
    ell(ctx, f.cx - f.rx - 2, f.cy - 2, 16, 40, lit(C.silver, L)); ell(ctx, f.cx + f.rx + 2, f.cy - 2, 16, 40, lit(C.silverS, L));
    // the bun on top, a yellow pencil pushed through it
    ctx.save(); ctx.translate(f.cx + 10, f.cy - f.ry - 22); ctx.rotate(-0.5); fillRR(ctx, -70, -7, 140, 14, 4, lit('#E8C23A', L)); poly(ctx, [[70, -7], [92, 0], [70, 7]], lit('#E9D2A8', L)); ctx.restore();
    ell(ctx, f.cx + 10, f.cy - f.ry - 22, 48, 40, lit(C.silver, L)); ell(ctx, f.cx + 26, f.cy - f.ry - 14, 30, 26, lit(C.silverS, L));
  },
  drawFace(ctx, f, L) { for (const s of [-1, 1]) fillRR(ctx, f.face * 22 + s * 34 - 14, f.cy + 22, 28, 4, 2, rgba('#A07A60', 0.35)); },   // tired lines under the eyes
  drawTop(ctx, b, L) {
    const { top, hipY, tw } = b;
    poly(ctx, [[-30, top + 2], [30, top + 2], [0, top + 70]], lit(C.scrub, L));                  // scrubs V-neck
    poly(ctx, [[-12, top + 10], [12, top + 10], [0, top + 40]], lit(C.juneSkinS, L));
    for (const s of [-1, 1]) poly(ctx, [[s * 30, top - 2], [s * (tw + 2), top + 8], [s * (tw * 0.9), hipY + 20], [s * 8, hipY + 20], [s * 2, top + 80]], lit(s < 0 ? C.camel : C.camelS, L));   // open coat
    for (const s of [-1, 1]) poly(ctx, [[s * 30, top - 2], [s * 58, top + 4], [s * 20, top + 92], [s * 4, top + 78]], lit(C.camelS, L));   // lapels
    fillRR(ctx, -tw * 0.86, hipY - 40, 40, 34, 6, lit(C.camelS, L));                              // pocket
  },
  drawBack(ctx, b, L) { fillRR(ctx, -b.tw - 2, b.top, b.tw * 2 + 4, b.hipY - b.top + 26, 18, lit(C.camel, L)); fillRR(ctx, b.tw * 0.3, b.top, b.tw * 0.72, b.hipY - b.top + 26, 16, lit(C.camelS, L)); },
  drawHeadBack(ctx, f, L) { ell(ctx, 0, f.cy - 10, f.rx + 10, f.ry + 4, lit(C.silver, L)); ell(ctx, 10, f.cy - f.ry - 22, 48, 40, lit(C.silverS, L)); ctx.save(); ctx.translate(10, f.cy - f.ry - 22); ctx.rotate(-0.5); fillRR(ctx, -70, -7, 140, 14, 4, lit('#E8C23A', L)); ctx.restore(); },
};

// ---------- the Conductor: very tall, navy uniform, cap low, eyes always in shadow, a wide fixed smile, white gloves ----------
export const CONDUCTOR = {
  id: 'conductor', skin: C.condSkin, skinS: C.condSkinS, shirt: C.uni, shirtS: C.uniS, legs: C.uni, legsS: C.uniS, shoe: '#0E1018',
  hand: C.glove, handS: C.gloveS, tall: 1.3, wide: 0.86, brow: '#000000',
  drawHat(ctx, f, L) {
    // a band of shadow across the eyes, then the cap: crown, brass badge, long brim
    ctx.save(); facePath(ctx, f); ctx.clip();
    const g = ctx.createLinearGradient(0, f.cy - 70, 0, f.cy + 40); g.addColorStop(0, 'rgba(6,8,14,1)'); g.addColorStop(0.7, 'rgba(6,8,14,0.95)'); g.addColorStop(1, 'rgba(6,8,14,0)');
    ctx.fillStyle = g; ctx.fillRect(f.cx - 120, f.cy - 130, 240, 170); ctx.restore();
    fillRR(ctx, f.cx - f.rx - 8, f.cy - f.ry - 34, (f.rx + 8) * 2, 96, 22, lit(C.uni, L));
    fillRR(ctx, f.cx + 20, f.cy - f.ry - 34, f.rx - 12, 96, 20, lit(C.uniS, L));
    fillRR(ctx, f.cx - f.rx - 6, f.cy - f.ry + 46, (f.rx + 6) * 2, 16, 4, lit('#0E1424', L));
    ell(ctx, f.cx, f.cy - f.ry + 10, 16, 20, lit(C.brass, L));
    ctx.beginPath(); ctx.ellipse(f.cx, f.cy - f.ry + 64, f.rx + 34, 30, 0, 0, Math.PI); ctx.fillStyle = lit('#0B0F1A', L); ctx.fill();
  },
  drawTop(ctx, b, L) {
    const { top, hipY, tw } = b;
    poly(ctx, [[-26, top + 2], [26, top + 2], [0, top + 46]], lit('#E9EDF1', L, 0.6));             // shirt collar
    fillRR(ctx, -5, top + 14, 10, 40, 3, lit('#5A1E22', L));                                        // tie
    for (const s of [-1, 1]) poly(ctx, [[s * 26, top + 2], [s * 50, top + 6], [s * 14, top + 74], [s * 6, top + 60]], lit(C.uniS, L));
    for (let i = 0; i < 4; i++) ell(ctx, -12, top + 80 + i * 30, 5, 5, lit(C.brass, L));            // brass buttons
    fillRR(ctx, tw * 0.25, top + 70, 30, 6, 2, lit(C.brass, L));                                     // badge bar
  },
  drawBack(ctx, b, L) { fillRR(ctx, -b.tw - 1, b.top + 4, b.tw * 2 + 2, b.hipY - b.top + 14, 18, lit(C.uni, L)); },
  drawHeadBack(ctx, f, L) { fillRR(ctx, -f.rx - 8, f.cy - f.ry - 34, (f.rx + 8) * 2, 96, 22, lit(C.uni, L)); },
};

// ---------- the man in the red tracksuit ----------
export const RED = {
  id: 'red', skin: C.redSkin, skinS: C.redSkinS, shirt: C.track, shirtS: C.trackS, legs: C.track, legsS: C.trackS, shoe: '#F2F2F2',
  tall: 1.04, wide: 1.08,
  drawHair(ctx, f, L) { ctx.save(); ctx.beginPath(); ctx.ellipse(f.cx, f.cy - 4, f.rx + 2, f.ry + 2, 0, Math.PI * 1.06, Math.PI * 1.94); ctx.lineTo(f.cx + f.rx * 0.8, f.cy - 46); ctx.lineTo(f.cx - f.rx * 0.8, f.cy - 46); ctx.closePath(); ctx.fillStyle = lit('#1A1412', L); ctx.fill(); ctx.restore(); },
  drawTop(ctx, b, L) {
    const { top, hipY, tw } = b;
    fillRR(ctx, -26, top - 8, 52, 22, 10, lit(C.trackS, L));                                        // collar
    fillRR(ctx, -2.5, top + 10, 5, hipY - top, 2.5, lit('#7A1A18', L));                             // zip
    for (const s of [-1, 1]) fillRR(ctx, s * (tw - 10) - 4, top + 6, 8, hipY - top, 4, lit(C.stripe, L));   // white side stripes
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, top + 10, 30, 30, 0, 0.2, Math.PI - 0.2); ctx.lineWidth = 5; ctx.strokeStyle = lit(C.gold, L); ctx.stroke(); ctx.restore();   // gold chain
  },
  drawBack(ctx, b, L) { fillRR(ctx, -b.tw - 1, b.top + 4, b.tw * 2 + 2, b.hipY - b.top + 10, 18, lit(C.track, L)); },
  drawHeadBack(ctx, f, L) { ell(ctx, 0, f.cy - 20, f.rx + 2, f.ry - 6, lit('#1A1412', L)); },
};

// ---------- passengers: ordinary-looking people, each their own colours, hair and one accessory; only their stillness is wrong ----------
const PX = {
  skins: [['#F1C7A5', '#D9A887'], ['#E0A97E', '#C68D62'], ['#C48660', '#A86C48'], ['#9C6644', '#7E4F33'], ['#7A4A30', '#5F3823'], ['#F5D5BC', '#E0B79A']],
  coats: [['#C9A23A', '#A9851F'], ['#2F7F86', '#22646A'], ['#7E2E3A', '#62222C'], ['#3E5E8C', '#2F4870'], ['#3F6B4A', '#2F5338'], ['#8C7BB0', '#6F5F93'], ['#B08A5A', '#8E6C42'], ['#3A3F48', '#2C3038']],
  hair: ['#1E1A18', '#5A3A24', '#D9B45A', '#8A3E22', '#A9ADB4', '#2E2A26'],
  legs: [['#2C3240', '#222733'], ['#4A4038', '#3A322B'], ['#2A3A55', '#202D44'], ['#55504A', '#45403A']],
  acc: ['#E1574A', '#F2C230', '#4A8FC9', '#5FAF7A', '#E9EDF1', '#1E2633'],
};
const PAX = {};
export function passenger(i = 0) {
  if (PAX[i]) return PAX[i];
  const [skin, skinS] = PX.skins[(i * 5 + 2) % 6], [coat, coatS] = PX.coats[(i * 3) % 8], hair = PX.hair[(i * 7 + 1) % 6], [lg, lgS] = PX.legs[i % 4];
  const style = ['short', 'bob', 'long', 'bald', 'curly', 'bun'][(i * 5) % 6], acc = ['glasses', 'beanie', 'scarf', 'cap', 'none', 'mustache', 'earrings'][(i * 3 + 1) % 7], ac = PX.acc[(i * 2 + 3) % 6];
  PAX[i] = {
    id: 'pax' + i, skin, skinS, shirt: coat, shirtS: coatS, legs: lg, legsS: lgS, shoe: ['#1C1E22', '#5A3A24', '#E9EDF1'][i % 3],
    tall: 0.94 + (i % 5) * 0.035, wide: 0.94 + (i % 3) * 0.07, brow: hair === '#A9ADB4' ? '#7E828A' : '#2A2420',
    drawHairBack(ctx, f, L) {
      if (style === 'bob' || style === 'long') ell(ctx, f.cx, f.cy + (style === 'long' ? 40 : 6), f.rx + 18, f.ry + (style === 'long' ? 50 : 14), lit(hair, L));
      if (style === 'curly') for (let k = 0; k < 9; k++) ell(ctx, f.cx + Math.cos(k / 9 * Math.PI * 2) * (f.rx + 6), f.cy - 20 + Math.sin(k / 9 * Math.PI * 2) * (f.ry - 10), 34, 34, lit(hair, L));
    },
    drawHair(ctx, f, L) {
      if (style === 'bald') return;
      ctx.save(); ctx.beginPath(); ctx.ellipse(f.cx, f.cy - 8, f.rx + 6, f.ry + 4, 0, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fillStyle = lit(hair, L); ctx.fill(); ctx.restore();
      if (style === 'bob' || style === 'long') { ell(ctx, f.cx - f.rx + 4, f.cy + 18, 22, 56, lit(hair, L)); ell(ctx, f.cx + f.rx - 4, f.cy + 18, 22, 56, lit(hair, L)); }
      if (style === 'bun') ell(ctx, f.cx, f.cy - f.ry - 14, 40, 34, lit(hair, L));
      if (style === 'curly') for (let k = 0; k < 5; k++) ell(ctx, f.cx - 70 + k * 35, f.cy - f.ry + 14, 30, 26, lit(hair, L));
    },
    drawFace(ctx, f, L) {
      if (acc === 'glasses') { for (const s of [-1, 1]) { ctx.save(); ctx.beginPath(); ctx.roundRect(f.face * 22 + s * 34 - 24, f.cy - 15, 48, 38, 10); ctx.roundRect(f.face * 22 + s * 34 - 19, f.cy - 10, 38, 28, 8); ctx.fillStyle = lit('#1E1E24', L); ctx.fill('evenodd'); ctx.restore(); } fillRR(ctx, f.face * 22 - 11, f.cy - 2, 22, 5, 2.5, lit('#1E1E24', L)); }
      if (acc === 'mustache') fillRR(ctx, f.face * 22 - 26, f.cy + 46, 52, 14, 7, lit(hair, L));
      if (acc === 'earrings') for (const s of [-1, 1]) ell(ctx, s * (f.rx - 2), f.cy + 34, 7, 7, lit(P.warm2, L));
    },
    drawHat(ctx, f, L) {
      if (acc === 'beanie') { ctx.beginPath(); ctx.ellipse(f.cx, f.cy - 60, f.rx + 6, f.ry * 0.8, 0, Math.PI, 0); ctx.fillStyle = lit(ac, L); ctx.fill(); fillRR(ctx, f.cx - f.rx - 8, f.cy - 70, (f.rx + 8) * 2, 34, 16, lit(mix(ac, '#000000', 0.2), L)); }
      if (acc === 'cap') { ctx.beginPath(); ctx.ellipse(f.cx, f.cy - 56, f.rx + 4, f.ry * 0.7, 0, Math.PI, 0); ctx.fillStyle = lit(ac, L); ctx.fill(); ctx.beginPath(); ctx.ellipse(f.cx + 30, f.cy - 54, f.rx * 0.9, 18, 0, 0, Math.PI); ctx.fillStyle = lit(mix(ac, '#000000', 0.3), L); ctx.fill(); }
    },
    drawTop(ctx, b, L) {
      const { top, hipY } = b;
      for (const s of [-1, 1]) poly(ctx, [[s * 22, top], [s * 52, top + 6], [s * 14, top + 70]], lit(coatS, L));
      fillRR(ctx, -3, top + 40, 6, hipY - top - 30, 3, lit(coatS, L));
      if (acc === 'scarf') { fillRR(ctx, -40, top - 10, 80, 30, 14, lit(ac, L)); fillRR(ctx, 10, top + 10, 24, 90, 8, lit(mix(ac, '#000000', 0.15), L)); }
    },
    drawBack(ctx, b, L) { fillRR(ctx, -b.tw - 1, b.top + 4, b.tw * 2 + 2, b.hipY - b.top + 14, 18, lit(coat, L)); },
    drawHeadBack(ctx, f, L) { if (style !== 'bald') ell(ctx, 0, f.cy - 10, f.rx + 6, f.ry, lit(hair, L)); },
  };
  return PAX[i];
}

// ---------- props ----------
function newspaper(ctx, b, L, p) {
  // a broadsheet folded in half, held open in front: the headline row and columns of gray lines; same date on every copy
  const y0 = lerp(b.top + 50, b.top - 120, clamp(p.paper)), w = b.tw * 3.4, h = 150;
  ctx.save(); ctx.translate(0, y0); ctx.rotate(p.paperRot || 0);
  fillRR(ctx, -w / 2, 0, w, h, 4, lit(C.paper, L)); fillRR(ctx, 0, 0, w / 2, h, 4, lit(C.paperS, L));
  fillRR(ctx, -w / 2 + 14, 16, w * 0.42, 18, 3, lit(C.ink, L, 0.6)); fillRR(ctx, 14, 16, w * 0.4, 18, 3, lit(C.ink, L, 0.6));
  for (let r = 0; r < 5; r++) for (const x0 of [-w / 2 + 14, 14]) fillRR(ctx, x0, 48 + r * 20, w * 0.42 - (r % 3) * 16, 6, 3, lit('#8E8B84', L, 0.6));
  ctx.restore();
  // both hands on the edges
  ell(ctx, -w / 2 + 6, y0 + 60, 11, 13, lit(p.S ? p.S.skin : C.paxSkin, L)); ell(ctx, w / 2 - 6, y0 + 60, 11, 13, lit(p.S ? p.S.skin : C.paxSkin, L));
}
function knitProp(ctx, x, y, L, t) {
  // two needles crossing over a short red knitted strip that hangs down (the long tail is drawn by the film)
  const k = Math.sin(t * 6) * 0.12;
  fillRR(ctx, x - 26, y - 6, 52, 64, 10, lit(C.yarn, L)); for (let r = 0; r < 5; r++) fillRR(ctx, x - 26, y + 4 + r * 12, 52, 4, 2, lit(C.yarnS, L));
  for (const s of [-1, 1]) { ctx.save(); ctx.translate(x, y); ctx.rotate(s * (0.7 + k)); fillRR(ctx, -3, -70, 6, 110, 3, lit('#C9CCD1', L)); ell(ctx, 0, -72, 6, 6, lit('#E8C23A', L)); ctx.restore(); }
}
function ticketProp(ctx, x, y, L, rot, holes) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  fillRR(ctx, -8, -64, 46, 70, 4, lit('#E9E2C8', L)); fillRR(ctx, -8, -64, 46, 14, 3, lit('#B8434A', L));
  for (let i = 0; i < holes; i++) ell(ctx, 6 + (i % 3) * 11, -36 + Math.floor(i / 3) * 12, 3.5, 3.5, lit('#1A1C22', L));
  ctx.restore();
}
function punchProp(ctx, x, y, L, rot, click) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  fillRR(ctx, -10, -70, 20, 76, 6, lit('#B7BEC8', L)); fillRR(ctx, 4, -70, 20, 60 - click * 14, 6, lit('#8E96A2', L)); ell(ctx, 4, -74, 12, 8, lit('#D8DEE6', L));
  ctx.restore();
}
function sheetProp(ctx, x, y, L, rot, open) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  const w = lerp(40, 90, open), h = lerp(56, 120, open);
  fillRR(ctx, -w / 2, -h, w, h, 3, lit('#F1EEE4', L)); for (let i = 0; i < 6 * open; i++) fillRR(ctx, -w / 2 + 8, -h + 14 + i * 16, w - 20, 3, 1, lit('#5A6A9A', L, 0.6));
  ctx.restore();
}

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
  if (p.paper != null && !p.back) newspaper(ctx, b, L, Object.assign({ S }, p));   // held open in both hands; paper 0 = chest height, 1 = up over the face
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

export const LAMP = {};   // id -> { x, y, ang } of the flashlight lens drawn this frame
function arm(ctx, S, b, side, [a1, a2], L, p, back) {
  const sx = side * (b.tw - 9), sy = b.sh + 6, l1 = BODY.upper * b.T, l2 = BODY.fore * b.T;
  let ex = sx + side * Math.sin(a1) * l1, ey = sy + Math.cos(a1) * l1;
  let hx = ex + side * Math.sin(a1 + a2) * l2, hy = ey + Math.cos(a1 + a2) * l2;
  if (p.paper != null && !p.back) {   // both hands on the newspaper's edges (newspaper() draws the hands)
    hx = side * (b.tw * 1.7 - 6); hy = lerp(b.top + 50, b.top - 120, clamp(p.paper)) + 60;
    ex = side * (b.tw + 26); ey = (sy + hy) / 2 + 40;
  }
  const sleeve = back ? (S.sleeveS || S.shirtS) : (S.sleeve || S.shirt);
  capsule(ctx, sx, sy, ex, ey, 11 * b.Wd, lit(sleeve, L));
  capsule(ctx, ex, ey, hx, hy, 9.5 * b.Wd, lit(sleeve, L));
  if (p.paper == null || p.back) ell(ctx, hx, hy, 11, 12, lit(back ? (S.handS || S.skinS) : (S.hand || S.skin), L));
  if (!back && p.hold === 'phone') phoneProp(ctx, hx + 4, hy - 16, L, p.phoneGlow ?? 1);
  if (!back && p.hold === 'phoneBack') { fillRR(ctx, hx - 17, hy - 50, 34, 64, 6, '#1A1E26'); ell(ctx, hx - 7, hy - 40, 4, 4, '#3A4150'); }
  if (!back && p.hold === 'calc') calcProp(ctx, hx + 2, hy - 18, L);
  if (!back && p.hold === 'flash') {
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(p.flashRot ?? -0.4); fillRR(ctx, -6, -44, 18, 50, 6, lit('#2A2F38', L)); fillRR(ctx, -9, -54, 24, 14, 5, lit('#3A4150', L)); ell(ctx, 3, -56, 10, 4, '#FFE7B8');
    // where the lens ended up on the canvas, so the film can start the beam at the flashlight
    const m = ctx.getTransform(), a = m.transformPoint(new DOMPoint(3, -56)), b = m.transformPoint(new DOMPoint(3, -120));
    LAMP[S.id] = { x: a.x, y: a.y, ang: Math.atan2(b.y - a.y, b.x - a.x) };
    ctx.restore();
  }
  if (!back && p.hold === 'radio') { ctx.save(); ctx.translate(hx, hy); ctx.rotate(p.radioRot ?? -0.2); fillRR(ctx, -16, -62, 32, 66, 7, lit('#1E2229', L)); fillRR(ctx, 6, -92, 6, 34, 3, lit('#2A2F38', L)); fillRR(ctx, -10, -52, 20, 22, 3, lit('#3A4150', L)); ell(ctx, -6, -66, 3.5, 3.5, p.radioOn ? '#57E08A' : '#2A2F38'); ctx.restore(); }
  if (!back && p.hold === 'knit') knitProp(ctx, hx, hy, L, p.t || 0);
  if (!back && p.hold === 'ticket') ticketProp(ctx, hx, hy, L, p.ticketRot ?? -0.3, p.holes ?? 0);
  if (!back && p.hold === 'punch') punchProp(ctx, hx, hy, L, p.punchRot ?? 0.2, p.punchClick ?? 0);
  if (!back && p.hold === 'sheet') sheetProp(ctx, hx, hy, L, p.sheetRot ?? -0.15, p.sheetOpen ?? 1);
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
  if (S.noEyes) { /* the conductor: eyes always in the cap's shadow */ }
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
  else if (m === 'wide') { ctx.beginPath(); ctx.ellipse(x, y - 8, 44, 18, 0, 0.08, Math.PI - 0.08); ctx.lineTo(x - 40, y - 4); ctx.ellipse(x, y - 6, 40, 9, 0, Math.PI - 0.1, 0.1, true); ctx.closePath(); ctx.fillStyle = dark; ctx.fill();
    ctx.beginPath(); ctx.ellipse(x, y - 7, 38, 9, 0, 0.1, Math.PI - 0.1); ctx.fillStyle = lit(P.white, L, 0.4); ctx.fill(); }
  else if (m === 'meek') { ctx.beginPath(); ctx.ellipse(x, y - 3, 13, 5, 0.12, 0.2, Math.PI - 0.2); ctx.fillStyle = dark; ctx.fill(); }
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
function phoneProp(ctx, x, y, L, glow) {
  fillRR(ctx, x - 22, y - 38, 44, 76, 8, '#14171E');
  fillRR(ctx, x - 18, y - 33, 36, 64, 5, mix('#2A3446', '#CFE8FF', glow));
}
function calcProp(ctx, x, y, L) {
  fillRR(ctx, x - 26, y - 36, 52, 72, 8, lit('#3A4150', L));
  fillRR(ctx, x - 20, y - 30, 40, 16, 3, lit('#B9D3B0', L));
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) fillRR(ctx, x - 19 + c * 14, y - 8 + r * 13, 10, 9, 2, lit('#8593A8', L));
}
// red plastic jerry can (Part 2), hand at the handle; tilt in rad
export function fuelCanProp(ctx, x, y, L = FULL, tilt = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
  fillRR(ctx, -46, 6, 92, 118, 14, lit('#C8463C', L)); fillRR(ctx, 6, 6, 40, 118, 12, lit('#A23530', L));
  fillRR(ctx, -26, -4, 52, 18, 8, lit('#A23530', L));                      // handle
  fillRR(ctx, 30, -14, 12, 28, 4, lit('#2A2F38', L)); ell(ctx, 36, -16, 8, 5, lit('#1A1D23', L));   // spout
  fillRR(ctx, -32, 40, 64, 30, 6, lit('#E9EDF1', L, 0.4));
  ctx.restore();
}
