'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from './ThemeProvider';

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/historical', label: 'Históricos' },
  { href: '/reports/trm-analysis', label: 'Análisis TRM' },
  { href: '/reports/trm-history', label: 'Historia TRM' },
];

export default function Nav() {
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'var(--clr-nav-bg)',
        borderBottom: '1px solid var(--clr-border)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '0 24px',
          height: 52,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: 'var(--clr-gold)',
              display: 'inline-block',
              flexShrink: 0,
            }}
            aria-hidden="true"
          />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: '0.12em',
              color: 'var(--clr-text)',
            }}
          >
            DÓLAR<span style={{ color: 'var(--clr-muted)' }}>·</span>RT
          </span>
        </Link>

        {/* Links + toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {navLinks.map(({ href, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  letterSpacing: '0.08em',
                  padding: '5px 12px',
                  borderRadius: 6,
                  textDecoration: 'none',
                  color: active ? 'var(--clr-gold)' : 'var(--clr-muted)',
                  background: active ? 'rgba(var(--clr-card-rgb), 0.6)' : 'transparent',
                  border: active ? '1px solid var(--clr-border)' : '1px solid transparent',
                  transition: 'color 0.15s, background 0.15s',
                }}
              >
                {label}
              </Link>
            );
          })}

          {/* Divider */}
          <span
            style={{
              width: 1,
              height: 16,
              background: 'var(--clr-border)',
              margin: '0 6px',
              flexShrink: 0,
            }}
          />

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            suppressHydrationWarning
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 6,
              border: '1px solid var(--clr-border)',
              background: 'transparent',
              color: 'var(--clr-muted)',
              cursor: 'pointer',
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>
    </nav>
  );
}
