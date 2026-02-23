import { NextResponse } from 'next/server';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb';
import { CurrentStats, ApiResponse } from '@/types';

/**
 * GET /api/stats/current
 * Returns the most recent exchange rate statistics
 */
export async function GET() {
  try {
    const db = await getDatabase();
    const dolarCollection = db.collection(COLLECTIONS.DOLAR_DATA);
    const trmCollection = db.collection(COLLECTIONS.TRM_DATA);

    // Get today's date in Colombia timezone
    const nowUTC = new Date();
    const colombiaTime = new Date(
      nowUTC.toLocaleString('en-US', { timeZone: 'America/Bogota' })
    );
    const today = colombiaTime.toISOString().split('T')[0];

    // Get yesterday's date for comparison
    const yesterday = new Date(colombiaTime);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = yesterday.toISOString().split('T')[0];

    // Try today first, then fall back to the most recent available record
    const [todayRecord, trmRecord] = await Promise.all([
      dolarCollection.findOne({ date: today }, { sort: { timestamp: -1 } }),
      trmCollection.findOne({ date: today }),
    ]);

    let latestRecord = todayRecord;
    let dataDate = today;
    let activeTrm = trmRecord;
    let comparisonRecord = await dolarCollection.findOne({ date: yesterdayDate }, { sort: { timestamp: -1 } });

    if (!latestRecord) {
      // Find the most recent record regardless of date
      latestRecord = await dolarCollection.findOne({}, { sort: { timestamp: -1 } });

      if (!latestRecord) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: 'No data available' },
          { status: 404 }
        );
      }

      dataDate = latestRecord.date;

      // For comparison, fetch the most recent record from a prior date
      comparisonRecord = await dolarCollection.findOne(
        { date: { $lt: dataDate } },
        { sort: { timestamp: -1 } }
      );

      // TRM for the last available date (yesterday query may already cover it)
      if (!activeTrm) {
        activeTrm = await trmCollection.findOne({ date: dataDate });
      }
    }

    // Calculate change indicators
    const calculateChange = (current: number, previous: number | undefined): 'up' | 'down' | 'equal' => {
      if (!previous) return 'equal';
      if (current > previous) return 'up';
      if (current < previous) return 'down';
      return 'equal';
    };

    const stats: CurrentStats = {
      trm: activeTrm?.value || latestRecord.price,
      trmPriceChange: activeTrm?.change || "equal",
      price: latestRecord.price,
      openPrice: latestRecord.openPrice,
      minPrice: latestRecord.minPrice,
      maxPrice: latestRecord.maxPrice,
      avgPrice: latestRecord.avgPrice,
      maxPriceChange: calculateChange(latestRecord.maxPrice, comparisonRecord?.maxPrice),
      minPriceChange: calculateChange(latestRecord.minPrice, comparisonRecord?.minPrice),
      openPriceChange: calculateChange(latestRecord.openPrice, comparisonRecord?.openPrice),
      totalAmount: latestRecord.volume,
      latestAmount: latestRecord.volume,
      avgAmount: latestRecord.volume / (latestRecord.transactions || 1),
      minAmount: 0,
      maxAmount: 0,
      transactions: latestRecord.transactions,
    };

    return NextResponse.json(
      { success: true, data: stats, dataDate },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=20',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching current stats:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
