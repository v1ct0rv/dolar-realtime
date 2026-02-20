import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb';
import { getTRMAnalysisPipeline, getTRMSummaryPipeline } from '@/lib/aggregations';
import { TRMAnalysisReport, ApiResponse } from '@/types';

/**
 * GET /api/reports/trm-analysis
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Validate params
    if (!startDate || !endDate) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'startDate and endDate query parameters are required (format: YYYY-MM-DD)',
        },
        { status: 400 }
      );
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Invalid date format. Use YYYY-MM-DD',
        },
        { status: 400 }
      );
    }

    // Get database
    const db = await getDatabase();
    const dolarCollection = db.collection(COLLECTIONS.DOLAR_DATA);

    // Run aggregation pipelines
    const [dailyDataResult, summaryResult] = await Promise.all([
      dolarCollection.aggregate(getTRMAnalysisPipeline(startDate, endDate)).toArray(),
      dolarCollection.aggregate(getTRMSummaryPipeline(startDate, endDate)).toArray(),
    ]);

    // Process results
    const dailyData = dailyDataResult.map((item) => ({
      date: item.date,
      trm: item.trm,
      marketClose: item.marketClose,
      deviation: item.deviation,
      deviationPercent: item.deviationPercent,
    }));

    const summary = summaryResult[0] || {
      avgDeviation: 0,
      maxDeviation: 0,
      minDeviation: 0,
      stdDeviation: 0,
      daysMarketAboveTRM: 0,
      daysMarketBelowTRM: 0,
      daysAtTRM: 0,
      totalDays: 0,
    };

    // Calculate trends
    const trends = calculateTrends(dailyData);

    // Generate alerts
    const alerts = generateAlerts(dailyData, summary);

    const report: TRMAnalysisReport = {
      dateRange: {
        start: startDate,
        end: endDate,
      },
      summary: {
        avgDeviation: summary.avgDeviation,
        maxDeviation: summary.maxDeviation,
        minDeviation: summary.minDeviation,
        stdDeviation: summary.stdDeviation,
        correlation: calculateCorrelation(dailyData),
      },
      distribution: {
        daysMarketAboveTRM: summary.daysMarketAboveTRM,
        daysMarketBelowTRM: summary.daysMarketBelowTRM,
        daysAtTRM: summary.daysAtTRM,
        totalDays: summary.totalDays,
      },
      dailyData,
      trends,
      alerts,
    };

    return NextResponse.json<ApiResponse<TRMAnalysisReport>>(
      {
        success: true,
        data: report,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('Error in TRM Analysis API:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate trends from daily data
 */
function calculateTrends(dailyData: any[]) {
  if (dailyData.length === 0) {
    return {
      currentTrend: 'at_trm' as const,
      consecutiveDays: 0,
      rollingAvgDeviation30d: 0,
    };
  }

  // Get last 30 days for rolling average
  const last30Days = dailyData.slice(-30);
  const rollingAvgDeviation30d =
    last30Days.reduce((sum, day) => sum + day.deviation, 0) / last30Days.length;

  // Calculate consecutive days
  let consecutiveDays = 0;
  let currentTrend: 'market_above_trm' | 'market_below_trm' | 'at_trm' = 'at_trm';

  for (let i = dailyData.length - 1; i >= 0; i--) {
    const deviation = dailyData[i].deviation;
    let trend: 'market_above_trm' | 'market_below_trm' | 'at_trm';

    if (deviation > 5) {
      trend = 'market_above_trm';
    } else if (deviation < -5) {
      trend = 'market_below_trm';
    } else {
      trend = 'at_trm';
    }

    if (i === dailyData.length - 1) {
      currentTrend = trend;
      consecutiveDays = 1;
    } else if (trend === currentTrend) {
      consecutiveDays++;
    } else {
      break;
    }
  }

  return {
    currentTrend,
    consecutiveDays,
    rollingAvgDeviation30d,
  };
}

/**
 * Generate alerts based on analysis
 */
function generateAlerts(dailyData: any[], summary: any) {
  const alerts: any[] = [];

  if (dailyData.length === 0) return alerts;

  const latestDay = dailyData[dailyData.length - 1];

  // Alert for high deviation
  if (Math.abs(latestDay.deviationPercent) > 1) {
    alerts.push({
      type: 'high_deviation',
      severity: 'warning',
      message: `Current deviation of ${latestDay.deviation.toFixed(2)} (${latestDay.deviationPercent.toFixed(2)}%) exceeds 1% threshold`,
    });
  }

  // Alert for sustained trend
  const trends = calculateTrends(dailyData);
  if (trends.consecutiveDays >= 5) {
    const direction = trends.currentTrend === 'market_above_trm' ? 'above' : 'below';
    alerts.push({
      type: 'sustained_deviation',
      severity: 'info',
      message: `Market has been ${direction} TRM for ${trends.consecutiveDays} consecutive days`,
    });
  }

  // Alert for unusual deviation
  if (summary.totalDays > 0) {
    const percentile = calculatePercentile(
      dailyData.map((d) => Math.abs(d.deviation)),
      Math.abs(latestDay.deviation)
    );
    if (percentile >= 95) {
      alerts.push({
        type: 'unusual_deviation',
        severity: 'warning',
        message: `Current deviation is in the ${percentile.toFixed(0)}th percentile for this period`,
      });
    }
  }

  return alerts;
}

/**
 * Calculate correlation coefficient between TRM and market price
 */
function calculateCorrelation(dailyData: any[]): number {
  if (dailyData.length < 2) return 0;

  const trmValues = dailyData.map((d) => d.trm);
  const marketValues = dailyData.map((d) => d.marketClose);

  const meanTrm = trmValues.reduce((a, b) => a + b, 0) / trmValues.length;
  const meanMarket = marketValues.reduce((a, b) => a + b, 0) / marketValues.length;

  let numerator = 0;
  let denomTrm = 0;
  let denomMarket = 0;

  for (let i = 0; i < dailyData.length; i++) {
    const diffTrm = trmValues[i] - meanTrm;
    const diffMarket = marketValues[i] - meanMarket;

    numerator += diffTrm * diffMarket;
    denomTrm += diffTrm * diffTrm;
    denomMarket += diffMarket * diffMarket;
  }

  const denominator = Math.sqrt(denomTrm * denomMarket);

  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Calculate percentile rank
 */
function calculatePercentile(values: number[], target: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = sorted.findIndex((v) => v >= target);
  if (index === -1) return 100;
  return (index / sorted.length) * 100;
}
