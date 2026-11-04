import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { COIN_PACK_COINS, COIN_PACK_RUN_CAP, EXTRA_CAP, PRODUCTS, SKUS, isSku, planCoinFill, runCap } from '../../shared/products.ts';

const PU_RUN_CAP = runCap('navy');
import type { InvRedis } from './inventory.ts';
import { applyOrder, claimCoins, getInventory, revertOrder, useExtra } from './inventory.ts';

const fake = () => {
  const h = new Map<string, Record<string, string>>();
  return {
    hSet: async (k: string, f: Record<string, string>) => {
      h.set(k, { ...(h.get(k) ?? {}), ...f });
      return Object.keys(f).length;
    },
    expire: async () => {},
    hGet: async (k: string, f: string) => h.get(k)?.[f],
    hGetAll: async (k: string) => ({ ...(h.get(k) ?? {}) }),
    hIncrBy: async (k: string, f: string, n: number) => {
      const cur = { ...(h.get(k) ?? {}) };
      const v = (Number(cur[f] ?? 0) || 0) + n;
      cur[f] = String(v);
      h.set(k, cur);
      return v;
    },
  };
};
const R = (r: ReturnType<typeof fake>) => r as unknown as InvRedis;
const NOW = Date.UTC(2026, 9, 22);
const buy = async (r: ReturnType<typeof fake>, id: string, skus: string[], user = 't2_a', now = NOW, run = 'run-aaaa-0001') => {
  await r.hSet(`run:${run}`, { userId: user });
  return applyOrder(R(r), { id, skus }, user, now, run);
};

test('a paid power-up order adds exactly one extra use', async () => {
  const r = fake();
  assert.deepEqual(await buy(r, 'o1', ['pu_airstrike']), { ok: true, already: false });
  const inv = await getInventory(R(r), 't2_a');
  assert.equal(inv.extras['airstrike'], 1);
  assert.equal(inv.extras['shield'], 0);
});

test('a coin pack credits the coin bank, and claiming hands the coins out once', async () => {
  const r = fake();
  await buy(r, 'o1', ['coins_200']);
  assert.equal((await getInventory(R(r), 't2_a')).bankedCoins, COIN_PACK_COINS);
  assert.equal(await claimCoins(R(r), 't2_a'), COIN_PACK_COINS);
  assert.equal(await claimCoins(R(r), 't2_a'), 0);
  assert.equal((await getInventory(R(r), 't2_a')).bankedCoins, 0);
});

test('a repeated callback for the same order is applied only once', async () => {
  const r = fake();
  await buy(r, 'o1', ['pu_shield']);
  const again = await buy(r, 'o1', ['pu_shield'], 't2_a', NOW + 5_000);
  assert.deepEqual(again, { ok: true, already: true });
  assert.equal((await getInventory(R(r), 't2_a')).extras['shield'], 1);
});

test('a callback that arrives while the order is being processed is told to retry', async () => {
  const r = fake();
  await r.hSet('order:o1', { userId: 't2_a', lock: String(NOW) });
  const res = await buy(r, 'o1', ['pu_shield'], 't2_a', NOW + 1_000);
  assert.equal(res.ok, false);
  assert.equal((await buy(r, 'o1', ['pu_shield'], 't2_a', NOW + 120_000)).ok, true);
  assert.equal((await getInventory(R(r), 't2_a')).extras['shield'], 1);
});

test(`at most ${PU_RUN_CAP} extra uses of one power-up can be bought per game`, async () => {
  const r = fake();
  for (let i = 0; i < PU_RUN_CAP; i++) assert.equal((await buy(r, `o${i}`, ['pu_frigate'])).ok, true);
  const over = await buy(r, 'over', ['coins_200', 'pu_frigate']);
  assert.equal(over.ok, false);
  const inv = await getInventory(R(r), 't2_a');
  assert.equal(inv.extras['navy'], PU_RUN_CAP);
  assert.equal(inv.bankedCoins, 0, 'the coins in the rejected order must not be credited');
  assert.equal((await buy(r, 'other', ['pu_shield'])).ok, true, 'other power-ups have their own limit');
});

test('buying a use together with coins (a coin top-up in the same game) counts the same', async () => {
  const r = fake();
  for (let i = 0; i < PU_RUN_CAP; i++) assert.equal((await buy(r, `o${i}`, ['fill_50', 'pu_frigate'])).ok, true);
  assert.equal((await buy(r, 'x', ['fill_50', 'pu_frigate'])).ok, false);
  assert.equal((await getInventory(R(r), 't2_a')).bankedCoins, 800 * PU_RUN_CAP);
});

test(`a new game resets the per-game limit, but unused stock is still capped at ${EXTRA_CAP}`, async () => {
  const r = fake();
  for (let i = 0; i < PU_RUN_CAP; i++) await buy(r, `a${i}`, ['pu_frigate'], 't2_a', NOW, 'run-game-0001');
  assert.equal((await buy(r, 'b0', ['pu_frigate'], 't2_a', NOW, 'run-game-0002')).ok, false, 'already holding 3 unused');
  await useExtra(R(r), 't2_a', 'navy');
  assert.equal((await buy(r, 'b1', ['pu_frigate'], 't2_a', NOW, 'run-game-0002')).ok, true);
});

test(`at most ${COIN_PACK_RUN_CAP} coin packs per game, and a new game starts again`, async () => {
  const r = fake();
  for (let i = 0; i < COIN_PACK_RUN_CAP; i++) assert.equal((await buy(r, `p${i}`, ['coins_200'])).ok, true);
  assert.equal((await buy(r, 'p-over', ['coins_200'])).ok, false);
  assert.equal((await getInventory(R(r), 't2_a')).bankedCoins, COIN_PACK_COINS * COIN_PACK_RUN_CAP);
  assert.equal((await buy(r, 'p-new', ['coins_200'], 't2_a', NOW, 'run-game-0002')).ok, true);
});

test('limited items need a game that belongs to the buyer; top-ups do not', async () => {
  const r = fake();
  assert.equal((await applyOrder(R(r), { id: 'n1', skus: ['pu_shield'] }, 't2_a', NOW, undefined)).ok, false);
  assert.equal((await applyOrder(R(r), { id: 'n2', skus: ['coins_200'] }, 't2_a', NOW, 'run-nope-0001')).ok, false, 'unknown game');
  await r.hSet('run:run-bobs-0001', { userId: 't2_b' });
  assert.equal((await applyOrder(R(r), { id: 'n3', skus: ['pu_shield'] }, 't2_a', NOW, 'run-bobs-0001')).ok, false, "someone else's game");
  assert.equal((await applyOrder(R(r), { id: 'n4', skus: ['fill_25'] }, 't2_a', NOW, undefined)).ok, true);
  assert.equal((await getInventory(R(r), 't2_a')).bankedCoins, 400);
});

test('unknown / tampered products and orders without lines apply nothing', async () => {
  const r = fake();
  assert.equal((await buy(r, 'o1', ['pu_shield', 'free_everything'])).ok, false);
  assert.equal((await buy(r, 'o2', ['toString'])).ok, false);
  assert.equal((await buy(r, 'o3', [])).ok, false);
  assert.equal((await buy(r, '', ['pu_shield'])).ok, false);
  const inv = await getInventory(R(r), 't2_a');
  assert.deepEqual(inv.extras, { shield: 0, repair: 0, airstrike: 0, navy: 0, doubler: 0, revive: 0 });
});

test('an order can never be moved to another player', async () => {
  const r = fake();
  await buy(r, 'o1', ['pu_repair']);
  assert.equal((await buy(r, 'o1', ['pu_repair'], 't2_b')).ok, false);
  assert.equal((await getInventory(R(r), 't2_b')).extras['repair'], 0);
});

test('using an extra never goes below zero', async () => {
  const r = fake();
  await buy(r, 'o1', ['pu_shield']);
  assert.deepEqual(await useExtra(R(r), 't2_a', 'shield'), { ok: true, remaining: 0 });
  assert.deepEqual(await useExtra(R(r), 't2_a', 'shield'), { ok: false, remaining: 0 });
  assert.equal((await getInventory(R(r), 't2_a')).extras['shield'], 0);
  assert.equal((await useExtra(R(r), 't2_a', 'not-a-power-up')).ok, false);
});

test('a refund takes back only what is left, once, and blocks re-delivery', async () => {
  const r = fake();
  await buy(r, 'o1', ['pu_airstrike']);
  await buy(r, 'o2', ['coins_200']);
  await useExtra(R(r), 't2_a', 'airstrike');
  assert.equal(await revertOrder(R(r), 'o1', NOW), true);
  assert.equal((await getInventory(R(r), 't2_a')).extras['airstrike'], 0, 'never negative');
  assert.equal(await revertOrder(R(r), 'o2', NOW), true);
  assert.equal((await getInventory(R(r), 't2_a')).bankedCoins, 0);
  assert.equal(await revertOrder(R(r), 'o2', NOW), false);
  assert.equal(await revertOrder(R(r), 'never-seen', NOW), false);
  assert.equal((await buy(r, 'o2', ['coins_200'])).ok, false, 'a refunded order cannot be delivered again');
});

test('missing coins: 260 coins -> 16 Gold exact -> sold as the 25-Gold tier (400 coins)', () => {
  const p = planCoinFill(260);
  assert.equal(p.exactGold, 16);
  assert.deepEqual(p.skus, ['fill_25']);
  assert.equal(p.payGold, 25);
  assert.equal(p.coins, 400);
});

test('missing coins: small, zero and large shortfalls', () => {
  assert.deepEqual(planCoinFill(0).skus, []);
  assert.deepEqual(planCoinFill(12).skus, ['fill_5']);
  assert.equal(planCoinFill(1).exactGold, 1);
  assert.deepEqual(planCoinFill(100).skus, ['fill_25']);
  assert.deepEqual(planCoinFill(800).skus, ['fill_50']);
  assert.deepEqual(planCoinFill(3200).skus, ['fill_100', 'fill_100']);
});

test('missing coins: always covers the shortfall, never undercharges the 0.0625 rate', () => {
  for (let n = 1; n <= 5000; n++) {
    const p = planCoinFill(n);
    assert.ok(p.coins >= n, `${n}: got ${p.coins} coins`);
    assert.ok(p.payGold >= p.exactGold);
    assert.ok(p.skus.every((s) => isSku(s)));
  }
});

test('buy limits per game: Shield 1, Repair 1, Airstrike 2, Frigate 3', async () => {
  const limits: Array<[string, number]> = [['pu_shield', 1], ['pu_repair', 1], ['pu_airstrike', 2], ['pu_frigate', 3]];
  for (const [sku, cap] of limits) {
    const r = fake();
    for (let i = 0; i < cap; i++) assert.equal((await buy(r, `${sku}-${i}`, [sku])).ok, true, `${sku} #${i + 1}`);
    assert.equal((await buy(r, `${sku}-over`, [sku])).ok, false, `${sku} must stop at ${cap}`);
  }
  assert.equal(runCap('shield') + runCap('repair') + runCap('airstrike') + runCap('navy'), 7);
});

test('coin packs: two per game, 400 coins at most', async () => {
  const r = fake();
  assert.equal(COIN_PACK_RUN_CAP, 2);
  assert.equal((await buy(r, 'c1', ['coins_200'])).ok, true);
  assert.equal((await buy(r, 'c2', ['coins_200'])).ok, true);
  assert.equal((await buy(r, 'c3', ['coins_200'])).ok, false);
  assert.equal((await getInventory(R(r), 't2_a')).bankedCoins, 400);
});

test('2X Gold: at most 2 extra uses per game (the first use each game is free and not sold)', async () => {
  const r = fake();
  assert.equal(runCap('doubler'), 2);
  assert.equal((await buy(r, 'd1', ['pu_doubler'])).ok, true);
  assert.equal((await buy(r, 'd2', ['pu_doubler'])).ok, true);
  assert.equal((await buy(r, 'd3', ['pu_doubler'])).ok, false);
  assert.equal((await getInventory(R(r), 't2_a')).extras['doubler'], 2);
  assert.equal((await buy(r, 'd4', ['pu_doubler'], 't2_a', NOW, 'run-game-0002')).ok, true, 'a new game allows more (holding 2 + 1 is within the stock cap of 3)');
  assert.equal((await buy(r, 'd5', ['pu_doubler'], 't2_a', NOW, 'run-game-0002')).ok, false, 'but never more than 3 unused');
});

test('Continue (revive): once per game, a new game allows another', async () => {
  const r = fake();
  assert.equal(runCap('revive'), 1);
  assert.equal((await buy(r, 'v1', ['pu_revive'])).ok, true);
  assert.equal((await buy(r, 'v2', ['pu_revive'])).ok, false, 'second continue in the same game');
  assert.equal((await useExtra(R(r), 't2_a', 'revive')).ok, true);
  assert.equal((await buy(r, 'v3', ['pu_revive'], 't2_a', NOW, 'run-game-0002')).ok, true, 'new game');
  assert.equal((await buy(r, 'v4', ['pu_revive'], 't2_a', NOW, 'run-game-0002')).ok, false);
});

const read = (rel: string) => JSON.parse(readFileSync(new URL(rel, import.meta.url), 'utf8')) as Record<string, unknown>;
type JsonProduct = { sku: string; displayName: string; description?: string; price: number; accountingType: string };

test('src/products.json matches the shared catalog and the SDK product schema', () => {
  const file = read('../../products.json') as { products: JsonProduct[] };
  const schema = read('../../../node_modules/@devvit/shared-types/schemas/products.json') as {
    properties: { products: { items: { properties: {
      price: { enum: number[] }; accountingType: { enum: string[] };
      sku: { pattern: string; maxLength: number }; displayName: { maxLength: number }; description: { maxLength: number };
    } } } };
  };
  const rules = schema.properties.products.items.properties;
  assert.deepEqual(file.products.map((p) => p.sku).sort(), [...SKUS].sort());
  for (const p of file.products) {
    assert.ok(isSku(p.sku));
    const code = PRODUCTS[p.sku as keyof typeof PRODUCTS];
    assert.equal(p.price, code.price, `${p.sku} price differs from src/shared/products.ts`);
    assert.equal(p.displayName, code.displayName);
    assert.equal(p.description, code.description);
    assert.equal(p.accountingType, code.accountingType);
    assert.ok(rules.price.enum.includes(p.price), `${p.sku}: ${p.price} Gold is not an allowed Reddit price`);
    assert.ok(rules.accountingType.enum.includes(p.accountingType));
    assert.match(p.sku, new RegExp(rules.sku.pattern));
    assert.ok(p.sku.length <= rules.sku.maxLength && p.displayName.length <= rules.displayName.maxLength);
    assert.ok((p.description ?? '').length <= rules.description.maxLength);
  }
});
