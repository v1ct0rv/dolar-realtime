# The dollar line turns red below the day's TRM — design

Date: 2026-11-23

## Why

The question a reader brings to the intraday chart is often "is the dollar trading below today's TRM?".
Today the chart answers it only if you read the TRM card and compare numbers on the axis. The reference
for the look is SET-ICAP's own chart, which splits its line into two colours at a dotted level.

## Goals

- Wherever the intraday price is below the day's TRM, the line and the fill under it are red.
- The TRM itself is on the chart: a dotted line with its value, and an entry in the legend.

## Non-goals

- Green above the TRM. The line keeps its gold there: gold is this chart's price colour, and red is the
  exception worth noticing.
- The Brent chart. It has no TRM.
- The legacy app.
- Stretching the price axis to reach a TRM far from the day's range. On such a day the chart is all one
  colour, and the legend still gives the TRM.

## Anti-goals

- Red against a made-up level. When no TRM is stored for the day, the stats route answers with the
  latest price in the `trm` field. Splitting the line there would paint about half the day red for no
  reason.

## What the reference image shows

Its dotted level is 3,501.00. That is the day's opening price, not the TRM, which was 3,461.92 on
2026-11-23. This design follows the request (the TRM), not the image's level. On that day the dollar
traded between 3,473.00 and 3,538.10, so against the TRM nothing would have been red.

## Approaches

1. **One gradient cut at the TRM, in chart coordinates (chosen).** A vertical gradient that spans the plot
   area changes colour at the TRM's height and paints both the line and the fill. The fill runs between
   the line and the TRM level (`baseValue`), as in the reference: upwards when the price is below.
2. **A gradient cut in the line's own bounding box** (the usual Recharts recipe). Rejected: the line and
   the fill have different boxes, so two offsets would have to agree; a flat line has a box of zero height
   and disappears.
3. **Two series, one clipped above and one below.** Rejected: twice the marks, and a seam where they meet.

## Design

- `GET /api/stats/current` gains `trmAvailable`: `true` when a TRM is stored for the day shown, `false`
  when `trm` is the fallback to the latest price. Nothing else in the answer changes.
- The dashboard draws the split only when `trmAvailable` is true. Otherwise the chart is as it is today.
- A small pure function gives where the cut falls: the fraction of the axis from its top down to the TRM,
  between 0 and 1. A TRM above the axis gives 0 (all red), below it 1 (all gold).
- A component inside the chart reads the plot area from Recharts and defines the two gradients, one for
  the line and one for the fill, cut at that fraction.
- The fill's base is the TRM, kept inside the axis range, so on a day wholly above a distant TRM the fill
  reaches the bottom of the chart as it does today.
- A dotted reference line at the TRM carries the label `TRM 3.461,92`. Recharts leaves it out when the TRM
  is outside the axis range.
- The legend gains `TRM 3.461,92` with a dotted swatch and `BAJO LA TRM` with a red one. Red comes from
  the theme's negative colour, in both themes.

## Testing

- Unit tests for the cut: a TRM inside the range, above it, below it, and a range of zero height.
- In a browser with seeded data that crosses the TRM, in both themes: red below, gold above, the dotted
  line and its label, and the chart unchanged when no TRM is stored.
- On the pull request's preview with production data. On 2026-11-23 that means the dotted TRM line near
  the bottom of the chart and no red.

## Calls made while writing this

- Gold above the TRM, not green.
- The axis is not stretched to include the TRM.
- `trmAvailable` is added to the route rather than guessing a fallback from `trm === price`.
