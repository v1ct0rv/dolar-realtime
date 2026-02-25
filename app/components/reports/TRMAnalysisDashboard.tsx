'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, subDays } from 'date-fns';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
  ReferenceLine,
  LineChart,
} from 'recharts';
import { TRMAnalysisReport } from '@/types';
import { useTheme } from '../ThemeProvider';

// ─── Chart color maps ─────────────────────────────────────────────────────────
const darkChart = {
  market: '#3a6fef',
  trm: '#d4922a',
  deviation: '#3a6fef',
  devLine: '#22c55e',
  grid: 'rgba(20,31,51,0.9)',
  refLine: '#7a9ab8',
  tick: '#7a9ab8',
  border: '#1e2d47',
  tooltipBg: 'rgba(20,29,48,0.97)',
};
const lightChart = {
  market: '#1842c0',
  trm: '#a8620c',
  deviation: '#1842c0',
  devLine: '#15803d',
  grid: 'rgba(210,190,160,0.55)',
  refLine: '#9a8060',
  tick: '#9a8060',
  border: '#ddd0b8',
  tooltipBg: 'rgba(253,248,239,0.97)',
};

// ─── Tooltip helpers ──────────────────────────────────────────────────────────
interface TooltipEntry { dataKey?: string; value?: number; name?: string; color?: string; }
interface ChartTooltipProps {
  active?: boolean;
  payload?: readonly TooltipEntry[];
  label?: string | number;
  ch: typeof darkChart;
  formatLabel?: (l: string) => string;
}

function ChartTooltip({ active, payload, label, ch, formatLabel }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div style={{ background: ch.tooltipBg, border: `1px solid ${ch.border}`, borderRadius: 8, padding: '10px 14px', backdropFilter: 'blur(12px)', minWidth: 160 }}>
      <p style={{ color: ch.tick, fontFamily: 'var(--font-mono)', fontSize: 11, marginBottom: 8 }}>
        {label && formatLabel ? formatLabel(String(label)) : label}
      </p>
      {payload.map((entry, i) =>
        entry.value !== undefined ? (
          <p key={i} style={{ color: entry.color || ch.tick, fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, margin: '3px 0' }}>
            {entry.name}: ${entry.value.toFixed(2)}
          </p>
        ) : null
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface TRMAnalysisDashboardProps {
  initialDays?: number;
}

export default function TRMAnalysisDashboard({ initialDays = 30 }: TRMAnalysisDashboardProps) {
  const { theme } = useTheme();
  const ch = theme === 'dark' ? darkChart : lightChart;

  const [report, setReport] = useState<TRMAnalysisReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState(initialDays);
  const [dateRange, setDateRange] = useState(() => {
    const endDate = new Date();
    const startDate = subDays(endDate, initialDays);
    return { start: format(startDate, 'yyyy-MM-dd'), end: format(endDate, 'yyyy-MM-dd') };
  });

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/reports/trm-analysis?startDate=${dateRange.start}&endDate=${dateRange.end}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch report');
      setReport(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [dateRange.start, dateRange.end]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const handleQuickSelect = (days: number) => {
    const endDate = new Date();
    const startDate = subDays(endDate, days);
    setSelectedDays(days);
    setDateRange({ start: format(startDate, 'yyyy-MM-dd'), end: format(endDate, 'yyyy-MM-dd') });
  };

  if (loading) {
    return (
      <div role="status" aria-label="Cargando reporte" style={{ background: 'var(--clr-bg-glow)', minHeight: 'calc(100vh - 52px)' }} className="flex items-center justify-center">
        <div className="text-center space-y-4">
          <div style={{ width: 40, height: 40, border: '2px solid var(--clr-border)', borderTopColor: 'var(--clr-gold)', borderRadius: '50%', margin: '0 auto' }} className="motion-safe:animate-spin" aria-hidden="true" />
          <p style={{ color: 'var(--clr-muted)', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.1em' }}>
            CARGANDO REPORTE...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: 'var(--clr-bg-glow)', minHeight: 'calc(100vh - 52px)' }} className="flex items-center justify-center p-6">
        <div style={{ background: 'var(--clr-card)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '28px 32px', maxWidth: 400 }}>
          <h3 style={{ color: 'var(--clr-negative)', fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Error de conexión</h3>
          <p style={{ color: 'var(--clr-muted)', fontSize: 14, marginBottom: 20 }}>{error}</p>
          <button onClick={fetchReport} style={{ background: 'var(--clr-gold)', color: 'var(--clr-bg)', borderRadius: 6, padding: '8px 18px', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none' }}>
            REINTENTAR
          </button>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const trendLabel =
    report.trends.currentTrend === 'market_above_trm' ? 'Mercado sobre TRM' :
    report.trends.currentTrend === 'market_below_trm' ? 'Mercado bajo TRM' : 'En TRM';
  const trendColor =
    report.trends.currentTrend === 'market_above_trm' ? 'var(--clr-positive)' :
    report.trends.currentTrend === 'market_below_trm' ? 'var(--clr-negative)' : 'var(--clr-muted)';

  return (
    <div style={{ background: 'var(--clr-bg-glow)', minHeight: 'calc(100vh - 52px)', color: 'var(--clr-text)' }}>
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* ── Header ── */}
        <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-4" style={{ animation: 'card-enter 0.5s ease-out both' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--clr-muted)', marginBottom: 6 }}>
              COP / USD · Comparativa de Tasas
            </p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 600, lineHeight: 1.1, color: 'var(--clr-text)' }}>
              Análisis TRM
            </h1>
          </div>

          {/* Date range selector */}
          <div className="flex items-center gap-2" role="group" aria-label="Rango de fechas">
            {([7, 30, 90] as const).map((days) => (
              <button
                key={days}
                onClick={() => handleQuickSelect(days)}
                aria-pressed={selectedDays === days}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  letterSpacing: '0.1em',
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: `1px solid ${selectedDays === days ? 'var(--clr-gold)' : 'var(--clr-border)'}`,
                  background: selectedDays === days ? 'var(--clr-gold)' : 'transparent',
                  color: selectedDays === days ? 'var(--clr-bg)' : 'var(--clr-muted)',
                  cursor: 'pointer',
                  fontWeight: selectedDays === days ? 500 : 400,
                }}
              >
                {days}D
              </button>
            ))}
          </div>
        </header>

        {/* Gold divider */}
        <div style={{ height: 1, background: 'var(--clr-divider)' }} />

        {/* ── Alerts ── */}
        {report.alerts.length > 0 && (
          <div className="space-y-2" style={{ animation: 'card-enter 0.5s ease-out 80ms both' }}>
            {report.alerts.map((alert, i) => {
              const colors = {
                error: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', text: 'var(--clr-negative)' },
                warning: { bg: 'rgba(212,146,42,0.08)', border: 'rgba(212,146,42,0.25)', text: 'var(--clr-gold)' },
                info: { bg: 'rgba(58,111,239,0.08)', border: 'rgba(58,111,239,0.25)', text: 'var(--clr-blue)' },
              }[alert.severity];
              return (
                <div key={i} role="alert" style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 8, padding: '10px 16px' }}>
                  <p style={{ color: colors.text, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{alert.message}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Metric Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Desviación Promedio" value={`$${report.summary.avgDeviation.toFixed(2)}`} subtitle={`${report.summary.avgDeviation > 0 ? '+' : ''}${((report.summary.avgDeviation / 4000) * 100).toFixed(2)}%`} positive={report.summary.avgDeviation > 0} negative={report.summary.avgDeviation < 0} delay={0} />
          <MetricCard title="Desv. Máxima" value={`$${report.summary.maxDeviation.toFixed(2)}`} subtitle="Sobre TRM" delay={80} />
          <MetricCard title="Desv. Mínima" value={`$${report.summary.minDeviation.toFixed(2)}`} subtitle="Bajo TRM" delay={160} />
          <MetricCard title="Correlación" value={report.summary.correlation.toFixed(3)} subtitle="TRM vs Mercado" delay={240} />
        </div>

        {/* ── Distribution ── */}
        <div style={{ background: 'var(--clr-card)', border: '1px solid var(--clr-border)', borderRadius: 12, padding: '24px', animation: 'card-enter 0.5s ease-out 320ms both' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--clr-text)', marginBottom: 20 }}>
            Distribución de Días
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <DistItem
              value={report.distribution.daysMarketAboveTRM}
              total={report.distribution.totalDays}
              label="Sobre TRM"
              color="var(--clr-positive)"
            />
            <DistItem
              value={report.distribution.daysAtTRM}
              total={report.distribution.totalDays}
              label="En TRM (±$5)"
              color="var(--clr-muted)"
            />
            <DistItem
              value={report.distribution.daysMarketBelowTRM}
              total={report.distribution.totalDays}
              label="Bajo TRM"
              color="var(--clr-negative)"
            />
          </div>
        </div>

        {/* ── Market vs TRM Chart ── */}
        <ChartCard title="Mercado vs TRM" subtitle={`${report.dateRange.start} — ${report.dateRange.end}`} delay={400}>
          <div className="flex items-center gap-5 mb-4">
            <LegendItem color={ch.market} label="Mercado" />
            <LegendItem color={ch.trm} label="TRM" dashed />
            <LegendItem color={ch.deviation} label="Desviación" fill />
          </div>
          <ResponsiveContainer width="100%" height={380}>
            <ComposedChart data={report.dailyData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="devGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={ch.deviation} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={ch.deviation} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={ch.grid} horizontal vertical={false} strokeDasharray="1 4" />
              <XAxis dataKey="date" tickFormatter={(d) => format(new Date(d), 'dd/MM')} tick={{ fill: ch.tick, fontSize: 11, fontFamily: 'var(--font-mono)' }} axisLine={{ stroke: ch.border }} tickLine={false} />
              <YAxis domain={['auto', 'auto']} tick={{ fill: ch.tick, fontSize: 11, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`} width={82} />
              <Tooltip content={(props) => <ChartTooltip {...props} ch={ch} formatLabel={(l) => format(new Date(l), 'dd MMM yyyy')} />} cursor={{ stroke: ch.border, strokeWidth: 1, strokeDasharray: '3 3' }} />
              <Area type="monotone" dataKey="deviation" fill="url(#devGradient)" stroke={ch.deviation} strokeWidth={1} name="Desviación" dot={false} />
              <Line type="monotone" dataKey="marketClose" stroke={ch.market} strokeWidth={2} dot={false} name="Mercado" />
              <Line type="monotone" dataKey="trm" stroke={ch.trm} strokeWidth={2} dot={false} strokeDasharray="5 5" name="TRM" />
              <ReferenceLine y={0} stroke={ch.refLine} strokeDasharray="2 4" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* ── Deviation Chart ── */}
        <ChartCard title="Desviación en el Tiempo" delay={480}>
          <div className="flex items-center gap-5 mb-4">
            <LegendItem color={ch.devLine} label="Desviación ($)" />
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={report.dailyData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={ch.grid} horizontal vertical={false} strokeDasharray="1 4" />
              <XAxis dataKey="date" tickFormatter={(d) => format(new Date(d), 'dd/MM')} tick={{ fill: ch.tick, fontSize: 11, fontFamily: 'var(--font-mono)' }} axisLine={{ stroke: ch.border }} tickLine={false} />
              <YAxis tick={{ fill: ch.tick, fontSize: 11, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v.toFixed(0)}`} width={60} />
              <Tooltip content={(props) => <ChartTooltip {...props} ch={ch} formatLabel={(l) => format(new Date(l), 'dd MMM yyyy')} />} cursor={{ stroke: ch.border, strokeWidth: 1, strokeDasharray: '3 3' }} />
              <ReferenceLine y={0} stroke={ch.refLine} strokeWidth={1.5} strokeDasharray="2 4" />
              <Line type="monotone" dataKey="deviation" stroke={ch.devLine} strokeWidth={2} dot={false} name="Desviación ($)" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* ── Current Trend ── */}
        <div style={{ background: 'var(--clr-card)', border: '1px solid var(--clr-border)', borderRadius: 12, padding: '24px', animation: 'card-enter 0.5s ease-out 560ms both' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--clr-text)', marginBottom: 20 }}>
            Tendencia Actual
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            <TrendRow label="Estado" valueNode={
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.08em', color: trendColor, background: `${trendColor}18`, border: `1px solid ${trendColor}40`, padding: '3px 10px', borderRadius: 10 }}>
                {trendLabel}
              </span>
            } />
            <TrendRow label="Días consecutivos" value={report.trends.consecutiveDays.toString()} />
            <TrendRow label="Desv. prom. 30D" value={`$${report.trends.rollingAvgDeviation30d.toFixed(2)}`} />
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({ title, value, subtitle, positive, negative, delay = 0 }: { title: string; value: string; subtitle: string; positive?: boolean; negative?: boolean; delay?: number }) {
  return (
    <div style={{ background: 'var(--clr-card)', border: '1px solid var(--clr-border)', borderRadius: 12, padding: '20px 22px', animation: 'card-enter 0.5s ease-out both', animationDelay: `${delay}ms` }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--clr-muted)', marginBottom: 10 }}>
        {title}
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 500, color: positive ? 'var(--clr-positive)' : negative ? 'var(--clr-negative)' : 'var(--clr-text)', letterSpacing: '-0.01em' }}>
          {value}
        </span>
        {positive && <span style={{ color: 'var(--clr-positive)', fontSize: 14 }} aria-hidden="true">↑</span>}
        {negative && <span style={{ color: 'var(--clr-negative)', fontSize: 14 }} aria-hidden="true">↓</span>}
      </div>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--clr-muted)' }}>{subtitle}</p>
    </div>
  );
}

function DistItem({ value, total, label, color }: { value: number; total: number; label: string; color: string }) {
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 32, fontWeight: 500, color, marginBottom: 4 }}>{value}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--clr-muted)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--clr-muted)' }}>{pct}%</div>
    </div>
  );
}

function ChartCard({ title, subtitle, delay = 0, children }: { title: string; subtitle?: string; delay?: number; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--clr-card)', border: '1px solid var(--clr-border)', borderRadius: 12, padding: '24px 24px 20px', animation: 'card-enter 0.5s ease-out both', animationDelay: `${delay}ms` }}>
      <div style={{ marginBottom: 6 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--clr-text)' }}>{title}</h2>
        {subtitle && <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--clr-muted)', marginTop: 2 }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function LegendItem({ color, label, dashed, fill }: { color: string; label: string; dashed?: boolean; fill?: boolean }) {
  return (
    <span className="flex items-center gap-2" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--clr-muted)', letterSpacing: '0.08em' }}>
      {fill ? (
        <span style={{ display: 'inline-block', width: 14, height: 10, background: color, borderRadius: 2, opacity: 0.5 }} />
      ) : (
        <span style={{ display: 'inline-block', width: 22, height: 2, background: dashed ? `repeating-linear-gradient(90deg, ${color} 0px, ${color} 5px, transparent 5px, transparent 9px)` : color, borderRadius: 1 }} />
      )}
      {label}
    </span>
  );
}

function TrendRow({ label, value, valueNode }: { label: string; value?: string; valueNode?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--clr-border)' }} className="last:border-b-0">
      <span style={{ color: 'var(--clr-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{label}</span>
      {valueNode || (
        <span style={{ color: 'var(--clr-text)', fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 500 }}>{value}</span>
      )}
    </div>
  );
}
