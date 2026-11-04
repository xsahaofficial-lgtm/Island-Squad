import { Platform } from '../platform.ts';
import { GAME_NAME, titleLines } from '../../shared/brand.ts';
import { COL, CSS } from './config.js';

const FONT = 'Space Grotesk';
const fmt = (n) => Number(n).toLocaleString('en-US');
const INK = '#06121d';

const STEPS = [
  { icon: 'icon_cannon',  title: 'Build turrets',       text: 'Pick one on the left bar, then tap the sea by your castle.' },
  { icon: 'icon_missile', title: 'Mind the firing arc', text: "Turrets can't fire backwards. Select one and tap AIM (20 coins)." },
  { icon: 'icon_gold',    title: 'Earn gold, upgrade',  text: 'Kills pay gold. Between waves, tap the green arrow to upgrade.' },
  { icon: 'icon_shield',  title: 'Power-ups',           text: 'Each works once per game (Shield twice). Buy extra uses with Reddit Gold.' },
  { icon: 'icon_heart',   title: 'Protect the castle',  text: 'If it falls you can continue once. Last longer to climb the ranks.' },
];

const LW = 380, LH = 346;
const RW = 424, RH = 408;

export function buildStartScreen(scene) {
  const W = scene.worldW, H = scene.worldH;
  const c = scene.add.container(0, 0).setDepth(2500).setAlpha(0);
  scene._startC = c; scene._started = false;
  const tweens = [];

  const fleet = [['ship_destroyer', 0.13, 1, 26], ['ship_battleship', 0.87, -1, 20], ['ship_cruiser', 0.5, 1, 14], ['ship_friendly', 0.3, -1, 32]];
  fleet.forEach(([key, fy, dir, speed], i) => {
    if (!scene.textures.exists(key)) return;
    const sp = scene.add.image(0, H * fy, key); const src = scene.textures.get(key).getSourceImage();
    sp.setScale(86 / Math.max(src.width, src.height)).setRotation(dir > 0 ? Math.PI / 2 : -Math.PI / 2).setAlpha(0.95);
    const a = -140, b = W + 140, start = dir > 0 ? a : b, end = dir > 0 ? b : a;
    sp.x = start + (end - start) * ((i * 0.27 + 0.1) % 1);
    c.add(sp);
    const loop = () => { sp.x = start; tweens.push(scene.tweens.add({ targets: sp, x: end, duration: Math.abs(end - start) / speed * 1000, repeat: -1 })); };
    tweens.push(scene.tweens.add({ targets: sp, x: end, duration: Math.abs(end - sp.x) / speed * 1000, onComplete: loop }));
    tweens.push(scene.tweens.add({ targets: sp, y: sp.y + 5, duration: 1700 + i * 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
  });

  const shade = scene.add.graphics();
  shade.fillStyle(0x04101b, 0.5); shade.fillRect(-700, -700, W + 1400, H + 1400);
  shade.fillGradientStyle(0x04101b, 0x04101b, 0x04101b, 0x04101b, 0.35, 0.0, 0.35, 0.0);
  shade.fillRect(-700, -700, W + 1400, H + 1400);
  c.add(shade);
  c.add(scene.add.zone(-700, -700, W + 1400, H + 1400).setOrigin(0).setInteractive());

  const L = scene.add.container(0, 0), R = scene.add.container(0, 0);
  c.add([L, R]);
  const T = (p, x, y, s, size, color, o = {}) => {
    const t = scene.add.text(x, y, s, { fontFamily: FONT, fontSize: size + 'px', fontStyle: o.normal ? 'normal' : 'bold', color, align: o.align || 'left', lineSpacing: o.ls || 0, wordWrap: o.ww ? { width: o.ww } : undefined });
    t.setOrigin(o.ox === undefined ? 0.5 : o.ox, o.oy === undefined ? 0.5 : o.oy);
    if (o.stroke) t.setStroke(INK, o.stroke);
    if (o.shadow) t.setShadow(0, 3, 'rgba(0,0,0,0.55)', 6, false, true);
    p.add(t); return t;
  };
  const button = (p, x, y, w, h, fill, edge, label, size, color, cb) => {
    const b = scene.add.container(x, y);
    const g = scene.add.graphics();
    g.fillStyle(0x000000, 0.45); g.fillRoundedRect(-w / 2 + 2, -h / 2 + 5, w, h, 16);
    g.fillStyle(fill, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
    g.fillStyle(0xffffff, 0.22); g.fillRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h * 0.42, { tl: 13, tr: 13, bl: 4, br: 4 });
    g.lineStyle(2.5, edge, 1); g.strokeRoundedRect(-w / 2, -h / 2, w, h, 16);
    const t = scene.add.text(0, 0, label, { fontFamily: FONT, fontSize: size + 'px', fontStyle: 'bold', color }).setOrigin(0.5);
    const z = scene.add.zone(0, 0, w + 10, h + 10).setOrigin(0.5).setInteractive({ useHandCursor: true });
    z.on('pointerover', () => b.setScale(1.04)); z.on('pointerout', () => b.setScale(1)); z.on('pointerdown', cb);
    b.add([g, t, z]); p.add(b); return b;
  };

  const cx = LW / 2;
  const lines = titleLines(GAME_NAME);
  lines.forEach((line, i) => {
    const t = T(L, cx, lines.length === 1 ? 67 : 40 + i * 54, line, 52, '#ffd24a', { stroke: 10, shadow: true });
    if (t.width > 360) t.setScale(360 / t.width);
  });
  T(L, cx, 138, 'Build turrets. Sink the fleet. Hold the line.', 15.5, '#e2f5ff', { stroke: 5 });
  const play = button(L, cx, 204, 270, 66, 0xffb703, 0xfff0b3, '\u25B6  PLAY', 32, INK, () => scene._beginPlay());
  tweens.push(scene.tweens.add({ targets: play, scaleX: 1.045, scaleY: 1.045, duration: 780, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 400 }));
  const name = Platform.username;
  const who = name ? 'u/' + (name.length > 11 ? name.slice(0, 10) + '\u2026' : name) + (Platform.bestScore ? '  \u00b7  ' + fmt(Platform.bestScore) : '') : 'Guest  \u00b7  log in to save';
  const chip = button(L, cx - 96, 280, 180, 42, COL.panel, COL.cyan, who, 14, '#cfe8ff', () => { if (!name) Platform.promptLogin(); });
  button(L, cx + 96, 280, 180, 42, COL.panelLite, COL.gold, '\uD83C\uDFC6  LEADERBOARD', 14, CSS(COL.gold), () => scene.showLeaderboard());
  if (name) chip.list[2].disableInteractive();
  if (!scene._isTouchDevice()) T(L, cx, 322, 'Press ENTER to start', 13, '#9fbdd8', { normal: true, stroke: 4 });

  const card = scene.add.graphics();
  card.fillStyle(0x000000, 0.4); card.fillRoundedRect(4, 8, RW, RH, 20);
  card.fillStyle(0x08192b, 0.9); card.fillRoundedRect(0, 0, RW, RH, 20);
  card.fillStyle(COL.cyanDk, 0.5); card.fillRoundedRect(0, 0, RW, 48, { tl: 20, tr: 20, bl: 0, br: 0 });
  card.lineStyle(2, COL.cyan, 0.55); card.strokeRoundedRect(0, 0, RW, RH, 20);
  R.add(card);
  T(R, RW / 2, 24, 'HOW TO PLAY', 20, CSS(COL.cyan), { stroke: 3 });
  STEPS.forEach((s, i) => {
    const ry = 64 + i * 66;
    if (i > 0) { const ln = scene.add.graphics(); ln.lineStyle(1, 0xffffff, 0.08); ln.lineBetween(18, ry - 8, RW - 18, ry - 8); R.add(ln); }
    const ib = scene.add.graphics(); ib.fillStyle(0x0f3a5a, 1); ib.fillRoundedRect(18, ry + 3, 50, 50, 12); ib.lineStyle(1.5, COL.cyan, 0.5); ib.strokeRoundedRect(18, ry + 3, 50, 50, 12); R.add(ib);
    if (scene.textures.exists(s.icon)) { const im = scene.add.image(43, ry + 28, s.icon); const src = scene.textures.get(s.icon).getSourceImage(); im.setScale(38 / Math.max(src.width, src.height)); R.add(im); }
    else T(R, 43, ry + 28, String(i + 1), 22, CSS(COL.gold));
    T(R, 82, ry + 6, s.title, 16.5, CSS(COL.gold), { ox: 0 });
    T(R, 82, ry + 26, s.text, 13.5, '#c5dcf0', { ox: 0, oy: 0, normal: true, ww: RW - 100, ls: 1 });
  });

  const relayout = () => {
    const vw = W - 2 * (scene.uiInsetX || 0), vh = H - 2 * (scene.uiInsetY || 0), m = 18, gap = 30;
    const sideW = LW + gap + RW, sideH = Math.max(LH, RH), stackW = Math.max(LW, RW), stackH = LH + 12 + RH;
    const sSide = Math.min(1, (vw - 2 * m) / sideW, (vh - 2 * m) / sideH);
    const mV = 84;
    const sStack = Math.min(1, (vw - 2 * m) / stackW, (vh - 2 * mV) / stackH);
    const stack = vh / vw >= 0.82 && sStack >= 0.78;
    if (stack) {
      L.setScale(sStack); R.setScale(sStack);
      const top = H / 2 - stackH * sStack / 2;
      L.setPosition(W / 2 - LW * sStack / 2, top); R.setPosition(W / 2 - RW * sStack / 2, top + (LH + 12) * sStack);
    } else {
      L.setScale(sSide); R.setScale(sSide);
      const left = W / 2 - sideW * sSide / 2;
      L.setPosition(left, H / 2 - LH * sSide / 2); R.setPosition(left + (LW + gap) * sSide, H / 2 - RH * sSide / 2);
    }
  };
  scene._startRelayout = relayout; relayout();

  const kb = scene.input.keyboard;
  if (kb) { const onEnter = () => scene._beginPlay(); kb.once('keydown-ENTER', onEnter); c.once('destroy', () => kb.off('keydown-ENTER', onEnter)); }
  c.once('destroy', () => { tweens.forEach((t) => t.remove()); scene._startRelayout = null; });
  tweens.push(scene.tweens.add({ targets: c, alpha: 1, duration: 320, ease: 'Sine.easeOut' }));
}
