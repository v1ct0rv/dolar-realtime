# Data Import Scripts

This directory contains utility scripts for importing and managing data in the Dólar Realtime application.

## 📊 Backfill TRM Historical Data

### Overview

The `backfill-trm.js` script imports historical TRM (Tasa Representativa del Mercado) data from the CSV file into MongoDB.

**Data Source:** `data/historic_trm.csv` (~12,462 records from 1991 to present)

### Features

- ✅ Parses CSV with date and TRM value
- ✅ Calculates day-over-day change (up/down/equal)
- ✅ Batch inserts for performance (1,000 records per batch)
- ✅ Handles duplicates gracefully (skips existing dates)
- ✅ Creates database indexes automatically
- ✅ Progress indicator with percentage
- ✅ Comprehensive summary statistics

### Usage

#### Option 1: Using npm script (Recommended)

```bash
npm run backfill-trm
```

#### Option 2: Direct execution

```bash
node scripts/backfill-trm.js
```

#### Option 3: With custom MongoDB URI

```bash
MONGODB_URI=mongodb://localhost:27017 \
MONGODB_DB_NAME=dolar-realtime \
npm run backfill-trm
```

### Prerequisites

1. **MongoDB running**: Make sure MongoDB is running (local or Docker)
   ```bash
   # Check if MongoDB is running
   docker ps | grep mongodb

   # Or start it
   docker run -d --name mongodb -p 27017:27017 -v mongodb_data:/data/db mongo:7.0
   ```

2. **CSV file exists**: The script expects `data/historic_trm.csv` to exist

3. **Environment variables** (optional):
   - `MONGODB_URI` - Default: `mongodb://localhost:27017`
   - `MONGODB_DB_NAME` - Default: `dolar-realtime`

### Expected Output

```
🚀 Starting TRM backfill process...

📄 Reading CSV file...
📊 Found 12461 TRM records

✅ Parsed 12461 records
   Date range: 1991-11-27 to 2025-12-31

🔌 Connecting to MongoDB...
   URI: mongodb://localhost:27017
   Database: dolar-realtime

✅ Connected to MongoDB

📊 Existing TRM records in database: 0

💾 Inserting records into MongoDB...

   Progress: 12461/12461 (100.0%) - Inserted: 12461, Skipped: 0

🔍 Creating indexes...
✅ Indexes created

============================================================
📊 BACKFILL SUMMARY
============================================================
✅ Successfully inserted: 12461 records
⏭️  Skipped (duplicates):  0 records
📈 Total records in DB:   12461 records
📅 Date range:           1991-11-27 to 2025-12-31
💵 Latest TRM value:     $4035.50
============================================================

✨ Backfill completed successfully!

🔌 Disconnected from MongoDB
```

### Data Structure

The script inserts documents with the following structure:

```javascript
{
  date: "2026-01-08",           // YYYY-MM-DD format
  value: 4035.50,               // TRM rate
  change: "up",                 // "up", "down", or "equal"
  previousValue: 4032.50,       // Previous day's TRM (if available)
  source: "Historic CSV Import", // Data source identifier
  createdAt: ISODate("2026-01-08") // Document creation timestamp
}
```

### Indexes Created

The script automatically creates these indexes:

1. `{ date: -1 }` - Unique index for fast date lookups and preventing duplicates
2. `{ createdAt: -1 }` - For audit trail queries

### Re-running the Script

If you run the script again:
- **Duplicate records** will be skipped (based on unique date index)
- **New records** will be inserted
- You'll see a 5-second warning if data already exists

To completely reset:
```bash
mongosh
use dolar-realtime
db.trmData.drop()
exit
npm run backfill-trm
```

### Performance

- **Batch size**: 1,000 records per insert
- **Expected time**: ~5-10 seconds for 12,000+ records
- **Memory usage**: Minimal (streaming inserts)

### Troubleshooting

#### Error: CSV file not found

```
❌ Error: historic_trm.csv not found at: /path/to/data/historic_trm.csv
```

**Solution**: Make sure the CSV file exists in the `data/` directory

#### Error: Cannot connect to MongoDB

```
MongoServerError: connect ECONNREFUSED
```

**Solution**: Start MongoDB
```bash
docker run -d --name mongodb -p 27017:27017 mongo:7.0
```

#### Error: Duplicate key error

This is normal if re-running the script. The script will skip duplicates and continue.

#### Error: Out of memory

If you have millions of records, increase Node.js memory:
```bash
NODE_OPTIONS=--max-old-space-size=4096 npm run backfill-trm
```

### Verification

After running the script, verify the data:

```bash
mongosh
use dolar-realtime

// Count records
db.trmData.countDocuments()

// View latest records
db.trmData.find().sort({ date: -1 }).limit(5)

// View oldest records
db.trmData.find().sort({ date: 1 }).limit(5)

// Check a specific date
db.trmData.findOne({ date: "2026-01-08" })

// Verify indexes
db.trmData.getIndexes()

exit
```

### Next Steps

After backfilling TRM data:

1. **View TRM Analysis**: Visit [http://localhost:3000/reports/trm-analysis](http://localhost:3000/reports/trm-analysis)

2. **Collect current data**: Run the data collection endpoint
   ```bash
   curl -X POST http://localhost:3000/api/cron/collect-data \
     -H "Authorization: Bearer dev-secret-token"
   ```

3. **Generate sample dolar data** (optional): Create a script to generate synthetic intraday data for testing

---

## 🚀 Future Scripts

Additional scripts to be added:

- `backfill-dolar-data.js` - Import historical intraday price/volume data
- `generate-sample-data.js` - Generate synthetic data for testing
- `export-data.js` - Export data to CSV/JSON
- `clean-old-data.js` - Remove data older than X days
- `fix-data-gaps.js` - Fill missing dates with interpolated values

---

## 📝 Notes

- All scripts use the same MongoDB connection settings as the main app
- Scripts are safe to run multiple times (idempotent)
- Always backup your database before running scripts in production
- Check the console output for detailed progress and error messages

---

**Happy data importing! 📊**
