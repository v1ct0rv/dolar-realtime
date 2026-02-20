#!/usr/bin/env node

/**
 * Backfill Historical TRM Data from CSV
 *
 * This script reads the historic_trm.csv file and imports all TRM data into MongoDB.
 * It calculates the day-over-day change for each entry.
 *
 * Usage:
 *   node scripts/backfill-trm.js
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env or .env.local file if it exists
require('dotenv').config({ path: path.join(process.cwd(), '.env') });
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'dolar-realtime';

async function parseTRMCSV(filePath) {
  console.log('📄 Reading CSV file...');

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split('\n');

  // Skip header (line 0) and empty lines
  const dataLines = lines.slice(1).filter(line => line.trim());

  console.log(`📊 Found ${dataLines.length} TRM records`);

  const records = [];
  let previousValue = undefined;

  for (const line of dataLines) {
    // Parse CSV line: "1991/11/27",693.32
    const match = line.match(/"([^"]+)",([0-9.]+)/);

    if (!match) {
      console.warn(`⚠️  Skipping invalid line: ${line}`);
      continue;
    }

    const [, dateStr, valueStr] = match;
    const value = parseFloat(valueStr);

    // Convert date from YYYY/MM/DD to YYYY-MM-DD
    const date = dateStr.replace(/\//g, '-');

    // Calculate change
    let change = 'equal';
    if (previousValue !== undefined) {
      if (value > previousValue) {
        change = 'up';
      } else if (value < previousValue) {
        change = 'down';
      }
    }

    const record = {
      date,
      value,
      change,
      previousValue,
      source: 'Historic CSV Import',
      createdAt: new Date(date),
    };

    records.push(record);
    previousValue = value;
  }

  return records;
}

async function backfillTRM() {
  console.log('🚀 Starting TRM backfill process...\n');

  // Check if CSV file exists
  const csvPath = path.join(process.cwd(), 'data', 'historic_trm.csv');

  if (!fs.existsSync(csvPath)) {
    console.error('❌ Error: historic_trm.csv not found at:', csvPath);
    console.error('   Make sure the file exists in the data/ directory');
    process.exit(1);
  }

  // Parse CSV
  let records;
  try {
    records = await parseTRMCSV(csvPath);
  } catch (error) {
    console.error('❌ Error parsing CSV:', error);
    process.exit(1);
  }

  if (records.length === 0) {
    console.error('❌ No records found in CSV file');
    process.exit(1);
  }

  console.log(`\n✅ Parsed ${records.length} records`);
  console.log(`   Date range: ${records[0].date} to ${records[records.length - 1].date}\n`);

  // Connect to MongoDB
  console.log('🔌 Connecting to MongoDB...');
  const safeURI = MONGODB_URI.replace(/:[^:@]+@/, ':****@');
  console.log(`   URI: ${safeURI}`);
  console.log(`   Database: ${MONGODB_DB_NAME}\n`);

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(MONGODB_DB_NAME);
    const collection = db.collection('trmData');

    // Check if collection already has data
    const existingCount = await collection.countDocuments();
    console.log(`📊 Existing TRM records in database: ${existingCount}`);

    if (existingCount > 0) {
      console.log('\n⚠️  WARNING: trmData collection already contains data!');
      console.log('   Options:');
      console.log('   1. Press Ctrl+C to cancel');
      console.log('   2. Wait 5 seconds to continue (will skip duplicates)\n');

      // Wait 5 seconds
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Upsert records in batches (insert if new date, skip if already exists)
    const BATCH_SIZE = 1000;
    let inserted = 0;
    let skipped = 0;

    console.log('💾 Upserting records into MongoDB...\n');

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);

      const ops = batch.map((record) => ({
        updateOne: {
          filter: { date: record.date },
          update: { $setOnInsert: record },
          upsert: true,
        },
      }));

      const result = await collection.bulkWrite(ops, { ordered: false });
      inserted += result.upsertedCount;
      skipped += result.matchedCount;

      // Progress update
      const progress = Math.min(i + BATCH_SIZE, records.length);
      const percentage = ((progress / records.length) * 100).toFixed(1);
      process.stdout.write(`   Progress: ${progress}/${records.length} (${percentage}%) - Inserted: ${inserted}, Skipped: ${skipped}\r`);
    }

    console.log('\n');

    // Create indexes
    console.log('🔍 Creating indexes...');
    try {
      await collection.createIndex({ date: -1 }, { unique: true });
    } catch (indexErr) {
      if (indexErr.code === 11000) {
        console.warn('⚠️  Could not create unique index on date: duplicate values exist in the collection.');
        console.warn('   Run node scripts/remove-duplicates.js first, then re-run this script.\n');
      } else {
        throw indexErr;
      }
    }
    await collection.createIndex({ createdAt: -1 });
    console.log('✅ Indexes created\n');

    // Summary statistics
    const finalCount = await collection.countDocuments();
    const oldestRecord = await collection.findOne({}, { sort: { date: 1 } });
    const newestRecord = await collection.findOne({}, { sort: { date: -1 } });

    console.log('='.repeat(60));
    console.log('📊 BACKFILL SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully inserted: ${inserted} records`);
    console.log(`⏭️  Skipped (duplicates):  ${skipped} records`);
    console.log(`📈 Total records in DB:   ${finalCount} records`);
    console.log(`📅 Date range:           ${oldestRecord?.date} to ${newestRecord?.date}`);
    console.log(`💵 Latest TRM value:     $${newestRecord?.value.toFixed(2)}`);
    console.log('='.repeat(60));
    console.log('\n✨ Backfill completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Error during backfill:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the backfill
backfillTRM().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
