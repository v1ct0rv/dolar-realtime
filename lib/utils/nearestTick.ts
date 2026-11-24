/** A chart's x tick. On the intraday charts `value` is an epoch timestamp in milliseconds. */
interface Tick {
  value?: unknown;
}

// Farther than this, two points are not the same moment: oil at 03:00 has no
// counterpart on a dollar chart that opens at 08:00.
const SAME_MOMENT_MS = 10 * 60_000;

/**
 * Position in `ticks` of the one nearest in time to `target`, or -1 when none is
 * within `maxGapMs`. A tie goes to the earlier tick, so the answer does not
 * flicker between two points.
 */
export function nearestTickIndex(ticks: readonly Tick[], target: number, maxGapMs: number): number {
  let nearest = -1;
  let nearestGap = Infinity;

  ticks.forEach((tick, i) => {
    const gap = Math.abs(Number(tick.value) - target);
    if (gap <= maxGapMs && gap < nearestGap) {
      nearest = i;
      nearestGap = gap;
    }
  });

  return nearest;
}

/**
 * A Recharts `syncMethod` for charts that share a time axis but not their
 * points: the receiving chart activates its point nearest in time to the one
 * hovered on the other chart. Recharts passes the hovered x value as a string
 * label, and treats an index with no tick (-1) as "show no cursor".
 */
export function syncByNearestTime(ticks: readonly Tick[], data: { activeLabel?: unknown }): number {
  // Number(undefined) is NaN, which is never within the limit: the mouse left the other chart.
  return nearestTickIndex(ticks, Number(data.activeLabel ?? NaN), SAME_MOMENT_MS);
}
