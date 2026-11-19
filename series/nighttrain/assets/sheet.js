// Model sheet: ?part=sheet&view=0..4  (0 cast standing, 1 across the aisle, 2 down the car, 3 route map, 4 rules + ticket)
import { person, YOU, JUNE, CONDUCTOR, RED, passenger, headCenter, BODY } from './chars.js';
import { P, W, H, CAR, DARK, fillRR, camera, STYLE, glow, vignette, carLight, paperGrain, noirPass, darkness } from './kit.js';
import * as SO from './soft.js';
import { timeChip } from './ui.js';
import { acrossBack, acrossBench, acrossClutter } from './softsets.js';
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
    else if (view === 20 || view === 21) {   // SOFT style samples. 20: June across the aisle, sorry smile. 21: the Conductor looming, "Ticket, please."
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      const row = [[SO.passenger(1), 110, { paper: 0.15 }], [SO.JUNE, 330, { hold: 'knit', armL: [-0.1, -1.25], mouth: 'meek', look: [0.1, 0.25], brows: 0.6, t }], [SO.passenger(2), 550, { paper: 0.15 }], [SO.RED, 770, { look: [0.6, 0], mouth: 'small' }], [SO.passenger(4), 985, { look: [-0.3, 0] }]];
      const scene = (o, which) => { acrossBack(o, t); acrossBench(o); acrossClutter(o); for (const [S, x, pz] of row) if (which(S)) SO.person(o, S, Object.assign({ x, y: 1010, s: 0.95, legs: 'sit' }, pz)); };
      if (view === 20) {
        ctx.save(); camera(ctx, 2.25, 330, 640);
        SO.blurred(ctx, 6, o => { o.setTransform(ctx.getTransform()); scene(o, S => S !== SO.JUNE); });
        SO.FACES.length = 0;
        SO.person(ctx, SO.JUNE, Object.assign({ x: 330, y: 1010, s: 0.95, legs: 'sit' }, row[1][2]));
        ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = '#8E2E36'; ctx.lineWidth = 26; ctx.beginPath(); ctx.moveTo(326, 900); ctx.bezierCurveTo(300, 1100, 470, 1180, 430, 1450); ctx.stroke(); ctx.strokeStyle = '#B8434A'; ctx.lineWidth = 18; ctx.stroke(); ctx.restore();
        ctx.restore();
      } else {
        ctx.save(); camera(ctx, 1.5, 540, 700);
        SO.blurred(ctx, 7, o => { o.setTransform(ctx.getTransform()); scene(o, () => true); });
        SO.FACES.length = 0;
        ctx.restore();
        // the conductor, close and low, leaning in over you
        SO.person(ctx, SO.CONDUCTOR, { x: 560, y: 2500, s: 2.6, rot: 0.06, mouth: 'wide', hold: 'punch', armL: [0.15, 2.4], armR: [0.1, 0.2], punchRot: 0.3 });
      }
      SO.nightGrade(ctx, { tint: '#6474C8' });
      SO.lightPool(ctx, 420, 40, 1000, '#D6E4FF', 0.3);
      SO.faceGlow(ctx);
      glow(ctx, 0.5); SO.painterly(ctx); SO.grain(ctx, 0.05); vignette(ctx, 0.45);
    }
    else if (view === 23 || view === 24 || view === 25) {   // soft-style checks of the reused sets: down the car, route map, rules sheet
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      if (view === 23) {
        SO.blurred(ctx, 2, o => carLength(o, t, CAR));
        for (const [X, Z, i] of [[-1.05, 3.2, 0], [1.05, 4.2, 1], [-1.05, 6, 2], [1.05, 8, 3], [-1.05, 10, 5]]) { const p = carProj(CAMLEN, X, 0.45, Z); SO.person(ctx, SO.passenger(i), { x: p.x, y: p.y, s: p.s * 0.95, legs: 'sit', paper: 0.15 }); }
        const c = carProj(CAMLEN, 0, 0, 7); SO.person(ctx, SO.CONDUCTOR, { x: c.x, y: c.y, s: c.s * 0.9, mouth: 'wide', hold: 'punch', armL: [0.15, 2.4] });
      } else if (view === 24) routeMap(ctx, t, CAR, { at: 1 }); else rulesSheet(ctx, t, { hi: 0, zoom: 0.4 });
      SO.nightGrade(ctx, { tint: '#6474C8' }); SO.lightPool(ctx, 540, 120, 1100, '#D6E4FF', 0.28); SO.faceGlow(ctx);
      glow(ctx, 0.5); SO.painterly(ctx); SO.grain(ctx, 0.05); vignette(ctx, 0.45);
    }
    else if (view === 22) {   // you, close: the sheet in your hands
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      ctx.save(); camera(ctx, 1.5, 540, 700);
      SO.blurred(ctx, 7, o => { o.setTransform(ctx.getTransform()); acrossBack(o, t); acrossBench(o); for (const [i, x] of [[1, 110], [2, 550], [4, 985]]) SO.person(o, SO.passenger(i), { x, y: 1010, s: 0.95, legs: 'sit', paper: 0.15 }); });
      ctx.restore(); SO.FACES.length = 0;
      const pz = { x: 540, y: 0, s: 3.2, legs: 'sit', look: [0, 0.5], mouth: 'small', hold: 'sheet', armL: [-0.25, -1.6], sheetRot: 0.1 }; pz.y = 700 - (SO.faceOf(SO.YOU, Object.assign({}, pz, { y: 0 })).y); SO.person(ctx, SO.YOU, pz);
      SO.nightGrade(ctx, { tint: '#6474C8' }); SO.lightPool(ctx, 420, 40, 1000, '#D6E4FF', 0.3); SO.faceGlow(ctx);
      glow(ctx, 0.5); SO.painterly(ctx); SO.grain(ctx, 0.05); vignette(ctx, 0.45);
      timeChip(ctx, t, { time: '2:14', ampm: 'AM', line: 'PART 1 · THE LAST TRAIN' });
    }
    else if (view >= 10) {   // the same shot in four styles: 10 flat+ lighting, 11 ink, 12 noir, 13 paper
      STYLE.mode = ['flat', 'ink', 'flat', 'paper'][view - 10];
      ctx.save(); camera(ctx, 1.75, 470, 640);
      carAcross(ctx, t, CAR);
      const row = [[passenger(1), 120, { paper: 0.1 }], [JUNE, 330, { hold: 'knit', armL: [-0.15, -1.2], mouth: 'meek', brows: 0.55, look: [0.5, -0.1], t }], [passenger(2), 545, { paper: 0.1 }], [RED, 760, { mouth: 'grin', look: [0.6, 0] }]];
      for (const [S, x, o] of row) person(ctx, S, Object.assign({ x, y: 1010, s: 1, legs: 'sit', blink: 0 }, o), CAR);
      ctx.save(); ctx.strokeStyle = '#B8434A'; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(318, 960); ctx.bezierCurveTo(300, 1100, 420, 1180, 380, 1400); ctx.stroke(); ctx.restore();
      person(ctx, CONDUCTOR, { x: 690, y: 1330, s: 1.12, rot: -0.12, mouth: 'wide', hold: 'punch', armL: [0.25, 2.0], punchRot: -0.4 }, CAR);
      ctx.restore();
      STYLE.mode = 'flat';
      if (view === 10) { carLight(ctx, { tubeX: 420 }); glow(ctx, 0.55); vignette(ctx, 0.35); }
      if (view === 11) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = '#F2E8D4'; ctx.fillRect(0, 0, W, H); ctx.restore(); carLight(ctx, { tubeX: 420, k: 0.7 }); vignette(ctx, 0.25); }
      if (view === 12) { carLight(ctx, { tubeX: 420 }); noirPass(ctx); vignette(ctx, 0.55); }
      if (view === 13) { carLight(ctx, { tubeX: 420, k: 0.8 }); paperGrain(ctx, 0.4); vignette(ctx, 0.3); }
    }
    else if (view === 9) {   // close-up of you (headphones), flat+ lighting
      ctx.fillStyle = '#0B0F14'; ctx.fillRect(0, 0, W, H);
      const pose = { x: 540, s: 3.2, y: 0, look: [0.2, 0.3], brows: 0.6, mouth: 'o' }; pose.y = 760 - headCenter(YOU, pose).y; person(ctx, YOU, pose, CAR);
      carLight(ctx); glow(ctx, 0.5);
    }
    else if (view === 4) rulesSheet(ctx, t, { hi: 1 });
    else ticketCU(ctx, t, { lace: 1 });
  };
}
