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

    // Try today's records first, fall back to the most recent available date
    let records = await dolarCollection
      .find({ date: today })
      .sort({ timestamp: 1 })
      .toArray();

    let dataDate = today;

    if (records.length === 0) {
      // Find the most recent record to determine the last available date
      const lastRecord = await dolarCollection.findOne({}, { sort: { timestamp: -1 } });
      if (lastRecord) {
        dataDate = lastRecord.date;
        records = await dolarCollection
          .find({ date: dataDate })
          .sort({ timestamp: 1 })
          .toArray();
      }
    }

    if (records.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: "No intraday data available",
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

    return NextResponse.json(
      { success: true, data, dataDate },
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
