# Hovering one chart shows the same moment on the other — design

Date: 2026-11-23

## Why

The new dashboard now stacks two charts: the dollar's intraday chart and, under it, the Brent oil chart. The
point of having oil there is to read it against the dollar. Today that means moving the cursor over one
chart, reading the time, and finding that time by eye on the other.

## Goals

- Hovering either chart shows the other chart's cursor line and tooltip at the point nearest in time.
- Each tooltip shows the time of its own point.

## Non-goals

- The legacy app. Its dollar chart builds its times on the server as wall-clock values, not real instants,
  so lining it up with oil needs a correction of its own.
- A shared time axis. The dollar trades 8:00 to 13:00 and Brent almost around the clock; the two charts
  keep their own axes.
- Zoom or brush synchronisation.

## Anti-goals

- A cursor stuck on a far-away point. Moving over oil at 03:00 must not light up the dollar's 08:00 open
  as if the two belonged together.

## Approaches

1. **Recharts' chart synchronisation with a custom function (chosen).** Charts that share a `syncId` pass
   their hover to each other, and `syncMethod` accepts a function that picks which point the receiving
   chart activates. The function picks the nearest in time. The receiving chart shows its own tooltip.
2. **`syncMethod="value"`.** Rejected: it needs the same x value on both charts, and the dollar's ticks
   (irregular, every few seconds) never equal oil's (every 5 minutes).
3. **Hover state lifted into the dashboard, drawn with reference lines.** Rejected: more code, and the
   other chart would show a line but not its tooltip.

## Design

- Both charts get the same `syncId` and the same `syncMethod` function.
- The function takes the hovered point's timestamp from the emitting chart and returns the receiving
  chart's point nearest to it, or nothing when the nearest one is more than 10 minutes away. Nothing means
  the receiving chart shows no cursor. Both charts already use real epoch timestamps on their x axis
  (checked on production data: the dollar's run 13:00 to 18:00 UTC), so no conversion is needed.
- The search is a small pure function in `lib/utils`, tested on its own: nearest point, the 10-minute
  limit, a tie, an empty chart, and a timestamp that is not a number.
- Both tooltips read the time from their own point instead of the label Recharts passes, which during a
  synchronised hover can be the other chart's.

## Testing

- Unit tests for the search function under `npm test`.
- In a browser: hovering the dollar chart moves oil's cursor to within 5 minutes of the same time, hovering
  oil inside the dollar's hours moves the dollar's cursor, and hovering oil outside them leaves the dollar
  chart without a cursor. Then the same on the pull request's preview, with production data.

## Calls made while writing this

- 10 minutes as the limit. Oil has a point every 5 minutes, so a dollar hover always finds one; the limit
  only bites outside the dollar's trading hours and across gaps.
- It goes into the open pull request (#39), since it is part of reading oil against the dollar.
