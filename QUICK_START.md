# 🚀 Quick Start Guide

## Get Up and Running in 5 Minutes!

### Step 1: Prerequisites Check

```bash
# Check Node.js version (need 20.x or later)
node --version

# Check if MongoDB is installed
mongod --version
```

### Step 2: Start MongoDB

**macOS:**
```bash
brew services start mongodb-community
```

**Ubuntu/Debian:**
```bash
sudo systemctl start mongodb
```

**Windows:**
Start MongoDB from Services or run `mongod` in a terminal.

### Step 3: Configure Environment

```bash
# Copy the example file
cp .env.local.example .env.local

# The default values will work for local development!
# Just make sure MongoDB is running on localhost:27017
```

### Step 4: Install & Run

```bash
# Install dependencies (already done if you followed setup)
npm install

# Start the development server
npm run dev
```

### Step 5: Open Your Browser

Visit [http://localhost:3000](http://localhost:3000)

You should see the beautiful home page with feature cards!

---

## 🧪 Test with Sample Data

Since you need data in MongoDB to see the TRM Analysis dashboard, here are two options:

### Option A: Collect Real Data from ICAP

```bash
# Trigger data collection (only works during market hours 9 AM - 5 PM COT)
curl -X POST http://localhost:3000/api/cron/collect-data \
  -H "Authorization: Bearer dev-secret-token"

# Run it a few times to get multiple data points
# Wait 20 seconds between runs
```

### Option B: Insert Sample Data Manually

```bash
# Connect to MongoDB
mongosh

# Use the database
use dolar-realtime

# Insert sample dolar data for the last 7 days
db.dolarData.insertMany([
  {
    timestamp: new Date("2026-01-01T14:30:00Z"),
    date: "2026-01-01",
    time: "09:30:00",
    price: 4020.50,
    openPrice: 4015.00,
    minPrice: 4010.00,
    maxPrice: 4025.00,
    avgPrice: 4018.25,
    volume: 2500000,
    transactions: 125,
    metadata: { source: "ICAP", marketId: 71, delay: 15 }
  },
  {
    timestamp: new Date("2026-01-02T14:30:00Z"),
    date: "2026-01-02",
    time: "09:30:00",
    price: 4035.25,
    openPrice: 4020.50,
    minPrice: 4015.00,
    maxPrice: 4040.00,
    avgPrice: 4028.75,
    volume: 2800000,
    transactions: 145,
    metadata: { source: "ICAP", marketId: 71, delay: 15 }
  },
  {
    timestamp: new Date("2026-01-03T14:30:00Z"),
    date: "2026-01-03",
    time: "09:30:00",
    price: 4028.00,
    openPrice: 4035.25,
    minPrice: 4020.00,
    maxPrice: 4035.25,
    avgPrice: 4030.12,
    volume: 2600000,
    transactions: 132,
    metadata: { source: "ICAP", marketId: 71, delay: 15 }
  },
  {
    timestamp: new Date("2026-01-06T14:30:00Z"),
    date: "2026-01-06",
    time: "09:30:00",
    price: 4048.75,
    openPrice: 4028.00,
    minPrice: 4025.00,
    maxPrice: 4050.00,
    avgPrice: 4038.50,
    volume: 3100000,
    transactions: 158,
    metadata: { source: "ICAP", marketId: 71, delay: 15 }
  },
  {
    timestamp: new Date("2026-01-07T14:30:00Z"),
    date: "2026-01-07",
    time: "09:30:00",
    price: 4055.50,
    openPrice: 4048.75,
    minPrice: 4045.00,
    maxPrice: 4060.00,
    avgPrice: 4052.25,
    volume: 3300000,
    transactions: 167,
    metadata: { source: "ICAP", marketId: 71, delay: 15 }
  },
  {
    timestamp: new Date("2026-01-08T14:30:00Z"),
    date: "2026-01-08",
    time: "09:30:00",
    price: 4062.00,
    openPrice: 4055.50,
    minPrice: 4052.00,
    maxPrice: 4065.00,
    avgPrice: 4058.75,
    volume: 3500000,
    transactions: 175,
    metadata: { source: "ICAP", marketId: 71, delay: 15 }
  }
])

# Insert sample TRM data
db.trmData.insertMany([
  { date: "2026-01-01", value: 4010.00, change: "up", previousValue: 4000.00, source: "ICAP", createdAt: new Date("2026-01-01") },
  { date: "2026-01-02", value: 4015.50, change: "up", previousValue: 4010.00, source: "ICAP", createdAt: new Date("2026-01-02") },
  { date: "2026-01-03", value: 4018.25, change: "up", previousValue: 4015.50, source: "ICAP", createdAt: new Date("2026-01-03") },
  { date: "2026-01-06", value: 4025.00, change: "up", previousValue: 4018.25, source: "ICAP", createdAt: new Date("2026-01-06") },
  { date: "2026-01-07", value: 4032.50, change: "up", previousValue: 4025.00, source: "ICAP", createdAt: new Date("2026-01-07") },
  { date: "2026-01-08", value: 4035.50, change: "up", previousValue: 4032.50, source: "ICAP", createdAt: new Date("2026-01-08") }
])

# Create indexes
db.dolarData.createIndex({ timestamp: -1 })
db.dolarData.createIndex({ date: 1, time: 1 })
db.dolarData.createIndex({ date: 1 })
db.trmData.createIndex({ date: -1 }, { unique: true })

# Verify data was inserted
db.dolarData.countDocuments()
db.trmData.countDocuments()

# Exit mongosh
exit
```

### Step 6: View the TRM Analysis Dashboard

Visit [http://localhost:3000/reports/trm-analysis](http://localhost:3000/reports/trm-analysis)

You should now see:
- ✅ Interactive charts with your data
- ✅ Statistical metrics
- ✅ Distribution analysis
- ✅ Trend information

---

## 🎉 Success!

You're now running the Dólar Realtime Next.js application!

### What's Working:
- ✅ Next.js app running on port 3000
- ✅ MongoDB connected and storing data
- ✅ TRM Analysis Dashboard with interactive charts
- ✅ API endpoints responding
- ✅ Beautiful responsive UI

### Next Steps:
1. Explore the [home page](http://localhost:3000)
2. View the [TRM Analysis](http://localhost:3000/reports/trm-analysis)
3. Try different date ranges (7, 30, 90 days)
4. Set up automated data collection
5. Build additional reports

---

## 📚 Learn More

- **[SETUP_COMPLETE.md](SETUP_COMPLETE.md)** - Full feature documentation
- **[NEXTJS_README.md](NEXTJS_README.md)** - Comprehensive guide
- **[README.md](README.md)** - Project overview

## 🐛 Troubleshooting

**MongoDB not connecting?**
```bash
# Check if MongoDB is running
mongosh
```

**Data collection failing?**
- Check if it's during market hours (9 AM - 5 PM Colombia time)
- Verify ICAP_API_TOKEN in .env.local
- Check the console for error messages

**TypeScript errors?**
```bash
npm run build
```

---

**Happy coding! 🚀**
