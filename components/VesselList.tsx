"use client";

import { useState } from "react";
import { shipTypeLabel, flagEmoji, isInStrait, isApproaching } from "@/lib/utils";
import type { Vessel, VesselFilter } from "@/lib/types";

interface VesselListProps {
  vessels: Vessel[];
  connected: boolean;
  activeFilter?: VesselFilter;
  onFilterClick?: (filter: VesselFilter) => void;
}

// Type badge colors
const TYPE_BADGE: Record<string, { bg: string; color: string }> = {
  TANKER:    { bg: "#fef3c7", color: "#92400e" },
  CARGO:     { bg: "#dbeafe", color: "#1e40af" },
  PASSENGER: { bg: "#f0fdf4", color: "#14532d" },
  MILITARY:  { bg: "#fce7f3", color: "#9d174d" },
  FISHING:   { bg: "#f5f3ff", color: "#5b21b6" },
  SERVICE:   { bg: "#f1f5f9", color: "#475569" },
  OTHER:     { bg: "#f9fafb", color: "#6b7280" },
};

function compassDir(course: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(course / 45) % 8];
}

function isDarkShip(v: Vessel): boolean {
  return !v.name || v.name.trim() === "";
}

// Section header — clickable to set filter, shows count badge
interface SectionHeaderProps {
  label: string;
  count: number;
  filter: VesselFilter;
  activeFilter?: VesselFilter;
  onFilterClick?: (filter: VesselFilter) => void;
  accentColor?: string;
  collapsible?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
}

function SectionHeader({
  label,
  count,
  filter,
  activeFilter,
  onFilterClick,
  accentColor = "#0f2557",
  collapsible,
  expanded,
  onToggle,
}: SectionHeaderProps) {
  const isActive = activeFilter === filter;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 14px 6px",
        background: isActive ? `${accentColor}0f` : "#f9fafb",
        borderBottom: `1px solid ${isActive ? `${accentColor}30` : "#f0f0f0"}`,
        cursor: "pointer",
        userSelect: "none",
        transition: "background 0.15s",
      }}
      onClick={() => {
        if (collapsible && onToggle) onToggle();
        if (onFilterClick) onFilterClick(isActive ? null : filter);
      }}
      title={`Click to ${isActive ? "clear" : "highlight on map"}`}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: isActive ? accentColor : "#6b7280",
            letterSpacing: "0.08em",
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: isActive ? "white" : accentColor,
            background: isActive ? accentColor : `${accentColor}18`,
            padding: "1px 6px",
            borderRadius: 10,
            minWidth: 20,
            textAlign: "center",
          }}
        >
          {count}
        </span>
        {isActive && (
          <span style={{ fontSize: 9, color: accentColor, fontWeight: 600, opacity: 0.7 }}>
            MAP HIGHLIGHTED
          </span>
        )}
      </div>
      {collapsible && (
        <span style={{ fontSize: 11, color: "#9ca3af", lineHeight: 1 }}>
          {expanded ? "\u25B2" : "\u25BC"}
        </span>
      )}
    </div>
  );
}

// Empty state row
function EmptyRow({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: "12px 14px",
        fontSize: 11,
        color: "#9ca3af",
        fontStyle: "italic",
        borderBottom: "1px solid #f9fafb",
      }}
    >
      {message}
    </div>
  );
}

// Individual vessel row for moving/approaching vessels
function VesselRow({ v }: { v: Vessel }) {
  const typeLabel = shipTypeLabel(v.shipType);
  const badge     = TYPE_BADGE[typeLabel] ?? TYPE_BADGE.OTHER;
  const flag      = flagEmoji(v.flag);
  const dark      = isDarkShip(v);

  return (
    <div
      style={{
        padding: "7px 14px",
        display: "grid",
        gridTemplateColumns: "1fr auto auto auto",
        gap: 6,
        alignItems: "center",
        borderBottom: "1px solid #f9fafb",
      }}
    >
      {/* Name + destination */}
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: dark ? "#dc2626" : "#0f2557",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={v.name || v.mmsi}
        >
          {flag && <span style={{ marginRight: 3 }}>{flag}</span>}
          {dark ? "UNIDENTIFIED" : (v.name || `MMSI ${v.mmsi}`)}
        </div>
        {v.destination && (
          <div
            style={{
              fontSize: 9,
              color: "#9ca3af",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={v.destination}
          >
            {v.destination}
          </div>
        )}
      </div>

      {/* Speed */}
      <span style={{ fontSize: 11, color: "#374151", fontFamily: "monospace", whiteSpace: "nowrap" }}>
        {v.speed.toFixed(1)}kt
      </span>

      {/* Course direction */}
      <span style={{ fontSize: 11, color: "#6b7280", fontFamily: "monospace", whiteSpace: "nowrap" }}>
        {compassDir(v.course || v.heading || 0)}
      </span>

      {/* Type badge */}
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          padding: "1px 5px",
          borderRadius: 3,
          background: dark ? "rgba(220,38,38,0.1)" : badge.bg,
          color: dark ? "#dc2626" : badge.color,
          letterSpacing: "0.03em",
          whiteSpace: "nowrap",
        }}
      >
        {dark ? "DARK" : typeLabel}
      </span>
    </div>
  );
}

// Anchored vessel row — compact, name + flag + type only
function AnchoredRow({ v }: { v: Vessel }) {
  const typeLabel = shipTypeLabel(v.shipType);
  const flag      = flagEmoji(v.flag);

  return (
    <div
      style={{
        padding: "5px 14px",
        display: "grid",
        gridTemplateColumns: "1fr auto auto",
        gap: 6,
        alignItems: "center",
        borderBottom: "1px solid #f9fafb",
        opacity: 0.75,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#374151",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        title={v.name || v.mmsi}
      >
        {flag && <span style={{ marginRight: 3 }}>{flag}</span>}
        {v.name || `MMSI ${v.mmsi}`}
      </div>
      <span style={{ fontSize: 10, color: "#9ca3af" }}>{v.flag || "--"}</span>
      <span style={{ fontSize: 9, color: "#6b7280", fontFamily: "monospace" }}>{typeLabel}</span>
    </div>
  );
}

export default function VesselList({ vessels, connected, activeFilter, onFilterClick }: VesselListProps) {
  const [anchoredExpanded, setAnchoredExpanded] = useState(false);

  // Categorise vessels
  const inStrait   = vessels.filter((v) => isInStrait(v) && v.speed >= 0.5);
  const approaching = vessels.filter((v) => isApproaching(v));
  const anchored   = vessels.filter((v) => v.speed < 0.5);
  const darkShips  = vessels.filter((v) => isDarkShip(v));

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e2e5eb",
        borderRadius: 8,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        height: "100%",
      }}
    >
      {/* Panel header */}
      <div
        style={{
          padding: "12px 14px 10px",
          borderBottom: "1px solid #e2e5eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          background: "#ffffff",
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 13, color: "#0f2557", letterSpacing: "0.04em" }}>
          VESSEL TRACKER
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: connected ? "#16a34a" : "#9ca3af",
              display: "inline-block",
            }}
          />
          <span style={{ fontSize: 10, color: "#6b7280", fontWeight: 600 }}>
            {connected ? `${vessels.length} tracked` : "offline"}
          </span>
        </div>
      </div>

      {/* Scrollable categories */}
      <div className="vessel-list" style={{ overflowY: "auto", flex: 1 }}>

        {/* TRANSITING — vessels actively moving through the strait */}
        <SectionHeader
          label="TRANSITING"
          count={inStrait.length}
          filter="inStrait"
          activeFilter={activeFilter}
          onFilterClick={onFilterClick}
          accentColor="#0f2557"
        />
        {inStrait.length === 0 ? (
          <EmptyRow message="No vessels currently transiting the strait" />
        ) : (
          inStrait.map((v) => <VesselRow key={v.mmsi} v={v} />)
        )}

        {/* APPROACHING — moving vessels near but not in the strait */}
        <SectionHeader
          label="APPROACHING"
          count={approaching.length}
          filter="approaching"
          activeFilter={activeFilter}
          onFilterClick={onFilterClick}
          accentColor="#d97706"
        />
        {approaching.length === 0 ? (
          <EmptyRow message="No vessels approaching" />
        ) : (
          approaching.map((v) => <VesselRow key={v.mmsi} v={v} />)
        )}

        {/* ANCHORED — collapsed by default, click to expand */}
        <SectionHeader
          label="ANCHORED / STRANDED"
          count={anchored.length}
          filter="anchored"
          activeFilter={activeFilter}
          onFilterClick={onFilterClick}
          accentColor="#0f2557"
          collapsible
          expanded={anchoredExpanded}
          onToggle={() => setAnchoredExpanded((v) => !v)}
        />
        {anchoredExpanded && (
          anchored.length === 0 ? (
            <EmptyRow message="No anchored vessels" />
          ) : (
            anchored.map((v) => <AnchoredRow key={v.mmsi} v={v} />)
          )
        )}
        {!anchoredExpanded && anchored.length > 0 && (() => {
          const anchoredTankers = anchored.filter((v) => v.shipType >= 80 && v.shipType <= 89).length;
          return (
            <div
              style={{
                padding: "6px 14px",
                fontSize: 10,
                color: "#9ca3af",
                borderBottom: "1px solid #f9fafb",
                cursor: "pointer",
              }}
              onClick={() => setAnchoredExpanded(true)}
            >
              {anchored.length} at anchor
              {anchoredTankers > 0 && (
                <span style={{ color: "#b45309", fontWeight: 600 }}>
                  {" "}— {anchoredTankers} tankers (~Est. {Math.round(anchoredTankers * 0.875)}M bbl at risk)
                </span>
              )}
              {" "}— click to expand
            </div>
          );
        })()}

        {/* DARK SHIPS — vessels transmitting without a name */}
        {darkShips.length > 0 && (
          <>
            <SectionHeader
              label="DARK SHIPS"
              count={darkShips.length}
              filter="darkShips"
              activeFilter={activeFilter}
              onFilterClick={onFilterClick}
              accentColor="#dc2626"
            />
            {darkShips.map((v) => <VesselRow key={v.mmsi} v={v} />)}
          </>
        )}
      </div>

      {/* Footer summary */}
      <div
        style={{
          padding: "8px 14px",
          borderTop: "1px solid #f3f4f6",
          display: "flex",
          gap: 14,
          flexShrink: 0,
          background: "#f9fafb",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 10, color: "#dc2626", fontWeight: 700 }}>
          {inStrait.length} transiting
        </span>
        <span style={{ fontSize: 10, color: "#d97706", fontWeight: 600 }}>
          {approaching.length} approaching
        </span>
        <span style={{ fontSize: 10, color: "#6b7280", fontWeight: 600 }}>
          {anchored.length} anchored
        </span>
        {darkShips.length > 0 && (
          <span style={{ fontSize: 10, color: "#dc2626", fontWeight: 600 }}>
            {darkShips.length} dark
          </span>
        )}
      </div>
    </div>
  );
}
