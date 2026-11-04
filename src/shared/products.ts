import { GAME_NAME } from './brand.ts';

export type AbilityKey = 'shield' | 'repair' | 'airstrike' | 'navy' | 'doubler' | 'revive';

export type Sku =
  | 'pu_shield'
  | 'pu_repair'
  | 'pu_airstrike'
  | 'pu_frigate'
  | 'pu_doubler'
  | 'pu_revive'
  | 'coins_200'
  | 'fill_5'
  | 'fill_25'
  | 'fill_50'
  | 'fill_100';

export type Effect =
  | { type: 'extra'; ability: AbilityKey }
  | { type: 'coins'; amount: number };

export type Product = {
  sku: Sku;
  displayName: string;
  description: string;
  price: number;
  accountingType: 'CONSUMABLE';
  effect: Effect;
};

export const EXTRA_CAP = 3;
export const RUN_CAPS: Readonly<Record<AbilityKey, number>> = {
  shield: 1,
  repair: 1,
  airstrike: 2,
  navy: 3,
  doubler: 2,
  revive: 1,
};
export const runCap = (ability: AbilityKey): number => RUN_CAPS[ability];
export const COIN_PACK_RUN_CAP = 2;
export const GOLD_PER_MISSING_COIN = 0.0625;
export const FILL_COINS_PER_GOLD = 16;
export const POWERUP_PRICE = 25;
export const REVIVE_PRICE = 50;
export const COIN_PACK_COINS = 200;
export const COIN_PACK_PRICE = 25;

const powerup = (
  sku: Sku,
  ability: AbilityKey,
  name: string,
  price: number = POWERUP_PRICE,
  description?: string
): Product => ({
  sku,
  displayName: `${name} (+1 use)`,
  description: description ?? `One extra use of the ${name} power-up in ${GAME_NAME}.`,
  price,
  accountingType: 'CONSUMABLE',
  effect: { type: 'extra', ability },
});

const fill = (price: number): Product => ({
  sku: `fill_${price}` as Sku,
  displayName: `${price * FILL_COINS_PER_GOLD} coins (top-up)`,
  description: `${price * FILL_COINS_PER_GOLD} in-game coins at the top-up rate, used to cover coins you are missing for a purchase.`,
  price,
  accountingType: 'CONSUMABLE',
  effect: { type: 'coins', amount: price * FILL_COINS_PER_GOLD },
});

export const PRODUCTS: Readonly<Record<Sku, Product>> = {
  pu_shield: powerup('pu_shield', 'shield', 'Shield'),
  pu_repair: powerup('pu_repair', 'repair', 'Repair'),
  pu_airstrike: powerup('pu_airstrike', 'airstrike', 'Airstrike'),
  pu_frigate: powerup('pu_frigate', 'navy', 'Frigate'),
  pu_doubler: powerup('pu_doubler', 'doubler', '2X Gold'),
  pu_revive: powerup(
    'pu_revive',
    'revive',
    'Continue',
    REVIVE_PRICE,
    `One continue after the castle falls in ${GAME_NAME}.`
  ),
  coins_200: {
    sku: 'coins_200',
    displayName: `${COIN_PACK_COINS} coins`,
    description: `${COIN_PACK_COINS} in-game coins for ${GAME_NAME}.`,
    price: COIN_PACK_PRICE,
    accountingType: 'CONSUMABLE',
    effect: { type: 'coins', amount: COIN_PACK_COINS },
  },
  fill_5: fill(5),
  fill_25: fill(25),
  fill_50: fill(50),
  fill_100: fill(100),
};

export const SKUS = Object.keys(PRODUCTS) as Sku[];

export const isSku = (value: string): value is Sku =>
  Object.hasOwn(PRODUCTS, value);

export const extraSku = (ability: AbilityKey): Sku =>
  ability === 'navy' ? 'pu_frigate' : (`pu_${ability}` as Sku);

export const COIN_PACK_SKU: Sku = 'coins_200';

const FILL_TIERS = [5, 25, 50, 100] as const;

export type FillPlan = {
  shortfall: number;
  exactGold: number;
  skus: Sku[];
  payGold: number;
  coins: number;
};

export const planCoinFill = (shortfall: number): FillPlan => {
  const need = Math.max(0, Math.ceil(shortfall));
  if (need === 0) return { shortfall: 0, exactGold: 0, skus: [], payGold: 0, coins: 0 };
  const exactGold = Math.max(1, Math.round(need * GOLD_PER_MISSING_COIN));
  const coverGold = Math.max(1, Math.ceil(need * GOLD_PER_MISSING_COIN));
  const skus: Sku[] = [];
  let remaining = coverGold;
  const top = FILL_TIERS[FILL_TIERS.length - 1] as number;
  while (remaining > top) {
    skus.push(`fill_${top}` as Sku);
    remaining -= top;
  }
  const tier = FILL_TIERS.find((t) => t >= remaining) ?? top;
  skus.push(`fill_${tier}` as Sku);
  const payGold = skus.reduce((sum, s) => sum + PRODUCTS[s].price, 0);
  const coins = skus.reduce((sum, s) => {
    const e = PRODUCTS[s].effect;
    return sum + (e.type === 'coins' ? e.amount : 0);
  }, 0);
  return { shortfall: need, exactGold, skus, payGold, coins };
};
