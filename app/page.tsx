"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Header from "@/components/Header";
import MetricsStrip from "@/components/MetricsStrip";
import VesselList from "@/components/VesselList";
import TransitChart from "@/components/TransitChart";
import OilPriceChart from "@/components/OilPriceChart";
import NewsPanel from "@/components/NewsPanel";
import WeatherBar from "@/components/WeatherBar";
import NavalForcesPanel from "@/components/NavalForcesPanel";
import ContextBar from "@/components/ContextBar";
import EscalationIndex from "@/components/EscalationIndex";
import CrisisSimulator from "@/components/CrisisSimulator";
import StrandedCargo from "@/components/StrandedCargo";
import CountryImpact from "@/components/CountryImpact";
import CrisisTimeline from "@/components/CrisisTimeline";
import BypassRoutes from "@/components/BypassRoutes";
import { computeMetrics } from "@/lib/utils";
import type {
  AISData,
  TransitDay,
  PricePoint,
  NewsItem,
  DayWeather,
  DashboardMetrics,
  Vessel,
  VesselFilter,
  Carrier,
  CarrierData,
} from "@/lib/types";

// Map is client-only (Mapbox requires DOM)
const HormuzMap = dynamic(() => import("@/components/HormuzMap"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        background: "#1a1f2e",
        borderRadius: 8,
        height: "100%",
        minHeight: 580,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#6b7280",
        fontSize: 13,
        fontFamily: "Inter, sans-serif",
      }}
    >
      Loading map...
    </div>
  ),
});

// AIS refresh: every 5 seconds
const AIS_INTERVAL = 5000;
// Slow data refresh: every 5 minutes
const SLOW_INTERVAL = 5 * 60 * 1000;

const DEFAULT_METRICS: DashboardMetrics = {
  daysSinceClosure: 14,
  shipsInStrait: 0,
  shipsApproaching: 0,
  vesselsAtAnchor: 0,
  brentPrice: null,
  brentChange: null,
  wtiPrice: null,
  wtiChange: null,
  oilSpikePct: null,
  economicCostBillions: 56,
  straitStatus: "CLOSED",
  transitToday: null,
  transit90dAvg: null,
};

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.json() as Promise<T>;
}

export default function DashboardPage() {
  const [vessels, setVessels]           = useState<Vessel[]>([]);
  const [aisConnected, setAisConnected] = useState(false);
  const [transitData, setTransitData]   = useState<TransitDay[]>([]);
  const [oilData, setOilData]           = useState<PricePoint[]>([]);
  const [newsData, setNewsData]         = useState<NewsItem[]>([]);
  const [weatherData, setWeatherData]   = useState<DayWeather[]>([]);
  const [metrics, setMetrics]           = useState<DashboardMetrics>(DEFAULT_METRICS);
  const [vesselFilter, setVesselFilter] = useState<VesselFilter>(null);
  const [carrierData, setCarrierData]   = useState<Carrier[]>([]);

  // Recompute metrics whenever inputs change
  useEffect(() => {
    setMetrics(computeMetrics(vessels, transitData, oilData));
  }, [vessels, transitData, oilData]);

  // AIS polling — fast
  const fetchAIS = useCallback(async () => {
    try {
      const data = await fetchJSON<AISData>("/api/ais");
      setAisConnected(data.connected ?? false);
      setVessels(data.vessels ?? []);
    } catch {
      setAisConnected(false);
    }
  }, []);

  // Slow data — transit, oil, news, weather, carriers
  const fetchSlowData = useCallback(async () => {
    const results = await Promise.allSettled([
      fetchJSON<{ data: TransitDay[] }>("/api/transit-history"),
      fetchJSON<{ data: PricePoint[] }>("/api/oil-prices"),
      fetchJSON<{ data: NewsItem[] }>("/api/news"),
      fetchJSON<{ data: DayWeather[] }>("/api/weather"),
      fetchJSON<CarrierData>("/api/carriers"),
    ]);

    if (results[0].status === "fulfilled") {
      setTransitData(results[0].value.data ?? []);
    }
    if (results[1].status === "fulfilled") {
      setOilData(results[1].value.data ?? []);
    }
    if (results[2].status === "fulfilled") {
      setNewsData(results[2].value.data ?? []);
    }
    if (results[3].status === "fulfilled") {
      setWeatherData(results[3].value.data ?? []);
    }
    if (results[4].status === "fulfilled") {
      setCarrierData(results[4].value.carriers ?? []);
    }
  }, []);

  // Bootstrap on mount, then poll
  useEffect(() => {
    fetchAIS();
    fetchSlowData();

    const aisTimer  = setInterval(fetchAIS, AIS_INTERVAL);
    const slowTimer = setInterval(fetchSlowData, SLOW_INTERVAL);

    return () => {
      clearInterval(aisTimer);
      clearInterval(slowTimer);
    };
  }, [fetchAIS, fetchSlowData]);

  return (
    <div id="top" style={{ minHeight: "100vh", background: "#f5f6f8" }}>
      {/* Sticky header */}
      <Header status={metrics.straitStatus} />

      {/* Key metrics — click to highlight on map */}
      <MetricsStrip metrics={metrics} activeFilter={vesselFilter} onFilterClick={setVesselFilter} />

      {/* Map + vessel list */}
      <div
        id="vessel-intel"
        style={{
          maxWidth: 1600,
          margin: "0 auto",
          padding: "16px 24px",
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          gap: 16,
          alignItems: "stretch",
        }}
      >
        <div style={{ minHeight: 600 }}>
          <HormuzMap
            vessels={vessels}
            connected={aisConnected}
            highlightFilter={vesselFilter}
            brentPrice={metrics.brentPrice}
            carriers={carrierData}
          />
        </div>
        <div style={{ minHeight: 600, display: "flex", flexDirection: "column", gap: 0 }}>
          <div style={{ flex: 1, minHeight: 0 }}>
            <VesselList
              vessels={vessels}
              connected={aisConnected}
              activeFilter={vesselFilter}
              onFilterClick={setVesselFilter}
            />
          </div>
          <NavalForcesPanel carriers={carrierData} />
        </div>
      </div>

      {/* Weather strip */}
      {weatherData.length > 0 && (
        <div
          style={{
            maxWidth: 1600,
            margin: "0 auto",
            padding: "0 24px 16px",
          }}
        >
          <WeatherBar data={weatherData} />
        </div>
      )}

      {/* Context bar — Why Hormuz Matters */}
      <div
        style={{
          maxWidth: 1600,
          margin: "0 auto",
          padding: "0 24px 16px",
        }}
      >
        <ContextBar />
      </div>

      {/* Charts */}
      <div
        id="energy-markets"
        style={{
          maxWidth: 1600,
          margin: "0 auto",
          padding: "0 24px 16px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}
      >
        <TransitChart data={transitData} />
        <OilPriceChart data={oilData} />
      </div>

      {/* Intelligence Panels */}
      <div
        id="intelligence"
        style={{ maxWidth: 1600, margin: "0 auto", padding: "0 24px 16px" }}
      >
        {/* Row 1: Escalation + Crisis Simulator + Stranded Cargo */}
        {(() => {
          const anchoredTankers = vessels.filter(
            (v) => (v.speed < 5 || v.speed > 30) && v.shipType >= 80 && v.shipType <= 89
          );
          const tankerCount = anchoredTankers.length;
          const estimatedBarrels = anchoredTankers.reduce((sum, v) => {
            const l = v.length ?? 0;
            const bbl =
              l > 300 ? 2000000 : l > 250 ? 1000000 : l > 200 ? 750000 : 500000;
            return sum + bbl * 0.6;
          }, 0);
          const darkShipCount = vessels.filter(
            (v) => !v.name || v.name.trim() === ""
          ).length;
          const deployedCarriers = carrierData.filter(
            (c) => c.status === "deployed"
          ).length;

          return (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 14,
                  marginBottom: 14,
                }}
              >
                <EscalationIndex
                  carrierCount={deployedCarriers}
                  darkShipCount={darkShipCount}
                  straitBlocked={metrics.straitStatus === "CLOSED"}
                />
                <CrisisSimulator currentBrent={metrics.brentPrice} />
                <StrandedCargo
                  tankerCount={tankerCount}
                  estimatedBarrels={estimatedBarrels}
                  brentPrice={metrics.brentPrice}
                />
              </div>

              {/* Row 2: Country Impact + Crisis Timeline */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 14,
                  marginBottom: 14,
                }}
              >
                <CountryImpact />
                <CrisisTimeline />
              </div>

              {/* Row 3: Congestion Forecast + Pipeline Status (combined BypassRoutes) */}
              <BypassRoutes vesselCount={vessels.length} />
            </>
          );
        })()}
      </div>

      {/* Breaking news */}
      <div
        id="news"
        style={{
          maxWidth: 1600,
          margin: "0 auto",
          padding: "0 24px 24px",
        }}
      >
        <NewsPanel items={newsData} />
      </div>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid #e2e5eb",
          background: "#ffffff",
          padding: "16px 24px",
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: "#9ca3af",
            fontFamily: "Inter, sans-serif",
          }}
        >
          Data: AISStream (vessel tracking) | IMF PortWatch (transit history) |
          EIA + FRED (oil prices) | Google News (headlines) | Open-Meteo (weather) |
          USNI + GDELT (carrier positions) | Updates every 5s
          <br />
          Intelligence analysis powered by{" "}
          <a href="https://theboard.world/" target="_blank" rel="noopener" style={{ color: "#2563eb", textDecoration: "underline" }}>
            The Board — Geopolitical Intelligence
          </a>
          {" "}|{" "}
          <a href="https://theboard.world/articles/geopolitics/strait-of-hormuz-blockade-oil-food-shipping-2026-analysis/" target="_blank" rel="noopener" style={{ color: "#2563eb", textDecoration: "underline" }}>
            Full Hormuz Analysis
          </a>
        </span>
      </footer>
    </div>
  );
}
