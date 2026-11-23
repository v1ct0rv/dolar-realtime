'use client';

import { useEffect, useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { BrentOilData } from '@/types';

/** The part of the dashboard's chart colour map this chart uses. */
export interface ChartColors {
  gold: string;
  grid: string;
  tick: string;
  cardBg: string;
  border: string;
  tooltipBg: string;
}

const REFRESH_MS = 60_000;

const twoDecimals = (n: number) =>
  n.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${twoDecimals(Math.abs(n))}`;
const arrow = (n: number) => (n > 0 ? '▲' : n < 0 ? '▼' : '—');
const trendColor = (n: number) =>
  n > 0 ? 'var(--clr-positive)' : n < 0 ? 'var(--clr-negative)' : 'var(--clr-muted)';

const mono = { fontFamily: 'var(--font-mono)' } as const;

// One move: number, time, change, headline. On a phone the headline takes its
// own row under the time and the change.
const MOVE_ROW =
  'grid grid-cols-[20px_auto_1fr] sm:grid-cols-[20px_auto_auto_1fr] items-baseline gap-x-3 gap-y-1';
const HEADLINE_CELL = 'col-start-2 col-span-2 sm:col-start-auto sm:col-span-1';

interface OilTooltipProps {
  active?: boolean;
  payload?: readonly { value?: number | string }[];
  label?: string | number;
  ch: ChartColors;
}

function OilTooltip({ active, payload, label, ch }: OilTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      style={{
        background: ch.tooltipBg,
        border: `1px solid ${ch.border}`,
        borderRadius: 8,
        padding: '10px 14px',
        backdropFilter: 'blur(12px)',
      }}
    >
      <p style={{ ...mono, color: ch.tick, fontSize: 11, letterSpacing: '0.06em', marginBottom: 6 }}>
        {format(new Date(label as number), 'HH:mm')}
      </p>
      <p style={{ ...mono, color: 'var(--clr-text)', fontSize: 16, fontWeight: 500 }}>
        US$ {twoDecimals(payload[0].value as number)}
      </p>
    </div>
  );
}

/**
 * Today's Brent oil price, with a numbered dot where it moved sharply and, under
 * the chart, the headline published closest to each move. Renders nothing when
 * the data is unavailable: oil is context for the dollar, not the page's subject.
 */
export default function BrentOilChart({ ch }: { ch: ChartColors }) {
  const [oil, setOil] = useState<BrentOilData | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const result = await (await fetch('/api/oil/brent')).json();
        if (!cancelled) setOil(result.success ? result.data : null);
      } catch {
        if (!cancelled) setOil(null);
      }
    };

    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (!oil || oil.points.length === 0) return null;

  const data = oil.points.map(([timestamp, price]) => ({ timestamp, price }));
  const prices = data.map((d) => d.price);
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  const pad = Math.max((hi - lo) * 0.2, 0.2);

  // One tick every two hours, on the hour, in the reader's own time.
  const ticks = data
    .map((d) => d.timestamp)
    .filter((ts) => new Date(ts).getMinutes() === 0 && new Date(ts).getHours() % 2 === 0);

  const change = oil.price - oil.previousClose;
  const changePercent = (change / oil.previousClose) * 100;

  return (
    <section
      aria-labelledby="brent-title"
      style={{
        background: 'var(--clr-card)',
        border: '1px solid var(--clr-border)',
        borderRadius: 12,
        padding: '24px 24px 20px',
        animation: 'card-enter 0.6s ease-out 500ms both',
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div>
          <h2
            id="brent-title"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 20,
              fontWeight: 600,
              color: 'var(--clr-text)',
              marginBottom: 4,
            }}
          >
            Petróleo Brent
          </h2>
          <a
            href="https://finance.yahoo.com/quote/BZ=F/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...mono,
              color: 'var(--clr-muted)',
              fontSize: 11,
              textDecoration: 'none',
              letterSpacing: '0.04em',
            }}
          >
            finance.yahoo.com · BZ=F
          </a>
          {/* At a weekend this is Friday's session: say which day the chart is. */}
          <span style={{ ...mono, color: 'var(--clr-muted)', fontSize: 11, letterSpacing: '0.04em' }}>
            {' · '}sesión del {format(new Date(data[data.length - 1].timestamp), "d 'de' MMM", { locale: es })}
          </span>
        </div>

        <div className="sm:text-right">
          <p style={{ ...mono, color: 'var(--clr-text)', fontSize: 24, fontWeight: 500, lineHeight: 1.1 }}>
            US$ {twoDecimals(oil.price)}
          </p>
          <p style={{ ...mono, fontSize: 12, marginTop: 4 }}>
            <span style={{ color: trendColor(change), whiteSpace: 'nowrap', marginRight: 10 }}>
              {arrow(change)} {signed(change)} ({signed(changePercent)} %)
            </span>
            <span style={{ color: 'var(--clr-muted)', display: 'inline-block' }}>
              Cierre anterior US$ {twoDecimals(oil.previousClose)}
            </span>
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 14, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="brentGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={ch.gold} stopOpacity={0.22} />
              <stop offset="95%" stopColor={ch.gold} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke={ch.grid} horizontal vertical={false} strokeDasharray="1 4" />

          <XAxis
            dataKey="timestamp"
            tickFormatter={(ts) => format(new Date(ts), 'HH:mm')}
            tick={{ fill: ch.tick, fontSize: 11, fontFamily: 'var(--font-mono)' }}
            axisLine={{ stroke: ch.border }}
            tickLine={false}
            ticks={ticks}
            minTickGap={24}
          />
          <YAxis
            orientation="right"
            domain={[Math.floor((lo - pad) * 10) / 10, Math.ceil((hi + pad) * 10) / 10]}
            tick={{ fill: ch.tick, fontSize: 11, fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${twoDecimals(v)}`}
            width={64}
          />

          <Tooltip
            content={(props) => <OilTooltip {...props} ch={ch} />}
            cursor={{ stroke: ch.border, strokeWidth: 1, strokeDasharray: '3 3' }}
          />

          <Area
            type="monotone"
            dataKey="price"
            stroke={ch.gold}
            strokeWidth={2}
            fill="url(#brentGradient)"
            name="Precio"
            dot={false}
            activeDot={{ stroke: ch.gold, fill: ch.cardBg, strokeWidth: 2, r: 5 }}
            isAnimationActive={false}
          />

          {oil.moves.map((move, i) => (
            <ReferenceDot
              key={move.timestamp}
              x={move.timestamp}
              y={move.price}
              r={9}
              fill={ch.gold}
              stroke={ch.cardBg}
              strokeWidth={2}
              label={{ value: i + 1, position: 'center', fill: ch.cardBg, fontSize: 11, fontWeight: 700 }}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>

      {oil.moves.length > 0 && (
        <>
          <ol
            role="list"
            aria-label="Movimientos fuertes del Brent en la sesión"
            style={{ listStyle: 'none', padding: 0, margin: '18px 0 0', display: 'grid', gap: 10 }}
          >
            {oil.moves.map((move, i) => (
              <li
                key={move.timestamp}
                className={MOVE_ROW}
                style={{ fontSize: 13 }}
              >
                <span
                  style={{
                    ...mono,
                    display: 'inline-block',
                    minWidth: 20,
                    textAlign: 'center',
                    borderRadius: 10,
                    background: ch.gold,
                    color: ch.cardBg,
                    fontSize: 11,
                    fontWeight: 700,
                    lineHeight: '20px',
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ ...mono, color: 'var(--clr-muted)', fontSize: 12 }}>
                  {format(new Date(move.timestamp), 'HH:mm')}
                </span>
                <span style={{ ...mono, color: trendColor(move.changePercent), fontSize: 12, whiteSpace: 'nowrap' }}>
                  {arrow(move.changePercent)} {signed(move.changePercent)} % en 30 min
                </span>
                {move.headline ? (
                  <span className={HEADLINE_CELL} style={{ color: 'var(--clr-text)' }}>
                    <a
                      href={move.headline.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-dotted underline-offset-4 hover:decoration-solid"
                      style={{ color: 'inherit' }}
                    >
                      {move.headline.title}
                    </a>
                    <span style={{ color: 'var(--clr-muted)' }}> — {move.headline.source}</span>
                  </span>
                ) : (
                  <span className={HEADLINE_CELL} style={{ color: 'var(--clr-muted)' }}>
                    Sin titular cercano
                  </span>
                )}
              </li>
            ))}
          </ol>
          <p style={{ ...mono, color: 'var(--clr-muted)', fontSize: 11, letterSpacing: '0.04em', marginTop: 14 }}>
            Variaciones de 0,75 % o más en 30 minutos, con el titular de Google News más cercano en el tiempo.
          </p>
        </>
      )}
    </section>
  );
}
