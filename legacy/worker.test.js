const { afterEach, mock, test } = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');
// A trimmed real ICAP snapshot, shared with the new app's tests.
const fixture = require('../lib/services/icapService.fixture');
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

// Brent oil. The fixture and the calibration day are shared with the new app's
// tests (lib/services/oilService.test.ts), which assert the same moves.
const oil = require('../lib/services/oilService.fixture');

const YAHOO_URL = 'https://query1.finance.yahoo.com/v8/finance/chart/BZ=F?interval=5m&range=1d';

/** Epoch milliseconds of the fixture's point `i` (one every 5 minutes). */
const at = (i) => (oil.T0 + i * 300) * 1000;

/** Answer the Yahoo request with `chart` and the news request with `news`; an Error is thrown instead. */
function stubOil(chart, news) {
  return mock.method(axios, 'get', async (url) => {
    const answer = url === YAHOO_URL ? chart : news;
    if (answer instanceof Error) throw answer;
    return { data: answer };
  });
}

test('updateBrentOil fills oilStats in the shape the page reads', async () => {
  const get = stubOil(oil.chart, oil.news);

  await worker.updateBrentOil();

  assert.equal(get.mock.calls[0].arguments[1].headers['User-Agent'], 'Mozilla/5.0');
  const { attr, candles, events } = worker.data.oilStats;
  assert.deepEqual(attr, { last_value: 90, last_close_value: 91.5 });
  assert.equal(candles.length, 22);
  assert.deepEqual(candles[0], [at(0), 90]);
  assert.deepEqual(events.news, [
    {
      x: at(10),
      title: '▼',
      text:
        '<b>▼ -1.00% en 30 min</b><br>' +
        '<a href="https://news.google.com/rss/articles/A?oc=5" target="_blank" rel="noopener noreferrer">' +
        'El Brent cae 1% por temor a exceso de oferta</a> — Portafolio',
    },
    {
      x: at(21),
      title: '▲',
      // The feed's title carries markup: it must reach the tooltip escaped.
      text:
        '<b>▲ +1.01% en 30 min</b><br>' +
        '<a href="https://news.google.com/rss/articles/B?oc=5" target="_blank" rel="noopener noreferrer">' +
        'Petróleo &amp; gas: &lt;b&gt;rebote&lt;/b&gt; del crudo</a> — La República',
    },
  ]);
});

test('updateBrentOil keeps the last good data when Yahoo fails', async () => {
  stubOil(oil.chart, oil.news);
  await worker.updateBrentOil();
  const lastGood = structuredClone(worker.data.oilStats);
  mock.restoreAll();

  stubOil(new Error('429'), oil.news);
  await worker.updateBrentOil();

  assert.equal(lastGood.candles.length, 22);
  assert.deepEqual(worker.data.oilStats, lastGood);
});

test('updateBrentOil shows moves without headlines when the news fails', async () => {
  stubOil(oil.chart, new Error('news down'));

  await worker.updateBrentOil();

  assert.deepEqual(
    worker.data.oilStats.events.news.map((flag) => flag.text),
    ['<b>▼ -1.00% en 30 min</b>', '<b>▲ +1.01% en 30 min</b>']
  );
});

test('updateBrentOil finds the 5 moves of the calibration day', async () => {
  stubOil(oil.calibration, oil.news);

  await worker.updateBrentOil();

  assert.deepEqual(
    worker.data.oilStats.events.news.map((flag) => [new Date(flag.x).toISOString().slice(11, 16), flag.text]),
    [
      ['11:10', '<b>▼ -0.85% en 30 min</b>'],
      ['13:50', '<b>▼ -1.36% en 30 min</b>'],
      ['14:20', '<b>▲ +1.39% en 30 min</b>'],
      ['15:15', '<b>▼ -1.48% en 30 min</b>'],
      ['16:00', '<b>▼ -0.80% en 30 min</b>'],
    ]
  );
});
