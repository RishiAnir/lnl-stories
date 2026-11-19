// DON'T MISS YOUR STOP — Part 1 "Wake Up". Soft style (assets/soft.js): round glowing faces, night-blue grade, blurred backgrounds.
// The narration (voices/narration.wav, Chatterbox) sets the clock; shots cut on its word times (voices/timing.json).
// Captions run continuously (every spoken word, 1-3 at a time, the Caption column's **keywords** in orange).
import { P, W, H, CAR, clamp, lerp, seg, ss, eo, camera, blinkAt, breathe, vignette, rgba, glow } from '../assets/kit.js';
import * as SO from '../assets/soft.js';
import { acrossBack, acrossBench, acrossClutter, doors, phoneCU, sheetInHands, ticketHand } from '../assets/softsets.js';
import { routeMap, ticketCU, rulesSheet } from '../assets/sets.js';
import { endCard, caption, TEXT, titleTop, timeChip } from '../assets/ui.js';

const LEAD = 0.5;
TEXT.end = ['PART 2', 'How long has June been riding?', "Follow so you don't miss it"];
const TITLE = "Don't Miss Your Stop", CHIP = { time: '2:14', ampm: 'AM', line: 'PART 1 · THE LAST TRAIN' };

// ---------- timing + continuous captions ----------
let TL, LINES, CAPS = {}, IDS = [];
const norm = s => s.toLowerCase().replace(/[^a-z0-9']/g, '');
function build(timing, lines) {
  TL = {}; LINES = {}; IDS = lines.lines.map(l => l.id);
  for (const l of lines.lines) {
    LINES[l.id] = l;
    const T = timing.lines[l.id];
    TL[l.id] = { t0: LEAD + T.t0, t1: LEAD + T.t1, ws: T.words.map(([w, a, b]) => [w, LEAD + a, LEAD + b]) };
    const keys = new Set();
    for (const m of l.caption.matchAll(/\*\*(.+?)\*\*/g)) for (const k of m[1].split(/\s+/)) keys.add(norm(k));
    const raw = l.spoken.split(/\s+/).filter(Boolean);
    const groups = []; let g = [];
    raw.forEach((r, i) => {
      g.push(i);
      const ends = /[.,!?;:]["”]?$|["”]$/.test(r), next = raw[i + 1];
      const keyRun = next && keys.has(norm(r)) && keys.has(norm(next));
      if (g.length >= 4 || !keyRun && (ends || g.length >= 3 || (g.length >= 2 && next && /^["“]/.test(next)))) { groups.push(g); g = []; }
    });
    if (g.length) groups.push(g);
    CAPS[l.id] = groups.map(gr => ({ a: gr[0], b: gr[gr.length - 1], words: gr.map(i => ({ w: raw[i].replace(/["“”]/g, '').replace(/[.,;:]+$/, ''), key: keys.has(norm(raw[i])) })) }));
  }
}
const W_ = (id, i) => TL[id].ws[Math.min(Math.max(0, i), TL[id].ws.length - 1)];
const w = (id, i) => W_(id, i)[1], L0 = id => TL[id].t0, L1 = id => TL[id].t1;
const wi = (id, str, from = 0) => { const tk = LINES[id].spoken.split(/\s+/).map(norm), n = norm(str); let k = tk.indexOf(n, from); if (k < 0) k = tk.findIndex((x, j) => j >= from && x.startsWith(n)); return k < 0 ? 0 : k; };
const ww = (id, str, from = 0) => w(id, wi(id, str, from));
function capAt(t) {
  let cur = null;
  for (const id of IDS) {
    if (t < L0(id) - 0.05) break;
    for (const g of CAPS[id]) { const t0 = w(id, g.a) - 0.04; if (t >= t0) cur = { id, g, t0 }; }
  }
  if (!cur) return null;
  const nextIdx = IDS.indexOf(cur.id) + 1, end = nextIdx < IDS.length ? L0(IDS[nextIdx]) : L1(cur.id) + 0.6;
  if (t > end || t > L1(cur.id) + 1.2) return null;
  return { k: t - cur.t0, words: cur.g.words };
}
// is this line being spoken in quotes right now (for talking mouths)?
const quoteOn = (id, t) => { const sp = LINES[id].spoken, a = sp.indexOf('"'); if (a < 0) return false; const before = sp.slice(0, a).split(/\s+/).filter(Boolean).length; return t >= w(id, before) - 0.05 && t <= L1(id); };
const talk = (t, on, rest = 'small') => on ? (Math.floor(t * 8) % 3 === 0 ? 'small' : 'o') : rest;

// ---------- the car across the aisle ----------
const ROW = [[1, 110], ['june', 330], [2, 550], [4, 770], [5, 985]];
const who = k => k === 'june' ? SO.JUNE : SO.passenger(k);
// opts: stare (look at camera), paper (null = no paper / 0.15 held), lift (0..1 hands up together), junePose
function row(o, t, { stare = 0, paper = 0.15, lift = 0, june = {}, skipJune = false } = {}) {
  for (const [k, x] of ROW) {
    if (k === 'june') { if (!skipJune) SO.person(o, SO.JUNE, Object.assign({ x, y: 1010, s: 0.95, legs: 'sit', hold: 'knit', armL: [-0.1, -1.25], mouth: 'meek', look: [0.1, 0.2], blink: blinkAt(t, 3), t }, june)); continue; }
    const pose = { x, y: 1010, s: 0.95, legs: 'sit', look: stare ? [0, 0] : [0, 0.4], blink: stare ? 0 : blinkAt(t, k + 5), mouth: 'none' };
    if (lift > 0) { pose.armL = [lerp(0.12, 2.6, lift), lerp(0.1, 0.2, lift)]; pose.armR = [lerp(0.12, 2.6, lift), lerp(0.1, 0.2, lift)]; }
    else if (paper != null) pose.paper = paper;
    SO.person(o, who(k), pose);
  }
}
function car(ctx, t, { blur = 0, cam = null, ...opt } = {}) {
  const draw = o => { if (cam) { o.save(); camera(o, ...cam); } acrossBack(o, t); acrossBench(o); acrossClutter(o); scarf(o); row(o, t, opt); if (cam) o.restore(); };
  if (blur) { SO.blurred(ctx, blur, o => { o.setTransform(1, 0, 0, 1, 0, 0); draw(o); }); }
  else draw(ctx);
}
function scarf(o) { o.save(); o.lineCap = 'round'; o.strokeStyle = '#8E2E36'; o.lineWidth = 26; o.beginPath(); o.moveTo(326, 900); o.bezierCurveTo(300, 1100, 470, 1180, 430, 1500); o.stroke(); o.strokeStyle = '#B8434A'; o.lineWidth = 18; o.stroke(); o.restore(); }
// a lead framed large: face centre at (x, y) with head radius r
const framed = (S, x, y, r, extra = {}) => { const s = r / (SO.SOFT.head * (S.headK || 1)), pose = Object.assign({ x, y: 0, s }, extra); pose.y = y - SO.faceOf(S, pose).y; return pose; };
// your own hand at the bottom of the frame (POV), with a prop
function povHand(ctx, x, y, rot = 0, prop = null, extra = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  SO.limb(ctx, 120, 700, 10, 60, 62, '#5D6878');
  if (prop) SO.PROPS[prop](ctx, 0, 0, extra, SO.YOU);
  ctx.beginPath(); ctx.ellipse(0, 10, 44, 38, 0, 0, Math.PI * 2); SO.soft(ctx, '#E8DED8', -44, -28, 30, 48);
  ctx.restore();
}

function shots() {
  const S = []; const add = (name, t0, draw, o = {}) => S.push(Object.assign({ name, t0, draw }, o));
  // 1 · You wake: every passenger is staring at you (eyes open from black); at "staring" they look away and raise their papers
  add('wake', 0, (c, t, lt) => {
    const away = t > ww('l01', 'you', 3) + 0.25;
    c.save(); camera(c, 1.25 + lt * 0.02, 540, 700);
    car(c, t, { stare: !away, paper: away ? 0.15 : null });
    c.restore();
    const open = ss(seg(lt, 0, 1.2));   // eyelids opening
    c.fillStyle = '#000'; c.fillRect(0, 0, W, H * 0.5 * (1 - open)); c.fillRect(0, H - H * 0.5 * (1 - open), W, H * 0.5 * (1 - open));
  }, { title: 1, chip: 1 });
  // 2 · Your phone: 2:14, no signal
  add('phone', L0('l02') - 0.1, (c, t, lt) => {
    SO.blurred(c, 10, o => { o.setTransform(1, 0, 0, 1, 0, 0); acrossBack(o, t); });
    c.save(); camera(c, 1 + lt * 0.02, 540, 800); phoneCU(c, t); c.restore();
    SO.lightPool(c, 540, 700, 700, '#9FB8FF', 0.35);
  }, { chip: 1 });
  // 3 · The route map: stops you've never heard of
  add('map', L0('l03') - 0.1, (c, t, lt) => { c.save(); camera(c, 1.3 + lt * 0.05, 560, 720); routeMap(c, t, CAR, { at: 1 }); c.restore(); });
  // 4 · June across the aisle, knitting; the scarf trails across the floor
  add('june', L0('l04') - 0.1, (c, t, lt) => {
    c.save(); camera(c, 2.0 + lt * 0.03, 330, 700);
    car(c, t, { blur: 6, skipJune: true, cam: null });
    scarf(c); SO.person(c, SO.JUNE, { x: 330, y: 1010, s: 0.95, legs: 'sit', hold: 'knit', armL: [-0.1, -1.25], mouth: 'none', look: [0, 0.6], blink: blinkAt(t, 3), t });
    c.restore();
  });
  // 5 · June, close: a meek, sorry smile. "Oh sweetheart, not you too."
  add('juneCU', L0('l05') - 0.1, (c, t, lt) => {
    car(c, t, { blur: 9 });
    SO.FACES.length = 0;
    SO.person(c, SO.JUNE, framed(SO.JUNE, 540, 760, 230, { legs: 'sit', mouth: talk(t, quoteOn('l05', t), 'meek'), look: [0, 0.15], blink: blinkAt(t, 4), hold: 'knit', armL: [-0.1, -1.25], t }));
  });
  // 6 · She holds out a folded sheet to you
  add('give', L0('l06') - 0.1, (c, t, lt) => {
    car(c, t, { blur: 9 }); SO.FACES.length = 0;
    const reach = ss(seg(t, L0('l06'), ww('l06', 'folded') + 0.2));
    SO.person(c, SO.JUNE, framed(SO.JUNE, 520, 700, 190, { legs: 'sit', mouth: talk(t, quoteOn('l06', t), 'meek'), look: [0.1, 0.1], hold: 'sheet', armL: [0.45, lerp(-1.2, -2.0, reach)], sheetRot: -0.1 }));
  });
  // 7 · You unfold the page (your hands, bottom) — and every newspaper opens at the same moment
  const unfoldT = ww('l07', 'unfolds');
  add('unfold', L0('l07') - 0.1, (c, t, lt) => {
    c.save(); camera(c, 1.3, 540, 700); car(c, t, { paper: t > unfoldT ? lerp(0.6, 0.15, eo(seg(t, unfoldT, unfoldT + 0.25))) : null, stare: 0 }); c.restore();
    sheetInHands(c, t, ss(seg(t, L0('l07'), ww('l07', 'page') + 0.3)));
  });
  // 8 · You lift your hand; every hand in the car lifts with you, all eyes on you
  const liftT = ww('l08', 'lift'), theyT = ww('l08', 'every');
  add('lift', L0('l08') - 0.1, (c, t, lt) => {
    c.save(); camera(c, 1.3, 540, 700); car(c, t, { paper: null, stare: 1, lift: ss(seg(t, theyT, theyT + 0.35)), june: { look: [0, 0], mouth: 'none' } }); c.restore();
    const up = ss(seg(t, liftT - 0.1, liftT + 0.4)); povHand(c, 760, lerp(2050, 1450, up), -0.2);
  });
  // 9 · Rule nine on the sheet, then you, frozen; behind you, the papers come back up
  const holdT = ww('l09', 'you', 6);
  add('rule9', L0('l09') - 0.1, (c, t, lt) => { rulesSheet(c, t, { hi: 8, zoom: 0.7 }); });
  add('frozen', holdT - 0.1, (c, t, lt) => {
    const back = t > ww('l09', 'rustle') - 0.1;
    car(c, t, { blur: 8, paper: back ? 0.15 : null, stare: !back, lift: back ? 0 : 1 }); SO.FACES.length = 0;
    SO.person(c, SO.YOU, framed(SO.YOU, 540, 780, 250, { legs: 'sit', look: [0, 0], blink: 0, mouth: 'none', brows: 0.8, armL: [2.4, 0.2] }));
  });
  // 10 · The man in red yanks the door handle and laughs
  add('red', L0('l10') - 0.1, (c, t, lt) => {
    const yank = t > ww('l10', 'yanks') - 0.1 && t < ww('l10', 'laughs') + 0.4;
    doors(c, t, { shake: yank ? 1 : 0 });
    const laugh = t > ww('l10', 'laughs') - 0.1;
    SO.person(c, SO.RED, { x: 640, y: 1600, s: 1.55, rot: yank ? Math.sin(t * 30) * 0.03 : 0, mouth: talk(t, laugh || quoteOn('l10', t), 'small'), look: [laugh ? 0.4 : -0.6, 0], armL: [1.2, 0.5] });
  });
  // 11 · The conductor at your seat, low and close: "Ticket, please."
  add('cond', L0('l11') - 0.1, (c, t, lt) => {
    c.save(); camera(c, 1.5, 540, 700); car(c, t, { blur: 7, stare: 1, paper: null }); c.restore(); SO.FACES.length = 0;
    const lean = ss(seg(lt, 0, 1.2));
    SO.person(c, SO.CONDUCTOR, { x: 560, y: lerp(2700, 2560, lean), s: 2.7, rot: 0.05, mouth: 'wide', hold: 'punch', armL: [0.15, 2.4], armR: [0.1, 0.2], punchRot: 0.3 });
  });
  // 12 · You: a small smile, saying nothing
  add('smile', L0('l12') - 0.1, (c, t, lt) => {
    car(c, t, { blur: 9, stare: 1, paper: null }); SO.FACES.length = 0;
    SO.person(c, SO.YOU, framed(SO.YOU, 540, 760, 240, { legs: 'sit', look: [0, -0.2], blink: blinkAt(t, 9), mouth: t > ww('l12', 'smile') ? 'meek' : 'none', hold: 'ticket', armL: [-0.2, -1.6], ticketRot: 0.2 }));
  });
  // 13 · Click: the punch goes through your ticket
  const punchT = ww('l13', 'punches');
  add('punch', L0('l13') - 0.1, (c, t, lt) => { c.save(); camera(c, 1.55 + lt * 0.03, 540, 720); ticketCU(c, t, { holes: t > punchT ? 1 : 0, newHole: seg(t, punchT, punchT + 0.15) }); ticketHand(c, 250, 860); c.restore(); });
  // 14 · June stares at the hole and goes pale
  add('pale', L0('l14') - 0.1, (c, t, lt) => {
    car(c, t, { blur: 9 }); SO.FACES.length = 0;
    const pale = ss(seg(t, ww('l14', 'pale') - 0.3, ww('l14', 'pale') + 0.5));
    SO.person(c, SO.JUNE, framed(SO.JUNE, 540, 760, 230, { legs: 'sit', mouth: pale > 0.5 ? 'o' : 'none', look: [0, 0.7], brows: 0.9 * pale, blink: 0, glow: 1 - 0.6 * pale, hold: 'knit', armL: [-0.1, -1.25], t }));
    c.fillStyle = rgba('#0A0F1E', 0.25 * pale); c.fillRect(0, 0, W, H);
  });
  // 15 · Her ticket: punched so many times it's almost lace
  add('lace', L0('l15') - 0.1, (c, t, lt) => { c.save(); camera(c, 1.5 - lt * 0.03, 540, 720); ticketCU(c, t, { lace: 1 }); c.restore(); });
  // 16 · June, very close, whispering: "One hole for every stop you miss."
  add('whisper', L0('l16') - 0.1, (c, t, lt) => {
    c.fillStyle = '#05070D'; c.fillRect(0, 0, W, H); car(c, t, { blur: 12 }); SO.FACES.length = 0;
    SO.person(c, SO.JUNE, framed(SO.JUNE, 520 + lt * 6, 780, 300 + lt * 8, { legs: 'sit', mouth: talk(t, quoteOn('l16', t), 'none'), look: [0.05, 0], blink: blinkAt(t, 6), brows: 0.6 }));
  });
  // 17 · Your ticket: one hole
  add('mine', L0('l17') - 0.1, (c, t, lt) => { c.save(); camera(c, 1.6 + lt * 0.04, 540, 720); ticketCU(c, t, { holes: 1, newHole: 1 }); ticketHand(c, 250, 860); c.restore(); });
  // 18 · Hers: hundreds. Hold on it; the boom; cut to black.
  add('hers', L0('l18') - 0.1, (c, t, lt) => { c.save(); camera(c, 1.6 + lt * 0.05, 540, 720); ticketCU(c, t, { lace: 1 }); c.restore(); });
  const endT = L1('l18') + 1.6;
  add('end', endT, (c, t, lt) => endCard(c, seg(lt, 0.7, 1.3)), { raw: 1 });
  return { S, endT, unfoldT, punchT };
}

export async function init(ctx, q = new URLSearchParams()) {
  const NOSUB = q.get('nosub') === '1';
  const [timing, lines] = await Promise.all([new URL('./voices/timing.json', import.meta.url), new URL('./lines.json', import.meta.url)].map(u => fetch(u).then(r => r.json())));
  build(timing, lines);
  const K = shots(); const S = K.S;
  window.DUR = Math.round((K.endT + 0.7 + 4.67) * 30) / 30;
  // ---- sound events for mix.py ----
  const cut = n => S.find(s => s.name === n).t0;
  const ev = [{ t: LEAD, type: 'vo', file: 'voices/narration.wav' }];
  for (const id of IDS) ev.push({ t: L0(id), type: 'line', id, t1: L1(id) });
  ev.push({ t: K.unfoldT, type: 'rustle' }, { t: ww('l09', 'rustle'), type: 'rustle' }, { t: K.punchT + 0.02, type: 'punch' });
  ev.push({ t: K.unfoldT + 0.1, type: 'sting' }, { t: cut('lace') + 0.2, type: 'sting' });
  ev.push({ t: L0('l11') - 0.3, t1: L1('l13') + 0.4, type: 'tense' });
  const rev = ww('l18', 'hundreds');
  ev.push({ t: rev, type: 'reveal' }, { t: rev, type: 'boom' });
  ev.push({ t: K.endT, type: 'silence' }, { t: K.endT + 0.7, type: 'hit' });
  for (const s of S) ev.push({ t: s.t0, type: 'cut', name: s.name });
  window.EV = ev.sort((a, b) => a.t - b.t);
  window.CUES = IDS.map(id => ({ t0: L0(id), t1: L1(id) + 0.2, text: LINES[id].spoken }));
  let texts = [];
  window.render = t => {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none';
    let i = S.length - 1; while (i > 0 && S[i].t0 > t) i--;
    const sh = S[i];
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    SO.FACES.length = 0;
    ctx.save(); const r = sh.draw(ctx, t, t - sh.t0) || []; ctx.restore();
    texts = [...r];
    if (!sh.raw) {
      SO.nightGrade(ctx, { tint: '#6474C8' });
      SO.lightPool(ctx, 420, 40, 1000, '#D6E4FF', 0.3);
      SO.faceGlow(ctx);
      glow(ctx, 0.5); SO.painterly(ctx); SO.grain(ctx, 0.05); vignette(ctx, 0.42);
      if (sh.title) titleTop(ctx, TITLE, 'PART 1', clamp(1 - seg(t, L1('l01') - 0.3, L1('l01') + 0.2)));
      if (sh.chip) timeChip(ctx, t, Object.assign({ y: 360, k: 1 }, CHIP));
      const cp = NOSUB ? null : capAt(t); if (cp) caption(ctx, cp.words, cp.k);
    }
  };
  window.TEXTS = t => { window.render(t); return texts; };
}
