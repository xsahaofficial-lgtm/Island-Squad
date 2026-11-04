import {
  maxPossibleKills,
  maxPossibleScore,
  minRunDurationMs,
  SHIP_SCORE,
} from '../../shared/rules.ts';

export type RunClaim = {
  runId: string;
  score: number;
  wave: number;
  kills: number;
};

export const MAX_RUN_AGE_MS = 6 * 60 * 60 * 1000;

export const MAX_WAVE = 400;

const SCORE_SLACK = 1.02;
const TIME_SLACK = 0.9;

const MIN_SHIP_SCORE = Math.min(...Object.values(SHIP_SCORE));
const MAX_SHIP_SCORE = Math.max(...Object.values(SHIP_SCORE));

const isCount = (v: unknown): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;

export const parseClaim = (body: unknown): RunClaim | null => {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;
  const { runId, score, wave, kills } = b;
  if (typeof runId !== 'string' || runId.length < 8 || runId.length > 64) {
    return null;
  }
  if (!isCount(score) || !isCount(wave) || !isCount(kills)) return null;
  return { runId, score, wave, kills };
};

export type Verdict =
  | { ok: true }
  | { ok: false; reason: 'implausible' | 'expired-run' };

export const checkClaim = (claim: RunClaim, elapsedMs: number): Verdict => {
  if (elapsedMs > MAX_RUN_AGE_MS) return { ok: false, reason: 'expired-run' };
  if (elapsedMs < 0) return { ok: false, reason: 'implausible' };

  const { score, wave, kills } = claim;
  if (wave < 1 || wave > MAX_WAVE) return { ok: false, reason: 'implausible' };

  if (elapsedMs < minRunDurationMs(wave) * TIME_SLACK) {
    return { ok: false, reason: 'implausible' };
  }
  if (kills > maxPossibleKills(wave)) return { ok: false, reason: 'implausible' };
  if (score > Math.ceil(maxPossibleScore(wave) * SCORE_SLACK)) {
    return { ok: false, reason: 'implausible' };
  }
  if (score < kills * MIN_SHIP_SCORE || score > kills * MAX_SHIP_SCORE) {
    return { ok: false, reason: 'implausible' };
  }
  return { ok: true };
};
