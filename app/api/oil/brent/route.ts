import { NextResponse } from 'next/server';
import { getBrentOil } from '@/lib/services/oilService';
import { ApiResponse, BrentOilData } from '@/types';

// Never prerender: the build must not call Yahoo.
export const dynamic = 'force-dynamic';

const CACHE_MS = 60_000;

// However many dashboards are open, Yahoo gets one request a minute.
// shortcut: per-instance memory cache, move to a shared cache if the app ever runs on several instances
let cached: { at: number; data: BrentOilData } | undefined;

/**
 * GET /api/oil/brent
 * Today's Brent session: price, previous close, 5-minute points and the sharp
 * moves with the headline published closest to each.
 */
export async function GET() {
  try {
    if (!cached || Date.now() - cached.at > CACHE_MS) {
      cached = { at: Date.now(), data: await getBrentOil() };
    }

    return NextResponse.json<ApiResponse<BrentOilData>>({ success: true, data: cached.data });
  } catch (error) {
    console.error('Error fetching Brent oil data:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Brent oil data unavailable' },
      { status: 502 },
    );
  }
}
