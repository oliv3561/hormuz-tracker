"use client";

import { timeAgo } from "@/lib/utils";
import type { NewsItem } from "@/lib/types";

interface NewsPanelProps {
  items: NewsItem[];
}

export default function NewsPanel({ items }: NewsPanelProps) {
  const now = Date.now();

  function isRecent(dateStr: string): boolean {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    return now - d.getTime() < 2 * 60 * 60 * 1000; // 2 hours
  }

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
          padding: "14px 20px",
          borderBottom: "1px solid #e2e5eb",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#c0392b",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontWeight: 700,
            fontSize: 13,
            color: "#0f2557",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Breaking News
        </span>
        <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 4 }}>
          Strait of Hormuz — latest headlines
        </span>
      </div>

      {/* News list */}
      <div>
        {items.length === 0 && (
          <div
            style={{
              padding: "32px 20px",
              textAlign: "center",
              color: "#9ca3af",
              fontSize: 13,
            }}
          >
            Loading news...
          </div>
        )}
        {items.map((item, i) => {
          const recent = isRecent(item.date);
          return (
            <div
              key={i}
              style={{
                padding: "14px 20px",
                borderBottom: i < items.length - 1 ? "1px solid #f3f4f6" : "none",
                borderLeft: recent ? "3px solid #c0392b" : "3px solid transparent",
                display: "flex",
                gap: 16,
                alignItems: "flex-start",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontWeight: 600,
                    fontSize: 14,
                    color: "#1a1f2e",
                    textDecoration: "none",
                    lineHeight: 1.4,
                    display: "block",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#0f2557")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#1a1f2e")}
                >
                  {item.title}
                </a>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: 4,
                  flexShrink: 0,
                }}
              >
                {item.source && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#0f2557",
                      background: "#e8edf8",
                      padding: "2px 6px",
                      borderRadius: 4,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.source}
                  </span>
                )}
                <span
                  style={{
                    fontSize: 11,
                    color: recent ? "#c0392b" : "#9ca3af",
                    fontWeight: recent ? 600 : 400,
                    whiteSpace: "nowrap",
                  }}
                >
                  {timeAgo(item.date)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
