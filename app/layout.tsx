import type { Metadata } from 'next';
import { Fraunces, DM_Mono, DM_Sans } from 'next/font/google';
import { ThemeProvider } from './components/ThemeProvider';
import Nav from './components/Nav';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['300', '400', '500', '600', '700'],
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['300', '400', '500'],
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600'],
});

// Inline script: sets data-theme before React hydrates to prevent theme flash
const noFlashScript = `(function(){try{var t=localStorage.getItem('dr-theme')||(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

export const metadata: Metadata = {
  title: 'Dólar Realtime - Información del Dólar Interbancario',
  description:
    'Información del Dólar Interbancario en tiempo real desde SET-ICAP. Análisis TRM, históricos y reportes.',
  keywords: 'dolar, trm, colombia, tipo de cambio, set-icap',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      data-theme="light"
    >
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
      </head>
      <body className={`antialiased ${fraunces.variable} ${dmMono.variable} ${dmSans.variable}`}>
        <ThemeProvider>
          <Nav />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
