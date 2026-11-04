import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { BoardRedis } from './leaderboard.ts';
import { readBoard, recordRun, removePlayer, resetBoards } from './leaderboard.ts';
import type { RunsRedis } from './runs.ts';
import { claimRun, createRun, withinRateLimit } from './runs.ts';

const fakeRedis = () => {
  const hashes = new Map<string, Record<string, string>>();
  const zsets = new Map<string, Map<string, number>>();
  const counters = new Map<string, number>();
  const z = (k: string) => zsets.get(k) ?? zsets.set(k, new Map()).get(k)!;
  const sorted = (k: string) => [...z(k)].sort((a, b) => a[1] - b[1]);
  return {
    hSet: async (k: string, f: Record<string, string>) => {
      hashes.set(k, { ...(hashes.get(k) ?? {}), ...f });
      return Object.keys(f).length;
    },
    hGet: async (k: string, f: string) => hashes.get(k)?.[f],
    hGetAll: async (k: string) => ({ ...(hashes.get(k) ?? {}) }),
    hSetNX: async (k: string, f: string, v: string) => {
      const h = hashes.get(k) ?? {};
      if (f in h) return 0;
      hashes.set(k, { ...h, [f]: v });
      return 1;
    },
    hIncrBy: async (k: string, f: string, n: number) => {
      const h = hashes.get(k) ?? {};
      const v = Number(h[f] ?? 0) + n;
      hashes.set(k, { ...h, [f]: String(v) });
      return v;
    },
    incrBy: async (k: string, n: number) => {
      const v = (counters.get(k) ?? 0) + n;
      counters.set(k, v);
      return v;
    },
    expire: async () => {},
    del: async (...ks: string[]) => ks.forEach((k) => { zsets.delete(k); hashes.delete(k); }),
    zAdd: async (k: string, ...ms: { member: string; score: number }[]) => {
      ms.forEach((m) => z(k).set(m.member, m.score));
      return ms.length;
    },
    zScore: async (k: string, m: string) => zsets.get(k)?.get(m),
    zRank: async (k: string, m: string) => {
      const i = sorted(k).findIndex(([name]) => name === m);
      return i < 0 ? undefined : i;
    },
    zCard: async (k: string) => zsets.get(k)?.size ?? 0,
    zRange: async (k: string, a: number, b: number, o?: { reverse?: boolean }) => {
      const rows = sorted(k).map(([member, score]) => ({ member, score }));
      if (o?.reverse) rows.reverse();
      return rows.slice(a, b + 1);
    },
    zRem: async (k: string, ms: string[]) => {
      ms.forEach((m) => z(k).delete(m));
      return ms.length;
    },
  };
};
const asRuns = (r: ReturnType<typeof fakeRedis>) => r as unknown as RunsRedis;
const asBoard = (r: ReturnType<typeof fakeRedis>) => r as unknown as BoardRedis;
const NOW = Date.UTC(2026, 9, 22, 12, 0, 0);

test('a run token works once and only for its owner', async () => {
  const r = fakeRedis();
  const id = await createRun(asRuns(r), 't2_alice', NOW);
  assert.deepEqual(await claimRun(asRuns(r), id, 't2_bob', NOW + 1), { ok: false, reason: 'invalid-run' });
  const first = await claimRun(asRuns(r), id, 't2_alice', NOW + 60_000);
  assert.deepEqual(first, { ok: true, elapsedMs: 60_000 });
  assert.deepEqual(await claimRun(asRuns(r), id, 't2_alice', NOW + 61_000), { ok: false, reason: 'invalid-run' });
});

test('unknown run tokens are rejected', async () => {
  const r = fakeRedis();
  assert.equal((await claimRun(asRuns(r), 'forged-token-1', 't2_alice', NOW)).ok, false);
});

test('rate limiter blocks after the limit', async () => {
  const r = fakeRedis();
  for (let i = 0; i < 3; i++) assert.equal(await withinRateLimit(asRuns(r), 'x', 'u', 3, 60), true);
  assert.equal(await withinRateLimit(asRuns(r), 'x', 'u', 3, 60), false);
});

test('only a players best score is kept and ranks are 1-based', async () => {
  const r = fakeRedis();
  const run = (u: string, score: number) => recordRun(asBoard(r), { userId: 't2_' + u, username: u, score, nowMs: NOW });
  assert.equal((await run('alice', 500)).isNewBest, true);
  await run('bob', 900);
  const worse = await run('alice', 300);
  assert.equal(worse.isNewBest, false);
  assert.equal(worse.best, 500);
  assert.equal(worse.rank, 2);
  assert.equal(worse.gamesPlayed, 2);
  const better = await run('alice', 1200);
  assert.equal(better.isNewBest, true);
  assert.equal(better.rank, 1);
});

test('leaderboard lists top scores and the viewer position', async () => {
  const r = fakeRedis();
  for (const [u, s] of [['a', 100], ['b', 300], ['c', 200], ['d', 50]] as const) {
    await recordRun(asBoard(r), { userId: 't2_' + u, username: u, score: s, nowMs: NOW });
  }
  const board = await readBoard(asBoard(r), 'all', 2, 'd', '2026-10-22');
  assert.deepEqual(board.entries.map((e) => e.username), ['b', 'c']);
  assert.equal(board.total, 4);
  assert.deepEqual(board.me, { username: 'd', rank: 4, score: 50 });
  const daily = await readBoard(asBoard(r), 'daily', 10, null, '2026-10-22');
  assert.equal(daily.entries.length, 4);
  assert.equal((await readBoard(asBoard(r), 'daily', 10, null, '2026-10-23')).entries.length, 0);
});

test('score 0 never enters the boards', async () => {
  const r = fakeRedis();
  await recordRun(asBoard(r), { userId: 't2_z', username: 'z', score: 0, nowMs: NOW });
  assert.equal((await readBoard(asBoard(r), 'all', 10, 'z', '2026-10-22')).total, 0);
});

test('moderators can remove a player (case-insensitive) and reset', async () => {
  const r = fakeRedis();
  await recordRun(asBoard(r), { userId: 't2_c', username: 'Cheater', score: 9000, nowMs: NOW });
  await recordRun(asBoard(r), { userId: 't2_h', username: 'honest', score: 100, nowMs: NOW });
  assert.equal(await removePlayer(asBoard(r), 'u/cheater', NOW), true);
  assert.equal(await removePlayer(asBoard(r), 'nobody', NOW), false);
  assert.deepEqual((await readBoard(asBoard(r), 'all', 10, null, '2026-10-22')).entries.map((e) => e.username), ['honest']);
  await resetBoards(asBoard(r), NOW);
  assert.equal((await readBoard(asBoard(r), 'all', 10, null, '2026-10-22')).total, 0);
});
