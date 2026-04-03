import type { Vessel, TransitDay, PricePoint, DashboardMetrics } from "./types";

// Crisis date: Feb 28, 2026
const CRISIS_DATE = new Date("2026-02-28T00:00:00Z");

// Pre-crisis Brent baseline (last stable price before closure)
const PRE_CRISIS_BRENT = 71.32;

// Daily economic cost estimate (USD billions)
const DAILY_COST_BILLIONS = 4;

// Strait of Hormuz bounding box (approximate)
const STRAIT_BOUNDS = {
  latMin: 26.0,
  latMax: 26.8,
  lonMin: 56.0,
  lonMax: 56.8,
};

// Broader approach corridor (vessels heading toward strait)
const APPROACH_BOUNDS = {
  latMin: 24.5,
  latMax: 27.5,
  lonMin: 54.0,
  lonMax: 58.5,
};

/**
 * AIS ship type code → human-readable category
 */
export function shipTypeLabel(typeCode: number): string {
  if (typeCode >= 80 && typeCode <= 89) return "TANKER";
  if (typeCode >= 70 && typeCode <= 79) return "CARGO";
  if (typeCode >= 60 && typeCode <= 69) return "PASSENGER";
  if (typeCode === 30) return "FISHING";
  if (typeCode >= 50 && typeCode <= 59) return "SERVICE";
  if (typeCode >= 35 && typeCode <= 37) return "MILITARY";
  return "OTHER";
}

/**
 * Whether a vessel is inside the Strait of Hormuz bounding box.
 */
export function isInStrait(v: Vessel): boolean {
  return (
    v.lat >= STRAIT_BOUNDS.latMin &&
    v.lat <= STRAIT_BOUNDS.latMax &&
    v.lon >= STRAIT_BOUNDS.lonMin &&
    v.lon <= STRAIT_BOUNDS.lonMax
  );
}

/**
 * Whether a vessel is in the broader approach corridor (moving, not in strait).
 */
export function isApproaching(v: Vessel): boolean {
  if (isInStrait(v)) return false;
  // Must be moving at meaningful speed (>2kt) — catches more vessels across the approach corridor
  // lon/lat restriction removed — APPROACH_BOUNDS already filters to the strait approach region
  return (
    v.speed > 2.0 &&
    v.speed <= 30.0 &&  // exclude bad AIS data (ghost speeds)
    v.lat >= APPROACH_BOUNDS.latMin &&
    v.lat <= APPROACH_BOUNDS.latMax &&
    v.lon >= APPROACH_BOUNDS.lonMin &&
    v.lon <= APPROACH_BOUNDS.lonMax
  );
}

/**
 * Determine strait status based on transit data vs 90-day average.
 */
function computeStraitStatus(
  days: TransitDay[]
): { status: "CLOSED" | "RESTRICTED" | "OPEN"; today: number | null; avg90: number | null } {
  if (days.length === 0) return { status: "CLOSED", today: null, avg90: null };

  const sorted = [...days].sort((a, b) => b.date.localeCompare(a.date));
  const today = sorted[0]?.total ?? null;

  const preCrisis = days.filter((d) => d.date < "2026-02-28");
  const avg90 =
    preCrisis.length > 0
      ? preCrisis.reduce((s, d) => s + d.total, 0) / preCrisis.length
      : days.reduce((s, d) => s + d.total, 0) / days.length;

  let status: "CLOSED" | "RESTRICTED" | "OPEN" = "OPEN";
  if (today !== null) {
    const ratio = today / avg90;
    if (ratio < 0.1) status = "CLOSED";
    else if (ratio < 0.5) status = "RESTRICTED";
    else status = "OPEN";
  }

  return { status, today, avg90: Math.round(avg90) };
}

/**
 * Compute latest oil price and daily % change from a price series.
 */
function latestPriceAndChange(
  data: PricePoint[],
  key: "brent" | "wti"
): { price: number | null; change: number | null } {
  const filtered = data.filter((d) => d[key] !== null).sort((a, b) => b.date.localeCompare(a.date));
  if (filtered.length === 0) return { price: null, change: null };

  const price = filtered[0][key] as number;
  const prev = filtered.length > 1 ? (filtered[1][key] as number) : null;
  const change = prev !== null ? ((price - prev) / prev) * 100 : null;
  return { price, change };
}

/**
 * Compute all dashboard metrics from raw API data.
 */
export function computeMetrics(
  vessels: Vessel[],
  transitDays: TransitDay[],
  oilPrices: PricePoint[]
): DashboardMetrics {
  const now = new Date();
  const daysSinceClosure = Math.floor(
    (now.getTime() - CRISIS_DATE.getTime()) / (1000 * 60 * 60 * 24)
  );

  const shipsInStrait = vessels.filter(isInStrait).length;
  const shipsApproaching = vessels.filter(isApproaching).length;
  // speed > 30kt = bad AIS data (port vessels reporting garbage) — treat as anchored
  const vesselsAtAnchor = vessels.filter((v) => v.speed < 5.0 || v.speed > 30.0).length;

  const { price: brentPrice, change: brentChange } = latestPriceAndChange(oilPrices, "brent");
  const { price: wtiPrice, change: wtiChange } = latestPriceAndChange(oilPrices, "wti");

  const oilSpikePct =
    brentPrice !== null ? ((brentPrice - PRE_CRISIS_BRENT) / PRE_CRISIS_BRENT) * 100 : null;

  const economicCostBillions = daysSinceClosure * DAILY_COST_BILLIONS;

  const { status, today, avg90 } = computeStraitStatus(transitDays);

  return {
    daysSinceClosure,
    shipsInStrait,
    shipsApproaching,
    vesselsAtAnchor,
    brentPrice,
    brentChange,
    wtiPrice,
    wtiChange,
    oilSpikePct,
    economicCostBillions,
    straitStatus: status,
    transitToday: today,
    transit90dAvg: avg90,
  };
}

/**
 * Format a number with commas and optional decimal places.
 */
export function fmt(n: number | null | undefined, decimals = 0): string {
  if (n == null) return "--";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a signed percentage with + prefix.
 */
export function fmtPct(n: number | null | undefined, decimals = 1): string {
  if (n == null) return "--";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(decimals)}%`;
}

/**
 * "2 hours ago" style relative time from an ISO/RFC date string.
 */
export function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}

/**
 * Flag emoji from ISO country code.
 * Returns empty string for unknown codes (no emoji in comments per rules).
 */
export function flagEmoji(iso: string): string {
  if (!iso || iso.length !== 2) return "";
  const codePoints = [...iso.toUpperCase()].map(
    (c) => 0x1f1e6 + c.charCodeAt(0) - 65
  );
  return String.fromCodePoint(...codePoints);
}

/**
 * Estimate tanker cargo by vessel length (size class).
 * Uses 60% load factor — anchored tankers may be empty or partially loaded.
 */
export function estimateTankerCargo(length: number | undefined): {
  barrels: number;
  label: string;
  value: (brent: number) => string;
} {
  const l = length ?? 0;
  let bbl: number;
  let label: string;
  if (l > 300) { bbl = 2000000; label = "~2M"; }
  else if (l > 250) { bbl = 1000000; label = "~1M"; }
  else if (l > 200) { bbl = 750000; label = "~750K"; }
  else { bbl = 500000; label = "~500K"; }
  return {
    barrels: bbl,
    label,
    value: (brent: number) => `$${fmt(bbl * brent / 1000000, 1)}M`,
  };
}

/**
 * Compute geographic center of a list of vessels.
 */
export function vesselCenter(vessels: Vessel[]): { lat: number; lon: number } {
  if (vessels.length === 0) return { lat: 26.5, lon: 56.35 };
  const lat = vessels.reduce((s, v) => s + v.lat, 0) / vessels.length;
  const lon = vessels.reduce((s, v) => s + v.lon, 0) / vessels.length;
  return { lat, lon };
}
