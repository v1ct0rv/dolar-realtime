# Dolar Realtime - React Rewrite Requirements Document

## Executive Summary

This document outlines the requirements for rewriting the existing Node.js/Express/Jade application "Dolar Realtime" as a modern React-based application with Azure Static Web Apps deployment, MongoDB persistence, and Application Insights integration.

**Current Application:** http://dolar.victor.co
**Repository:** https://github.com/victorv977/dolar-realtime

---

## 1. Project Overview

### 1.1 Current System Analysis

**Technology Stack (Current):**
- Backend: Node.js + Express.js + Jade templates
- Frontend: jQuery + Bootstrap 3 + Highcharts
- Data: In-memory caching via worker processes
- Deployment: Azure App Service
- Updates: Background scheduled jobs (20-second intervals)

**Core Functionality:**
- Real-time Colombian Peso (COP) to USD exchange rate tracking
- TRM (Tasa Representativa del Mercado) display
- Intraday price and volume charts
- Historical transaction statistics
- Brent Oil commodity pricing (secondary feature)

**Data Sources:**
- ICAP (SET-ICAP) API for Colombian interbank dollar rates
- Investing.com for Brent oil prices

---

## 2. Non-Functional Requirements (NFR)

### 2.1 Technology Stack

**Frontend:**
- React 18.x (latest stable)
- TypeScript for type safety
- Modern build tooling (Vite or Create React App)
- CSS framework: TailwindCSS or Material-UI (MUI)
- Charting library: Recharts or Lightweight Charts (modern replacement for Highcharts)

**Backend:**
- Azure Functions (Node.js 20.x LTS runtime)
- TypeScript
- MongoDB Node.js Driver or Mongoose ODM
- Axios for HTTP requests

**Infrastructure:**
- Azure Static Web Apps (hosting)
- Azure Functions (serverless backend)
- Azure Cosmos DB for MongoDB API (database)
- Azure Application Insights (monitoring)

### 2.2 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 Azure Static Web Apps                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          React SPA (Static Assets)                   │   │
│  │  - Client-side routing                               │   │
│  │  - Real-time data visualization                      │   │
│  │  - Historical data browser                           │   │
│  └────────────────┬─────────────────────────────────────┘   │
│                   │                                          │
│  ┌────────────────▼─────────────────────────────────────┐   │
│  │          Azure Functions (API)                       │   │
│  │  - /api/stats (current stats)                        │   │
│  │  - /api/history (historical data)                    │   │
│  │  - /api/trm (TRM data)                               │   │
│  └────────────────┬─────────────────────────────────────┘   │
└───────────────────┼──────────────────────────────────────────┘
                    │
        ┌───────────┴──────────────┐
        │                          │
┌───────▼────────┐      ┌──────────▼──────────┐
│ Azure Cosmos DB│      │  Application        │
│ (MongoDB API)  │      │  Insights           │
│                │      │                     │
│ Collections:   │      │ - Usage analytics   │
│ - dolarData    │      │ - Performance       │
│ - trmData      │      │ - Error tracking    │
└────────────────┘      └─────────────────────┘
```

### 2.3 Background Processing

**Timer-Triggered Azure Functions:**
- `DataCollectorFunction`: Runs every 20 seconds during market hours
  - Fetches data from ICAP API
  - Stores in MongoDB
  - Handles rate limiting and error retry logic

- `TRMCollectorFunction`: Runs daily at market close
  - Fetches official TRM rate
  - Stores in separate collection

### 2.4 Application Insights Integration

**Metrics to Track:**
- Page views and user sessions
- API response times
- Data fetch success/failure rates
- Chart rendering performance
- Database query performance
- Error rates and exceptions
- Custom events: date range selections, chart interactions

**Implementation:**
- React: `@microsoft/applicationinsights-react-js`
- Azure Functions: Application Insights SDK built-in
- Custom telemetry for business metrics

---

## 3. Functional Requirements

### 3.1 Core Features (Parity with Current App)

#### 3.1.1 Real-Time Dashboard

**Display Components:**

1. **Header Section**
   - Title: "Información del Dólar Interbancario en Tiempo Real"
   - Current date and last update timestamp
   - Auto-refresh indicator

2. **Main Statistics Cards**
   - **Dólar Set-FX Card:**
     - Closing price with trend indicator (↑ up, ↓ down, → equal)
     - Average price with trend indicator
     - Percentage change from previous day

   - **Price Details Card:**
     - TRM (official rate) with trend
     - Opening price with trend
     - Minimum price with trend
     - Maximum price with trend

   - **Volume Details Card:**
     - Total amount traded (USD)
     - Latest transaction amount
     - Average transaction amount
     - Minimum transaction amount
     - Maximum transaction amount
     - Total number of transactions

3. **Dólar Spot Chart**
   - Dual-axis chart:
     - Primary axis: Price (line/spline)
     - Secondary axis: Volume in thousands USD (bar/column)
   - X-axis: Time of day (HH:MM format)
   - Interactive zoom functionality
   - Tooltip showing timestamp, price, and volume
   - Auto-updates every 10 seconds

4. **Brent Oil Section** (Optional/Secondary)
   - Brent crude oil price
   - Percentage change from previous close
   - Area chart with event markers
   - News and economic calendar flags

#### 3.1.2 API Endpoints (Azure Functions)

| Endpoint | Method | Description | Response |
|----------|--------|-------------|----------|
| `/api/stats/current` | GET | Current exchange rate stats | JSON with all current metrics |
| `/api/stats/intraday` | GET | Intraday chart data | Time-series price and volume arrays |
| `/api/trm/current` | GET | Current TRM value | TRM with date |
| `/api/oil/brent` | GET | Brent oil data | Price, chart data, events |

### 3.2 New Features (Enhanced Functionality)

#### 3.2.1 MongoDB Data Persistence

**Collection: `dolarData`**
```javascript
{
  _id: ObjectId,
  timestamp: ISODate,
  date: String (YYYY-MM-DD),
  time: String (HH:MM:SS),
  price: Number,           // Closing price
  openPrice: Number,
  minPrice: Number,
  maxPrice: Number,
  avgPrice: Number,
  volume: Number,          // Amount traded
  transactions: Number,
  metadata: {
    source: String,        // "ICAP"
    marketId: Number,      // 71
    delay: Number          // 15
  }
}
```

**Indexes:**
- `{ timestamp: -1 }` (primary query index)
- `{ date: 1, time: 1 }` (daily data access)
- `{ date: 1 }` (date range queries)

**Collection: `trmData`**
```javascript
{
  _id: ObjectId,
  date: String (YYYY-MM-DD),
  value: Number,           // TRM rate
  change: String,          // "up", "down", "equal"
  previousValue: Number,
  source: String,          // "ICAP"
  createdAt: ISODate
}
```

**Indexes:**
- `{ date: -1 }` (unique)
- `{ createdAt: -1 }` (audit trail)

#### 3.2.2 Historical Data Browser

**Date Range Selector:**
- Calendar picker for start and end dates
- Quick select buttons:
  - Today
  - Yesterday
  - Last 7 days
  - Last 30 days
  - Last 90 days
  - Custom range

**Historical Chart View:**
- Daily closing price line chart
- Volume bar chart overlay
- Comparison with TRM values
- Export to CSV functionality
- Zoom and pan controls

**API Endpoints:**

| Endpoint | Method | Parameters | Description |
|----------|--------|------------|-------------|
| `/api/history/range` | GET | `startDate`, `endDate` | Historical data for date range |
| `/api/history/daily` | GET | `date` | All data points for specific day |
| `/api/trm/range` | GET | `startDate`, `endDate` | TRM values for date range |
| `/api/history/export` | GET | `startDate`, `endDate`, `format` | Export data (CSV/JSON) |

#### 3.2.3 Enhanced Reports and Analytics

**1. Daily Summary Report**
- Opening vs. Closing spread
- Intraday volatility (max - min)
- Average transaction size
- Total trading volume
- Number of transactions
- Comparison with previous day

**2. Weekly Trend Report**
- 5-day moving average
- Weekly high/low
- Week-over-week change percentage
- Trading volume trends
- Volatility index

**3. Monthly Overview**
- Monthly average rate
- Monthly high/low
- Total monthly volume
- Average daily transactions
- Comparison with previous month
- Correlation with TRM

**4. TRM Analysis Dashboard**
- TRM vs. Market Rate deviation
- Historical TRM chart
- Days when market exceeded TRM
- Average spread between TRM and closing price
- Statistical distribution

**5. Volatility Report**
- Intraday volatility chart (hourly standard deviation)
- Most volatile trading hours
- Calm vs. volatile days comparison
- Volatility heat map (calendar view)

**6. Trading Volume Analysis**
- Volume by hour of day (histogram)
- Large transaction alerts (> avg + 2σ)
- Volume trends over time
- Busiest trading days

**API Endpoints for Reports:**

| Endpoint | Method | Parameters | Description |
|----------|--------|------------|-------------|
| `/api/reports/daily` | GET | `date` | Daily summary |
| `/api/reports/weekly` | GET | `weekStartDate` | Weekly trends |
| `/api/reports/monthly` | GET | `year`, `month` | Monthly overview |
| `/api/reports/trm-analysis` | GET | `startDate`, `endDate` | TRM analysis |
| `/api/reports/volatility` | GET | `startDate`, `endDate` | Volatility metrics |
| `/api/reports/volume-analysis` | GET | `startDate`, `endDate` | Volume patterns |

---

## 4. Technical Architecture

### 4.1 React Application Structure

```
/src
├── /components
│   ├── /common
│   │   ├── Header.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── ErrorBoundary.tsx
│   │   └── DateRangePicker.tsx
│   ├── /dashboard
│   │   ├── DashboardView.tsx
│   │   ├── StatsCard.tsx
│   │   ├── PriceDetailsCard.tsx
│   │   ├── VolumeDetailsCard.tsx
│   │   └── LiveIndicator.tsx
│   ├── /charts
│   │   ├── DolarSpotChart.tsx
│   │   ├── BrentOilChart.tsx
│   │   ├── HistoricalChart.tsx
│   │   └── TRMComparisonChart.tsx
│   ├── /historical
│   │   ├── HistoricalView.tsx
│   │   ├── DateSelector.tsx
│   │   └── DataExporter.tsx
│   └── /reports
│       ├── ReportsView.tsx
│       ├── DailySummary.tsx
│       ├── WeeklyTrends.tsx
│       ├── MonthlyOverview.tsx
│       ├── TRMAnalysis.tsx
│       ├── VolatilityReport.tsx
│       └── VolumeAnalysis.tsx
├── /hooks
│   ├── useRealTimeData.ts
│   ├── useHistoricalData.ts
│   ├── useAppInsights.ts
│   └── useDataExport.ts
├── /services
│   ├── api.ts
│   ├── dataTransform.ts
│   └── appInsights.ts
├── /types
│   ├── dolarData.ts
│   ├── trmData.ts
│   └── reports.ts
├── /utils
│   ├── dateUtils.ts
│   ├── formatters.ts
│   └── chartConfig.ts
├── /contexts
│   └── AppInsightsContext.tsx
├── App.tsx
├── main.tsx
└── routes.tsx
```

### 4.2 Azure Functions Structure

```
/api
├── /functions
│   ├── /stats
│   │   ├── getCurrent.ts
│   │   └── getIntraday.ts
│   ├── /trm
│   │   ├── getCurrent.ts
│   │   └── getRange.ts
│   ├── /history
│   │   ├── getRange.ts
│   │   ├── getDaily.ts
│   │   └── export.ts
│   ├── /reports
│   │   ├── daily.ts
│   │   ├── weekly.ts
│   │   ├── monthly.ts
│   │   ├── trmAnalysis.ts
│   │   ├── volatility.ts
│   │   └── volumeAnalysis.ts
│   └── /collectors (Timer-triggered)
│       ├── dataCollector.ts
│       └── trmCollector.ts
├── /shared
│   ├── /db
│   │   ├── connection.ts
│   │   ├── models.ts
│   │   └── repositories.ts
│   ├── /services
│   │   ├── icapService.ts
│   │   └── dataTransform.ts
│   └── /utils
│       ├── logger.ts
│       └── errorHandler.ts
└── host.json
```

### 4.3 Database Schema Design

**MongoDB Connection:**
- Azure Cosmos DB for MongoDB (API version 4.2+)
- Connection string stored in Azure Key Vault
- Retry logic for transient failures

**Data Retention Policy:**
- Keep all intraday data indefinitely (for historical analysis)
- Partition by date for efficient querying
- Consider time-series collections in MongoDB 5.0+

**Aggregation Pipeline Examples:**

```javascript
// Daily summary aggregation
db.dolarData.aggregate([
  { $match: { date: "2026-01-08" } },
  { $group: {
      _id: "$date",
      openPrice: { $first: "$openPrice" },
      closePrice: { $last: "$price" },
      highPrice: { $max: "$maxPrice" },
      lowPrice: { $min: "$minPrice" },
      avgPrice: { $avg: "$avgPrice" },
      totalVolume: { $sum: "$volume" },
      totalTransactions: { $sum: "$transactions" }
    }
  }
])

// Hourly volatility
db.dolarData.aggregate([
  { $match: { date: "2026-01-08" } },
  { $group: {
      _id: { $hour: "$timestamp" },
      stdDev: { $stdDevPop: "$price" },
      priceRange: {
        $subtract: [{ $max: "$maxPrice" }, { $min: "$minPrice" }]
      }
    }
  },
  { $sort: { "_id": 1 } }
])
```

### 4.4 Real-Time Data Flow

```
┌─────────────────────┐
│  ICAP API           │
│  (External)         │
└──────────┬──────────┘
           │
           │ Every 20s (Timer)
           ▼
┌─────────────────────────────────┐
│ Azure Function (Timer Trigger)  │
│ - dataCollector.ts              │
│ - Fetch from ICAP               │
│ - Transform data                │
│ - Store in MongoDB              │
└──────────┬──────────────────────┘
           │
           │ Insert
           ▼
┌─────────────────────────────────┐
│ MongoDB (dolarData collection)  │
│ - Indexed by timestamp          │
└──────────┬──────────────────────┘
           │
           │ Query
           ▼
┌─────────────────────────────────┐
│ Azure Function (HTTP Trigger)   │
│ - /api/stats/current            │
│ - Return latest document        │
└──────────┬──────────────────────┘
           │
           │ HTTP GET (every 10s)
           ▼
┌─────────────────────────────────┐
│ React App (useRealTimeData hook)│
│ - Polling with setInterval      │
│ - Update state                  │
│ - Re-render charts              │
└─────────────────────────────────┘
```

### 4.5 Application Insights Implementation

**React Integration:**

```typescript
// src/services/appInsights.ts
import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { ReactPlugin } from '@microsoft/applicationinsights-react-js';

const reactPlugin = new ReactPlugin();
const appInsights = new ApplicationInsights({
  config: {
    connectionString: import.meta.env.VITE_APPINSIGHTS_CONNECTION_STRING,
    extensions: [reactPlugin],
    enableAutoRouteTracking: true,
    enableRequestHeaderTracking: true,
    enableResponseHeaderTracking: true
  }
});

appInsights.loadAppInsights();

// Custom events
export const trackEvent = (name: string, properties?: Record<string, any>) => {
  appInsights.trackEvent({ name, properties });
};

// Custom metrics
export const trackMetric = (name: string, average: number) => {
  appInsights.trackMetric({ name, average });
};
```

**Custom Events to Track:**
- `PageView`: Automatic
- `ChartRendered`: Chart load times
- `DataRefresh`: API call success/failure
- `DateRangeSelected`: Historical data queries
- `ReportGenerated`: Report type and parameters
- `DataExported`: Export format and date range
- `APIError`: Failed API calls with error details

**Azure Functions Integration:**
- Built-in via host.json configuration
- Custom telemetry for ICAP API calls
- Dependency tracking for MongoDB operations

---

## 5. Development Phases

### Phase 1: Infrastructure Setup
- [ ] Azure Static Web Apps resource provisioning
- [ ] Azure Cosmos DB for MongoDB setup
- [ ] Azure Functions App creation
- [ ] Application Insights workspace
- [ ] GitHub Actions CI/CD pipeline
- [ ] Environment configuration (secrets, connection strings)

### Phase 2: Core Backend Development
- [ ] MongoDB schema and indexes
- [ ] Azure Functions for ICAP data collection
- [ ] Timer-triggered collector functions
- [ ] Basic API endpoints (current stats, intraday data)
- [ ] Error handling and logging
- [ ] Data transformation utilities

### Phase 3: Core Frontend Development
- [ ] React project setup (Vite + TypeScript)
- [ ] Routing and navigation
- [ ] Dashboard layout and components
- [ ] Real-time data hooks
- [ ] Chart components (Dólar Spot)
- [ ] Application Insights integration
- [ ] Responsive design

### Phase 4: Historical Data Features
- [ ] Historical data API endpoints
- [ ] Date range selector component
- [ ] Historical chart visualization
- [ ] Data export functionality (CSV/JSON)
- [ ] MongoDB aggregation pipelines for historical queries

### Phase 5: Reports and Analytics
- [ ] Report calculation functions (backend)
- [ ] Report API endpoints
- [ ] Report UI components
- [ ] TRM analysis dashboard
- [ ] Volatility and volume reports
- [ ] PDF export capability (optional)

### Phase 6: Testing and Optimization
- [ ] Unit tests (Jest + React Testing Library)
- [ ] Integration tests (Azure Functions)
- [ ] E2E tests (Playwright or Cypress)
- [ ] Performance optimization
- [ ] Application Insights dashboard configuration
- [ ] Load testing

### Phase 7: Deployment and Migration
- [ ] Deploy to production environment
- [ ] Data migration from current system (if needed)
- [ ] DNS/domain configuration
- [ ] Monitoring and alerting setup
- [ ] Documentation
- [ ] User acceptance testing

---

## 6. Migration Strategy

### 6.1 Data Backfill

Since the current system uses in-memory caching, there's no historical data to migrate. Options:

**Option 1: Fresh Start**
- Start collecting data from deployment date forward
- No historical data initially
- Historical reports available after 30-90 days of operation

**Option 2: Simulated Data (Development/Testing)**
- Generate synthetic historical data for testing reports
- Clearly marked as simulated in development environments

**Option 3: External Data Source**
- Research if ICAP provides historical API access
- Backfill last 90-365 days if available

### 6.2 Parallel Deployment

1. Deploy new React app to temporary URL (e.g., `new.dolar.victor.co`)
2. Run both systems in parallel for 2-4 weeks
3. Compare data accuracy and performance
4. Gather user feedback
5. Switch DNS to point to new system
6. Keep old system as fallback for 1 week

### 6.3 Zero-Downtime Deployment

Azure Static Web Apps supports:
- Staging environments
- Traffic splitting (A/B testing)
- Instant rollback capability

---

## 7. Performance Requirements

### 7.1 Frontend Performance
- **First Contentful Paint (FCP):** < 1.5s
- **Time to Interactive (TTI):** < 3s
- **Largest Contentful Paint (LCP):** < 2.5s
- **Cumulative Layout Shift (CLS):** < 0.1
- **Bundle Size:** < 500KB (gzipped)
- **Chart Render Time:** < 500ms

### 7.2 Backend Performance
- **API Response Time (Current Stats):** < 200ms (P95)
- **API Response Time (Historical Data):** < 1s (P95)
- **MongoDB Query Time:** < 100ms (P95)
- **Data Collection Cycle:** Completes within 15s window
- **Function Cold Start:** < 3s

### 7.3 Scalability
- Support 1,000 concurrent users
- Handle 10,000 requests/hour
- MongoDB can scale to 100M+ documents

---

## 8. Security Requirements

### 8.1 Authentication & Authorization
- Current app is public (no authentication)
- Future consideration: Admin dashboard for data management

### 8.2 API Security
- **CORS:** Restrict to specific domains
- **Rate Limiting:** Prevent abuse (Azure API Management or function-level)
- **Input Validation:** Validate all date parameters
- **Error Messages:** Don't expose internal details

### 8.3 Data Security
- **Secrets Management:** Azure Key Vault for connection strings
- **MongoDB Connection:** Use SSL/TLS
- **ICAP API Token:** Store encrypted in Key Vault
- **Application Insights:** Sanitize sensitive data from logs

### 8.4 Compliance
- **GDPR:** No personal data collected (analytics only)
- **Data Retention:** Define policy for MongoDB cleanup

---

## 9. Monitoring and Alerting

### 9.1 Application Insights Alerts

**Critical Alerts:**
- API availability < 99% (5-minute window)
- Function execution failures > 5% (15-minute window)
- MongoDB connection failures
- ICAP API failures > 3 consecutive attempts

**Warning Alerts:**
- API response time P95 > 1s
- Function execution time > 10s
- Memory usage > 80%
- Storage growth rate anomalies

### 9.2 Dashboard Metrics

**Real-Time Dashboard:**
- Requests per second
- Active users
- API latency (P50, P95, P99)
- Error rate percentage
- Function execution count

**Business Metrics:**
- Data freshness (last successful ICAP fetch)
- Historical data coverage (days with data)
- Most popular reports
- Export request volume

---

## 10. Cost Estimation (Azure)

| Service | Tier | Estimated Monthly Cost (USD) |
|---------|------|------------------------------|
| Static Web Apps | Standard | $9 |
| Azure Functions | Consumption Plan | $5-15 (based on executions) |
| Cosmos DB (MongoDB API) | Serverless | $20-50 (based on usage) |
| Application Insights | Pay-as-you-go | $5-10 |
| **Total** | | **$39-84/month** |

**Cost Optimization Tips:**
- Use Cosmos DB serverless for predictable low-volume workloads
- Optimize function execution time to reduce costs
- Set data retention policies to limit storage growth
- Use Application Insights sampling for high-traffic scenarios

---

## 11. Testing Strategy

### 11.1 Unit Tests
- **Frontend:** Jest + React Testing Library (>80% coverage)
- **Backend:** Jest for Azure Functions (>70% coverage)
- **Utilities:** 100% coverage for data transformation logic

### 11.2 Integration Tests
- Azure Functions with MongoDB (local CosmosDB emulator)
- API endpoint testing with mock data
- ICAP service mocking for predictable tests

### 11.3 E2E Tests
- Critical user flows:
  - Load dashboard and view real-time data
  - Select date range and view historical chart
  - Generate and download report
  - Export data to CSV
- Tools: Playwright or Cypress

### 11.4 Performance Tests
- Load testing with Artillery or k6
- Simulate 1,000 concurrent users
- Test MongoDB query performance with large datasets

---

## 12. Documentation Deliverables

1. **README.md**: Setup instructions, architecture overview
2. **API_DOCUMENTATION.md**: All endpoints with request/response examples
3. **DEPLOYMENT_GUIDE.md**: Azure infrastructure setup steps
4. **DEVELOPMENT_GUIDE.md**: Local development environment setup
5. **USER_GUIDE.md**: End-user documentation for new features
6. **TROUBLESHOOTING.md**: Common issues and solutions

---

## 13. Success Criteria

### 13.1 Functional Success
- [ ] All current features replicated with parity
- [ ] Historical data successfully stored and queryable
- [ ] All 6 report types functional and accurate
- [ ] Real-time updates working with <10s latency
- [ ] Data export working for CSV format

### 13.2 Technical Success
- [ ] Application Insights tracking all key metrics
- [ ] MongoDB queries optimized with proper indexes
- [ ] Frontend performance meets Core Web Vitals
- [ ] API response times within SLA
- [ ] Zero data loss in production

### 13.3 Business Success
- [ ] Application available 99.9% uptime
- [ ] Cost within estimated budget ($100/month)
- [ ] User feedback positive (if collected)
- [ ] Successful migration with no extended downtime

---

## 14. Future Enhancements (Out of Scope for Initial Release)

1. **User Accounts:**
   - Save favorite date ranges
   - Custom report configurations
   - Email alerts for price thresholds

2. **Advanced Analytics:**
   - Machine learning price predictions
   - Correlation analysis with other currencies
   - Sentiment analysis from news sources

3. **Mobile App:**
   - React Native mobile application
   - Push notifications for significant changes

4. **API for Third Parties:**
   - Public API with authentication
   - Rate limiting tiers
   - Developer portal

5. **Multi-Currency Support:**
   - Track other currencies beyond USD/COP
   - Cross-currency comparisons

---

## 15. Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| ICAP API changes/breaks | High | Medium | Implement robust error handling, monitoring, fallback data source |
| MongoDB cost overrun | Medium | Low | Use serverless tier, implement data retention policy, monitor usage |
| Azure Functions cold start latency | Medium | Medium | Use "warm-up" requests, consider premium plan if needed |
| Data collection gaps | High | Low | Implement retry logic, alerting, backfill mechanisms |
| Performance issues with large datasets | Medium | Medium | Optimize queries, implement pagination, caching strategy |
| Browser compatibility issues | Low | Low | Use modern build tools, test on major browsers |

---

## 16. Appendix

### 16.1 ICAP API Endpoints Reference

**Base URL:** `https://proxy.icap.com.co/seticap/api/`

**Authentication:** Bearer token (Base64 encoded)

**Endpoints:**
1. `/estadisticas/estadisticasPrecioMercado/` - Current prices (TRM, high, low, open)
2. `/estadisticas/estadisticasPromedioCierre/` - Closing and average prices
3. `/estadisticas/estadisticasMontoMercado/` - Volume and transaction data
4. `/graficos/graficoMoneda/` - Intraday chart data

**Request Payload:**
```json
{
  "fecha": "2026-01-08",
  "mercado": 71,
  "moneda": 1,
  "delay": 15
}
```

### 16.2 Technology Version Matrix

| Technology | Version | Reasoning |
|------------|---------|-----------|
| React | 18.3.x | Latest stable with concurrent features |
| TypeScript | 5.3.x | Strong typing, latest language features |
| Node.js | 20.x LTS | Azure Functions support, long-term support |
| MongoDB | 6.0+ | Time-series collections, improved performance |
| Vite | 5.x | Fast builds, modern tooling |
| TailwindCSS | 3.x | Utility-first, excellent performance |
| Recharts | 2.x | Modern React charts, TypeScript support |

### 16.3 Environment Variables

**Frontend (.env):**
```bash
VITE_API_BASE_URL=https://your-app.azurestaticapps.net/api
VITE_APPINSIGHTS_CONNECTION_STRING=InstrumentationKey=...
```

**Backend (local.settings.json):**
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "MONGODB_CONNECTION_STRING": "mongodb://...",
    "ICAP_API_TOKEN": "U2FsdGVkX19...",
    "APPINSIGHTS_INSTRUMENTATIONKEY": "..."
  }
}
```

---

## Document Version

**Version:** 1.0
**Date:** 2026-01-08
**Author:** Claude (Anthropic)
**Status:** Draft for Review

---

## Approval and Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Owner | Victor V | | |
| Technical Lead | | | |
| DevOps Engineer | | | |

---

*This document will be updated as the project progresses and requirements evolve.*
