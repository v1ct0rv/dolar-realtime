'use client';

import { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
  ReferenceLine,
} from 'recharts';
import { TRMAnalysisReport } from '@/types';

interface TRMAnalysisDashboardProps {
  initialDays?: number;
}

export default function TRMAnalysisDashboard({ initialDays = 30 }: TRMAnalysisDashboardProps) {
  const [report, setReport] = useState<TRMAnalysisReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState(() => {
    const endDate = new Date();
    const startDate = subDays(endDate, initialDays);
    return {
      start: format(startDate, 'yyyy-MM-dd'),
      end: format(endDate, 'yyyy-MM-dd'),
    };
  });

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/reports/trm-analysis?startDate=${dateRange.start}&endDate=${dateRange.end}`
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch report');
      }

      setReport(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSelect = (days: number) => {
    const endDate = new Date();
    const startDate = subDays(endDate, days);
    setDateRange({
      start: format(startDate, 'yyyy-MM-dd'),
      end: format(endDate, 'yyyy-MM-dd'),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold">Error</h3>
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchReport}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            TRM Analysis Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Market vs. Official Rate Comparison
          </p>
        </div>

        {/* Quick Date Selectors */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleQuickSelect(7)}
            className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded"
          >
            7 Days
          </button>
          <button
            onClick={() => handleQuickSelect(30)}
            className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded"
          >
            30 Days
          </button>
          <button
            onClick={() => handleQuickSelect(90)}
            className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded"
          >
            90 Days
          </button>
        </div>
      </div>

      {/* Alerts */}
      {report.alerts.length > 0 && (
        <div className="space-y-2">
          {report.alerts.map((alert, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg ${
                alert.severity === 'error'
                  ? 'bg-red-50 border border-red-200'
                  : alert.severity === 'warning'
                  ? 'bg-yellow-50 border border-yellow-200'
                  : 'bg-blue-50 border border-blue-200'
              }`}
            >
              <p
                className={`${
                  alert.severity === 'error'
                    ? 'text-red-800'
                    : alert.severity === 'warning'
                    ? 'text-yellow-800'
                    : 'text-blue-800'
                }`}
              >
                {alert.message}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Avg Deviation"
          value={`$${report.summary.avgDeviation.toFixed(2)}`}
          subtitle={`${report.summary.avgDeviation > 0 ? '+' : ''}${(
            (report.summary.avgDeviation / 4000) *
            100
          ).toFixed(2)}%`}
          trend={report.summary.avgDeviation > 0 ? 'up' : 'down'}
        />
        <MetricCard
          title="Max Deviation"
          value={`$${report.summary.maxDeviation.toFixed(2)}`}
          subtitle="Highest above TRM"
          trend="neutral"
        />
        <MetricCard
          title="Min Deviation"
          value={`$${report.summary.minDeviation.toFixed(2)}`}
          subtitle="Lowest below TRM"
          trend="neutral"
        />
        <MetricCard
          title="Correlation"
          value={report.summary.correlation.toFixed(3)}
          subtitle="TRM vs Market"
          trend="neutral"
        />
      </div>

      {/* Distribution */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Distribution
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {report.distribution.daysMarketAboveTRM}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Days Above TRM</div>
            <div className="text-xs text-gray-500">
              {((report.distribution.daysMarketAboveTRM / report.distribution.totalDays) * 100).toFixed(
                1
              )}
              %
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-600">
              {report.distribution.daysAtTRM}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Days At TRM (±$5)</div>
            <div className="text-xs text-gray-500">
              {((report.distribution.daysAtTRM / report.distribution.totalDays) * 100).toFixed(1)}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">
              {report.distribution.daysMarketBelowTRM}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Days Below TRM</div>
            <div className="text-xs text-gray-500">
              {((report.distribution.daysMarketBelowTRM / report.distribution.totalDays) * 100).toFixed(
                1
              )}
              %
            </div>
          </div>
        </div>
      </div>

      {/* Market vs TRM Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Market Price vs. TRM
        </h2>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={report.dailyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={(date) => format(new Date(date), 'MMM dd')}
            />
            <YAxis domain={['auto', 'auto']} />
            <Tooltip
              labelFormatter={(date) => format(new Date(date as string), 'PPP')}
              formatter={(value: number) => `$${value.toFixed(2)}`}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="deviation"
              fill="#93c5fd"
              stroke="#3b82f6"
              fillOpacity={0.3}
              name="Deviation"
            />
            <Line
              type="monotone"
              dataKey="marketClose"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
              name="Market Price"
            />
            <Line
              type="monotone"
              dataKey="trm"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              strokeDasharray="5 5"
              name="TRM"
            />
            <ReferenceLine y={0} stroke="#666" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Deviation Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Deviation Over Time
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={report.dailyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={(date) => format(new Date(date), 'MMM dd')}
            />
            <YAxis />
            <Tooltip
              labelFormatter={(date) => format(new Date(date as string), 'PPP')}
              formatter={(value: number) => `$${value.toFixed(2)}`}
            />
            <Legend />
            <ReferenceLine y={0} stroke="#666" strokeWidth={2} />
            <Line
              type="monotone"
              dataKey="deviation"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              name="Deviation ($)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Current Trend */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Current Trend
        </h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">Status:</span>
            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold ${
                report.trends.currentTrend === 'market_above_trm'
                  ? 'bg-green-100 text-green-800'
                  : report.trends.currentTrend === 'market_below_trm'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {report.trends.currentTrend === 'market_above_trm'
                ? 'Market Above TRM'
                : report.trends.currentTrend === 'market_below_trm'
                ? 'Market Below TRM'
                : 'At TRM'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">Consecutive Days:</span>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {report.trends.consecutiveDays}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">30-Day Avg Deviation:</span>
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              ${report.trends.rollingAvgDeviation30d.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  trend: 'up' | 'down' | 'neutral';
}

function MetricCard({ title, value, subtitle, trend }: MetricCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{title}</div>
      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
        {trend !== 'neutral' && (
          <span
            className={`text-sm ${
              trend === 'up' ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {trend === 'up' ? '↑' : '↓'}
          </span>
        )}
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</div>
    </div>
  );
}
