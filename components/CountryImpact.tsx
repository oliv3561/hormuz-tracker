"use client";

const COUNTRIES = [
  { rank: 1, flag: "\u{1F1E8}\u{1F1F3}", name: "China",          detail: "40% of oil imports via Hormuz", barPct: 100, loss: "$840M/day" },
  { rank: 2, flag: "\u{1F1EE}\u{1F1F3}", name: "India",          detail: "65% of oil imports via Hormuz", barPct: 72,  loss: "$610M/day" },
  { rank: 3, flag: "\u{1F1EF}\u{1F1F5}", name: "Japan",          detail: "80% of oil imports via Hormuz", barPct: 56,  loss: "$470M/day" },
  { rank: 4, flag: "\u{1F1F0}\u{1F1F7}", name: "South Korea",    detail: "70% of oil imports via Hormuz", barPct: 42,  loss: "$350M/day" },
  { rank: 5, flag: "\u{1F1EA}\u{1F1FA}", name: "European Union", detail: "12% of oil imports via Hormuz", barPct: 28,  loss: "$230M/day" },
];

export default function CountryImpact() {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e5eb",
        borderRadius: 10,
        padding: 20,
        borderBottom: "3px solid #2563eb",
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
            flexShrink: 0,
          }}
        >
          &#128201;
        </div>
        ECONOMIC LOSERS — DAILY IMPORT LOSS
      </div>

      {/* Country rows */}
      {COUNTRIES.map((c) => (
        <div
          key={c.rank}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "6px 0",
            borderBottom: "1px solid #f9fafb",
          }}
        >
          {/* Rank badge */}
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "#eff6ff",
              color: "#2563eb",
              fontSize: 10,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {c.rank}
          </div>

          {/* Flag */}
          <div style={{ fontSize: 16, flexShrink: 0 }}>{c.flag}</div>

          {/* Name + detail */}
          <div style={{ fontSize: 12, fontWeight: 600, color: "#1f2937", flex: 1, minWidth: 0 }}>
            {c.name}
            <div style={{ fontSize: 9, color: "#9ca3af", fontWeight: 400 }}>{c.detail}</div>
          </div>

          {/* Bar */}
          <div
            style={{
              flex: 2,
              height: 8,
              background: "#f3f4f6",
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${c.barPct}%`,
                height: "100%",
                background: "linear-gradient(90deg,#dc2626,#f97316)",
                borderRadius: 4,
              }}
            />
          </div>

          {/* Daily loss */}
          <div
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: "#dc2626",
              fontFamily: "'JetBrains Mono', 'Courier New', monospace",
              flexShrink: 0,
              minWidth: 74,
              textAlign: "right" as const,
            }}
          >
            {c.loss}
          </div>
        </div>
      ))}
    </div>
  );
}
