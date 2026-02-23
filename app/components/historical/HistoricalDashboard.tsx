'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, subDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  ReferenceLine,
} from 'recharts';
import { HistoricalReport } from '@/types';
import { useTheme } from '../ThemeProvider';

// ─── Chart color maps ─────────────────────────────────────────────────────────
const darkChart = {
  gold: '#d4922a',
  trm: '#3a6fef',
  grid: 'rgba(20,31,51,0.9)',
  tick: '#3d5269',
  border: '#141f33',
  tooltipBg: 'rgba(9,14,26,0.97)',
  positive: '#22c55e',
  negative: '#ef4444',
};
const lightChart = {
  gold: '#a8620c',
  trm: '#1842c0',
  grid: 'rgba(210,190,160,0.55)',
  tick: '#9a8060',
  border: '#ddd0b8',
  tooltipBg: 'rgba(253,248,239,0.97)',
  positive: '#15803d',
  negative: '#b91c1c',
};

const PRESETS = [
  { label: '7D',  days: 7 },
  { label: '30D', days: 30 },
  { label: '3M',  days: 90 },
  { label: '6M',  days: 180 },
  { label: '1A',  days: 365 },
];

// ─── Tooltip ──────────────────────────────────────────────────────────────────
interface TooltipEntry { dataKey?: string; value?: number; color?: string; name?: string; }
interface ChartTooltipProps {
  active?: boolean;
  payload?: readonly TooltipEntry[];
  label?: string | number;
  ch: typeof darkChart;
}

function ChartTooltip({ active, payload, label, ch }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0 || !label) return null;
  return (
    <div style={{ background: ch.tooltipBg, border: `1px solid ${ch.border}`, borderRadius: 8, padding: '10px 14px', backdropFilter: 'blur(12px)' }}>
      <p style={{ color: ch.tick, fontFamily: 'var(--font-mono)', fontSize: 11, marginBottom: 8 }}>
        {format(parseISO(String(label)), "EEEE d 'de' MMMM yyyy", { locale: es })}
      </p>
      {payload.map((entry, i) =>
        entry.value !== undefined ? (
          <p key={i} style={{ color: entry.color || ch.gold, fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, margin: '3px 0' }}>
            {entry.name}: ${entry.value.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        ) : null
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function HistoricalDashboard() {
  const { theme } = useTheme();
  const ch = theme === 'dark' ? darkChart : lightChart;

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const defaultStart = format(subDays(new Date(), 30), 'yyyy-MM-dd');

  const [report, setReport] = useState<HistoricalReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(30);
  const [dateRange, setDateRange] = useState({ start: defaultStart, end: todayStr });
  const [customStart, setCustomStart] = useState(defaultStart);
  const [customEnd, setCustomEnd] = useState(todayStr);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/historical?startDate=${dateRange.start}&endDate=${dateRange.end}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Error al cargar datos');
      setReport(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [dateRange.start, dateRange.end]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const handlePreset = (days: number) => {
    setSelectedPreset(days);
    const end = new Date();
    const start = subDays(end, days);
    const s = format(start, 'yyyy-MM-dd');
    const e = format(end, 'yyyy-MM-dd');
    setCustomStart(s);
    setCustomEnd(e);
    setDateRange({ start: s, end: e });
  };

  const handleCustomApply = () => {
    if (customStart > customEnd) return;
    setSelectedPreset(null);
    setDateRange({ start: customStart, end: customEnd });
  };

  // Tight price domain covering both close and TRM
  const priceDomain = (() => {
    if (!report) return ['auto', 'auto'] as const;
    const vals = report.dailyData.flatMap((d) =>
      [d.close, d.trm].filter((v): v is number => v !== null && v > 0)
    );
    if (vals.length === 0) return ['auto', 'auto'] as const;
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const pad = Math.max((hi - lo) * 0.05, 10);
    return [Math.floor(lo - pad), Math.ceil(hi + pad)] as [number, number];
  })();

  if (loading) {
    return (
      <div role="status" aria-label="Cargando históricos" style={{ background: 'var(--clr-bg-glow)', minHeight: 'calc(100vh - 52px)' }} className="flex items-center justify-center">
        <div className="text-center space-y-4">
          <div style={{ width: 40, height: 40, border: '2px solid var(--clr-border)', borderTopColor: 'var(--clr-gold)', borderRadius: '50%', margin: '0 auto' }} className="motion-safe:animate-spin" aria-hidden="true" />
          <p style={{ color: 'var(--clr-muted)', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.1em' }}>CARGANDO DATOS...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: 'var(--clr-bg-glow)', minHeight: 'calc(100vh - 52px)' }} className="flex items-center justify-center p-6">
        <div style={{ background: 'var(--clr-card)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '28px 32px', maxWidth: 400 }}>
          <h3 style={{ color: 'var(--clr-negative)', fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Sin datos</h3>
          <p style={{ color: 'var(--clr-muted)', fontSize: 14, marginBottom: 20 }}>{error}</p>
          <button onClick={fetchReport} style={{ background: 'var(--clr-gold)', color: 'var(--clr-bg)', borderRadius: 6, padding: '8px 18px', fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer', border: 'none' }}>
            REINTENTAR
          </button>
        </div>
      </div>
    );
  }

  const s = report?.summary;
  const pctPositive = s && s.priceChangePercent >= 0;

  return (
    <div style={{ background: 'var(--clr-bg-glow)', minHeight: 'calc(100vh - 52px)', color: 'var(--clr-text)' }}>
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* ── Header ── */}
        <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-4" style={{ animation: 'card-enter 0.5s ease-out both' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--clr-muted)', marginBottom: 6 }}>
              COP / USD · Serie Histórica
            </p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 600, lineHeight: 1.1, color: 'var(--clr-text)' }}>
              Datos Históricos
            </h1>
          </div>

          {/* ── Date controls ── */}
          <div className="flex flex-col gap-3" style={{ animation: 'card-enter 0.5s ease-out 80ms both' }}>
            {/* Quick presets */}
            <div className="flex items-center gap-2" role="group" aria-label="Rango rápido">
              {PRESETS.map(({ label, days }) => (
                <button
                  key={days}
                  onClick={() => handlePreset(days)}
                  aria-pressed={selectedPreset === days}
                  style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em',
                    padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
                    border: `1px solid ${selectedPreset === days ? 'var(--clr-gold)' : 'var(--clr-border)'}`,
                    background: selectedPreset === days ? 'var(--clr-gold)' : 'transparent',
                    color: selectedPreset === days ? 'var(--clr-bg)' : 'var(--clr-muted)',
                    fontWeight: selectedPreset === days ? 500 : 400,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Custom range */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                max={customEnd}
                onChange={(e) => setCustomStart(e.target.value)}
                style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11, padding: '5px 10px',
                  borderRadius: 6, border: '1px solid var(--clr-border)',
                  background: 'var(--clr-card)', color: 'var(--clr-text)',
                  cursor: 'pointer', outline: 'none',
                }}
              />
              <span style={{ color: 'var(--clr-muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>—</span>
              <input
                type="date"
                value={customEnd}
                min={customStart}
                max={todayStr}
                onChange={(e) => setCustomEnd(e.target.value)}
                style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11, padding: '5px 10px',
                  borderRadius: 6, border: '1px solid var(--clr-border)',
                  background: 'var(--clr-card)', color: 'var(--clr-text)',
                  cursor: 'pointer', outline: 'none',
                }}
              />
              <button
                onClick={handleCustomApply}
                style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em',
                  padding: '5px 14px', borderRadius: 6, cursor: 'pointer',
                  border: '1px solid var(--clr-border)',
                  background: 'var(--clr-card)', color: 'var(--clr-muted)',
                }}
              >
                APLICAR
              </button>
            </div>
          </div>
        </header>

        {/* Gold divider */}
        <div style={{ height: 1, background: 'var(--clr-divider)' }} />

        {/* ── Summary Cards ── */}
        {s && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <SummaryCard title="APERTURA" value={fmt(s.firstOpen)} delay={0} />
            <SummaryCard
              title="CIERRE"
              value={fmt(s.lastClose)}
              badge={`${pctPositive ? '+' : ''}${s.priceChangePercent.toFixed(2)}%`}
              badgeUp={pctPositive}
              delay={80}
            />
            <SummaryCard title="MÍNIMO" value={fmt(s.minPrice)} delay={160} />
            <SummaryCard title="MÁXIMO" value={fmt(s.maxPrice)} delay={240} />
            <SummaryCard title="DÍAS HÁBILES" value={s.tradingDays.toString()} subtitle={`Vol. ${fmtVol(s.totalVolume)}`} delay={320} />
          </div>
        )}

        {/* ── Price Chart ── */}
        {report && report.dailyData.length > 0 && (
          <div style={{ background: 'var(--clr-card)', border: '1px solid var(--clr-border)', borderRadius: 12, padding: '24px 24px 20px', animation: 'card-enter 0.5s ease-out 400ms both' }}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--clr-text)', marginBottom: 4 }}>
                  Precio de Cierre
                </h2>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--clr-muted)' }}>
                  {format(parseISO(report.dateRange.start), "d 'de' MMM yyyy", { locale: es })}
                  {' — '}
                  {format(parseISO(report.dateRange.end), "d 'de' MMM yyyy", { locale: es })}
                </p>
              </div>
              <div className="flex items-center gap-5">
                <span className="flex items-center gap-2" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--clr-muted)', letterSpacing: '0.08em' }}>
                  <span style={{ display: 'inline-block', width: 22, height: 2, background: ch.gold, borderRadius: 1 }} />
                  CIERRE
                </span>
                <span className="flex items-center gap-2" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--clr-muted)', letterSpacing: '0.08em' }}>
                  <span style={{ display: 'inline-block', width: 22, height: 2, background: `repeating-linear-gradient(90deg, ${ch.trm} 0, ${ch.trm} 5px, transparent 5px, transparent 9px)` }} />
                  TRM
                </span>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={360}>
              <ComposedChart data={report.dailyData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="histGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ch.gold} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={ch.gold} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={ch.grid} horizontal vertical={false} strokeDasharray="1 4" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => format(parseISO(d), 'dd/MM')}
                  tick={{ fill: ch.tick, fontSize: 11, fontFamily: 'var(--font-mono)' }}
                  axisLine={{ stroke: ch.border }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
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
                <Area
                  type="monotone"
                  dataKey="close"
                  stroke={ch.gold}
                  strokeWidth={2}
                  fill="url(#histGradient)"
                  name="Cierre"
                  dot={false}
                  activeDot={{ stroke: ch.gold, fill: theme === 'dark' ? '#090e1a' : '#fdf8ef', strokeWidth: 2, r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="trm"
                  stroke={ch.trm}
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={false}
                  name="TRM"
                  connectNulls
                />
                <ReferenceLine y={0} stroke={ch.border} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Data Table ── */}
        {report && report.dailyData.length > 0 && (
          <div style={{ background: 'var(--clr-card)', border: '1px solid var(--clr-border)', borderRadius: 12, padding: '24px', animation: 'card-enter 0.5s ease-out 480ms both' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--clr-text)', marginBottom: 20 }}>
              Detalle por Día
            </h2>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                <thead>
                  <tr>
                    {['Fecha', 'Apertura', 'Máximo', 'Mínimo', 'Cierre', 'Promedio', 'TRM', 'Desviación', 'Volumen', 'Transacc.'].map((col) => (
                      <th
                        key={col}
                        style={{
                          padding: '8px 12px',
                          textAlign: col === 'Fecha' ? 'left' : 'right',
                          color: 'var(--clr-muted)',
                          fontSize: 10,
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          borderBottom: '1px solid var(--clr-border)',
                          whiteSpace: 'nowrap',
                          fontWeight: 500,
                        }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...report.dailyData].reverse().map((day, i) => {
                    const devColor =
                      day.deviation === null ? 'var(--clr-muted)'
                      : day.deviation > 0 ? ch.positive
                      : day.deviation < 0 ? ch.negative
                      : 'var(--clr-muted)';

                    return (
                      <tr
                        key={day.date}
                        style={{
                          background: i % 2 === 0 ? 'transparent' : `rgba(var(--clr-card-rgb), 0.4)`,
                        }}
                      >
                        <td style={{ padding: '9px 12px', color: 'var(--clr-text)', whiteSpace: 'nowrap' }}>
                          {format(parseISO(day.date), "EEE dd/MM/yyyy", { locale: es })}
                        </td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', color: 'var(--clr-muted)' }}>{fmt(day.open)}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', color: 'var(--clr-muted)' }}>{fmt(day.high)}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', color: 'var(--clr-muted)' }}>{fmt(day.low)}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', color: 'var(--clr-text)', fontWeight: 500 }}>{fmt(day.close)}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', color: 'var(--clr-muted)' }}>{fmt(day.avgPrice)}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', color: 'var(--clr-muted)' }}>
                          {day.trm !== null ? fmt(day.trm) : <span style={{ color: 'var(--clr-border)' }}>—</span>}
                        </td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', color: devColor, fontWeight: 500 }}>
                          {day.deviation !== null
                            ? `${day.deviation >= 0 ? '+' : ''}${day.deviation.toFixed(2)}`
                            : <span style={{ color: 'var(--clr-border)' }}>—</span>}
                        </td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', color: 'var(--clr-muted)' }}>{fmtVol(day.volume)}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', color: 'var(--clr-muted)' }}>{day.transactions.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function SummaryCard({
  title, value, subtitle, badge, badgeUp, delay = 0,
}: {
  title: string; value: string; subtitle?: string;
  badge?: string; badgeUp?: boolean; delay?: number;
}) {
  return (
    <div style={{ background: 'var(--clr-card)', border: '1px solid var(--clr-border)', borderRadius: 12, padding: '18px 22px', animation: 'card-enter 0.5s ease-out both', animationDelay: `${delay}ms` }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--clr-muted)', marginBottom: 10 }}>
        {title}
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 500, color: 'var(--clr-text)', letterSpacing: '-0.01em' }}>
          {value}
        </span>
        {badge && (
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
            color: badgeUp ? 'var(--clr-positive)' : 'var(--clr-negative)',
          }}>
            {badge}
          </span>
        )}
      </div>
      {subtitle && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--clr-muted)' }}>{subtitle}</p>
      )}
    </div>
  );
}

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmt = (v: number) =>
  `$${v.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtVol = (v: number) => {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  return `$${v.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
};
