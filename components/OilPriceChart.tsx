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
import type { PricePoint } from "@/lib/types";

interface OilPriceChartProps {
  data: PricePoint[];
}

const CRISIS_DATE = "2026-02-28";

function shortDate(d: string): string {
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
          {p.name}: ${typeof p.value === "number" ? p.value.toFixed(2) : "--"}
        </div>
      ))}
    </div>
  );
}

export default function OilPriceChart({ data }: OilPriceChartProps) {
  // Filter to only points with at least one valid price
  const chartData = data.filter((d) => d.brent !== null || d.wti !== null);

  // Y-axis domain with some padding
  const allPrices = chartData.flatMap((d) => [d.brent, d.wti]).filter((v): v is number => v !== null);
  const minPrice = allPrices.length ? Math.floor(Math.min(...allPrices) - 2) : 60;
  const maxPrice = allPrices.length ? Math.ceil(Math.max(...allPrices) + 2) : 120;

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
          Oil Prices — Brent & WTI
        </div>
        <div style={{ fontSize: 11, color: "#9ca3af" }}>
          EIA/FRED spot prices, USD/barrel (weekdays only){data.length > 0 ? ` | Latest: ${data[data.length - 1]?.date ?? ""}` : ""}
          <span style={{ color: "#c0392b", marginLeft: 8, fontWeight: 600 }}>
            Crisis: Feb 28, 2026
          </span>
        </div>
      </div>

      {chartData.length === 0 ? (
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
          Loading price data...
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 4, right: 12, left: -4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              tick={{ fontSize: 10, fill: "#9ca3af", fontFamily: "Inter, sans-serif" }}
              tickLine={false}
              interval={Math.ceil(chartData.length / 10)}
            />
            <YAxis
              domain={[minPrice, maxPrice]}
              tick={{ fontSize: 10, fill: "#9ca3af", fontFamily: "Inter, sans-serif" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${v}`}
              width={40}
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
            {/* Pre-crisis baseline */}
            <ReferenceLine
              y={71.32}
              stroke="#9ca3af"
              strokeWidth={1}
              strokeDasharray="2 4"
              label={{
                value: "Pre-crisis $71.32",
                position: "left",
                fontSize: 8,
                fill: "#9ca3af",
                fontFamily: "Inter, sans-serif",
              }}
            />
            <Line
              type="monotone"
              dataKey="brent"
              name="Brent"
              stroke="#0f2557"
              strokeWidth={2.5}
              dot={false}
              connectNulls
              activeDot={{ r: 4, fill: "#0f2557" }}
            />
            <Line
              type="monotone"
              dataKey="wti"
              name="WTI"
              stroke="#16a34a"
              strokeWidth={2}
              dot={false}
              connectNulls
              activeDot={{ r: 4, fill: "#16a34a" }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
