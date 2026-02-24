#!/usr/bin/env tsx
/**
 * Backfill dolarData from the ICAP chart endpoint.
 *
 * For each business day in the given range, fetches the full intraday
 * price series via fetchIntradayChartData and inserts records that don't
 * already exist in MongoDB (dedup by date + time in UTC).
 *
 * Usage:
 *   npm run backfill-dolar <startDate> [endDate]
 *
 * Examples:
 *   npm run backfill-dolar 2025-01-15               # single day
 *   npm run backfill-dolar 2025-01-01 2025-03-31   # date range
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import { MongoClient } from 'mongodb';

// Load .env then let .env.local override (mirrors Next.js env loading order)
const root = resolve(__dirname, '..');
dotenv.config({ path: resolve(root, '.env') });
dotenv.config({ path: resolve(root, '.env.local'), override: true });

import { fetchIntradayChartData, type ICAPIntradayPoint } from '../lib/services/icapService';

const MONGODB_URI = process.env.MONGODB_URI     || 'mongodb://localhost:27017';
const DB_NAME     = process.env.MONGODB_DB_NAME || 'dolar-realtime';

// ─── Data transformation ──────────────────────────────────────────────────────

/**
 * Converts a COT time label (HH:MM:SS) on a Colombia date (YYYY-MM-DD)
 * to a UTC Date and UTC time string.
 * COT = UTC-5, so UTC = COT + 5h.
 */
function cotToUTC(colombiaDate: string, cotTimeStr: string) {
  const [h, m, s = '0'] = cotTimeStr.split(':').map(Number);
  const [year, month, day] = colombiaDate.split('-').map(Number);
  const timestamp  = new Date(Date.UTC(year, month - 1, day, h + 5, m, Number(s)));
  const utcTimeStr = timestamp.toISOString().split('T')[1].split('.')[0];
  return { timestamp, utcTimeStr };
}

/**
 * Maps ICAPIntradayPoint[] to dolarData-shaped MongoDB documents.
 */
function buildDolarRecords(colombiaDate: string, points: ICAPIntradayPoint[]) {
  return points.map((point) => {
    const { timestamp, utcTimeStr } = cotToUTC(colombiaDate, point.cotTime);
    return {
      timestamp,
      date:         colombiaDate,
      time:         utcTimeStr,
      price:        point.price,
      amount:       point.amount,
      openPrice:    point.openPrice,
      minPrice:     point.minPrice,
      maxPrice:     point.maxPrice,
      avgPrice:     point.avgPrice,
      volume:       point.volume,
      transactions: point.transactions,
      metadata:     { source: 'ICAP', marketId: 71, delay: 15 },
    };
  });
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Returns all business days (Mon–Fri) between startDate and endDate inclusive. */
function getBusinessDays(startDate: string, endDate: string): string[] {
  const dates:   string[] = [];
  const current = new Date(startDate + 'T12:00:00Z');
  const end     = new Date(endDate   + 'T12:00:00Z');

  while (current <= end) {
    const dow = current.getUTCDay();
    if (dow !== 0 && dow !== 6) {
      dates.push(current.toISOString().split('T')[0]);
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const [startDate, endDate = startDate] = process.argv.slice(2);

  if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    console.error('Usage: npm run backfill-dolar <startDate> [endDate]');
    console.error('Dates must be in YYYY-MM-DD format.');
    console.error('Example: npm run backfill-dolar 2025-01-01 2025-03-31');
    process.exit(1);
  }

  const dates = getBusinessDays(startDate, endDate);

  console.log('');
  console.log('  Dólar Realtime — Backfill dolarData');
  console.log('  ─────────────────────────────────────────');
  console.log(`  Range  : ${startDate} → ${endDate}`);
  console.log(`  Days   : ${dates.length} business day(s)`);
  console.log('  ─────────────────────────────────────────');
  console.log('');

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const collection = client.db(DB_NAME).collection('dolarData');

  let totalInserted = 0;
  let totalSkipped  = 0;
  let totalFailed   = 0;

  for (const date of dates) {
    process.stdout.write(`  ${date}  fetching...`);

    try {
      const points = await fetchIntradayChartData(date);

      if (points.length === 0) {
        console.log('  no data (holiday or market closed)');
        continue;
      }

      const records = buildDolarRecords(date, points);

      // Load all existing UTC time strings for this date in one query
      const existing     = await collection.find({ date }, { projection: { time: 1, _id: 0 } }).toArray();
      const existingKeys = new Set(existing.map((r) => r.time));

      const newRecords = records.filter((r) => !existingKeys.has(r.time));
      const skipped    = records.length - newRecords.length;

      if (newRecords.length === 0) {
        console.log(`  skipped (all ${records.length} already exist)`);
        totalSkipped += skipped;
        continue;
      }

      await collection.insertMany(newRecords, { ordered: false });

      process.stdout.write(
        `\r  ${date}  ✓ inserted ${newRecords.length}` +
        (skipped > 0 ? `, skipped ${skipped}` : '') +
        '\n'
      );
      totalInserted += newRecords.length;
      totalSkipped  += skipped;

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      process.stdout.write(`\r  ${date}  ✗ ${message}\n`);
      totalFailed++;
    }

    // Small delay between days to avoid hammering ICAP
    await new Promise((r) => setTimeout(r, 400));
  }

  console.log('');
  console.log('  ─────────────────────────────────────────');
  console.log(`  Inserted : ${totalInserted}`);
  console.log(`  Skipped  : ${totalSkipped}`);
  console.log(`  Failed   : ${totalFailed}`);
  console.log('  ─────────────────────────────────────────');
  console.log('');

  await client.close();
}

main().catch((err) => {
  console.error('\nFatal error:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
