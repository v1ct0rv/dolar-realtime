import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nearestTickIndex, syncByNearestTime } from './nearestTick';

const ticks = [1000, 2000, 4000].map((value) => ({ value }));

test('nearestTickIndex picks the tick nearest in time', () => {
  assert.equal(nearestTickIndex(ticks, 2100, 500), 1);
  assert.equal(nearestTickIndex(ticks, 3900, 500), 2);
});

test('nearestTickIndex returns -1 when the nearest is past the limit', () => {
  assert.equal(nearestTickIndex(ticks, 5000, 500), -1);
  assert.equal(nearestTickIndex(ticks, 4500, 500), 2); // exactly at the limit still counts
});

test('nearestTickIndex gives a tie to the earlier tick', () => {
  assert.equal(nearestTickIndex(ticks, 3000, 5000), 1);
});

test('nearestTickIndex returns -1 for an empty chart or a target that is not a time', () => {
  assert.equal(nearestTickIndex([], 2000, 500), -1);
  assert.equal(nearestTickIndex(ticks, NaN, 500), -1);
});

test('syncByNearestTime reads the hovered time from the label, within 10 minutes', () => {
  const minute = 60_000;
  const oil = [0, 5 * minute, 10 * minute].map((value) => ({ value }));

  assert.equal(syncByNearestTime(oil, { activeLabel: String(6 * minute) }), 1);
  assert.equal(syncByNearestTime(oil, { activeLabel: String(21 * minute) }), -1);
  // The mouse left the other chart.
  assert.equal(syncByNearestTime(oil, { activeLabel: undefined }), -1);
});
