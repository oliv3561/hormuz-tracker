"use client";

export default function ContextBar() {
  const stats = [
    { value: "21M", sub: "bbl/day normal" },
    { value: "0", sub: "bbl/day current", red: true },
    { value: "20%", sub: "global oil" },
    { value: "25%", sub: "global LNG" },
    { value: "33km", sub: "at narrows" },
    { value: "$1.2T", sub: "annual trade" },
  ];

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e5eb",
        borderRadius: 10,
        padding: "14px 20px",
        display: "flex",
        alignItems: "center",
        gap: 20,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#0f2557",
          textTransform: "uppercase" as const,
          letterSpacing: "0.5px",
          whiteSpace: "nowrap" as const,
          minWidth: 80,
        }}
      >
        Why Hormuz
        <br />
        Matters
      </div>

      <div style={{ display: "flex", gap: 12, flex: 1 }}>
        {stats.map((s, i) => (
          <div
            key={i}
            style={{
              textAlign: "center" as const,
              flex: 1,
              padding: "4px 0",
              borderRight: i < stats.length - 1 ? "1px solid #f0f0f0" : "none",
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 900,
                color: s.red ? "#dc2626" : "#0f2557",
              }}
            >
              {s.value}
            </div>
            <div style={{ fontSize: 8, color: "#6b7280", marginTop: 1 }}>
              {s.sub}
            </div>
          </div>
        ))}
      </div>

      <div style={{ flex: "0 0 200px" }}>
        <div
          style={{
            fontSize: 8,
            color: "#6b7280",
            fontWeight: 600,
            textTransform: "uppercase" as const,
            marginBottom: 3,
          }}
        >
          Oil flow through Hormuz
        </div>
        <div
          style={{
            height: 10,
            background: "#dbeafe",
            borderRadius: 5,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              background: "linear-gradient(90deg, #3b82f6, #2563eb)",
              borderRadius: 5,
              width: "100%",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 7,
            color: "#9ca3af",
            marginTop: 2,
            fontFamily: "monospace",
          }}
        >
          <span style={{ color: "#dc2626", fontWeight: 600 }}>0 bpd current</span>
          <span>21M bpd normal</span>
        </div>
      </div>
    </div>
  );
}
