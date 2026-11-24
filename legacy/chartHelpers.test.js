const { test } = require('node:test');
const assert = require('node:assert/strict');
// The page loads this file with a script tag; here it is required like any module.
const { nearestIndexByTime, openingPrice } = require('./public/javascripts/chartHelpers');

test('nearestIndexByTime picks the nearest time', () => {
  assert.equal(nearestIndexByTime([1000, 2000, 4000], 2100, 500), 1);
  assert.equal(nearestIndexByTime([1000, 2000, 4000], 3900, 500), 2);
});

test('nearestIndexByTime returns -1 past the limit, and counts the limit itself', () => {
  assert.equal(nearestIndexByTime([1000, 2000, 4000], 5000, 500), -1);
  assert.equal(nearestIndexByTime([1000, 2000, 4000], 4500, 500), 2);
});

test('nearestIndexByTime gives a tie to the earlier time', () => {
  assert.equal(nearestIndexByTime([1000, 2000, 4000], 3000, 5000), 1);
});

test('nearestIndexByTime returns -1 for no times or a target that is not a time', () => {
  assert.equal(nearestIndexByTime([], 2000, 500), -1);
  assert.equal(nearestIndexByTime([1000], NaN, 500), -1);
  assert.equal(nearestIndexByTime([1000], undefined, 500), -1);
});

test('openingPrice is the first price of the series', () => {
  assert.equal(openingPrice([[1000, 3501], [2000, 3510]]), 3501);
});

test('openingPrice is null without a usable first price', () => {
  assert.equal(openingPrice([]), null);
  assert.equal(openingPrice(undefined), null);
  assert.equal(openingPrice([[1000, 0]]), null);
  assert.equal(openingPrice([[1000, null]]), null);
});
