"use client";

interface EscalationIndexProps {
  carrierCount: number;
  darkShipCount: number;
  straitBlocked: boolean;
}

export default function EscalationIndex({ carrierCount, darkShipCount, straitBlocked }: EscalationIndexProps) {
  // Static scoring model
  const straitScore  = straitBlocked ? 3 : 0;
  const carrierScore = Math.min(carrierCount, 3) * 2;  // 2 per carrier, max 3 carriers = 6
  const irgcScore    = 2;    // IRGC patrols always active in crisis scenario
  const darkScore    = darkShipCount > 0 ? 1 : 0;
  const diplomacyOff = -2;   // Diplomacy active
  const missileOff   = -2;   // No missile launches

  const rawTotal = straitScore + carrierScore + irgcScore + darkScore + diplomacyOff + missileOff;
  // Scale: raw max=10, display as /10 with one decimal
  const score = Math.max(0, Math.min(10, rawTotal));
  const displayScore = score.toFixed(1);
  const markerPct = (score / 10) * 100;

  const riskLabel =
    score >= 8 ? "CRITICAL RISK" :
    score >= 6 ? "HIGH RISK" :
    score >= 4 ? "MODERATE RISK" :
    "LOW RISK";

  const factors = [
    { label: `Strait ${straitBlocked ? "blocked" : "monitored"} (${straitBlocked ? "+3" : "+0"})`, color: straitBlocked ? "#dc2626" : "#9ca3af" },
    { label: `${Math.min(carrierCount, 3)} carriers deployed (+${carrierScore})`,                   color: "#f59e0b" },
    { label: "IRGC active patrols (+2)",                                                            color: "#dc2626" },
    { label: `Dark ships detected (${darkScore > 0 ? "+1" : "+0"})`,                               color: "#8b5cf6" },
    { label: "Diplomacy active (-2)",                                                               color: "#22c55e" },
    { label: "No missile launches (-2)",                                                            color: "#3b82f6" },
  ];

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e5eb",
        borderRadius: 10,
        padding: 20,
        borderBottom: "3px solid #dc2626",
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
            background: "#fef2f2",
            color: "#dc2626",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            fontWeight: 900,
            flexShrink: 0,
          }}
        >
          !
        </div>
        ESCALATION INDEX
      </div>

      {/* Score + gauge row */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
        <div>
          <div style={{ fontSize: 42, fontWeight: 900, color: "#dc2626", lineHeight: 1 }}>
            {displayScore}
          </div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
            out of 10 — {riskLabel}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          {/* Gauge track */}
          <div
            style={{
              height: 12,
              background: "#f3f4f6",
              borderRadius: 6,
              position: "relative" as const,
              margin: "8px 0",
              overflow: "visible",
            }}
          >
            <div
              style={{
                height: "100%",
                borderRadius: 6,
                background: "linear-gradient(90deg,#22c55e 0%,#eab308 40%,#f97316 60%,#dc2626 80%)",
                width: "100%",
                position: "relative" as const,
              }}
            >
              <div
                style={{
                  position: "absolute" as const,
                  top: -4,
                  left: `${markerPct}%`,
                  width: 4,
                  height: 20,
                  background: "#0f2557",
                  borderRadius: 2,
                  transform: "translateX(-50%)",
                }}
              />
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 9,
              color: "#9ca3af",
              fontWeight: 600,
              textTransform: "uppercase" as const,
            }}
          >
            <span>Low</span>
            <span>Moderate</span>
            <span>High</span>
            <span>Critical</span>
          </div>
        </div>
      </div>

      {/* Factor grid */}
      <div
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 4,
        }}
      >
        {factors.map((f, i) => (
          <div
            key={i}
            style={{ fontSize: 10, color: "#374151", display: "flex", alignItems: "center", gap: 4 }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: f.color,
                flexShrink: 0,
              }}
            />
            {f.label}
          </div>
        ))}
      </div>
    </div>
  );
}
