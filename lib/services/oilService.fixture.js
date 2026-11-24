// Brent sessions for the oil tests, as Yahoo's chart endpoint answers them, plus
// a Google News feed. CommonJS so the legacy app's tests can require it too.

// 2026-11-23 05:00:00 UTC, in epoch seconds as Yahoo sends them. Both sessions
// start here and have one point every 5 minutes.
const T0 = Date.UTC(2026, 10, 23, 5, 0, 0) / 1000;

const chartOf = (close, meta) => ({
  chart: {
    result: [{ meta, timestamp: close.map((_, i) => T0 + i * 300), indicators: { quote: [{ close }] } }],
    error: null,
  },
});

// Hand-built: flat at 90, a 1 % drop at 05:50 and a 1 % rebound at 06:45 (UTC).
const close = [
  ...Array(7).fill(90.00390625), // a float, as Yahoo sends them; reads as 90
  null, // Yahoo leaves gaps
  89.9,
  89.6,
  ...Array(11).fill(89.1),
  90,
  90,
];

// The real session of 2026-11-23, the day the rule's numbers were calibrated on
// (closes rounded to cents). Brent fell 3.6 %; the rule marks 5 moves.
const calibrationClose = [
  90.05, 90.04, 89.99, 89.93, 90.09, 90.12, 90.29, 90.2, 90.39, 90.31, 90.2, 90.31, 89.97, 89.85, 89.79,
  89.99, 89.91, 89.99, 89.84, 89.83, 89.85, 89.75, 89.72, 89.78, 89.53, 89.53, 89.58, 89.55, 89.38, 89.52,
  89.41, 89.53, 89.42, 89.53, 89.55, 89.53, 89.67, 89.71, 89.56, 89.45, 89.47, 89.23, 89.2, 89.34, 89.51,
  89.32, 89.25, 89.22, 89.05, 89.39, 89.44, 89.29, 89.2, 89.35, 89.38, 89.35, 89.35, 89.66, 89.51, 89.41,
  89.31, 89.36, 89.2, 89.31, 89.27, 89.25, 89.27, 89.15, 89.13, 88.83, 88.72, 88.75, 88.59, 88.58, 88.37,
  88.33, 88.45, 88.41, 88.29, 88.3, 88.33, 88.39, 88.62, 88.72, 88.77, 88.84, 88.83, 88.65, 88.59, 88.73,
  88.56, 88.51, 88.56, 88.52, 88.65, 88.71, 88.7, 88.51, 88.52, 88.29, 88.19, 88.04, 88, 87.97, 87.89, 87.54,
  86.99, 87.94, 88.25, 88.09, 88.1, 88.19, 88.2, 88.31, 88.17, 88.03, 88.08, 87.97, 88, 87.75, 87.34, 86.96,
  86.93, 86.67, 86.94, 86.96, 87.02, 86.78, 86.84, 86.54, 86.25, 86.41, 86.32, 86.42, 86.32, 86.36, 86.42,
  86.58, 86.73, 86.69, 86.88, 86.89, 86.81, 86.83, 87.07, 87.27, 87.24, 87.3, 87.28, 87.32, 87.28, 87.23,
  87.3, 87.33, 87.4, 87.35, 87.29, 87.48, 87.38, 87.43, 87.37, 87.41, 87.4, 87.42, 87.35, 87.17, 87.16, 87.18,
  87.05, 87.09, 86.9, 86.76, 86.64, 86.65, 86.62, 86.63, 86.47, 86.53, 86.51, 86.5, 86.49, 86.46, 86.39, null,
  86.48, 86.41, 86.54, 86.52, 86.63, 86.56, 86.53, 86.63, 86.67, 86.68, 86.68, 86.7, 86.69, 86.73, 86.76,
  86.75, 86.77, 86.81, 86.84, 86.72, 86.72,
];

const item = (title, link, pubDate, source) =>
  `<item><title>${title}</title><link>${link}</link>` +
  `<pubDate>${pubDate}</pubDate><source url="https://example.com">${source}</source></item>`;

// Written around the hand-built session's two moves.
const news =
  '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>feed</title>' +
  item(
    'El Brent cae 1% por temor a exceso de oferta - Portafolio',
    'https://news.google.com/rss/articles/A?oc=5',
    'Mon, 23 Nov 2026 05:58:00 GMT',
    'Portafolio'
  ) +
  // Markup, and entities of every kind the feed can carry.
  item(
    'Petróleo &amp; gas: &lt;b&gt;rebote&lt;/b&gt; del crudo &#8212; l&apos;OPEP &#x2019;sube&#x2019; - La República',
    'https://news.google.com/rss/articles/B?oc=5',
    'Mon, 23 Nov 2026 06:40:00 GMT',
    'La República'
  ) +
  // Right at the drop, and only the outlet's name mentions oil: must be dropped.
  item(
    'El Ibex 35 abre al alza - Crudo Transparente',
    'https://news.google.com/rss/articles/H?oc=5',
    'Mon, 23 Nov 2026 05:52:00 GMT',
    'Crudo Transparente'
  ) +
  // Right at the drop too, and "Brent" is only the start of another word: must be dropped.
  item(
    'Brentford gana en casa - Deportes',
    'https://news.google.com/rss/articles/I?oc=5',
    'Mon, 23 Nov 2026 05:53:00 GMT',
    'Deportes'
  ) +
  // Closest to the drop, but not https: must be dropped.
  item('Enlace inseguro - Inseguro', 'http://example.com/x', 'Mon, 23 Nov 2026 05:50:00 GMT', 'Inseguro') +
  // Next closest to the drop, but not about oil: the search also returns articles that only mention Brent.
  item(
    'El Ibex 35 abre al alza - Bolsa',
    'https://news.google.com/rss/articles/G?oc=5',
    'Mon, 23 Nov 2026 05:51:00 GMT',
    'Bolsa'
  ) +
  // More than an hour from either move.
  item(
    'WTI - Brent: balance del día - Lejano',
    'https://news.google.com/rss/articles/E?oc=5',
    'Mon, 23 Nov 2026 09:30:00 GMT',
    'Lejano'
  ) +
  item('Sin fecha - Roto', 'https://news.google.com/rss/articles/F?oc=5', 'no es una fecha', 'Roto') +
  '</channel></rss>';

module.exports = {
  T0,
  chart: chartOf(close, { symbol: 'BZ=F', regularMarketPrice: 90, chartPreviousClose: 91.5 }),
  calibration: chartOf(calibrationClose, { symbol: 'BZ=F', regularMarketPrice: 86.72, chartPreviousClose: 89.95 }),
  news,
};
