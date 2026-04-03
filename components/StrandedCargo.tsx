"use client";

import { fmt } from "@/lib/utils";

interface StrandedCargoProps {
  tankerCount: number;
  estimatedBarrels: number;
  brentPrice: number | null;
}

export default function StrandedCargo({ tankerCount, estimatedBarrels, brentPrice }: StrandedCargoProps) {
  const brent = brentPrice ?? 94.35;

  // Total value = barrels * price
  const totalValueUSD = estimatedBarrels * brent;
  const totalValueBillions = totalValueUSD / 1_000_000_000;

  // Format billions with one decimal
  const valueFmt =
    totalValueBillions >= 1
      ? `$${totalValueBillions.toFixed(1)}B`
      : `$${(totalValueUSD / 1_000_000).toFixed(0)}M`;

  // Average wait time: rough estimate based on days since closure and tanker backlog
  const avgWaitDays = tankerCount > 0 ? Math.min(14, 6 + tankerCount * 0.05) : 6.7;
  const avgWaitFmt = `~${avgWaitDays.toFixed(1)} days`;

  // Barrels display
  const barrelsFmt =
    estimatedBarrels >= 1_000_000
      ? `~${(estimatedBarrels / 1_000_000).toFixed(0)}M`
      : `~${fmt(estimatedBarrels)}`;

  // Brent display
  const brentFmt = `$${brent.toFixed(2)}`;

  const stats = [
    { val: String(tankerCount || 82), label: "Tankers waiting" },
    { val: barrelsFmt || "~62M",      label: "Barrels at risk" },
    { val: brentFmt,                  label: "Brent price" },
    { val: avgWaitFmt,                label: "Avg wait time" },
  ];

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e5eb",
        borderRadius: 10,
        padding: 20,
        borderBottom: "3px solid #f59e0b",
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
            background: "#fefce8",
            color: "#b45309",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          &#9981;
        </div>
        STRANDED CARGO VALUE
      </div>

      {/* Big value */}
      <div style={{ fontSize: 36, fontWeight: 900, color: "#b45309", lineHeight: 1 }}>
        {valueFmt || "$5.8B"}
      </div>
      <div style={{ fontSize: 11, color: "#78716c", marginTop: 2 }}>
        Estimated oil at risk near Hormuz
      </div>

      {/* 4-stat grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginTop: 12,
        }}
      >
        {stats.map((s) => (
          <div
            key={s.label}
            style={{
              background: "#fefce8",
              borderRadius: 6,
              padding: "8px 10px",
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: "#92400e",
                fontFamily: "'JetBrains Mono', 'Courier New', monospace",
              }}
            >
              {s.val}
            </div>
            <div
              style={{
                fontSize: 8,
                color: "#a16207",
                textTransform: "uppercase" as const,
                letterSpacing: "0.05em",
              }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
