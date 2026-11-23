const { afterEach, mock, test } = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');
// A trimmed real ICAP snapshot, shared with the new app's tests.
const fixture = require('../lib/services/icapService.fixture.json');
const worker = require('./worker');

afterEach(() => mock.restoreAll());

test('updateStats fills stats from the snapshot messages', async () => {
  mock.method(axios, 'get', async () => ({ data: fixture }));

  await worker.updateStats();

  assert.deepEqual(worker.data.stats, {
    trm: '3,461.92',
    trmPriceChange: 'up',
    maxPrice: '3,538.10',
    maxPriceChange: 'up',
    minPrice: '3,473.00',
    minPriceChange: 'down',
    openPrice: '3,501.00',
    openPriceChange: 'up',
    price: '3,503.50',
    avgPrice: '3,500.49',
    totalAmmount: '692,622,000.00',
    latestAmmount: '5,000,000.00',
    avgAmmount: '786,177.00',
    minAmmount: '13,000.00',
    maxAmmount: '25,000,000.00',
    transactions: '881',
  });
});

test('updateAllStats fills the chart series from the snapshot', async () => {
  mock.method(axios, 'get', async () => ({ data: fixture }));

  await worker.updateAllStats();

  const { precio, monto } = worker.data.allStats;
  assert.deepEqual(precio.map((point) => point[1]), [3501, 3510, 3515]);
  assert.deepEqual(monto.map((point) => point[1]), [250, 500, 250]);
});
