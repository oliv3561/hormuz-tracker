"use client";

type EventType = "military" | "shipping" | "energy" | "diplomatic";

interface TimelineEvent {
  date: string;
  title: string;
  type: EventType;
  crisis?: boolean;
}

const EVENTS: TimelineEvent[] = [
  { date: "16 Mar", title: "US deploys additional destroyer group to Arabian Sea",              type: "military" },
  { date: "15 Mar", title: "IRGC fast boats spotted conducting drills near Qeshm Island",      type: "military" },
  { date: "14 Mar", title: "Saudi Arabia ramps East-West pipeline to 80% capacity",            type: "energy" },
  { date: "13 Mar", title: "Lloyd's raises war risk insurance premiums by 450%",               type: "shipping" },
  { date: "12 Mar", title: "UN Security Council emergency session on Hormuz crisis",           type: "diplomatic" },
  { date: "10 Mar", title: "Major tanker companies halt bookings through Strait of Hormuz",   type: "shipping" },
  { date: "28 Feb", title: "Iran announces blockade of Strait of Hormuz — CRISIS BEGINS",     type: "military", crisis: true },
];

const TYPE_STYLES: Record<EventType, { dot: string; tagBg: string; tagColor: string }> = {
  military:   { dot: "#dc2626", tagBg: "#fef2f2", tagColor: "#dc2626" },
  shipping:   { dot: "#3b82f6", tagBg: "#eff6ff", tagColor: "#2563eb" },
  energy:     { dot: "#f59e0b", tagBg: "#fefce8", tagColor: "#b45309" },
  diplomatic: { dot: "#8b5cf6", tagBg: "#f5f3ff", tagColor: "#7c3aed" },
};

export default function CrisisTimeline() {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e5eb",
        borderRadius: 10,
        padding: 20,
        borderBottom: "3px solid #0f2557",
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
            background: "#eff6ff",
            color: "#0f2557",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          &#128225;
        </div>
        CRISIS TIMELINE
      </div>

      {/* Timeline events */}
      {EVENTS.map((ev, i) => {
        const style = TYPE_STYLES[ev.type];
        const isLast = i === EVENTS.length - 1;
        return (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 12,
              padding: "8px 0",
              borderBottom: isLast ? "none" : "1px solid #f9fafb",
              position: "relative" as const,
            }}
          >
            {/* Date */}
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#9ca3af",
                minWidth: 50,
                textAlign: "right" as const,
                paddingTop: 2,
                flexShrink: 0,
              }}
            >
              {ev.date}
            </div>

            {/* Dot */}
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: style.dot,
                flexShrink: 0,
                marginTop: 4,
              }}
            />

            {/* Content */}
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: ev.crisis ? 800 : 600,
                  color: ev.crisis ? "#dc2626" : "#1f2937",
                  lineHeight: 1.4,
                }}
              >
                {ev.title}
              </div>
              <span
                style={{
                  display: "inline-block",
                  fontSize: 8,
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: 3,
                  marginTop: 3,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.03em",
                  background: style.tagBg,
                  color: style.tagColor,
                }}
              >
                {ev.type}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
