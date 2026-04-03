"use client";

interface BypassRoutesProps {
  vesselCount: number;
}

const PIPELINES = [
  {
    color:    "#16a34a",
    name:     "Saudi East-West Pipeline (Abqaiq \u2192 Yanbu)",
    status:   "ACTIVE",
    statusBg: "#dcfce7",
    statusFg: "#16a34a",
    capacity: "5.0M bpd",
  },
  {
    color:    "#16a34a",
    name:     "UAE Habshan-Fujairah Pipeline",
    status:   "ACTIVE",
    statusBg: "#dcfce7",
    statusFg: "#16a34a",
    capacity: "1.5M bpd",
  },
  {
    color:    "#f59e0b",
    name:     "Iraq-Turkey Pipeline (Kirkuk \u2192 Ceyhan)",
    status:   "PARTIAL",
    statusBg: "#fef3c7",
    statusFg: "#b45309",
    capacity: "0.5M bpd",
  },
];

// Congestion forecast: base + 30 ships/day accumulation
const buildCongestionRows = (vesselCount: number) => {
  const base = Math.max(vesselCount, 88);
  const maxCap = 508; // Anchorage capacity limit near Dubai/Fujairah
  return [
    { label: "Today",   ships: base,            barPct: Math.min(100, (base / maxCap) * 100),             color: "#f59e0b" },
    { label: "+3 days", ships: base + 30 * 3,   barPct: Math.min(100, ((base + 90)  / maxCap) * 100),    color: "#f97316" },
    { label: "+7 days", ships: base + 30 * 7,   barPct: Math.min(100, ((base + 210) / maxCap) * 100),    color: "#ea580c" },
    { label: "+14 days", ships: base + 30 * 14, barPct: Math.min(100, ((base + 420) / maxCap) * 100),    color: "#dc2626" },
  ];
};

export default function BypassRoutes({ vesselCount }: BypassRoutesProps) {
  const congestionRows = buildCongestionRows(vesselCount);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 14,
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Left: Congestion Forecast */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #e2e5eb",
          borderRadius: 10,
          padding: 20,
          borderBottom: "3px solid #f97316",
          overflow: "hidden",
        }}
      >
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
              background: "#fff7ed",
              color: "#ea580c",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            &#128202;
          </div>
          VESSEL CONGESTION FORECAST
        </div>

        <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 10 }}>
          Projected backlog if blockade continues (est. 30 new arrivals/day)
        </div>

        {congestionRows.map((row) => (
          <div
            key={row.label}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: "#374151", minWidth: 60 }}>
              {row.label}
            </div>
            <div
              style={{
                flex: 1,
                height: 10,
                background: "#f3f4f6",
                borderRadius: 5,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${row.barPct}%`,
                  height: "100%",
                  borderRadius: 5,
                  background: row.color,
                }}
              />
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: "#0f2557",
                minWidth: 55,
                textAlign: "right" as const,
                fontFamily: "'JetBrains Mono', 'Courier New', monospace",
              }}
            >
              {row.ships} ships
            </div>
          </div>
        ))}

        <div
          style={{
            marginTop: 10,
            fontSize: 9,
            color: "#dc2626",
            fontWeight: 600,
            background: "#fef2f2",
            padding: "6px 10px",
            borderRadius: 6,
          }}
        >
          At 508 vessels, anchorage capacity near Dubai/Fujairah is exceeded — ships forced to wait in open ocean
        </div>
      </div>

      {/* Right: Pipeline Status */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #e2e5eb",
          borderRadius: 10,
          padding: 20,
          borderBottom: "3px solid #2563eb",
          overflow: "hidden",
        }}
      >
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
              background: "#eff6ff",
              color: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            &#128738;
          </div>
          BYPASS ROUTES &amp; PIPELINE STATUS
        </div>

        <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 10 }}>
          Oil routes that bypass the Strait of Hormuz
        </div>

        {/* Pipeline rows */}
        {PIPELINES.map((p) => (
          <div
            key={p.name}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0", fontSize: 11, color: "#374151" }}
          >
            <div
              style={{ width: 30, height: 3, borderRadius: 2, background: p.color, flexShrink: 0 }}
            />
            <span style={{ flex: 1 }}>{p.name}</span>
            <span
              style={{
                fontSize: 9,
                fontWeight: 600,
                padding: "1px 6px",
                borderRadius: 3,
                background: p.statusBg,
                color: p.statusFg,
                flexShrink: 0,
              }}
            >
              {p.status}
            </span>
            <span
              style={{
                fontWeight: 700,
                color: "#1e40af",
                fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                marginLeft: "auto",
                flexShrink: 0,
              }}
            >
              {p.capacity}
            </span>
          </div>
        ))}

        {/* Total bypass capacity */}
        <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid #f0f0f0" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#0f2557", marginBottom: 6 }}>
            TOTAL BYPASS CAPACITY
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span
              style={{
                fontSize: 28,
                fontWeight: 900,
                color: "#2563eb",
                fontFamily: "'JetBrains Mono', 'Courier New', monospace",
              }}
            >
              7.0M
            </span>
            <span style={{ fontSize: 12, color: "#6b7280" }}>bpd of 21M bpd (33% bypass possible)</span>
          </div>
          <div style={{ marginTop: 6, height: 10, background: "#f3f4f6", borderRadius: 5, overflow: "hidden" }}>
            <div
              style={{
                width: "33%",
                height: "100%",
                background: "linear-gradient(90deg,#3b82f6,#2563eb)",
                borderRadius: 5,
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 8,
              color: "#9ca3af",
              marginTop: 2,
              fontFamily: "'JetBrains Mono', 'Courier New', monospace",
            }}
          >
            <span>7M bpd bypass</span>
            <span style={{ color: "#dc2626", fontWeight: 600 }}>14M bpd still blocked</span>
          </div>
        </div>
      </div>
    </div>
  );
}
