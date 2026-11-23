# ICAP Public Snapshot Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the new app and the legacy app read ICAP data again by switching from the four removed endpoints to the public snapshot endpoint.

**Architecture:** One unauthenticated GET returns a list of messages keyed by `id`; each app picks the messages that replace its old endpoints and keeps its existing field mapping. The cron route, the stored document shape and the legacy JSON routes do not change.

**Tech Stack:** Next.js 16 / TypeScript / axios 1.x (new app), Express 4 / axios 0.21 (legacy), Node's built-in test runner through `tsx`.

**Spec:** `docs/superpowers/specs/2026-11-23-icap-public-snapshot-design.md`

## Global Constraints

- Snapshot URL, exact: `https://proxy.set-icap.com/api/v1/ws/public/delay/snapshot?market=71`
- Message ids, exact: chart `1000`, volume `1005`, price `1006`, average/close `1007`.
- No authentication and no `Origin`/`Referer`/`User-Agent` headers.
- `ICAP_API_BASE_URL` and `ICAP_API_TOKEN` are not read anywhere after this change.
- No new dependencies.
- The return shape of `fetchAllCurrentStats` and of the legacy `/setfx/stats` and `/setfx/allStats` payloads stays as it is today.
- The cron keeps answering 500 without inserting when ICAP has no data.

## Review Focus

1. **Snapshot outside trading** (fields are `""`, changes `UNKNOWN`): `fetchAllCurrentStats()` must resolve with `time === ""` so the cron's existing guard answers 500 before any insert. Test in Task 1.
2. **A message id missing from the snapshot** (ICAP renumbers): reject with an error naming the id, not a `TypeError` on `undefined`. Test in Task 1.
3. **Empty chart** (holiday, before the first trade): `fetchIntradayChartData(today)` resolves `[]`. Test in Task 1.
4. **Past date passed to `fetchIntradayChartData`** (the backfill script over a range): reject with a message saying only the current day is available. Test in Task 1.
5. **Legacy outside trading**: `/setfx/stats` returns the object with empty strings and `/setfx/allStats` returns `{ monto: [], precio: [] }`, no crash. No test harness exists in `legacy/`; checked by hand in Task 2 (the chart parser already handles empty arrays).

---

### Task 1: New app reads the snapshot

**Files:**
- Modify: `lib/services/icapService.ts`
- Modify: `app/api/cron/collect-data/route.ts:71`
- Modify: `package.json` (add `test` script)
- Create: `lib/services/icapService.test.ts`
- Create: `lib/services/icapService.fixture.json`
- Modify: `.env.local.example`, `CLAUDE.md`, `scripts/README.md`

**Interfaces:**
- Produces: `fetchAllCurrentStats(): Promise<{ trm, trmPriceChange, maxPrice, maxPriceChange, minPrice, minPriceChange, openPrice, openPriceChange, time, price, amount, avgPrice, totalAmount, latestAmount, avgAmount, minAmount, maxAmount, transactions }>` — same fields as today, no argument.
- Produces: `fetchIntradayChartData(date: string): Promise<ICAPIntradayPoint[]>` — unchanged signature; rejects when `date` is not today in `America/Bogota`.
- Removed: `fetchPriceMarketStats`, `fetchAverageCloseStats`, `fetchVolumeMarketStats` (no callers outside the service).

- [ ] **Step 1: Create the fixture `lib/services/icapService.fixture.json`**

A trimmed copy of the real snapshot captured on 2026-11-23: top-level `{ "market": "71", "status": "ok", "stale": false, "messages": [...] }` with these messages, in this order:

- `1000`: `result[0].datos_grafico_moneda_mercado` = `"data: {datasets: [{label: 'Precios de cierre',data: [3501.00, 3510.00, 3515.00],type: 'line'}, {label: 'Montos (Miles USD)',data: [250, 500, 250]}],labels: [08:00:14, 08:02:27, 08:03:37]}"`
- `1005`: `data` = `{"close":"2,000,000.00","sum":"692,622,000.00","avg":"786,177.00","high":"25,000,000.00","low":"13,000.00","count":"881","open":"5,000,000.00"}`
- `1006`: `data` = `{"trm":"3,461.92","trmchange":"UP","high":"3,538.10","highchange":"UP","low":"3,473.00","lowchange":"DOWN","open":"3,501.00","openchange":"UP"}`
- `1007`: `data` = `{"avg":"3,500.49","close":"3,503.50","time":"11:12:55"}`
- `1015`: `data` = `{"trm":3415.1,"fecha":"2026-11-20"}` (an id the service must ignore)

- [ ] **Step 2: Write the failing tests in `lib/services/icapService.test.ts`**

Use `node:test` and `node:assert/strict`. Stub the network with `mock.method(axios, 'get', async () => ({ data }))` and call `mock.restoreAll()` in `afterEach`. `today` is `new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })`.

```ts
test('fetchAllCurrentStats maps snapshot messages by id', async () => {
  // stub with the fixture
  assert.deepEqual(await fetchAllCurrentStats(), {
    trm: 3461.92, trmPriceChange: 'up',
    maxPrice: 3538.1, maxPriceChange: 'up',
    minPrice: 3473, minPriceChange: 'down',
    openPrice: 3501, openPriceChange: 'up',
    time: '11:12:55', price: 3503.5, amount: 2000000, avgPrice: 3500.49,
    totalAmount: 692622000, latestAmount: 5000000, avgAmount: 786177,
    minAmount: 13000, maxAmount: 25000000, transactions: 881,
  });
  // and: axios.get was called once, with the snapshot URL from Global Constraints
});

test('fetchAllCurrentStats leaves time empty outside trading', async () => {
  // fixture with 1005/1006/1007 fields set to "" and the *change fields to "UNKNOWN"
  assert.equal((await fetchAllCurrentStats()).time, '');
});

test('fetchAllCurrentStats names the missing message', async () => {
  // fixture without message 1006
  await assert.rejects(fetchAllCurrentStats(), /1006/);
});

test('fetchIntradayChartData parses the chart for today', async () => {
  const points = await fetchIntradayChartData(today);
  assert.equal(points.length, 3);
  assert.deepEqual(points[2], {
    cotTime: '08:03:37', price: 3515, amount: 250000,
    openPrice: 3501, minPrice: 3501, maxPrice: 3515,
    avgPrice: (3501 + 3510 + 3515) / 3, volume: 1000000, transactions: 3,
  });
});

test('fetchIntradayChartData returns [] for an empty chart', async () => {
  // message 1000 with data: [] and labels: []
  assert.deepEqual(await fetchIntradayChartData(today), []);
});

test('fetchIntradayChartData rejects a past date', async () => {
  await assert.rejects(fetchIntradayChartData('2026-11-20'), /current day/);
});

test('live snapshot still has the shape we read', { skip: !process.env.ICAP_LIVE }, async () => {
  // no stub: real network
  const stats = await fetchAllCurrentStats();
  assert.equal(typeof stats.time, 'string');
  assert.ok(Array.isArray(await fetchIntradayChartData(today)));
});
```

- [ ] **Step 3: Add the `test` script and watch the tests fail**

`package.json` scripts: `"test": "tsx --test lib/services/icapService.test.ts"`.

Run: `npm test`
Expected: FAIL — the mapping tests fail because the service still POSTs to the old endpoints (`axios.post`, not the stubbed `axios.get`), and the past-date test fails because no date check exists.

- [ ] **Step 4: Rewrite the fetching in `lib/services/icapService.ts`**

- Replace `ICAP_BASE_URL`, `ICAP_TOKEN` and `headers` with the snapshot URL constant.
- One private helper does the GET and returns a lookup that throws `ICAP snapshot has no message <id>` for an absent id.
- `fetchAllCurrentStats()` uses it once for 1006 (`data`), 1007 (`data`) and 1005 (`data`); the mapping block below it is not edited.
- `fetchIntradayChartData(date)` first rejects with `ICAP only serves the current day (<today>); cannot fetch <date>` when `date !== today` (today from `COLOMBIA_TIMEZONE` in `lib/utils/timezone.ts`, via `toLocaleDateString('en-CA', { timeZone })`, imported with a relative path so `tsx scripts/backfill-dolar.ts` resolves it). The check sits before the existing `try`, which would otherwise replace the message. Then it reads `result[0].datos_grafico_moneda_mercado` from message 1000; the regex parser and the accumulation below it are not edited.
- Delete the three per-endpoint fetchers. Keep the exported interfaces.

- [ ] **Step 5: Update the caller**

`app/api/cron/collect-data/route.ts:71`: `fetchAllCurrentStats(dateFormatted)` becomes `fetchAllCurrentStats()`. `dateFormatted` is still used further down for the stored `date`.

- [ ] **Step 6: Run the tests**

Run: `npm test`
Expected: 6 pass, 1 skipped.

Run: `ICAP_LIVE=1 npm test`
Expected: 7 pass (real endpoint).

- [ ] **Step 7: Update docs and examples**

- `.env.local.example`: remove the `# ICAP API Configuration` block (both variables).
- `CLAUDE.md`: remove the `ICAP_API_BASE_URL` and `ICAP_API_TOKEN` lines; in the commands block add `npm test`; replace "No test suite." with a line saying the only tests are the ICAP service ones.
- `scripts/README.md`, backfill-dolar section: the source is the public snapshot (message 1000), it serves **the current day only**, past dates fail; remove the two ICAP variables from "Option 3" and from "Environment variables"; the "mismatched lengths" troubleshooting entry no longer mentions the base URL or token.

- [ ] **Step 8: Lint and type-check**

Run: `npm run lint && npm run build`
Expected: both succeed.

- [ ] **Step 9: Commit**

```bash
git add lib/services app/api/cron/collect-data/route.ts package.json .env.local.example CLAUDE.md scripts/README.md
git commit -m "fix(icap): read the public snapshot endpoint"
```

### Task 2: Legacy app reads the snapshot

**Files:**
- Modify: `legacy/worker.js`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `worker.data.stats` and `worker.data.allStats` with the same keys as today.

- [ ] **Step 1: Rewrite the two fetches in `legacy/worker.js`**

- Remove the `headers` constant.
- One helper does `axios.get` on the snapshot URL and returns the message with a given id, throwing `ICAP snapshot has no message <id>` when absent.
- `updateStats`: one GET; `estadisticasPrecioMercado.data.data` becomes message 1006 `.data`, `estadisticasPromedioCierre.data.data` becomes 1007 `.data`, `estadisticasMontoMercado.data.data` becomes 1005 `.data`. The `data.*` assignments keep their names. `dateformatted` goes away.
- `updateAllStats`: `json.result[0].datos_grafico_moneda_mercado` comes from message 1000; the parser below is not edited. `dateformatted` goes away.
- Both keep their `try/catch` and `console.time` lines.

- [ ] **Step 2: Run the legacy app against the live endpoint**

```bash
cd legacy && npm ci && PORT=3999 npm start
```

In another shell:

Run: `curl -s localhost:3999/setfx/stats`
Expected: an object with `trm`, `price`, `transactions`, … (during market hours with values; otherwise empty strings).

Run: `curl -s localhost:3999/setfx/allStats`
Expected: `{"monto":[[…]],"precio":[[…]]}` with equal-length arrays (empty arrays outside trading).

The process log shows no `Error on request` lines. Stop the server.

- [ ] **Step 3: Commit**

```bash
git add legacy/worker.js
git commit -m "fix(legacy): read the ICAP public snapshot endpoint"
```

### After merge (deploys trigger on `master`)

- [ ] `GET https://salmon-ground-0be8b030f.4.azurestaticapps.net/api/stats/current` reports today's `dataDate` during market hours.
- [ ] Logic App `dolar-v2-data-collector`: `RunsFailed` stops growing during market hours.
- [ ] `GET https://dolar-webapp.azurewebsites.net/setfx/stats` is non-empty.
