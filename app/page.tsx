import Link from 'next/link';

const features = [
  {
    code: 'RT',
    title: 'Dashboard en Tiempo Real',
    description: 'Precio del dólar actualizado cada 10 segundos con gráficos intradiarios.',
    href: '/dashboard',
    available: true,
  },
  {
    code: 'TRM',
    title: 'Análisis TRM',
    description: 'Compara el precio del mercado vs la TRM oficial con análisis de desviaciones.',
    href: '/reports/trm-analysis',
    available: true,
  },
  {
    code: 'HIST',
    title: 'Históricos',
    description: 'Consulta datos históricos del dólar con diferentes rangos de fechas.',
    href: '/historical',
    available: true,
  },
  {
    code: 'TRM·H',
    title: 'Historia TRM',
    description: 'Evolución histórica de la TRM oficial con variaciones diarias y distribución de cambios.',
    href: '/reports/trm-history',
    available: true,
  },
  {
    code: 'W5D',
    title: 'Reportes Semanales',
    description: 'Análisis de tendencias y momentum de 5 días con promedios móviles.',
    href: '/reports/weekly',
    available: false,
  },
  {
    code: 'MES',
    title: 'Vista Mensual',
    description: 'Resumen estadístico completo del mes con métricas clave.',
    href: '/reports/monthly',
    available: false,
  },
  {
    code: 'VOL',
    title: 'Análisis de Volatilidad',
    description: 'Volatilidad del mercado con Bollinger Bands y ATR.',
    href: '/reports/volatility',
    available: false,
  },
];

const facts = [
  { label: 'Datos en Tiempo Real', desc: 'Actualizaciones cada 20 segundos durante horas de mercado.' },
  { label: 'Persistencia en MongoDB', desc: 'Todos los datos históricos almacenados para análisis.' },
  { label: 'Reportes Avanzados', desc: '6 tipos de reportes con análisis estadístico.' },
  { label: 'Application Insights', desc: 'Monitoreo completo de rendimiento y uso.' },
];

export default function Home() {
  return (
    <div
      style={{
        background: 'var(--clr-bg-glow)',
        minHeight: 'calc(100vh - 52px)',
        color: 'var(--clr-text)',
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '72px 24px 64px' }}>

        {/* ── Hero ── */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: 72,
            animation: 'card-enter 0.6s ease-out both',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--clr-muted)',
              marginBottom: 16,
            }}
          >
            COP / USD · Mercado Interbancario Colombiano
          </p>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(40px, 8vw, 72px)',
              fontWeight: 600,
              lineHeight: 1.08,
              color: 'var(--clr-text)',
              marginBottom: 20,
              letterSpacing: '-0.02em',
            }}
          >
            Dólar Realtime
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 14,
              color: 'var(--clr-muted)',
              letterSpacing: '0.04em',
              maxWidth: 440,
              margin: '0 auto',
              lineHeight: 1.6,
            }}
          >
            Información del dólar interbancario en tiempo real desde SET-ICAP
          </p>

          {/* CTA buttons */}
          <div
            style={{
              display: 'flex',
              gap: 12,
              justifyContent: 'center',
              marginTop: 36,
              flexWrap: 'wrap',
            }}
          >
            <Link
              href="/dashboard"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                letterSpacing: '0.12em',
                padding: '11px 24px',
                borderRadius: 7,
                background: 'var(--clr-gold)',
                color: 'var(--clr-bg)',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              VER DASHBOARD →
            </Link>
            <Link
              href="/reports/trm-analysis"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                letterSpacing: '0.12em',
                padding: '11px 24px',
                borderRadius: 7,
                border: '1px solid var(--clr-border)',
                color: 'var(--clr-muted)',
                textDecoration: 'none',
              }}
            >
              ANÁLISIS TRM
            </Link>
          </div>
        </div>

        {/* Gold divider */}
        <div
          style={{
            height: 1,
            background: 'var(--clr-divider)',
            marginBottom: 56,
            animation: 'fade-in 0.8s ease-out 200ms both',
          }}
        />

        {/* ── Feature Grid ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
            marginBottom: 64,
          }}
        >
          {features.map((f, i) => (
            <FeatureCard key={f.code} feature={f} index={i} />
          ))}
        </div>

        {/* ── About ── */}
        <div
          style={{
            background: 'var(--clr-card)',
            border: '1px solid var(--clr-border)',
            borderRadius: 12,
            padding: '32px 36px',
            marginBottom: 48,
            animation: 'card-enter 0.5s ease-out 600ms both',
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              fontWeight: 600,
              color: 'var(--clr-text)',
              marginBottom: 24,
            }}
          >
            Acerca de esta aplicación
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              color: 'var(--clr-muted)',
              lineHeight: 1.7,
              marginBottom: 12,
            }}
          >
            Dólar Realtime es una aplicación Next.js que proporciona información
            actualizada sobre el tipo de cambio del dólar interbancario colombiano (COP/USD).
            Los datos son obtenidos de SET-ICAP, la plataforma oficial de negociación.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 20,
              marginTop: 28,
            }}
          >
            {facts.map((fact, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                }}
              >
                <span
                  style={{
                    color: 'var(--clr-gold)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 14,
                    lineHeight: 1.5,
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                >
                  ✓
                </span>
                <div>
                  <p
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      fontWeight: 500,
                      color: 'var(--clr-text)',
                      letterSpacing: '0.04em',
                      marginBottom: 3,
                    }}
                  >
                    {fact.label}
                  </p>
                  <p
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      color: 'var(--clr-muted)',
                      lineHeight: 1.6,
                    }}
                  >
                    {fact.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            textAlign: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--clr-muted)',
            letterSpacing: '0.06em',
            lineHeight: 2,
          }}
        >
          <a
            href="https://github.com/v1ct0rv/dolar-realtime"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--clr-gold)', textDecoration: 'none' }}
            aria-label="Ver en GitHub (abre en pestaña nueva)"
          >
            GitHub
          </a>
          <span style={{ margin: '0 12px' }}>·</span>
          Datos:{' '}
          <a
            href="https://dolar.set-icap.com/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--clr-gold)', textDecoration: 'none' }}
            aria-label="SET-ICAP (abre en pestaña nueva)"
          >
            SET-ICAP
          </a>
        </div>
      </div>
    </div>
  );
}

interface Feature {
  code: string;
  title: string;
  description: string;
  href: string;
  available: boolean;
}

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const card = (
    <div
      style={{
        background: 'var(--clr-card)',
        border: '1px solid var(--clr-border)',
        borderTop: feature.available
          ? '2px solid var(--clr-gold)'
          : '1px solid var(--clr-border)',
        borderRadius: 12,
        padding: '24px',
        opacity: feature.available ? 1 : 0.55,
        animation: 'card-enter 0.5s ease-out both',
        animationDelay: `${index * 70 + 200}ms`,
        transition: 'border-color 0.2s, transform 0.2s',
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Code badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.18em',
            color: feature.available ? 'var(--clr-gold)' : 'var(--clr-muted)',
            background: feature.available
              ? 'rgba(var(--clr-card-rgb), 0.5)'
              : 'transparent',
            border: `1px solid ${feature.available ? 'var(--clr-border)' : 'transparent'}`,
            padding: '3px 8px',
            borderRadius: 4,
          }}
        >
          {feature.code}
        </span>
        {!feature.available && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              letterSpacing: '0.14em',
              color: 'var(--clr-muted)',
              textTransform: 'uppercase',
              border: '1px solid var(--clr-border)',
              padding: '2px 7px',
              borderRadius: 10,
            }}
          >
            PRÓXIMAMENTE
          </span>
        )}
      </div>

      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 17,
          fontWeight: 600,
          color: 'var(--clr-text)',
          marginBottom: 8,
          lineHeight: 1.3,
        }}
      >
        {feature.title}
      </h3>
      <p
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: 'var(--clr-muted)',
          lineHeight: 1.65,
        }}
      >
        {feature.description}
      </p>

      {feature.available && (
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.1em',
            color: 'var(--clr-gold)',
            marginTop: 20,
          }}
          aria-hidden="true"
        >
          VER REPORTE →
        </p>
      )}
    </div>
  );

  if (feature.available) {
    return (
      <Link href={feature.href} style={{ textDecoration: 'none', display: 'block' }}>
        {card}
      </Link>
    );
  }

  return <div style={{ display: 'block' }}>{card}</div>;
}
