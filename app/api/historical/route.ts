import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb';
import { getHistoricalDailyPipeline } from '@/lib/aggregations';
import { HistoricalReport, HistoricalDayData, ApiResponse } from '@/types';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/historical
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
 * Returns daily OHLC, volume and TRM data for the requested range.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'startDate y endDate son requeridos (formato: YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    if (!DATE_REGEX.test(startDate) || !DATE_REGEX.test(endDate)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Formato de fecha inválido. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    if (startDate > endDate) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'startDate debe ser anterior a endDate' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const dolarCollection = db.collection(COLLECTIONS.DOLAR_DATA);

    const raw = await dolarCollection
      .aggregate(getHistoricalDailyPipeline(startDate, endDate))
      .toArray();

    if (raw.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'No hay datos para el rango seleccionado' },
        { status: 404 }
      );
    }

    const dailyData = raw as HistoricalDayData[];

    const closes = dailyData.map((d) => d.close);
    const summary = {
      minPrice: Math.min(...dailyData.map((d) => d.low)),
      maxPrice: Math.max(...dailyData.map((d) => d.high)),
      avgPrice: closes.reduce((a, b) => a + b, 0) / closes.length,
      firstOpen: dailyData[0].open,
      lastClose: dailyData[dailyData.length - 1].close,
      priceChange: dailyData[dailyData.length - 1].close - dailyData[0].open,
      priceChangePercent:
        ((dailyData[dailyData.length - 1].close - dailyData[0].open) / dailyData[0].open) * 100,
      totalVolume: dailyData.reduce((a, d) => a + d.volume, 0),
      tradingDays: dailyData.length,
    };

    const report: HistoricalReport = {
      dateRange: { start: startDate, end: endDate },
      summary,
      dailyData,
    };

    return NextResponse.json<ApiResponse<HistoricalReport>>(
      { success: true, data: report },
      {
        status: 200,
        headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
      }
    );
  } catch (error) {
    console.error('Error fetching historical data:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
