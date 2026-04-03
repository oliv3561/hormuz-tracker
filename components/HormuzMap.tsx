"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Vessel, VesselFilter, Carrier } from "@/lib/types";
import { shipTypeLabel, vesselCenter, estimateTankerCargo, fmt } from "@/lib/utils";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

// Strategic view: full theater — Persian Gulf + Red Sea approach + Arabian Sea
const MAP_CENTER: [number, number] = [54.0, 24.0]; // [lon, lat] — wider center to show all carriers
const MAP_ZOOM = 4.8; // covers Red Sea (Ford) + Arabian Sea (Lincoln) + Gulf

// Simplified water polygon for the Persian Gulf + Gulf of Oman
// Used for land filtering — point-in-polygon check is more reliable than queryRenderedFeatures
const WATER_POLYGON: [number, number][] = [
  [48.0, 29.5],  // NW Kuwait
  [48.5, 30.3],  // Shatt al-Arab
  [49.5, 30.0],  // Abadan
  [50.0, 29.2],  // Khark Island
  [50.5, 28.8],  // Bushehr
  [51.5, 27.5],  // South Iran coast
  [52.5, 27.0],  // Lavan
  [54.0, 26.8],  // Sirri
  [55.5, 26.5],  // Near strait
  [56.5, 27.0],  // Strait north
  [57.5, 26.8],  // Iran Makran coast
  [58.5, 25.5],  // Gulf of Oman
  [60.0, 25.2],  // Open ocean
  [60.0, 23.5],  // Arabian Sea
  [58.0, 22.5],  // Oman south
  [56.5, 24.5],  // Fujairah offshore
  [56.0, 25.0],  // UAE east coast water
  [55.6, 25.10], // Sharjah offshore
  [55.35, 25.22], // Dubai/Sharjah coast (tight — excludes port docks that render as land)
  [55.15, 25.22], // Dubai port exclusion
  [55.0, 25.15],  // Jebel Ali offshore
  [54.8, 25.10],  // Between Jebel Ali and Abu Dhabi
  [54.5, 24.60],  // Abu Dhabi coast (tight)
  [54.2, 24.55],  // Abu Dhabi offshore
  [53.0, 24.0],  // Qatar south
  [51.5, 24.5],  // Qatar east
  [51.0, 25.5],  // Bahrain
  [50.0, 26.5],  // Saudi coast
  [49.5, 27.5],  // Kuwait south
  [48.0, 29.5],  // close polygon
];

function isInWater(lat: number, lon: number): boolean {
  // Ray-casting point-in-polygon algorithm
  let inside = false;
  for (let i = 0, j = WATER_POLYGON.length - 1; i < WATER_POLYGON.length; j = i++) {
    const xi = WATER_POLYGON[i][0], yi = WATER_POLYGON[i][1];
    const xj = WATER_POLYGON[j][0], yj = WATER_POLYGON[j][1];
    const intersect = ((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Strait bounding box for filter matching
const STRAIT_BOUNDS = { latMin: 26.0, latMax: 26.8, lonMin: 56.0, lonMax: 56.8 };

// Blockade zone polygon — covers the strait narrows
const BLOCKADE_POLYGON_COORDS: [number, number][] = [
  [55.8, 26.1],
  [56.0, 26.5],
  [56.5, 26.8],
  [57.0, 26.6],
  [57.0, 26.2],
  [56.5, 26.0],
  [56.0, 25.9],
  [55.8, 26.1],
];

// Naval blockade line across the strait
const BLOCKADE_LINE_COORDS: [number, number][] = [
  [56.0, 26.8],
  [56.5, 26.0],
];

// Traffic Separation Scheme lanes (suspended)
const INBOUND_LANE: [number, number][] = [
  [57.5, 26.0],
  [56.5, 26.3],
  [55.5, 26.5],
];
const OUTBOUND_LANE: [number, number][] = [
  [55.5, 26.7],
  [56.5, 26.5],
  [57.5, 26.2],
];

// Naval bases with hover-only labels
const NAVAL_BASES: Array<{
  lon: number;
  lat: number;
  label: string;
  description: string;
  side: "iran" | "allied";
  labelOffset: [number, number];
}> = [
  { lon: 56.28, lat: 27.19, label: "Bandar Abbas", description: "Iranian Navy HQ — Strait Command", side: "iran", labelOffset: [0, -18] as [number, number] },
  { lon: 56.27, lat: 26.95, label: "Qeshm Is.", description: "IRGC Naval Base — fast boat fleet", side: "iran", labelOffset: [50, 0] as [number, number] },
  { lon: 57.77, lat: 25.64, label: "Jask", description: "Iranian Navy forward base", side: "iran", labelOffset: [0, 14] as [number, number] },
  { lon: 56.35, lat: 25.12, label: "Fujairah", description: "UAE/US Naval facility — outside strait", side: "allied", labelOffset: [0, 14] as [number, number] },
  { lon: 50.61, lat: 26.24, label: "NSA Bahrain", description: "US 5th Fleet headquarters", side: "allied", labelOffset: [0, 14] as [number, number] },
];

// Vessel color by ship type
function vesselColor(typeLabel: string, isDark: boolean): string {
  if (isDark) return "#8b5cf6";
  switch (typeLabel) {
    case "TANKER":   return "#f59e0b";
    case "CARGO":    return "#3b82f6";
    case "MILITARY": return "#ec4899";
    default:         return "#6b7280";
  }
}

// Popup badge color by type label
function popupBadgeStyle(typeLabel: string, isDark: boolean): { bg: string; color: string } {
  if (isDark) return { bg: "#7c3aed", color: "#fff" };
  switch (typeLabel) {
    case "TANKER":   return { bg: "#dc2626", color: "#fff" };
    case "CARGO":    return { bg: "#2563eb", color: "#fff" };
    case "MILITARY": return { bg: "#ec4899", color: "#fff" };
    default:         return { bg: "#4b5563", color: "#fff" };
  }
}

interface HormuzMapProps {
  vessels: Vessel[];
  connected: boolean;
  highlightFilter?: VesselFilter;
  brentPrice?: number | null;
  carriers?: Carrier[];
}

type MapboxMap     = import("mapbox-gl").Map;
type MapboxMarker  = import("mapbox-gl").Marker;
type MapboxPopup   = import("mapbox-gl").Popup;

function matchesFilter(v: Vessel, filter: VesselFilter): boolean {
  if (!filter) return false;
  if (filter === "inStrait") {
    return (
      v.lat >= STRAIT_BOUNDS.latMin && v.lat <= STRAIT_BOUNDS.latMax &&
      v.lon >= STRAIT_BOUNDS.lonMin && v.lon <= STRAIT_BOUNDS.lonMax
    );
  }
  if (filter === "anchored")   return v.speed < 0.5;
  if (filter === "approaching") {
    if (v.speed <= 0.5) return false;
    const east = v.lon > 57;
    const west = v.lon < 56;
    if (east) return v.course > 90 && v.course < 270;
    if (west) return v.course <= 90 || v.course >= 270;
    return false;
  }
  if (filter === "darkShips") return !v.name || v.name.trim() === "";
  return false;
}

// Compute a course vector endpoint offset in pixels (as CSS transform)
// Returns { dx, dy } in pixels
function courseVector(course: number, speed: number): { dx: number; dy: number } {
  const length = Math.min(60, Math.max(20, speed * 6));
  const rad = ((course - 90) * Math.PI) / 180;
  return {
    dx: Math.cos(rad) * length,
    dy: Math.sin(rad) * length,
  };
}

// Vessel status label based on position and speed
function vesselStatus(v: Vessel): string {
  if (v.speed < 0.5) return "ANCHORED";
  const inStrait = (
    v.lat >= STRAIT_BOUNDS.latMin && v.lat <= STRAIT_BOUNDS.latMax &&
    v.lon >= STRAIT_BOUNDS.lonMin && v.lon <= STRAIT_BOUNDS.lonMax
  );
  if (inStrait) return "TRANSITING";
  // Check if approaching from east or west
  const east = v.lon > 57;
  const west = v.lon < 56;
  if (east && v.course > 90 && v.course < 270) return "APPROACHING";
  if (west && (v.course <= 90 || v.course >= 270)) return "APPROACHING";
  return "TRANSITING";
}

export default function HormuzMap({
  vessels,
  connected,
  highlightFilter,
  brentPrice,
  carriers = [],
}: HormuzMapProps) {
  const containerRef       = useRef<HTMLDivElement>(null);
  const mapRef             = useRef<MapboxMap | null>(null);
  const markersRef         = useRef<MapboxMarker[]>([]);
  const baseMarkersRef     = useRef<MapboxMarker[]>([]);
  const carrierMarkersRef  = useRef<MapboxMarker[]>([]);
  const clusterPopupRef    = useRef<MapboxPopup | null>(null);
  const [mapLoaded, setMapLoaded]         = useState(false);
  const [mapStyle, setMapStyle]           = useState<"light" | "satellite" | "dark">("light");
  const [transitCount, setTransitCount]   = useState(0);
  const [riskZonesVisible, setRiskZonesVisible] = useState(true);

  // Initialize map — runs once on mount
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (!MAPBOX_TOKEN) {
      console.error("HormuzMap: NEXT_PUBLIC_MAPBOX_TOKEN is not set");
      return;
    }

    let map: MapboxMap;

    import("mapbox-gl").then((mapboxgl) => {
      const mb = mapboxgl.default ?? mapboxgl;
      mb.accessToken = MAPBOX_TOKEN;

      map = new mb.Map({
        container: containerRef.current!,
        style: "mapbox://styles/mapbox/light-v11",
        center: MAP_CENTER,
        zoom: MAP_ZOOM,
        minZoom: 3,
        maxZoom: 14,
        attributionControl: true,
        pitchWithRotate: false,
        dragRotate: false,
      });

      // Default navigation control (zoom + compass) — top-left
      map.addControl(new mb.NavigationControl({ showCompass: true, visualizePitch: false }), "top-left");

      mapRef.current = map;

      map.on("load", () => {
        addStaticLayers(map, mb);
        addNavalBaseMarkers(map, mb);
        setMapLoaded(true);
      });

      // When map style changes, re-add layers (style reload wipes them)
      map.on("styledata", () => {
        if (!map.isStyleLoaded()) return;
        addStaticLayers(map, mb);
      });
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type MB = any;

  // Add GeoJSON polygon/line layers that tell the blockade story
  function addStaticLayers(map: MapboxMap, mb: MB) {
    // Guard: remove existing layers then sources before re-adding
    const layerIds = [
      "blockade-zone-fill", "blockade-zone-outline",
      "blockade-label-title", "blockade-label-sub",
      "blockade-line", "inbound-lane", "outbound-lane",
      "inbound-label", "outbound-label",
      // Risk zone layers
      "risk-surveillance-fill", "risk-surveillance-outline", "risk-surveillance-label",
      "risk-drone-fill", "risk-drone-outline", "risk-drone-label",
      "risk-interdiction-fill", "risk-interdiction-outline", "risk-interdiction-label",
    ];
    layerIds.forEach((id) => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    const sourceIds = [
      "blockade-zone", "blockade-line", "inbound-lane", "outbound-lane",
      "blockade-label", "inbound-label", "outbound-label",
      // Risk zone sources
      "risk-surveillance", "risk-drone", "risk-interdiction",
      "risk-surveillance-label", "risk-drone-label", "risk-interdiction-label",
    ];
    sourceIds.forEach((id) => {
      if (map.getSource(id)) map.removeSource(id);
    });

    // ── RISK ZONES (added first so vessels render on top) ──────────────────

    // 1. Yellow surveillance zone
    const SURVEILLANCE_COORDS: [number, number][] = [
      [52, 24], [52, 28], [60, 28], [60, 24], [52, 24],
    ];
    map.addSource("risk-surveillance", {
      type: "geojson",
      data: {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [SURVEILLANCE_COORDS] },
        properties: {},
      } as GeoJSON.Feature,
    });
    map.addLayer({
      id: "risk-surveillance-fill",
      type: "fill",
      source: "risk-surveillance",
      layout: { visibility: riskZonesVisible ? "visible" : "none" },
      paint: { "fill-color": "#eab308", "fill-opacity": 0.06 },
    });
    map.addLayer({
      id: "risk-surveillance-outline",
      type: "line",
      source: "risk-surveillance",
      layout: { visibility: riskZonesVisible ? "visible" : "none" },
      paint: {
        "line-color": "#eab308",
        "line-opacity": 0.2,
        "line-width": 1,
        "line-dasharray": [4, 4],
      },
    });
    map.addSource("risk-surveillance-label", {
      type: "geojson",
      data: {
        type: "Feature",
        geometry: { type: "Point", coordinates: [52.5, 27.5] },
        properties: { label: "SURVEILLANCE ZONE" },
      } as GeoJSON.Feature,
    });
    map.addLayer({
      id: "risk-surveillance-label",
      type: "symbol",
      source: "risk-surveillance-label",
      minzoom: 6,
      layout: {
        visibility: riskZonesVisible ? "visible" : "none",
        "text-field": ["get", "label"],
        "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Regular"],
        "text-size": 9,
        "text-letter-spacing": 0.12,
        "text-anchor": "center",
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": "#a16207",
        "text-halo-color": "rgba(255,255,255,0.8)",
        "text-halo-width": 1.5,
      },
    });

    // 2. Orange drone/missile zone
    const DRONE_COORDS: [number, number][] = [
      [54.5, 25.5], [54.5, 27.5], [58, 27.5], [58, 25.5], [54.5, 25.5],
    ];
    map.addSource("risk-drone", {
      type: "geojson",
      data: {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [DRONE_COORDS] },
        properties: {},
      } as GeoJSON.Feature,
    });
    map.addLayer({
      id: "risk-drone-fill",
      type: "fill",
      source: "risk-drone",
      layout: { visibility: riskZonesVisible ? "visible" : "none" },
      paint: { "fill-color": "#f97316", "fill-opacity": 0.10 },
    });
    map.addLayer({
      id: "risk-drone-outline",
      type: "line",
      source: "risk-drone",
      layout: { visibility: riskZonesVisible ? "visible" : "none" },
      paint: {
        "line-color": "#f97316",
        "line-opacity": 0.3,
        "line-width": 1.5,
        "line-dasharray": [3, 3],
      },
    });
    map.addSource("risk-drone-label", {
      type: "geojson",
      data: {
        type: "Feature",
        geometry: { type: "Point", coordinates: [54.5, 27.3] },
        properties: { label: "DRONE / MISSILE RISK" },
      } as GeoJSON.Feature,
    });
    map.addLayer({
      id: "risk-drone-label",
      type: "symbol",
      source: "risk-drone-label",
      minzoom: 6,
      layout: {
        visibility: riskZonesVisible ? "visible" : "none",
        "text-field": ["get", "label"],
        "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Regular"],
        "text-size": 9,
        "text-letter-spacing": 0.12,
        "text-anchor": "center",
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": "#c2410c",
        "text-halo-color": "rgba(255,255,255,0.8)",
        "text-halo-width": 1.5,
      },
    });

    // 3. Red interdiction zone (reuses BLOCKADE_POLYGON_COORDS)
    map.addSource("risk-interdiction", {
      type: "geojson",
      data: {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [BLOCKADE_POLYGON_COORDS] },
        properties: {},
      } as GeoJSON.Feature,
    });
    map.addLayer({
      id: "risk-interdiction-fill",
      type: "fill",
      source: "risk-interdiction",
      layout: { visibility: riskZonesVisible ? "visible" : "none" },
      paint: { "fill-color": "#dc2626", "fill-opacity": 0.15 },
    });
    map.addLayer({
      id: "risk-interdiction-outline",
      type: "line",
      source: "risk-interdiction",
      layout: { visibility: riskZonesVisible ? "visible" : "none" },
      paint: {
        "line-color": "#dc2626",
        "line-opacity": 0.5,
        "line-width": 2,
        "line-dasharray": [5, 3],
      },
    });
    // Interdiction label is rendered by blockade-label-title below, skip duplicate

    // ── BLOCKADE ZONE ────────────────────────────────────────────────────────

    // Blockade zone polygon
    map.addSource("blockade-zone", {
      type: "geojson",
      data: {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [BLOCKADE_POLYGON_COORDS],
        },
        properties: {},
      } as GeoJSON.Feature,
    });
    map.addLayer({
      id: "blockade-zone-fill",
      type: "fill",
      source: "blockade-zone",
      paint: {
        "fill-color": "rgba(220, 38, 38, 0.12)",
      },
    });
    map.addLayer({
      id: "blockade-zone-outline",
      type: "line",
      source: "blockade-zone",
      paint: {
        "line-color": "rgba(220, 38, 38, 0.6)",
        "line-width": 2,
        "line-dasharray": [4, 3],
      },
    });

    // Blockade zone text label — center of polygon
    const zoneCenterLon = BLOCKADE_POLYGON_COORDS.reduce((s, c) => s + c[0], 0) / BLOCKADE_POLYGON_COORDS.length;
    const zoneCenterLat = BLOCKADE_POLYGON_COORDS.reduce((s, c) => s + c[1], 0) / BLOCKADE_POLYGON_COORDS.length;

    map.addSource("blockade-label", {
      type: "geojson",
      data: {
        type: "Feature",
        geometry: { type: "Point", coordinates: [zoneCenterLon, zoneCenterLat] },
        properties: { title: "BLOCKADE ZONE", subtitle: "BLOCKED" },
      } as GeoJSON.Feature,
    });
    map.addLayer({
      id: "blockade-label-title",
      type: "symbol",
      source: "blockade-label",
      minzoom: 4.5,
      layout: {
        "text-field": ["get", "title"],
        "text-font": ["DIN Offc Pro Bold", "Arial Unicode MS Bold"],
        "text-size": 13,
        "text-letter-spacing": 0.1,
        "text-offset": [0, -0.8],
        "text-anchor": "center",
        "text-allow-overlap": true,
        "text-ignore-placement": true,
      },
      paint: {
        "text-color": "#dc2626",
        "text-halo-color": "rgba(255,255,255,0.85)",
        "text-halo-width": 2,
      },
    });
    map.addLayer({
      id: "blockade-label-sub",
      type: "symbol",
      source: "blockade-label",
      minzoom: 4.5,
      layout: {
        "text-field": ["get", "subtitle"],
        "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Regular"],
        "text-size": 11,
        "text-offset": [0, 0.6],
        "text-anchor": "center",
        "text-allow-overlap": true,
        "text-ignore-placement": true,
      },
      paint: {
        "text-color": "#dc2626",
        "text-halo-color": "rgba(255,255,255,0.85)",
        "text-halo-width": 2,
      },
    });

    // Naval blockade line
    map.addSource("blockade-line", {
      type: "geojson",
      data: {
        type: "Feature",
        geometry: { type: "LineString", coordinates: BLOCKADE_LINE_COORDS },
        properties: {},
      } as GeoJSON.Feature,
    });
    map.addLayer({
      id: "blockade-line",
      type: "line",
      source: "blockade-line",
      paint: {
        "line-color": "#dc2626",
        "line-width": 3,
        "line-dasharray": [8, 4],
      },
    });

    // Inbound shipping lane (suspended)
    map.addSource("inbound-lane", {
      type: "geojson",
      data: {
        type: "Feature",
        geometry: { type: "LineString", coordinates: INBOUND_LANE },
        properties: {},
      } as GeoJSON.Feature,
    });
    map.addLayer({
      id: "inbound-lane",
      type: "line",
      source: "inbound-lane",
      paint: {
        "line-color": "#6b7280",
        "line-width": 2,
        "line-opacity": 0.7,
        "line-dasharray": [6, 4],
      },
    });

    // Outbound shipping lane (suspended)
    map.addSource("outbound-lane", {
      type: "geojson",
      data: {
        type: "Feature",
        geometry: { type: "LineString", coordinates: OUTBOUND_LANE },
        properties: {},
      } as GeoJSON.Feature,
    });
    map.addLayer({
      id: "outbound-lane",
      type: "line",
      source: "outbound-lane",
      paint: {
        "line-color": "#6b7280",
        "line-width": 2,
        "line-opacity": 0.7,
        "line-dasharray": [6, 4],
      },
    });

    // Lane labels — spread far apart so they don't overlap with blockade zone text
    map.addSource("inbound-label", {
      type: "geojson",
      data: {
        type: "Feature",
        geometry: { type: "Point", coordinates: [57.3, 26.1] },  // East side of strait
        properties: { label: "INBOUND — SUSPENDED" },
      } as GeoJSON.Feature,
    });
    map.addLayer({
      id: "inbound-label",
      type: "symbol",
      source: "inbound-label",
      minzoom: 7,
      layout: {
        "text-field": ["get", "label"],
        "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Regular"],
        "text-size": 9,
        "text-offset": [0, -1.2],
        "text-anchor": "center",
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": "#6b7280",
        "text-halo-color": "rgba(255,255,255,0.8)",
        "text-halo-width": 1.5,
      },
    });

    map.addSource("outbound-label", {
      type: "geojson",
      data: {
        type: "Feature",
        geometry: { type: "Point", coordinates: [55.0, 26.2] },  // West side, below the 71 cluster
        properties: { label: "OUTBOUND — SUSPENDED" },
      } as GeoJSON.Feature,
    });
    map.addLayer({
      id: "outbound-label",
      type: "symbol",
      source: "outbound-label",
      minzoom: 7,
      layout: {
        "text-field": ["get", "label"],
        "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Regular"],
        "text-size": 9,
        "text-offset": [0, 1.2],
        "text-anchor": "center",
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": "#6b7280",
        "text-halo-color": "rgba(255,255,255,0.8)",
        "text-halo-width": 1.5,
      },
    });
  }

  // Add naval bases as Mapbox GeoJSON layers — proper collision detection, no DOM overlap
  function addNavalBaseMarkers(map: MapboxMap, mb: MB) {
    baseMarkersRef.current.forEach((m) => m.remove());
    baseMarkersRef.current = [];

    if (map.getSource("naval-bases")) return; // already added

    const geojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: NAVAL_BASES.map((b) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [b.lon, b.lat] },
        properties: { label: b.label, description: b.description, side: b.side },
      })),
    };

    map.addSource("naval-bases", { type: "geojson", data: geojson });

    // SQUARE markers for bases — visually distinct from circular vessel dots
    // Iran = dark crimson (#7f1d1d), Allied = emerald (#059669) — NO conflict with vessel colors
    // Using circle layers but with LARGE radius + thick stroke to look like filled squares at small zoom

    // Outer glow ring — makes bases pop at wide zoom
    map.addLayer({
      id: "base-glow",
      type: "circle",
      source: "naval-bases",
      paint: {
        "circle-radius": 16,
        "circle-color": "transparent",
        "circle-stroke-color": ["match", ["get", "side"], "iran", "rgba(127,29,29,0.25)", "rgba(5,150,105,0.25)"],
        "circle-stroke-width": 3,
      },
    });

    // Inner filled circle with thick white border + cross-hair effect
    map.addLayer({
      id: "base-circles",
      type: "circle",
      source: "naval-bases",
      paint: {
        "circle-radius": 9,
        "circle-color": ["match", ["get", "side"], "iran", "#7f1d1d", "#059669"],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 3,
      },
    });

    // Crosshair dot in center — makes it look like a target/base marker
    map.addLayer({
      id: "base-center",
      type: "circle",
      source: "naval-bases",
      paint: {
        "circle-radius": 3,
        "circle-color": "#ffffff",
      },
    });

    // Military symbol text — shows ★ for Iran, ✦ for Allied at all zooms
    map.addLayer({
      id: "base-symbol",
      type: "symbol",
      source: "naval-bases",
      layout: {
        "text-field": ["match", ["get", "side"], "iran", "▲", "★"],
        "text-size": 8,
        "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
        "text-allow-overlap": true,
        "text-ignore-placement": true,
      },
      paint: {
        "text-color": "#ffffff",
      },
    });

    // Labels — only at zoom 6+ to avoid clutter
    map.addLayer({
      id: "base-labels",
      type: "symbol",
      source: "naval-bases",
      minzoom: 6,
      layout: {
        "text-field": ["get", "label"],
        "text-size": 10,
        "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
        "text-anchor": "top",
        "text-allow-overlap": false,
        "text-variable-anchor": ["top", "bottom", "left", "right"],
        "text-radial-offset": 1.5,
      },
      paint: {
        "text-color": ["match", ["get", "side"], "iran", "#7f1d1d", "#059669"],
        "text-halo-color": "rgba(255,255,255,0.95)",
        "text-halo-width": 2,
      },
    });

    // Click popup
    map.on("click", "base-circles", (e) => {
      if (!e.features || e.features.length === 0) return;
      const f = e.features[0];
      const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
      const p = f.properties!;
      const isIran = p.side === "iran";
      const color = isIran ? "#7f1d1d" : "#059669";
      const bgColor = isIran ? "rgba(127,29,29,0.08)" : "rgba(5,150,105,0.08)";
      new mb.Popup({ offset: 14, maxWidth: "220px" })
        .setLngLat(coords)
        .setHTML(`
          <div style="font-family:Inter,sans-serif;padding:4px">
            <div style="font-size:13px;font-weight:700;color:${color}">${p.label}</div>
            <div style="font-size:11px;color:#374151;margin-top:4px">${p.description}</div>
            <div style="margin-top:6px;font-size:9px;font-weight:600;color:${color};background:${bgColor};padding:2px 6px;border-radius:3px;display:inline-block">
              ${isIran ? 'IRANIAN MILITARY' : 'ALLIED FORCES'}
            </div>
          </div>
        `).addTo(map);
    });
    map.on("mouseenter", "base-circles", () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "base-circles", () => { map.getCanvas().style.cursor = ""; });
  }

  // Toggle risk zone layer visibility
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;
    if (!map.isStyleLoaded()) return;

    const riskLayers = [
      "risk-surveillance-fill", "risk-surveillance-outline", "risk-surveillance-label",
      "risk-drone-fill", "risk-drone-outline", "risk-drone-label",
      "risk-interdiction-fill", "risk-interdiction-outline",
    ];
    const vis = riskZonesVisible ? "visible" : "none";
    riskLayers.forEach((id) => {
      if (map.getLayer(id)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (map as any).setLayoutProperty(id, "visibility", vis);
      }
    });
  }, [riskZonesVisible, mapLoaded]);

  // Update vessel markers whenever vessels or highlight filter changes
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    import("mapbox-gl").then((mapboxgl) => {
      const mb = mapboxgl.default ?? mapboxgl;
      const map = mapRef.current!;

      // Remove old vessel markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (clusterPopupRef.current) {
        clusterPopupRef.current.remove();
        clusterPopupRef.current = null;
      }

      if (vessels.length === 0) return;

      // Only render vessels in the relevant region (Persian Gulf / Gulf of Oman)
      const inRegion = vessels.filter((v) => v.lat >= 24.0 && v.lat <= 28.0 && v.lon >= 50.0 && v.lon <= 60.0);
      // Apply water filter to all vessels — removes land GPS drift
      const inWater  = inRegion.filter((v) => isInWater(v.lat, v.lon));
      // Dark ships = no name — ALWAYS render individually as purple markers
      const isDark = (v: Vessel) => !v.name || v.name.trim() === "";
      const darkShips = inWater.filter(isDark);
      const named = inWater.filter((v) => !isDark(v));
      // Named vessels: individual dots only at realistic transit speed (2-30kt)
      // Speed > 30kt = bad AIS data → cluster. Speed < 2kt = anchored → cluster.
      // Threshold matches isApproaching() in lib/utils.ts
      const anchored = named.filter((v) => v.speed < 2.0 || v.speed > 30.0);
      const moving   = named.filter((v) => v.speed >= 2.0 && v.speed <= 30.0);

      // Determine which vessels match the active highlight filter
      const highlightedSet = new Set(
        highlightFilter ? vessels.filter((v) => matchesFilter(v, highlightFilter)).map((v) => v.mmsi) : []
      );

      // Handle filter-based fly-to
      if (highlightFilter && highlightedSet.size > 0) {
        handleFilterFlyTo(map, highlightFilter, vessels, anchored, moving, highlightedSet);
      } else if (!highlightFilter) {
        map.flyTo({ center: MAP_CENTER, zoom: MAP_ZOOM, duration: 1000 });
      }

      // Count vessels in strait for the info box
      const inStrait = vessels.filter(
        (v) =>
          v.lat >= STRAIT_BOUNDS.latMin && v.lat <= STRAIT_BOUNDS.latMax &&
          v.lon >= STRAIT_BOUNDS.lonMin && v.lon <= STRAIT_BOUNDS.lonMax
      );
      setTransitCount(inStrait.length);

      // A. Anchored cluster — shift slightly west to avoid overlapping with base labels
      if (anchored.length > 0) {
        const rawCenter = vesselCenter(anchored);
        const center = { lat: rawCenter.lat - 0.5, lon: rawCenter.lon - 0.8 };
        const isHighlighted = highlightFilter === "anchored";

        // Skip if cluster centroid is outside visible viewport — DOM markers escape overflow:hidden
        const clusterBounds = map.getBounds()!;
        if (
          center.lon < clusterBounds.getWest() || center.lon > clusterBounds.getEast() ||
          center.lat < clusterBounds.getSouth() || center.lat > clusterBounds.getNorth()
        ) {
          // centroid off-screen — still count but don't render the marker
        } else {

        const el = document.createElement("div");
        el.className = isHighlighted ? "cluster-marker cluster-marker--pulse" : "cluster-marker";
        el.style.cssText = `
          width: 64px; height: 64px; border-radius: 50%;
          background: ${isHighlighted ? "#c0392b" : "#0f2557"};
          border: 3px solid white;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          cursor: pointer; pointer-events: auto;
          box-shadow: ${isHighlighted ? "0 0 24px rgba(192,57,43,0.6), 0 2px 10px rgba(0,0,0,0.4)" : "0 2px 14px rgba(0,0,0,0.35)"};
          font-family: Inter, sans-serif;
          transition: box-shadow 0.3s;
          ${isHighlighted ? "animation: pulse-cluster 1.2s ease-in-out infinite;" : ""}
        `;
        // Count badge with tanker sub-count for additional intel
        const anchoredTankerCount = anchored.filter((v: Vessel) => v.shipType >= 80 && v.shipType <= 89).length;
        el.innerHTML = `
          <span style="color:white;font-size:22px;font-weight:900;line-height:1">${anchored.length}</span>
          <span style="color:rgba(255,255,255,0.75);font-size:7px;font-weight:600;letter-spacing:0.06em;margin-top:2px">STRANDED</span>
        `;

        // Popup listing all anchored vessels (scrollable)
        const rowsHtml = anchored
          .map(
            (v) =>
              `<div style="padding:4px 0;border-bottom:1px solid #f3f4f6;display:flex;gap:8px;align-items:center;font-size:11px">
                <span style="font-weight:600;color:#0f2557;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${v.name || v.mmsi}</span>
                <span style="color:#9ca3af;white-space:nowrap">${v.flag || "--"}</span>
                <span style="color:#6b7280;white-space:nowrap;font-family:monospace">${shipTypeLabel(v.shipType)}</span>
              </div>`
          )
          .join("");

        const popup = new mb.Popup({ offset: 28, maxWidth: "280px", closeButton: true })
          .setHTML(
            `<div style="font-family:Inter,sans-serif;padding:4px 0">
              <div style="font-size:13px;font-weight:700;color:#0f2557;margin-bottom:8px">${anchored.length} Anchored Vessels</div>
              <div style="max-height:280px;overflow-y:auto;scrollbar-width:thin">${rowsHtml}</div>
            </div>`
          );

        el.addEventListener("click", (e) => {
          e.stopPropagation();
          popup.setLngLat([center.lon, center.lat]).addTo(map);
          clusterPopupRef.current = popup;
        });

        const marker = new mb.Marker({ element: el, anchor: "center" })
          .setLngLat([center.lon, center.lat])
          .addTo(map);

        markersRef.current.push(marker);
        } // end else (centroid in bounds)
      }

      // B. Moving vessels — individual markers with course vectors
      moving.forEach((v) => {
        // Land filter: skip vessels on land using geometric water polygon check
        if (!isInWater(v.lat, v.lon)) return;

        // Viewport bounds check — Mapbox DOM markers ignore overflow:hidden/clipPath,
        // so we must skip any vessel outside the current visible map bounds
        const bounds = map.getBounds()!;
        if (
          v.lon < bounds.getWest() || v.lon > bounds.getEast() ||
          v.lat < bounds.getSouth() || v.lat > bounds.getNorth()
        ) return;

        const typeLabel = shipTypeLabel(v.shipType);
        const isDark    = !v.name || v.name.trim() === "";
        const color     = vesselColor(typeLabel, isDark);
        const isHighlighted = highlightedSet.has(v.mmsi);

        // All moving vessels get 14px; highlighted get 18px for clear visibility
        const dotSize   = isHighlighted ? 18 : 14;
        const course    = v.course || v.heading || 0;
        const vec       = courseVector(course, v.speed);
        void vec; // suppress unused-variable lint

        // Wrapper: sized to contain dot + vector line + label
        const wrapper = document.createElement("div");
        wrapper.style.cssText = `
          position: relative;
          width: 80px; height: 80px;
          pointer-events: none;
        `;

        // Invisible hit target centered in wrapper
        const hitTarget = document.createElement("div");
        hitTarget.style.cssText = `
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: ${dotSize + 12}px; height: ${dotSize + 12}px;
          border-radius: 50%;
          cursor: pointer;
          pointer-events: auto;
          z-index: 10;
        `;

        // Dot — all moving vessels pulse to indicate live movement
        const dot = document.createElement("div");
        dot.style.cssText = `
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: ${dotSize}px; height: ${dotSize}px; border-radius: 50%;
          background: ${color};
          border: ${isHighlighted ? 2 : 1.5}px solid rgba(255,255,255,0.9);
          box-shadow: ${isHighlighted ? `0 0 14px ${color}, 0 0 6px rgba(0,0,0,0.4)` : `0 0 6px ${color}80, 0 1px 3px rgba(0,0,0,0.4)`};
          z-index: 5;
          animation: ${isHighlighted ? "pulse-vessel 0.9s ease-in-out infinite" : "pulse-vessel 2s ease-in-out infinite"};
          pointer-events: none;
        `;

        // Pulsing ring for highlighted vessels
        if (isHighlighted) {
          const ring = document.createElement("div");
          ring.style.cssText = `
            position: absolute;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            width: ${dotSize + 14}px; height: ${dotSize + 14}px;
            border: 2px solid ${color};
            border-radius: 50%;
            opacity: 0.5;
            animation: pulse-ring 0.9s ease-in-out infinite;
            pointer-events: none;
            z-index: 4;
          `;
          wrapper.appendChild(ring);
        }

        // Course vector line — DOM element rotated to course direction
        const vectorLength = Math.min(55, Math.max(18, v.speed * 5.5));
        const vector = document.createElement("div");
        vector.style.cssText = `
          position: absolute;
          top: 50%; left: 50%;
          width: ${vectorLength}px; height: 2px;
          background: ${color};
          opacity: 0.55;
          transform-origin: 0 50%;
          transform: translateY(-50%) rotate(${course - 90}deg);
          border-radius: 1px;
          pointer-events: none;
          z-index: 3;
        `;

        // Dark ship "?" indicator
        if (isDark) {
          const qmark = document.createElement("div");
          qmark.style.cssText = `
            position: absolute;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            font-size: 7px; font-weight: 800; color: white;
            z-index: 6; pointer-events: none; line-height: 1;
          `;
          qmark.textContent = "?";
          wrapper.appendChild(qmark);
        }

        // Name label below dot — always shown for all moving vessels
        const label = document.createElement("div");
        label.style.cssText = `
          position: absolute;
          top: calc(50% + ${dotSize / 2 + 4}px); left: 50%;
          transform: translateX(-50%);
          white-space: nowrap;
          font-family: Inter, sans-serif;
          font-size: 10px; font-weight: 700;
          color: ${isDark ? "#ef4444" : "#ffffff"};
          background: ${isDark ? "rgba(220,38,38,0.2)" : "rgba(15,37,87,0.82)"};
          border: ${isDark ? "1px solid rgba(239,68,68,0.5)" : "1px solid rgba(255,255,255,0.2)"};
          padding: 2px 5px; border-radius: 3px;
          pointer-events: none;
          z-index: 5;
          max-width: 90px; overflow: hidden; text-overflow: ellipsis;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
        `;
        label.textContent = isDark ? "UNIDENTIFIED" : (v.name || v.mmsi);

        wrapper.appendChild(vector);
        wrapper.appendChild(dot);
        wrapper.appendChild(hitTarget);
        wrapper.appendChild(label);

        // Enhanced popup with cargo info for tankers
        const badge = popupBadgeStyle(typeLabel, isDark);
        const statusStr = isDark ? "AIS DISABLED" : vesselStatus(v);
        const lastUpd = v.lastUpdate
          ? new Date(v.lastUpdate).toUTCString().replace("GMT", "UTC")
          : "--";

        const cargoHtml = (!isDark && v.shipType >= 80 && v.shipType <= 89)
          ? (() => {
              const cargo = estimateTankerCargo(v.length);
              const valStr = brentPrice ? cargo.value(brentPrice) : null;
              return `
                <div style="margin-top:8px;padding:6px 8px;background:#fef9ec;border:1px solid #fde68a;border-radius:4px;font-size:10px">
                  <div style="font-weight:700;color:#92400e;margin-bottom:2px">CARGO ESTIMATE</div>
                  <div style="color:#78350f">${cargo.label} bbl at 60% load factor</div>
                  ${valStr ? `<div style="color:#b45309;font-weight:600">${valStr} at current Brent</div>` : ""}
                </div>
              `;
            })()
          : "";

        const popupHtml = `
          <div style="font-family:Inter,sans-serif;font-size:12px;padding:4px;min-width:200px">
            <div style="font-weight:700;font-size:13px;color:${isDark ? "#7c3aed" : "#0f2557"};margin-bottom:6px;display:flex;align-items:center;gap:6px">
              ${isDark ? "DARK SHIP" : v.name || "UNNAMED"}
              ${v.flag ? `<span style="font-size:11px">${v.flag}</span>` : ""}
            </div>
            <span style="display:inline-block;font-size:9px;font-weight:700;background:${badge.bg};color:${badge.color};padding:2px 6px;border-radius:3px;letter-spacing:0.05em;margin-bottom:8px">
              ${isDark ? "DARK SHIP" : typeLabel}
            </span>
            <div style="display:grid;grid-template-columns:auto 1fr;gap:3px 10px;color:#374151">
              <span style="color:#9ca3af">Speed</span><span style="font-family:monospace">${v.speed.toFixed(1)} kt</span>
              <span style="color:#9ca3af">Course</span><span style="font-family:monospace">${v.course.toFixed(0)}&deg;</span>
              ${v.destination ? `<span style="color:#9ca3af">Dest</span><span>${v.destination}</span>` : ""}
              ${v.length ? `<span style="color:#9ca3af">Length</span><span style="font-family:monospace">${v.length} m</span>` : ""}
              ${v.draught ? `<span style="color:#9ca3af">Draught</span><span style="font-family:monospace">${v.draught} m</span>` : ""}
              <span style="color:#9ca3af">MMSI</span><span style="font-family:monospace">${v.mmsi}</span>
            </div>
            <div style="margin-top:6px;padding:4px 6px;border-radius:3px;background:${isDark ? "rgba(124,58,237,0.08)" : "rgba(15,37,87,0.06)"}">
              <span style="font-size:9px;font-weight:700;color:${isDark ? "#7c3aed" : "#0f2557"}">STATUS: </span>
              <span style="font-size:9px;color:${isDark ? "#7c3aed" : "#374151"};font-weight:600">${statusStr}</span>
            </div>
            ${cargoHtml}
            <div style="margin-top:6px;font-size:9px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:4px">
              ${v.imo ? `IMO: ${v.imo} &bull; ` : ""}Updated: ${lastUpd}
            </div>
          </div>
        `;

        const popup = new mb.Popup({ offset: 18, maxWidth: "240px" }).setHTML(popupHtml);
        hitTarget.addEventListener("click", (e) => {
          e.stopPropagation();
          popup.setLngLat([v.lon, v.lat]).addTo(map);
        });

        const marker = new mb.Marker({ element: wrapper, anchor: "center" })
          .setLngLat([v.lon, v.lat])
          .addTo(map);

        markersRef.current.push(marker);
      });

      // C. Dark ships — rendered at ESTIMATED positions near blockade zone (Option B)
      // Real AIS positions are all in Dubai port (hidden behind stranded cluster).
      // Instead, spread dark ships around the blockade zone perimeter at estimated positions.
      // Dark ships rendered as Mapbox GeoJSON — clean dots, no DOM clutter
      // Positions follow the SHIPPING LANE CENTERLINE (between inbound/outbound lanes)
      // These are where supertankers actually transit — guaranteed deep water
      // Musandam Peninsula tip is at ~26.4°N/56.3°E — ALL positions avoid it
      const DARK_EST: [number, number][] = [
        [55.5, 26.6],   // western approach — channel center, well north of UAE coast
        [56.0, 26.55],  // mid-strait west — between inbound (26.5) and outbound (26.7)
        [56.5, 26.55],  // mid-strait center — above Musandam tip (26.4), in channel
        [57.0, 26.15],  // mid-strait east — between inbound (26.0) and outbound (26.2)
        [57.5, 26.1],   // eastern exit — Gulf of Oman approach, open water
      ];

      const darkGeojson: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: darkShips.slice(0, DARK_EST.length).map((v, i) => ({
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: DARK_EST[i] },
          properties: { mmsi: v.mmsi, lastUpdate: String(v.lastUpdate || "") },
        })),
      };

      if (map.getSource("dark-ships")) {
        (map.getSource("dark-ships") as mapboxgl.GeoJSONSource).setData(darkGeojson);
      } else {
        map.addSource("dark-ships", { type: "geojson", data: darkGeojson });

        // Subtle glow ring
        map.addLayer({
          id: "dark-glow",
          type: "circle",
          source: "dark-ships",
          paint: {
            "circle-radius": 16,
            "circle-color": "transparent",
            "circle-stroke-color": "rgba(139,92,246,0.25)",
            "circle-stroke-width": 2,
          },
        });

        // Purple dot
        map.addLayer({
          id: "dark-dot",
          type: "circle",
          source: "dark-ships",
          paint: {
            "circle-radius": 8,
            "circle-color": "#8b5cf6",
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2,
          },
        });

        // "EST" label — only at zoom 6+
        map.addLayer({
          id: "dark-label",
          type: "symbol",
          source: "dark-ships",
          minzoom: 6,
          layout: {
            "text-field": "DARK",
            "text-size": 9,
            "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
            "text-offset": [0, 1.5],
            "text-anchor": "top",
            "text-allow-overlap": true,
          },
          paint: {
            "text-color": "#7c3aed",
            "text-halo-color": "rgba(255,255,255,0.9)",
            "text-halo-width": 1.5,
          },
        });

        // Click popup
        map.on("click", "dark-dot", (e) => {
          if (!e.features || e.features.length === 0) return;
          const f = e.features[0];
          const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
          const p = f.properties!;
          new mb.Popup({ offset: 12, maxWidth: "240px" })
            .setLngLat(coords)
            .setHTML(`
              <div style="font-family:Inter,sans-serif">
                <div style="padding:8px 12px;background:#581c87;color:#e9d5ff;font-size:13px;font-weight:700">
                  DARK SHIP — ESTIMATED
                </div>
                <div style="padding:8px 12px">
                  <div style="display:inline-block;font-size:9px;font-weight:700;background:#f3e8ff;color:#7c3aed;padding:2px 8px;border-radius:4px;margin-bottom:6px">AIS DISABLED</div>
                  <div style="display:grid;grid-template-columns:auto 1fr;gap:3px 10px;font-size:11px;color:#374151;">
                    <span style="color:#9ca3af">Est. Position</span><span style="font-family:monospace">${coords[1].toFixed(2)}N, ${coords[0].toFixed(2)}E</span>
                    <span style="color:#9ca3af">MMSI</span><span style="font-family:monospace">${p.mmsi}</span>
                  </div>
                  <div style="margin-top:6px;font-size:9px;color:#7c3aed;font-style:italic">Position estimated. AIS transponder disabled.</div>
                </div>
              </div>
            `)
            .addTo(map);
        });
        map.on("mouseenter", "dark-dot", () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "dark-dot", () => { map.getCanvas().style.cursor = ""; });
      }
    });
  }, [mapLoaded, vessels, highlightFilter, brentPrice]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update carrier layer whenever carriers change — uses native Mapbox GeoJSON layers
  // (NOT DOM markers) so carriers render correctly even at map edges
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    import("mapbox-gl").then((mapboxgl) => {
      const mb = mapboxgl.default ?? mapboxgl;
      const map = mapRef.current!;

      if (!carriers || carriers.length === 0) return;

      const activeCarriers = carriers.filter((c) => c.status !== "in_port");

      const geojson: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: activeCarriers.map((c) => ({
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [c.lng, c.lat] },
          properties: {
            hull: c.hull,
            name: c.name.split("(")[0].trim(),
            fullName: c.name,
            status: c.status,
            desc: c.desc,
            mission: c.mission || "",
            source: c.source,
            lastUpdate: c.lastUpdate,
            estimated: c.estimated,
          },
        })),
      };

      // Add or update source
      if (map.getSource("carriers")) {
        (map.getSource("carriers") as mapboxgl.GeoJSONSource).setData(geojson);
      } else {
        map.addSource("carriers", { type: "geojson", data: geojson });

        // Outer gold halo — large enough to be visible at zoom 4.8
        map.addLayer({
          id: "carrier-halo",
          type: "circle",
          source: "carriers",
          paint: {
            "circle-radius": 22,
            "circle-color": "rgba(251,191,36,0.18)",
            "circle-stroke-color": "rgba(251,191,36,0.55)",
            "circle-stroke-width": 2.5,
          },
        });

        // Inner gold dot — 12px so it's clearly visible at zoom 4.8
        map.addLayer({
          id: "carrier-dot",
          type: "circle",
          source: "carriers",
          paint: {
            "circle-radius": 12,
            "circle-color": "#fbbf24",
            "circle-stroke-color": "#f59e0b",
            "circle-stroke-width": 2.5,
          },
        });

        // Hull number label above dot
        map.addLayer({
          id: "carrier-label",
          type: "symbol",
          source: "carriers",
          layout: {
            "text-field": ["get", "hull"],
            "text-size": 12,
            "text-font": ["DIN Offc Pro Bold", "Arial Unicode MS Bold"],
            "text-offset": [0, -2.5],
            "text-anchor": "bottom",
            "text-allow-overlap": true,
            "text-ignore-placement": true,
          },
          paint: {
            "text-color": "#92400e",
            "text-halo-color": "#fefce8",
            "text-halo-width": 2.5,
          },
        });

        // Ship name label below dot
        map.addLayer({
          id: "carrier-name",
          type: "symbol",
          source: "carriers",
          layout: {
            "text-field": ["get", "name"],
            "text-size": 10,
            "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Regular"],
            "text-offset": [0, 2.0],
            "text-anchor": "top",
            "text-allow-overlap": true,
            "text-ignore-placement": true,
          },
          paint: {
            "text-color": "#b45309",
            "text-halo-color": "rgba(255,255,255,0.95)",
            "text-halo-width": 2,
          },
        });

        // Click handler for carrier popups
        map.on("click", "carrier-dot", (e) => {
          if (!e.features || e.features.length === 0) return;
          const f = e.features[0];
          const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
          const p = f.properties!;
          new mb.Popup({ offset: 12, maxWidth: "260px" })
            .setLngLat(coords)
            .setHTML(`
              <div style="font-family:Inter,sans-serif;font-size:12px;padding:4px;min-width:200px">
                <div style="font-weight:700;font-size:13px;color:#92400e;margin-bottom:4px">${p.fullName}</div>
                <span style="display:inline-block;font-size:9px;font-weight:700;background:#fbbf24;color:#7c2d12;padding:2px 6px;border-radius:3px;margin-bottom:8px">
                  ${String(p.status).toUpperCase().replace("_", " ")}
                </span>
                ${p.mission ? `<div style="font-size:11px;color:#374151;margin-bottom:6px">${p.mission}</div>` : ""}
                <div style="font-size:11px;color:#374151">${p.desc}</div>
                <div style="margin-top:6px;font-size:9px;color:#9ca3af">${p.source} — ${p.lastUpdate}</div>
                ${p.estimated === "true" || p.estimated === true ? `<div style="font-size:9px;color:#b45309;font-style:italic">Estimated from OSINT</div>` : ""}
              </div>
            `)
            .addTo(map);
        });

        map.on("mouseenter", "carrier-dot", () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "carrier-dot", () => { map.getCanvas().style.cursor = ""; });
      }
    });
  }, [mapLoaded, carriers]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fly-to logic separated for clarity
  function handleFilterFlyTo(
    map: MapboxMap,
    filter: VesselFilter,
    allVessels: Vessel[],
    anchored: Vessel[],
    moving: Vessel[],
    highlightedSet: Set<string>
  ) {
    switch (filter) {
      case "anchored": {
        if (anchored.length === 0) return;
        const c = vesselCenter(anchored);
        map.flyTo({ center: [c.lon, c.lat], zoom: 8, duration: 1000 });
        break;
      }
      case "approaching": {
        map.flyTo({ center: [56.5, 25.5], zoom: 6.5, duration: 1000 });
        break;
      }
      case "inStrait": {
        map.flyTo({ center: [56.5, 26.4], zoom: 8.5, duration: 1000 });
        break;
      }
      case "darkShips": {
        const dark = allVessels.filter((v) => highlightedSet.has(v.mmsi));
        if (dark.length === 0) return;
        const c = vesselCenter(dark);
        map.flyTo({ center: [c.lon, c.lat], zoom: 7.5, duration: 1000 });
        break;
      }
    }
    void moving; // suppress unused-variable lint
  }

  // Toggle between light, satellite, and dark basemaps
  const toggleStyle = useCallback(() => {
    if (!mapRef.current) return;
    const next = mapStyle === "light" ? "satellite" : mapStyle === "satellite" ? "dark" : "light";
    const styleUrl =
      next === "light"     ? "mapbox://styles/mapbox/light-v11" :
      next === "satellite" ? "mapbox://styles/mapbox/satellite-streets-v12" :
                             "mapbox://styles/mapbox/dark-v11";
    setMapStyle(next);
    mapRef.current.setStyle(styleUrl);

    // Re-add naval base markers after style change (markers survive style reload)
    import("mapbox-gl").then((mapboxgl) => {
      const mb = mapboxgl.default ?? mapboxgl;
      addNavalBaseMarkers(mapRef.current!, mb);
    });
  }, [mapStyle]); // eslint-disable-line react-hooks/exhaustive-deps

  // Compute footer stats
  const inRegionVessels = vessels.filter((v) => v.lat >= 24.0 && v.lat <= 28.0 && v.lon >= 50.0 && v.lon <= 60.0);
  const anchoredVessels = inRegionVessels.filter((v) => v.speed < 0.5);
  const movingVessels   = inRegionVessels.filter((v) => v.speed >= 0.5);
  const transitingCount = movingVessels.filter((v) =>
    v.lat >= STRAIT_BOUNDS.latMin && v.lat <= STRAIT_BOUNDS.latMax &&
    v.lon >= STRAIT_BOUNDS.lonMin && v.lon <= STRAIT_BOUNDS.lonMax
  ).length;
  const approachingCount = movingVessels.length - transitingCount;
  const anchoredTankers  = anchoredVessels.filter((v) => v.shipType >= 80 && v.shipType <= 89);
  const darkCount        = movingVessels.filter((v) => !v.name || v.name.trim() === "").length;
  const nearbyCarriers   = (carriers ?? []).filter((c) => c.status !== "in_port").length;

  // Stranded oil estimate: sum cargo estimates × 0.6 load factor
  const strandedBbl = anchoredTankers.reduce((sum, v) => {
    const cargo = estimateTankerCargo(v.length);
    return sum + cargo.barrels * 0.6;
  }, 0);
  const strandedMM  = strandedBbl / 1_000_000;
  const strandedVal = brentPrice ? brentPrice * strandedBbl / 1_000_000_000 : null; // billions

  const totalTracked = vessels.length;

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e2e5eb",
        borderRadius: 8,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        overflow: "hidden",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Map header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #e2e5eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          background: "#ffffff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: "#0f2557", letterSpacing: "0.04em" }}>
            STRAIT OF HORMUZ
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#dc2626",
              background: "rgba(220,38,38,0.08)",
              border: "1px solid rgba(220,38,38,0.2)",
              padding: "2px 8px",
              borderRadius: 4,
              letterSpacing: "0.04em",
            }}
          >
            BLOCKADE ACTIVE
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Legend */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 6 }}>
            {[
              { color: "#f59e0b", label: "Tanker", shape: "circle" as const },
              { color: "#3b82f6", label: "Cargo", shape: "circle" as const },
              { color: "#8b5cf6", label: "Dark ship", shape: "circle" as const },
              { color: "#fbbf24", label: "Carrier", shape: "bar" as const },
              { color: "#7f1d1d", label: "Iran Base", shape: "square" as const },
              { color: "#059669", label: "Allied Base", shape: "square" as const },
            ].map(({ color, label, shape }) => (
              <span key={label} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: "#6b7280" }}>
                {shape === "bar" ? (
                  <span style={{
                    width: 14, height: 5, background: color, border: "1px solid #f59e0b",
                    borderRadius: 2, display: "inline-block", flexShrink: 0,
                  }} />
                ) : shape === "square" ? (
                  <span style={{
                    width: 8, height: 8, background: color, border: "2px solid #fff",
                    borderRadius: 1, display: "inline-block", flexShrink: 0,
                    boxShadow: "0 0 0 1px " + color,
                  }} />
                ) : (
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
                )}
                {label}
              </span>
            ))}
          </div>

          {/* Risk zones toggle */}
          <button
            onClick={() => setRiskZonesVisible((v) => !v)}
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: riskZonesVisible ? "#92400e" : "#9ca3af",
              background: riskZonesVisible ? "#fef3c7" : "#f3f4f6",
              border: `1px solid ${riskZonesVisible ? "#fde68a" : "#e5e7eb"}`,
              borderRadius: 4,
              padding: "3px 8px",
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
              transition: "all 0.15s",
            }}
          >
            {riskZonesVisible ? "Zones ON" : "Zones OFF"}
          </button>

          <button
            onClick={toggleStyle}
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#0f2557",
              background: "#e8edf8",
              border: "none",
              borderRadius: 4,
              padding: "4px 10px",
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
            }}
          >
            {mapStyle === "light" ? "Satellite" : mapStyle === "satellite" ? "Dark" : "Default"}
          </button>
        </div>
      </div>

      {/* Map container */}
      <div style={{ flex: 1, position: "relative", minHeight: 520, overflow: "hidden", clipPath: "inset(0)" }}>
        <div ref={containerRef} style={{ width: "100%", height: "100%", overflow: "hidden" }} />

        {/* Vessel count badge — top-right of map */}
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            background: "rgba(255,255,255,0.93)",
            border: "1px solid #e2e5eb",
            borderRadius: 6,
            padding: "6px 10px",
            display: "flex",
            alignItems: "center",
            gap: 6,
            zIndex: 10,
            boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
            fontFamily: "Inter, sans-serif",
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: connected ? "#16a34a" : "#9ca3af",
              display: "inline-block",
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>
            {totalTracked} tracked
          </span>
        </div>

        {/* AIS offline banner */}
        {!connected && (
          <div
            style={{
              position: "absolute",
              top: 50,
              right: 10,
              background: "rgba(255,255,255,0.93)",
              border: "1px solid #fca5a5",
              borderRadius: 6,
              padding: "5px 12px",
              fontSize: 11,
              fontWeight: 600,
              color: "#dc2626",
              zIndex: 10,
              boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
              fontFamily: "Inter, sans-serif",
            }}
          >
            AIS offline — positions may be stale
          </div>
        )}

        {/* Strait info box — bottom-right */}
        <div
          style={{
            position: "absolute",
            bottom: 30,
            right: 10,
            background: "rgba(255,255,255,0.93)",
            border: "1px solid #e2e5eb",
            borderRadius: 6,
            padding: "8px 12px",
            zIndex: 10,
            boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
            fontFamily: "Inter, sans-serif",
            minWidth: 200,
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, color: "#0f2557", letterSpacing: "0.08em", marginBottom: 5 }}>
            STRAIT OF HORMUZ
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "2px 8px", fontSize: 11 }}>
            <span style={{ color: "#9ca3af" }}>Width</span>
            <span style={{ color: "#374151", fontFamily: "monospace" }}>33 km at narrows</span>
            <span style={{ color: "#9ca3af" }}>Normal</span>
            <span style={{ color: "#374151", fontFamily: "monospace" }}>~80 vessels/day</span>
            <span style={{ color: "#9ca3af" }}>Transiting</span>
            <span style={{ color: transitCount === 0 ? "#dc2626" : "#16a34a", fontFamily: "monospace", fontWeight: 700 }}>
              {transitCount} {transitCount === 0 ? "(BLOCKED)" : ""}
            </span>
            <span style={{ color: "#9ca3af" }}>Status</span>
            <span style={{ color: "#dc2626", fontWeight: 700, letterSpacing: "0.04em" }}>BLOCKED</span>
          </div>
        </div>

        {/* No token warning */}
        {!MAPBOX_TOKEN && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(245,246,248,0.95)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 8,
              zIndex: 20,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0f2557" }}>Map unavailable</span>
            <span style={{ fontSize: 11, color: "#6b7280" }}>NEXT_PUBLIC_MAPBOX_TOKEN is not configured</span>
          </div>
        )}
      </div>

      {/* Map footer stats */}
      <div
        style={{
          padding: "6px 14px",
          borderTop: "1px solid #f0f0f0",
          background: "#f9fafb",
          fontSize: 10,
          color: "#6b7280",
          fontFamily: "Inter, sans-serif",
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <span style={{ color: "#dc2626", fontWeight: 700 }}>{transitingCount} transiting</span>
        <span style={{ color: "#9ca3af" }}>|</span>
        <span style={{ color: "#d97706", fontWeight: 600 }}>{approachingCount} approaching</span>
        <span style={{ color: "#9ca3af" }}>|</span>
        <span style={{ fontWeight: 600 }}>
          {anchoredVessels.length} anchored
          {anchoredTankers.length > 0 && (
            <span style={{ color: "#b45309" }}> ({anchoredTankers.length} tankers)</span>
          )}
        </span>
        {darkCount > 0 && (
          <>
            <span style={{ color: "#9ca3af" }}>|</span>
            <span style={{ color: "#dc2626", fontWeight: 600 }}>{darkCount} dark</span>
          </>
        )}
        {nearbyCarriers > 0 && (
          <>
            <span style={{ color: "#9ca3af" }}>|</span>
            <span style={{ color: "#92400e", fontWeight: 600 }}>{nearbyCarriers} carrier{nearbyCarriers !== 1 ? "s" : ""} nearby</span>
          </>
        )}
        {strandedBbl > 0 && (
          <>
            <span style={{ color: "#9ca3af" }}>|</span>
            <span style={{ color: "#b45309", fontWeight: 600 }}>
              ~{fmt(strandedMM, 1)}M bbl at risk
              {strandedVal ? ` ($${fmt(strandedVal, 1)}B)` : ""}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
