import { test } from 'node:test';
import assert from 'node:assert/strict';
import { baselineSplit } from './baselineSplit';

test('baselineSplit places a baseline inside the range', () => {
  assert.equal(baselineSplit(3400, 3600, 3550), 0.25);
  assert.equal(baselineSplit(3400, 3600, 3600), 0);
  assert.equal(baselineSplit(3400, 3600, 3400), 1);
});

test('baselineSplit clamps a baseline outside the range', () => {
  assert.equal(baselineSplit(3400, 3600, 3700), 0); // everything is below it
  assert.equal(baselineSplit(3400, 3600, 3300), 1); // everything is above it
});

test('baselineSplit never returns NaN for a range of zero height', () => {
  assert.equal(baselineSplit(3500, 3500, 3400), 1);
  assert.equal(baselineSplit(3500, 3500, 3600), 0);
  assert.equal(baselineSplit(3500, 3500, 3500), 0);
});
