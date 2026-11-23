# Chart Hover Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hovering the dollar chart or the Brent chart on the new dashboard shows the other chart's cursor and
tooltip at the point nearest in time.

**Architecture:** Both Recharts charts share a `syncId`, and a custom `syncMethod` function picks the receiving
chart's point nearest in time to the hovered one, within a limit.

**Tech Stack:** Next.js 16, TypeScript, Recharts 3.7, Node's built-in test runner through `tsx`.

**Spec:** `docs/superpowers/specs/2026-11-23-chart-hover-sync-design.md`

## Global Constraints

- `syncId`, exact, on both charts: `intraday`.
- Limit, exact: 10 minutes. Farther than that, the receiving chart shows no cursor.
- Recharts calls the function as `syncMethod(ticks, data)`: `ticks` are the receiving chart's x ticks
  (`{ value }`, the timestamp) and `data.activeLabel` is the hovered timestamp, as a string. The return value
  indexes `ticks`; an index with no tick hides the cursor.
- No new dependencies. No change to the legacy app.

## Review Focus

1. **Mouse leaves the chart** (`activeLabel` is `undefined`): the function returns `-1`, nothing throws.
2. **The receiving chart is empty**: returns `-1`.
3. **Two points equally near**: the earlier one, so the result does not flicker between them.

---

### Task 1: Nearest-in-time search

**Files:**
- Create: `lib/utils/nearestTick.ts`
- Create: `lib/utils/nearestTick.test.ts`
- Modify: `package.json` (`test` script also runs `lib/utils/*.test.ts`)

**Interfaces:**
- Produces:

```ts
/** Position in `ticks` of the one nearest in time to `target`, or -1 when none is within `maxGapMs`. */
export function nearestTickIndex(ticks: readonly { value?: unknown }[], target: number, maxGapMs: number): number
/** Recharts `syncMethod`: the receiving chart's point nearest in time to the one hovered on the other chart. */
export function syncByNearestTime(ticks: readonly { value?: unknown }[], data: { activeLabel?: unknown }): number
```

- [ ] **Step 1: Write the failing tests**

```ts
const ticks = [1000, 2000, 4000].map((value) => ({ value }));

test('nearestTickIndex picks the tick nearest in time', () => {
  assert.equal(nearestTickIndex(ticks, 2100, 500), 1);
  assert.equal(nearestTickIndex(ticks, 3900, 500), 2);
});
test('nearestTickIndex returns -1 when the nearest is past the limit', () => {
  assert.equal(nearestTickIndex(ticks, 5000, 500), -1);
  assert.equal(nearestTickIndex(ticks, 4500, 500), 2); // exactly at the limit still counts
});
test('nearestTickIndex gives a tie to the earlier tick', () => {
  assert.equal(nearestTickIndex(ticks, 3000, 5000), 1);
});
test('nearestTickIndex returns -1 for an empty chart or a target that is not a time', () => {
  assert.equal(nearestTickIndex([], 2000, 500), -1);
  assert.equal(nearestTickIndex(ticks, NaN, 500), -1);
});
test('syncByNearestTime reads the hovered time from the label, within 10 minutes', () => {
  const minute = 60_000;
  const oil = [0, 5 * minute, 10 * minute].map((value) => ({ value }));
  assert.equal(syncByNearestTime(oil, { activeLabel: String(6 * minute) }), 1);
  assert.equal(syncByNearestTime(oil, { activeLabel: String(21 * minute) }), -1);
  assert.equal(syncByNearestTime(oil, { activeLabel: undefined }), -1);
});
```

- [ ] **Step 2: Run them and watch them fail** — `npm test`, expected: the new file fails on the missing module.
- [ ] **Step 3: Implement both functions** in `lib/utils/nearestTick.ts`.
- [ ] **Step 4: Run** `npm test` — expected: all pass.
- [ ] **Step 5: Commit** — `feat(dashboard): find the chart point nearest in time`

### Task 2: Wire the two charts

**Files:**
- Modify: `app/components/dashboard/RealTimeDashboard.tsx` (the intraday `ComposedChart` and `ChartTooltip`)
- Modify: `app/components/dashboard/BrentOilChart.tsx` (its `ComposedChart` and `OilTooltip`)

**Interfaces:**
- Consumes: `syncByNearestTime` from Task 1.

- [ ] **Step 1:** Give both `ComposedChart`s `syncId="intraday"` and `syncMethod={syncByNearestTime}`.
- [ ] **Step 2:** In both tooltips, take the time from the hovered point itself (`payload[0].payload.timestamp`)
  and fall back to `label`.
- [ ] **Step 3:** `npm run lint` and `npm run build` — expected: clean.
- [ ] **Step 4:** Browser check, as in the spec's Testing section.
- [ ] **Step 5: Commit** — `feat(dashboard): hovering one chart shows the same moment on the other`
