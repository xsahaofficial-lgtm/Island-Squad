import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  maxPossibleKills,
  maxPossibleScore,
  maxScorePerShip,
  minRunDurationMs,
  waveShipCount,
  waveSpawnGapMs,
} from '../../shared/rules.ts';

test('wave sizes match the original game formula', () => {
  assert.equal(waveShipCount(1), 5);
  assert.equal(waveShipCount(2), 7);
  assert.equal(waveShipCount(10), 21);
});

test('spawn gap shrinks but never below 280ms', () => {
  assert.equal(waveSpawnGapMs(1), 880);
  assert.equal(waveSpawnGapMs(100), 280);
});

test('best ship score unlocks with the waves', () => {
  assert.equal(maxScorePerShip(1), 15);
  assert.equal(maxScorePerShip(2), 40);
  assert.equal(maxScorePerShip(3), 70);
  assert.equal(maxScorePerShip(5), 120);
  assert.equal(maxScorePerShip(7), 200);
});

test('bounds grow monotonically with the wave reached', () => {
  for (let w = 1; w < 60; w++) {
    assert.ok(maxPossibleKills(w + 1) > maxPossibleKills(w));
    assert.ok(maxPossibleScore(w + 1) > maxPossibleScore(w));
    assert.ok(minRunDurationMs(w + 1) >= minRunDurationMs(w));
  }
});

test('wave 1 needs at least the unskippable 5s delay', () => {
  assert.equal(minRunDurationMs(1), 5000);
});
