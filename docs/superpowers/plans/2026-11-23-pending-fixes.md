# Pending Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the five known defects left by the Brent oil and legacy chart work.

**Architecture:** Three independent changes: the oil rule in both apps (three fixes, one shared fixture), the
Colombia date helper and its two call sites in the dashboard, and the legacy page's script tags.

**Tech Stack:** Next.js 16 / TypeScript, Express 4 / pug, Node's built-in test runner.

**Spec:** `docs/superpowers/specs/2026-11-23-pending-fixes-design.md`

## Global Constraints

- Highstock version, exact: `13.1.1`, from `https://code.highcharts.com/stock/13.1.1/`.
- Oil title pattern, exact, case-insensitive: `\b(?:petr[oó]leos?|brent|crudos?|wti|opep)\b`, applied after the
  trailing ` - <source>` is removed.
- A point's reference may be at most 45 minutes older than the point.
- Entities decoded: `&lt; &gt; &quot; &#39; &apos;`, decimal `&#N;` and hexadecimal `&#xH;`, then `&amp;` last.
- The calibration day keeps its five moves: 11:10, 13:50, 14:20, 15:15, 16:00 UTC.
- The two copies of the rule change together and are tested on the same fixture.
- No new dependencies. No change to the API routes or the cron.

## Review Focus

1. **An entity that is not a character** (`&#99999999;`, `&#xD800;`): left as written, nothing throws.
2. **`&amp;#39;`**: decodes to the text `&#39;`, not to an apostrophe.
3. **A reference exactly 45 minutes older**: still counts.
4. **A title that is only the outlet** (`Crudo Transparente - Crudo Transparente`): the suffix goes, the rest
   names oil, it is kept.

---

### Task 1: The oil rule, both apps

**Files:**
- Modify: `lib/services/oilService.fixture.js`, `lib/services/oilService.ts`, `lib/services/oilService.test.ts`
- Modify: `legacy/worker.js`, `legacy/worker.test.js`

- [ ] **Step 1: Extend the fixture.** Headline B's title becomes
  `Petróleo &amp; gas: &lt;b&gt;rebote&lt;/b&gt; del crudo &#8212; l&apos;OPEP &#x2019;sube&#x2019; - La República`.
  Add two items next to the drop, both `https`: `El Ibex 35 abre al alza - Crudo Transparente` at 05:52 (source
  `Crudo Transparente`) and `Brentford gana en casa - Deportes` at 05:53.
- [ ] **Step 2: Update the expectations and add the new tests.** New app: B's title is
  `Petróleo & gas: <b>rebote</b> del crudo — l'OPEP ’sube’`; the two new items are absent. Legacy: B's link text
  is `Petróleo &amp; gas: &lt;b&gt;rebote&lt;/b&gt; del crudo — l&#39;OPEP ’sube’`. Plus:

```ts
test('detectMoves ignores a change measured across a gap', () => {
  const minute = 60_000;
  const flat = [0, 5, 10, 15, 20, 25, 30].map((m) => [m * minute, 100] as [number, number]);
  assert.deepEqual(detectMoves([...flat, [100 * minute, 98]]), []); // reference 70 minutes older
  assert.equal(detectMoves([...flat, [75 * minute, 98]]).length, 1); // reference exactly 45 minutes older
});
test('parseNews leaves an entity that is not a character as it is', () => {
  // titles `Crudo &#99999999; &#xD800; sube` and `Brent &amp;#39;estable&amp;#39;`
  // expect `Crudo &#99999999; &#xD800; sube` and `Brent &#39;estable&#39;`
});
test('parseNews keeps a title that names oil once its outlet is removed', () => {
  // title `Crudo Transparente - Crudo Transparente`, expect title `Crudo Transparente`
});
```

  Legacy: `updateBrentOil marks nothing across a gap`, with a session of seven flat points and one 70 minutes
  later, 2 % lower.
- [ ] **Step 3:** Run both suites — expected: the changed and new tests fail, the calibration tests pass.
- [ ] **Step 4:** Change both copies of the rule.
- [ ] **Step 5:** Run both suites — expected: all pass.
- [ ] **Step 6: Commit** — `fix(oil): filter on the stripped title, skip moves across gaps, decode more entities`

### Task 2: The Colombia date

**Files:**
- Modify: `lib/utils/timezone.ts`, `app/components/dashboard/RealTimeDashboard.tsx`
- Create: `lib/utils/timezone.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test('toColombiaDateString gives the date in Colombia, whatever the machine zone', () => {
  assert.equal(toColombiaDateString(new Date('2026-11-24T00:30:00Z')), '2026-11-23'); // 19:30 in Colombia
  assert.equal(toColombiaDateString(new Date('2026-11-23T04:59:00Z')), '2026-11-22'); // 23:59
  assert.equal(toColombiaDateString(new Date('2026-11-23T05:00:00Z')), '2026-11-23'); // 00:00
});
```

- [ ] **Step 2:** `npm test` — expected: the first assertion fails on a machine west of UTC.
- [ ] **Step 3:** Fix `toColombiaDateString`; make `getTodayColombiaDate` call it and use that in the
  "yesterday" notice too.
- [ ] **Step 4:** `npm test`, `npm run lint`, `npm run build` — expected: clean.
- [ ] **Step 5: Commit** — `fix(dashboard): today's date in Colombia after 19:00`

### Task 3: Pin Highstock

**Files:**
- Modify: `legacy/views/layout.pug`

- [ ] **Step 1:** The three `code.highcharts.com` scripts load from `stock/13.1.1/`.
- [ ] **Step 2:** Browser check of the legacy page: `Highcharts.version` is `13.1.1`, both charts draw, the
  link and the red zone work, the console is clean.
- [ ] **Step 3: Commit** — `fix(legacy): pin Highstock to 13.1.1`
