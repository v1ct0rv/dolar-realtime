# Timezone & Market Hours Update

## Summary

Updated the application to properly handle timezones and correct market hours:

### ✅ Changes Made

1. **Market Hours Corrected**: 8:00 AM - 1:00 PM COT (was incorrectly 9 AM - 5 PM)
2. **UTC Storage**: All timestamps now stored in UTC in MongoDB
3. **Colombia Time Display**: Times displayed in user's timezone (Colombia Time for this app)
4. **Timezone Utilities**: Created `/lib/utils/timezone.ts` with helper functions

### Market Hours

**Colombian Stock Exchange (SET-ICAP)**
- **Opening**: 8:00 AM COT (13:00 UTC)
- **Closing**: 1:00 PM COT (18:00 UTC)
- **Timezone**: America/Bogota (UTC-5, no DST)

### Data Storage

**MongoDB Documents:**
- `timestamp`: Stored in UTC (ISODate)
- `date`: Colombia date (YYYY-MM-DD) for grouping
- `time`: UTC time for precise ordering
- `createdAt`: UTC timestamp

**Example:**
```javascript
{
  timestamp: ISODate("2026-01-08T14:30:00Z"), // UTC
  date: "2026-01-08",                          // Colombia date
  time: "14:30:00",                           // UTC time
  // ... other fields
}
```

### Display

When displaying times to users:
- Charts show times in Colombia Time (COT)
- API responses include both UTC and Colombia time
- Market status checks use Colombia Time

### Utility Functions

New functions in `lib/utils/timezone.ts`:
- `getColombiaTime()` - Get current time in COT
- `isMarketHours()` - Check if market is open
- `toColombiaDateString()` - Format date in COT
- `formatColombiaTime()` - Format UTC time for display
- `getMarketStatus()` - Get current market status

### Testing

```bash
# Check market status
curl http://localhost:3000/api/cron/collect-data

# Response shows:
{
  "marketHours": "8:00 AM - 1:00 PM COT (Colombia Time)",
  "currentTime": "2026-01-08T14:30:00.000Z",
  "colombiaTime": "2026-01-08T09:30:00.000Z",
  "colombiaHour": 9,
  "isMarketHours": true
}
```

### Migration Notes

Existing data remains valid:
- Old timestamps are in UTC (correct)
- Dates are in Colombia timezone (correct)
- No data migration needed

Only the market hours check and documentation were updated.

---

**Updated Files:**
- `app/api/cron/collect-data/route.ts` - Market hours 8 AM - 1 PM, UTC storage
- `lib/utils/timezone.ts` - New timezone utilities
- Documentation files (updated separately)
