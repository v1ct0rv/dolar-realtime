# Legacy app: a readable dollar chart, linked to the oil chart — design

Date: 2026-11-23

## Why

The legacy page now shows two charts, the dollar's and Brent's, and the dollar chart is the worse of the
two. The page takes the latest Highstock from the CDN, unpinned, and the chart's old configuration has
aged badly on it. In production on 2026-11-23:

- The time axis reads 1:00 PM to 6:00 PM. The market trades 8:00 to 13:00 in Colombia; the timestamps are
  right and Highstock now draws them in UTC, because `global.useUTC` is no longer honoured.
- The chart is dark on a white page whenever the reader's system is in dark mode: Highstock 13 follows
  `prefers-color-scheme`, the page does not.
- The legend is a white box floating over the price line, with text that cannot be read on it.
- Its texts are stale: "Hours of the Day", "Miles UDS", and a source link to ICAP's previous site.

The owner also asked for two things the new app already has: the cursor on one chart shown at the same
moment on the other, and the price in red where it is below the day's opening price.

## Goals

- The dollar chart reads in Colombian time, in the page's light colours, with a legend that does not
  cover the data and Spanish texts.
- The price is an area cut at the day's opening price: red below it, the chart's green above, with a
  dotted line at the level. This is what SET-ICAP's own chart shows.
- Hovering either chart shows the other's crosshair and tooltip at its point nearest in time.

## Non-goals

- Pinning Highstock to a version. It is the root of several of these defects and is worth doing, but it
  changes what every chart on the page runs on and deserves its own change.
- A dark mode for the page. The owner chose light charts on the light page.
- Any change to the worker or to the JSON the page reads.
- The new app.

## Anti-goals

- A cursor stuck on a far-away point: oil at 03:00 must not light up the dollar's 08:00 open.
- Breaking the page when a chart is missing. The oil chart is hidden when Yahoo fails, and either chart can
  be absent while the other is hovered.

## Approaches to the link between the charts

1. **Listen on the two containers and look the other chart up by time (chosen).** A pointer move over one
   container reads the hovered time from that chart's axis, finds the other chart's nearest point within
   10 minutes, and asks it to draw its tooltip and crosshair there. The listeners sit on the containers,
   which always exist; the charts are looked up when the event fires.
2. **Highcharts' "synchronized charts" recipe as published.** Rejected as is: it maps the pointer's pixel
   position onto every chart, which only lines up when all charts share one time range. The dollar covers
   five hours and oil about eighteen.
3. **A shared time range for both charts.** Rejected: the dollar's five hours would be a sliver.

## Design

- **Theme.** The page's `body` gets Highcharts' `highcharts-light` class, which forces light charts
  whatever the system prefers.
- **Time.** The dollar chart names its zone, `America/Bogota`, as the oil chart already does. In
  production both charts' timestamps are real instants (the dollar's first point on 2026-11-23 is
  13:00:14 UTC), so nothing needs converting. Both axes format hours and minutes as `HH:MM`.
- **Opening price.** The first price of the day's series, exactly as SET-ICAP takes it; the page's series
  is ICAP's own chart series. The price becomes an area whose threshold is that price, with two zones: red
  below, the chart's price colour above. A dotted plot line marks the level. The subtitle says what the
  dotted line and the red are, with the value, so no label sits on the plot.
- **On refresh.** The page refreshes every 10 seconds; the level is applied again whenever the first
  price changes (a page left open into the next day), not on every refresh.
- **Legend.** Both charts drop the floating box for Highcharts' default legend under the plot.
- **Texts.** `Hora (Colombia)`, `Precio (COP)`, `Monto (miles USD)`, and the source as
  `dolar.set-icap.com`.
- **Link.** As in approach 1, both ways, with crosshairs enabled on both time axes. Leaving a chart hides
  the other's tooltip and crosshair. The 10-minute limit and the nearest-point search are the new app's
  rule.
- **Helpers.** The two pieces of logic that are not Highcharts calls (nearest point in time, opening price
  of a series) live in a small script the page loads before its main one, written so Node can require it
  too. They are the first part of this page with tests.

## Testing

- Unit tests for the helpers under the legacy `npm test`.
- In a browser against live data, with the system in dark mode: light charts, hours from 08:00, legend
  under the plot, red below the opening price with the dotted line, both directions of the link, no link
  outside the dollar's hours, and the page still working when the oil chart is hidden.
- There is no preview environment for this app. The owner sees screenshots of the local page before the
  pull request is merged, and production is checked right after the deploy.

## Added while building

- **The price's green is set explicitly** (`#16a34a`). The plan was to keep "the chart's own price colour",
  but that colour is Highcharts' second palette entry, which is green only in the dark theme; in the light
  theme the owner chose it is indigo.
- **The oil chart's price axis takes its series' blue.** It was written to use the dollar's price colour.
- **The oil tooltip's time reads `HH:MM`,** like the dollar's, instead of "Monday, Nov 23, 10:00 AM".
- **The "Fork me on GitHub" ribbon is drawn in CSS.** The owner noticed it broken mid-way: the image it
  loaded from GitHub's old S3 bucket answers 403. Its link also pointed at the owner's previous user name.

## Calls made while writing this

- Green above the opening price here (the new app keeps its gold): green over red is what the reference
  shows, and this chart's price was already green for most readers.
- The opening price is named in the subtitle rather than on the plot line.
- The volume columns stay, drawn fainter so the price reads first.
