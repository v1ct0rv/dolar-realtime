import axios from 'axios';
import type { BrentOilData, OilHeadline, OilMove } from '../../types';

// Yahoo Finance's chart endpoint for the Brent future: today's session in 5-minute
// points. Unofficial, and it answers 429 unless the request looks like a browser.
export const CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart/BZ=F?interval=5m&range=1d';

// Google News search as RSS: the last day's Brent headlines, in Spanish.
export const NEWS_URL =
  'https://news.google.com/rss/search?q=petr%C3%B3leo+brent+when:1d&hl=es-419&gl=CO&ceid=CO:es-419';

// A move is a change of MOVE_THRESHOLD_PCT or more against the price one window
// earlier. Calibrated on 2026-11-23, a day Brent fell 3.6 %: these give 5 markers.
const MOVE_WINDOW_MS = 30 * 60_000;
// The price a point is compared with may be this much older at most. The futures stop
// for an hour every day, and a change across that break is not a 30-minute move; 45
// minutes still allows for the few points Yahoo leaves out inside a session.
const MAX_REFERENCE_AGE_MS = 45 * 60_000;
const MOVE_THRESHOLD_PCT = 0.75;
const MAX_MOVES = 5;
const HEADLINE_RANGE_MS = 60 * 60_000;

// The search also returns articles that only mention Brent in passing (a stock
// market wrap, say). A headline counts when its title names oil.
// Whole words, so "Brentford" does not count, and checked once the outlet's name
// is off the title, so an outlet called "Crudo ..." does not either.
const OIL_TITLE = /\b(?:petr[oó]leos?|brent|crudos?|wti|opep)\b/i;

const REQUEST = { timeout: 10_000, maxContentLength: 2 * 1024 * 1024 };

const round2 = (n: number) => Math.round(n * 100) / 100;

interface YahooChartResult {
  meta?: { regularMarketPrice?: unknown; chartPreviousClose?: unknown };
  timestamp?: number[];
  indicators?: { quote?: { close?: (number | null)[] }[] };
}

/** Read Yahoo's chart answer into the current price, the previous close and the day's points. */
export function parseChart(payload: unknown): Omit<BrentOilData, 'moves'> {
  const result = (payload as { chart?: { result?: YahooChartResult[] | null } })?.chart?.result?.[0];
  const price = result?.meta?.regularMarketPrice;
  const previousClose = result?.meta?.chartPreviousClose;
  if (typeof price !== 'number' || typeof previousClose !== 'number') {
    throw new Error('Yahoo returned no Brent chart');
  }

  // Before the session's first trade there is no timestamp list at all.
  const closes = result?.indicators?.quote?.[0]?.close ?? [];
  const points: [number, number][] = [];
  (result?.timestamp ?? []).forEach((seconds, i) => {
    const close = closes[i];
    if (typeof close === 'number') points.push([seconds * 1000, round2(close)]);
  });
  points.sort((a, b) => a[0] - b[0]);

  return { price: round2(price), previousClose: round2(previousClose), points };
}

/** The text of the first `<name>` element in `xml`, or '' when there is none. */
function tag(xml: string, name: string): string {
  const open = xml.indexOf(`<${name}`);
  const start = xml.indexOf('>', open) + 1;
  const end = xml.indexOf(`</${name}>`, start);
  return open < 0 || start === 0 || end < 0 ? '' : xml.slice(start, end).trim();
}

// `&amp;` goes last, so `&amp;lt;` decodes to the text `&lt;` and not to `<`.
/** A numeric entity as its character, or as it was written when the number is not a character. */
const fromCodePoint = (entity: string, code: number) =>
  code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : entity;

const decode = (text: string) =>
  text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (entity, digits) => fromCodePoint(entity, Number(digits)))
    .replace(/&#x([0-9a-f]+);/gi, (entity, hex) => fromCodePoint(entity, parseInt(hex, 16)))
    .replace(/&amp;/g, '&');

/**
 * Read the headlines out of the RSS feed. Plain string search rather than an XML
 * parser: the feed is flat, and anything that is not a feed just yields [].
 */
export function parseNews(xml: string): OilHeadline[] {
  const headlines: OilHeadline[] = [];

  for (const chunk of xml.split('<item>').slice(1)) {
    const item = chunk.split('</item>')[0];
    const url = decode(tag(item, 'link'));
    const source = decode(tag(item, 'source'));
    const publishedAt = Date.parse(tag(item, 'pubDate'));
    let title = decode(tag(item, 'title'));

    // Google appends the outlet to every title. It comes off before the title is
    // judged: the outlet's name says nothing about the article.
    if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3));

    // The link ends up in an href, so only https is let through.
    if (!OIL_TITLE.test(title) || !url.startsWith('https://') || Number.isNaN(publishedAt)) continue;

    headlines.push({ title, url, source, publishedAt });
  }

  return headlines;
}

/** The sharpest moves of the day, in time order. `points` must be sorted by time. */
export function detectMoves(points: [number, number][]): OilMove[] {
  const candidates: { timestamp: number; price: number; change: number }[] = [];

  let older = 0; // the latest point at least one window older than point i
  for (let i = 0; i < points.length; i++) {
    const [timestamp, price] = points[i];
    while (older + 1 < i && points[older + 1][0] <= timestamp - MOVE_WINDOW_MS) older++;

    const [olderTime, olderPrice] = points[older];
    if (olderTime > timestamp - MOVE_WINDOW_MS || olderPrice <= 0) continue;
    if (olderTime < timestamp - MAX_REFERENCE_AGE_MS) continue; // across a gap

    const change = ((price - olderPrice) / olderPrice) * 100;
    if (Math.abs(change) >= MOVE_THRESHOLD_PCT) candidates.push({ timestamp, price, change });
  }

  // Strongest first. A sharp move stays over the threshold for several points in a
  // row; the spacing keeps one of them (the sort is stable, so the earliest of a tie).
  const kept: typeof candidates = [];
  for (const candidate of candidates.sort((a, b) => Math.abs(b.change) - Math.abs(a.change))) {
    if (kept.length === MAX_MOVES) break;
    if (kept.every((k) => Math.abs(k.timestamp - candidate.timestamp) >= MOVE_WINDOW_MS)) kept.push(candidate);
  }

  return kept
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(({ timestamp, price, change }) => ({ timestamp, price, changePercent: round2(change) }));
}

/**
 * Give each move the headline published closest to it, within an hour either side.
 * The strongest move chooses first and a headline is used once. Nearest in time is
 * all this claims: the headline may have nothing to do with the move.
 */
export function attachHeadlines(moves: OilMove[], headlines: OilHeadline[]): OilMove[] {
  const unused = [...headlines];
  const chosen = new Map<OilMove, OilHeadline>();

  for (const move of [...moves].sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))) {
    const gap = (headline: OilHeadline) => Math.abs(headline.publishedAt - move.timestamp);
    let nearest = -1;
    unused.forEach((headline, i) => {
      if (gap(headline) <= HEADLINE_RANGE_MS && (nearest < 0 || gap(headline) < gap(unused[nearest]))) nearest = i;
    });
    if (nearest >= 0) chosen.set(move, unused.splice(nearest, 1)[0]);
  }

  return moves.map((move) => {
    const headline = chosen.get(move);
    return headline ? { ...move, headline } : move;
  });
}

/** Today's Brent session with its sharp moves. Rejects when the price cannot be read. */
export async function getBrentOil(): Promise<BrentOilData> {
  const [chart, news] = await Promise.all([
    axios.get(CHART_URL, { ...REQUEST, headers: { 'User-Agent': 'Mozilla/5.0' } }),
    // The headlines are an extra: without them the chart still shows its moves.
    axios.get(NEWS_URL, { ...REQUEST, responseType: 'text' }).catch((error) => {
      console.warn('Brent headlines unavailable:', error instanceof Error ? error.message : error);
      return null;
    }),
  ]);

  const data = parseChart(chart.data);
  const headlines = news ? parseNews(String(news.data)) : [];

  return { ...data, moves: attachHeadlines(detectMoves(data.points), headlines) };
}

const CACHE_MS = 60_000;
let cached: { at: number; result: Promise<BrentOilData> } | undefined;

/**
 * getBrentOil, asked at most once a minute however many dashboards are open. The
 * promise is what is kept: callers arriving while a request is in flight share
 * it, and a failure is remembered for the minute too, so a Yahoo that is
 * refusing us is not asked again by every poll.
 */
// shortcut: per-instance memory cache, move to a shared cache if the app ever runs on several instances
export function getCachedBrentOil(now: number = Date.now()): Promise<BrentOilData> {
  if (!cached || now - cached.at > CACHE_MS) cached = { at: now, result: getBrentOil() };
  return cached.result;
}
