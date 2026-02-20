# Suggested Reports and Data Visualizations

## Overview

This document provides detailed specifications for the analytics and reporting features to be added to the Dolar Realtime React rewrite. Each report includes purpose, data requirements, visualizations, and business value.

---

## 1. Daily Summary Report

### Purpose
Provide a comprehensive overview of a single trading day's activity with key metrics and insights.

### Data Points
- Opening price (first transaction)
- Closing price (last transaction)
- High price (maximum during the day)
- Low price (minimum during the day)
- Weighted average price
- TRM (official rate)
- Total volume traded (USD)
- Number of transactions
- Average transaction size
- Opening-closing spread
- High-low range (volatility indicator)
- TRM deviation (market price vs. official rate)

### Visualizations

**1. Price Action Chart (OHLC Candlestick)**
- Single candlestick showing open, high, low, close
- Horizontal line for TRM
- Color coding: green (close > open), red (close < open)

**2. Intraday Price Movement**
- Line chart with all price points throughout the day
- Shaded area showing high-low envelope
- TRM reference line

**3. Volume Distribution**
- Bar chart showing transactions grouped by hour
- Highlight peak trading hours
- Average transaction size overlay

**4. Key Metrics Cards**
```
┌─────────────────┬─────────────────┬─────────────────┐
│ Price Range     │ Total Volume    │ Avg Transaction │
│ $3,950 - $4,050 │ $125.5M USD     │ $2.1M           │
│ ▲ 2.5% spread   │ ▲ 15% vs prev   │ ▼ 5% vs prev    │
└─────────────────┴─────────────────┴─────────────────┘
```

### API Response Example
```json
{
  "date": "2026-01-08",
  "summary": {
    "openPrice": 3950.25,
    "closePrice": 4048.75,
    "highPrice": 4062.00,
    "lowPrice": 3945.00,
    "avgPrice": 4001.23,
    "trm": 4035.50
  },
  "volume": {
    "total": 125500000,
    "transactions": 547,
    "avgTransactionSize": 2294150,
    "maxTransaction": 8500000,
    "minTransaction": 50000
  },
  "analysis": {
    "priceRange": 117.00,
    "volatilityPercent": 2.92,
    "trmDeviation": 13.25,
    "trmDeviationPercent": 0.33
  },
  "comparison": {
    "previousDay": {
      "closePrice": 4021.50,
      "priceChange": 27.25,
      "priceChangePercent": 0.68,
      "volumeChange": 15.2
    }
  }
}
```

### Business Value
- Quick daily performance assessment
- Identify unusual trading patterns
- Compare market price vs. official TRM
- Track daily volatility trends

---

## 2. Weekly Trend Report

### Purpose
Analyze 5-day (weekly) trends to identify patterns, momentum, and week-over-week changes.

### Data Points
- Daily closing prices (5 days)
- 5-day moving average
- Weekly high/low
- Total weekly volume
- Average daily transactions
- Week-over-week price change
- Week-over-week volume change
- Trend direction (bullish/bearish/sideways)

### Visualizations

**1. Weekly Price Trend Chart**
- Line chart with daily closing prices
- 5-day moving average overlay
- Shaded areas for price above/below MA
- Week start and end markers

**2. Weekly Volume Analysis**
- Stacked bar chart for daily volumes
- Cumulative volume line
- Average daily volume reference line

**3. Price Distribution Histogram**
- Frequency distribution of prices during the week
- Shows most common trading ranges
- Highlight mean and median prices

**4. Momentum Indicator**
- Visual gauge showing trend strength
- Categories: Strong Bullish, Weak Bullish, Sideways, Weak Bearish, Strong Bearish
- Based on price change and volume analysis

### Calculations

**Trend Strength:**
```javascript
// Price momentum
const priceChange = (weekEnd - weekStart) / weekStart * 100;

// Volume-weighted trend
const volumeWeight = currentWeekVolume / previousWeekVolume;

// Volatility factor (higher = more uncertainty)
const volatility = (weekHigh - weekLow) / weekAvg * 100;

// Trend score (-100 to +100)
const trendScore = priceChange * volumeWeight * (1 - volatility/10);
```

**Trend Categories:**
- Strong Bullish: score > 5
- Weak Bullish: score 1 to 5
- Sideways: score -1 to 1
- Weak Bearish: score -5 to -1
- Strong Bearish: score < -5

### API Response Example
```json
{
  "weekStartDate": "2026-01-05",
  "weekEndDate": "2026-01-09",
  "dailyData": [
    { "date": "2026-01-05", "close": 4021.50, "volume": 98500000 },
    { "date": "2026-01-06", "close": 4035.25, "volume": 112300000 },
    { "date": "2026-01-07", "close": 4028.00, "volume": 105600000 },
    { "date": "2026-01-08", "close": 4048.75, "volume": 125500000 },
    { "date": "2026-01-09", "close": 4055.50, "volume": 118900000 }
  ],
  "summary": {
    "movingAverage5d": 4037.80,
    "weekHigh": 4062.00,
    "weekLow": 3985.25,
    "weekOpen": 4015.00,
    "weekClose": 4055.50,
    "weekVolume": 560800000,
    "avgDailyVolume": 112160000,
    "avgDailyTransactions": 523
  },
  "analysis": {
    "priceChange": 40.50,
    "priceChangePercent": 1.01,
    "volumeChange": 8.5,
    "trendDirection": "bullish",
    "trendStrength": 6.2,
    "volatilityPercent": 1.89
  },
  "comparison": {
    "previousWeek": {
      "weekClose": 4021.50,
      "priceChangePercent": 0.85,
      "volumeChangePercent": 8.5
    }
  }
}
```

### Business Value
- Identify weekly trading patterns
- Spot momentum shifts early
- Compare week-over-week performance
- Trading strategy insights

---

## 3. Monthly Overview

### Purpose
Comprehensive monthly analysis with statistical insights and long-term trends.

### Data Points
- Monthly opening/closing prices
- Monthly high/low
- Monthly average price
- Total monthly volume
- Average daily volume
- Number of trading days
- Best/worst trading days
- TRM correlation
- Month-over-month comparisons

### Visualizations

**1. Monthly Calendar Heat Map**
- Calendar view with each day colored by performance
- Green (price increased), Red (price decreased), Gray (weekend/holiday)
- Intensity based on percentage change
- Hover to see daily details

**2. Monthly Price Chart**
- Candlestick chart for each trading day
- 20-day moving average
- Volume bars at bottom
- Mark significant events/outliers

**3. Volume Analysis**
- Daily volume bar chart
- Cumulative volume line
- Trading days vs. non-trading days

**4. Statistical Summary Table**
```
┌────────────────────┬──────────────┬──────────────┐
│ Metric             │ Current Month│ Previous Month│
├────────────────────┼──────────────┼──────────────┤
│ Avg Price          │ $4,025.50    │ $3,985.25    │
│ Std Deviation      │ $45.20       │ $52.30       │
│ Coefficient of Var │ 1.12%        │ 1.31%        │
│ Skewness           │ 0.15         │ -0.22        │
│ Total Volume       │ $2.5B        │ $2.3B        │
│ Trading Days       │ 22           │ 21           │
└────────────────────┴──────────────┴──────────────┘
```

**5. Price Distribution**
- Box plot showing quartiles
- Whiskers for min/max
- Outlier points marked
- Comparison with previous months

### Advanced Metrics

**Coefficient of Variation (Volatility):**
```javascript
const cv = (stdDeviation / mean) * 100;
// Lower CV = more stable prices
```

**Skewness (Distribution Asymmetry):**
```javascript
// Positive skew: more high-price days
// Negative skew: more low-price days
// Near zero: symmetric distribution
```

**Best/Worst Days:**
- Top 5 days with highest gains
- Top 5 days with largest drops
- Highest volume days
- Most volatile days

### API Response Example
```json
{
  "year": 2026,
  "month": 1,
  "summary": {
    "monthOpen": 3985.50,
    "monthClose": 4055.50,
    "monthHigh": 4125.00,
    "monthLow": 3950.00,
    "monthAvg": 4025.50,
    "tradingDays": 22,
    "totalVolume": 2485000000,
    "avgDailyVolume": 112954545
  },
  "statistics": {
    "stdDeviation": 45.20,
    "coefficientOfVariation": 1.12,
    "skewness": 0.15,
    "kurtosis": 2.85
  },
  "topDays": {
    "bestGains": [
      { "date": "2026-01-15", "change": 2.5, "price": 4105.25 },
      { "date": "2026-01-22", "change": 1.8, "price": 4085.50 }
    ],
    "worstDrops": [
      { "date": "2026-01-08", "change": -1.5, "price": 3965.75 }
    ],
    "highestVolume": [
      { "date": "2026-01-20", "volume": 185500000 }
    ]
  },
  "comparison": {
    "previousMonth": {
      "monthClose": 3985.50,
      "priceChange": 70.00,
      "priceChangePercent": 1.76,
      "volumeChange": 8.3
    }
  }
}
```

### Business Value
- Long-term trend analysis
- Statistical insights for forecasting
- Identify seasonal patterns
- Performance benchmarking

---

## 4. TRM Analysis Dashboard

### Purpose
Deep dive into the relationship between market prices and the official TRM (Tasa Representativa del Mercado).

### Data Points
- Daily TRM values
- Daily closing market prices
- TRM deviation (market - TRM)
- Days when market > TRM
- Days when market < TRM
- Average spread between market and TRM
- Maximum/minimum deviations
- Correlation coefficient
- Trend analysis of deviations over time

### Visualizations

**1. Market vs. TRM Dual Line Chart**
- Two lines: Market closing price (blue), TRM (orange)
- Shaded area between lines showing deviation
- Color coding: green when market > TRM, red when market < TRM

**2. Deviation Heat Map**
- X-axis: Date
- Y-axis: Deviation amount (market - TRM)
- Color intensity: magnitude of deviation
- Zero line highlighted

**3. Distribution Analysis**
```
Deviation Distribution:

Below TRM    │████████░░░░░░░░░░░░│ 40% (88 days)
At TRM (±5)  │██████░░░░░░░░░░░░░░│ 30% (66 days)
Above TRM    │██████░░░░░░░░░░░░░░│ 30% (66 days)
```

**4. Statistical Breakdown Table**
```
┌─────────────────────┬──────────┬──────────┬──────────┐
│                     │ 30 Days  │ 90 Days  │ 1 Year   │
├─────────────────────┼──────────┼──────────┼──────────┤
│ Avg Deviation       │ +$12.50  │ +$8.25   │ +$5.75   │
│ Max Deviation       │ +$45.00  │ +$58.30  │ +$85.00  │
│ Min Deviation       │ -$22.50  │ -$35.00  │ -$42.50  │
│ Correlation         │ 0.95     │ 0.93     │ 0.91     │
│ Days Market > TRM   │ 18 (60%) │ 54 (60%) │ 210 (58%)│
└─────────────────────┴──────────┴──────────┴──────────┘
```

**5. Deviation Trend Chart**
- Rolling 30-day average deviation
- Shows if market is trending above or below TRM
- Highlight periods of sustained deviation

### Insights and Alerts

**Alerts:**
- Deviation exceeds ±1% of TRM
- 5 consecutive days market > TRM (or vice versa)
- Deviation trend reversal detected
- Unusual TRM change (>0.5% day-over-day)

**Insights:**
- "Market has been above TRM for 12 consecutive days, averaging +$15.20"
- "Current deviation of +$35.50 is in the 95th percentile for this year"
- "TRM-market correlation has weakened to 0.85 in the last 30 days"

### API Response Example
```json
{
  "dateRange": {
    "start": "2025-10-08",
    "end": "2026-01-08"
  },
  "summary": {
    "avgDeviation": 8.25,
    "maxDeviation": 58.30,
    "minDeviation": -35.00,
    "stdDeviation": 18.75,
    "correlation": 0.93
  },
  "distribution": {
    "daysMarketAboveTRM": 54,
    "daysMarketBelowTRM": 35,
    "daysAtTRM": 1,
    "totalDays": 90
  },
  "dailyData": [
    {
      "date": "2026-01-08",
      "trm": 4035.50,
      "marketClose": 4048.75,
      "deviation": 13.25,
      "deviationPercent": 0.33
    }
  ],
  "trends": {
    "currentTrend": "market_above_trm",
    "consecutiveDays": 12,
    "rollingAvgDeviation30d": 15.20
  },
  "alerts": [
    {
      "type": "sustained_deviation",
      "severity": "info",
      "message": "Market has been above TRM for 12 consecutive days"
    }
  ]
}
```

### Business Value
- Understand market dynamics vs. official rate
- Identify arbitrage opportunities
- Regulatory compliance insights
- Market sentiment indicator

---

## 5. Volatility Report

### Purpose
Measure and analyze price volatility patterns to assess market stability and risk.

### Data Points
- Intraday volatility (high - low)
- Standard deviation of prices
- Average True Range (ATR)
- Bollinger Bands
- Historical Volatility (HV)
- Implied volatility trends
- Most volatile hours of the day
- Volatility calendar heat map

### Visualizations

**1. Bollinger Bands Chart**
- Price line with 20-day moving average
- Upper band (+2 std dev)
- Lower band (-2 std dev)
- Price touching/breaking bands highlighted

**2. Intraday Volatility by Hour**
- Bar chart showing average volatility per hour (9 AM - 5 PM)
- Identify most volatile trading hours
- Compare weekdays vs. overall average

**3. Volatility Calendar Heat Map**
- Grid view: days of month
- Color intensity: volatility level
- Green (low), Yellow (medium), Red (high)

**4. Historical Volatility Trend**
- Line chart of rolling 30-day volatility
- Highlight periods of high/low volatility
- Mark significant market events

**5. Volatility Metrics Dashboard**
```
┌────────────────────────────────────────────────────────┐
│ Current Volatility: 1.85% (MEDIUM)                     │
├────────────────────┬───────────┬───────────┬───────────┤
│ Period             │ Volatility│ Percentile│ Category  │
├────────────────────┼───────────┼───────────┼───────────┤
│ Today              │ 1.42%     │ 45th      │ Low       │
│ 7-Day Avg          │ 1.85%     │ 62nd      │ Medium    │
│ 30-Day Avg         │ 2.15%     │ 75th      │ High      │
│ 90-Day Avg         │ 1.92%     │ 68th      │ Medium    │
└────────────────────┴───────────┴───────────┴───────────┘
```

### Calculations

**Intraday Volatility (Simple):**
```javascript
const intradayVolatility = (dayHigh - dayLow) / dayAvg * 100;
```

**Historical Volatility (Standard Deviation):**
```javascript
// Annualized volatility based on daily returns
const dailyReturns = prices.map((price, i) =>
  i > 0 ? Math.log(price / prices[i-1]) : 0
);
const stdDev = calculateStdDev(dailyReturns);
const annualizedVolatility = stdDev * Math.sqrt(252) * 100; // 252 trading days/year
```

**Average True Range (ATR):**
```javascript
// Measures volatility considering gaps
const trueRange = Math.max(
  high - low,
  Math.abs(high - previousClose),
  Math.abs(low - previousClose)
);
const atr14 = calculateMovingAverage(trueRanges, 14);
```

**Volatility Categories:**
- Very Low: < 1%
- Low: 1% - 1.5%
- Medium: 1.5% - 2.5%
- High: 2.5% - 4%
- Very High: > 4%

### API Response Example
```json
{
  "dateRange": {
    "start": "2025-10-08",
    "end": "2026-01-08"
  },
  "current": {
    "intradayVolatility": 1.42,
    "historicalVolatility30d": 2.15,
    "averageTrueRange": 55.30,
    "category": "medium"
  },
  "byHour": [
    { "hour": 9, "avgVolatility": 0.85, "transactions": 45 },
    { "hour": 10, "avgVolatility": 1.25, "transactions": 62 },
    { "hour": 11, "avgVolatility": 1.65, "transactions": 78 },
    { "hour": 12, "avgVolatility": 0.95, "transactions": 52 }
  ],
  "bollingerBands": {
    "movingAverage": 4025.50,
    "upperBand": 4115.90,
    "lowerBand": 3935.10,
    "bandwidth": 180.80,
    "percentB": 0.65
  },
  "trends": {
    "rollingVolatility": [
      { "date": "2025-12-08", "volatility": 2.45 },
      { "date": "2026-01-08", "volatility": 2.15 }
    ],
    "direction": "decreasing",
    "percentileRank": 75
  },
  "extremes": {
    "mostVolatileDay": {
      "date": "2025-12-15",
      "volatility": 4.25,
      "high": 4150.00,
      "low": 3975.00
    },
    "leastVolatileDay": {
      "date": "2026-01-03",
      "volatility": 0.55,
      "high": 4010.00,
      "low": 3988.00
    }
  }
}
```

### Business Value
- Risk assessment for traders
- Identify calm vs. turbulent periods
- Trading strategy optimization (volatility-based)
- Market stability monitoring

---

## 6. Volume Analysis Report

### Purpose
Analyze trading volume patterns to understand market participation, liquidity, and activity trends.

### Data Points
- Hourly volume distribution
- Transaction count trends
- Average transaction size
- Large transaction alerts (> 2 std dev)
- Volume-weighted average price (VWAP)
- Volume trends over time
- Busiest trading days/hours
- Volume anomalies

### Visualizations

**1. Volume by Hour of Day (Histogram)**
- Bar chart showing USD volume per hour
- Transaction count overlay (line)
- Average transaction size (bar color gradient)
- Identify peak trading times

**2. Volume Trend Chart**
- Daily total volume bars
- 7-day moving average line
- Year-over-year comparison (if data available)

**3. Transaction Size Distribution**
- Histogram of transaction sizes
- Buckets: <$500K, $500K-$1M, $1M-$2M, $2M-$5M, >$5M
- Highlight large transactions (outliers)

**4. Volume Heat Map (Time-of-Day × Day-of-Week)**
```
         Mon    Tue    Wed    Thu    Fri
9 AM    ████   ███    ████   ███    ██
10 AM   █████  ████   █████  ████   ███
11 AM   ██████ █████  ██████ █████  ████
12 PM   ████   ████   ████   ███    ███
1 PM    ███    ████   ████   ████   ████
2 PM    ████   █████  ████   █████  ████
3 PM    █████  ████   █████  ████   ████
4 PM    ████   ███    ████   ███    ███
5 PM    ███    ███    ███    ██     ██

Legend: ██ Low  ███ Medium  ████ High  █████ Very High
```

**5. VWAP Chart**
- Price line with VWAP overlay
- Shows if current price is above/below average traded price
- Useful for institutional traders

### Calculations

**Volume-Weighted Average Price (VWAP):**
```javascript
const vwap = transactions.reduce((sum, txn) =>
  sum + (txn.price * txn.volume), 0
) / totalVolume;
```

**Large Transaction Detection:**
```javascript
const avgSize = totalVolume / transactionCount;
const stdDev = calculateStdDev(transactionSizes);
const threshold = avgSize + (2 * stdDev);
const largeTransactions = transactions.filter(t => t.volume > threshold);
```

**Volume Momentum:**
```javascript
// Compare current period volume to historical average
const volumeMomentum = (currentVolume / avgHistoricalVolume - 1) * 100;
// Positive = increasing participation, Negative = decreasing
```

### API Response Example
```json
{
  "dateRange": {
    "start": "2026-01-01",
    "end": "2026-01-08"
  },
  "summary": {
    "totalVolume": 898500000,
    "avgDailyVolume": 112312500,
    "totalTransactions": 3845,
    "avgTransactionSize": 2336450,
    "largestTransaction": 12500000,
    "smallestTransaction": 25000
  },
  "volumeByHour": [
    { "hour": 9, "volume": 45500000, "transactions": 185, "avgSize": 2459459 },
    { "hour": 10, "volume": 78200000, "transactions": 312, "avgSize": 2506410 },
    { "hour": 11, "volume": 95300000, "transactions": 378, "avgSize": 2521164 }
  ],
  "vwap": {
    "daily": [
      { "date": "2026-01-08", "vwap": 4028.35, "closePrice": 4048.75 }
    ]
  },
  "largeTransactions": [
    {
      "timestamp": "2026-01-08T11:23:45Z",
      "volume": 12500000,
      "price": 4035.50,
      "deviationFromAvg": 4.35
    }
  ],
  "trends": {
    "volumeMomentum": 8.5,
    "direction": "increasing",
    "busiestDay": {
      "date": "2026-01-08",
      "volume": 125500000,
      "percentile": 92
    },
    "quietestDay": {
      "date": "2026-01-02",
      "volume": 78200000,
      "percentile": 25
    }
  },
  "heatMap": [
    { "dayOfWeek": "Monday", "hour": 9, "avgVolume": 45000000 },
    { "dayOfWeek": "Monday", "hour": 10, "avgVolume": 78000000 }
  ]
}
```

### Alerts and Insights

**Volume Alerts:**
- Daily volume exceeds 150% of 30-day average
- Transaction count drops below 200 (low liquidity warning)
- Large transaction detected (>$10M)
- Unusual hour-of-day activity (e.g., high volume at 9 AM)

**Insights:**
- "Trading volume is 35% higher than usual, indicating increased market interest"
- "Most active trading hour: 11 AM with avg $95M traded"
- "Large transactions (>$5M) represent 15% of total volume"

### Business Value
- Liquidity assessment
- Identify optimal trading times
- Detect unusual market activity
- Volume-based trading strategies

---

## 7. Correlation and Multi-Factor Analysis (Future Enhancement)

### Purpose
Analyze correlations between dollar exchange rate and external factors.

### Potential Data Sources to Integrate
- Brent oil prices (already available)
- USD Index (DXY)
- Colombian stock market (COLCAP index)
- Interest rate differentials
- Inflation data (Colombia vs. USA)
- Political/economic events calendar

### Visualizations
- Correlation matrix heat map
- Scatter plots with regression lines
- Multi-factor line chart overlay
- Event impact analysis

### Business Value
- Understand market drivers
- Predictive modeling inputs
- Macro-economic insights

---

## 8. Comparative Analysis (Future Enhancement)

### Purpose
Compare Colombian peso with other Latin American currencies.

### Currencies to Track
- Mexican Peso (MXN/USD)
- Brazilian Real (BRL/USD)
- Chilean Peso (CLP/USD)
- Argentine Peso (ARS/USD)

### Visualizations
- Multi-currency line chart
- Relative performance comparison
- Correlation matrix
- Regional heat map

### Business Value
- Regional market context
- Cross-currency trading opportunities
- Economic policy comparisons

---

## 9. Export and Sharing Features

### Export Formats
1. **CSV**: Raw data export with customizable columns
2. **Excel**: Formatted report with charts embedded
3. **PDF**: Professional report with branding
4. **JSON**: API-friendly format for integrations

### Share Features
- Generate shareable link with read-only access
- Embed widgets (charts) in external websites
- Scheduled email reports (daily/weekly/monthly)
- Slack/Teams webhook integrations

---

## 10. Report Customization Options

### User Preferences
- Date range presets
- Chart type selection (line, candlestick, area)
- Color scheme (light/dark mode)
- Metric units (thousands, millions)
- Decimal precision
- Language (Spanish/English)

### Saved Reports
- Save custom report configurations
- Quick access to favorite views
- Report templates library

---

## Implementation Priority

### Phase 1 (MVP)
1. Daily Summary Report
2. TRM Analysis Dashboard
3. Basic export (CSV)

### Phase 2
4. Weekly Trend Report
5. Monthly Overview
6. Volatility Report

### Phase 3
7. Volume Analysis Report
8. Advanced exports (PDF, Excel)
9. Share features

### Future Phases
10. Correlation analysis
11. Comparative analysis
12. Predictive analytics

---

## Performance Considerations

### Data Aggregation
- Pre-calculate aggregations in background jobs
- Cache frequently accessed reports
- Use MongoDB aggregation pipelines efficiently
- Implement pagination for large datasets

### Chart Rendering
- Lazy load charts (only render visible ones)
- Use canvas-based charting for large datasets
- Implement data sampling for historical charts (>1 year)
- Progressive loading for complex reports

### API Optimization
- Cache report results for 5-15 minutes
- Use Redis for hot data caching
- Implement ETags for conditional requests
- Compress responses (gzip)

---

## Accessibility and Usability

### Accessibility Standards (WCAG 2.1 AA)
- Keyboard navigation for all interactive elements
- Screen reader support with proper ARIA labels
- High contrast mode support
- Text alternatives for charts (data tables)
- Focus indicators on all interactive elements

### Mobile Responsiveness
- Touch-friendly chart interactions
- Responsive tables (horizontal scroll or stacking)
- Simplified mobile layouts
- Progressive web app (PWA) support

---

## Monitoring and Analytics for Reports

### Track Usage Metrics
- Most viewed reports
- Average time spent on each report
- Export frequency by format
- Date range selections (identify popular periods)
- Chart interaction events (zoom, pan, hover)

### Application Insights Custom Events
```javascript
trackEvent('ReportViewed', {
  reportType: 'daily_summary',
  dateRange: '2026-01-08',
  loadTime: 1250
});

trackEvent('DataExported', {
  reportType: 'monthly_overview',
  format: 'csv',
  dateRange: '2026-01',
  rowCount: 720
});
```

---

*This document will evolve as user feedback is incorporated and new analytical needs are identified.*
