import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb';
import {
  fetchAllCurrentStats,
} from '@/lib/services/icapService';
import { DolarData, TRMData } from '@/types';

/**
 * POST /api/cron/collect-data
 *
 * This endpoint collects data from ICAP and stores it in MongoDB.
 * Market hours: 8:00 AM - 1:00 PM COT (Colombia Time)
 * Data is stored in UTC timezone in MongoDB.
 *
 * For local development, you can trigger it manually:
 *   curl -X POST http://localhost:3000/api/cron/collect-data \
 *     -H "Authorization: Bearer your-secret-token"
 *
 * For Azure deployment, use Azure Functions Timer Trigger or Logic Apps.
 */
export async function POST(request: NextRequest) {
  try {
    // Simple authentication (use a proper solution in production)
    const authHeader = request.headers.get("authorization");
    const expectedAuth = `Bearer ${process.env.CRON_SECRET || "dev-secret-token"}`;

    if (authHeader !== expectedAuth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Get current time in UTC
    const nowUTC = new Date();

    // Get Colombia time string for display (COT = UTC-5)
    const colombiaTimeStr = nowUTC.toLocaleString("en-US", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    // Parse Colombia time for hour check
    const colombiaDate = new Date(
      nowUTC.toLocaleString("en-US", { timeZone: "America/Bogota" }),
    );
    const hour = colombiaDate.getHours();
    const minute = colombiaDate.getMinutes();

    // Check if it's during market hours (8 AM - 1.30 PM COT)
    if (hour < 8 || (hour === 13 && minute > 30) || hour > 13) {
      return NextResponse.json({
        success: true,
        message:
          "Outside market hours (8 AM - 1:30 PM COT), skipping data collection",
        timestamp: nowUTC.toISOString(),
        colombiaTime: colombiaTimeStr,
      });
    }

    // Format date in Colombia timezone for ICAP API (YYYY-MM-DD)
    const dateFormatted = colombiaDate.toLocaleDateString("en-CA"); // en-CA gives YYYY-MM-DD format

    // Fetch current stats from ICAP
    const stats = await fetchAllCurrentStats(dateFormatted);

    // Get database connection
    const db = await getDatabase();
    const dolarCollection = db.collection<DolarData>(COLLECTIONS.DOLAR_DATA);
    const trmCollection = db.collection<TRMData>(COLLECTIONS.TRM_DATA);

    // Fetch both queries in parallel before any conditional inserts
    const [lastRecord, existingTRM] = await Promise.all([
      dolarCollection.findOne({ date: dateFormatted }, { sort: { timestamp: -1 } }),
      trmCollection.findOne({ date: dateFormatted }),
    ]);

    // Convert time stats.time from 12-hour format (COT) to UTC
    // ICAP API returns time in 12-hour format without AM/PM indicator
    // Market hours are 8 AM - 1:30 PM COT, so:
    // - Hours 08-12 are AM (8:00-12:59)
    // - Hours 01 are PM (13:00-13:59) since market closes at 1:30 PM
    const [statsHoursStr, statsMinutes, statsSeconds = "0"] =
      stats.time.split(":");
    let statsHours = parseInt(statsHoursStr, 10);

    // If hour is 1-7, it must be PM (add 12 to convert to 24-hour format)
    // This handles 01:00:00 -> 13:00:00 (1 PM)
    if (statsHours >= 1 && statsHours < 8) {
      statsHours += 12;
    }

    const statsDateUTC = new Date(
      Date.UTC(
        nowUTC.getUTCFullYear(),
        nowUTC.getUTCMonth(),
        nowUTC.getUTCDate(),
        statsHours + 5, // Convert COT (UTC-5) to UTC
        parseInt(statsMinutes, 10),
        parseInt(statsSeconds, 10),
      ),
    );
    stats.time = statsDateUTC.toISOString().split("T")[1].split(".")[0]; // Update to UTC time

    // Compare critical fields to detect if data changed
    const dataChanged =
      !lastRecord ||
      lastRecord.time !== stats.time ||
      lastRecord.price !== stats.price ||
      lastRecord.amount !== stats.amount ||
      lastRecord.openPrice !== stats.openPrice ||
      lastRecord.minPrice !== stats.minPrice ||
      lastRecord.maxPrice !== stats.maxPrice ||
      lastRecord.avgPrice !== stats.avgPrice ||
      lastRecord.transactions !== stats.transactions;

    let inserted = false;

    if (dataChanged) {
      // Prepare dolar data document (stored in UTC)
      const dolarData: DolarData = {
        timestamp: nowUTC, // UTC timestamp
        date: dateFormatted, // Date in Colombia timezone for grouping
        time: stats.time, // Time in UTC
        price: stats.price,
        amount: stats.amount,
        openPrice: stats.openPrice,
        minPrice: stats.minPrice,
        maxPrice: stats.maxPrice,
        avgPrice: stats.avgPrice,
        volume: stats.totalAmount,
        transactions: stats.transactions,
        metadata: {
          source: "ICAP",
          marketId: 71,
          delay: 15,
        },
      };

      // Insert only when data changed
      await dolarCollection.insertOne(dolarData);
      inserted = true;
    }

    // Check if we need to update TRM for today
    if (!existingTRM) {
      // Insert new TRM record (stored in UTC)
      const trmData: TRMData = {
        date: dateFormatted,
        value: stats.trm,
        change: stats.trmPriceChange,
        source: "ICAP",
        createdAt: nowUTC, // UTC timestamp
      };

      // Get yesterday's TRM to calculate previousValue (in Colombia timezone)
      const yesterday = new Date(colombiaDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayFormatted = yesterday.toLocaleDateString("en-CA"); // en-CA gives YYYY-MM-DD format
      const yesterdayTRM = await trmCollection.findOne({
        date: yesterdayFormatted,
      });

      if (yesterdayTRM) {
        trmData.previousValue = yesterdayTRM.value;
      }

      await trmCollection.insertOne(trmData);
    } else if (existingTRM.value !== stats.trm) {
      // Update TRM if it changed (rare, but possible)
      await trmCollection.updateOne(
        { date: dateFormatted },
        {
          $set: {
            value: stats.trm,
            change: stats.trmPriceChange,
            createdAt: nowUTC,
          },
        },
      );
    }

    return NextResponse.json({
      success: true,
      message: inserted
        ? "Data collected and stored (data changed)"
        : "Data collected but not stored (no changes detected)",
      inserted,
      dataChanged,
      timestamp: nowUTC.toISOString(),
      colombiaTime: colombiaTimeStr,
      data: {
        date: dateFormatted,
        time: stats.time,
        price: stats.price,
        trm: stats.trm,
        volume: stats.totalAmount,
        transactions: stats.transactions,
      },
    });
  } catch (error) {
    console.error("Error in data collection cron:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/cron/collect-data (for testing only)
 * Returns the current status without collecting data
 */
export async function GET() {
  const nowUTC = new Date();
  const colombiaTimeStr = nowUTC.toLocaleString("en-US", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const colombiaDate = new Date(
    nowUTC.toLocaleString("en-US", { timeZone: "America/Bogota" }),
  );
  const hour = colombiaDate.getHours();

  return NextResponse.json({
    status: "ok",
    message: "Data collection endpoint is active",
    marketHours: "8:00 AM - 1:00 PM COT (Colombia Time)",
    currentTime: nowUTC.toISOString(),
    colombiaTime: colombiaTimeStr,
    colombiaHour: hour,
    isMarketHours: hour >= 8 && hour < 13,
    instructions: "Send POST request with Authorization header to collect data",
  });
}
