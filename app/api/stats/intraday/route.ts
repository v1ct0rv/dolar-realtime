import { NextResponse } from 'next/server';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb';
import { IntradayData, ApiResponse } from '@/types';

/**
 * GET /api/stats/intraday
 * Returns intraday chart data (price and volume time series for today)
 */
export async function GET() {
  try {
    const db = await getDatabase();
    const dolarCollection = db.collection(COLLECTIONS.DOLAR_DATA);

    // Get today's date in Colombia timezone
    const nowUTC = new Date();
    const colombiaTime = new Date(
      nowUTC.toLocaleString("en-US", { timeZone: "America/Bogota" }),
    );
    const today = colombiaTime.toISOString().split("T")[0];

    // Get all records for today, sorted by timestamp
    const records = await dolarCollection
      .find({ date: today })
      .sort({ timestamp: 1 })
      .toArray();

    if (records.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: "No intraday data available for today",
        },
        { status: 404 },
      );
    }

    // Transform to time series format [datetime, value]
    // record.time is in UTC, so we append 'Z' to create proper UTC timestamp
    // The browser will then automatically convert to the user's local timezone
    const precio: [number, number][] = records.map((record) => [
      new Date(`${record.date}T${record.time}Z`).getTime(),
      record.price,
    ]);

    const monto: [number, number][] = records.map((record) => [
      new Date(`${record.date}T${record.time}Z`).getTime(),
      record.amount,
    ]);

    const data: IntradayData = {
      precio,
      monto,
    };

    return NextResponse.json<ApiResponse<IntradayData>>(
      {
        success: true,
        data,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20",
        },
      },
    );
  } catch (error) {
    console.error('Error fetching intraday data:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
