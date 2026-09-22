// Builds 448.5 x 400 cards (#EFEEE7, 12px padding) from the Ash Align screens
// on the current page. Screens are found by their text, not saved IDs.
const CARD_W = 448.5, CARD_H = 400, PAD = 12, VW = CARD_W - 2 * PAD, VH = CARD_H - 2 * PAD;
const S = (VW - 18) / 570; // chat column fills the card width with ~9px margins
const cardBg = { r: 0xef / 255, g: 0xee / 255, b: 0xe7 / 255 };
const birch = { r: 0xed / 255, g: 0xeb / 255, b: 0xe4 / 255 };

const specs = [
  { name: '01 Invitation', text: 'Align with Ash', kind: 'invite' },
  { name: '02 Copy link', text: 'Your room is ready', kind: 'focus', focus: ['Intro', 'Room link', 'Button / black / block'] },
  { name: '03 Private room', text: "I'm Ready", kind: 'chat' },
  { name: '04 The commons', text: 'Wrap Up', kind: 'chat' },
  { name: '05 Summary', text: 'Thank you for completing your session', kind: 'summary' },
];

const rel = (n, root) => { const a = n.absoluteBoundingBox, r = root.absoluteBoundingBox; return { x: a.x - r.x, y: a.y - r.y, w: a.width, h: a.height }; };
const union = (boxes) => {
  const x = Math.min(...boxes.map(b => b.x)), y = Math.min(...boxes.map(b => b.y));
  return { x, y, w: Math.max(...boxes.map(b => b.x + b.w)) - x, h: Math.max(...boxes.map(b => b.y + b.h)) - y };
};

async function loadFontsIn(node) {
  const seen = new Set();
  for (const t of node.findAllWithCriteria({ types: ['TEXT'] })) {
    for (const seg of t.getStyledTextSegments(['fontName'])) {
      const key = seg.fontName.family + '|' + seg.fontName.style;
      if (!seen.has(key)) { seen.add(key); await figma.loadFontAsync(seg.fontName); }
    }
  }
}

function findScreen(page, text) {
  return page.children.find(f => f.type === 'FRAME' && Math.round(f.width) === 1080 && !f.name.startsWith('Ash Align card') &&
    f.findAllWithCriteria({ types: ['TEXT'] }).some(t => t.characters.trim() === text));
}

async function main() {
  const page = figma.currentPage;
  // Remove cards from any earlier run (including a partial one)
  page.children.filter(n => n.name.startsWith('Ash Align card —')).forEach(n => n.remove());

  const screens = specs.map(sp => ({ sp, orig: findScreen(page, sp.text) }));
  const missing = screens.filter(s => !s.orig).map(s => s.sp.name);
  if (missing.length) { figma.closePlugin('Could not find: ' + missing.join(', ') + ' — open the page with the Ash Align screens and run again.'); return; }

  const x0 = Math.min(...screens.map(s => s.orig.x));
  const y0 = Math.max(...screens.map(s => s.orig.y + s.orig.height)) + 200;
  const made = [];

  for (let i = 0; i < screens.length; i++) {
    const { sp, orig } = screens[i];
    await loadFontsIn(orig);
    const card = figma.createFrame();
    card.name = 'Ash Align card — ' + sp.name; card.resize(CARD_W, CARD_H);
    card.x = x0 + i * (CARD_W + 40); card.y = y0;
    card.fills = [{ type: 'SOLID', color: cardBg }]; card.clipsContent = true;
    page.appendChild(card);
    const vp = figma.createFrame(); vp.name = 'Viewport'; vp.resize(VW, VH); vp.x = PAD; vp.y = PAD;
    vp.fills = [{ type: 'SOLID', color: birch }]; vp.clipsContent = true; card.appendChild(vp);
    const c = orig.clone(); vp.appendChild(c); c.x = 0; c.y = 0; c.rescale(S); c.name = 'Screen (scaled)';
    const kid = (name) => c.children.find(n => n.name === name);

    let box, fixedX = null;
    if (sp.kind === 'chat') {
      ['Header', 'Composer'].forEach(n => { const k = kid(n); if (k) k.visible = false; });
      const list = kid('Messages'); const msgs = list.children;
      const avail = VH - 32; let span = 0, k = 0;
      for (let j = msgs.length - 1; j >= 0; j--) {
        const add = msgs[j].height + (k ? list.itemSpacing : 0);
        if (span + add > avail) break; span += add; k++;
      }
      msgs.slice(0, msgs.length - k).forEach(m => { m.visible = false; });
      const kept = union(msgs.slice(msgs.length - k).map(m => rel(m, c)));
      box = { x: rel(list, c).x, y: kept.y, w: list.width, h: kept.h };
    } else if (sp.kind === 'invite') {
      box = rel(kid('Content'), c);
      fixedX = -(c.width - VW); // right edge of the screen, keeps a sliver of the photo
    } else if (sp.kind === 'summary') {
      const col = kid('Content');
      const cards = col.children.find(n => n.name === 'Summary cards');
      cards.children.slice(1).forEach(n => { n.visible = false; });
      col.children.filter(n => n.name === 'mt-12' || n.name.startsWith('Button')).forEach(n => { n.visible = false; });
      const top = union([col.children.find(n => n.name === 'Title'), cards].map(n => rel(n, c)));
      box = { x: rel(col, c).x, y: top.y, w: col.width, h: top.h };
    } else {
      box = union(sp.focus.map(n => rel(kid(n), c)));
    }
    c.x = fixedX !== null ? fixedX : (VW - box.w) / 2 - box.x;
    c.y = (VH - box.h) / 2 - box.y;
    made.push(card);
  }
  figma.currentPage.selection = made;
  figma.viewport.scrollAndZoomIntoView(made);
  figma.closePlugin('Made ' + made.length + ' Ash Align cards (448.5 × 400).');
}

main().catch(e => figma.closePlugin('Ash Align cards failed: ' + e.message));
