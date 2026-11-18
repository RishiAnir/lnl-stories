// Model sheet: every character full height (6 heads) and in close-up, both lighting states. ?part=sheet
import { person, YOU, DANA, MARCUS, stranger, headCenter, BODY } from './chars.js';
import { P, W, H, FULL, GEN, fillRR } from './kit.js';
export async function init(ctx) {
  window.DUR = 1;
  window.render = t => {
    ctx.fillStyle = P.slate; ctx.fillRect(0, 0, W, H);
    fillRR(ctx, 0, 1000, W, 920, 0, '#1E2633');
    // head-height ruler: 6 heads for YOU at s = 1.2
    const s = 1.2, hh = BODY.height / 6 * s;
    for (let i = 0; i < 6; i++) fillRR(ctx, 30, 940 - (i + 1) * hh + 3, 18, hh - 6, 4, i % 2 ? '#56657D' : '#8593A8');
    person(ctx, YOU, { x: 200, y: 940, s, mouth: 'smile', pocketPhone: true }, FULL);
    person(ctx, DANA, { x: 470, y: 940, s, face: -0.4, look: [-0.6, 0], mouth: 'flat', jingle: 0 }, FULL);
    person(ctx, MARCUS, { x: 740, y: 940, s, face: 0.3, look: [0.5, 0.2], mouth: 'flat', armL: [0.08, 0.05] }, FULL);
    stranger(ctx, 965, 940, 0.42, t, 0);
    // close-ups: head and shoulders
    const cu = (S, x, extra) => { const s2 = 3.0, pose = Object.assign({ x, s: s2, y: 0 }, extra); const hc = headCenter(S, pose); pose.y = 1330 - (hc.y - 0); person(ctx, S, pose, GEN); };
    ctx.save(); ctx.beginPath(); ctx.rect(0, 1000, W, 920); ctx.clip();
    cu(YOU, 190, { brows: 1, mouth: 'o', look: [0, 0.4] });
    cu(DANA, 540, { glasses: 'on', look: [0.2, 0.5], brows: -0.4 });
    cu(MARCUS, 890, { brows: -0.6, mouth: 'tight', face: -0.2 });
    ctx.restore();
  };
}
