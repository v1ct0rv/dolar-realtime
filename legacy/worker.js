const axios = require('axios');



// ICAP's public snapshot: one unauthenticated response carrying what used to be
// four endpoints, as messages keyed by id. It always describes the current day.
const SNAPSHOT_URL =
  "https://proxy.set-icap.com/api/v1/ws/public/delay/snapshot?market=71";

// Fetches the snapshot and returns a lookup of its messages by id.
async function fetchSnapshot() {
  const response = await axios.get(SNAPSHOT_URL);
  const messages = response.data.messages || [];

  return function (id) {
    const message = messages.find((m) => m.id === id);
    if (!message) throw new Error("ICAP snapshot has no message " + id);
    return message;
  };
}

// Brent oil: today's 5-minute prices from Yahoo Finance and the day's headlines
// from Google News. Same sources and rule as the new app's
// lib/services/oilService.ts; this app is deployed on its own, so it carries a
// copy. Both apps' tests assert the same moves on the shared calibration day.

// Unofficial, and it answers 429 unless the request looks like a browser.
const OIL_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/BZ=F?interval=5m&range=1d";
const OIL_NEWS_URL =
  "https://news.google.com/rss/search?q=petr%C3%B3leo+brent+when:1d&hl=es-419&gl=CO&ceid=CO:es-419";

// A move is a change of OIL_MOVE_THRESHOLD_PCT or more against the price one window earlier.
const OIL_MOVE_WINDOW_MS = 30 * 60000;
// The price a point is compared with may be this much older at most. The futures stop
// for an hour every day, and a change across that break is not a 30-minute move; 45
// minutes still allows for the few points Yahoo leaves out inside a session.
const OIL_MAX_REFERENCE_AGE_MS = 45 * 60000;
const OIL_MOVE_THRESHOLD_PCT = 0.75;
const OIL_MAX_MOVES = 5;
const OIL_HEADLINE_RANGE_MS = 60 * 60000;

// The search also returns articles that only mention Brent in passing.
// Whole words, so "Brentford" does not count, and checked once the outlet's name
// is off the title, so an outlet called "Crudo ..." does not either.
const OIL_TITLE = /\b(?:petr[oó]leos?|brent|crudos?|wti|opep)\b/i;

const OIL_REQUEST = { timeout: 10000, maxContentLength: 2 * 1024 * 1024 };

function round2(n) {
  return Math.round(n * 100) / 100;
}

// Yahoo's chart answer as { price, previousClose, points: [[ms, price]] }.
function parseOilChart(payload) {
  const result = payload && payload.chart && payload.chart.result && payload.chart.result[0];
  const meta = (result && result.meta) || {};
  if (typeof meta.regularMarketPrice !== "number" || typeof meta.chartPreviousClose !== "number") {
    throw new Error("Yahoo returned no Brent chart");
  }

  // Before the session's first trade there is no timestamp list at all.
  const quote = (result.indicators && result.indicators.quote && result.indicators.quote[0]) || {};
  const closes = quote.close || [];
  const points = [];
  (result.timestamp || []).forEach(function (seconds, i) {
    if (typeof closes[i] === "number") points.push([seconds * 1000, round2(closes[i])]);
  });
  // Sorted, or Highcharts raises error 15.
  points.sort((a, b) => a[0] - b[0]);

  return { price: round2(meta.regularMarketPrice), previousClose: round2(meta.chartPreviousClose), points };
}

// The text of the first <name> element in xml, or "" when there is none.
function xmlTag(xml, name) {
  const open = xml.indexOf("<" + name);
  const start = xml.indexOf(">", open) + 1;
  const end = xml.indexOf("</" + name + ">", start);
  return open < 0 || start === 0 || end < 0 ? "" : xml.slice(start, end).trim();
}

// &amp; goes last, so &amp;lt; decodes to the text &lt; and not to <.
// A numeric entity as its character, or as it was written when the number is not a character.
function fromCodePoint(entity, code) {
  const valid = code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff);
  return valid ? String.fromCodePoint(code) : entity;
}

function decodeEntities(text) {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (entity, digits) => fromCodePoint(entity, Number(digits)))
    .replace(/&#x([0-9a-f]+);/gi, (entity, hex) => fromCodePoint(entity, parseInt(hex, 16)))
    .replace(/&amp;/g, "&");
}

// The feed's oil headlines as [{ title, url, source, publishedAt }]. Anything that is not a feed yields [].
function parseOilNews(xml) {
  const headlines = [];

  xml.split("<item>").slice(1).forEach(function (chunk) {
    const item = chunk.split("</item>")[0];
    const url = decodeEntities(xmlTag(item, "link"));
    const source = decodeEntities(xmlTag(item, "source"));
    const publishedAt = Date.parse(xmlTag(item, "pubDate"));
    let title = decodeEntities(xmlTag(item, "title"));

    // Google appends the outlet to every title. It comes off before the title is
    // judged: the outlet's name says nothing about the article.
    if (source && title.endsWith(" - " + source)) title = title.slice(0, -(source.length + 3));

    // The link ends up in an href, so only https is let through.
    if (!OIL_TITLE.test(title) || !url.startsWith("https://") || Number.isNaN(publishedAt)) return;

    headlines.push({ title, url, source, publishedAt });
  });

  return headlines;
}

// The sharpest moves of the day as [{ timestamp, price, changePercent }], in time order.
function detectOilMoves(points) {
  const candidates = [];

  let older = 0; // the latest point at least one window older than point i
  for (let i = 0; i < points.length; i++) {
    const timestamp = points[i][0];
    const price = points[i][1];
    while (older + 1 < i && points[older + 1][0] <= timestamp - OIL_MOVE_WINDOW_MS) older++;

    const olderTime = points[older][0];
    const olderPrice = points[older][1];
    if (olderTime > timestamp - OIL_MOVE_WINDOW_MS || olderPrice <= 0) continue;
    if (olderTime < timestamp - OIL_MAX_REFERENCE_AGE_MS) continue; // across a gap

    const change = ((price - olderPrice) / olderPrice) * 100;
    if (Math.abs(change) >= OIL_MOVE_THRESHOLD_PCT) candidates.push({ timestamp, price, change });
  }

  // Strongest first. A sharp move stays over the threshold for several points in a
  // row; the spacing keeps one of them (the sort is stable, so the earliest of a tie).
  const kept = [];
  candidates.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  for (const candidate of candidates) {
    if (kept.length === OIL_MAX_MOVES) break;
    if (kept.every((k) => Math.abs(k.timestamp - candidate.timestamp) >= OIL_MOVE_WINDOW_MS)) kept.push(candidate);
  }

  return kept
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((move) => ({ timestamp: move.timestamp, price: move.price, changePercent: round2(move.change) }));
}

// Gives each move the headline published closest to it, within an hour either side.
// The strongest move chooses first and a headline is used once.
function attachOilHeadlines(moves, headlines) {
  const unused = headlines.slice();
  const strongestFirst = moves.slice().sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));

  strongestFirst.forEach(function (move) {
    const gap = (headline) => Math.abs(headline.publishedAt - move.timestamp);
    let nearest = -1;
    unused.forEach(function (headline, i) {
      if (gap(headline) <= OIL_HEADLINE_RANGE_MS && (nearest < 0 || gap(headline) < gap(unused[nearest]))) nearest = i;
    });
    if (nearest >= 0) move.headline = unused.splice(nearest, 1)[0];
  });

  return moves;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// A move as a Highcharts flag. The page renders `text` as HTML, and the headline
// comes from a third-party feed, so everything from it is escaped.
function oilFlag(move) {
  const up = move.changePercent > 0;
  const arrow = up ? "▲" : "▼";
  let text = "<b>" + arrow + " " + (up ? "+" : "") + move.changePercent.toFixed(2) + "% en 30 min</b>";

  if (move.headline) {
    text +=
      '<br><a href="' + escapeHtml(move.headline.url) + '" target="_blank" rel="noopener noreferrer">' +
      escapeHtml(move.headline.title) + "</a> — " + escapeHtml(move.headline.source);
  }

  return { x: move.timestamp, title: arrow, text };
}

var worker = {
  data: {
    oilStats: {},
    stats: {},
    allStats: {},
  },

  updateBrentOil: async function () {
    var timerTitle = "Updating BrentOil";
    console.time(timerTitle);

    try {
      const [chart, news] = await Promise.all([
        axios.get(OIL_CHART_URL, { ...OIL_REQUEST, headers: { "User-Agent": "Mozilla/5.0" } }),
        // The headlines are an extra: without them the chart still shows its moves.
        axios.get(OIL_NEWS_URL, { ...OIL_REQUEST, responseType: "text" }).catch(function (error) {
          console.warn("Brent headlines unavailable: " + error.message);
          return null;
        }),
      ]);

      const oil = parseOilChart(chart.data);
      const headlines = news ? parseOilNews(String(news.data)) : [];
      const moves = attachOilHeadlines(detectOilMoves(oil.points), headlines);

      // The shape public/javascripts/index.js reads (it was investing.com's).
      worker.data.oilStats = {
        attr: { last_value: oil.price, last_close_value: oil.previousClose },
        candles: oil.points,
        events: { news: moves.map(oilFlag) },
      };
    } catch (error) {
      // Emptied, not kept: the page hides the section rather than show an old price as current.
      worker.data.oilStats = {};
      console.error("Error on request: " + OIL_CHART_URL);
      console.error(error);
    }

    console.timeEnd(timerTitle);
  },

  updateStats: async function () {
    var timerTitle = "Updating Stats";
    console.time(timerTitle);

    try {
      const message = await fetchSnapshot();
      const precioMercado = message(1006).data;
      const promedioCierre = message(1007).data;
      const montoMercado = message(1005).data;

      var data = {};
      // Fill Data
      data.trm = precioMercado.trm;
      data.trmPriceChange = precioMercado.trmchange.toLowerCase();
      data.maxPrice = precioMercado.high;
      data.maxPriceChange = precioMercado.highchange.toLowerCase();
      data.minPrice = precioMercado.low;
      data.minPriceChange = precioMercado.lowchange.toLowerCase();
      data.openPrice = precioMercado.open;
      data.openPriceChange = precioMercado.openchange.toLowerCase();

      data.price = promedioCierre.close;
      data.avgPrice = promedioCierre.avg;

      data.totalAmmount = montoMercado.sum;
      data.latestAmmount = montoMercado.open;
      data.avgAmmount = montoMercado.avg;
      data.minAmmount = montoMercado.low;
      data.maxAmmount = montoMercado.high;
      data.transactions = montoMercado.count;

      worker.data.stats = data;
    } catch (error) {
      console.error("Error on request: " + SNAPSHOT_URL);
      console.error(error);
    }

    // request.post(url, function(error, response, html) {
    //   if (!error) {
    //     try {
    //       var json = JSON.parse(html);

    //       var data = json.data;

    //       // Backwards compatibility changes
    //       data.trmPriceChange = data.trmchange.toLowerCase()
    //       data.maxPrice = data.high;
    //       data.maxPriceChange = data.highchange.toLowerCase()
    //       data.minPrice = data.low;
    //       data.minPriceChange = data.lowchange.toLowerCase()
    //       data.openPrice = data.open;
    //       data.openPriceChange = data.openchange.toLowerCase()

    //       worker.data.stats = data;
    //     } catch (error) {
    //       console.error('Error on request: ' + url + ', error trying to parse: ' + html);
    //       console.error(error);
    //     }
    //   } else {
    //     console.error("Error on request: " + url + "Error: " + error);
    //   }
    // });
    console.timeEnd(timerTitle);
  },

  updateAllStats: async function () {
    var timerTitle = "Updating All Stats";
    console.time(timerTitle);
    try {
      const message = await fetchSnapshot();

      var data = { monto: [], precio: [] };
      var json = message(1000);

      var correctJson = json.result[0].datos_grafico_moneda_mercado
        .replace(/'/g, '"')
        .replace(/\d{2}:\d{2}(:\d{2})*/gi, function (e) {
          return '"' + e + '"';
        })
        .replace(/data:/g, '"data":')
        .replace(/label:/g, '"label":')
        .replace(/type:/g, '"type":')
        .replace(/labels:/g, '"labels":')
        .replace(/datasets:/g, '"datasets":');
      var remoteData = JSON.parse("{" + correctJson + "}").data;

      data.precio = remoteData.datasets[0].data.map((precio, index) => [
        getDateFromHours(remoteData.labels[index]).getTime(),
        precio,
      ]);
      data.monto = remoteData.datasets[1].data.map((monto, index) => [
        getDateFromHours(remoteData.labels[index]).getTime(),
        monto,
      ]);

      worker.data.allStats = data;
    } catch (error) {
      console.error("Error on request: " + SNAPSHOT_URL);
      console.error(error);
    }
    console.timeEnd(timerTitle);
  },
};


function getDateFromHours(time) {
    time = time.split(':');
    let now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), ...time);
}

module.exports = worker;
