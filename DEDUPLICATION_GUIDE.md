# 🗑️ Data Deduplication Guide

## Problem

When calling the data collection endpoint multiple times with unchanged data, duplicate records were being created in the database, wasting storage space.

**Example of duplicates:**
```javascript
// Record 1 - 15:18:50
{ price: "3,726.00", volume: "444,530,000.00", timestamp: "2026-01-09T15:18:50.931Z" }

// Record 2 - 15:19:32 (DUPLICATE - same data, different timestamp)
{ price: "3,726.00", volume: "444,530,000.00", timestamp: "2026-01-09T15:19:32.111Z" }
```

## ✅ Solution Implemented

### Automatic Deduplication (Prevention)

The data collection endpoint now **checks for changes before inserting**:

**Logic:**
1. Fetch current data from ICAP API
2. Query the last record for today
3. Compare critical fields:
   - price, openPrice, minPrice, maxPrice
   - avgPrice, volume, transactions
4. **Only insert if data changed**

**Benefits:**
- ✅ Prevents duplicate records
- ✅ Saves database storage
- ✅ Faster queries (fewer records)
- ✅ No manual cleanup needed

### API Response

The endpoint now tells you if data was inserted:

```json
{
  "success": true,
  "message": "Data collected but not stored (no changes detected)",
  "inserted": false,
  "dataChanged": false,
  "timestamp": "2026-01-09T15:19:32.111Z"
}
```

or when data changes:

```json
{
  "success": true,
  "message": "Data collected and stored (data changed)",
  "inserted": true,
  "dataChanged": true,
  "timestamp": "2026-01-09T15:20:15.234Z"
}
```

---

## 🧹 Cleanup Existing Duplicates

If you already have duplicate records in your database, use the cleanup script:

### Quick Cleanup

```bash
npm run remove-duplicates
```

### What It Does

1. **Finds duplicate groups** - Records with identical data but different timestamps
2. **Keeps the first occurrence** - Preserves the earliest timestamp
3. **Deletes the rest** - Removes duplicate records
4. **Shows statistics** - Reports how much space was saved

### Expected Output

```
🧹 Starting duplicate removal process...

🔌 Connecting to MongoDB...
✅ Connected to MongoDB

📊 Initial record count: 150

🔍 Finding duplicate records...
   Found 25 groups with duplicates

📈 Total duplicate records to remove: 75

⚠️  WARNING: This will permanently delete duplicate records!
   Options:
   1. Press Ctrl+C to cancel
   2. Wait 5 seconds to continue

   Progress: Deleted 75/75 duplicates

============================================================
📊 CLEANUP SUMMARY
============================================================
📉 Initial records:      150
🗑️  Deleted duplicates:  75
📈 Final records:        75
💾 Space saved:          75 records
✅ Reduction:            50.0%
============================================================

✨ Duplicate removal completed successfully!

🔍 Verifying cleanup...
✅ Verification passed: No duplicates remain
```

---

## 📊 How Deduplication Works

### Fields Compared

The following fields are used to detect duplicates:

```javascript
{
  date,        // Same trading day
  price,       // Closing price
  openPrice,   // Opening price
  minPrice,    // Minimum price
  maxPrice,    // Maximum price
  avgPrice,    // Average price
  volume,      // Total volume traded
  transactions // Number of transactions
}
```

If **all these fields are identical**, the record is considered a duplicate.

### What Gets Kept

- **First record** (earliest timestamp) is kept
- **Subsequent records** with identical data are removed

### Example

```javascript
// These are duplicates (all data identical):
[
  { timestamp: "15:18:50", price: 3726, volume: 444530000 },  // KEPT
  { timestamp: "15:19:32", price: 3726, volume: 444530000 },  // DELETED
  { timestamp: "15:20:15", price: 3726, volume: 444530000 },  // DELETED
]

// These are NOT duplicates (price changed):
[
  { timestamp: "15:18:50", price: 3726, volume: 444530000 },  // KEPT
  { timestamp: "15:19:32", price: 3727, volume: 444530000 },  // KEPT (price changed)
  { timestamp: "15:20:15", price: 3727, volume: 445000000 },  // KEPT (volume changed)
]
```

---

## 🔄 Real-World Behavior

### During Market Hours (8 AM - 1 PM COT)

**Scenario 1: Data is updating every 20 seconds**
```
8:00:00 - New data → Inserted ✓
8:00:20 - Data changed → Inserted ✓
8:00:40 - Data changed → Inserted ✓
8:01:00 - Data changed → Inserted ✓
```

**Scenario 2: Market is slow, data not changing**
```
8:00:00 - New data → Inserted ✓
8:00:20 - No change → Skipped ⏭️
8:00:40 - No change → Skipped ⏭️
8:01:00 - Data changed → Inserted ✓
```

### During Low Activity

If the market has no transactions for several minutes:
- First call: Inserts initial state
- Subsequent calls: Skip insertion (no changes)
- When trade happens: Inserts new record

**Result:** Significant storage savings!

---

## 💡 Storage Savings

### Before Deduplication

With 20-second polling during 5-hour market session:
- Calls per day: 5 hours × 60 min × 3 (every 20s) = **900 API calls**
- If 50% are duplicates: **450 unnecessary records/day**
- In 1 month: **13,500 duplicate records**
- In 1 year: **164,250 duplicate records**

### After Deduplication

- Only records with actual data changes are stored
- Typical savings: **30-50% fewer records**
- Faster queries
- Lower database costs

---

## 🔍 Verification

### Check for Duplicates Manually

```bash
mongosh
use dolar-realtime

// Find duplicate groups
db.dolarData.aggregate([
  {
    $group: {
      _id: {
        date: '$date',
        price: '$price',
        volume: '$volume',
        transactions: '$transactions'
      },
      count: { $sum: 1 },
      docs: { $push: { _id: '$_id', timestamp: '$timestamp' } }
    }
  },
  {
    $match: { count: { $gt: 1 } }
  },
  {
    $sort: { count: -1 }
  }
])

exit
```

### Count Total Records

```bash
mongosh
use dolar-realtime

// Total records
db.dolarData.countDocuments()

// Records per day
db.dolarData.aggregate([
  { $group: { _id: '$date', count: { $sum: 1 } } },
  { $sort: { _id: -1 } },
  { $limit: 10 }
])

exit
```

---

## 🛠️ Manual Cleanup (Alternative)

If you prefer to clean up duplicates manually:

```bash
mongosh
use dolar-realtime

// Keep only unique records (keeps first occurrence)
db.dolarData.aggregate([
  { $sort: { timestamp: 1 } },
  {
    $group: {
      _id: {
        date: '$date',
        price: '$price',
        openPrice: '$openPrice',
        minPrice: '$minPrice',
        maxPrice: '$maxPrice',
        avgPrice: '$avgPrice',
        volume: '$volume',
        transactions: '$transactions'
      },
      doc: { $first: '$$ROOT' }
    }
  },
  { $replaceRoot: { newRoot: '$doc' } },
  { $out: 'dolarData_clean' }
])

// Verify the cleaned collection
db.dolarData_clean.countDocuments()

// If satisfied, replace original
db.dolarData.drop()
db.dolarData_clean.renameCollection('dolarData')

exit
```

---

## 📝 Best Practices

### 1. Call Frequency

**Recommended:**
- During market hours: Every 20-30 seconds
- The deduplication logic handles unchanged data automatically

**Not Recommended:**
- Calling every 1-2 seconds (unnecessary load on ICAP API)
- Calling every 5 minutes (might miss rapid changes)

### 2. Monitoring

Check insertion rate periodically:

```bash
# View recent insertions
mongosh
use dolar-realtime

db.dolarData.find(
  { date: "2026-01-09" },
  { timestamp: 1, price: 1, volume: 1 }
).sort({ timestamp: -1 }).limit(10)

exit
```

### 3. Periodic Cleanup

Even with deduplication, run cleanup monthly:

```bash
# First Monday of each month
npm run remove-duplicates
```

---

## 🎯 Summary

### ✅ What Changed

1. **Data collection endpoint** - Now checks for changes before inserting
2. **API response** - Indicates if data was inserted or skipped
3. **Cleanup script** - Removes existing duplicates from database
4. **Storage efficiency** - 30-50% reduction in duplicate records

### 🚀 Action Items

1. **Clean existing duplicates:**
   ```bash
   npm run remove-duplicates
   ```

2. **Verify deduplication working:**
   ```bash
   # Call endpoint multiple times
   curl -X POST http://localhost:3000/api/cron/collect-data \
     -H "Authorization: Bearer dev-secret-token"

   # Check response: "inserted": false if no changes
   ```

3. **Monitor storage:**
   ```bash
   mongosh
   use dolar-realtime
   db.dolarData.stats()
   ```

---

**Storage optimized! 💾✨**
