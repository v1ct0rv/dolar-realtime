# The dollar line turns red below the day's opening price — design

Date: 2026-11-23

## Why

SET-ICAP's own chart splits its line into two colours at a dotted level, and that split is what makes the
day readable at a glance: where the dollar is trading against where it started. The new dashboard's
intraday chart draws one gold line and leaves that comparison to the reader.

## What the dotted level is

The request first named it as the day's TRM. It is not. SET-ICAP's frontend takes the first point of the
day's price series and uses that one value for both the dotted line and the colour cut, so the level is the
first traded price of the day: the opening price. On 2026-11-23 that was 3,501.00, and the TRM 3,461.92.
Asked which level to use, the owner chose the opening price, as SET-ICAP does.

## Goals

- Wherever the intraday price is below the day's opening price, the line and the fill next to it are red.
- The opening price is on the chart: a dotted line, named with its value in the legend.

## Non-goals

- Green above the opening price. The line keeps its gold there: gold is this chart's price colour, and red
  is the exception worth noticing. The owner left this colour open.
- Anything about the TRM on this chart. It stays in its card.
- The Brent chart and the legacy app.

## Approaches

1. **One gradient cut at the opening price, in chart coordinates (chosen).** A vertical gradient that spans
   the plot area changes colour at the opening price's height and paints both the line and the fill. The
   fill runs between the line and that level (`baseValue`), as in the reference: upwards when the price is
   below.
2. **A gradient cut in the line's own bounding box** (the usual Recharts recipe). Rejected: the line and
   the fill have different boxes, so two offsets would have to agree; a flat line has a box of zero height
   and disappears.
3. **Two series, one clipped above and one below.** Rejected: twice the marks, and a seam where they meet.

## Design

- The level is `stats.openPrice`, the opening price ICAP reports for the day, which the dashboard already
  has. It is preferred over the first stored point of the series: if the collector misses the first
  minutes, the first stored point is not the open.
- The split is drawn only when that price is a positive number. Otherwise the chart is as it is today.
- A small pure function gives where the cut falls: the fraction of the axis from its top down to the
  level, between 0 and 1. A level above the axis gives 0 (all red), below it 1 (all gold).
- A component inside the chart reads the plot area and the axis range from Recharts and defines the two
  gradients, one for the line and one for the fill, cut at that fraction. Both marks name the gold as
  their fallback paint, so a missing gradient can never make the line disappear.
- The fill's base is the opening price, kept inside the axis range.
- A dotted reference line marks the level. It carries no label of its own: the price line starts at this
  level and keeps coming back to it, so a label on the line sat on top of the price wherever it was tried.
- The legend names it: `APERTURA 3.501,00` with a dotted swatch, and `BAJO LA APERTURA` with a red one.
  Red comes from the theme's negative colour, in both themes.

## Testing

- Unit tests for the cut: a level inside the range, above it, below it, and a range of zero height.
- In a browser with seeded data that crosses the opening price, in both themes: red below, gold above, the
  dotted line and its label.
- On the pull request's preview with production data: on 2026-11-23 the mid-morning stretch below
  3,501.00 is red, as in the reference image.

## Calls made while writing this

- Gold above the opening price, not green.
- `stats.openPrice` as the level, not the first stored point.
- The file keeps its original name (`below-trm-red`), from before the level was settled, so the links
  already shared keep working.
