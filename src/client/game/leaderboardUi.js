import { Platform } from '../platform.ts';
import { COL, CSS } from './config.js';

const FONT = 'Space Grotesk';
const fmt = (n) => Number(n).toLocaleString('en-US');

export function openLeaderboard(scene) {
  if (scene._lbOpen) return;
  scene._lbOpen = true;
  const W = scene.worldW, H = scene.worldH;
  const c = scene.add.container(0, 0).setDepth(3000);
  const ov = scene.add.graphics(); ov.fillStyle(COL.shadow, 0.88); ov.fillRect(-700, -700, W + 1400, H + 1400); c.add(ov);
  c.add(scene.add.zone(-700, -700, W + 1400, H + 1400).setOrigin(0).setInteractive());

  const pw = 440, ph = 420, px = W / 2 - pw / 2, py = H / 2 - ph / 2;
  const p = scene.add.graphics();
  p.fillStyle(COL.shadow, 0.5); p.fillRoundedRect(px + 5, py + 10, pw, ph, 22);
  p.fillStyle(COL.panel, 1); p.fillRoundedRect(px, py, pw, ph, 22);
  p.lineStyle(2, COL.gold, 0.6); p.strokeRoundedRect(px, py, pw, ph, 22);
  c.add(p);
  c.add(scene.add.text(W / 2, py + 30, '\uD83C\uDFC6  LEADERBOARD', { fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: CSS(COL.gold) }).setOrigin(0.5));

  let period = 'daily', token = 0;
  const tabG = scene.add.graphics(); c.add(tabG);
  const tabs = [{ id: 'daily', label: 'TODAY', x: W / 2 - 70 }, { id: 'all', label: 'ALL-TIME', x: W / 2 + 70 }];
  const drawTabs = () => {
    tabG.clear();
    tabs.forEach((t) => { const on = t.id === period; tabG.fillStyle(on ? COL.cyanDk : COL.panelLite, 1); tabG.fillRoundedRect(t.x - 62, py + 58, 124, 32, 10); tabG.lineStyle(1.5, on ? COL.cyan : COL.panelEdge, 0.8); tabG.strokeRoundedRect(t.x - 62, py + 58, 124, 32, 10); t.txt.setColor(on ? '#ffffff' : CSS(COL.textDim)); });
  };
  tabs.forEach((t) => {
    t.txt = scene.add.text(t.x, py + 74, t.label, { fontFamily: FONT, fontSize: '13px', fontStyle: 'bold' }).setOrigin(0.5); c.add(t.txt);
    const z = scene.add.zone(t.x, py + 74, 124, 32).setOrigin(0.5).setInteractive({ useHandCursor: true }); c.add(z);
    z.on('pointerdown', () => { if (period !== t.id) { period = t.id; drawTabs(); render(); } });
  });

  const list = scene.add.container(0, 0); c.add(list);
  const row = (y, rank, name, score, mine) => {
    if (mine) { const g = scene.add.graphics(); g.fillStyle(COL.cyan, 0.16); g.fillRoundedRect(px + 16, y - 11, pw - 32, 24, 8); list.add(g); }
    const col = mine ? CSS(COL.cyan) : (rank <= 3 ? CSS(COL.gold) : CSS(COL.text));
    list.add(scene.add.text(px + 30, y, rank == null ? '-' : '#' + rank, { fontFamily: FONT, fontSize: '14px', fontStyle: 'bold', color: col }).setOrigin(0, 0.5));
    list.add(scene.add.text(px + 80, y, name.length > 20 ? name.slice(0, 19) + '\u2026' : name, { fontFamily: FONT, fontSize: '14px', color: col }).setOrigin(0, 0.5));
    list.add(scene.add.text(px + pw - 30, y, fmt(score), { fontFamily: FONT, fontSize: '14px', fontStyle: 'bold', color: col }).setOrigin(1, 0.5));
  };
  const note = (msg, color) => list.add(scene.add.text(W / 2, py + ph / 2 + 10, msg, { fontFamily: FONT, fontSize: '15px', color: color || CSS(COL.textDim), align: 'center' }).setOrigin(0.5));

  const render = async () => {
    const my = ++token; list.removeAll(true); note('Loading...');
    const res = await Platform.leaderboard(period);
    if (my !== token || !c.active) return;
    list.removeAll(true);
    if (!res) { note('Could not load the leaderboard.\nCheck your connection and try again.', CSS(COL.red)); return; }
    if (res.entries.length === 0) { note('No scores yet - be the first!'); return; }
    res.entries.forEach((e, i) => row(py + 114 + i * 26, e.rank, e.username, e.score, e.username === res.me.username));
    const inTop = res.entries.some((e) => e.username === res.me.username);
    if (res.me.username && !inTop && res.me.rank != null && res.me.score != null) row(py + 114 + res.entries.length * 26 + 14, res.me.rank, res.me.username, res.me.score, true);
    else if (!res.me.username) list.add(scene.add.text(W / 2, py + ph - 52, 'Log in to Reddit to appear on the board', { fontFamily: FONT, fontSize: '12px', color: CSS(COL.textDim) }).setOrigin(0.5));
  };

  const close = () => { scene._lbOpen = false; token++; c.destroy(); };
  const bw = 160, bh = 38, by = py + ph - 52 + (Platform.username ? 0 : 20);
  const bg = scene.add.graphics(); bg.fillStyle(COL.cyanDk, 1); bg.fillRoundedRect(W / 2 - bw / 2, by, bw, bh, 12); bg.lineStyle(2, COL.cyan, 0.9); bg.strokeRoundedRect(W / 2 - bw / 2, by, bw, bh, 12); c.add(bg);
  c.add(scene.add.text(W / 2, by + bh / 2, 'CLOSE', { fontFamily: FONT, fontSize: '15px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5));
  c.add(scene.add.zone(W / 2, by + bh / 2, bw, bh).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerdown', close));
  drawTabs(); render();
}
