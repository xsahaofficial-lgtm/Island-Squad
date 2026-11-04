import type { redis } from '@devvit/web/server';
import {
  COIN_PACK_RUN_CAP,
  COIN_PACK_SKU,
  EXTRA_CAP,
  PRODUCTS,
  isSku,
  runCap,
  type AbilityKey,
  type Effect,
} from '../../shared/products.ts';
import { keys } from './keys.ts';

export type InvRedis = Pick<typeof redis, 'hSet' | 'hGet' | 'hGetAll' | 'hIncrBy' | 'expire'>;

const ABILITIES: readonly AbilityKey[] = ['shield', 'repair', 'airstrike', 'navy', 'doubler', 'revive'];
const LOCK_MS = 60_000;
const MAX_LINES = 10;
const RUN_BUYS_TTL_SECONDS = 7 * 60 * 60;

const validOrderId = (id: unknown): id is string =>
  typeof id === 'string' && id.length > 0 && id.length <= 200;

const effectsOf = (skus: string[]): Effect[] =>
  skus.flatMap((s) => (isSku(s) ? [PRODUCTS[s].effect] : []));

export type ApplyResult =
  | { ok: true; already: boolean }
  | { ok: false; reason: string };

export const applyOrder = async (
  r: InvRedis,
  order: { id: unknown; skus: string[] },
  userId: string,
  nowMs: number,
  runId?: string
): Promise<ApplyResult> => {
  if (!validOrderId(order.id)) return { ok: false, reason: 'Invalid order id.' };
  if (order.skus.length === 0 || order.skus.length > MAX_LINES) {
    return { ok: false, reason: 'Invalid number of products.' };
  }
  for (const sku of order.skus) {
    if (!isSku(sku)) return { ok: false, reason: `Unknown product: ${sku}` };
  }
  const orderKey = keys.order(order.id);
  const rec = await r.hGetAll(orderKey);
  if (rec['userId'] && rec['userId'] !== userId) {
    return { ok: false, reason: 'Order already belongs to another player.' };
  }
  if (rec['status'] === 'applied') return { ok: true, already: true };
  if (rec['status'] === 'reverted') return { ok: false, reason: 'Order was refunded.' };
  if (rec['lock'] && nowMs - Number(rec['lock']) < LOCK_MS) {
    return { ok: false, reason: 'Order is being processed.' };
  }
  await r.hSet(orderKey, { userId, skus: JSON.stringify(order.skus), lock: String(nowMs) });
  const reject = async (reason: string): Promise<ApplyResult> => {
    await r.hSet(orderKey, { lock: '' });
    return { ok: false, reason };
  };

  const effects = effectsOf(order.skus);
  const invKey = keys.inventory(userId);
  const add: Partial<Record<AbilityKey, number>> = {};
  for (const e of effects) if (e.type === 'extra') add[e.ability] = (add[e.ability] ?? 0) + 1;
  const packs = order.skus.filter((s) => s === COIN_PACK_SKU).length;

  for (const ab of ABILITIES) {
    const adding = add[ab] ?? 0;
    if (adding === 0) continue;
    const have = Number((await r.hGet(invKey, `ex:${ab}`)) ?? 0) || 0;
    if (have + adding > EXTRA_CAP) return reject(`Maximum of ${EXTRA_CAP} extra uses reached.`);
  }
  const limited = packs > 0 || Object.keys(add).length > 0;
  let runKey = '';
  if (limited) {
    if (typeof runId !== 'string' || runId.length < 8 || runId.length > 64) {
      return reject('No active game for this purchase.');
    }
    const run = await r.hGetAll(keys.run(runId));
    if (run['userId'] !== userId) return reject('That game does not belong to this player.');
    runKey = keys.runBuys(runId);
    const bought = await r.hGetAll(runKey);
    for (const ab of ABILITIES) {
      const adding = add[ab] ?? 0;
      if (adding > 0 && (Number(bought[`pu:${ab}`] ?? 0) || 0) + adding > runCap(ab)) {
        return reject(`You can buy at most ${runCap(ab)} extra uses of this item per game.`);
      }
    }
    if ((Number(bought['packs'] ?? 0) || 0) + packs > COIN_PACK_RUN_CAP) {
      return reject(`You can buy at most ${COIN_PACK_RUN_CAP} coin packs per game.`);
    }
  }

  for (const e of effects) {
    if (e.type === 'extra') await r.hIncrBy(invKey, `ex:${e.ability}`, 1);
    else await r.hIncrBy(invKey, 'coins', e.amount);
  }
  if (limited) {
    for (const ab of ABILITIES) if ((add[ab] ?? 0) > 0) await r.hIncrBy(runKey, `pu:${ab}`, add[ab] ?? 0);
    if (packs > 0) await r.hIncrBy(runKey, 'packs', packs);
    await r.expire(runKey, RUN_BUYS_TTL_SECONDS);
  }
  await r.hSet(orderKey, { status: 'applied', appliedAt: String(nowMs), lock: '' });
  return { ok: true, already: false };
};

export const revertOrder = async (
  r: InvRedis,
  orderId: unknown,
  nowMs: number
): Promise<boolean> => {
  if (!validOrderId(orderId)) return false;
  const orderKey = keys.order(orderId);
  const rec = await r.hGetAll(orderKey);
  const userId = rec['userId'];
  if (!userId || rec['status'] !== 'applied') return false;
  let skus: string[] = [];
  try {
    const parsed: unknown = JSON.parse(rec['skus'] ?? '[]');
    if (Array.isArray(parsed)) skus = parsed.filter((s): s is string => typeof s === 'string');
  } catch {
    skus = [];
  }
  const invKey = keys.inventory(userId);
  for (const e of effectsOf(skus)) {
    const field = e.type === 'extra' ? `ex:${e.ability}` : 'coins';
    const want = e.type === 'extra' ? 1 : e.amount;
    const have = Number((await r.hGet(invKey, field)) ?? 0) || 0;
    const take = Math.min(have, want);
    if (take > 0) await r.hIncrBy(invKey, field, -take);
  }
  await r.hSet(orderKey, { status: 'reverted', revertedAt: String(nowMs) });
  return true;
};

export type Inventory = { extras: Record<string, number>; bankedCoins: number };

export const getInventory = async (r: InvRedis, userId: string): Promise<Inventory> => {
  const all = await r.hGetAll(keys.inventory(userId));
  const extras: Record<string, number> = {};
  for (const ab of ABILITIES) extras[ab] = Math.max(0, Number(all[`ex:${ab}`] ?? 0) || 0);
  return { extras, bankedCoins: Math.max(0, Number(all['coins'] ?? 0) || 0) };
};

export const useExtra = async (
  r: InvRedis,
  userId: string,
  ability: string
): Promise<{ ok: boolean; remaining: number }> => {
  if (!ABILITIES.includes(ability as AbilityKey)) return { ok: false, remaining: 0 };
  const field = `ex:${ability}`;
  const left = await r.hIncrBy(keys.inventory(userId), field, -1);
  if (left < 0) {
    await r.hIncrBy(keys.inventory(userId), field, 1);
    return { ok: false, remaining: 0 };
  }
  return { ok: true, remaining: left };
};

export const claimCoins = async (r: InvRedis, userId: string): Promise<number> => {
  const invKey = keys.inventory(userId);
  const have = Number((await r.hGet(invKey, 'coins')) ?? 0) || 0;
  if (have <= 0) return 0;
  const left = await r.hIncrBy(invKey, 'coins', -have);
  if (left < 0) {
    await r.hIncrBy(invKey, 'coins', have);
    return 0;
  }
  return have;
};
