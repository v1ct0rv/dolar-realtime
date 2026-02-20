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

    // Get the most recent record for today
    const latestRecord = await dolarCollection.findOne(
      { date: today },
      { sort: { timestamp: -1 } }
    );

    if (!latestRecord) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'No data available for today',
        },
        { status: 404 }
      );
    }

    // Get today's TRM
    const trmRecord = await trmCollection.findOne({ date: today });

    // Get yesterday's record for comparison
    const yesterday = new Date(colombiaTime);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = yesterday.toISOString().split('T')[0];

    const yesterdayRecord = await dolarCollection.findOne(
      { date: yesterdayDate },
      { sort: { timestamp: -1 } }
    );

    // Calculate change indicators
    const calculateChange = (current: number, previous: number | undefined): 'up' | 'down' | 'equal' => {
      if (!previous) return 'equal';
      if (current > previous) return 'up';
      if (current < previous) return 'down';
      return 'equal';
    };

    const stats: CurrentStats = {
      trm: trmRecord?.value || latestRecord.price,
      trmPriceChange: trmRecord?.change || "equal",
      price: latestRecord.price,
      openPrice: latestRecord.openPrice,
      minPrice: latestRecord.minPrice,
      maxPrice: latestRecord.maxPrice,
      avgPrice: latestRecord.avgPrice,
      maxPriceChange: calculateChange(
        latestRecord.maxPrice,
        yesterdayRecord?.maxPrice,
      ),
      minPriceChange: calculateChange(
        latestRecord.minPrice,
        yesterdayRecord?.minPrice,
      ),
      openPriceChange: calculateChange(
        latestRecord.openPrice,
        yesterdayRecord?.openPrice,
      ),
      totalAmount: latestRecord.volume,
      latestAmount: latestRecord.volume,
      avgAmount: latestRecord.volume / (latestRecord.transactions || 1),
      minAmount: 0, // Not tracked individually
      maxAmount: 0, // Not tracked individually
      transactions: latestRecord.transactions,
    };

    return NextResponse.json<ApiResponse<CurrentStats>>(
      {
        success: true,
        data: stats,
      },
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
