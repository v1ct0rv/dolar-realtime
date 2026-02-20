import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Dólar Realtime - Información del Dólar Interbancario',
  description:
    'Información del Dólar Interbancario en tiempo real desde SET-ICAP. Análisis TRM, históricos y reportes.',
  keywords: 'dolar, trm, colombia, tipo de cambio, set-icap',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
