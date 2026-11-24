import { NextResponse } from 'next/server';
import { getCachedBrentOil } from '@/lib/services/oilService';
import { ApiResponse, BrentOilData } from '@/types';

// Never prerender: the build must not call Yahoo.
export const dynamic = 'force-dynamic';

/**
 * GET /api/oil/brent
 * Today's Brent session: price, previous close, 5-minute points and the sharp
 * moves with the headline published closest to each. The service keeps the
 * answer for a minute, failures included.
 */
export async function GET() {
  try {
    return NextResponse.json<ApiResponse<BrentOilData>>({ success: true, data: await getCachedBrentOil() });
  } catch (error) {
    console.error('Error fetching Brent oil data:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Brent oil data unavailable' },
      { status: 502 },
    );
  }
}
