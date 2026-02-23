import dynamic from 'next/dynamic';

const HistoricalDashboard = dynamic(
  () => import('@/app/components/historical/HistoricalDashboard')
);

export const metadata = {
  title: 'Históricos - Dólar Realtime',
  description: 'Datos históricos del dólar interbancario colombiano con diferentes rangos de fechas',
};

export default function HistoricalPage() {
  return <HistoricalDashboard />;
}
