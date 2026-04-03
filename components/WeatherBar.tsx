"use client";

import type { DayWeather } from "@/lib/types";

interface WeatherBarProps {
  data: DayWeather[];
}

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  const today = new Date();
  const diff = Math.round((d.getTime() - today.setHours(0, 0, 0, 0)) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
}

export default function WeatherBar({ data }: WeatherBarProps) {
  if (data.length === 0) return null;

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e2e5eb",
        borderRadius: 8,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 20px",
          borderBottom: "1px solid #e2e5eb",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          style={{
            fontWeight: 700,
            fontSize: 13,
            color: "#0f2557",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          Maritime Weather
        </span>
        <span style={{ fontSize: 11, color: "#9ca3af" }}>
          Strait of Hormuz (26.5N, 56.0E) — 7 day forecast
        </span>
      </div>

      {/* Days */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${data.length}, 1fr)`,
          borderBottom: "none",
        }}
      >
        {data.map((day, i) => (
          <div
            key={day.date}
            style={{
              padding: "14px 12px",
              textAlign: "center",
              borderRight: i < data.length - 1 ? "1px solid #f3f4f6" : "none",
              background: day.windWarning ? "#fff9f0" : undefined,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#374151",
                marginBottom: 6,
              }}
            >
              {dayLabel(day.date)}
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: day.tempMax > 40 ? "#c0392b" : "#0f2557",
                fontFamily: "monospace",
                marginBottom: 4,
              }}
            >
              {Math.round(day.tempMax)}°
            </div>
            <div style={{ fontSize: 10, color: "#9ca3af", marginBottom: 8 }}>
              {Math.round(day.tempMin)}° min
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: day.windWarning ? "#d97706" : "#6b7280",
              }}
            >
              {Math.round(day.windMax)} km/h
            </div>
            <div style={{ fontSize: 9, color: "#9ca3af", marginTop: 2 }}>
              wind
            </div>
            {day.windWarning && (
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: "#d97706",
                  background: "#fef3c7",
                  padding: "2px 4px",
                  borderRadius: 3,
                  marginTop: 4,
                  letterSpacing: "0.05em",
                }}
              >
                WIND WARN
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
