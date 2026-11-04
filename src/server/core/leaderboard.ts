import type { redis } from '@devvit/web/server';
import type {
  LeaderboardEntry,
  LeaderboardResponse,
  Period,
} from '../../shared/api.ts';
import { DAILY_BOARD_TTL_SECONDS, dayStamp, keys } from './keys.ts';

export type BoardRedis = Pick<
  typeof redis,
  | 'zAdd'
  | 'zScore'
  | 'zRank'
  | 'zCard'
  | 'zRange'
  | 'zRem'
  | 'hGet'
  | 'hSet'
  | 'hIncrBy'
  | 'expire'
  | 'del'
>;

const DAY_MS = 24 * 60 * 60 * 1000;

const boardKey = (period: Period, day: string): string =>
  period === 'all' ? keys.allTime : keys.daily(day);

export const rankOf = async (
  r: BoardRedis,
  key: string,
  member: string
): Promise<number | null> => {
  const asc = await r.zRank(key, member);
  if (asc === undefined) return null;
  const total = await r.zCard(key);
  return total - asc;
};

export type PlayerSnapshot = {
  best: number;
  rank: number | null;
  dailyBest: number;
  dailyRank: number | null;
  gamesPlayed: number;
};

export const getSnapshot = async (
  r: BoardRedis,
  userId: string,
  username: string,
  day: string
): Promise<PlayerSnapshot> => {
  const [best, dailyBest, games, rank, dailyRank] = await Promise.all([
    r.zScore(keys.allTime, username),
    r.zScore(keys.daily(day), username),
    r.hGet(keys.player(userId), 'games'),
    rankOf(r, keys.allTime, username),
    rankOf(r, keys.daily(day), username),
  ]);
  return {
    best: best ?? 0,
    rank,
    dailyBest: dailyBest ?? 0,
    dailyRank,
    gamesPlayed: Number(games ?? 0) || 0,
  };
};

export type RecordResult = PlayerSnapshot & { isNewBest: boolean };

export const recordRun = async (
  r: BoardRedis,
  p: { userId: string; username: string; score: number; nowMs: number }
): Promise<RecordResult> => {
  const day = dayStamp(new Date(p.nowMs));
  const [prevBest, prevDaily] = await Promise.all([
    r.zScore(keys.allTime, p.username),
    r.zScore(keys.daily(day), p.username),
  ]);

  let isNewBest = false;
  if (p.score > 0 && p.score > (prevBest ?? 0)) {
    await r.zAdd(keys.allTime, { member: p.username, score: p.score });
    isNewBest = true;
  }
  if (p.score > 0 && p.score > (prevDaily ?? 0)) {
    await r.zAdd(keys.daily(day), { member: p.username, score: p.score });
    await r.expire(keys.daily(day), DAILY_BOARD_TTL_SECONDS);
  }

  await r.hIncrBy(keys.player(p.userId), 'games', 1);
  await r.hSet(keys.player(p.userId), { lastPlayed: String(p.nowMs) });

  const snap = await getSnapshot(r, p.userId, p.username, day);
  return { ...snap, isNewBest };
};

export const readBoard = async (
  r: BoardRedis,
  period: Period,
  limit: number,
  viewer: string | null,
  day: string
): Promise<LeaderboardResponse> => {
  const key = boardKey(period, day);
  const [rows, total] = await Promise.all([
    r.zRange(key, 0, limit - 1, { by: 'rank', reverse: true }),
    r.zCard(key),
  ]);
  const entries: LeaderboardEntry[] = rows.map((row, i) => ({
    rank: i + 1,
    username: row.member,
    score: row.score,
  }));

  let rank: number | null = null;
  let score: number | null = null;
  if (viewer) {
    const [s, rk] = await Promise.all([
      r.zScore(key, viewer),
      rankOf(r, key, viewer),
    ]);
    score = s ?? null;
    rank = rk;
  }
  return {
    type: 'leaderboard',
    period,
    day,
    entries,
    total,
    me: { username: viewer, rank, score },
  };
};

const knownBoardKeys = (nowMs: number): string[] => {
  const list = [keys.allTime];
  const days = Math.ceil(DAILY_BOARD_TTL_SECONDS / (24 * 60 * 60)) + 1;
  for (let i = 0; i < days; i++) {
    list.push(keys.daily(dayStamp(new Date(nowMs - i * DAY_MS))));
  }
  return list;
};

export const resetBoards = async (r: BoardRedis, nowMs: number): Promise<void> => {
  for (const key of knownBoardKeys(nowMs)) await r.del(key);
};

export const removePlayer = async (
  r: BoardRedis,
  username: string,
  nowMs: number
): Promise<boolean> => {
  const wanted = username.trim().replace(/^u\//i, '').toLowerCase();
  if (!wanted) return false;
  let found = false;
  for (const key of knownBoardKeys(nowMs)) {
    const rows = await r.zRange(key, 0, 4999, { by: 'rank', reverse: true });
    const hits = rows
      .filter((row) => row.member.toLowerCase() === wanted)
      .map((row) => row.member);
    if (hits.length > 0) {
      await r.zRem(key, hits);
      found = true;
    }
  }
  return found;
};
