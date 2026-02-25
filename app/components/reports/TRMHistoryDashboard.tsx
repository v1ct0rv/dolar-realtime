'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, subDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  ReferenceLine,
  Cell,
} from 'recharts';
import { TRMHistoryReport } from '@/types';
import { useTheme } from '../ThemeProvider';

// ─── Chart color maps ─────────────────────────────────────────────────────────
const darkChart = {
  trm: '#3a6fef',
  trmFill: 'rgba(58,111,239,0.15)',
  up: '#22c55e',
  down: '#ef4444',
  equal: '#7a9ab8',
  grid: 'rgba(20,31,51,0.9)',
  tick: '#7a9ab8',
  border: '#1e2d47',
  tooltipBg: 'rgba(20,29,48,0.97)',
};
const lightChart = {
  trm: '#1842c0',
  trmFill: 'rgba(24,66,192,0.1)',
  up: '#15803d',
  down: '#b91c1c',
  equal: '#9a8060',
  grid: 'rgba(210,190,160,0.55)',
  tick: '#9a8060',
  border: '#ddd0b8',
  tooltipBg: 'rgba(253,248,239,0.97)',
};

const PRESETS = [
  { label: '1M',  days: 30 },
  { label: '3M',  days: 90 },
  { label: '6M',  days: 180 },
  { label: '1A',  days: 365 },
  { label: '2A',  days: 730 },
];

// ─── Tooltip ──────────────────────────────────────────────────────────────────
interface TooltipEntry { dataKey?: string; value?: number; color?: string; name?: string; }
interface ChartTooltipProps {
  active?: boolean;
  payload?: readonly TooltipEntry[];
  label?: string | number;
  ch: typeof darkChart;
  showDelta?: boolean;
}

function ChartTooltip({ active, payload, label, ch, showDelta }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0 || !label) return null;
  return (
    <div style={{ background: ch.tooltipBg, border: `1px solid ${ch.border}`, borderRadius: 8, padding: '10px 14px', backdropFilter: 'blur(12px)' }}>
      <p style={{ color: ch.tick, fontFamily: 'var(--font-mono)', fontSize: 11, marginBottom: 8 }}>
        {format(parseISO(String(label)), "EEEE d 'de' MMMM yyyy", { locale: es })}
      </p>
      {payload.map((entry, i) =>
        entry.value !== undefined ? (
          <p key={i} style={{ color: entry.color || ch.trm, fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, margin: '3px 0' }}>
            {entry.name}:{' '}
            {showDelta
              ? `${entry.value >= 0 ? '+' : ''}${entry.value.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : `$${entry.value.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            }
          </p>
        ) : null
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function TRMHistoryDashboard() {
  const { theme } = useTheme();
  const ch = theme === 'dark' ? darkChart : lightChart;

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const defaultStart = format(subDays(new Date(), 90), 'yyyy-MM-dd');

  const [report, setReport] = useState<TRMHistoryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(90);
  const [dateRange, setDateRange] = useState({ start: defaultStart, end: todayStr });
  const [customStart, setCustomStart] = useState(defaultStart);
  const [customEnd, setCustomEnd] = useState(todayStr);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/reports/trm-history?startDate=${dateRange.start}&endDate=${dateRange.end}`);
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

  // Tight domain
  const trmDomain = (() => {
    if (!report) return ['auto', 'auto'] as const;
    const vals = report.dailyData.map((d) => d.value);
    if (vals.length === 0) return ['auto', 'auto'] as const;
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const pad = Math.max((hi - lo) * 0.1, 5);
    return [Math.floor(lo - pad), Math.ceil(hi + pad)] as [number, number];
  })();

  // Delta domain (centered around 0)
  const deltaDomain = (() => {
    if (!report) return ['auto', 'auto'] as const;
    const deltas = report.dailyData.map((d) => d.delta ?? 0);
    const abs = Math.max(...deltas.map(Math.abs), 1);
    const pad = abs * 0.2;
    return [-(abs + pad), abs + pad] as [number, number];
  })();

  if (loading) {
    return (
      <div role="status" aria-label="Cargando TRM" style={{ background: 'var(--clr-bg-glow)', minHeight: 'calc(100vh - 52px)' }} className="flex items-center justify-center">
        <div className="text-center space-y-4">
          <div style={{ width: 40, height: 40, border: '2px solid var(--clr-border)', borderTopColor: 'var(--clr-blue)', borderRadius: '50%', margin: '0 auto' }} className="motion-safe:animate-spin" aria-hidden="true" />
          <p style={{ color: 'var(--clr-muted)', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.1em' }}>CARGANDO TRM...</p>
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
          <button onClick={fetchReport} style={{ background: 'var(--clr-blue)', color: '#fff', borderRadius: 6, padding: '8px 18px', fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer', border: 'none' }}>
            REINTENTAR
          </button>
        </div>
      </div>
    );
  }

  const s = report?.summary;
  const totalUp = s ? s.totalChangePercent >= 0 : false;

  return (
    <div style={{ background: 'var(--clr-bg-glow)', minHeight: 'calc(100vh - 52px)', color: 'var(--clr-text)' }}>
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* ── Header ── */}
        <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-4" style={{ animation: 'card-enter 0.5s ease-out both' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--clr-muted)', marginBottom: 6 }}>
              COP / USD · Tasa Representativa del Mercado
            </p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 600, lineHeight: 1.1, color: 'var(--clr-text)' }}>
              Historia TRM
            </h1>
          </div>

          {/* ── Date controls ── */}
          <div className="flex flex-col gap-3" style={{ animation: 'card-enter 0.5s ease-out 80ms both' }}>
            <div className="flex items-center gap-2" role="group" aria-label="Rango rápido">
              {PRESETS.map(({ label, days }) => (
                <button
                  key={days}
                  onClick={() => handlePreset(days)}
                  aria-pressed={selectedPreset === days}
                  style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em',
                    padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
                    border: `1px solid ${selectedPreset === days ? 'var(--clr-blue)' : 'var(--clr-border)'}`,
                    background: selectedPreset === days ? 'var(--clr-blue)' : 'transparent',
                    color: selectedPreset === days ? '#fff' : 'var(--clr-muted)',
                    fontWeight: selectedPreset === days ? 500 : 400,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input type="date" value={customStart} max={customEnd}
                onChange={(e) => setCustomStart(e.target.value)}
                style={{ fontFamily: 'var(--font-mono)', fontSize: 11, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--clr-border)', background: 'var(--clr-card)', color: 'var(--clr-text)', cursor: 'pointer', outline: 'none' }}
              />
              <span style={{ color: 'var(--clr-muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>—</span>
              <input type="date" value={customEnd} min={customStart} max={todayStr}
                onChange={(e) => setCustomEnd(e.target.value)}
                style={{ fontFamily: 'var(--font-mono)', fontSize: 11, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--clr-border)', background: 'var(--clr-card)', color: 'var(--clr-text)', cursor: 'pointer', outline: 'none' }}
              />
              <button onClick={handleCustomApply}
                style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', padding: '5px 14px', borderRadius: 6, cursor: 'pointer', border: '1px solid var(--clr-border)', background: 'var(--clr-card)', color: 'var(--clr-muted)' }}
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <SummaryCard title="TRM INICIAL" value={fmt(s.firstValue)} delay={0} />
            <SummaryCard
              title="TRM ACTUAL"
              value={fmt(s.lastValue)}
              badge={`${totalUp ? '+' : ''}${s.totalChangePercent.toFixed(2)}%`}
              badgeUp={totalUp}
              delay={70}
            />
            <SummaryCard title="MÍNIMA" value={fmt(s.minValue)} delay={140} />
            <SummaryCard title="MÁXIMA" value={fmt(s.maxValue)} delay={210} />
            <SummaryCard title="PROMEDIO" value={fmt(s.avgValue)} delay={280} />
            <SummaryCard
              title="DÍAS"
              value={s.tradingDays.toString()}
              subtitle={`↑ ${s.daysUp}  ↓ ${s.daysDown}  = ${s.daysEqual}`}
              delay={350}
            />
          </div>
        )}

        {/* ── Distribution bar ── */}
        {s && s.tradingDays > 0 && (
          <div style={{ background: 'var(--clr-card)', border: '1px solid var(--clr-border)', borderRadius: 12, padding: '20px 24px', animation: 'card-enter 0.5s ease-out 420ms both' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--clr-muted)', marginBottom: 12 }}>
              Distribución de Cambios
            </p>
            <div style={{ display: 'flex', gap: 2, borderRadius: 6, overflow: 'hidden', height: 12 }}>
              <div style={{ flex: s.daysUp, background: ch.up, transition: 'flex 0.4s ease' }} title={`Subida: ${s.daysUp} días`} />
              <div style={{ flex: s.daysEqual, background: ch.equal, transition: 'flex 0.4s ease' }} title={`Sin cambio: ${s.daysEqual} días`} />
              <div style={{ flex: s.daysDown, background: ch.down, transition: 'flex 0.4s ease' }} title={`Bajada: ${s.daysDown} días`} />
            </div>
            <div className="flex items-center gap-6 mt-3">
              {[
                { label: 'Subida', count: s.daysUp, pct: ((s.daysUp / s.tradingDays) * 100).toFixed(1), color: ch.up },
                { label: 'Sin cambio', count: s.daysEqual, pct: ((s.daysEqual / s.tradingDays) * 100).toFixed(1), color: ch.equal },
                { label: 'Bajada', count: s.daysDown, pct: ((s.daysDown / s.tradingDays) * 100).toFixed(1), color: ch.down },
              ].map(({ label, count, pct, color }) => (
                <span key={label} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--clr-muted)' }}>
                  <span style={{ color, marginRight: 4 }}>●</span>
                  {label}: <strong style={{ color: 'var(--clr-text)' }}>{count}</strong>
                  <span style={{ color: 'var(--clr-muted)', marginLeft: 4 }}>({pct}%)</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── TRM Line Chart ── */}
        {report && report.dailyData.length > 0 && (
          <div style={{ background: 'var(--clr-card)', border: '1px solid var(--clr-border)', borderRadius: 12, padding: '24px 24px 20px', animation: 'card-enter 0.5s ease-out 490ms both' }}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--clr-text)', marginBottom: 4 }}>
                  Evolución TRM
                </h2>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--clr-muted)' }}>
                  {format(parseISO(report.dateRange.start), "d 'de' MMM yyyy", { locale: es })}
                  {' — '}
                  {format(parseISO(report.dateRange.end), "d 'de' MMM yyyy", { locale: es })}
                </p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={report.dailyData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="trmGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ch.trm} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={ch.trm} stopOpacity={0} />
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
                  domain={trmDomain}
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
                  dataKey="value"
                  stroke={ch.trm}
                  strokeWidth={2}
                  fill="url(#trmGradient)"
                  name="TRM"
                  dot={false}
                  activeDot={{ stroke: ch.trm, fill: theme === 'dark' ? '#141d30' : '#fdf8ef', strokeWidth: 2, r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Daily Delta Bar Chart ── */}
        {report && report.dailyData.length > 0 && (
          <div style={{ background: 'var(--clr-card)', border: '1px solid var(--clr-border)', borderRadius: 12, padding: '24px 24px 20px', animation: 'card-enter 0.5s ease-out 560ms both' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--clr-text)', marginBottom: 4 }}>
              Variación Diaria
            </h2>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--clr-muted)', marginBottom: 20 }}>
              Cambio absoluto de la TRM respecto al día anterior
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={report.dailyData} margin={{ top: 5, right: 16, left: 0, bottom: 0 }}>
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
                  domain={deltaDomain}
                  tick={{ fill: ch.tick, fontSize: 11, fontFamily: 'var(--font-mono)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(0)}`}
                  width={60}
                />
                <Tooltip
                  content={(props) => <ChartTooltip {...props} ch={ch} showDelta />}
                  cursor={{ stroke: ch.border, strokeWidth: 1, strokeDasharray: '3 3' }}
                />
                <ReferenceLine y={0} stroke={ch.border} strokeWidth={1} />
                <Bar dataKey="delta" name="Δ TRM" radius={[2, 2, 0, 0]} maxBarSize={12}>
                  {report.dailyData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={(entry.delta ?? 0) >= 0 ? ch.up : ch.down}
                      fillOpacity={0.85}
                    />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Data Table ── */}
        {report && report.dailyData.length > 0 && (
          <div style={{ background: 'var(--clr-card)', border: '1px solid var(--clr-border)', borderRadius: 12, padding: '24px', animation: 'card-enter 0.5s ease-out 630ms both' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--clr-text)', marginBottom: 20 }}>
              Detalle por Día
            </h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                <thead>
                  <tr>
                    {['Fecha', 'TRM', 'TRM Anterior', 'Variación', 'Variación %', 'Dirección'].map((col) => (
                      <th key={col} style={{
                        padding: '8px 12px',
                        textAlign: col === 'Fecha' ? 'left' : 'right',
                        color: 'var(--clr-muted)',
                        fontSize: 10,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        borderBottom: '1px solid var(--clr-border)',
                        whiteSpace: 'nowrap',
                        fontWeight: 500,
                      }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...report.dailyData].reverse().map((day, i) => {
                    const deltaColor =
                      day.delta === null ? 'var(--clr-muted)'
                      : day.delta > 0 ? ch.up
                      : day.delta < 0 ? ch.down
                      : 'var(--clr-muted)';
                    const dirIcon =
                      day.change === 'up' ? '↑'
                      : day.change === 'down' ? '↓'
                      : '=';
                    const dirColor =
                      day.change === 'up' ? ch.up
                      : day.change === 'down' ? ch.down
                      : ch.equal;

                    return (
                      <tr key={day.date} style={{ background: i % 2 === 0 ? 'transparent' : `rgba(var(--clr-card-rgb), 0.4)` }}>
                        <td style={{ padding: '9px 12px', color: 'var(--clr-text)', whiteSpace: 'nowrap' }}>
                          {format(parseISO(day.date), "EEE dd/MM/yyyy", { locale: es })}
                        </td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', color: 'var(--clr-text)', fontWeight: 500 }}>{fmt(day.value)}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', color: 'var(--clr-muted)' }}>
                          {day.previousValue !== null ? fmt(day.previousValue) : <span style={{ color: 'var(--clr-border)' }}>—</span>}
                        </td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', color: deltaColor, fontWeight: 500 }}>
                          {day.delta !== null
                            ? `${day.delta >= 0 ? '+' : ''}${day.delta.toFixed(2)}`
                            : <span style={{ color: 'var(--clr-border)' }}>—</span>}
                        </td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', color: deltaColor }}>
                          {day.deltaPercent !== null
                            ? `${day.deltaPercent >= 0 ? '+' : ''}${day.deltaPercent.toFixed(4)}%`
                            : <span style={{ color: 'var(--clr-border)' }}>—</span>}
                        </td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', color: dirColor, fontWeight: 600, fontSize: 14 }}>
                          {dirIcon}
                        </td>
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
    <div style={{ background: 'var(--clr-card)', border: '1px solid var(--clr-border)', borderTop: '2px solid var(--clr-blue)', borderRadius: 12, padding: '18px 22px', animation: 'card-enter 0.5s ease-out both', animationDelay: `${delay}ms` }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--clr-muted)', marginBottom: 10 }}>
        {title}
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 500, color: 'var(--clr-text)', letterSpacing: '-0.01em' }}>
          {value}
        </span>
        {badge && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, color: badgeUp ? 'var(--clr-positive)' : 'var(--clr-negative)' }}>
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
