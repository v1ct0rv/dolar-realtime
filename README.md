# Dólar Realtime

> **Modern Next.js application for real-time Colombian Peso (COP) to USD exchange rate tracking**

Información del Dólar Interbancario en tiempo real desde [SET-ICAP](https://dolar.set-icap.com/)

## 🎉 Version 2.0 - Next.js Rewrite

This repository has been upgraded from Express.js to **Next.js 15** with TypeScript, MongoDB persistence, and advanced analytics.

### ✨ New Features

- 🚀 **Modern Stack**: Next.js 15 + TypeScript + Tailwind CSS
- 💾 **Data Persistence**: MongoDB for historical analysis
- 📊 **TRM Analysis Dashboard**: Compare market vs. official rate with statistical insights
- 📈 **6 Report Types**: Daily, Weekly, Monthly, TRM, Volatility, Volume (more coming soon)
- 🎨 **Beautiful UI**: Responsive design with dark mode support
- 🔄 **Real-time Updates**: Background data collection every 20 seconds
- 📱 **Mobile Friendly**: Works perfectly on all devices

## 🚀 Quick Start

### Prerequisites

- Node.js 20.x or later
- MongoDB 6.0 or later
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local

# Edit .env.local with your MongoDB URI and ICAP token

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 Documentation

- **[SETUP_COMPLETE.md](SETUP_COMPLETE.md)** - What we built and how to use it
- **[NEXTJS_README.md](NEXTJS_README.md)** - Complete Next.js setup guide
- **[REACT_REWRITE_REQUIREMENTS.md](REACT_REWRITE_REQUIREMENTS.md)** - Full technical requirements
- **[SUGGESTED_REPORTS.md](SUGGESTED_REPORTS.md)** - Detailed report specifications

## 🎯 Available Features

### ✅ TRM Analysis Dashboard
**[/reports/trm-analysis](http://localhost:3000/reports/trm-analysis)**

Compare market closing prices with official TRM:
- Statistical metrics (avg, max, min, correlation)
- Distribution analysis (days above/below TRM)
- Trend detection with consecutive day tracking
- Interactive charts with Recharts
- Automated alerts for unusual deviations

### 🔜 Coming Soon

- Real-time Dashboard with live updates
- Historical Data Browser
- Weekly Trends Report
- Monthly Overview
- Volatility Analysis
- Volume Analysis

## 🗄️ Architecture

```
Next.js 15 App
    ├── API Routes (Serverless Functions)
    ├── React Components (Client-Side)
    ├── MongoDB (Data Persistence)
    └── Recharts (Data Visualization)
```

## 📂 Project Structure

```
dolar-realtime/
├── app/                  # Next.js App Router
│   ├── api/             # API routes
│   ├── components/      # React components
│   ├── reports/         # Report pages
│   └── page.tsx         # Home page
├── lib/                 # Utilities
│   ├── mongodb.ts       # Database connection
│   ├── aggregations.ts  # MongoDB pipelines
│   └── services/        # External services
├── types/               # TypeScript types
├── legacy/              # Old Express.js app
└── public/              # Static assets
```

## 🛠️ Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5.7
- **Database**: MongoDB 6.0+
- **Styling**: Tailwind CSS 3.4
- **Charts**: Recharts 2.15
- **Data Source**: SET-ICAP API

## 🧪 Development

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Lint code
npm run lint
```

## 📊 API Endpoints

### TRM Analysis
```bash
GET /api/reports/trm-analysis?startDate=2026-01-01&endDate=2026-01-08
```

### Data Collection (Cron)
```bash
POST /api/cron/collect-data
Authorization: Bearer <secret-token>
```

## 🚢 Deployment

### Azure Static Web Apps (Recommended)

1. Create Azure Static Web Apps resource
2. Connect to GitHub
3. Configure build: `npm run build`
4. Set environment variables
5. Deploy!

See [NEXTJS_README.md](NEXTJS_README.md) for detailed deployment instructions.

## 📝 Legacy App

The original Express.js application is preserved in the `/legacy` folder.

To run the legacy app:
```bash
cd legacy
npm install
npm start
```

## 🔗 Links

- **Live App**: [https://dolar.victorv.co/](https://dolar.victorv.co/) (Legacy version)
- **GitHub**: [https://github.com/victorv977/dolar-realtime](https://github.com/victorv977/dolar-realtime)
- **Data Source**: [SET-ICAP](https://dolar.set-icap.com/)

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

---

**Built with ❤️ using Next.js, TypeScript, MongoDB, and Tailwind CSS**
