#!/usr/bin/env node

/**
 * Remove Duplicate Records from dolarData Collection
 *
 * This script removes duplicate records that have identical data but different timestamps.
 * It keeps only the first occurrence of each unique data set per day.
 *
 * Usage:
 *   node scripts/remove-duplicates.js
 *   or
 *   npm run remove-duplicates
 */

const { MongoClient } = require('mongodb');
const path = require('path');

// Load environment variables from .env or .env.local file if it exists
require('dotenv').config({ path: path.join(process.cwd(), '.env') });
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });


// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'dolar-realtime';

// Accept collection name as CLI arg: node remove-duplicates.js [collectionName]
const COLLECTION_NAME = process.argv[2] || 'dolarData';

async function removeDuplicates() {
  console.log('🧹 Starting duplicate removal process...\n');
  console.log(`📁 Target collection: ${COLLECTION_NAME}\n`);

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
    const collection = db.collection(COLLECTION_NAME);

    // Get initial count
    const initialCount = await collection.countDocuments();
    console.log(`📊 Initial record count: ${initialCount}\n`);

    // Aggregate to find duplicates
    console.log('🔍 Finding duplicate records...');

    // trmData deduplicates by date only; dolarData by full price snapshot
    const groupId = COLLECTION_NAME === 'trmData'
      ? { date: '$date' }
      : {
          date: '$date',
          price: '$price',
          openPrice: '$openPrice',
          minPrice: '$minPrice',
          maxPrice: '$maxPrice',
          avgPrice: '$avgPrice',
          volume: '$volume',
          transactions: '$transactions',
        };

    const pipeline = [
      {
        $sort: { createdAt: 1 },
      },
      {
        $group: {
          _id: groupId,
          docs: { $push: '$$ROOT' },
          count: { $sum: 1 },
        },
      },
      {
        $match: {
          count: { $gt: 1 },
        },
      },
    ];

    const duplicateGroups = await collection.aggregate(pipeline).toArray();

    console.log(`   Found ${duplicateGroups.length} groups with duplicates\n`);

    if (duplicateGroups.length === 0) {
      console.log('✨ No duplicates found! Database is clean.\n');
      return;
    }

    // Count total duplicates
    const totalDuplicates = duplicateGroups.reduce(
      (sum, group) => sum + (group.count - 1),
      0
    );
    console.log(`📈 Total duplicate records to remove: ${totalDuplicates}\n`);

    // Confirm before deletion
    console.log('⚠️  WARNING: This will permanently delete duplicate records!');
    console.log('   Options:');
    console.log('   1. Press Ctrl+C to cancel');
    console.log('   2. Wait 5 seconds to continue\n');

    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Collect all IDs to delete across all groups, then delete in one batch
    console.log('🗑️  Collecting IDs to delete...');
    const allIdsToDelete = duplicateGroups.flatMap(
      (group) => group.docs.slice(1).map((doc) => doc._id) // keep first, delete rest
    );

    console.log(`   Deleting ${allIdsToDelete.length} documents in a single operation...\n`);
    const result = await collection.deleteMany({ _id: { $in: allIdsToDelete } });
    const deletedCount = result.deletedCount;

    console.log('\n');

    // Get final count
    const finalCount = await collection.countDocuments();

    console.log('='.repeat(60));
    console.log('📊 CLEANUP SUMMARY');
    console.log('='.repeat(60));
    console.log(`📉 Initial records:      ${initialCount}`);
    console.log(`🗑️  Deleted duplicates:  ${deletedCount}`);
    console.log(`📈 Final records:        ${finalCount}`);
    console.log(`💾 Space saved:          ${deletedCount} records`);
    console.log(`✅ Reduction:            ${((deletedCount / initialCount) * 100).toFixed(1)}%`);
    console.log('='.repeat(60));
    console.log('\n✨ Duplicate removal completed successfully!\n');

    // Verify no duplicates remain
    console.log('🔍 Verifying cleanup...');
    const remainingDuplicates = await collection
      .aggregate([...pipeline, { $count: 'total' }])
      .toArray();

    if (remainingDuplicates.length === 0 || remainingDuplicates[0].total === 0) {
      console.log('✅ Verification passed: No duplicates remain\n');
    } else {
      console.log(
        `⚠️  Warning: ${remainingDuplicates[0].total} duplicate groups still exist\n`
      );
    }
  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the cleanup
removeDuplicates().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
