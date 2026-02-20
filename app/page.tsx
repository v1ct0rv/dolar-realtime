import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-4">
            Dólar Realtime
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Información del Dólar Interbancario en Tiempo Real
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <FeatureCard
            title="Dashboard en Tiempo Real"
            description="Visualiza el precio del dólar actualizado cada 10 segundos con gráficos interactivos."
            href="/dashboard"
            icon="📊"
            status="Available"
          />
          <FeatureCard
            title="Análisis TRM"
            description="Compara el precio del mercado vs la TRM oficial con análisis detallado de desviaciones."
            href="/reports/trm-analysis"
            icon="📈"
            status="Available"
          />
          <FeatureCard
            title="Históricos"
            description="Consulta datos históricos del dólar con diferentes rangos de fechas."
            href="/historical"
            icon="📅"
            status="Coming Soon"
          />
          <FeatureCard
            title="Reportes Semanales"
            description="Análisis de tendencias y momentum de 5 días con promedios móviles."
            href="/reports/weekly"
            icon="📉"
            status="Coming Soon"
          />
          <FeatureCard
            title="Vista Mensual"
            description="Resumen estadístico completo del mes con métricas clave."
            href="/reports/monthly"
            icon="📆"
            status="Coming Soon"
          />
          <FeatureCard
            title="Análisis de Volatilidad"
            description="Mide la volatilidad del mercado con Bollinger Bands y ATR."
            href="/reports/volatility"
            icon="⚡"
            status="Coming Soon"
          />
        </div>

        {/* Info Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Acerca de esta aplicación
          </h2>
          <div className="space-y-4 text-gray-600 dark:text-gray-300">
            <p>
              Dólar Realtime es una aplicación Next.js que proporciona
              información actualizada sobre el tipo de cambio del dólar
              interbancario colombiano (COP/USD).
            </p>
            <p>
              Los datos son obtenidos de SET-ICAP, la plataforma oficial de
              negociación.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">✓</span>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Datos en Tiempo Real
                  </h3>
                  <p className="text-sm">
                    Actualizaciones cada 20 segundos durante horas de mercado
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">✓</span>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Persistencia en MongoDB
                  </h3>
                  <p className="text-sm">
                    Todos los datos históricos almacenados para análisis
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">✓</span>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Reportes Avanzados
                  </h3>
                  <p className="text-sm">
                    6 tipos de reportes con análisis estadístico
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">✓</span>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Application Insights
                  </h3>
                  <p className="text-sm">
                    Monitoreo completo de rendimiento y uso
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-600 dark:text-gray-400">
          <p>
            <a
              href="https://github.com/v1ct0rv/dolar-realtime"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              View on GitHub
            </a>
          </p>
          <p className="mt-2 text-sm">
            Datos proporcionados por{" "}
            <a
              href="https://dolar.set-icap.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800"
            >
              SET-ICAP
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

interface FeatureCardProps {
  title: string;
  description: string;
  href: string;
  icon: string;
  status: 'Available' | 'Coming Soon';
}

function FeatureCard({ title, description, href, icon, status }: FeatureCardProps) {
  const isAvailable = status === 'Available';

  const card = (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 transition-all ${
        isAvailable
          ? 'hover:shadow-xl hover:-translate-y-1 cursor-pointer'
          : 'opacity-75 cursor-not-allowed'
      }`}
    >
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-300 mb-4">{description}</p>
      <div className="flex items-center justify-between">
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold ${
            isAvailable
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
          }`}
        >
          {status}
        </span>
        {isAvailable && (
          <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">
            Ver más →
          </span>
        )}
      </div>
    </div>
  );

  if (isAvailable) {
    return <Link href={href}>{card}</Link>;
  }

  return card;
}
