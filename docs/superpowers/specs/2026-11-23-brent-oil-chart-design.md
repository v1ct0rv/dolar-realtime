# Brent oil chart with news on sharp moves — design

Date: 2026-11-23

## Why

The legacy app used to show a Brent oil chart under the dollar chart, with news
flags pinned on it. Brent moves the Colombian peso, so the chart explained a
good part of the dollar's day at a glance.

It came from one investing.com call that returned the 5-minute prices, the news
and the economic calendar together. That endpoint now answers `403`, the job
was commented out long ago, and `updateBrentOil` was deleted on 2026-11-23
(`0e44d59`). The legacy page still has the chart code but receives `{}` and
hides the section. The new app never had oil.

## Goals

- Both apps show today's Brent price line, the current price and its change
  against the previous close.
- Where Brent moved sharply, the chart carries a marker with the headline
  published closest to that moment. A quiet day has no markers.
- No Azure configuration change, no new dependency, no API key.

## Non-goals

- Storing oil prices or headlines in MongoDB. Nothing is kept across days, so
  there is no oil history and no oil-versus-dollar report.
- The economic-calendar flags the legacy chart also had. No free source was
  found.
- Overlaying oil on the dollar chart. It is its own section below it, as before.
- Claiming a headline caused a move. It is the nearest one in time, nothing more.

## Anti-goals

- A chart crowded with one flag per headline. Google News returns 20 to 60
  Brent headlines a day.
- Rendering feed text as HTML without escaping it. Headlines are third-party
  input and the legacy tooltip renders HTML.

## Sources

Both were checked from a developer machine on 2026-11-23. Neither was checked
from Azure's outbound addresses.

**Price** — `GET https://query1.finance.yahoo.com/v8/finance/chart/BZ=F?interval=5m&range=1d`

- Unofficial, no key. It answers `429` unless the request carries a
  browser-like `User-Agent`; `Mozilla/5.0` is enough.
- `chart.result[0].timestamp` is a list of epoch seconds and
  `chart.result[0].indicators.quote[0].close` the matching prices. A price can
  be `null` (one of 205 on the day checked) and that point is skipped.
- `chart.result[0].meta.regularMarketPrice` is the current price and
  `meta.chartPreviousClose` the previous close.
- `range=1d` is the current session, which starts at 00:00 New York time. On a
  weekend it is Friday's session.

**News** — `GET https://news.google.com/rss/search?q=petr%C3%B3leo+brent+when:1d&hl=es-419&gl=CO&ceid=CO:es-419`

- RSS in Spanish, no key, 64 items on the day checked.
- Each `<item>` has `<title>` (ending in ` - <source name>`), `<link>`,
  `<pubDate>` in RFC 822 and `<source url="…">name</source>`. Titles are plain
  text with XML entities (`&amp;`), no CDATA.

## Approaches

1. **Each app fetches for itself (chosen).** The new app gets a service and a
   route; the legacy worker gets `updateBrentOil` back. The detection rule is
   written twice. It matches how ICAP is already done in both apps, needs no
   Azure change, and either app keeps working if the other is down.
2. **Legacy consumes the new app.** `/investing/brentOil` would call the new
   app's route and reshape the answer. Half the code and one place to fix, but
   the legacy app would depend on the new one being up and would need its URL
   as a new app setting.
3. **Store oil from the cron into MongoDB.** Rejected: the legacy app has no
   MongoDB connection, the cron only runs 8:00 to 13:30 while Brent trades
   almost around the clock, and it is the most code.

How the news shows was also a choice. Picked: markers only on sharp moves.
Not picked: every headline as a flag, capped at one an hour (what the legacy
app did, but it marks flat stretches too); and a plain list under an unmarked
chart (loses the link between headline and move).

## The rule, identical in both apps

**Moves**

1. For each price point, take the latest point at least 30 minutes older and
   compute the percentage change between the two. Points in the session's first
   30 minutes have no change.
2. A point is a candidate when the absolute change is 0.75 % or more.
3. Take candidates strongest first. Keep one unless an already kept move is
   less than 30 minutes away. Stop at 5.
4. Return the kept moves in time order.

The numbers were calibrated on 2026-11-23, a day Brent fell 3.6 %: 0.5 % gave
15 moves, 1 % gave 3, and 0.75 % with the spacing and the cap gives 5
(11:10, 13:50, 14:20, 15:15 and 16:00 UTC). They are named constants. The
spacing between kept moves is the same 30 minutes as the window.

Prices and percentages are rounded to 2 decimals on output. Candidates are
compared on the unrounded change, and a tie goes to the earlier point.

**Headlines**

1. Parse the feed's items. Strip the trailing ` - <source name>` from the
   title, decode `&amp; &lt; &gt; &quot; &#39;`, and drop any item whose link
   does not start with `https://` or whose date does not parse.
2. Going through the moves strongest first, give each the unused headline
   published closest to it, within 60 minutes either side. A headline is used
   once. A move with none in range keeps its marker and shows only the change.

## Design

**New app**

- `lib/services/oilService.ts` — `getBrentOil()` fetches both sources with
  axios and returns
  `{ price, previousClose, points: [ms, price][], moves: [{ timestamp, price, changePercent, headline? }] }`,
  where `headline` is `{ title, url, source, publishedAt }`. The parsing, the
  move rule and the headline matching are separate pure functions so they can
  be tested without the network.
- `app/api/oil/brent/route.ts` — `GET` answers `{ success: true, data }`, or
  `502` with `{ success: false, error }` when the price cannot be read.
- The route keeps the last result in memory for 60 seconds, so many open
  dashboards cost Yahoo one request a minute per server instance. Static Web
  Apps has no CDN in front of the API to do this through `Cache-Control`.
- `types/index.ts` gains the three types.
- `app/components/dashboard/BrentOilChart.tsx` — a client component with its
  own fetch and a 60-second refresh. A card titled "Petróleo Brent" with the
  price, the change and percentage against the previous close, an area chart
  of the day in the browser's local time with a numbered dot on each move, and
  under it an ordered list: number, time, direction and percentage "en 30 min",
  and the headline as a link opening in a new tab with its source. The list is
  the accessible form of the markers. It links to Yahoo Finance as the source.
- `RealTimeDashboard` renders it under the intraday chart and passes its chart
  colour map, so both charts follow the theme.
- When the route fails or returns no points, the component renders nothing.

**Legacy app**

- `legacy/worker.js` — `updateBrentOil` returns, applying the same rule, and
  fills `worker.data.oilStats` in the shape the page already reads:
  `{ attr: { last_value, last_close_value }, candles: [[ms, price]], events: { news: [{ x, title, text }] } }`.
  `x` is the move's time, `title` is `▲` or `▼`, and `text` is the tooltip
  HTML: the change, then the headline as a link with its source. Title and
  source are HTML-escaped.
- `legacy/app.js` runs it at start and every 60 seconds.
- `legacy/public/javascripts/index.js` — four edits:
  - Remove the loop that prefixes every link with `http://es.investing.com`.
  - Remove the economic-calendar flag series, name the new sources in the
    subtitle, and let the tooltip take the pointer so its link can be clicked.
  - Make the refresh update the flags as well as the line. Today it only
    updates the line, and breaks if the first load had no chart.
  - Correct the percentage next to the price. It is computed as
    `(1 - close / last) * 100`, the change relative to the current price; it
    becomes `(last / close - 1) * 100`, the change against the previous close,
    so both apps show the same number.
- `/investing/brentOil` keeps its path and JSONP behaviour.

**When a source fails**

- Price unreadable: the new app's route answers 502 and the section is hidden.
  The legacy worker logs the error and keeps its last good data, as it does for
  ICAP.
- News unreadable: the chart and price still show, and the moves have no
  headlines.
- No points yet: empty chart data, section hidden.

## Testing

- `lib/services/oilService.test.ts` under `npm test`: price parsing skipping
  `null`, the move rule (threshold, spacing, cap, time order), headline parsing
  (source suffix, entities, non-`https` link dropped), matching (nearest, 60
  minute limit, used once), and `getBrentOil` with axios stubbed, including
  news failing while the price succeeds.
- `legacy/worker.test.js`: `updateBrentOil` with axios stubbed fills
  `oilStats` in the page's shape and escapes a hostile headline.
- One fixture, `lib/services/oilService.fixture.js`, shared by both, like the
  ICAP one. It holds a small hand-built session with its feed, and the real
  session of the calibration day. Both apps' tests assert the same five moves
  on that day, which is what keeps the two copies of the rule in step.
- Before merging: each app's fetch run once against the live sources, and the
  new dashboard and the legacy page looked at in a browser.
- Before merging: `/api/oil/brent` answers on the pull request's Static Web
  Apps preview. That is the first call to Yahoo from Azure. If Yahoo refuses
  it there, the change is not merged and another price source is chosen. A
  pass is evidence, not proof: the preview's outbound addresses may differ
  from production's.
- After deploy: `/api/oil/brent` on the new app and `/investing/brentOil` on
  the legacy app answer with data. The legacy Web App has no preview, so this
  is its first check from Azure; if Yahoo refuses it, the section stays hidden
  there, as it is today.

## Risks

- **Yahoo is unofficial.** It can change or block the endpoint without notice,
  which is what happened with investing.com. When it does, the section
  disappears and nothing else breaks.
- **Azure addresses may be refused.** Checked on the pull request's preview
  for the new app, and only after deploy for the legacy one.
- **Prices are delayed** by about ten minutes, as Yahoo serves futures.
- **A headline can be unrelated.** The match is by time only.

## Calls made while writing this

- The section is its own card below the dollar chart, not an overlay.
- A move with no headline in range still gets a marker.
- 0.75 % in 30 minutes, at most 5 markers, at least 30 minutes apart, headline
  within 60 minutes.
- The new app refreshes oil every 60 seconds, independent of the dollar's 10.
- The legacy worker keeps its last good data on failure instead of hiding the
  section.
- A refusal from Yahoo on the preview stops the merge.
- The legacy page's percentage is corrected rather than copied into the new
  app.
