# Legacy Dollar Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the legacy page's dollar chart readable (Colombian time, light theme, usable legend, Spanish
texts), colour its price red below the day's opening price, and link its cursor with the oil chart's.

**Architecture:** All in the page: Highcharts options, two small pure helpers with tests, and pointer listeners
on the two chart containers. No change to the worker or its JSON.

**Tech Stack:** Express 4 / pug, jQuery 2, Highstock (latest from the CDN, 13.1.1 today), `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-23-legacy-dollar-chart-design.md`

## Global Constraints

- Theme class, exact, on `body`: `highcharts-light`.
- Time zone, exact, on both charts: `America/Bogota`.
- Link limit, exact: 10 minutes.
- Below the opening price: `#dc2626`. Above it: `#16a34a`. (First written as "the chart's own price colour",
  `Highcharts.getOptions().colors[1]`, which turned out to be green only in Highcharts' dark theme.)
- Texts, exact: `Hora (Colombia)`, `Precio (COP)`, `Monto (miles USD)`, `Fuente: dolar.set-icap.com`.
- Listeners go on `#container` and `#container-brent`; charts are looked up when an event fires.
- No new dependencies. No change to `legacy/worker.js`, the routes, or the new app.

## Review Focus

1. **The oil chart is hidden or was never drawn** (`/investing/brentOil` answers `{}`): hovering the dollar
   chart throws nothing, and the dollar chart is unaffected.
2. **An empty dollar series** (before the first trade): no opening price, no zones, no plot line, no error.
3. **A page left open into the next day**: the level follows the new day's first price.
4. **Hovering oil outside the dollar's hours**: the dollar chart shows no tooltip and no crosshair.

---

### Task 1: Helpers

**Files:**
- Create: `legacy/public/javascripts/chartHelpers.js`
- Create: `legacy/chartHelpers.test.js`
- Modify: `legacy/package.json` (`test` runs both test files)
- Modify: `legacy/views/index.pug` (load `chartHelpers.js` before `index.js`)

**Interfaces:**
- Produces a browser global `chartHelpers`, also `module.exports` under Node:

```js
// Position in `times` (epoch ms, ascending) of the one nearest to `target`, or -1 when none is within maxGapMs.
chartHelpers.nearestIndexByTime(times, target, maxGapMs)
// The first price of a [[ms, price], ...] series when it is a positive number, else null.
chartHelpers.openingPrice(series)
```

- [ ] **Step 1: Write the failing tests** in `legacy/chartHelpers.test.js`

```js
test('nearestIndexByTime picks the nearest time', () => {
  assert.equal(nearestIndexByTime([1000, 2000, 4000], 2100, 500), 1);
  assert.equal(nearestIndexByTime([1000, 2000, 4000], 3900, 500), 2);
});
test('nearestIndexByTime returns -1 past the limit, and counts the limit itself', () => {
  assert.equal(nearestIndexByTime([1000, 2000, 4000], 5000, 500), -1);
  assert.equal(nearestIndexByTime([1000, 2000, 4000], 4500, 500), 2);
});
test('nearestIndexByTime gives a tie to the earlier time', () => {
  assert.equal(nearestIndexByTime([1000, 2000, 4000], 3000, 5000), 1);
});
test('nearestIndexByTime returns -1 for no times or a target that is not a time', () => {
  assert.equal(nearestIndexByTime([], 2000, 500), -1);
  assert.equal(nearestIndexByTime([1000], NaN, 500), -1);
  assert.equal(nearestIndexByTime([1000], undefined, 500), -1);
});
test('openingPrice is the first price of the series', () => {
  assert.equal(openingPrice([[1000, 3501], [2000, 3510]]), 3501);
});
test('openingPrice is null without a usable first price', () => {
  assert.equal(openingPrice([]), null);
  assert.equal(openingPrice(undefined), null);
  assert.equal(openingPrice([[1000, 0]]), null);
  assert.equal(openingPrice([[1000, null]]), null);
});
```

- [ ] **Step 2:** `npm --prefix legacy test` — expected: the new file fails on the missing module.
- [ ] **Step 3:** Implement the two helpers.
- [ ] **Step 4:** `npm --prefix legacy test` — expected: all pass.
- [ ] **Step 5: Commit** — `feat(legacy): helpers for the chart link and the opening price`

### Task 2: The dollar chart

**Files:**
- Modify: `legacy/views/layout.pug` (`body.highcharts-light`)
- Modify: `legacy/public/javascripts/index.js` (`loadDolarChart`, `updateData`, `loadBrentChart`)

**Interfaces:**
- Consumes: `chartHelpers.openingPrice` from Task 1.

- [ ] **Step 1:** Theme class on `body`.
- [ ] **Step 2:** In `loadDolarChart`: the time zone, the texts, `HH:MM` for hours and minutes, the default
  legend, a crosshair on the time axis, fainter columns, and the price as an `area` series.
- [ ] **Step 3:** Add `applyOpeningPrice(chart, data)`: with an opening price, set the price series'
  `threshold` and its two `zones`, replace the plot line with id `open`, and name the level in the subtitle;
  without one, clear all three. It returns early when the price has not changed. Call it after the chart is
  created and on every refresh.
- [ ] **Step 4:** In `loadBrentChart`: the default legend, a crosshair on the time axis, `HH:MM` for minutes,
  `Hora (Colombia)`.
- [ ] **Step 5:** Browser check of the dollar chart, system in dark mode.
- [ ] **Step 6: Commit** — `fix(legacy): a readable dollar chart, red below the day's open`

### Task 3: The link

**Files:**
- Modify: `legacy/public/javascripts/index.js`

**Interfaces:**
- Consumes: `chartHelpers.nearestIndexByTime` from Task 1.

- [ ] **Step 1:** Add `showMoment(chart, time)`: on `chart`'s price series, find the point nearest to `time`
  within 10 minutes; draw the tooltip (all series' points at that index when the tooltip is shared) and the
  crosshair there, or hide both when there is none. A missing chart is ignored.
- [ ] **Step 2:** At page start, on each of the two containers: `mousemove` and `touchmove` read the hovered
  time from that container's chart and call `showMoment` on the other; `mouseleave` hides the other's.
- [ ] **Step 3:** Browser check of the four Review Focus cases.
- [ ] **Step 4: Commit** — `feat(legacy): hovering one chart shows the same moment on the other`
