import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toColombiaDateString } from './timezone';

// Written as instants, so the assertions hold whatever zone the machine is in. The
// first one is the case that went wrong in a browser in Colombia: from 19:00 on,
// the date read as tomorrow's.
test('toColombiaDateString gives the date in Colombia, whatever the machine zone', () => {
  assert.equal(toColombiaDateString(new Date('2026-11-24T00:30:00Z')), '2026-11-23'); // 19:30 in Colombia
  assert.equal(toColombiaDateString(new Date('2026-11-23T04:59:00Z')), '2026-11-22'); // 23:59
  assert.equal(toColombiaDateString(new Date('2026-11-23T05:00:00Z')), '2026-11-23'); // 00:00
});
