import { COL } from './config.js';

export const FONT = 'Space Grotesk';
export const INK = '#06121d';
export const fmt = (n) => Number(n).toLocaleString('en-US');

export function makeText(scene, parent, x, y, s, size, color, o = {}) {
  const t = scene.add.text(x, y, s, { fontFamily: FONT, fontSize: size + 'px', fontStyle: o.normal ? 'normal' : 'bold', color, align: o.align || 'left', lineSpacing: o.ls || 0, wordWrap: o.ww ? { width: o.ww } : undefined });
  t.setOrigin(o.ox === undefined ? 0.5 : o.ox, o.oy === undefined ? 0.5 : o.oy);
  if (o.stroke) t.setStroke(INK, o.stroke);
  if (o.shadow) t.setShadow(0, 3, 'rgba(0,0,0,0.55)', 6, false, true);
  if (parent) parent.add(t);
  return t;
}

export function makeButton(scene, parent, x, y, w, h, fill, edge, label, size, color, cb) {
  const b = scene.add.container(x, y);
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.45); g.fillRoundedRect(-w / 2 + 2, -h / 2 + 5, w, h, 16);
  g.fillStyle(fill, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
  g.fillStyle(0xffffff, 0.22); g.fillRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h * 0.42, { tl: 13, tr: 13, bl: 4, br: 4 });
  g.lineStyle(2.5, edge, 1); g.strokeRoundedRect(-w / 2, -h / 2, w, h, 16);
  const t = scene.add.text(0, 0, label, { fontFamily: FONT, fontSize: size + 'px', fontStyle: 'bold', color }).setOrigin(0.5);
  const z = scene.add.zone(0, 0, w + 10, h + 10).setOrigin(0.5).setInteractive({ useHandCursor: true });
  z.on('pointerover', () => b.setScale(1.04)); z.on('pointerout', () => b.setScale(1)); z.on('pointerdown', cb);
  b.add([g, t, z]); b.label = t; b.zone = z;
  if (parent) parent.add(b);
  return b;
}

export function drawCard(scene, parent, w, h, edge, bandColor) {
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.42); g.fillRoundedRect(5, 10, w, h, 24);
  g.fillStyle(0x07182a, 0.96); g.fillRoundedRect(0, 0, w, h, 24);
  if (bandColor !== undefined) { g.fillStyle(bandColor, 0.2); g.fillRoundedRect(0, 0, w, 104, { tl: 24, tr: 24, bl: 0, br: 0 }); }
  g.lineStyle(2.5, edge, 0.8); g.strokeRoundedRect(0, 0, w, h, 24);
  g.lineStyle(1.2, COL.cyan, 0.18); g.strokeRoundedRect(6, 6, w - 12, h - 12, 19);
  parent.add(g); return g;
}
