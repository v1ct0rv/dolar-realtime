# Below-Open Red Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On the new dashboard's intraday chart, the dollar line and its fill are red wherever the price is below
the day's opening price, and that price is drawn as a dotted line.

**Architecture:** One vertical gradient per mark, defined in chart coordinates across the plot area and cut at the
opening price's height.

**Tech Stack:** Next.js 16, TypeScript, Recharts 3.7 (`usePlotArea`, `useYAxisDomain`, `ReferenceLine`,
`Area.baseValue`).

**Spec:** `docs/superpowers/specs/2026-11-23-below-trm-red-design.md` (the file name predates the choice of level).

## Global Constraints

- The level is `stats.openPrice`. The split is drawn only when it is a positive number.
- Above the level the line stays gold (`ch.gold`). Below it the colour is the theme's negative colour:
  `#ef4444` dark, `#b91c1c` light.
- The y axis domain is not changed.
- User-facing copy, exact: `APERTURA 3.501,00` (value in `es-CO`, 2 decimals) and `BAJO LA APERTURA`.
- No new dependencies. No change to the stats route, the Brent chart or the legacy app.

## Review Focus

1. **No opening price** (`0`, `NaN`): the chart renders exactly as before, no dotted line, no red, no legend
   entries.
2. **Opening price outside the axis range** (the collector missed the open and the day moved away): all gold or
   all red, no dotted line, nothing drawn outside the plot.
3. **A single price point, or a flat day** (axis range of zero height): no `NaN` in the gradient.

---

### Task 1: Where the cut falls

**Files:**
- Create: `lib/utils/baselineSplit.ts`, `lib/utils/baselineSplit.test.ts`

**Interfaces:**
- Produces:

```ts
/** Fraction of the axis, from its top, at which `baseline` sits: 0 at `max`, 1 at `min`, clamped to 0..1. */
export function baselineSplit(min: number, max: number, baseline: number): number
```

- [ ] **Step 1: Write the failing tests**

```ts
test('baselineSplit places a baseline inside the range', () => {
  assert.equal(baselineSplit(3400, 3600, 3550), 0.25);
  assert.equal(baselineSplit(3400, 3600, 3600), 0);
  assert.equal(baselineSplit(3400, 3600, 3400), 1);
});
test('baselineSplit clamps a baseline outside the range', () => {
  assert.equal(baselineSplit(3400, 3600, 3700), 0); // everything is below it
  assert.equal(baselineSplit(3400, 3600, 3300), 1); // everything is above it
});
test('baselineSplit never returns NaN for a range of zero height', () => {
  assert.equal(baselineSplit(3500, 3500, 3400), 1);
  assert.equal(baselineSplit(3500, 3500, 3600), 0);
  assert.equal(baselineSplit(3500, 3500, 3500), 0);
});
```

- [ ] **Step 2:** `npm test` — expected: the new file fails on the missing module.
- [ ] **Step 3:** Implement `baselineSplit`.
- [ ] **Step 4:** `npm test` — expected: all pass.
- [ ] **Step 5: Commit** — `feat(dashboard): find where a baseline cuts an axis`

### Task 2: The chart

**Files:**
- Modify: `app/components/dashboard/RealTimeDashboard.tsx`

**Interfaces:**
- Consumes: `baselineSplit` from Task 1.

- [ ] **Step 1:** Add `red` to both chart colour maps (the constraint's two values).
- [ ] **Step 2:** Add a component rendered inside the intraday `ComposedChart` that reads `usePlotArea()` and
  `useYAxisDomain('right')` and defines two `linearGradient`s with `gradientUnits="userSpaceOnUse"`, from the
  plot's top to its bottom, cut at `baselineSplit(domainMin, domainMax, openPrice)`: one solid gold/red for the
  line, one translucent for the fill (fading towards the level from both sides).
- [ ] **Step 3:** When there is an opening price: point the price `Area`'s `stroke` and `fill` at those gradients
  with `ch.gold` as the fallback paint, set its `baseValue` to the opening price clamped into the axis domain,
  and add a dotted `ReferenceLine` at it on the price axis with the label. Otherwise leave the `Area` as it is.
- [ ] **Step 4:** Add the two legend entries, shown only when there is an opening price.
- [ ] **Step 5:** `npm run lint`, `npm run build` — expected: clean.
- [ ] **Step 6:** Browser check as in the spec's Testing section.
- [ ] **Step 7: Commit** — `feat(dashboard): turn the dollar line red below the day's open`
