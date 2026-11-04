import { Hono } from 'hono';
import { context, redis } from '@devvit/web/server';
import type {
  ClaimCoinsResponse,
  ErrorResponse,
  InventoryResponse,
  InitResponse,
  LeaderboardResponse,
  Period,
  RunStartResponse,
  SubmitResponse,
  UseExtraResponse,
} from '../../shared/api.ts';
import { claimCoins, getInventory, useExtra } from '../core/inventory.ts';
import { dayStamp } from '../core/keys.ts';
import { getSnapshot, readBoard, recordRun } from '../core/leaderboard.ts';
import { claimRun, createRun, withinRateLimit } from '../core/runs.ts';
import { checkClaim, parseClaim } from '../core/validation.ts';

export const api = new Hono();

const getPlayer = (): { userId: string; username: string } | null => {
  const { userId, username } = context;
  if (!userId || !username) return null;
  return { userId, username };
};

const error = (message: string): ErrorResponse => ({
  status: 'error',
  message,
});

api.get('/init', async (c) => {
  try {
    const player = getPlayer();
    const day = dayStamp();
    const snap = player
      ? await getSnapshot(redis, player.userId, player.username, day)
      : null;
    const inv = player ? await getInventory(redis, player.userId) : null;
    return c.json<InitResponse>({
      type: 'init',
      postId: context.postId ?? '',
      subreddit: context.subredditName ?? '',
      username: player?.username ?? null,
      loggedIn: player !== null,
      userId: player?.userId ?? null,
      extras: inv?.extras ?? {},
      bankedCoins: inv?.bankedCoins ?? 0,
      best: snap?.best ?? 0,
      gamesPlayed: snap?.gamesPlayed ?? 0,
      rank: snap?.rank ?? null,
      day,
    });
  } catch (e) {
    console.error('GET /api/init failed', e);
    return c.json<ErrorResponse>(error('Could not load player data'), 500);
  }
});

api.get('/inventory', async (c) => {
  try {
    const player = getPlayer();
    const inv = player ? await getInventory(redis, player.userId) : { extras: {}, bankedCoins: 0 };
    return c.json<InventoryResponse>({ type: 'inventory', ...inv });
  } catch (e) {
    console.error('GET /api/inventory failed', e);
    return c.json<ErrorResponse>(error('Could not load purchases'), 500);
  }
});

api.post('/inventory/use', async (c) => {
  try {
    const player = getPlayer();
    if (!player) return c.json<UseExtraResponse>({ type: 'use-extra', ok: false, remaining: 0 });
    if (!(await withinRateLimit(redis, 'inv', player.userId, 120, 60))) {
      return c.json<ErrorResponse>(error('Too many requests'), 400);
    }
    const body: unknown = await c.req.json().catch(() => null);
    const ability =
      typeof body === 'object' && body !== null && 'ability' in body
        ? String((body as { ability: unknown }).ability)
        : '';
    const res = await useExtra(redis, player.userId, ability);
    return c.json<UseExtraResponse>({ type: 'use-extra', ...res });
  } catch (e) {
    console.error('POST /api/inventory/use failed', e);
    return c.json<ErrorResponse>(error('Could not use the power-up'), 500);
  }
});

api.post('/inventory/claim-coins', async (c) => {
  try {
    const player = getPlayer();
    if (!player) return c.json<ClaimCoinsResponse>({ type: 'claim-coins', coins: 0 });
    if (!(await withinRateLimit(redis, 'inv', player.userId, 120, 60))) {
      return c.json<ErrorResponse>(error('Too many requests'), 400);
    }
    const coins = await claimCoins(redis, player.userId);
    return c.json<ClaimCoinsResponse>({ type: 'claim-coins', coins });
  } catch (e) {
    console.error('POST /api/inventory/claim-coins failed', e);
    return c.json<ErrorResponse>(error('Could not claim coins'), 500);
  }
});

api.get('/leaderboard', async (c) => {
  try {
    const period: Period = c.req.query('period') === 'all' ? 'all' : 'daily';
    const asked = Number(c.req.query('limit'));
    const limit = Number.isFinite(asked) ? Math.min(50, Math.max(1, asked)) : 10;
    const viewer = getPlayer()?.username ?? null;
    const board = await readBoard(redis, period, limit, viewer, dayStamp());
    return c.json<LeaderboardResponse>(board);
  } catch (e) {
    console.error('GET /api/leaderboard failed', e);
    return c.json<ErrorResponse>(error('Could not load the leaderboard'), 500);
  }
});

api.post('/run/start', async (c) => {
  try {
    const player = getPlayer();
    if (!player) {
      return c.json<RunStartResponse>({
        type: 'run-start',
        runId: null,
        reason: 'logged-out',
      });
    }
    const ok = await withinRateLimit(redis, 'start', player.userId, 30, 60);
    if (!ok) {
      return c.json<RunStartResponse>({
        type: 'run-start',
        runId: null,
        reason: 'rate-limited',
      });
    }
    const runId = await createRun(redis, player.userId, Date.now());
    return c.json<RunStartResponse>({ type: 'run-start', runId });
  } catch (e) {
    console.error('POST /api/run/start failed', e);
    return c.json<ErrorResponse>(error('Could not start a run'), 500);
  }
});

api.post('/run/submit', async (c) => {
  try {
    const player = getPlayer();
    const day = dayStamp();
    const empty = {
      isNewBest: false,
      best: 0,
      rank: null,
      dailyRank: null,
      dailyBest: 0,
    } as const;

    if (!player) {
      return c.json<SubmitResponse>({
        type: 'run-submit',
        saved: false,
        reason: 'logged-out',
        ...empty,
      });
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json<ErrorResponse>(error('Invalid JSON body'), 400);
    }
    const claim = parseClaim(body);
    if (!claim) return c.json<ErrorResponse>(error('Invalid run data'), 400);

    const snapshotOnly = async (
      reason: NonNullable<SubmitResponse['reason']>
    ): Promise<SubmitResponse> => {
      const snap = await getSnapshot(redis, player.userId, player.username, day);
      return {
        type: 'run-submit',
        saved: false,
        reason,
        isNewBest: false,
        best: snap.best,
        rank: snap.rank,
        dailyRank: snap.dailyRank,
        dailyBest: snap.dailyBest,
      };
    };

    if (!(await withinRateLimit(redis, 'submit', player.userId, 20, 60))) {
      return c.json<SubmitResponse>(await snapshotOnly('rate-limited'));
    }

    const now = Date.now();
    const claimed = await claimRun(redis, claim.runId, player.userId, now);
    if (!claimed.ok) {
      return c.json<SubmitResponse>(await snapshotOnly('invalid-run'));
    }

    const verdict = checkClaim(claim, claimed.elapsedMs);
    if (!verdict.ok) {
      console.warn(
        `Rejected run (${verdict.reason}) user=${player.userId} wave=${claim.wave} score=${claim.score} kills=${claim.kills} elapsedMs=${claimed.elapsedMs}`
      );
      return c.json<SubmitResponse>(await snapshotOnly(verdict.reason));
    }

    const result = await recordRun(redis, {
      userId: player.userId,
      username: player.username,
      score: claim.score,
      nowMs: now,
    });
    return c.json<SubmitResponse>({
      type: 'run-submit',
      saved: true,
      isNewBest: result.isNewBest,
      best: result.best,
      rank: result.rank,
      dailyRank: result.dailyRank,
      dailyBest: result.dailyBest,
    });
  } catch (e) {
    console.error('POST /api/run/submit failed', e);
    return c.json<ErrorResponse>(error('Could not save the score'), 500);
  }
});
