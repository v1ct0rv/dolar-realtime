import axios from 'axios';

const ICAP_BASE_URL = process.env.ICAP_API_BASE_URL || 'https://proxy.icap.com.co/seticap/api';
const ICAP_TOKEN = process.env.ICAP_API_TOKEN || '';

const headers = {
  Authorization: ICAP_TOKEN,
  'Content-Type': 'application/json',
};

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

export interface ICAPChartData {
  labels: string[]; // Time labels like "09:00", "09:15", etc.
  datasets: Array<{
    label: string;
    data: number[];
  }>;
}

/**
 * Fetch price market statistics (TRM, high, low, open)
 */
export async function fetchPriceMarketStats(date: string): Promise<ICAPPriceMarketData> {
  try {
    const response = await axios.post(
      `${ICAP_BASE_URL}/estadisticas/estadisticasPrecioMercado/`,
      {
        fecha: date,
        mercado: 71,
        delay: 15,
      },
      { headers }
    );

    return response.data.data;
  } catch (error) {
    console.error('Error fetching price market stats:', error);
    throw new Error('Failed to fetch price market statistics from ICAP');
  }
}

/**
 * Fetch average and closing price statistics
 */
export async function fetchAverageCloseStats(date: string): Promise<ICAPAverageCloseData> {
  try {
    const response = await axios.post(
      `${ICAP_BASE_URL}/estadisticas/estadisticasPromedioCierre/`,
      {
        fecha: date,
        mercado: 71,
        delay: 15,
      },
      { headers }
    );

    return response.data.data;
  } catch (error) {
    console.error('Error fetching average/close stats:', error);
    throw new Error('Failed to fetch average/close statistics from ICAP');
  }
}

/**
 * Fetch volume market statistics
 */
export async function fetchVolumeMarketStats(date: string): Promise<ICAPVolumeMarketData> {
  try {
    const response = await axios.post(
      `${ICAP_BASE_URL}/estadisticas/estadisticasMontoMercado/`,
      {
        fecha: date,
        mercado: 71,
        delay: 15,
      },
      { headers }
    );

    return response.data.data;
  } catch (error) {
    console.error('Error fetching volume market stats:', error);
    throw new Error('Failed to fetch volume market statistics from ICAP');
  }
}

/**
 * Fetch intraday chart data
 */
export async function fetchIntradayChartData(date: string): Promise<ICAPChartData> {
  try {
    const response = await axios.post(
      `${ICAP_BASE_URL}/graficos/graficoMoneda/`,
      {
        fecha: date,
        moneda: 1,
        delay: '15',
      },
      { headers }
    );

    // Parse the malformed JSON from ICAP
    const rawData = response.data.result[0].datos_grafico_moneda_mercado;

    // Transform the data using regex replacements (same logic as legacy app)
    const correctJson = rawData
      .replace(/'/g, '"')
      .replace(/\d{2}:\d{2}(:\d{2})*/gi, (match: string) => `"${match}"`)
      .replace(/data:/g, '"data":')
      .replace(/label:/g, '"label":')
      .replace(/type:/g, '"type":')
      .replace(/labels:/g, '"labels":')
      .replace(/datasets:/g, '"datasets":');

    const parsedData = JSON.parse(`{${correctJson}}`);

    return parsedData.data;
  } catch (error) {
    console.error('Error fetching intraday chart data:', error);
    throw new Error('Failed to fetch intraday chart data from ICAP');
  }
}

/**
 * Fetch all current statistics (combines all endpoints)
 */
export async function fetchAllCurrentStats(date: string) {
  try {
    const [priceMarket, averageClose, volumeMarket] = await Promise.all([
      fetchPriceMarketStats(date),
      fetchAverageCloseStats(date),
      fetchVolumeMarketStats(date),
    ]);

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
