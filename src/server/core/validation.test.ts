import assert from 'node:assert/strict';
import { test } from 'node:test';
import { minRunDurationMs } from '../../shared/rules.ts';
import { checkClaim, parseClaim } from './validation.ts';

const claim = (o: Partial<{ score: number; wave: number; kills: number }> = {}) => ({
  runId: 'run-12345678',
  score: 500,
  wave: 6,
  kills: 30,
  ...o,
});
const okTime = (wave: number) => minRunDurationMs(wave) + 30_000;

test('accepts a plausible run', () => {
  assert.deepEqual(checkClaim(claim(), okTime(6)), { ok: true });
});

test('rejects a run that finished faster than its waves can spawn', () => {
  const v = checkClaim(claim(), 3_000);
  assert.deepEqual(v, { ok: false, reason: 'implausible' });
});

test('rejects a score above what the waves could contain', () => {
  const v = checkClaim(claim({ score: 99_999, kills: 500 }), okTime(6));
  assert.equal(v.ok, false);
});

test('rejects more kills than ships spawned', () => {
  const v = checkClaim(claim({ kills: 10_000, score: 10_000 }), okTime(6));
  assert.equal(v.ok, false);
});

test('rejects a score inconsistent with the kill count', () => {
  assert.equal(checkClaim(claim({ kills: 30, score: 20 }), okTime(6)).ok, false);
  assert.equal(checkClaim(claim({ kills: 2, score: 900 }), okTime(6)).ok, false);
});

test('rejects wave 0 and absurd waves', () => {
  assert.equal(checkClaim(claim({ wave: 0 }), 60_000).ok, false);
  assert.equal(checkClaim(claim({ wave: 1_000_000 }), 1e12).ok, false);
});

test('rejects expired run tokens', () => {
  const v = checkClaim(claim(), 7 * 60 * 60 * 1000);
  assert.deepEqual(v, { ok: false, reason: 'expired-run' });
});

test('parseClaim rejects malformed bodies', () => {
  assert.equal(parseClaim(null), null);
  assert.equal(parseClaim({}), null);
  assert.equal(parseClaim({ runId: 'x', score: 1, wave: 1, kills: 0 }), null);
  assert.equal(parseClaim({ runId: 'run-12345678', score: -1, wave: 1, kills: 0 }), null);
  assert.equal(parseClaim({ runId: 'run-12345678', score: 1.5, wave: 1, kills: 0 }), null);
  assert.equal(parseClaim({ runId: 'run-12345678', score: '9', wave: 1, kills: 0 }), null);
  assert.deepEqual(parseClaim({ runId: 'run-12345678', score: 10, wave: 1, kills: 1 }), {
    runId: 'run-12345678',
    score: 10,
    wave: 1,
    kills: 1,
  });
});
