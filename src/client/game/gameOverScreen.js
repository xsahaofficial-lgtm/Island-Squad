import { Platform } from '../platform.ts';
import { COL, CSS } from './config.js';
import { FONT, INK, fmt, makeText, makeButton, drawCard } from './uiKit.js';
import { SFX } from './sfx.js';
import { confetti, popIn, sparkBurst, sunburst } from './juice.js';

const CW = 480, CH = 516;

export function buildGameOver(scene) {
  const W = scene.worldW, H = scene.worldH;
  const score = scene.score, wave = scene.wave.wave, kills = scene.kills;
  const isBest = score >= scene.highScore && score > 0;
  const c = scene.add.container(0, 0).setDepth(2000).setAlpha(0);
  const tweens = [];

  const ov = scene.add.graphics();
  ov.fillStyle(0x04101b, 0.9); ov.fillRect(-1800, -1800, W + 3600, H + 3600);
  ov.fillGradientStyle(0x8a1414, 0x8a1414, 0x8a1414, 0x8a1414, 0.32, 0.32, 0.0, 0.0);
  ov.fillRect(-600, -600, W + 1200, H * 0.75 + 600);
  c.add(ov);
  c.add(scene.add.zone(-1800, -1800, W + 3600, H + 3600).setOrigin(0).setInteractive());

  const K = scene.add.container(0, 0); c.add(K);
  drawCard(scene, K, CW, CH, COL.red, COL.red);
  sunburst(scene, K, CW / 2, 168, 172, isBest ? 0xffd24a : 0xff6b6b, isBest ? 0.15 : 0.07, 16);
  const title = makeText(scene, K, CW / 2, 46, 'CASTLE DESTROYED', 34, '#ff6b6b', { stroke: 9, shadow: true });
  const sub = makeText(scene, K, CW / 2, 84, 'You survived until Wave ' + wave, 15, '#b9d3ea', { normal: true });
  popIn(scene, title, 60, 1.5); popIn(scene, sub, 200);

  const fl = makeText(scene, K, CW / 2, 126, 'FINAL SCORE', 12, CSS(COL.textDim));
  const sVal = makeText(scene, K, CW / 2, 172, '0', 60, CSS(COL.gold), { stroke: 9, shadow: true });
  popIn(scene, fl, 320); popIn(scene, sVal, 380, 0.4);
  const counter = { v: 0 }; let lastTick = 0;
  tweens.push(scene.tweens.add({ targets: counter, v: score, duration: 1100, delay: 420, ease: 'Cubic.easeOut',
    onUpdate: () => { sVal.setText(fmt(Math.round(counter.v))); const now = scene.time.now; if (now - lastTick > 65 && score > 0) { lastTick = now; SFX.tone(640 + 520 * (counter.v / score), 0.03, 'square', 0.045); } },
    onComplete: () => { sVal.setText(fmt(score)); scene.tweens.add({ targets: sVal, scale: { from: 1.22, to: 1 }, duration: 380, ease: 'Back.easeOut' }); sparkBurst(scene, CW / 2, 172, { parent: K, count: 22, speed: 120, life: 800, size: 3.2, color: isBest ? 0xffd24a : 0xff9f43 }); if (isBest) { SFX.upgrade(); confetti(scene, K, 10, CW - 10, -10, CH, 54); } } }));

  const ribbon = scene.add.container(CW / 2, 216); K.add(ribbon);
  const rb = scene.add.graphics(); ribbon.add(rb);
  const rbText = makeText(scene, ribbon, 0, 0, '', 14, CSS(COL.gold));
  popIn(scene, ribbon, 1500);
  const showRibbon = (newBest, best) => {
    rb.clear();
    if (newBest) { rb.fillStyle(COL.gold, 0.18); rb.fillRoundedRect(-110, -16, 220, 32, 16); rb.lineStyle(2, COL.gold, 0.9); rb.strokeRoundedRect(-110, -16, 220, 32, 16); rbText.setText('\u2605  NEW BEST SCORE  \u2605').setColor(CSS(COL.gold)); }
    else { rbText.setText('Personal best  ' + fmt(best)).setColor('#8fd8ff'); }
  };
  showRibbon(isBest, scene.highScore);
  if (isBest) tweens.push(scene.tweens.add({ targets: ribbon, scale: { from: 1, to: 1.07 }, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));

  const chip = (x, label, value, color) => {
    const g = scene.add.graphics(); g.fillStyle(0x0d2a45, 0.95); g.fillRoundedRect(x, 246, 136, 58, 14); g.lineStyle(1.5, COL.cyan, 0.35); g.strokeRoundedRect(x, 246, 136, 58, 14); K.add(g);
    makeText(scene, K, x + 68, 262, label, 11, CSS(COL.textDim));
    return makeText(scene, K, x + 68, 285, value, 22, color);
  };
  chip(24, 'WAVE', String(wave), '#ffffff'); chip(172, 'KILLS', fmt(kills), '#ffffff');
  const bestVal = chip(320, 'BEST', fmt(Math.max(scene.highScore, score)), CSS(COL.gold));

  const rank = scene.add.container(CW / 2, 330); K.add(rank);
  const status = makeText(scene, rank, 0, 0, 'Saving score\u2026', 14, CSS(COL.textDim), { normal: true });
  const pill = (x, label, n) => {
    const pc = scene.add.container(x, 0); rank.add(pc);
    const g = scene.add.graphics(); g.fillStyle(0x0f3a24, 0.95); g.fillRoundedRect(-100, -17, 200, 34, 17); g.lineStyle(1.5, COL.green, 0.8); g.strokeRoundedRect(-100, -17, 200, 34, 17); pc.add(g);
    makeText(scene, pc, 0, 0, label + '   ' + (n == null ? '-' : '#' + n), 14, '#7df0a8');
    popIn(scene, pc, x < 0 ? 0 : 140, 0.5);
  };

  const again = makeButton(scene, K, CW / 2, 388, 320, 60, 0xffb703, 0xfff0b3, '\u21BB  PLAY AGAIN', 26, INK, () => scene.restart());
  popIn(scene, again, 1100, 0.6); tweens.push(scene.tweens.add({ targets: again, scaleX: 1.04, scaleY: 1.04, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 1600 }));
  makeButton(scene, K, CW / 2 - 84, 458, 156, 46, 0x1b4466, COL.cyan, '\u2197  SHARE', 15, '#e8f6ff', () => Platform.share(score, wave));
  makeButton(scene, K, CW / 2 + 84, 458, 156, 46, 0x1b4466, COL.gold, '\uD83C\uDFC6  RANKS', 15, CSS(COL.gold), () => scene.showLeaderboard());

  const fit = () => {
    const vw = W - 2 * (scene.uiInsetX || 0), vh = H - 2 * (scene.uiInsetY || 0);
    const s = Math.min(1, (vw - 24) / CW, (vh - 24) / CH);
    K.setScale(s).setPosition(W / 2 - CW * s / 2, H / 2 - CH * s / 2);
  };
  scene._gameOverRelayout = fit; fit();
  const kb = scene.input.keyboard;
  if (kb) { const again = () => scene.restart(); kb.once('keydown-ENTER', again); c.once('destroy', () => kb.off('keydown-ENTER', again)); }
  c.once('destroy', () => { tweens.forEach((t) => t.remove()); scene._gameOverRelayout = null; });
  tweens.push(scene.tweens.add({ targets: c, alpha: 1, duration: 350, ease: 'Sine.easeOut' }));

  Platform.submitRun({ score, wave, kills }).then((res) => {
    if (!c.active) return;
    const fail = (msg, color) => { status.setText(msg).setColor(color); };
    if (!res) { fail('Could not reach the leaderboard - score not saved', CSS(COL.red)); return; }
    if (res.reason === 'logged-out') { fail('Log in to Reddit to save your score  (tap here)', CSS(COL.gold)); status.setInteractive({ useHandCursor: true }).on('pointerdown', () => Platform.promptLogin()); return; }
    if (!res.saved) { fail(res.reason === 'implausible' ? 'Score could not be verified' : 'Score not saved - try another run', CSS(COL.red)); return; }
    rank.removeAll(true); pill(-104, 'ALL-TIME', res.rank); pill(104, 'TODAY', res.dailyRank);
    bestVal.setText(fmt(res.best)); showRibbon(res.isNewBest, res.best);
  });
}
