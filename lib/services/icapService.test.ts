import { afterEach, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import fixture from './icapService.fixture';
import { fetchAllCurrentStats, fetchIntradayChartData } from './icapService';

const SNAPSHOT_URL = 'https://proxy.set-icap.com/api/v1/ws/public/delay/snapshot?market=71';
// What ICAP sends in message 1000 when nothing has traded.
const EMPTY_CHART =
  "data: {datasets: [{label: 'Precios de cierre',data: [],type: 'line'}, " +
  "{label: 'Montos (Miles USD)',data: []}],labels: []}";

const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

interface Message {
  id: number;
  data?: Record<string, unknown>;
  result?: { datos_grafico_moneda_mercado: string }[];
}
type Snapshot = { messages: Message[] };

/** A deep copy of the fixture, so each test can break it its own way. */
function snapshot(): Snapshot {
  return structuredClone(fixture) as Snapshot;
}

function message(from: Snapshot, id: number): Message {
  const found = from.messages.find((m) => m.id === id);
  assert.ok(found, `fixture has no message ${id}`);
  return found;
}

function stubNetwork(response: Snapshot = snapshot()) {
  return mock.method(axios, 'get', async () => ({ data: response }));
}

afterEach(() => mock.restoreAll());

test('fetchAllCurrentStats maps snapshot messages by id', async () => {
  const get = stubNetwork();

  assert.deepEqual(await fetchAllCurrentStats(), {
    trm: 3461.92,
    trmPriceChange: 'up',
    maxPrice: 3538.1,
    maxPriceChange: 'up',
    minPrice: 3473,
    minPriceChange: 'down',
    openPrice: 3501,
    openPriceChange: 'up',
    time: '11:12:55',
    price: 3503.5,
    amount: 2000000,
    avgPrice: 3500.49,
    totalAmount: 692622000,
    latestAmount: 5000000,
    avgAmount: 786177,
    minAmount: 13000,
    maxAmount: 25000000,
    transactions: 881,
  });
  assert.equal(get.mock.callCount(), 1);
  assert.equal(get.mock.calls[0].arguments[0], SNAPSHOT_URL);
});

test('fetchAllCurrentStats leaves time empty outside trading', async () => {
  // What ICAP serves on weekends, holidays and before the first trade.
  const closed = snapshot();
  for (const id of [1005, 1006, 1007]) {
    const data = message(closed, id).data!;
    for (const key of Object.keys(data)) {
      data[key] = key.endsWith('change') ? 'UNKNOWN' : '';
    }
  }
  stubNetwork(closed);

  // The cron route refuses to store anything when time is empty.
  assert.equal((await fetchAllCurrentStats()).time, '');
});

test('fetchAllCurrentStats names the missing message', async () => {
  const renumbered = snapshot();
  renumbered.messages = renumbered.messages.filter((m) => m.id !== 1006);
  stubNetwork(renumbered);

  await assert.rejects(fetchAllCurrentStats(), /1006/);
});

test('fetchIntradayChartData parses the chart for today', async () => {
  stubNetwork();

  const points = await fetchIntradayChartData(today);

  assert.equal(points.length, 3);
  assert.deepEqual(points[2], {
    cotTime: '08:03:37',
    price: 3515,
    amount: 250000,
    openPrice: 3501,
    minPrice: 3501,
    maxPrice: 3515,
    avgPrice: (3501 + 3510 + 3515) / 3,
    volume: 1000000,
    transactions: 3,
  });
});

test('fetchIntradayChartData returns [] for an empty chart', async () => {
  const noTrades = snapshot();
  message(noTrades, 1000).result![0].datos_grafico_moneda_mercado = EMPTY_CHART;
  stubNetwork(noTrades);

  assert.deepEqual(await fetchIntradayChartData(today), []);
});

test('fetchIntradayChartData rejects a past date', async () => {
  stubNetwork();

  await assert.rejects(fetchIntradayChartData('2026-11-20'), /current day/);
});

test('live snapshot still has the shape we read', { skip: !process.env.ICAP_LIVE }, async () => {
  const stats = await fetchAllCurrentStats();

  assert.equal(typeof stats.time, 'string');
  assert.ok(Array.isArray(await fetchIntradayChartData(today)));
});
