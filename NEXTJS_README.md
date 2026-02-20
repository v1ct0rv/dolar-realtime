# Dólar Realtime - Next.js Application

Modern Next.js application for real-time Colombian Peso (COP) to USD exchange rate tracking with MongoDB persistence and advanced analytics.

## 🚀 Features

- ✅ **TRM Analysis Dashboard** - Compare market prices vs. official TRM with detailed deviation analysis
- 🔄 Real-time data updates (coming soon)
- 📊 Historical data browser (coming soon)
- 📈 6 types of advanced reports (TRM Analysis implemented, others coming soon)
- 💾 MongoDB persistence for historical analysis
- 📱 Responsive design with Tailwind CSS
- 🎨 Dark mode support
- ⚡ Server-side rendering and API routes with Next.js 15

## 📋 Prerequisites

- Node.js 20.x or later
- MongoDB 6.0 or later (local or Azure Cosmos DB)
- npm or yarn

## 🛠️ Installation

### 1. Clone and Navigate

```bash
cd dolar-realtime
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your configuration:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=dolar-realtime

# ICAP API Configuration
ICAP_API_BASE_URL=https://proxy.icap.com.co/seticap/api
ICAP_API_TOKEN=your-icap-token-here

# Application Insights (Optional)
APPLICATIONINSIGHTS_CONNECTION_STRING=your-connection-string
```

### 4. Set Up MongoDB

#### Option A: Local MongoDB

Install MongoDB locally and start the service:

```bash
# macOS (with Homebrew)
brew install mongodb-community
brew services start mongodb-community

# Ubuntu/Debian
sudo apt-get install mongodb
sudo systemctl start mongodb

# Windows
# Download from https://www.mongodb.com/try/download/community
```

#### Option B: Azure Cosmos DB for MongoDB

1. Create an Azure Cosmos DB account with MongoDB API
2. Get the connection string from Azure Portal
3. Update `MONGODB_URI` in `.env.local`

### 5. Initialize Database (Optional - Sample Data)

If you want to test with sample data:

```bash
# Create sample data script (coming soon)
npm run seed
```

## 🏃 Running the Application

### Development Mode

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

The application will hot-reload as you make changes.

### Production Build

```bash
npm run build
npm start
```

## 📁 Project Structure

```
dolar-realtime/
├── app/
│   ├── api/                    # API routes
│   │   └── reports/
│   │       └── trm-analysis/   # TRM Analysis endpoint
│   ├── components/             # React components
│   │   └── reports/
│   │       └── TRMAnalysisDashboard.tsx
│   ├── reports/                # Report pages
│   │   └── trm-analysis/
│   ├── globals.css             # Global styles
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Home page
├── lib/
│   ├── mongodb.ts              # MongoDB connection
│   └── aggregations.ts         # Aggregation pipelines
├── types/
│   └── index.ts                # TypeScript types
├── legacy/                     # Old Express.js app
├── public/                     # Static assets
├── .env.local.example          # Environment template
├── next.config.ts              # Next.js configuration
├── package.json                # Dependencies
├── tailwind.config.ts          # Tailwind CSS config
└── tsconfig.json               # TypeScript config
```

## 🎯 Available Features

### ✅ TRM Analysis Dashboard

**URL:** [http://localhost:3000/reports/trm-analysis](http://localhost:3000/reports/trm-analysis)

Features:
- Compare market closing prices vs. official TRM
- Deviation analysis with statistical metrics
- Distribution of days above/below TRM
- Trend analysis with consecutive day tracking
- Interactive charts with Recharts
- Quick date range selectors (7, 30, 90 days)
- Automated alerts for unusual deviations

**API Endpoint:**
```
GET /api/reports/trm-analysis?startDate=2026-01-01&endDate=2026-01-08
```

### 🔜 Coming Soon

- Real-time Dashboard
- Historical Data Browser
- Weekly Trends Report
- Monthly Overview
- Volatility Analysis
- Volume Analysis
- Data Export (CSV/JSON)

## 🗄️ Database Schema

### Collection: `dolarData`

```typescript
{
  _id: ObjectId,
  timestamp: ISODate,
  date: "2026-01-08",        // YYYY-MM-DD
  time: "11:23:45",          // HH:MM:SS
  price: 4048.75,            // Closing price
  openPrice: 3950.25,
  minPrice: 3945.00,
  maxPrice: 4062.00,
  avgPrice: 4001.23,
  volume: 2500000,           // Amount in USD
  transactions: 1,
  metadata: {
    source: "ICAP",
    marketId: 71,
    delay: 15
  }
}
```

**Indexes:**
- `{ timestamp: -1 }`
- `{ date: 1, time: 1 }`
- `{ date: 1 }`

### Collection: `trmData`

```typescript
{
  _id: ObjectId,
  date: "2026-01-08",
  value: 4035.50,
  change: "up" | "down" | "equal",
  previousValue: 4021.50,
  source: "ICAP",
  createdAt: ISODate
}
```

**Indexes:**
- `{ date: -1 }` (unique)

## 🔧 Development

### Adding New Reports

1. Create aggregation pipeline in `lib/aggregations.ts`
2. Create API route in `app/api/reports/[report-name]/route.ts`
3. Create component in `app/components/reports/[ReportName].tsx`
4. Create page in `app/reports/[report-name]/page.tsx`

### MongoDB Aggregation Examples

See `lib/aggregations.ts` for complex aggregation pipelines:
- TRM Analysis with lookups and calculations
- Daily summaries with grouping
- Weekly trends with moving averages
- Volatility calculations
- Volume analysis by hour

## 🐛 Troubleshooting

### MongoDB Connection Issues

```bash
# Check if MongoDB is running
mongosh

# Test connection
mongosh "mongodb://localhost:27017"
```

### Module Not Found Errors

```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
```

### TypeScript Errors

```bash
# Rebuild TypeScript
npm run build
```

## 📚 API Documentation

### TRM Analysis Report

**Endpoint:** `GET /api/reports/trm-analysis`

**Query Parameters:**
- `startDate` (required): Start date in YYYY-MM-DD format
- `endDate` (required): End date in YYYY-MM-DD format

**Response:**
```json
{
  "success": true,
  "data": {
    "dateRange": {
      "start": "2026-01-01",
      "end": "2026-01-08"
    },
    "summary": {
      "avgDeviation": 12.50,
      "maxDeviation": 45.00,
      "minDeviation": -22.50,
      "stdDeviation": 18.75,
      "correlation": 0.93
    },
    "distribution": {
      "daysMarketAboveTRM": 5,
      "daysMarketBelowTRM": 2,
      "daysAtTRM": 1,
      "totalDays": 8
    },
    "dailyData": [...],
    "trends": {...},
    "alerts": [...]
  }
}
```

## 🚢 Deployment

### Azure Static Web Apps (Recommended)

1. Create Azure Static Web Apps resource
2. Connect to GitHub repository
3. Configure build:
   - Build command: `npm run build`
   - Output directory: `.next`
   - App location: `/`
   - API location: `app/api`

4. Set environment variables in Azure Portal

### Vercel

```bash
npm install -g vercel
vercel
```

### Docker

```dockerfile
# Coming soon
```

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Check types
npm run type-check
```

## 📊 Performance

- API responses cached for 5 minutes (configurable)
- MongoDB aggregations optimized with indexes
- Server-side rendering for initial page load
- Client-side data fetching for updates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

MIT License - see LICENSE file for details

## 🔗 Links

- [Live App](https://dolar.victorv.co/) (Legacy version)
- [GitHub Repository](https://github.com/victorv977/dolar-realtime)
- [SET-ICAP Data Source](https://dolar.set-icap.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [MongoDB Node.js Driver](https://www.mongodb.com/docs/drivers/node/current/)
- [Recharts Documentation](https://recharts.org/)

## 📧 Support

For questions or issues, please open an issue on GitHub or contact the maintainer.

---

**Built with Next.js 15, TypeScript, MongoDB, and Tailwind CSS**
