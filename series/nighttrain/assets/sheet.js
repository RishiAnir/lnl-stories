// Model sheet: ?part=sheet&view=0..4  (0 cast standing, 1 across the aisle, 2 down the car, 3 route map, 4 rules + ticket)
import { person, YOU, JUNE, CONDUCTOR, RED, passenger, headCenter, BODY } from './chars.js';
import { P, W, H, CAR, DARK, fillRR, camera } from './kit.js';
import { carAcross, carLength, carProj, CAMLEN, routeMap, rulesSheet, ticketCU } from './sets.js';
export async function init(ctx, q) {
  const view = +(q.get('view') || 0);
  window.DUR = 1;
  window.render = t => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (view === 0) {
      ctx.fillStyle = '#2B3647'; ctx.fillRect(0, 0, W, H); fillRR(ctx, 0, 1000, W, 920, 0, '#1E2633');
      const s = 1.05;
      person(ctx, YOU, { x: 150, y: 940, s, mouth: 'flat', look: [0.3, 0] }, CAR);
      person(ctx, JUNE, { x: 360, y: 940, s, mouth: 'meek', brows: 0.5, hold: 'knit', armL: [0.5, 1.6], t }, CAR);
      person(ctx, CONDUCTOR, { x: 600, y: 940, s, mouth: 'wide', hold: 'punch', armL: [0.4, 1.4] }, CAR);
      person(ctx, RED, { x: 820, y: 940, s, mouth: 'grin' }, CAR);
      person(ctx, passenger(0), { x: 990, y: 940, s: 0.9, paper: 0 }, CAR);
      const cu = (S, x, extra) => { const s2 = 2.6, pose = Object.assign({ x, s: s2, y: 0 }, extra); const hc = headCenter(S, pose); pose.y = 1330 - hc.y; person(ctx, S, pose, CAR); };
      ctx.save(); ctx.beginPath(); ctx.rect(0, 1000, W, 920); ctx.clip();
      cu(YOU, 140, { look: [0, 0.3], brows: 0.8, mouth: 'o' }); cu(JUNE, 400, { mouth: 'meek', brows: 0.6, look: [-0.3, 0.2] }); cu(CONDUCTOR, 660, { mouth: 'wide' }); cu(passenger(2), 920, {});
      ctx.restore();
    } else if (view === 1) {
      carAcross(ctx, t, CAR);
      person(ctx, passenger(1), { x: 110, y: 1010, s: 1, legs: 'sit', paper: 0.2 }, CAR);
      person(ctx, JUNE, { x: 330, y: 1010, s: 1, legs: 'sit', hold: 'knit', armL: [0.3, 1.9], mouth: 'meek', brows: 0.5, t }, CAR);
      person(ctx, passenger(2), { x: 560, y: 1010, s: 1, legs: 'sit', paper: 0.2 }, CAR);
      person(ctx, RED, { x: 780, y: 1010, s: 1, legs: 'sit', mouth: 'grin' }, CAR);
      person(ctx, passenger(3), { x: 990, y: 1010, s: 1, legs: 'sit', paper: 0.2 }, CAR);
    } else if (view === 2) {
      carLength(ctx, t, CAR);
      for (const [X, Z, i] of [[-1.15, 3, 0], [1.15, 4, 1], [-1.15, 6, 2], [1.15, 8, 3], [-1.15, 10, 0]]) { const p = carProj(CAMLEN, X, 0, Z); person(ctx, passenger(i), { x: p.x, y: p.y, s: p.s, legs: 'sit', paper: 0.2, face: -Math.sign(X) * 0.4 }, CAR); }
      const c = carProj(CAMLEN, 0, 0, 5); person(ctx, CONDUCTOR, { x: c.x, y: c.y, s: c.s, mouth: 'wide', hold: 'punch', armL: [0.4, 1.4] }, CAR);
    } else if (view === 3) routeMap(ctx, t, CAR, { at: 1 });
    else if (view === 4) rulesSheet(ctx, t, { hi: 1 });
    else ticketCU(ctx, t, { lace: 1 });
  };
}
