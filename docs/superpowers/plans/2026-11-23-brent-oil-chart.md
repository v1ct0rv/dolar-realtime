# Brent Oil Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show today's Brent oil price in both apps, with a marker and the nearest headline wherever the price moved
sharply.

**Architecture:** Each app fetches for itself: Yahoo Finance for the 5-minute prices and Google News RSS for the
headlines. The same rule (written once in TypeScript, once in CommonJS) picks the sharp moves and gives each the
headline published closest to it. Nothing is stored.

**Tech Stack:** Next.js 16 / TypeScript / axios / Recharts 3 (new app), Express 4 / axios / Highstock (legacy), Node's
built-in test runner.

**Spec:** `docs/superpowers/specs/2026-11-23-brent-oil-chart-design.md`

## Global Constraints

- Price URL, exact: `https://query1.finance.yahoo.com/v8/finance/chart/BZ=F?interval=5m&range=1d`
- The price request sends `User-Agent: Mozilla/5.0`. Without it Yahoo answers 429.
- News URL, exact:
  `https://news.google.com/rss/search?q=petr%C3%B3leo+brent+when:1d&hl=es-419&gl=CO&ceid=CO:es-419`
- Both requests use a 10 second timeout.
- Rule constants, same in both apps: window 30 minutes, threshold 0.75 %, at most 5 moves, kept moves at least one
  window apart, headline within 60 minutes either side.
- Prices and percentages are rounded to 2 decimals on output. Candidates are compared on the unrounded change; ties go
  to the earlier point.
- A headline whose link does not start with `https://` is dropped.
- No new dependencies, no environment variables, no MongoDB.
- No added line over 120 columns (a commit hook rejects them).
- User-facing copy is in Spanish, as in the rest of both apps.

## Review Focus

1. **Yahoo answers 200 without a result** (`chart.result` is `null`, as on an outage or a renamed symbol):
   `parseChart` throws an `Error` naming the problem, not a `TypeError`. Test in Task 1.
2. **Session just opened** (no `timestamp` yet): `parseChart` returns `points: []`, `detectMoves([])` returns `[]`.
   Test in Task 1.
3. **The news URL returns something that is not a feed** (HTML error page, empty body): `parseNews` returns `[]`.
   Test in Task 1.
4. **A title with ` - ` inside it**: only the trailing ` - <source>` is stripped. Test in Task 1.
5. **Legacy: Yahoo fails after a good load**: `oilStats` keeps the last good data and nothing throws. Test in Task 3.

---

### Task 1: New app service and route

**Files:**
- Create: `lib/services/oilService.fixture.js`
- Create: `lib/services/oilService.ts`
- Create: `lib/services/oilService.test.ts`
- Create: `app/api/oil/brent/route.ts`
- Modify: `types/index.ts` (append the three types)
- Modify: `package.json` (`test` script)

**Interfaces:**
- Produces, in `types/index.ts`:

```ts
export interface OilHeadline { title: string; url: string; source: string; publishedAt: number }
export interface OilMove { timestamp: number; price: number; changePercent: number; headline?: OilHeadline }
export interface BrentOilData { price: number; previousClose: number; points: [number, number][]; moves: OilMove[] }
```

- Produces, in `lib/services/oilService.ts`: `CHART_URL`, `NEWS_URL`, and

```ts
export function parseChart(payload: unknown): Omit<BrentOilData, 'moves'>
export function parseNews(xml: string): OilHeadline[]
export function detectMoves(points: [number, number][]): OilMove[]
export function attachHeadlines(moves: OilMove[], headlines: OilHeadline[]): OilMove[]
export async function getBrentOil(): Promise<BrentOilData>
```

- Produces: `GET /api/oil/brent` → `{ success: true, data: BrentOilData }`, or status 502 with
  `{ success: false, error: 'Brent oil data unavailable' }`.
- Produces: `lib/services/oilService.fixture.js` exporting `{ T0, chart, calibration, news }` (used again in Task 3).

All timestamps are epoch milliseconds.

- [ ] **Step 1: Create the fixture `lib/services/oilService.fixture.js`**

CommonJS, like `icapService.fixture.js`. `T0 = Date.UTC(2026, 10, 23, 5, 0, 0) / 1000` (epoch seconds).

`chart` is a Yahoo payload: `{ chart: { result: [{ meta, timestamp, indicators: { quote: [{ close }] } }], error: null } }`
with `meta = { regularMarketPrice: 90, chartPreviousClose: 91.5 }`, 23 timestamps `T0 + i * 300` and these closes
(index: value):

- 0 to 6: `90.00390625` (a float that must round to `90`)
- 7: `null`
- 8: `89.9`, 9: `89.6`
- 10 to 20: `89.1`
- 21, 22: `90`

`calibration` is a second Yahoo payload in the same shape: the real session of 2026-11-23 (205 closes rounded to
cents, one of them `null`, same `T0` and 5-minute step), with `meta = { regularMarketPrice: 86.72,
chartPreviousClose: 89.95 }`. The closes come from the capture taken while calibrating the rule.

`news` is an RSS string `<rss><channel><title>feed</title>…</channel></rss>` with five `<item>` elements, each
`<title>`, `<link>`, `<pubDate>` and `<source url="https://example.com">`:

| Title (raw XML) | Link | pubDate (all `Mon, 23 Nov 2026 … GMT`) | Source |
|---|---|---|---|
| `El Brent cae 1% por temor a exceso de oferta - Portafolio` | `https://news.google.com/rss/articles/A?oc=5` | `05:58:00` | `Portafolio` |
| `Petróleo &amp; gas: &lt;b&gt;rebote&lt;/b&gt; del crudo - La República` | `https://news.google.com/rss/articles/B?oc=5` | `06:40:00` | `La República` |
| `Enlace inseguro - Inseguro` | `http://example.com/x` | `05:50:00` | `Inseguro` |
| `WTI - Brent: balance del día - Lejano` | `https://news.google.com/rss/articles/E?oc=5` | `09:30:00` | `Lejano` |
| `Sin fecha - Roto` | `https://news.google.com/rss/articles/F?oc=5` | `no es una fecha` | `Roto` |

- [ ] **Step 2: Write the failing tests in `lib/services/oilService.test.ts`**

`node:test` and `node:assert/strict`, `mock.restoreAll()` in `afterEach`. Helpers:
`at = (i: number) => (fixture.T0 + i * 300) * 1000` and
`series = (prices: number[]) => prices.map((p, i) => [i * 300_000, p] as [number, number])`.

```ts
test('parseChart rounds prices and skips null closes', () => {
  const data = parseChart(fixture.chart);
  assert.equal(data.price, 90);
  assert.equal(data.previousClose, 91.5);
  assert.equal(data.points.length, 22);
  assert.deepEqual(data.points[0], [at(0), 90]);
  assert.deepEqual(data.points[7], [at(8), 89.9]);
});

test('parseChart returns no points before the first trade', () => {
  const payload = structuredClone(fixture.chart);
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
  assert.deepEqual(moves.map((m) => m.timestamp), [...moves.map((m) => m.timestamp)].sort((a, b) => a - b));
});

test('detectMoves finds the 5 moves of the calibration day', () => {
  const moves = detectMoves(parseChart(fixture.calibration).points);
  assert.deepEqual(
    moves.map((m) => [new Date(m.timestamp).toISOString().slice(11, 16), m.price, m.changePercent]),
    [['11:10', 88.37, -0.85], ['13:50', 86.99, -1.36], ['14:20', 88.2, 1.39], ['15:15', 86.67, -1.48],
      ['16:00', 86.32, -0.8]],
  );
});

test('parseNews strips the source, decodes entities and drops unusable items', () => {
  assert.deepEqual(parseNews(fixture.news), [
    { title: 'El Brent cae 1% por temor a exceso de oferta', source: 'Portafolio',
      url: 'https://news.google.com/rss/articles/A?oc=5', publishedAt: Date.UTC(2026, 10, 23, 5, 58) },
    { title: 'Petróleo & gas: <b>rebote</b> del crudo', source: 'La República',
      url: 'https://news.google.com/rss/articles/B?oc=5', publishedAt: Date.UTC(2026, 10, 23, 6, 40) },
    { title: 'WTI - Brent: balance del día', source: 'Lejano',
      url: 'https://news.google.com/rss/articles/E?oc=5', publishedAt: Date.UTC(2026, 10, 23, 9, 30) },
  ]);
});

test('parseNews returns [] for something that is not a feed', () => {
  assert.deepEqual(parseNews('<html><body>Too Many Requests</body></html>'), []);
  assert.deepEqual(parseNews(''), []);
});

test('attachHeadlines gives each headline to one move, strongest first', () => {
  const headline = (title: string, minute: number) =>
    ({ title, url: 'https://example.com', source: 's', publishedAt: minute * 60_000 });
  const moves = [
    { timestamp: 60 * 60_000, price: 99, changePercent: -0.8 },
    { timestamp: 100 * 60_000, price: 98, changePercent: -1.5 },
    { timestamp: 300 * 60_000, price: 99, changePercent: 1 },
  ];
  const result = attachHeadlines(moves, [headline('near both', 85), headline('early', 20)]);
  assert.equal(result[1].headline?.title, 'near both'); // strongest move chooses first
  assert.equal(result[0].headline?.title, 'early'); // 40 minutes away, the only one left in range
  assert.equal(result[2].headline, undefined); // nothing within 60 minutes
});

test('getBrentOil joins prices, moves and headlines', async () => {
  const get = mock.method(axios, 'get', async (url: string) =>
    ({ data: url === CHART_URL ? fixture.chart : fixture.news }));
  const data = await getBrentOil();
  assert.equal(get.mock.calls[0].arguments[0], CHART_URL);
  assert.equal(get.mock.calls[0].arguments[1].headers['User-Agent'], 'Mozilla/5.0');
  assert.equal(data.points.length, 22);
  assert.deepEqual(data.moves.map((m) => [m.timestamp, m.price, m.changePercent, m.headline?.source]), [
    [at(10), 89.1, -1, 'Portafolio'],
    [at(21), 90, 1.01, 'La República'],
  ]);
});

test('getBrentOil still answers when the news fails', async () => {
  mock.method(axios, 'get', async (url: string) => {
    if (url !== CHART_URL) throw new Error('news down');
    return { data: fixture.chart };
  });
  const data = await getBrentOil();
  assert.equal(data.moves.length, 2);
  assert.equal(data.moves[0].headline, undefined);
});

test('getBrentOil rejects when the price fails', async () => {
  mock.method(axios, 'get', async () => { throw new Error('429'); });
  await assert.rejects(getBrentOil());
});
```

- [ ] **Step 3: Point `npm test` at every service test and watch the new ones fail**

In `package.json`: `"test": "tsx --test lib/services/*.test.ts"`.

Run: `npm test`
Expected: the ICAP tests pass; the oil tests fail because `./oilService` does not exist.

- [ ] **Step 4: Append the three types to `types/index.ts`**

Exactly as in the Interfaces block above.

- [ ] **Step 5: Implement `lib/services/oilService.ts`**

Export `CHART_URL` and `NEWS_URL` and the five functions with the signatures above. Four module constants hold the
rule's numbers.

- `parseChart`: read `chart.result[0]`; throw `new Error('Yahoo returned no Brent chart')` when it is missing.
- `parseNews`: regular expressions over `<item>…</item>`, no XML dependency. Decode `&lt; &gt; &quot; &#39;` first and
  `&amp;` last.
- `detectMoves`, the part the tests do not fully determine:

```ts
// For each point, the change against the latest point at least one window older.
// Strongest first (stable sort, so ties go to the earlier point); keep one unless
// a kept move is less than a window away; stop at MAX_MOVES; return in time order.
```

- `attachHeadlines`: visit the moves strongest first, give each the unused headline nearest in time within the range,
  and return the moves in their original order.
- `getBrentOil`: both requests in parallel with `axios.get`; a failed news request becomes an empty headline list.

- [ ] **Step 6: Run the tests**

Run: `npm test`
Expected: every test passes (the live ICAP test stays skipped).

- [ ] **Step 7: Add `app/api/oil/brent/route.ts`**

A `GET` handler that returns `getBrentOil()` in the response shape above. It keeps the last result in a module
variable and reuses it for 60 seconds. On failure it logs the error and answers 502. Export
`dynamic = 'force-dynamic'` so the build never calls Yahoo.

```ts
// shortcut: per-instance memory cache, move to a shared cache if the app ever runs on several instances
```

- [ ] **Step 8: Check it against the live sources**

Run: `npm run build` — expected: compiles, and `/api/oil/brent` is listed as dynamic (`ƒ`).
Run: `npm run dev`, then `curl -s localhost:3000/api/oil/brent`
Expected: `success: true`, about 200 `points`, `price` and `previousClose` near the real Brent price, and `moves`
between 0 and 5 long.

- [ ] **Step 9: Commit**

```bash
git add lib/services/oilService.* app/api/oil types/index.ts package.json
git commit -m "feat(oil): serve today's Brent price with headlines on sharp moves"
```

---

### Task 2: New app chart

**Files:**
- Create: `app/components/dashboard/BrentOilChart.tsx`
- Modify: `app/components/dashboard/RealTimeDashboard.tsx` (render it after the intraday chart block, line ~426)
- Modify: `CLAUDE.md` (Key files, Client components)

**Interfaces:**
- Consumes: `GET /api/oil/brent` and the `BrentOilData` type from Task 1.
- Produces: `export default function BrentOilChart({ ch }: { ch: ChartColors })`, where `ChartColors` lists the keys of
  `RealTimeDashboard`'s colour map that the component uses.

- [ ] **Step 1: Write `BrentOilChart.tsx`**

A `'use client'` component:

- Fetches `/api/oil/brent` on mount and every 60 seconds. On a failed response, or when `points` is empty, it renders
  nothing.
- A card styled like the intraday chart's card. Header: `Petróleo Brent`, a link `finance.yahoo.com · BZ=F` to
  `https://finance.yahoo.com/quote/BZ=F/`, the price as `US$ 86,72`, and the change against `previousClose` as
  `▼ −3,23 (−3,59 %)` in `--clr-negative`, or `▲ +…` in `--clr-positive`. Numbers use `es-CO` with 2 decimals.
- A Recharts `ComposedChart`, height 300, with the same axes, grid and gradient treatment as the intraday chart: one
  `Area` for the price in `ch.gold`, a tooltip with the time (`HH:mm`) and the price, and one `ReferenceDot` per
  move at `x={move.timestamp} y={move.price}` labelled with its number (1, 2, …).
- Under the chart, when there are moves, an `<ol>` with one item per move: its number, the time `HH:mm`, the arrow and
  percentage followed by `en 30 min`, and the headline as a link (`target="_blank" rel="noopener noreferrer"`) with
  its source, or `Sin titular cercano`.
- The gradient `id` must differ from the intraday chart's (`priceGradient`, `barGradient`).

- [ ] **Step 2: Render it from `RealTimeDashboard`**

Right after the intraday chart block and inside the same `space-y-6` container: `<BrentOilChart ch={ch} />`.

- [ ] **Step 3: Update `CLAUDE.md`**

Add `lib/services/oilService.ts` and `app/api/oil/brent/route.ts` to Key files (one line each: what it reads, that
nothing is stored, the 60 second memory cache) and `BrentOilChart` to the client components.

- [ ] **Step 4: Verify**

Run: `npm run lint` — expected: no errors.
Run: `npm run build` — expected: compiles with no type errors.
Then open the dashboard in a browser in both themes: the card shows under the dollar chart, the dots sit on the line,
each list item's number matches its dot, and a headline link opens the article in a new tab. Block
`/api/oil/brent` in the browser's network tools and reload: the card is gone and the rest of the dashboard works.

- [ ] **Step 5: Commit**

```bash
git add app/components/dashboard CLAUDE.md
git commit -m "feat(dashboard): add the Brent oil chart"
```

---

### Task 3: Legacy app

**Files:**
- Modify: `legacy/worker.js` (add `updateBrentOil` and its helpers)
- Modify: `legacy/worker.test.js`
- Modify: `legacy/app.js` (run and schedule the job)
- Modify: `legacy/public/javascripts/index.js` (`updateData` lines ~39-82, `loadBrentChart` lines ~212-320)

**Interfaces:**
- Consumes: `lib/services/oilService.fixture.js` from Task 1 (tests only; the legacy app is deployed alone and cannot
  import the new app's code at run time).
- Produces: `worker.updateBrentOil(): Promise<void>` filling `worker.data.oilStats` with

```js
{ attr: { last_value, last_close_value }, candles: [[ms, price]], events: { news: [{ x, title, text }] } }
```

`text` is `<b>▼ -1.00% en 30 min</b>` (arrow `▲`/`▼`, sign always shown, `toFixed(2)`), followed when there is a
headline by `<br><a href="URL" target="_blank" rel="noopener noreferrer">TITLE</a> — SOURCE`, with `URL`, `TITLE`
and `SOURCE` HTML-escaped (`& < > " '`). `title` is the arrow alone.

- [ ] **Step 1: Write the failing tests in `legacy/worker.test.js`**

Require the fixture as `oil = require('../lib/services/oilService.fixture')` and stub `axios.get` by URL: the Yahoo
URL gets `{ data: oil.chart }`, anything else `{ data: oil.news }`. `at(i)` is `(oil.T0 + i * 300) * 1000`.

```js
test('updateBrentOil fills oilStats in the shape the page reads', async () => {
  // stub as above
  await worker.updateBrentOil();

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
      text:
        '<b>▲ +1.01% en 30 min</b><br>' +
        '<a href="https://news.google.com/rss/articles/B?oc=5" target="_blank" rel="noopener noreferrer">' +
        'Petróleo &amp; gas: &lt;b&gt;rebote&lt;/b&gt; del crudo</a> — La República',
    },
  ]);
});

test('updateBrentOil keeps the last good data when Yahoo fails', async () => {
  // first call stubbed as above, second call with axios.get throwing
  // assert worker.data.oilStats is deep-equal before and after the second call
});

test('updateBrentOil shows moves without headlines when the news fails', async () => {
  // Yahoo URL answers, the news URL throws
  // assert events.news.map((e) => e.text) equals ['<b>▼ -1.00% en 30 min</b>', '<b>▲ +1.01% en 30 min</b>']
});

test('updateBrentOil finds the 5 moves of the calibration day', async () => {
  // Yahoo URL answers oil.calibration
  // assert events.news.map((e) => [new Date(e.x).toISOString().slice(11, 16), e.text]) equals
  //   ['11:10', '<b>▼ -0.85% en 30 min</b>'], ['13:50', '<b>▼ -1.36% en 30 min</b>'],
  //   ['14:20', '<b>▲ +1.39% en 30 min</b>'], ['15:15', '<b>▼ -1.48% en 30 min</b>'],
  //   ['16:00', '<b>▼ -0.80% en 30 min</b>']
  // (the fixture's headlines are all more than an hour from these moves)
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `cd legacy && npm test`
Expected: the two ICAP tests pass; the four new ones fail with `worker.updateBrentOil is not a function`.

- [ ] **Step 3: Implement `updateBrentOil` in `legacy/worker.js`**

Same URLs, header, timeout, constants and rule as Task 1, as plain functions above the `worker` object. Wrap the
body in the same `console.time` / `try` / `console.error` pattern as `updateStats`, so a failure leaves
`worker.data.oilStats` untouched.

- [ ] **Step 4: Run the tests**

Run: `cd legacy && npm test`
Expected: 6 tests pass.

- [ ] **Step 5: Schedule it in `legacy/app.js`**

Call `worker.updateBrentOil()` next to the other two start-up calls and schedule it with `'0 * * * * *'` (once a
minute).

- [ ] **Step 6: Update the page script `legacy/public/javascripts/index.js`**

- Delete the loop that rewrites `evento.text` (it prefixes every link with `http://es.investing.com`).
- In `loadBrentChart`: subtitle `Fuente: Yahoo Finance (BZ=F) · Noticias: Google News`; delete the second flags
  series (`data.events.ec`); in the chart's last `tooltip` add `stickOnContact: true` and
  `style: { pointerEvents: 'auto' }` so the headline link can be clicked.
- In `updateData`, the variation is the change against the previous close:
  `(data.attr.last_value / data.attr.last_close_value - 1) * 100` (today it divides the other way round, which
  gives a different number from the new app).
- In `updateData`, replace the "Set Chart" branch so a refresh updates both series and a missing chart is created:

```js
var brentChart = $('#container-brent').highcharts();
if (isUpdate && brentChart && data.candles) {
    brentChart.series[0].setData(data.candles);
    brentChart.series[1].setData(data.events.news);
} else {
    loadBrentChart(data);
}
```

- [ ] **Step 7: Verify in a browser**

Run: `cd legacy && npm install && npm start`, open `http://localhost:3000`.
Expected: the "Petróleo Brent" chart and the Cierre/Actual figures show under the dollar section; flags sit on the
line where it moved; hovering a flag shows the change and the headline, and the link opens the article.
`curl -s localhost:3000/investing/brentOil` returns the three keys.

- [ ] **Step 8: Commit**

```bash
git add legacy
git commit -m "feat(legacy): bring back the Brent oil chart"
```

---

### After the tasks

- Open the pull request and check the Static Web Apps preview: `/api/oil/brent` answers there. This is the first call
  to Yahoo from Azure, and it gates the merge: if Yahoo refuses it, stop and choose another price source. Do not POST
  the cron on the preview; it uses production settings.
- After merge: `/api/oil/brent` on the new app and `/investing/brentOil` on the legacy app both return data.
