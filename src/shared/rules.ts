
export type ShipKind =
  | 'gunboat'
  | 'scout'
  | 'destroyer'
  | 'cruiser'
  | 'battleship'
  | 'carrier';

export const SHIP_SCORE: Readonly<Record<ShipKind, number>> = {
  gunboat: 10,
  scout: 15,
  destroyer: 40,
  cruiser: 70,
  battleship: 120,
  carrier: 200,
};

export const SHIP_FIRST_WAVE: Readonly<Record<ShipKind, number>> = {
  gunboat: 1,
  scout: 1,
  destroyer: 2,
  cruiser: 3,
  battleship: 5,
  carrier: 7,
};

export const FIRST_WAVE_DELAY_MS = 5000;

export const waveShipCount = (w: number): number =>
  Math.max(1, 4 + Math.floor(w * 1.7));

export const waveSpawnGapMs = (w: number): number =>
  Math.max(280, 900 - w * 20);

export const maxScorePerShip = (w: number): number => {
  let best = 0;
  for (const kind of Object.keys(SHIP_SCORE) as ShipKind[]) {
    if (SHIP_FIRST_WAVE[kind] <= w) best = Math.max(best, SHIP_SCORE[kind]);
  }
  return best;
};

export const maxPossibleKills = (wave: number): number => {
  let total = 0;
  for (let w = 1; w <= wave; w++) total += waveShipCount(w);
  return total;
};

export const maxPossibleScore = (wave: number): number => {
  let total = 0;
  for (let w = 1; w <= wave; w++) total += waveShipCount(w) * maxScorePerShip(w);
  return total;
};

export const minRunDurationMs = (wave: number): number => {
  let ms = FIRST_WAVE_DELAY_MS;
  for (let w = 1; w < wave; w++) ms += (waveShipCount(w) - 1) * waveSpawnGapMs(w);
  return ms;
};
