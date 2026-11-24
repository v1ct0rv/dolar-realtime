/**
 * Where a horizontal level cuts a vertical axis that runs from `max` at the top
 * to `min` at the bottom: the fraction of the axis above the level, from 0 to 1.
 *
 * It is the offset of the colour stop in a gradient that paints a chart one
 * colour above the level and another below it. A level at or above the top
 * gives 0 (the whole chart is below it), one at or below the bottom gives 1.
 * The two guards also keep a flat axis (`min === max`) from dividing by zero.
 */
export function baselineSplit(min: number, max: number, baseline: number): number {
  if (baseline >= max) return 0;
  if (baseline <= min) return 1;
  return (max - baseline) / (max - min);
}
