'use client';

import { useState, useEffect, useCallback } from 'react';
import { CurrentStats, IntradayData } from '@/types';
import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Area,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTheme } from '../ThemeProvider';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getTodayColombiaDate = () =>
  new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }))
    .toISOString()
    .split('T')[0];

// ─── Chart color maps (hex values for Recharts SVG props) ─────────────────────
const darkChart = {
  gold: '#d4922a',
  goldFill: 'rgba(212,146,42,0.22)',
  blue: '#3a6fef',
  blueFill: 'rgba(58,111,239,0.55)',
  grid: 'rgba(20,31,51,0.9)',
  tick: '#7a9ab8',
  cardBg: '#141d30',
  border: '#1e2d47',
  tooltipBg: 'rgba(20,29,48,0.97)',
};
const lightChart = {
  gold: '#a8620c',
  goldFill: 'rgba(168,98,12,0.15)',
  blue: '#1842c0',
  blueFill: 'rgba(24,66,192,0.45)',
  grid: 'rgba(210,190,160,0.55)',
  tick: '#9a8060',
  cardBg: '#fdf8ef',
  border: '#ddd0b8',
  tooltipBg: 'rgba(253,248,239,0.97)',
};

type Trend = 'up' | 'down' | 'equal';

// ─── Chart tooltip ────────────────────────────────────────────────────────────
interface TooltipEntry { dataKey?: string; value?: number | string; }
interface ChartTooltipProps {
  active?: boolean;
  payload?: readonly TooltipEntry[];
  label?: string | number;
  ch: typeof darkChart;
}

function ChartTooltip({ active, payload, label, ch }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const date = new Date(label as number);
  const precioEntry = payload.find((p) => p.dataKey === 'precio');
  const montoEntry = payload.find((p) => p.dataKey === 'monto');

  return (
    <div
      style={{
        background: ch.tooltipBg,
        border: `1px solid ${ch.border}`,
        borderRadius: 8,
        padding: '10px 14px',
        backdropFilter: 'blur(12px)',
        minWidth: 140,
      }}
    >
      <p style={{ color: ch.tick, fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em', marginBottom: 8 }}>
        {format(date, 'HH:mm:ss')}
      </p>
      {precioEntry && precioEntry.value !== undefined && (
        <p style={{ color: ch.gold, fontFamily: 'var(--font-mono)', fontSize: 17, fontWeight: 500, margin: '3px 0' }}>
          ${(precioEntry.value as number).toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        </p>
      )}
      {montoEntry && montoEntry.value !== undefined && (
        <p style={{ color: ch.blue, fontFamily: 'var(--font-mono)', fontSize: 12, margin: '3px 0' }}>
          USD {((montoEntry.value as number) / 1000).toFixed(0)}K
        </p>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function RealTimeDashboard() {
  const { theme } = useTheme();
  const ch = theme === 'dark' ? darkChart : lightChart;

  const [stats, setStats] = useState<CurrentStats | null>(null);
  const [chartData, setChartData] = useState<IntradayData | null>(null);
  const [dataDate, setDataDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [statsResponse, chartResponse] = await Promise.all([
        fetch('/api/stats/current'),
        fetch('/api/stats/intraday'),
      ]);

      const statsData = await statsResponse.json();
      const chartDataResult = await chartResponse.json();

      if (!statsData.success) throw new Error(statsData.error || 'Failed to fetch stats');

      const fetchedDate = statsData.dataDate ?? null;
      setStats(statsData.data);
      setDataDate(fetchedDate);
      if (chartDataResult.success) setChartData(chartDataResult.data);
      setLastUpdate(new Date());

      // Disable live mode when data is not from today
      if (fetchedDate && fetchedDate !== getTodayColombiaDate()) {
        setAutoRefresh(false);
      }

      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  if (loading) {
    return (
      <div
        role="status"
        aria-label="Cargando datos en tiempo real"
        style={{ background: 'var(--clr-bg-glow)', minHeight: 'calc(100vh - 52px)' }}
        className="flex items-center justify-center"
      >
        <div className="text-center space-y-4">
          <div
            style={{ width: 40, height: 40, border: '2px solid var(--clr-border)', borderTopColor: 'var(--clr-gold)', borderRadius: '50%', margin: '0 auto' }}
            className="motion-safe:animate-spin"
            aria-hidden="true"
          />
          <p style={{ color: 'var(--clr-muted)', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.1em' }}>
            CARGANDO DATOS...
          </p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div style={{ background: 'var(--clr-bg-glow)', minHeight: 'calc(100vh - 52px)' }} className="flex items-center justify-center p-6">
        <div style={{ background: 'var(--clr-card)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '28px 32px', maxWidth: 400 }}>
          <h3 style={{ color: 'var(--clr-negative)', fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
            Error de conexión
          </h3>
          <p style={{ color: 'var(--clr-muted)', fontSize: 14, marginBottom: 20 }}>{error || 'Sin datos disponibles'}</p>
          <button
            onClick={fetchData}
            style={{ background: 'var(--clr-gold)', color: 'var(--clr-bg)', borderRadius: 6, padding: '8px 18px', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500, letterSpacing: '0.08em', cursor: 'pointer', border: 'none' }}
          >
            REINTENTAR
          </button>
        </div>
      </div>
    );
  }

  const chartDataTransformed = chartData
    ? chartData.precio.map((item, index) => ({
        timestamp: item[0],
        precio: item[1],
        monto: chartData.monto[index]?.[1] || 0,
      }))
    : [];

  // Tight price domain
  const priceDomain = (() => {
    if (chartDataTransformed.length === 0) return ['auto', 'auto'] as const;
    const prices = chartDataTransformed.map((d) => d.precio).filter((p) => p > 0);
    if (prices.length === 0) return ['auto', 'auto'] as const;
    const lo = Math.min(...prices);
    const hi = Math.max(...prices);
    const pad = Math.max((hi - lo) * 0.3, 5);
    return [Math.floor(lo - pad), Math.ceil(hi + pad)] as [number, number];
  })();

  const priceTrend: Trend =
    stats.openPrice < stats.price ? 'up' : stats.openPrice > stats.price ? 'down' : 'equal';

  return (
    <div style={{ background: 'var(--clr-bg-glow)', minHeight: 'calc(100vh - 52px)', color: 'var(--clr-text)' }}>
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* ── Header ── */}
        <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div style={{ animation: 'card-enter 0.5s ease-out both' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--clr-muted)', marginBottom: 6 }}>
              COP / USD · Mercado Interbancario
            </p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 600, lineHeight: 1.1, color: 'var(--clr-text)' }}>
              Dashboard en Tiempo Real
            </h1>
          </div>

          <div className="flex items-center gap-3" style={{ animation: 'card-enter 0.5s ease-out 80ms both' }}>
            <span style={{ color: 'var(--clr-muted)', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.04em' }}>
              {format(lastUpdate, 'HH:mm:ss')}
            </span>

            {(() => {
              const isToday = !dataDate || dataDate === getTodayColombiaDate();
              if (!isToday) {
                return (
                  <span
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7, padding: '6px 13px', borderRadius: 20,
                      border: '1px solid var(--clr-border)',
                      background: 'var(--clr-card)',
                      color: 'var(--clr-muted)',
                      fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em',
                    }}
                  >
                    <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--clr-muted)', display: 'inline-block', flexShrink: 0 }} />
                    HISTÓRICO
                  </span>
                );
              }
              return (
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  aria-pressed={autoRefresh}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7, padding: '6px 13px', borderRadius: 20,
                    border: `1px solid ${autoRefresh ? 'rgba(34,197,94,0.3)' : 'var(--clr-border)'}`,
                    background: autoRefresh ? 'rgba(34,197,94,0.07)' : 'var(--clr-card)',
                    color: autoRefresh ? 'var(--clr-positive)' : 'var(--clr-muted)',
                    fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', cursor: 'pointer',
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{ width: 6, height: 6, borderRadius: '50%', background: autoRefresh ? 'var(--clr-positive)' : 'var(--clr-muted)', display: 'inline-block', animation: autoRefresh ? 'pulse-dot 1.5s ease-in-out infinite' : 'none', flexShrink: 0 }}
                  />
                  {autoRefresh ? 'LIVE' : 'PAUSED'}
                </button>
              );
            })()}

            <button
              onClick={fetchData}
              style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--clr-border)', background: 'transparent', color: 'var(--clr-muted)', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', cursor: 'pointer' }}
            >
              ↻ ACTUALIZAR
            </button>
          </div>
        </header>

        {/* Gold divider */}
        <div style={{ height: 1, background: 'var(--clr-divider)' }} />

        {/* ── Yesterday notice ── */}
        {dataDate && (() => {
          const nowUTC = new Date();
          const colombiaDate = new Date(nowUTC.toLocaleString('en-US', { timeZone: 'America/Bogota' })).toISOString().split('T')[0];
          if (dataDate === colombiaDate) return null;
          return (
            <div
              role="status"
              style={{
                background: 'rgba(212,146,42,0.08)',
                border: '1px solid rgba(212,146,42,0.25)',
                borderRadius: 8,
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                animation: 'card-enter 0.4s ease-out both',
              }}
            >
              <span style={{ color: 'var(--clr-gold)', fontSize: 14 }} aria-hidden="true">◈</span>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--clr-gold)', letterSpacing: '0.04em' }}>
                Sin datos para hoy — mostrando cierre del{' '}
                <strong>{format(parseISO(dataDate), "EEEE d 'de' MMMM", { locale: es })}</strong>
              </p>
            </div>
          );
        })()}

        {/* ── Stats Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard title="Dólar Set-FX" subtitle="Cierre del mercado" value={formatCurrency(stats.price)} trend={priceTrend} primary animationDelay={0} />
          <StatsCard title="TRM Oficial" subtitle="Tasa Representativa del Mercado" value={formatCurrency(stats.trm)} trend={stats.trmPriceChange} animationDelay={80} />
          <StatsCard title="Precio Promedio" subtitle="Promedio del día" value={formatCurrency(stats.avgPrice)} trend="equal" animationDelay={160} />
        </div>

        {/* ── Detail Panels ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DetailPanel title="Precios del Dólar" animationDelay={240}>
            <DetailRow label="Apertura" value={formatCurrency(stats.openPrice)} trend={stats.openPriceChange} />
            <DetailRow label="Mínimo" value={formatCurrency(stats.minPrice)} trend={stats.minPriceChange} />
            <DetailRow label="Máximo" value={formatCurrency(stats.maxPrice)} trend={stats.maxPriceChange} />
            <DetailRow label="Cierre" value={formatCurrency(stats.price)} />
          </DetailPanel>

          <DetailPanel title="Volumen USD" animationDelay={320}>
            <DetailRow label="Negociado Total" value={formatVolume(stats.totalAmount)} />
            <DetailRow label="Promedio por Transacción" value={formatVolume(stats.avgAmount)} />
            <DetailRow label="Transacciones" value={stats.transactions.toString()} />
          </DetailPanel>
        </div>

        {/* ── Intraday Chart ── */}
        {chartDataTransformed.length > 0 && (
          <div
            style={{
              background: 'var(--clr-card)',
              border: '1px solid var(--clr-border)',
              borderRadius: 12,
              padding: '24px 24px 20px',
              animation: 'card-enter 0.6s ease-out 400ms both',
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--clr-text)', marginBottom: 4 }}>
                  Dólar Spot Intradiario
                </h2>
                <a href="https://dolar.set-icap.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--clr-muted)', fontFamily: 'var(--font-mono)', fontSize: 11, textDecoration: 'none', letterSpacing: '0.04em' }}>
                  dolar.set-icap.com
                </a>
              </div>

              <div className="flex items-center gap-5">
                <span className="flex items-center gap-2" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--clr-muted)', letterSpacing: '0.1em' }}>
                  <span style={{ display: 'inline-block', width: 22, height: 2, background: ch.gold, borderRadius: 1 }} />
                  PRECIO
                </span>
                <span className="flex items-center gap-2" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--clr-muted)', letterSpacing: '0.1em' }}>
                  <span style={{ display: 'inline-block', width: 12, height: 10, background: ch.blue, borderRadius: 2, opacity: 0.6 }} />
                  MONTO
                </span>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={420}>
              <ComposedChart data={chartDataTransformed} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ch.gold} stopOpacity={0.22} />
                    <stop offset="95%" stopColor={ch.gold} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ch.blue} stopOpacity={0.65} />
                    <stop offset="100%" stopColor={ch.blue} stopOpacity={0.15} />
                  </linearGradient>
                </defs>

                <CartesianGrid stroke={ch.grid} horizontal vertical={false} strokeDasharray="1 4" />

                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(ts) => format(new Date(ts), 'HH:mm')}
                  tick={{ fill: ch.tick, fontSize: 11, fontFamily: 'var(--font-mono)' }}
                  axisLine={{ stroke: ch.border }}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  tick={{ fill: ch.tick, fontSize: 11, fontFamily: 'var(--font-mono)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                  width={46}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={priceDomain}
                  tick={{ fill: ch.tick, fontSize: 11, fontFamily: 'var(--font-mono)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${v.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`}
                  width={82}
                />

                <Tooltip
                  content={(props) => <ChartTooltip {...props} ch={ch} />}
                  cursor={{ stroke: ch.border, strokeWidth: 1, strokeDasharray: '3 3' }}
                />

                <Bar yAxisId="left" dataKey="monto" fill="url(#barGradient)" name="Monto" radius={[3, 3, 0, 0]} />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="precio"
                  stroke={ch.gold}
                  strokeWidth={2}
                  fill="url(#priceGradient)"
                  name="Precio"
                  dot={false}
                  activeDot={{ stroke: ch.gold, fill: ch.cardBg, strokeWidth: 2, r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── StatsCard ─────────────────────────────────────────────────────────────────
interface StatsCardProps {
  title: string; subtitle: string; value: string;
  trend: Trend; primary?: boolean; animationDelay?: number;
}

function StatsCard({ title, subtitle, value, trend, primary = false, animationDelay = 0 }: StatsCardProps) {
  const trendColor = trend === 'up' ? 'var(--clr-positive)' : trend === 'down' ? 'var(--clr-negative)' : 'var(--clr-muted)';
  const trendSymbol = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '—';
  const trendLabel = trend === 'up' ? 'En alza' : trend === 'down' ? 'En baja' : 'Sin cambio';

  return (
    <div
      style={{
        background: 'var(--clr-card)',
        border: '1px solid var(--clr-border)',
        borderTop: primary ? '2px solid var(--clr-gold)' : '1px solid var(--clr-border)',
        borderRadius: 12,
        padding: '20px 24px',
        animation: 'card-enter 0.5s ease-out both',
        animationDelay: `${animationDelay}ms`,
      }}
    >
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: primary ? 'var(--clr-gold)' : 'var(--clr-muted)', marginBottom: 12 }}>
        {title}
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 500, color: 'var(--clr-text)', letterSpacing: '-0.02em' }}>
          {value}
        </span>
        <span style={{ fontSize: 18, color: trendColor }} aria-hidden="true">{trendSymbol}</span>
        <span className="sr-only">{trendLabel}</span>
      </div>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--clr-muted)', letterSpacing: '0.03em' }}>
        {subtitle}
      </p>
    </div>
  );
}

// ─── DetailPanel ──────────────────────────────────────────────────────────────
function DetailPanel({ title, children, animationDelay = 0 }: { title: string; children: React.ReactNode; animationDelay?: number }) {
  return (
    <div
      style={{
        background: 'var(--clr-card)',
        border: '1px solid var(--clr-border)',
        borderRadius: 12,
        padding: '20px 24px',
        animation: 'card-enter 0.5s ease-out both',
        animationDelay: `${animationDelay}ms`,
      }}
    >
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--clr-text)', marginBottom: 16 }}>
        {title}
      </h2>
      <dl>{children}</dl>
    </div>
  );
}

// ─── DetailRow ────────────────────────────────────────────────────────────────
function DetailRow({ label, value, trend }: { label: string; value: string; trend?: Trend }) {
  const trendColor = !trend ? 'transparent' : trend === 'up' ? 'var(--clr-positive)' : trend === 'down' ? 'var(--clr-negative)' : 'var(--clr-muted)';
  const trendSymbol = !trend ? '' : trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
  const trendLabel = !trend ? '' : trend === 'up' ? 'alza' : trend === 'down' ? 'baja' : 'sin cambio';

  return (
    <div
      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--clr-border)' }}
      className="last:border-b-0"
    >
      <dt style={{ color: 'var(--clr-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{label}</dt>
      <dd style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: 'var(--clr-text)', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500 }}>{value}</span>
        {trend && (
          <>
            <span style={{ color: trendColor, fontSize: 12 }} aria-hidden="true">{trendSymbol}</span>
            <span className="sr-only">{trendLabel}</span>
          </>
        )}
      </dd>
    </div>
  );
}

// ─── Formatters ───────────────────────────────────────────────────────────────
function formatCurrency(value: number): string {
  return `$${value.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatVolume(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  return `$${value.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
}
