# Data Type Fix - String to Number Migration

## Problem

The ICAP API returns numeric values as **strings with commas** instead of numbers:

```json
{
  "avg": "3,716.99",
  "close": "3,716.50",
  "sum": "444,530,000.00"
}
```

These were being stored directly in MongoDB as strings, causing aggregation pipeline errors:

```
MongoServerError: can't $subtract string from string
```

## Solution

### Fixed Files

1. **lib/services/icapService.ts**
   - Updated TypeScript interfaces to accept `string | number`
   - Added `parseNumeric()` helper function to remove commas and convert to numbers
   - Updated `fetchAllCurrentStats()` to parse all numeric fields before returning

```typescript
function parseNumeric(value: string | number): number {
  if (typeof value === 'number') return value;
  return parseFloat(value.replace(/,/g, ''));
}
```

### What Gets Parsed

All numeric fields are now converted to proper numbers:

- `trm`
- `maxPrice`, `minPrice`, `openPrice`
- `price`, `avgPrice`
- `totalAmount`, `latestAmount`, `avgAmount`, `minAmount`, `maxAmount`
- `transactions`

## Re-importing Data

Since the existing data in MongoDB has string values, you need to drop and re-import:

### 1. Drop the existing collections

```bash
mongosh "mongodb://localhost:27017/dolar-realtime" --eval "db.dolarData.drop()"
```

### 2. Re-import TRM historical data

```bash
npm run backfill-trm
```

This will import all 12,462 TRM records with **numeric values**.

### 3. Start collecting new data

```bash
# In one terminal, start the dev server
npm run dev

# In another terminal, trigger data collection (during market hours 8 AM - 1 PM COT)
curl -X POST http://localhost:3000/api/cron/collect-data \
  -H "Authorization: Bearer dev-secret-token"
```

## Verification

After re-importing, verify the data types are correct:

```bash
mongosh "mongodb://localhost:27017/dolar-realtime" --eval "
  var doc = db.dolarData.findOne();
  print('price type:', typeof doc.price, '- value:', doc.price);
  print('openPrice type:', typeof doc.openPrice, '- value:', doc.openPrice);
  print('volume type:', typeof doc.volume, '- value:', doc.volume);
"
```

Expected output:
```
price type: number - value: 3726
openPrice type: number - value: 3717
volume type: number - value: 444530000
```

## Impact on Reports

Once the data is re-imported with numeric values, all aggregation pipelines will work correctly:

- ✅ TRM Analysis Report (deviation calculations)
- ✅ Daily Summary Report
- ✅ Weekly Trends Report
- ✅ Monthly Overview Report
- ✅ Volatility Analysis
- ✅ Volume Analysis

All MongoDB `$subtract`, `$divide`, `$multiply` operations will now work as expected.
