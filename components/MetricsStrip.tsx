"use client";

import { fmt, fmtPct } from "@/lib/utils";
import type { DashboardMetrics, VesselFilter } from "@/lib/types";

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  accentColor?: string;
  mono?: boolean;
  clickable?: boolean;
  active?: boolean;
  onClick?: () => void;
}

function MetricCard({ label, value, sub, accentColor = "#0f2557", mono = false, clickable, active, onClick }: MetricCardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: active ? `${accentColor}11` : "#ffffff",
        borderTop: active ? `2px solid ${accentColor}` : `1px solid #e2e5eb`,
        borderLeft: active ? `2px solid ${accentColor}` : `1px solid #e2e5eb`,
        borderRight: active ? `2px solid ${accentColor}` : `1px solid #e2e5eb`,
        borderBottom: active ? `3px solid ${accentColor}` : `3px solid ${accentColor}`,
        borderRadius: 8,
        padding: "16px 20px",
        boxShadow: active ? `0 0 12px ${accentColor}33` : "0 1px 3px rgba(0,0,0,0.06)",
        minWidth: 0,
        cursor: clickable ? "pointer" : "default",
        transition: "all 0.2s ease",
        position: "relative" as const,
        overflow: "hidden" as const,
      }}
    >
      {clickable && (
        <div style={{
          position: "absolute",
          top: 8,
          right: 10,
          fontSize: 9,
          fontWeight: 700,
          color: active ? accentColor : "#d1d5db",
          letterSpacing: "0.05em",
        }}>
          {active ? "SHOWING" : "CLICK TO LOCATE"}
        </div>
      )}
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "#6b7280",
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          color: accentColor,
          fontFamily: mono ? "monospace" : "Inter, sans-serif",
          lineHeight: 1.1,
          letterSpacing: mono ? "0.03em" : undefined,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: 12,
            color: "#6b7280",
            marginTop: 4,
            fontWeight: 500,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

interface MetricsStripProps {
  metrics: DashboardMetrics;
  activeFilter: VesselFilter;
  onFilterClick: (filter: VesselFilter) => void;
}

export default function MetricsStrip({ metrics, activeFilter, onFilterClick }: MetricsStripProps) {
  const toggle = (f: VesselFilter) => () => onFilterClick(activeFilter === f ? null : f);
  const {
    daysSinceClosure,
    shipsInStrait,
    shipsApproaching,
    vesselsAtAnchor,
    brentPrice,
    brentChange,
    wtiPrice,
    wtiChange,
    oilSpikePct,
    economicCostBillions,
  } = metrics;

  // Color for % change
  function changeColor(pct: number | null): string {
    if (pct === null) return "#6b7280";
    return pct >= 0 ? "#c0392b" : "#16a34a"; // Red = price up (bad), green = price down
  }

  const brentSub =
    brentChange !== null
      ? `${fmtPct(brentChange)} today`
      : "price unavailable";

  const wtiSub =
    wtiChange !== null
      ? `${fmtPct(wtiChange)} today`
      : "price unavailable";

  return (
    <div
      style={{
        maxWidth: 1600,
        margin: "0 auto",
        padding: "20px 24px 0",
      }}
    >
      {/* Row label */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#9ca3af",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        Situation
      </div>

      {/* Row 1: Situation */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <MetricCard
          label="Days Since Closure"
          value={`DAY ${daysSinceClosure}`}
          sub="Since Feb 28, 2026"
          accentColor="#c0392b"
        />
        <MetricCard
          label="Ships in Strait"
          value={fmt(shipsInStrait)}
          sub="In strait bounds"
          accentColor="#0f2557"
          clickable
          active={activeFilter === "inStrait"}
          onClick={toggle("inStrait")}
        />
        <MetricCard
          label="Ships Approaching"
          value={fmt(shipsApproaching)}
          sub="Speed > 0.5kt, in corridor"
          accentColor="#d97706"
          clickable
          active={activeFilter === "approaching"}
          onClick={toggle("approaching")}
        />
        <MetricCard
          label="Vessels at Anchor"
          value={fmt(vesselsAtAnchor)}
          sub="Speed < 0.5kt"
          accentColor="#4b5563"
          clickable
          active={activeFilter === "anchored"}
          onClick={toggle("anchored")}
        />
      </div>

      {/* Row label */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#9ca3af",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: 10,
          marginTop: 4,
        }}
      >
        Markets
      </div>

      {/* Row 2: Markets */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
        }}
      >
        <MetricCard
          label="Brent Crude"
          value={brentPrice !== null ? `$${fmt(brentPrice, 2)}` : "--"}
          sub={brentSub}
          accentColor={changeColor(brentChange)}
          mono
        />
        <MetricCard
          label="WTI Crude"
          value={wtiPrice !== null ? `$${fmt(wtiPrice, 2)}` : "--"}
          sub={wtiSub}
          accentColor={changeColor(wtiChange)}
          mono
        />
        <MetricCard
          label="Oil Spike"
          value={oilSpikePct !== null ? fmtPct(oilSpikePct) : "--"}
          sub={`vs pre-crisis $71.32`}
          accentColor={oilSpikePct !== null && oilSpikePct > 0 ? "#c0392b" : "#16a34a"}
          mono
        />
        <MetricCard
          label="Est. Economic Cost"
          value={`$${fmt(economicCostBillions)}B`}
          sub={`$4B/day x ${daysSinceClosure} days`}
          accentColor="#7c3aed"
          mono
        />
      </div>
    </div>
  );
}
