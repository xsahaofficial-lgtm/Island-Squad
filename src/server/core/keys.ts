
export const dayStamp = (date: Date = new Date()): string =>
  date.toISOString().slice(0, 10);

export const keys = {
  allTime: 'lb:all',
  daily: (day: string): string => `lb:day:${day}`,
  player: (userId: string): string => `player:${userId}`,
  inventory: (userId: string): string => `inv:${userId}`,
  order: (orderId: string): string => `order:${orderId}`,
  runBuys: (runId: string): string => `runbuy:${runId}`,
  run: (runId: string): string => `run:${runId}`,
  rate: (bucket: string, userId: string): string => `rate:${bucket}:${userId}`,
};

export const DAILY_BOARD_TTL_SECONDS = 14 * 24 * 60 * 60;
