import { afterEach, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import fixture from './oilService.fixture';
import {
  CHART_URL,
  attachHeadlines,
  detectMoves,
  getBrentOil,
  parseChart,
  parseNews,
} from './oilService';

/** Epoch milliseconds of the fixture's point `i` (one every 5 minutes). */
const at = (i: number) => (fixture.T0 + i * 300) * 1000;

/** Prices as points 5 minutes apart, starting at minute 0. */
const series = (prices: number[]) => prices.map((p, i) => [i * 300_000, p] as [number, number]);

function stubNetwork(answer: (url: string) => unknown) {
  return mock.method(axios, 'get', async (url: string) => ({ data: answer(url) }));
}

afterEach(() => mock.restoreAll());

test('parseChart rounds prices and skips null closes', () => {
  const data = parseChart(fixture.chart);
  assert.equal(data.price, 90);
  assert.equal(data.previousClose, 91.5);
  assert.equal(data.points.length, 22);
  assert.deepEqual(data.points[0], [at(0), 90]);
  assert.deepEqual(data.points[7], [at(8), 89.9]);
});

test('parseChart returns no points before the first trade', () => {
  const payload = structuredClone(fixture.chart) as { chart: { result: { timestamp?: number[] }[] } };
  delete payload.chart.result[0].timestamp;
  assert.deepEqual(parseChart(payload).points, []);
});

test('parseChart rejects an answer without a result', () => {
  assert.throws(() => parseChart({ chart: { result: null, error: { code: 'Not Found' } } }), /Yahoo/);
});

test('detectMoves ignores changes under the threshold', () => {
  assert.deepEqual(detectMoves(series([100, 100, 100, 100, 100, 100, 100, 99.3])), []);
  assert.deepEqual(detectMoves([]), []);
});

test('detectMoves needs a point 30 minutes older', () => {
  assert.deepEqual(detectMoves(series([100, 98, 98, 98, 98, 98])), []);
});

test('detectMoves marks a sharp move once', () => {
  // -0.8 % at minute 35, still -0.8 % at minutes 40 to 60: one move, the earliest.
  const moves = detectMoves(series([100, 100, 100, 100, 100, 100, 100, 99.2, 99.2, 99.2, 99.2, 99.2, 99.2]));
  assert.deepEqual(moves, [{ timestamp: 35 * 60_000, price: 99.2, changePercent: -0.8 }]);
});

test('detectMoves keeps the 5 strongest, in time order', () => {
  // Seven drops, one every 60 minutes, each bigger than the last: 1 %, 1.1 % ... 1.6 %.
  const prices: number[] = [];
  let price = 100;
  for (let drop = 0; drop < 7; drop++) {
    for (let i = 0; i < 11; i++) prices.push(price);
    price = price * (1 - (1 + drop * 0.1) / 100);
    prices.push(price);
  }
  const moves = detectMoves(series(prices));
  assert.deepEqual(moves.map((m) => m.changePercent), [-1.2, -1.3, -1.4, -1.5, -1.6]);
  assert.deepEqual(moves.map((m) => m.timestamp), moves.map((m) => m.timestamp).sort((a, b) => a - b));
});

// The legacy app's tests assert the same five moves, so the two copies of the rule stay in step.
test('detectMoves finds the 5 moves of the calibration day', () => {
  const moves = detectMoves(parseChart(fixture.calibration).points);
  assert.deepEqual(
    moves.map((m) => [new Date(m.timestamp).toISOString().slice(11, 16), m.price, m.changePercent]),
    [
      ['11:10', 88.37, -0.85],
      ['13:50', 86.99, -1.36],
      ['14:20', 88.2, 1.39],
      ['15:15', 86.67, -1.48],
      ['16:00', 86.32, -0.8],
    ],
  );
});

test('parseNews strips the source, decodes entities and drops unusable items', () => {
  assert.deepEqual(parseNews(fixture.news), [
    {
      title: 'El Brent cae 1% por temor a exceso de oferta',
      source: 'Portafolio',
      url: 'https://news.google.com/rss/articles/A?oc=5',
      publishedAt: Date.UTC(2026, 10, 23, 5, 58),
    },
    {
      title: 'Petróleo & gas: <b>rebote</b> del crudo',
      source: 'La República',
      url: 'https://news.google.com/rss/articles/B?oc=5',
      publishedAt: Date.UTC(2026, 10, 23, 6, 40),
    },
    {
      title: 'WTI - Brent: balance del día',
      source: 'Lejano',
      url: 'https://news.google.com/rss/articles/E?oc=5',
      publishedAt: Date.UTC(2026, 10, 23, 9, 30),
    },
  ]);
});

test('parseNews returns [] for something that is not a feed', () => {
  assert.deepEqual(parseNews('<html><body>Too Many Requests</body></html>'), []);
  assert.deepEqual(parseNews(''), []);
});

test('attachHeadlines gives each headline to one move, strongest first', () => {
  const headline = (title: string, minute: number) => ({
    title,
    url: 'https://example.com',
    source: 's',
    publishedAt: minute * 60_000,
  });
  const moves = [
    { timestamp: 60 * 60_000, price: 99, changePercent: -0.8 },
    { timestamp: 100 * 60_000, price: 98, changePercent: -1.5 },
    { timestamp: 300 * 60_000, price: 99, changePercent: 1 },
  ];
  const result = attachHeadlines(moves, [headline('near both', 85), headline('early', 20)]);
  assert.equal(result[1].headline?.title, 'near both'); // the strongest move chooses first
  assert.equal(result[0].headline?.title, 'early'); // 40 minutes away, the only one left in range
  assert.equal(result[2].headline, undefined); // nothing within 60 minutes
});

test('getBrentOil joins prices, moves and headlines', async () => {
  const get = stubNetwork((url) => (url === CHART_URL ? fixture.chart : fixture.news));

  const data = await getBrentOil();

  const [url, config] = get.mock.calls[0].arguments as unknown as [string, { headers: Record<string, string> }];
  assert.equal(url, CHART_URL);
  assert.equal(config.headers['User-Agent'], 'Mozilla/5.0');
  assert.equal(data.price, 90);
  assert.equal(data.previousClose, 91.5);
  assert.equal(data.points.length, 22);
  assert.deepEqual(
    data.moves.map((m) => [m.timestamp, m.price, m.changePercent, m.headline?.source]),
    [
      [at(10), 89.1, -1, 'Portafolio'],
      [at(21), 90, 1.01, 'La República'],
    ],
  );
});

test('getBrentOil still answers when the news fails', async () => {
  stubNetwork((url) => {
    if (url !== CHART_URL) throw new Error('news down');
    return fixture.chart;
  });

  const data = await getBrentOil();

  assert.equal(data.moves.length, 2);
  assert.equal(data.moves[0].headline, undefined);
});

test('getBrentOil rejects when the price fails', async () => {
  stubNetwork(() => {
    throw new Error('429');
  });

  await assert.rejects(getBrentOil());
});
