"use client";

interface CrisisSimulatorProps {
  currentBrent: number | null;
}

const SCENARIOS = [
  { day: 7,  label: "Mar 7",  price: 110, priceFmt: "$110", barPct: 30,  barColor: "#eab308",  priceColor: "#b45309", impact: "Asia shortages begin" },
  { day: 14, label: "Mar 14", price: 130, priceFmt: "$130", barPct: 55,  barColor: "#f97316",  priceColor: "#ea580c", impact: "SPR releases likely" },
  { day: 30, label: "Mar 30", price: 180, priceFmt: "$180", barPct: 80,  barColor: "#dc2626",  priceColor: "#dc2626", impact: "Global recession risk" },
  { day: 60, label: "Apr 29", price: 250, priceFmt: "$250+", barPct: 100, barColor: "#991b1b", priceColor: "#991b1b", impact: "Strategic reserves depleted" },
];

export default function CrisisSimulator({ currentBrent }: CrisisSimulatorProps) {
  // currentBrent is available if we want to show a delta, but projections are static
  void currentBrent;

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e5eb",
        borderRadius: 10,
        padding: 20,
        borderBottom: "3px solid #7c3aed",
        fontFamily: "Inter, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Card title */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#0f2557",
          textTransform: "uppercase" as const,
          letterSpacing: "0.5px",
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: "#f5f3ff",
            color: "#7c3aed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          &#9203;
        </div>
        WHAT IF HORMUZ STAYS CLOSED?
      </div>

      {/* Scenario rows */}
      {SCENARIOS.map((s) => (
        <div
          key={s.day}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 0",
            borderBottom: "1px solid #f3f4f6",
          }}
        >
          {/* Day label */}
          <div style={{ fontSize: 12, fontWeight: 700, color: "#0f2557", minWidth: 54 }}>
            Day {s.day}
            <br />
            <span style={{ fontSize: 9, color: "#9ca3af", fontWeight: 500 }}>{s.label}</span>
          </div>

          {/* Progress bar */}
          <div
            style={{
              flex: 1,
              margin: "0 12px",
              height: 6,
              background: "#f3f4f6",
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${s.barPct}%`,
                height: "100%",
                borderRadius: 3,
                background: s.barColor,
              }}
            />
          </div>

          {/* Price + impact */}
          <div style={{ textAlign: "right" as const }}>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                color: s.priceColor,
              }}
            >
              {s.priceFmt}
            </div>
            <div style={{ fontSize: 9, color: "#6b7280", marginTop: 2 }}>{s.impact}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
