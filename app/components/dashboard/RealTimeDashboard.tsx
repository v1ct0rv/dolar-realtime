'use client';

import { useState, useEffect, useCallback } from 'react';
import { CurrentStats, IntradayData } from '@/types';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area,
  AreaChart,
} from 'recharts';
import { format } from 'date-fns';

export default function RealTimeDashboard() {
  const [stats, setStats] = useState<CurrentStats | null>(null);
  const [chartData, setChartData] = useState<IntradayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setError(null);

      // Fetch both current stats and intraday data in parallel
      const [statsResponse, chartResponse] = await Promise.all([
        fetch('/api/stats/current'),
        fetch('/api/stats/intraday'),
      ]);

      const statsData = await statsResponse.json();
      const chartDataResult = await chartResponse.json();

      if (!statsData.success) {
        throw new Error(statsData.error || 'Failed to fetch stats');
      }

      setStats(statsData.data);

      if (chartDataResult.success) {
        setChartData(chartDataResult.data);
      }

      setLastUpdate(new Date());
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchData();
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando datos en tiempo real...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-red-800 font-semibold text-lg mb-2">Error</h3>
          <p className="text-red-600 mb-4">{error || 'No data available'}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Transform chart data for Recharts
  const chartDataTransformed = chartData
    ? chartData.precio.map((item, index) => ({
        timestamp: item[0],
        precio: item[1],
        monto: chartData.monto[index]?.[1] || 0,
      }))
    : [];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header with refresh controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard en Tiempo Real
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Dólar Interbancario Colombiano (COP/USD)
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">Última actualización:</span>{" "}
            {format(lastUpdate, "HH:mm:ss")}
          </div>

          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              autoRefresh
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {autoRefresh ? "🟢 Auto-Refresh ON" : "⚪ Auto-Refresh OFF"}
          </button>

          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            🔄 Actualizar
          </button>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          title="Dólar Set-FX"
          subtitle="Cierre"
          value={formatCurrency(stats.price)}
          trend={
            stats.openPrice < stats.price
              ? "up"
              : stats.openPrice > stats.price
                ? "down"
                : "equal"
          }
        />
        <StatsCard
          title="TRM Oficial"
          subtitle="Tasa Representativa del Mercado"
          value={formatCurrency(stats.trm)}
          trend={stats.trmPriceChange}
        />
        <StatsCard
          title="Promedio"
          subtitle="Precio promedio del día"
          value={formatCurrency(stats.avgPrice)}
          trend="equal"
        />
      </div>

      {/* Price Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Precios del Dólar
          </h2>
          <dl className="space-y-3">
            <DetailRow
              label="Apertura"
              value={formatCurrency(stats.openPrice)}
              trend={stats.openPriceChange}
            />
            <DetailRow
              label="Mínimo"
              value={formatCurrency(stats.minPrice)}
              trend={stats.minPriceChange}
            />
            <DetailRow
              label="Máximo"
              value={formatCurrency(stats.maxPrice)}
              trend={stats.maxPriceChange}
            />
            <DetailRow
              label="Cierre"
              value={formatCurrency(stats.price)}
              trend="equal"
            />
          </dl>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Volumen USD
          </h2>
          <dl className="space-y-3">
            <DetailRow
              label="Negociado Total"
              value={formatVolume(stats.totalAmount)}
            />
            <DetailRow
              label="Promedio por Transacción"
              value={formatVolume(stats.avgAmount)}
            />
            <DetailRow
              label="Transacciones"
              value={stats.transactions.toString()}
            />
          </dl>
        </div>
      </div>

      {/* Intraday Chart */}
      {chartDataTransformed.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Dólar Spot
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Fuente: https://dolar.set-icap.com/
          </p>
          <ResponsiveContainer width="100%" height={500}>
            <ComposedChart
              data={chartDataTransformed}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorPrecio" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(timestamp) =>
                  format(new Date(timestamp), "hh:mm a")
                }
                tick={{ fill: "#6b7280", fontSize: 12 }}
                axisLine={{ stroke: "#d1d5db" }}
              />
              <YAxis
                yAxisId="left"
                orientation="left"
                tick={{ fill: "#6b7280", fontSize: 12 }}
                axisLine={{ stroke: "#d1d5db" }}
                label={{
                  value: "Monto (Miles USD)",
                  angle: -90,
                  position: "insideLeft",
                  style: { fill: "#6b7280", fontSize: 12 },
                }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: "#6b7280", fontSize: 12 }}
                axisLine={{ stroke: "#d1d5db" }}
                label={{
                  value: "Precio",
                  angle: 90,
                  position: "insideRight",
                  style: { fill: "#6b7280", fontSize: 12 },
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "8px 12px",
                }}
                labelStyle={{
                  color: "#1f2937",
                  fontWeight: "600",
                  marginBottom: "4px",
                }}
                labelFormatter={(timestamp) => {
                  const date = new Date(timestamp as number);
                  return format(date, "EEEE, MMM d, hh:mm:ss a");
                }}
                formatter={(value: number, name: string) => {
                  if (name === "Precio") {
                    return [
                      `$${value.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`,
                      "Precio",
                    ];
                  }
                  return [`USD$${(value / 1000).toFixed(0)}K`, "Monto"];
                }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Bar
                yAxisId="left"
                dataKey="monto"
                fill="#93c5fd"
                name="Monto"
                opacity={0.7}
                radius={[4, 4, 0, 0]}
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="precio"
                stroke="#4F46E5"
                strokeWidth={2}
                fill="url(#colorPrecio)"
                name="Precio"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

interface StatsCardProps {
  title: string;
  subtitle: string;
  value: string;
  trend: 'up' | 'down' | 'equal';
}

function StatsCard({ title, subtitle, value, trend }: StatsCardProps) {
  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    equal: 'text-gray-600',
  };

  const trendIcons = {
    up: '↑',
    down: '↓',
    equal: '→',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{title}</div>
      <div className="flex items-baseline gap-2 mb-1">
        <div className="text-3xl font-bold text-gray-900 dark:text-white">{value}</div>
        <span className={`text-2xl ${trendColors[trend]}`}>{trendIcons[trend]}</span>
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</div>
    </div>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'equal';
}

function DetailRow({ label, value, trend }: DetailRowProps) {
  const trendIcons = {
    up: '↑',
    down: '↓',
    equal: '→',
  };

  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    equal: 'text-gray-400',
  };

  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <dt className="text-gray-600 dark:text-gray-400">{label}:</dt>
      <dd className="flex items-center gap-2">
        <span className="font-semibold text-gray-900 dark:text-white">{value}</span>
        {trend && (
          <span className={`text-sm ${trendColors[trend]}`}>{trendIcons[trend]}</span>
        )}
      </dd>
    </div>
  );
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatVolume(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  return `$${value.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
}
