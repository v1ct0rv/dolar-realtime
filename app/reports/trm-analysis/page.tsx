import dynamic from 'next/dynamic';

const TRMAnalysisDashboard = dynamic(
  () => import('@/app/components/reports/TRMAnalysisDashboard')
);

export const metadata = {
  title: 'Análisis TRM - Dólar Realtime',
  description: 'Análisis comparativo entre el precio del mercado y la TRM oficial',
};

export default function TRMAnalysisPage() {
  return <TRMAnalysisDashboard initialDays={30} />;
}
