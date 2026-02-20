import { Document } from 'mongodb';

/**
 * MongoDB Aggregation Pipelines for Reports and Analytics
 */

/**
 * TRM Analysis Aggregation Pipeline
 * Joins dolarData and trmData to calculate deviations
 */
export function getTRMAnalysisPipeline(startDate: string, endDate: string): Document[] {
  return [
    // Match date range
    {
      $match: {
        date: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    // Group by date to get daily closing price
    {
      $group: {
        _id: '$date',
        marketClose: { $last: '$price' },
        timestamp: { $last: '$timestamp' },
      },
    },
    // Sort by date
    {
      $sort: { _id: 1 },
    },
    // Lookup TRM data
    {
      $lookup: {
        from: 'trmData',
        localField: '_id',
        foreignField: 'date',
        as: 'trmInfo',
      },
    },
    // Unwind TRM data
    {
      $unwind: {
        path: '$trmInfo',
        preserveNullAndEmptyArrays: true,
      },
    },
    // Project final fields
    {
      $project: {
        _id: 0,
        date: '$_id',
        trm: { $ifNull: ['$trmInfo.value', 0] },
        marketClose: 1,
        deviation: {
          $subtract: ['$marketClose', { $ifNull: ['$trmInfo.value', 0] }],
        },
        deviationPercent: {
          $cond: {
            if: { $gt: [{ $ifNull: ['$trmInfo.value', 0] }, 0] },
            then: {
              $multiply: [
                {
                  $divide: [
                    { $subtract: ['$marketClose', { $ifNull: ['$trmInfo.value', 0] }] },
                    { $ifNull: ['$trmInfo.value', 1] },
                  ],
                },
                100,
              ],
            },
            else: 0,
          },
        },
      },
    },
  ];
}

/**
 * TRM Summary Statistics Pipeline
 */
export function getTRMSummaryPipeline(startDate: string, endDate: string): Document[] {
  return [
    ...getTRMAnalysisPipeline(startDate, endDate),
    {
      $group: {
        _id: null,
        avgDeviation: { $avg: '$deviation' },
        maxDeviation: { $max: '$deviation' },
        minDeviation: { $min: '$deviation' },
        stdDeviation: { $stdDevPop: '$deviation' },
        daysMarketAboveTRM: {
          $sum: { $cond: [{ $gt: ['$deviation', 5] }, 1, 0] },
        },
        daysMarketBelowTRM: {
          $sum: { $cond: [{ $lt: ['$deviation', -5] }, 1, 0] },
        },
        daysAtTRM: {
          $sum: {
            $cond: [
              { $and: [{ $gte: ['$deviation', -5] }, { $lte: ['$deviation', 5] }] },
              1,
              0,
            ],
          },
        },
        totalDays: { $sum: 1 },
      },
    },
  ];
}

/**
 * Daily Summary Aggregation Pipeline
 */
export function getDailySummaryPipeline(date: string): Document[] {
  return [
    {
      $match: { date },
    },
    {
      $group: {
        _id: '$date',
        openPrice: { $first: '$openPrice' },
        closePrice: { $last: '$price' },
        highPrice: { $max: '$maxPrice' },
        lowPrice: { $min: '$minPrice' },
        avgPrice: { $avg: '$avgPrice' },
        totalVolume: { $sum: '$volume' },
        totalTransactions: { $sum: '$transactions' },
        dataPoints: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'trmData',
        localField: '_id',
        foreignField: 'date',
        as: 'trmInfo',
      },
    },
    {
      $unwind: {
        path: '$trmInfo',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 0,
        date: '$_id',
        summary: {
          openPrice: '$openPrice',
          closePrice: '$closePrice',
          highPrice: '$highPrice',
          lowPrice: '$lowPrice',
          avgPrice: '$avgPrice',
          trm: { $ifNull: ['$trmInfo.value', 0] },
        },
        volume: {
          total: '$totalVolume',
          transactions: '$totalTransactions',
          avgTransactionSize: {
            $cond: {
              if: { $gt: ['$totalTransactions', 0] },
              then: { $divide: ['$totalVolume', '$totalTransactions'] },
              else: 0,
            },
          },
        },
        analysis: {
          priceRange: { $subtract: ['$highPrice', '$lowPrice'] },
          volatilityPercent: {
            $cond: {
              if: { $gt: ['$avgPrice', 0] },
              then: {
                $multiply: [
                  { $divide: [{ $subtract: ['$highPrice', '$lowPrice'] }, '$avgPrice'] },
                  100,
                ],
              },
              else: 0,
            },
          },
          trmDeviation: {
            $subtract: ['$closePrice', { $ifNull: ['$trmInfo.value', 0] }],
          },
          trmDeviationPercent: {
            $cond: {
              if: { $gt: [{ $ifNull: ['$trmInfo.value', 0] }, 0] },
              then: {
                $multiply: [
                  {
                    $divide: [
                      { $subtract: ['$closePrice', { $ifNull: ['$trmInfo.value', 0] }] },
                      { $ifNull: ['$trmInfo.value', 1] },
                    ],
                  },
                  100,
                ],
              },
              else: 0,
            },
          },
        },
      },
    },
  ];
}

/**
 * Weekly Trend Aggregation Pipeline
 */
export function getWeeklyTrendPipeline(startDate: string, endDate: string): Document[] {
  return [
    {
      $match: {
        date: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    {
      $group: {
        _id: '$date',
        close: { $last: '$price' },
        volume: { $sum: '$volume' },
        transactions: { $sum: '$transactions' },
        high: { $max: '$maxPrice' },
        low: { $min: '$minPrice' },
      },
    },
    {
      $sort: { _id: 1 },
    },
    {
      $group: {
        _id: null,
        dailyData: {
          $push: {
            date: '$_id',
            close: '$close',
            volume: '$volume',
            transactions: '$transactions',
          },
        },
        weekHigh: { $max: '$high' },
        weekLow: { $min: '$low' },
        weekVolume: { $sum: '$volume' },
        avgDailyVolume: { $avg: '$volume' },
        avgDailyTransactions: { $avg: '$transactions' },
        tradingDays: { $sum: 1 },
      },
    },
  ];
}

/**
 * Volatility Analysis Pipeline
 */
export function getVolatilityPipeline(startDate: string, endDate: string): Document[] {
  return [
    {
      $match: {
        date: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    {
      $group: {
        _id: '$date',
        high: { $max: '$maxPrice' },
        low: { $min: '$minPrice' },
        avg: { $avg: '$avgPrice' },
        close: { $last: '$price' },
      },
    },
    {
      $project: {
        date: '$_id',
        intradayVolatility: {
          $cond: {
            if: { $gt: ['$avg', 0] },
            then: {
              $multiply: [{ $divide: [{ $subtract: ['$high', '$low'] }, '$avg'] }, 100],
            },
            else: 0,
          },
        },
        high: 1,
        low: 1,
        avg: 1,
        close: 1,
      },
    },
    {
      $sort: { date: 1 },
    },
  ];
}

/**
 * Volume Analysis by Hour Pipeline
 */
export function getVolumeByHourPipeline(startDate: string, endDate: string): Document[] {
  return [
    {
      $match: {
        date: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    {
      $project: {
        hour: { $hour: '$timestamp' },
        volume: 1,
        transactions: 1,
      },
    },
    {
      $group: {
        _id: '$hour',
        avgVolume: { $avg: '$volume' },
        totalVolume: { $sum: '$volume' },
        avgTransactions: { $avg: '$transactions' },
        totalTransactions: { $sum: '$transactions' },
        dataPoints: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        hour: '$_id',
        avgVolume: 1,
        totalVolume: 1,
        transactions: '$totalTransactions',
        avgSize: {
          $cond: {
            if: { $gt: ['$totalTransactions', 0] },
            then: { $divide: ['$totalVolume', '$totalTransactions'] },
            else: 0,
          },
        },
      },
    },
    {
      $sort: { hour: 1 },
    },
  ];
}

/**
 * Monthly Overview Pipeline
 */
export function getMonthlyOverviewPipeline(year: number, month: number): Document[] {
  // Create start and end dates for the month
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDay = new Date(year, month, 0).getDate(); // Last day of month
  const endDate = `${year}-${String(month).padStart(2, '0')}-${endDay}`;

  return [
    {
      $match: {
        date: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    {
      $group: {
        _id: '$date',
        open: { $first: '$openPrice' },
        close: { $last: '$price' },
        high: { $max: '$maxPrice' },
        low: { $min: '$minPrice' },
        avg: { $avg: '$avgPrice' },
        volume: { $sum: '$volume' },
        transactions: { $sum: '$transactions' },
      },
    },
    {
      $sort: { _id: 1 },
    },
    {
      $group: {
        _id: null,
        monthOpen: { $first: '$open' },
        monthClose: { $last: '$close' },
        monthHigh: { $max: '$high' },
        monthLow: { $min: '$low' },
        monthAvg: { $avg: '$avg' },
        tradingDays: { $sum: 1 },
        totalVolume: { $sum: '$volume' },
        avgDailyVolume: { $avg: '$volume' },
        dailyPrices: { $push: '$close' },
      },
    },
    {
      $project: {
        _id: 0,
        monthOpen: 1,
        monthClose: 1,
        monthHigh: 1,
        monthLow: 1,
        monthAvg: 1,
        tradingDays: 1,
        totalVolume: 1,
        avgDailyVolume: 1,
        stdDeviation: { $stdDevPop: '$dailyPrices' },
      },
    },
  ];
}
