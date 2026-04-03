"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import type { TransitDay } from "@/lib/types";

interface TransitChartProps {
  data: TransitDay[];
}

const CRISIS_DATE = "2026-02-28";

function shortDate(d: string): string {
  // e.g. "2025-12-01" -> "Dec 1"
  const dt = new Date(d + "T00:00:00Z");
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

interface TooltipPayload {
  color?: string;
  name?: string;
  value?: number;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e5eb",
        borderRadius: 6,
        padding: "10px 14px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        fontFamily: "Inter, sans-serif",
        fontSize: 12,
      }}
    >
      <div style={{ fontWeight: 700, color: "#0f2557", marginBottom: 6 }}>
        {label ? shortDate(label) : ""}
      </div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 600, marginBottom: 2 }}>
          {p.name}: {p.value ?? "--"}
        </div>
      ))}
    </div>
  );
}

export default function TransitChart({ data }: TransitChartProps) {
  const crisisIdx = data.findIndex((d) => d.date >= CRISIS_DATE);

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e2e5eb",
        borderRadius: 8,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        padding: "20px 20px 12px",
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: 13,
            color: "#0f2557",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            marginBottom: 2,
          }}
        >
          Daily Transits — Strait of Hormuz
        </div>
        <div style={{ fontSize: 11, color: "#9ca3af" }}>
          IMF PortWatch (updates weekly, ~7 day lag){data.length > 0 ? ` | Latest: ${data[data.length - 1]?.date ?? ""}` : ""}
          {crisisIdx >= 0 && (
            <span style={{ color: "#c0392b", marginLeft: 8, fontWeight: 600 }}>
              Crisis: Feb 28, 2026
            </span>
          )}
        </div>
      </div>

      {data.length === 0 ? (
        <div
          style={{
            height: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#9ca3af",
            fontSize: 13,
          }}
        >
          Loading transit data...
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 4, right: 12, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              tick={{ fontSize: 10, fill: "#9ca3af", fontFamily: "Inter, sans-serif" }}
              tickLine={false}
              interval={Math.ceil(data.length / 10)}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#9ca3af", fontFamily: "Inter, sans-serif" }}
              tickLine={false}
              axisLine={false}
              width={32}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 11, fontFamily: "Inter, sans-serif", paddingTop: 8 }}
            />
            <ReferenceLine
              x={CRISIS_DATE}
              stroke="#c0392b"
              strokeWidth={2}
              strokeDasharray="4 3"
              label={{
                value: "CRISIS",
                position: "top",
                fontSize: 9,
                fill: "#c0392b",
                fontWeight: 700,
                fontFamily: "Inter, sans-serif",
              }}
            />
            <Line
              type="monotone"
              dataKey="total"
              name="Total Vessels"
              stroke="#0f2557"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#0f2557" }}
            />
            <Line
              type="monotone"
              dataKey="tanker"
              name="Tankers"
              stroke="#d97706"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#d97706" }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
