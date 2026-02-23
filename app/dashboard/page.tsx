import dynamic from 'next/dynamic';

const RealTimeDashboard = dynamic(
  () => import('@/app/components/dashboard/RealTimeDashboard')
);

export const metadata = {
  title: 'Dashboard en Tiempo Real - Dólar Realtime',
  description: 'Dashboard en tiempo real del dólar interbancario colombiano (COP/USD)',
};

export default function DashboardPage() {
  return <RealTimeDashboard />;
}
