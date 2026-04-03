"use client";

import { useState } from "react";
import type { Carrier } from "@/lib/types";

interface NavalForcesPanelProps {
  carriers: Carrier[];
}

export default function NavalForcesPanel({ carriers }: NavalForcesPanelProps) {
  const [showInPort, setShowInPort] = useState(false);

  if (carriers.length === 0) return null;

  const deployed = carriers.filter((c) => c.status === "deployed");
  const enRoute = carriers.filter((c) => c.status === "en_route");
  const inPort = carriers.filter((c) => c.status === "in_port");

  return (
    <div
      style={{
        borderTop: "2px solid #fbbf24",
        background: "#fefce8",
        padding: "12px 14px",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#92400e",
          letterSpacing: "0.5px",
          textTransform: "uppercase" as const,
          marginBottom: 8,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span
          style={{
            width: 14,
            height: 5,
            background: "#fbbf24",
            borderRadius: 2,
            border: "1px solid #f59e0b",
            display: "inline-block",
          }}
        />
        NAVAL FORCES
      </div>

      {/* DEPLOYED */}
      {deployed.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 8, fontWeight: 700, color: "#b45309", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 3 }}>
            DEPLOYED ({deployed.length})
          </div>
          {deployed.map((c) => (
            <div key={c.hull} style={{ padding: "2px 0" }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#1c1917" }}>{c.name.split("(")[0].trim()}</div>
              <div style={{ fontSize: 8, color: "#78716c" }}>{c.desc}</div>
            </div>
          ))}
        </div>
      )}

      {/* EN ROUTE */}
      {enRoute.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 8, fontWeight: 700, color: "#2563eb", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 3 }}>
            EN ROUTE ({enRoute.length})
          </div>
          {enRoute.map((c) => (
            <div key={c.hull} style={{ padding: "2px 0" }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#1c1917" }}>{c.name.split("(")[0].trim()}</div>
              <div style={{ fontSize: 8, color: "#78716c" }}>{c.desc}</div>
            </div>
          ))}
        </div>
      )}

      {/* IN PORT */}
      {inPort.length > 0 && (
        <div>
          <div style={{ fontSize: 8, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 3 }}>
            IN PORT ({inPort.length})
          </div>
          <div
            onClick={() => setShowInPort(!showInPort)}
            style={{ fontSize: 9, color: "#b45309", cursor: "pointer", padding: "2px 0" }}
          >
            {showInPort ? "Hide" : "Show"} in-port carriers...
          </div>
          {showInPort &&
            inPort.map((c) => (
              <div key={c.hull} style={{ padding: "2px 0" }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#a8a29e" }}>{c.name.split("(")[0].trim()}</div>
                <div style={{ fontSize: 8, color: "#a8a29e" }}>{c.desc}</div>
              </div>
            ))}
        </div>
      )}

      <div style={{ fontSize: 7, color: "#a8a29e", fontStyle: "italic", marginTop: 6 }}>
        USNI + GDELT — updated every 12h
      </div>
    </div>
  );
}
