import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb';
import { TRMHistoryReport, TRMHistoryDayData, TRMHistorySummary, ApiResponse } from '@/types';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/reports/trm-history
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
 * Returns daily TRM values with change direction and deltas.
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
    const trmCollection = db.collection(COLLECTIONS.TRM_DATA);

    // Fetch one record before startDate to compute delta for the first day
    const [records, prevRecord] = await Promise.all([
      trmCollection
        .find({ date: { $gte: startDate, $lte: endDate } })
        .sort({ date: 1 })
        .toArray(),
      trmCollection
        .findOne({ date: { $lt: startDate } }, { sort: { date: -1 } }),
    ]);

    if (records.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'No hay datos TRM para el rango seleccionado' },
        { status: 404 }
      );
    }

    let prevValue: number | null = prevRecord ? (prevRecord.value as number) : null;

    const dailyData: TRMHistoryDayData[] = records.map((r) => {
      const value = r.value as number;
      const delta = prevValue !== null ? value - prevValue : null;
      const deltaPercent = prevValue !== null && prevValue > 0
        ? ((value - prevValue) / prevValue) * 100
        : null;
      const change = (r.change as string) as 'up' | 'down' | 'equal';

      const day: TRMHistoryDayData = {
        date: r.date as string,
        value,
        change,
        previousValue: prevValue,
        delta,
        deltaPercent,
      };

      prevValue = value;
      return day;
    });

    const values = dailyData.map((d) => d.value);
    const summary: TRMHistorySummary = {
      firstValue: dailyData[0].value,
      lastValue: dailyData[dailyData.length - 1].value,
      minValue: Math.min(...values),
      maxValue: Math.max(...values),
      avgValue: values.reduce((a, b) => a + b, 0) / values.length,
      totalChange: dailyData[dailyData.length - 1].value - dailyData[0].value,
      totalChangePercent:
        ((dailyData[dailyData.length - 1].value - dailyData[0].value) / dailyData[0].value) * 100,
      daysUp: dailyData.filter((d) => d.change === 'up').length,
      daysDown: dailyData.filter((d) => d.change === 'down').length,
      daysEqual: dailyData.filter((d) => d.change === 'equal').length,
      tradingDays: dailyData.length,
    };

    const report: TRMHistoryReport = {
      dateRange: { start: startDate, end: endDate },
      summary,
      dailyData,
    };

    return NextResponse.json<ApiResponse<TRMHistoryReport>>(
      { success: true, data: report },
      {
        status: 200,
        headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
      }
    );
  } catch (error) {
    console.error('Error fetching TRM history:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
