import dynamic from 'next/dynamic';

const TRMHistoryDashboard = dynamic(
  () => import('@/app/components/reports/TRMHistoryDashboard')
);

export const metadata = {
  title: 'Historia TRM - Dólar Realtime',
  description: 'Evolución histórica de la Tasa Representativa del Mercado (TRM) oficial del peso colombiano',
};

export default function TRMHistoryPage() {
  return <TRMHistoryDashboard />;
}
