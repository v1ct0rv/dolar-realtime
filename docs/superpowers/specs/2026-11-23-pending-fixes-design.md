# Five pending fixes — design

Date: 2026-11-23

## Why

The Brent oil work and the legacy chart work each left a short list of known defects, written down and
not fixed. The owner asked for all of them.

## The five

### 1. Highstock is loaded unpinned (legacy)

The legacy page takes whatever `code.highcharts.com/stock/highstock.js` serves. That is how the dollar
chart came to read in UTC, both charts turned dark on a white page, and the oil chart's dormant code
threw: each was a Highcharts major changing under the page.

**Fix.** The three scripts load from the versioned path, `13.1.1`, the version the unpinned path serves
today (checked: same file, byte for byte in size). Nothing changes now; the next Highcharts release
no longer changes the page by itself.

Not done: subresource integrity hashes. The CDN answers only requests that carry a `Referer`, which is
unusual enough that adding `crossorigin` to these tags is worth trying on its own, with the page open.

### 2. The new dashboard says "HISTÓRICO" after 7 pm for today's data

`getTodayColombiaDate` builds a `Date` from Colombia's wall-clock time and then reads its date with
`toISOString()`, which is UTC. In a browser in Colombia that is tomorrow's date from 19:00 on, so the
dashboard decides its data is not today's, shows "HISTÓRICO" and stops refreshing. The same line is
repeated further down for the "yesterday" notice, and `toColombiaDateString` in `lib/utils/timezone.ts`,
the shared helper nothing calls, has the same mistake.

**Fix.** `toColombiaDateString` formats the date in the `America/Bogota` zone directly, and the
dashboard calls it in both places.

Not done: the API routes compute "today" with the same idiom. On the server it is correct, because
Azure runs in UTC, where the two readings agree; it is wrong only on a developer machine after 19:00.
The cron route's time handling is delicate and is left alone.

### 3. The headline filter looks at the title before the outlet is removed

A headline counts when its title names oil. The check ran on the raw title, which ends in the outlet's
name, so "El Ibex 35 abre al alza - Crudo Transparente" passed. It also matched inside words:
"Brentford".

**Fix.** Strip the outlet first, then look for petróleo(s), Brent, crudo(s), WTI or OPEP as whole words.

### 4. A move measured across a gap is labelled "en 30 min"

Each point is compared with the latest point at least 30 minutes older. After the futures' daily
one-hour break, that point is more than an hour older, and a change across the break was marked as a
30-minute move.

**Fix.** A point whose reference is more than 45 minutes older has no change. Forty-five allows for the
few missing points Yahoo leaves inside a session and excludes the break.

### 5. Some HTML entities reach the reader raw

Only five entities were decoded. `&apos;` and numeric ones (`&#8212;`, `&#x2019;`) are now decoded too,
before `&amp;` as the others are. A number that is not a valid character is left as it is.

## Where

Fixes 3 to 5 are in the rule both apps carry: `lib/services/oilService.ts` and `legacy/worker.js`. The
shared fixture gains the cases, so both test suites fail first and then pass on the same inputs. Fix 1
is `legacy/views/layout.pug`; fix 2 is `lib/utils/timezone.ts` and the dashboard.

## Testing

- New app: `npm test` (the rule's new cases, and `toColombiaDateString` at 19:30, 23:59 and 00:00
  Colombian time).
- Legacy: `npm --prefix legacy test` (the same fixture, and a session with a 70-minute gap).
- The calibration day must still give its five moves in both apps.
- In a browser: the legacy page on the pinned scripts, and the new dashboard's header after 19:00.
- After merge: both production oil endpoints, the legacy page, and the dashboard's header.
