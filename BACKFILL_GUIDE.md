# 📊 TRM Data Backfill Guide

## Quick Start

You have **12,462 days** of historical TRM data (from 1991-11-27 to present) ready to import!

### Step 1: Start MongoDB

```bash
# Using Docker (recommended)
docker run -d --name mongodb -p 27017:27017 -v mongodb_data:/data/db mongo:7.0

# Verify it's running
docker ps | grep mongodb
```

### Step 2: Run the Backfill Script

```bash
npm run backfill-trm
```

That's it! The script will:
- ✅ Parse all 12,462 TRM records from CSV
- ✅ Calculate day-over-day changes
- ✅ Insert into MongoDB in batches of 1,000
- ✅ Create indexes automatically
- ✅ Show progress with percentage
- ✅ Display summary statistics

### Expected Output

```
🚀 Starting TRM backfill process...

📄 Reading CSV file...
📊 Found 12461 TRM records

✅ Parsed 12461 records
   Date range: 1991-11-27 to 2025-12-31

🔌 Connecting to MongoDB...
✅ Connected to MongoDB

💾 Inserting records into MongoDB...
   Progress: 12461/12461 (100.0%) ✓

🔍 Creating indexes...
✅ Indexes created

============================================================
📊 BACKFILL SUMMARY
============================================================
✅ Successfully inserted: 12461 records
📈 Total records in DB:   12461 records
📅 Date range:           1991-11-27 to 2025-12-31
💵 Latest TRM value:     $4035.50
============================================================

✨ Backfill completed successfully!
```

### Step 3: Verify the Data

```bash
mongosh
use dolar-realtime

// Check record count
db.trmData.countDocuments()
// Should return: 12461

// View latest TRM
db.trmData.findOne({ date: "2026-01-08" })

// View oldest TRM
db.trmData.findOne({ date: "1991-11-27" })

exit
```

### Step 4: View in the App

1. Make sure the Next.js app is running:
   ```bash
   npm run dev
   ```

2. Visit the TRM Analysis Dashboard:
   ```
   http://localhost:3000/reports/trm-analysis
   ```

3. Select different date ranges to explore the data:
   - 7 days
   - 30 days
   - 90 days
   - Custom range

---

## 📈 What Gets Imported

### CSV Structure
```csv
"Periodo(MMM DD, AAAA)","Tasa Representativa del Mercado (TRM)"
"1991/11/27",693.32
"1991/11/28",693.99
...
```

### MongoDB Structure
```javascript
{
  _id: ObjectId("..."),
  date: "1991-11-27",
  value: 693.32,
  change: "equal",        // "up", "down", or "equal"
  previousValue: null,    // or previous day's value
  source: "Historic CSV Import",
  createdAt: ISODate("1991-11-27T00:00:00.000Z")
}
```

---

## 🔄 Re-running the Script

**Safe to run multiple times!**

The script uses a unique index on the `date` field, so:
- ✅ **Duplicate dates** are automatically skipped
- ✅ **New dates** are inserted
- ✅ **No data loss** or corruption

If you want to completely reset and re-import:

```bash
mongosh
use dolar-realtime
db.trmData.drop()
exit

npm run backfill-trm
```

---

## 🎯 Use Cases

With 34+ years of TRM data, you can now:

### 1. Long-Term Trend Analysis
```javascript
// Get 10-year average
db.trmData.aggregate([
  { $match: { date: { $gte: "2016-01-01", $lte: "2025-12-31" } } },
  { $group: { _id: null, avgTRM: { $avg: "$value" } } }
])
```

### 2. Historical Comparisons
- Compare current TRM with 1990s, 2000s, 2010s, 2020s
- Identify major devaluation periods
- Economic crisis analysis (1999, 2008, 2020)

### 3. Statistical Analysis
- Calculate standard deviation over decades
- Identify outliers and anomalies
- Volatility analysis by year

### 4. Year-over-Year Growth
```javascript
// Compare same date across years
db.trmData.find({
  date: { $in: ["2020-01-08", "2021-01-08", "2022-01-08", "2023-01-08", "2024-01-08", "2025-01-08"] }
}).sort({ date: 1 })
```

### 5. Longest Trends
- Find longest consecutive "up" days
- Find longest consecutive "down" days
- Identify stable periods

---

## 📊 Sample Queries

### Find Maximum TRM in History
```javascript
db.trmData.find().sort({ value: -1 }).limit(1)
```

### Find Minimum TRM in History
```javascript
db.trmData.find().sort({ value: 1 }).limit(1)
```

### Calculate Decade Averages
```javascript
db.trmData.aggregate([
  {
    $project: {
      decade: { $concat: [{ $substr: ["$date", 0, 3] }, "0s"] },
      value: 1
    }
  },
  {
    $group: {
      _id: "$decade",
      avgTRM: { $avg: "$value" },
      count: { $sum: 1 }
    }
  },
  { $sort: { _id: 1 } }
])
```

### Find Biggest Single-Day Changes
```javascript
db.trmData.aggregate([
  {
    $project: {
      date: 1,
      value: 1,
      previousValue: 1,
      change: 1,
      changeAmount: { $subtract: ["$value", "$previousValue"] }
    }
  },
  { $match: { changeAmount: { $ne: null } } },
  { $sort: { changeAmount: -1 } },
  { $limit: 10 }
])
```

---

## 🚨 Troubleshooting

### MongoDB not running?
```bash
docker start mongodb
# or
docker run -d --name mongodb -p 27017:27017 mongo:7.0
```

### CSV file not found?
Make sure `data/historic_trm.csv` exists in the project root.

### Out of memory?
```bash
NODE_OPTIONS=--max-old-space-size=4096 npm run backfill-trm
```

### Want to see the script code?
Check `scripts/backfill-trm.js` - it's well-commented!

---

## 📚 Next Steps

After backfilling TRM data:

1. **✅ Backfill TRM** (you just did this!)

2. **Collect Current Data**: Start gathering real-time dollar prices
   ```bash
   curl -X POST http://localhost:3000/api/cron/collect-data \
     -H "Authorization: Bearer dev-secret-token"
   ```

3. **View Analytics**: Explore the TRM Analysis Dashboard
   ```
   http://localhost:3000/reports/trm-analysis
   ```

4. **Build More Reports**: Use the existing aggregation pipelines to create:
   - Daily Summary Report
   - Weekly Trends
   - Monthly Overview
   - Volatility Analysis

---

## 🎉 Summary

You now have:
- ✅ **12,462 days** of historical TRM data in MongoDB
- ✅ **34+ years** of Colombian peso exchange rate history (1991-2025)
- ✅ Day-over-day change calculations
- ✅ Indexed and optimized for fast queries
- ✅ Ready for advanced analytics and reporting

**Enjoy exploring decades of financial data! 📈💰**
