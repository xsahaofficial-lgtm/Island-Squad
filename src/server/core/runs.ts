import type { redis } from '@devvit/web/server';
import { keys } from './keys.ts';

export type RunsRedis = Pick<
  typeof redis,
  'hSet' | 'hGetAll' | 'hSetNX' | 'expire' | 'incrBy'
>;

const RUN_TTL_SECONDS = 6 * 60 * 60 + 600;

export const withinRateLimit = async (
  r: RunsRedis,
  bucket: string,
  userId: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> => {
  const key = keys.rate(bucket, userId);
  const n = await r.incrBy(key, 1);
  if (n === 1) await r.expire(key, windowSeconds);
  return n <= limit;
};

export const createRun = async (
  r: RunsRedis,
  userId: string,
  nowMs: number
): Promise<string> => {
  const runId = crypto.randomUUID();
  const key = keys.run(runId);
  await r.hSet(key, { userId, startedAt: String(nowMs) });
  await r.expire(key, RUN_TTL_SECONDS);
  return runId;
};

export type ClaimResult =
  | { ok: true; elapsedMs: number }
  | { ok: false; reason: 'invalid-run' };

export const claimRun = async (
  r: RunsRedis,
  runId: string,
  userId: string,
  nowMs: number
): Promise<ClaimResult> => {
  const key = keys.run(runId);
  const run = await r.hGetAll(key);
  if (run['userId'] !== userId) return { ok: false, reason: 'invalid-run' };
  const startedAt = Number(run['startedAt']);
  if (!Number.isFinite(startedAt)) return { ok: false, reason: 'invalid-run' };
  const first = await r.hSetNX(key, 'claimed', '1');
  if (first !== 1) return { ok: false, reason: 'invalid-run' };
  return { ok: true, elapsedMs: nowMs - startedAt };
};
