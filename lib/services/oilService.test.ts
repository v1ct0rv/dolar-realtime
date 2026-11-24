import { afterEach, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import fixture from './oilService.fixture';
import {
  CHART_URL,
  attachHeadlines,
  detectMoves,
  getBrentOil,
  getCachedBrentOil,
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
      title: 'Petróleo & gas: <b>rebote</b> del crudo — l\'OPEP ’sube’',
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

/** A feed with one item, the way Google News writes them. */
const feedOf = (title: string, source: string) =>
  `<rss><channel><item><title>${title}</title><link>https://news.google.com/rss/articles/X</link>` +
  `<pubDate>Mon, 23 Nov 2026 06:00:00 GMT</pubDate><source url="https://example.com">${source}</source>` +
  '</item></channel></rss>';

test('parseNews leaves an entity that is not a character as it is', () => {
  const [headline] = parseNews(feedOf('Crudo &#99999999; &#xD800; sube - Fuente', 'Fuente'));
  assert.equal(headline.title, 'Crudo &#99999999; &#xD800; sube');
});

test('parseNews decodes &amp; last, so an escaped entity stays text', () => {
  const [headline] = parseNews(feedOf('Brent &amp;#39;estable&amp;#39; - Fuente', 'Fuente'));
  assert.equal(headline.title, 'Brent &#39;estable&#39;');
});

test('parseNews keeps a title that names oil once its outlet is removed', () => {
  const [headline] = parseNews(feedOf('Crudo Transparente - Crudo Transparente', 'Crudo Transparente'));
  assert.equal(headline.title, 'Crudo Transparente');
});

test('detectMoves ignores a change measured across a gap', () => {
  const minute = 60_000;
  const flat = [0, 5, 10, 15, 20, 25, 30].map((m) => [m * minute, 100] as [number, number]);

  // The futures' daily break: the reference is 70 minutes older, so there is no 30-minute change.
  assert.deepEqual(detectMoves([...flat, [100 * minute, 98]]), []);
  // A reference exactly 45 minutes older still counts.
  assert.equal(detectMoves([...flat, [75 * minute, 98]]).length, 1);
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

// The cache lives for the whole test run, so each test below has its own minute.

test('getCachedBrentOil asks the sources once for callers in the same minute', async () => {
  const get = stubNetwork((url) => (url === CHART_URL ? fixture.chart : fixture.news));
  const now = 1_000_000;

  // The second caller arrives while the first request is still in flight.
  const [first, second] = await Promise.all([getCachedBrentOil(now), getCachedBrentOil(now + 1_000)]);
  const third = await getCachedBrentOil(now + 59_000);

  assert.equal(get.mock.callCount(), 2); // one price request and one news request
  assert.equal(first, second);
  assert.equal(first, third);
});

test('getCachedBrentOil remembers a failure for the minute, then asks again', async () => {
  const failing = stubNetwork(() => {
    throw new Error('429');
  });
  const now = 2_000_000;

  await assert.rejects(getCachedBrentOil(now));
  await assert.rejects(getCachedBrentOil(now + 30_000));
  assert.equal(failing.mock.callCount(), 2); // the first caller's two requests, none for the second

  mock.restoreAll();
  stubNetwork((url) => (url === CHART_URL ? fixture.chart : fixture.news));
  assert.equal((await getCachedBrentOil(now + 61_000)).price, 90);
});
