import Phaser from 'phaser';
import { COL, CSS } from './config.js';
import { FONT, fmt } from './uiKit.js';

export function sparkBurst(scene, x, y, o = {}) {
  const { count = 10, color = 0xffd24a, speed = 70, life = 520, size = 3, depth = 70, gravity = 40, parent = null } = o;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2, sp = speed * (0.4 + Math.random() * 0.8);
    const d = scene.add.circle(x, y, size * (0.6 + Math.random() * 0.8), color, 1).setBlendMode(Phaser.BlendModes.ADD);
    if (parent) parent.add(d); else d.setDepth(depth);
    scene.tweens.add({ targets: d, x: x + Math.cos(a) * sp, y: y + Math.sin(a) * sp + gravity * 0.5, alpha: 0, scale: 0.2, duration: life * (0.7 + Math.random() * 0.6), ease: 'Cubic.easeOut', onComplete: () => d.destroy() });
  }
}

export function confetti(scene, parent, x0, x1, top, bottom, count = 46) {
  const colors = [0xffd24a, 0xff6b6b, 0x37e0e8, 0x7df0a8, 0xffffff, 0xff9f43];
  for (let i = 0; i < count; i++) {
    const w = 5 + Math.random() * 6, h = 8 + Math.random() * 8;
    const r = scene.add.rectangle(x0 + Math.random() * (x1 - x0), top - Math.random() * 120, w, h, colors[i % colors.length], 1).setRotation(Math.random() * 6);
    parent.add(r);
    const dur = 1700 + Math.random() * 1500, sway = (Math.random() - 0.5) * 140;
    scene.tweens.add({ targets: r, y: bottom + 30, x: r.x + sway, rotation: r.rotation + (Math.random() - 0.5) * 12, duration: dur, delay: Math.random() * 500, ease: 'Sine.easeIn', onComplete: () => r.destroy() });
    scene.tweens.add({ targets: r, scaleX: { from: 1, to: 0.15 }, duration: 260 + Math.random() * 240, yoyo: true, repeat: -1 });
  }
}

export function coinShower(scene, parent, x0, x1, y, count = 14, bottom = 220) {
  const has = scene.textures.exists('icon_gold');
  for (let i = 0; i < count; i++) {
    const cx = x0 + Math.random() * (x1 - x0);
    let c;
    if (has) { c = scene.add.image(cx, y, 'icon_gold'); const src = scene.textures.get('icon_gold').getSourceImage(); c.setScale((14 + Math.random() * 8) / Math.max(src.width, src.height)); }
    else c = scene.add.circle(cx, y, 6, 0xffc233, 1);
    parent.add(c);
    scene.tweens.add({ targets: c, y: y + bottom * (0.6 + Math.random() * 0.5), x: cx + (Math.random() - 0.5) * 60, alpha: { from: 1, to: 0 }, duration: 900 + Math.random() * 600, delay: Math.random() * 380, ease: 'Quad.easeIn', onComplete: () => c.destroy() });
    scene.tweens.add({ targets: c, scaleX: { from: c.scaleX, to: c.scaleX * 0.2 }, duration: 160 + Math.random() * 120, yoyo: true, repeat: -1 });
  }
}

export function sunburst(scene, parent, x, y, radius, color = 0xffd24a, alpha = 0.12, rays = 14) {
  const c = scene.add.container(x, y); parent.add(c);
  const g = scene.add.graphics(); c.add(g);
  g.fillStyle(color, alpha);
  const step = (Math.PI * 2) / rays, half = step * 0.28;
  for (let i = 0; i < rays; i++) { const a = i * step; g.fillTriangle(0, 0, Math.cos(a - half) * radius, Math.sin(a - half) * radius, Math.cos(a + half) * radius, Math.sin(a + half) * radius); }
  scene.tweens.add({ targets: c, angle: 360, duration: 24000, repeat: -1 });
  return c;
}

export function popIn(scene, obj, delay = 0, from = 0.7) {
  const s = obj.scale; obj.setAlpha(0).setScale(s * from);
  scene.tweens.add({ targets: obj, alpha: 1, scale: s, duration: 320, delay, ease: 'Back.easeOut' });
}

export function waveBanner(scene, { wave, gold, doubled, healed }) {
  const W = scene.worldW, H = scene.worldH, BW = 480, BH = 118;
  const c = scene.add.container(W / 2, H * 0.27).setDepth(1500).setAlpha(0).setScale(0.6);
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.4); g.fillRoundedRect(-BW / 2 + 4, -BH / 2 + 9, BW, BH, 26);
  g.fillStyle(0x0a1d33, 0.95); g.fillRoundedRect(-BW / 2, -BH / 2, BW, BH, 26);
  g.fillStyle(COL.gold, 0.16); g.fillRoundedRect(-BW / 2, -BH / 2, BW, 44, { tl: 26, tr: 26, bl: 0, br: 0 });
  g.lineStyle(3, COL.gold, 0.95); g.strokeRoundedRect(-BW / 2, -BH / 2, BW, BH, 26);
  g.lineStyle(1.2, 0xfff0b3, 0.35); g.strokeRoundedRect(-BW / 2 + 6, -BH / 2 + 6, BW - 12, BH - 12, 21);
  c.add(g);
  sunburst(scene, c, -BW / 2 + 52, 8, 62, 0xffd24a, 0.16, 12);
  const t = scene.add.text(14, -BH / 2 + 24, 'WAVE ' + wave + ' COMPLETE', { fontFamily: FONT, fontSize: '27px', fontStyle: 'bold', color: '#ffd24a', stroke: '#2a1c00', strokeThickness: 6 }).setOrigin(0.5); c.add(t);
  t.setShadow(0, 3, 'rgba(0,0,0,0.5)', 6, false, true);
  const coinX = -BW / 2 + 52;
  if (scene.textures.exists('icon_gold')) { const ic = scene.add.image(coinX, 8, 'icon_gold'); const src = scene.textures.get('icon_gold').getSourceImage(); ic.setScale(56 / Math.max(src.width, src.height)); c.add(ic); scene.tweens.add({ targets: ic, scaleX: { from: ic.scaleX, to: ic.scaleX * 0.25 }, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); }
  const amt = scene.add.text(14, 14, '+0', { fontFamily: FONT, fontSize: '40px', fontStyle: 'bold', color: '#fff3c4', stroke: '#3a2400', strokeThickness: 7 }).setOrigin(0.5); c.add(amt);
  const label = scene.add.text(14 + 92, 22, 'GOLD', { fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color: '#ffd24a' }).setOrigin(0, 0.5); c.add(label);
  const note = [doubled ? '2X BONUS' : '', healed ? 'FLEET REPAIRED' : ''].filter(Boolean).join('   \u00b7   ');
  if (note) { const n = scene.add.text(14, BH / 2 - 14, note, { fontFamily: FONT, fontSize: '12px', fontStyle: 'bold', color: '#7df0a8' }).setOrigin(0.5); c.add(n); }
  const counter = { v: 0 };
  scene.tweens.add({ targets: counter, v: gold, duration: 700, delay: 250, ease: 'Cubic.easeOut', onUpdate: () => { amt.setText('+' + fmt(Math.round(counter.v))); const total = amt.width + 12 + label.width, x0 = 14 - total / 2; amt.x = x0 + amt.width / 2; label.x = x0 + amt.width + 12; } });
  scene.tweens.add({ targets: c, alpha: 1, scale: 1, duration: 380, ease: 'Back.easeOut' });
  scene.time.delayedCall(250, () => { coinShower(scene, c, -BW / 2 + 40, BW / 2 - 40, -BH / 2 - 10, 16, 180); sparkBurst(scene, coinX, 8, { parent: c, count: 14, speed: 90, life: 700 }); });
  scene.tweens.add({ targets: c, alpha: 0, y: c.y - 24, duration: 420, delay: 2300, ease: 'Sine.easeIn', onComplete: () => c.destroy() });
}
