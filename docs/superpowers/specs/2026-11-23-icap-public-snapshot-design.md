# ICAP public snapshot migration — design

Date: 2026-11-23

## Why

On Saturday 2026-11-14 (17:30 UTC) SET-ICAP replaced `dolar.set-icap.com` with a
new Next.js site and removed the API both of our apps read. Since then every
call to `https://proxy.set-icap.com/seticap/api/...` returns `403 Forbidden`
from Apache, whatever headers or token are sent.

- New app (`dolar-v2`): last stored tick is 2026-11-13. The Logic App still
  fires every 5 minutes; every market-hours run has failed since 2026-11-17.
- Legacy app (`dolar-webapp`): `/setfx/stats` and `/setfx/allStats` return `{}`;
  its container log is a 403 every 20 seconds.

Neither app sends a token (`ICAP_API_TOKEN` is empty in production, the legacy
app has none), so nothing expired. The endpoints are gone.

## Goals

- Both apps read live data again.
- No Azure configuration change is needed for the fix to work.

## Non-goals

- Recovering the intraday ticks of 2026-11-17 to 2026-11-20. The new public
  source only serves the current day.
- Changing what the cron does when ICAP has no data (it answers 500 and inserts
  nothing, as before).
- The legacy Brent oil job, which is commented out in `legacy/app.js`.

## Anti-goals

- Logging in to ICAP with the credentials embedded in their frontend bundle.

## The new source

`GET https://proxy.set-icap.com/api/v1/ws/public/delay/snapshot?market=71`

Public, no authentication, no special headers. It is what the official site
polls every 5 seconds for anonymous visitors (`Cache-Control: max-age=3`, ETag
supported). One response carries everything the four old endpoints did, as a
list of messages keyed by `id`:

| Old endpoint (POST)           | Message `id` | Payload                                        |
|-------------------------------|--------------|------------------------------------------------|
| `estadisticasPrecioMercado`   | 1006         | `data` — same 8 fields                         |
| `estadisticasPromedioCierre`  | 1007         | `data` — same 3 fields                         |
| `estadisticasMontoMercado`    | 1005         | `data` — same 7 fields                         |
| `graficoMoneda`               | 1000         | `result[0].datos_grafico_moneda_mercado`, same malformed string |

Field formats are unchanged: numbers as strings with thousands separators
(`"3,461.92"`), changes as `UP`/`DOWN`, time as `HH:MM:SS`. Outside trading the
fields are empty strings and the changes are `UNKNOWN`.

The request takes no date. The snapshot is always "today".

## Approaches

1. **Public HTTP snapshot (chosen).** One unauthenticated GET, same field
   shapes, so the existing parsing and the cron route stay as they are. It is
   the path ICAP itself serves to the public.
2. **WebSocket `wss://proxy.set-icap.com/ws/dolar`.** Real-time, but requires a
   login with credentials decrypted from their bundle and is subject to session
   limits. Fragile, and not ours to use.
3. **Authenticated `/api/v1/dolar/dapi/`.** Answers 401; needs an account we do
   not have.

## Design

**New app — `lib/services/icapService.ts`**

- One constant with the snapshot URL. `ICAP_API_BASE_URL` and `ICAP_API_TOKEN`
  are no longer read: production pins the old base path in `ICAP_API_BASE_URL`,
  so honouring it would keep the app broken until someone edits Azure.
- `fetchAllCurrentStats()` does a single GET and picks messages 1006, 1007 and
  1005. Its return value is unchanged, so `app/api/cron/collect-data/route.ts`
  only loses the date argument.
- The three per-endpoint fetchers are removed; nothing else calls them.
- Because the request carries no date, the service rejects a snapshot whose
  `updated_at` is not today in Colombia time. Otherwise a snapshot ICAP failed
  to reset overnight would be stored as today's data. A snapshot without
  `updated_at` is accepted.
- `fetchIntradayChartData(date)` picks message 1000 and keeps the existing
  regex parser. It rejects any date other than today (Colombia time), because
  the snapshot cannot serve another day.

**Legacy app — `legacy/worker.js`**

- `updateStats` and `updateAllStats` each do one GET to the snapshot and pick
  their messages by `id`. The browser-like headers go away; they are not needed.

**Backfill — `scripts/backfill-dolar.ts`**

- No code change. Through `fetchIntradayChartData` it now works for the current
  day only and reports a clear failure for past dates. `scripts/README.md` says
  so.

**Docs and examples**

- `.env.local.example`, `CLAUDE.md` and `scripts/README.md` drop the two ICAP
  variables.

## Testing

- `lib/services/icapService.test.ts` (Node's built-in runner through `tsx`,
  `npm test`) runs the service against a fixture trimmed from a real snapshot
  captured on 2026-11-23, with `axios.get` stubbed.
- Before merging: run both apps' fetch code once against the live endpoint.
- After deploy: `/api/stats/current` reports today's `dataDate`, the Logic App
  runs succeed, and the legacy `/setfx/stats` is non-empty.

## Follow-ups (not in this change)

- `ICAP_API_BASE_URL` and `ICAP_API_TOKEN` in the `dolar-v2` app settings are
  now unused and can be deleted.
- Today's ticks from before the deploy can be recovered the same day with
  `npm run backfill-dolar <today>`, with a caveat: the chart only carries
  transactional trades, so backfilled ticks have a lower running volume and
  transaction count than the ticks the cron stores from the totals message
  (about 40% lower in volume on 2026-11-23). Prices are unaffected.
- The cron's guard only checks `time`. If ICAP ever fills the average/close
  message before the price and volume ones, `NaN` values could be inserted.
  Not observed, and the same was possible with the old three requests.
