// Core data types for the application

export interface DolarData {
  _id?: string;
  timestamp: Date;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
  price: number; // Closing price
  amount: number; // Latest amount traded in USD with closing price
  openPrice: number;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  volume: number; // Amount traded in USD
  transactions: number;
  metadata: {
    source: string; // "ICAP"
    marketId: number; // 71
    delay: number; // 15
  };
}

export interface TRMData {
  _id?: string;
  date: string; // YYYY-MM-DD
  value: number; // TRM rate
  change: 'up' | 'down' | 'equal';
  previousValue?: number;
  source: string; // "ICAP"
  createdAt: Date;
}

export interface CurrentStats {
  trm: number;
  trmPriceChange: "up" | "down" | "equal";
  price: number;
  openPrice: number;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  maxPriceChange: "up" | "down" | "equal";
  minPriceChange: "up" | "down" | "equal";
  openPriceChange: "up" | "down" | "equal";
  totalAmount: number;
  latestAmount: number;
  avgAmount: number;
  minAmount: number;
  maxAmount: number;
  transactions: number;
}

export interface IntradayData {
  precio: [number, number][]; // [timestamp, price]
  monto: [number, number][]; // [timestamp, amount]
}

// TRM Analysis Report Types
export interface TRMAnalysisData {
  date: string;
  trm: number;
  marketClose: number;
  deviation: number;
  deviationPercent: number;
}

export interface TRMAnalysisSummary {
  avgDeviation: number;
  maxDeviation: number;
  minDeviation: number;
  stdDeviation: number;
  correlation: number;
}

export interface TRMAnalysisDistribution {
  daysMarketAboveTRM: number;
  daysMarketBelowTRM: number;
  daysAtTRM: number;
  totalDays: number;
}

export interface TRMAnalysisTrends {
  currentTrend: 'market_above_trm' | 'market_below_trm' | 'at_trm';
  consecutiveDays: number;
  rollingAvgDeviation30d: number;
}

export interface TRMAnalysisAlert {
  type: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
}

export interface TRMAnalysisReport {
  dateRange: {
    start: string;
    end: string;
  };
  summary: TRMAnalysisSummary;
  distribution: TRMAnalysisDistribution;
  dailyData: TRMAnalysisData[];
  trends: TRMAnalysisTrends;
  alerts: TRMAnalysisAlert[];
}

// Historical Report Types
export interface HistoricalDayData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  avgPrice: number;
  volume: number;
  transactions: number;
  trm: number | null;
  deviation: number | null;
}

export interface HistoricalSummary {
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  firstOpen: number;
  lastClose: number;
  priceChange: number;
  priceChangePercent: number;
  totalVolume: number;
  tradingDays: number;
}

export interface HistoricalReport {
  dateRange: { start: string; end: string };
  summary: HistoricalSummary;
  dailyData: HistoricalDayData[];
}

// TRM History Report Types
export interface TRMHistoryDayData {
  date: string;
  value: number;
  change: 'up' | 'down' | 'equal';
  previousValue: number | null;
  delta: number | null;
  deltaPercent: number | null;
}

export interface TRMHistorySummary {
  firstValue: number;
  lastValue: number;
  minValue: number;
  maxValue: number;
  avgValue: number;
  totalChange: number;
  totalChangePercent: number;
  daysUp: number;
  daysDown: number;
  daysEqual: number;
  tradingDays: number;
}

export interface TRMHistoryReport {
  dateRange: { start: string; end: string };
  summary: TRMHistorySummary;
  dailyData: TRMHistoryDayData[];
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
