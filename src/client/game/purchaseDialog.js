import Phaser from 'phaser';
import { Platform } from '../platform.ts';
import { COIN_PACK_COINS, COIN_PACK_RUN_CAP, COIN_PACK_SKU, GOLD_PER_MISSING_COIN, PRODUCTS, extraSku, planCoinFill, runCap } from '../../shared/products.ts';
import { ABILITIES, COL, CSS, DOUBLER, GAMECFG, REVIVE } from './config.js';
import { FONT, INK, fmt, makeText, makeButton } from './uiKit.js';
import { coinShower, sparkBurst, sunburst } from './juice.js';

const CW = 480;
const GOLDHEX = '#ffd24a';

export function openPurchase(scene, req) {
  if (!GAMECFG.shop.enabled || scene._purchaseOpen || (scene.gameIsOver && req.kind !== 'revive')) return;
  const W = scene.worldW, H = scene.worldH;
  const isCoins = req.kind === 'coins', isRevive = req.kind === 'revive';
  const key = isRevive ? 'revive' : req.key;
  const ab = isCoins ? null : (key === 'doubler' ? DOUBLER : (key === 'revive' ? REVIVE : ABILITIES[key]));
  if (!isCoins && !ab) return;
  if (isRevive && scene.reviveUsed) { scene.finishGame(); return; }
  const stored = isRevive && Platform.extraCount('revive') > 0;

  const used = isCoins ? scene.packsBought || 0 : (scene.puBought && scene.puBought[key]) || 0;
  if (isCoins && used >= COIN_PACK_RUN_CAP) { scene.ui.announce('Coin pack limit reached for this game', COL.gold); return; }
  if (!isCoins && !isRevive && !req.hasUse && used >= runCap(key)) { scene.ui.announce('No more ' + ab.name + ' uses to buy this game', COL.gold); return; }
  if (isRevive && !stored && used >= runCap('revive')) { scene.finishGame(); return; }

  const rows = [];
  const steps = [];
  let total = 0, coinsGain = 0, plan = null;
  if (isCoins) {
    const p = PRODUCTS[COIN_PACK_SKU];
    rows.push({ label: COIN_PACK_COINS + ' coins', value: p.price + ' Gold' });
    steps.push(COIN_PACK_SKU); total += p.price; coinsGain = COIN_PACK_COINS;
    rows.push({ note: true, color: '#9fbdd8', label: 'Pack ' + (used + 1) + ' of ' + COIN_PACK_RUN_CAP + ' you can buy this game' });
  } else if (isRevive) {
    if (stored) rows.push({ label: 'Saved Continue', value: 'FREE' });
    else { const sk = extraSku('revive'); rows.push({ label: '1 Continue', value: PRODUCTS[sk].price + ' Gold' }); steps.push(sk); total += PRODUCTS[sk].price; }
    rows.push({ note: true, color: '#9fbdd8', label: 'Once per game' });
  } else {
    if (req.shortCoins > 0) {
      plan = planCoinFill(req.shortCoins);
      rows.push({ label: 'Missing ' + fmt(plan.shortfall) + ' coins', value: '\u00d7 ' + GOLD_PER_MISSING_COIN + ' = ' + plan.exactGold + ' Gold', sub: true });
      rows.push({ label: fmt(plan.coins) + ' coins (Reddit price tier)', value: plan.payGold + ' Gold' });
      if (plan.coins > plan.shortfall) rows.push({ note: true, label: fmt(plan.coins - plan.shortfall) + ' spare coins stay yours' });
      steps.push(...plan.skus); total += plan.payGold; coinsGain = plan.coins;
    }
    if (!req.hasUse) {
      const sk = extraSku(req.key);
      rows.push({ label: '+1 ' + ab.name + ' use', value: PRODUCTS[sk].price + ' Gold' });
      steps.push(sk); total += PRODUCTS[sk].price;
      rows.push({ note: true, color: '#9fbdd8', label: 'Use ' + (used + 1) + ' of ' + runCap(key) + ' you can buy this game' });
    }
  }
  if (steps.length === 0 && !stored) return;

  scene._purchaseOpen = true;
  const prevPaused = scene.paused, prevClock = scene.time.paused;
  scene.paused = true; scene.time.paused = true;
  if (scene.ui) scene.ui.cancelHold && scene.ui.cancelHold();
  scene.cancelBuild();

  const rowH = 30, noteH = 22;
  const headH = 182;
  const bodyH = rows.reduce((h, r) => h + (r.note ? noteH : rowH), 0);
  const totalY = headH + bodyH + 30;
  const checkoutsY = totalY + 30;
  const statusY = totalY + (steps.length > 1 ? 56 : 34);
  const btnY = statusY + 46;
  const CH = btnY + 28 + 24 + (isRevive ? 36 : 0);
  const c = scene.add.container(0, 0).setDepth(2900).setAlpha(0);
  const ov = scene.add.graphics(); ov.fillStyle(0x04101b, 0.86); ov.fillRect(-1800, -1800, W + 3600, H + 3600); c.add(ov);
  c.add(scene.add.zone(-1800, -1800, W + 3600, H + 3600).setOrigin(0).setInteractive());
  const K = scene.add.container(0, 0); c.add(K);

  const card = scene.add.graphics();
  card.fillStyle(0x000000, 0.45); card.fillRoundedRect(5, 11, CW, CH, 26);
  card.fillStyle(0x07182a, 0.97); card.fillRoundedRect(0, 0, CW, CH, 26);
  card.fillStyle(COL.gold, 0.14); card.fillRoundedRect(0, 0, CW, 118, { tl: 26, tr: 26, bl: 0, br: 0 });
  card.lineStyle(3, COL.gold, 0.9); card.strokeRoundedRect(0, 0, CW, CH, 26);
  card.lineStyle(1.2, 0xfff0b3, 0.28); card.strokeRoundedRect(7, 7, CW - 14, CH - 14, 20);
  K.add(card);
  sunburst(scene, K, CW / 2, 62, 110, 0xffd24a, 0.13, 14);
  const iconKey = isCoins ? 'icon_gold' : 'icon_' + ab.icon;
  const hero = scene.textures.exists(iconKey) ? scene.add.image(CW / 2, 62, iconKey) : null;
  if (hero) { const src = scene.textures.get(iconKey).getSourceImage(); hero.setScale(70 / Math.max(src.width, src.height)); K.add(hero); scene.tweens.add({ targets: hero, y: hero.y - 5, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); }
  const titleText = isCoins ? 'GET ' + COIN_PACK_COINS + ' COINS' : (isRevive ? 'CONTINUE?' : (req.hasUse ? 'COINS FOR ' + ab.name.toUpperCase() : ab.name.toUpperCase() + ': +1 USE'));
  makeText(scene, K, CW / 2, 128, titleText, 24, GOLDHEX, { stroke: 7, shadow: true });
  const blurb = isCoins ? 'Spend them on turrets, upgrades and power-ups.' : (isRevive ? 'Your castle has fallen! Rebuild it to half health with a 10-second shield, blast the nearby fleet and fight on.' : req.hasUse ? 'Good news: you still have a ' + (req.free ? 'FREE' : 'bought') + ' ' + ab.name + ' use. It costs ' + ab.gold + ' coins to deploy and you are ' + req.shortCoins + ' short.' : (key === 'doubler' ? 'Your free 2X Gold is spent. ' : ab.name + ' is used up for this game. ') + (ab.desc || ''));
  makeText(scene, K, CW / 2, 156, blurb, 13, '#b9d3ea', { normal: true, ww: CW - 60, align: 'center' });

  let y = headH;
  rows.forEach((r) => {
    const h = r.note ? noteH : rowH, cy = y + h / 2;
    if (!r.note) { const line = scene.add.graphics(); line.fillStyle(0xffffff, r.sub ? 0.03 : 0.06); line.fillRoundedRect(22, cy - 13, CW - 44, 26, 8); K.add(line); }
    makeText(scene, K, r.note ? CW / 2 : 34, cy, r.label, r.note ? 12 : (r.sub ? 12.5 : 13.5), r.note ? (r.color || '#7df0a8') : (r.sub ? '#9fbdd8' : '#e8f4ff'), { ox: r.note ? 0.5 : 0, normal: !!(r.sub || r.note) });
    if (r.value) makeText(scene, K, CW - 34, cy, r.value, r.sub ? 12.5 : 14, r.sub ? '#9fbdd8' : GOLDHEX, { ox: 1 });
    y += h;
  });
  const tg = scene.add.graphics(); tg.lineStyle(1.5, COL.gold, 0.55); tg.lineBetween(24, totalY - 18, CW - 24, totalY - 18); K.add(tg);
  makeText(scene, K, 34, totalY, 'TOTAL', 15, '#ffffff', { ox: 0 });
  makeText(scene, K, CW - 34, totalY, stored ? 'FREE' : total + ' Reddit Gold', 22, stored ? '#7df0a8' : GOLDHEX, { ox: 1, stroke: 5 });
  if (steps.length > 1) makeText(scene, K, CW / 2, checkoutsY, steps.length + ' quick checkouts, one after the other', 11.5, '#9fbdd8', { normal: true });
  const status = makeText(scene, K, CW / 2, statusY, Platform.username ? '' : 'Log in to Reddit to buy', 13, '#9fbdd8', { normal: true, ww: CW - 50, align: 'center' });

  let busy = false, done = 0, closed = false;
  const label = stored ? 'CONTINUE' : (isRevive ? 'CONTINUE  \u00b7  ' + total + ' GOLD' : 'PAY  ' + total + ' GOLD');
  const restore = () => { scene.paused = prevPaused; scene.time.paused = prevClock; if (scene.wave) scene.wave.prepActivityAt = scene.time.now; };
  const close = (after) => {
    if (busy || closed) return; closed = true;
    scene._purchaseOpen = false; scene._purchaseRelayout = null; c.destroy(); restore();
    if (after) setTimeout(after, 60);
  };
  const buy = makeButton(scene, K, CW / 2, btnY, 320, 56, 0xffb703, 0xfff0b3, label, 24, INK, async () => {
    if (busy || closed) return;
    if (stored) { Platform.useExtra('revive'); close(() => scene.revive()); return; }
    if (!Platform.username) { Platform.promptLogin(); return; }
    busy = true; status.setText('').setColor('#9fbdd8');
    while (done < steps.length) {
      buy.label.setText(steps.length > 1 ? 'Checkout ' + (done + 1) + ' of ' + steps.length + '\u2026' : 'Opening checkout\u2026');
      const res = await Platform.checkout(steps[done]);
      if (closed) { busy = false; return; }
      if (!res.ok) {
        busy = false; buy.label.setText(done > 0 ? 'RETRY  (' + (steps.length - done) + ' left)' : label);
        status.setText(res.message).setColor(res.cancelled ? '#9fbdd8' : '#ff8f8f');
        if (done > 0) bankCoins();
        return;
      }
      { const eff = PRODUCTS[steps[done]].effect; if (eff.type === 'extra') scene.puBought[eff.ability] = (scene.puBought[eff.ability] || 0) + 1; if (steps[done] === COIN_PACK_SKU) { scene.packsBought = (scene.packsBought || 0) + 1; if (scene.ui) scene.ui.refreshCoinBtn(); } }
      done++;
    }
    await bankCoins();
    buy.label.setText('Done!'); status.setText(isCoins ? '+' + COIN_PACK_COINS + ' coins added!' : (isRevive ? 'Get ready!' : 'Ready to use!')).setColor('#7df0a8');
    coinShower(scene, K, 60, CW - 60, 20, 18, CH * 0.7); sparkBurst(scene, CW / 2, 62, { parent: K, count: 22, speed: 110, life: 800, size: 3.4 });
    busy = false;
    setTimeout(() => { if (closed) return; if (isRevive) { Platform.useExtra('revive'); close(() => scene.revive()); } else close(isCoins ? null : () => scene.afterPurchase(key)); }, 1100);
  });
  async function bankCoins() {
    const n = await Platform.claimCoins();
    if (n > 0 && scene.sys.isActive()) { scene.addGold(n, true); if (scene.ui) scene.ui.refreshAbilities(); }
  }
  const xg = scene.add.graphics(); xg.fillStyle(0x3a1218, 1); xg.fillCircle(CW - 30, 30, 16); xg.lineStyle(1.8, COL.red, 0.85); xg.strokeCircle(CW - 30, 30, 16); K.add(xg);
  makeText(scene, K, CW - 30, 30, '\u2715', 16, '#ffffff');
  const dismiss = () => close(isRevive ? () => scene.finishGame() : null);
  K.add(scene.add.zone(CW - 30, 30, 50, 50).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerdown', dismiss));
  if (isRevive) {
    makeText(scene, K, CW / 2, btnY + 52, 'No thanks, end the game', 14, '#9fbdd8', { normal: true });
    K.add(scene.add.zone(CW / 2, btnY + 52, 240, 34).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerdown', dismiss));
  }
  const kb = scene.input.keyboard; const onEsc = () => dismiss();
  if (kb) { kb.on('keydown-ESC', onEsc); c.once('destroy', () => kb.off('keydown-ESC', onEsc)); }

  const fit = () => { const vw = W - 2 * (scene.uiInsetX || 0), vh = H - 2 * (scene.uiInsetY || 0); const s = Math.min(1, (vw - 24) / CW, (vh - 24) / CH); K.setScale(s).setPosition(W / 2 - CW * s / 2, H / 2 - CH * s / 2); };
  scene._purchaseRelayout = fit; fit();
  scene.tweens.add({ targets: c, alpha: 1, duration: 220 });
  K.setScale(K.scale * 0.9); scene.tweens.add({ targets: K, scale: K.scale / 0.9, duration: 300, ease: 'Back.easeOut' });
}
