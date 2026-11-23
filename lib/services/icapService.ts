import axios from 'axios';
import { COLOMBIA_TIMEZONE } from '../utils/timezone';

// ICAP's public snapshot: one unauthenticated response carrying what used to be
// four endpoints, as messages keyed by id. It always describes the current day.
const ICAP_SNAPSHOT_URL =
  'https://proxy.set-icap.com/api/v1/ws/public/delay/snapshot?market=71';

const MESSAGE = { chart: 1000, volume: 1005, price: 1006, averageClose: 1007 } as const;

interface ICAPSnapshotMessage {
  id: number;
  data?: unknown;
  result?: unknown;
}

/** YYYY-MM-DD in Colombia time, whatever the machine's timezone. */
function colombiaDate(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: COLOMBIA_TIMEZONE });
}

/**
 * Fetch the snapshot and return a lookup of its messages by id.
 */
async function fetchSnapshot(): Promise<(id: number) => ICAPSnapshotMessage> {
  const response = await axios.get(ICAP_SNAPSHOT_URL);

  // The request carries no date. A snapshot ICAP has not refreshed today still holds a
  // previous day's figures, and they would be stored under today's date.
  const updatedAt = response.data?.updated_at;
  if (updatedAt && colombiaDate(new Date(updatedAt)) !== colombiaDate(new Date())) {
    throw new Error(`ICAP snapshot was last updated ${updatedAt}, not today`);
  }

  const messages: ICAPSnapshotMessage[] = response.data?.messages ?? [];

  return (id) => {
    const message = messages.find((m) => m.id === id);
    if (!message) throw new Error(`ICAP snapshot has no message ${id}`);
    return message;
  };
}

export interface ICAPPriceMarketData {
  trm: string | number;
  trmchange: string;
  high: string | number;
  highchange: string;
  low: string | number;
  lowchange: string;
  open: string | number;
  openchange: string;
}

export interface ICAPAverageCloseData {
  avg: string | number;
  close: string | number;
  time: string;
}

export interface ICAPVolumeMarketData {
  close: string | number;
  sum: string | number;
  avg: string | number;
  high: string | number;
  low: string | number;
  count: string | number;
  open: string | number;
}

/**
 * Parse numeric value from ICAP API (removes commas and converts to number)
 */
function parseNumeric(value: string | number): number {
  if (typeof value === 'number') return value;
  return parseFloat(value.replace(/,/g, ''));
}

/**
 * A single transaction data point parsed from the ICAP chart endpoint.
 * All accumulated fields (minPrice, maxPrice, avgPrice, volume, transactions)
 * reflect the running state up to and including this data point, matching
 * the shape stored by the collect-data cron into dolarData.
 */
export interface ICAPIntradayPoint {
  cotTime: string;      // Original label time HH:MM:SS in COT (America/Bogota)
  price: number;        // Closing price of this transaction
  amount: number;       // Amount of this transaction in USD (labels are in miles USD × 1000)
  openPrice: number;    // Opening price of the day (first price in the series)
  minPrice: number;     // Running accumulated minimum up to this point
  maxPrice: number;     // Running accumulated maximum up to this point
  avgPrice: number;     // Running accumulated average up to this point
  volume: number;       // Running accumulated volume in USD up to this point
  transactions: number; // Count of transactions including this one (1-indexed)
}

/**
 * Fetch and parse intraday chart data from ICAP.
 * Returns one ICAPIntradayPoint per transaction label, with all fields
 * derived and accumulated so each point can be directly mapped to DolarData.
 *
 * Amount labels from ICAP are "Montos (Miles USD)" — multiplied by 1000 here.
 * Times in cotTime are in Colombia time (COT, UTC-5).
 *
 * Only the current day (Colombia time) is available; any other date rejects.
 */
export async function fetchIntradayChartData(date: string): Promise<ICAPIntradayPoint[]> {
  // The snapshot takes no date: asking for another day would return today's ticks under the wrong date.
  const today = colombiaDate(new Date());
  if (date !== today) {
    throw new Error(`ICAP only serves the current day (${today}); cannot fetch ${date}`);
  }

  try {
    const message = await fetchSnapshot();
    const chart = message(MESSAGE.chart).result as { datos_grafico_moneda_mercado: string }[];

    const rawData = chart[0].datos_grafico_moneda_mercado;

    const correctJson = rawData
      .replace(/'/g, '"')
      .replace(/\d{2}:\d{2}(:\d{2})*/gi, (match: string) => `"${match}"`)
      .replace(/data:/g, '"data":')
      .replace(/label:/g, '"label":')
      .replace(/type:/g, '"type":')
      .replace(/labels:/g, '"labels":')
      .replace(/datasets:/g, '"datasets":');

    const parsed = JSON.parse(`{${correctJson}}`).data as {
      labels: string[];
      datasets: Array<{ label: string; data: number[] }>;
    };

    const prices      = parsed.datasets[0].data; // "Precios de cierre"
    const mileAmounts = parsed.datasets[1].data; // "Montos (Miles USD)"
    const labels      = parsed.labels;           // HH:MM:SS in COT

    if (prices.length !== labels.length || prices.length !== mileAmounts.length) {
      throw new Error('ICAP chart data arrays have mismatched lengths');
    }

    const openPrice = prices[0];
    let runningMin    = prices[0];
    let runningMax    = prices[0];
    let runningSum    = 0;
    let runningVolume = 0;

    return prices.map((price, i) => {
      runningMin     = Math.min(runningMin, price);
      runningMax     = Math.max(runningMax, price);
      runningSum    += price;
      runningVolume += mileAmounts[i] * 1000;

      return {
        cotTime:      labels[i],
        price,
        amount:       mileAmounts[i] * 1000,
        openPrice,
        minPrice:     runningMin,
        maxPrice:     runningMax,
        avgPrice:     runningSum / (i + 1),
        volume:       runningVolume,
        transactions: i + 1,
      };
    });
  } catch (error) {
    console.error('Error fetching intraday chart data:', error);
    throw new Error('Failed to fetch intraday chart data from ICAP');
  }
}

/**
 * Fetch all current statistics (price, average/close and volume messages)
 */
export async function fetchAllCurrentStats() {
  try {
    const message = await fetchSnapshot();
    const priceMarket = message(MESSAGE.price).data as ICAPPriceMarketData;
    const averageClose = message(MESSAGE.averageClose).data as ICAPAverageCloseData;
    const volumeMarket = message(MESSAGE.volume).data as ICAPVolumeMarketData;

    return {
      trm: parseNumeric(priceMarket.trm),
      trmPriceChange: priceMarket.trmchange.toLowerCase() as
        | "up"
        | "down"
        | "equal",
      maxPrice: parseNumeric(priceMarket.high),
      maxPriceChange: priceMarket.highchange.toLowerCase() as
        | "up"
        | "down"
        | "equal",
      minPrice: parseNumeric(priceMarket.low),
      minPriceChange: priceMarket.lowchange.toLowerCase() as
        | "up"
        | "down"
        | "equal",
      openPrice: parseNumeric(priceMarket.open),
      openPriceChange: priceMarket.openchange.toLowerCase() as
        | "up"
        | "down"
        | "equal",
      time: averageClose.time,
      price: parseNumeric(averageClose.close),
      amount: parseNumeric(volumeMarket.close),
      avgPrice: parseNumeric(averageClose.avg),
      totalAmount: parseNumeric(volumeMarket.sum),
      latestAmount: parseNumeric(volumeMarket.open),
      avgAmount: parseNumeric(volumeMarket.avg),
      minAmount: parseNumeric(volumeMarket.low),
      maxAmount: parseNumeric(volumeMarket.high),
      transactions: parseNumeric(volumeMarket.count),
    };
  } catch (error) {
    console.error('Error fetching all current stats:', error);
    throw error;
  }
}

/**
 * Helper function to convert time string to Date object for today
 */
export function getDateFromTimeString(timeString: string): Date {
  const [hours, minutes, seconds = '0'] = timeString.split(':');
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    parseInt(hours),
    parseInt(minutes),
    parseInt(seconds)
  );
}
