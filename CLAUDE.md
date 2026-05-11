# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server (Turbopack)
npm run build      # Production build (standalone output)
npm run lint       # ESLint over app/ lib/ types/
npm start          # Run production build

# Data scripts
npm run backfill-dolar              # Backfill dolarData from ICAP
npm run backfill-trm                # Backfill trmData
npm run remove-duplicates-trmData   # Deduplicate trmData collection
npm run remove-duplicates-dolarData # Deduplicate dolarData collection
```

No test suite. Type-check via `npm run build`.

Trigger the cron manually in dev:
```bash
curl -X POST http://localhost:3000/api/cron/collect-data \
  -H "Authorization: Bearer dev-secret-token"
```

## Environment Variables

Required in `.env.local`:
- `MONGODB_URI` — MongoDB connection string (defaults to `mongodb://localhost:27017`)
- `MONGODB_DB_NAME` — database name (defaults to `dolar-realtime`)
- `ICAP_API_BASE_URL` — ICAP proxy base URL
- `ICAP_API_TOKEN` — ICAP authorization token
- `CRON_SECRET` — bearer token for the collect-data endpoint (defaults to `dev-secret-token`)

## Architecture

**Data flow**: Azure Logic App (every 20s, market hours) → `POST /api/cron/collect-data` → ICAP API → MongoDB (`dolarData` + `trmData` collections).

**Two MongoDB collections** (see `lib/mongodb.ts` `COLLECTIONS`):
- `dolarData` — intraday ticks: `{ date, time, price, amount, openPrice, minPrice, maxPrice, avgPrice, volume, transactions, metadata }`
- `trmData` — one record per trading day: `{ date, value, change, previousValue }`

**Timezone convention**: all `timestamp`/`createdAt` fields stored in UTC; `date` field (YYYY-MM-DD) and `time` field (HH:MM:SS) stored in Colombia time (COT, UTC-5) for ICAP API queries and day-boundary grouping. The cron route converts ICAP's ambiguous 12-hour time to 24h before storing.

**Key files**:
- `lib/services/icapService.ts` — ICAP API client; parses malformed JS-object responses with regex before `JSON.parse`
- `lib/aggregations.ts` — MongoDB aggregation pipelines (TRM analysis, historical OHLC)
- `app/api/stats/current/route.ts` — live stats with SWR caching (10s/20s)
- `app/api/stats/intraday/route.ts` — intraday time series
- `app/api/cron/collect-data/route.ts` — data ingestion (deduplicates by comparing critical fields before insert)
- `app/api/reports/trm-analysis/route.ts` — date-range TRM report (cached 300s/600s)

**Client components** (`'use client'`): `RealTimeDashboard` (auto-refreshes every 10s), `TRMAnalysisDashboard`, `TRMHistoryDashboard`, `HistoricalDashboard`.

**Server Components**: all page files under `app/` (use `export const metadata`). Dynamic client components must be wrapped in a Client Component before using `next/dynamic` with `ssr: false`.

## Styling

Tailwind CSS 4 — no `tailwind.config.ts`. CSS entry point is `app/globals.css` with `@import "tailwindcss"`.

Theme system: `data-theme="dark"|"light"` on `<html>`. CSS custom properties (`--clr-bg`, `--clr-card`, `--clr-gold`, etc.) defined in `globals.css` for both themes. An inline script in `layout.tsx` reads `localStorage` before hydration to prevent flash.

Fonts: Fraunces (`--font-display`), DM Mono (`--font-mono`), DM Sans (`--font-body`).

## Deployment

Azure Static Web Apps with `output: "standalone"`. Cron is an Azure Logic App (see `infra/`) that POSTs to the collect-data endpoint on a schedule.
