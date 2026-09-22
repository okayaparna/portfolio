// Draws the Phia Premium user flow (from the "Flows I" FigJam board) as one
// clean frame, styled like the Phia case study, next to node 36:78 in
// Personal_files. Re-running replaces the frame from the previous run.
const FRAME_NAME = 'Phia — User flow';
const ANCHOR_ID = '36:78';

const hex = (h) => ({ r: parseInt(h.slice(1, 3), 16) / 255, g: parseInt(h.slice(3, 5), 16) / 255, b: parseInt(h.slice(5, 7), 16) / 255 });
const solid = (h) => [{ type: 'SOLID', color: hex(h) }];

const C = {
  bg: '#FBFAF7', ink: '#141414', gray: '#4A4A4A', gray2: '#8C8A86', rule: '#E2E0DA',
  line: '#ADA9A1', lineInk: '#2B2B2B', lineGood: '#7FAE6E', lineBad: '#D08C7A',
};
// Card kinds: fill, stroke, tag colour, dashed?
const KIND = {
  shopper:  { fill: '#FFFFFF', stroke: '#DAD7D0', tag: '#8C8A86' },
  doubt:    { fill: '#EEECE7', stroke: null,      tag: '#8C8A86' },
  phia:     { fill: '#E9EEF5', stroke: '#B7C6D8', tag: '#4F6A8A' },
  good:     { fill: '#E6F0E2', stroke: '#A7C79B', tag: '#4E7A40' },
  bad:      { fill: '#F7E3DE', stroke: '#DDA595', tag: '#A4533F' },
  proposed: { fill: null,      stroke: '#B7C6D8', tag: '#4F6A8A', dashed: true },
  note:     { fill: '#F2F1ED', stroke: null,      tag: '#8C8A86' },
};

let F; // resolved fonts
async function loadFonts() {
  const tryLoad = async (want, fallback) => {
    try { await figma.loadFontAsync(want); return want; }
    catch (e) { await figma.loadFontAsync(fallback); return fallback; }
  };
  F = {
    serif: await tryLoad({ family: 'Newsreader', style: 'Regular' }, { family: 'Inter', style: 'Regular' }),
    sans: await tryLoad({ family: 'Manrope', style: 'Regular' }, { family: 'Inter', style: 'Regular' }),
    sansMed: await tryLoad({ family: 'Manrope', style: 'SemiBold' }, { family: 'Inter', style: 'Semi Bold' }),
    mono: await tryLoad({ family: 'IBM Plex Mono', style: 'Regular' }, { family: 'Inter', style: 'Regular' }),
  };
}

function txt(str, font, size, color, o = {}) {
  const t = figma.createText();
  t.fontName = font;
  t.characters = str;
  t.fontSize = size;
  t.fills = solid(color);
  if (o.lh) t.lineHeight = { value: o.lh, unit: 'PIXELS' };
  if (o.ls) t.letterSpacing = { value: o.ls, unit: 'PERCENT' };
  if (o.upper) t.textCase = 'UPPER';
  if (o.width) { t.resize(o.width, t.height); t.textAutoResize = 'HEIGHT'; }
  for (const b of o.bold || []) {
    const i = str.indexOf(b);
    if (i >= 0) t.setRangeFontName(i, i + b.length, F.sansMed);
  }
  return t;
}

// ── layout grid ─────────────────────────────────────────────────────────────
const W = 232;                                 // card width
const COL0 = 80;                               // entry column
const col = (k) => 420 + (k - 1) * 320;        // lane columns 1..8
const TRUNK_ENTRY = 366;                       // between entry column and lane col 1
const TRUNK_LANE = 696;                        // between lane col 1 and col 2
const ELBOW_VERDICT = 1016;                    // between lane col 2 and col 3
const H1 = 510, H2 = 650;                      // happy-path row mids
const S1 = 1090, S2 = 1230, S3 = 1370;         // sad-path row mids

let root;
function card(kind, tag, text, o = {}) {
  const k = KIND[kind];
  const f = figma.createFrame();
  f.name = text.split('\n')[0].slice(0, 48);
  f.layoutMode = 'VERTICAL';
  f.primaryAxisSizingMode = 'AUTO';
  f.counterAxisSizingMode = 'FIXED';
  f.resize(o.w || W, 10);
  f.paddingTop = f.paddingBottom = 14;
  f.paddingLeft = f.paddingRight = 16;
  f.itemSpacing = 6;
  f.cornerRadius = 6;
  f.fills = k.fill ? solid(k.fill) : [];
  if (k.stroke) { f.strokes = solid(k.stroke); f.strokeWeight = 1; f.strokeAlign = 'INSIDE'; }
  if (k.dashed) f.dashPattern = [5, 4];
  const tg = txt(tag, F.mono, 10, k.tag, { ls: 10, upper: true });
  f.appendChild(tg);
  const body = txt(text, F.sans, 15, C.ink, { lh: 22, width: (o.w || W) - 32, bold: o.bold });
  f.appendChild(body);
  body.layoutAlign = 'STRETCH';
  root.appendChild(f);
  const minH = o.minH || 100;
  if (f.height < minH) {
    f.primaryAxisSizingMode = 'FIXED';
    f.resize(f.width, minH);
    f.primaryAxisAlignItems = 'CENTER';
  }
  return f;
}
const place = (n, x, midY) => { n.x = x; n.y = Math.round(midY - n.height / 2); return n; };
const top = (n, x, y) => { n.x = x; n.y = y; return n; };

const R = (n) => ({ x: n.x + n.width, y: n.y + n.height / 2 });
const L = (n) => ({ x: n.x, y: n.y + n.height / 2 });
const T = (n, dx) => ({ x: n.x + (dx === undefined ? n.width / 2 : dx), y: n.y });
const B = (n, dx) => ({ x: n.x + (dx === undefined ? n.width / 2 : dx), y: n.y + n.height });

async function arrow(pts, color = C.line, o = {}) {
  const minX = Math.min(...pts.map(p => p.x)), minY = Math.min(...pts.map(p => p.y));
  const last = pts.length - 1;
  const v = figma.createVector();
  v.name = 'Arrow';
  root.appendChild(v);
  await v.setVectorNetworkAsync({
    vertices: pts.map((p, i) => ({
      x: p.x - minX, y: p.y - minY,
      strokeCap: i === last ? 'ARROW_LINES' : 'NONE',
      cornerRadius: i > 0 && i < last ? 14 : 0,
    })),
    segments: pts.slice(1).map((_, i) => ({ start: i, end: i + 1 })),
  });
  v.x = minX; v.y = minY;
  v.strokes = solid(color);
  v.strokeWeight = o.weight || 1.5;
  v.strokeJoin = 'ROUND';
  if (o.dashed) v.dashPattern = [5, 4];
  v.fills = [];
  return v;
}
// right edge → left edge, with an elbow when the mids differ
function hPts(a, b, elbowX) {
  const p = R(a), q = L(b);
  if (Math.abs(p.y - q.y) < 2) return [p, { x: q.x, y: p.y }];
  const x = elbowX !== undefined ? elbowX : (p.x + q.x) / 2;
  return [p, { x, y: p.y }, { x, y: q.y }, q];
}
function vPts(a, b, up) {
  const p = up ? T(a) : B(a), q = up ? B(b) : T(b);
  return [p, { x: p.x, y: q.y }];
}
function label(str, x, y, align = 'center') {
  const t = txt(str, F.mono, 10, C.gray2, { ls: 4 });
  root.appendChild(t);
  t.x = Math.round(align === 'center' ? x - t.width / 2 : x);
  t.y = Math.round(y - t.height / 2);
  return t;
}
function laneHead(x, y, title, sub, subW) {
  const h = txt(title, F.serif, 30, C.ink, { ls: -1.5 });
  root.appendChild(h); h.x = x; h.y = y;
  const s = txt(sub, F.sans, 14, C.gray2, { lh: 20, width: subW });
  root.appendChild(s); s.x = x; s.y = y + h.height + 4;
}

async function main() {
  await loadFonts();

  // Where to put it: beside the anchor node, on its page
  const anchor = await figma.getNodeByIdAsync(ANCHOR_ID);
  let page = figma.currentPage, px = 0, py = 0;
  if (anchor && anchor.type === 'PAGE') page = anchor;
  else if (anchor) {
    let p = anchor.parent; while (p && p.type !== 'PAGE') p = p.parent;
    if (p) page = p;
    const bb = anchor.absoluteBoundingBox || { x: anchor.x, y: anchor.y, width: anchor.width };
    px = bb.x + bb.width + 400; py = bb.y;
  }
  await figma.setCurrentPageAsync(page);
  const old = page.children.find(n => n.name === FRAME_NAME);
  if (old) { px = old.x; py = old.y; old.remove(); }

  root = figma.createFrame();
  root.name = FRAME_NAME;
  root.fills = solid(C.bg);
  root.clipsContent = true;
  root.resize(2972, 1600);
  page.appendChild(root);
  root.x = px; root.y = py;

  // ── header ────────────────────────────────────────────────────────────────
  const eyebrow = txt('Phia Rewards  ·  User flow', F.mono, 12, C.gray2, { ls: 12, upper: true });
  root.appendChild(eyebrow); eyebrow.x = 80; eyebrow.y = 80;
  const title = txt('What happens after “should I buy this?”', F.serif, 56, C.ink, { ls: -2.5 });
  root.appendChild(title); title.x = 80; title.y = 112;
  const sub = txt('A shopper’s path from browsing to buying, with and without Phia Premium. With demand data the decision is quicker and the points go further. Without it, the same moment usually ends in an abandoned cart.',
    F.sans, 18, C.gray, { lh: 28, width: 1040 });
  root.appendChild(sub); sub.x = 80; sub.y = title.y + title.height + 16;
  const rule = figma.createRectangle();
  root.appendChild(rule); rule.resize(2972 - 160, 1); rule.x = 80; rule.y = 320; rule.fills = solid(C.rule);

  // ── entry column ──────────────────────────────────────────────────────────
  laneHead(COL0, 364, 'Every shopper', 'Browsing, until the moment of doubt.', W);
  const entry = [
    card('shopper', 'Shopper', 'Browses the Phia app'),
    card('shopper', 'Shopper', 'Sees something they like'),
    card('phia', 'Phia', 'Shows how the price compares, plus used, new and on-sale alternatives'),
    card('doubt', 'Shopper', 'Wonders whether they should buy it'),
    card('phia', 'Phia · Premium prompt', 'Offers to show the item’s demand to help them decide.\n\n“Phia Premium shows you demand, and tells you 24 hours early if the price changes while you wait.”\n\n“Use the points from this purchase toward more special rewards.”'),
    card('proposed', 'Phia · Trial offer', 'Get started at no cost, with a 500-point sign-up bonus — one step closer to your fashion community.'),
  ];
  let y = 460;
  for (const c of entry) { top(c, COL0, y); y += c.height + 40; }
  const [browse, sees, price, wonder, prompt, bonus] = entry;

  // ── happy path ────────────────────────────────────────────────────────────
  laneHead(col(1), 364, 'Happy path — joins Phia Premium', 'Decides faster, trusts the decision because it’s backed by data, and spends points on more than checkout.', 900);
  const commit = place(card('shopper', 'Shopper', 'Commits to Phia Premium'), col(1), H1);
  const trial = place(card('shopper', 'Shopper', 'Tries Phia Premium free for 14 days'), col(1), H2);
  const demand = place(card('phia', 'Phia', 'Shows the item’s demand, whether to buy now, and alternatives'), col(2), (H1 + H2) / 2);
  const buyNow = place(card('phia', 'Phia · Verdict', 'Based on demand: buy now', { bold: ['buy now'] }), col(3), H1);
  const wait = place(card('phia', 'Phia · Verdict', 'Based on demand: don’t buy yet', { bold: ['don’t buy yet'] }), col(3), H2);
  const wish = place(card('shopper', 'Shopper', 'Adds to wishlist'), col(4), H2);
  const connect = top(card('proposed', 'Premium · Needs partners', 'Connect Pickle, Depop, Etsy and eBay to pull every wishlist into one place'), col(4), wish.y + wish.height + 40);
  const notify = place(card('phia', 'Phia', 'Alerts them when the price changes'), col(5), H2);
  const cart = place(card('good', 'Shopper', 'Adds to cart'), col(5), H1);
  const earn = place(card('phia', 'Phia', 'Earns points'), col(6), H1);
  const feed = place(card('phia', 'Phia', 'Invites them to look at the rewards feed'), col(7), H1);
  const use = place(card('good', 'Shopper', 'Spends points at checkout, or on a fashion service, community activity or event'), col(8), H1);
  top(card('note', 'Why it matters', 'Higher wishlist-to-cart conversion. People buy when the data shows they’re making an informed decision, not an impulsive one.', { w: W + 320, bold: ['Higher wishlist-to-cart conversion.'] }), col(6), H2 - 50);
  top(card('note', 'Why it matters', 'Plenty to spend points on, so rewards feel like they’re working for them. The whole shopping cycle feels more rewarding.', { bold: ['The whole shopping cycle feels more rewarding.'] }), col(8), H2 - 50);

  // ── sad path ──────────────────────────────────────────────────────────────
  laneHead(col(1), 944, 'Sad path — ignores the prompt', 'Decides alone, without demand data. Most of these paths end in an abandoned cart.', 900);
  const ignore = place(card('shopper', 'Shopper', 'Ignores the prompt and carries on'), col(1), S2);
  const canWait = place(card('doubt', 'Shopper', '“I can wait to buy this.”'), col(2), S1);
  const undecided = place(card('doubt', 'Shopper', '“It depends on the price and demand.”'), col(2), S2);
  const cantWait = place(card('doubt', 'Shopper', '“I can’t wait. I’ll buy it now.”'), col(2), S3);
  const wishS = place(card('shopper', 'Shopper', 'Adds to wishlist'), col(3), S1);
  const research = place(card('doubt', 'Shopper', 'Researches by hand whether it’s in demand, or if the price will change'), col(3), S2);
  const cartS = place(card('good', 'Shopper', 'Adds to cart'), col(3), S3);
  const abandon = top(card('bad', 'Drop-off', 'Abandons the item\n\n1.  No time or energy to research demand\n2.  Means to come back to it, then forgets\n3.  Research says it isn’t worth buying now', { bold: ['Abandons the item'], minH: 250 }), col(4), S1 - 50);
  const earnS = place(card('phia', 'Phia', 'Earns points'), col(4), S3);
  const useS = place(card('doubt', 'Shopper', 'Uses points at the next checkout'), col(5), S3);
  place(card('note', 'The limit', 'Taking money off the next purchase is the only thing free points can do.'), col(6), S3);

  // ── connectors ────────────────────────────────────────────────────────────
  for (let i = 0; i < 4; i++) await arrow(vPts(entry[i], entry[i + 1]));
  await arrow(vPts(prompt, bonus), KIND.phia.stroke, { dashed: true });

  const pr = R(prompt);
  for (const t of [commit, trial]) await arrow([pr, { x: TRUNK_ENTRY, y: pr.y }, { x: TRUNK_ENTRY, y: L(t).y }, L(t)], C.lineInk);
  await arrow([pr, { x: TRUNK_ENTRY, y: pr.y }, { x: TRUNK_ENTRY, y: L(ignore).y }, L(ignore)]);

  await arrow(hPts(commit, demand, TRUNK_LANE), C.lineInk);
  await arrow(hPts(trial, demand, TRUNK_LANE), C.lineInk);
  await arrow(hPts(demand, buyNow, ELBOW_VERDICT), C.lineInk);
  await arrow(hPts(demand, wait, ELBOW_VERDICT));
  await arrow(hPts(buyNow, cart), C.lineInk);
  await arrow(hPts(wait, wish));
  await arrow(hPts(wish, notify));
  await arrow(vPts(wish, connect), KIND.phia.stroke, { dashed: true });
  await arrow(vPts(notify, cart, true), C.lineGood);
  label('later, when notified', T(notify).x + 10, (cart.y + cart.height + notify.y) / 2, 'left');
  await arrow(hPts(cart, earn), C.lineInk);
  await arrow(hPts(earn, feed), C.lineInk);
  await arrow(hPts(feed, use), C.lineInk);

  for (const t of [canWait, undecided, cantWait]) await arrow(hPts(ignore, t, TRUNK_LANE));
  await arrow(hPts(canWait, wishS));
  await arrow(hPts(undecided, research));
  await arrow(hPts(cantWait, cartS));
  await arrow(vPts(research, wishS, true));
  label('says wait', T(research).x + 10, (wishS.y + wishS.height + research.y) / 2, 'left');
  await arrow(vPts(research, cartS), C.lineGood);
  label('says buy', B(research).x + 10, (research.y + research.height + cartS.y) / 2, 'left');
  await arrow([R(wishS), { x: abandon.x, y: R(wishS).y }], C.lineBad);
  label('forgets', (R(wishS).x + abandon.x) / 2, R(wishS).y - 12);
  await arrow([R(research), { x: abandon.x, y: R(research).y }], C.lineBad);
  label('most likely', (R(research).x + abandon.x) / 2, R(research).y - 12);
  await arrow(hPts(cartS, earnS));
  await arrow(hPts(earnS, useS));

  // ── legend ────────────────────────────────────────────────────────────────
  const bottom = Math.max(...root.children.map(n => n.y + n.height));
  const legend = figma.createFrame();
  legend.name = 'Legend';
  legend.layoutMode = 'HORIZONTAL';
  legend.primaryAxisSizingMode = 'AUTO';
  legend.counterAxisSizingMode = 'AUTO';
  legend.counterAxisAlignItems = 'CENTER';
  legend.itemSpacing = 32;
  legend.fills = [];
  const items = [['shopper', 'Shopper'], ['phia', 'Phia'], ['doubt', 'Moment of doubt'], ['good', 'Converts'], ['bad', 'Drops off'], ['proposed', 'Proposed, needs more work']];
  for (const [k, name] of items) {
    const row = figma.createFrame();
    row.layoutMode = 'HORIZONTAL'; row.primaryAxisSizingMode = 'AUTO'; row.counterAxisSizingMode = 'AUTO';
    row.counterAxisAlignItems = 'CENTER'; row.itemSpacing = 10; row.fills = [];
    const sw = figma.createRectangle();
    sw.resize(22, 16); sw.cornerRadius = 3;
    sw.fills = KIND[k].fill ? solid(KIND[k].fill) : [];
    if (KIND[k].stroke) { sw.strokes = solid(KIND[k].stroke); sw.strokeAlign = 'INSIDE'; }
    if (KIND[k].dashed) sw.dashPattern = [3, 2];
    row.appendChild(sw);
    row.appendChild(txt(name, F.sans, 13, C.gray));
    legend.appendChild(row);
  }
  root.appendChild(legend);
  const rule2 = figma.createRectangle();
  root.appendChild(rule2); rule2.resize(2972 - 160, 1); rule2.x = 80; rule2.y = bottom + 64; rule2.fills = solid(C.rule);
  legend.x = 80; legend.y = bottom + 96;
  root.resize(2972, legend.y + legend.height + 80);

  root.exportSettings = [{ format: 'PNG', suffix: '@2x', constraint: { type: 'SCALE', value: 2 } }];
  figma.currentPage.selection = [root];
  figma.viewport.scrollAndZoomIntoView([root]);
  figma.closePlugin('Phia flow drawn — select the frame and Export PNG @2x.');
}

main().catch(e => figma.closePlugin('Phia flow failed: ' + (e && e.message ? e.message : e)));
