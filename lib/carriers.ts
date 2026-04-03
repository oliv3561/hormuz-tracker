/**
 * Carrier Strike Group OSINT Tracker
 * ====================================
 * Maintains estimated positions for all 11 US Navy aircraft carriers using
 * GDELT news headlines as OSINT signal, with USNI fallback positions.
 *
 * Data sources:
 *   1. GDELT News API  — recent carrier movement headlines (14-day window)
 *   2. Static fallback — USNI News Fleet & Marine Tracker (Mar 9, 2026)
 *   3. Disk cache      — persists GDELT-sourced positions across cold starts
 */

import { readFileSync, writeFileSync, renameSync, existsSync } from "fs";
import { join } from "path";
import type { Carrier, CarrierStatus } from "./types";

// ---------------------------------------------------------------------------
// Carrier registry — hull number → metadata + fallback position
// Fallback positions from USNI News Fleet & Marine Tracker, March 9, 2026:
// https://news.usni.org/2026/03/09/usni-news-fleet-and-marine-tracker-march-9-2026
// ---------------------------------------------------------------------------

interface RegistryEntry {
  name: string;
  wiki: string;
  homeport: string;
  homeportLat: number;
  homeportLng: number;
  fallbackLat: number;
  fallbackLng: number;
  fallbackHeading: number;
  fallbackDesc: string;
}

export const CARRIER_REGISTRY: Record<string, RegistryEntry> = {
  // --- Bremerton, WA (Naval Base Kitsap) ---
  "CVN-68": {
    name: "USS Nimitz (CVN-68)",
    wiki: "https://en.wikipedia.org/wiki/USS_Nimitz",
    homeport: "Bremerton, WA",
    homeportLat: 47.5535,
    homeportLng: -122.6400,
    fallbackLat: 47.5535,
    fallbackLng: -122.6400,
    fallbackHeading: 90,
    fallbackDesc: "Bremerton, WA (Maintenance)",
  },
  "CVN-76": {
    name: "USS Ronald Reagan (CVN-76)",
    wiki: "https://en.wikipedia.org/wiki/USS_Ronald_Reagan",
    homeport: "Bremerton, WA",
    homeportLat: 47.5580,
    homeportLng: -122.6360,
    fallbackLat: 47.5580,
    fallbackLng: -122.6360,
    fallbackHeading: 90,
    fallbackDesc: "Bremerton, WA (Decommissioning)",
  },

  // --- Norfolk, VA (Naval Station Norfolk) ---
  "CVN-69": {
    name: "USS Dwight D. Eisenhower (CVN-69)",
    wiki: "https://en.wikipedia.org/wiki/USS_Dwight_D._Eisenhower",
    homeport: "Norfolk, VA",
    homeportLat: 36.9465,
    homeportLng: -76.3265,
    fallbackLat: 36.9465,
    fallbackLng: -76.3265,
    fallbackHeading: 0,
    fallbackDesc: "Norfolk, VA (Post-deployment maintenance)",
  },
  "CVN-78": {
    name: "USS Gerald R. Ford (CVN-78)",
    wiki: "https://en.wikipedia.org/wiki/USS_Gerald_R._Ford",
    homeport: "Norfolk, VA",
    homeportLat: 36.9505,
    homeportLng: -76.3250,
    fallbackLat: 18.0,
    fallbackLng: 39.5,
    fallbackHeading: 0,
    fallbackDesc: "Red Sea — Operation Epic Fury (USNI Mar 9)",
  },
  "CVN-74": {
    name: "USS John C. Stennis (CVN-74)",
    wiki: "https://en.wikipedia.org/wiki/USS_John_C._Stennis",
    homeport: "Norfolk, VA",
    homeportLat: 36.9540,
    homeportLng: -76.3235,
    fallbackLat: 36.98,
    fallbackLng: -76.43,
    fallbackHeading: 0,
    fallbackDesc: "Newport News, VA (RCOH refueling overhaul)",
  },
  "CVN-75": {
    name: "USS Harry S. Truman (CVN-75)",
    wiki: "https://en.wikipedia.org/wiki/USS_Harry_S._Truman",
    homeport: "Norfolk, VA",
    homeportLat: 36.9580,
    homeportLng: -76.3220,
    fallbackLat: 36.0,
    fallbackLng: 15.0,
    fallbackHeading: 0,
    fallbackDesc: "Mediterranean Sea deployment (USNI Mar 9)",
  },
  "CVN-77": {
    name: "USS George H.W. Bush (CVN-77)",
    wiki: "https://en.wikipedia.org/wiki/USS_George_H.W._Bush",
    homeport: "Norfolk, VA",
    homeportLat: 36.9620,
    homeportLng: -76.3210,
    fallbackLat: 36.5,
    fallbackLng: -74.0,
    fallbackHeading: 0,
    fallbackDesc: "Atlantic — Pre-deployment workups (USNI Mar 9)",
  },

  // --- San Diego, CA (Naval Base San Diego) ---
  "CVN-70": {
    name: "USS Carl Vinson (CVN-70)",
    wiki: "https://en.wikipedia.org/wiki/USS_Carl_Vinson",
    homeport: "San Diego, CA",
    homeportLat: 32.6840,
    homeportLng: -117.1290,
    fallbackLat: 32.6840,
    fallbackLng: -117.1290,
    fallbackHeading: 180,
    fallbackDesc: "San Diego, CA (Homeport)",
  },
  "CVN-71": {
    name: "USS Theodore Roosevelt (CVN-71)",
    wiki: "https://en.wikipedia.org/wiki/USS_Theodore_Roosevelt_(CVN-71)",
    homeport: "San Diego, CA",
    homeportLat: 32.6885,
    homeportLng: -117.1280,
    fallbackLat: 32.6885,
    fallbackLng: -117.1280,
    fallbackHeading: 180,
    fallbackDesc: "San Diego, CA (Maintenance)",
  },
  "CVN-72": {
    name: "USS Abraham Lincoln (CVN-72)",
    wiki: "https://en.wikipedia.org/wiki/USS_Abraham_Lincoln_(CVN-72)",
    homeport: "San Diego, CA",
    homeportLat: 32.6925,
    homeportLng: -117.1275,
    fallbackLat: 20.0,
    fallbackLng: 64.0,
    fallbackHeading: 0,
    fallbackDesc: "Arabian Sea — Operation Epic Fury (USNI Mar 9)",
  },

  // --- Yokosuka, Japan (CFAY) ---
  "CVN-73": {
    name: "USS George Washington (CVN-73)",
    wiki: "https://en.wikipedia.org/wiki/USS_George_Washington_(CVN-73)",
    homeport: "Yokosuka, Japan",
    homeportLat: 35.2830,
    homeportLng: 139.6700,
    fallbackLat: 35.2830,
    fallbackLng: 139.6700,
    fallbackHeading: 180,
    fallbackDesc: "Yokosuka, Japan (Forward deployed)",
  },
};

// ---------------------------------------------------------------------------
// Region → approximate center coordinates
// Used to parse geographic references from GDELT news headlines
// ---------------------------------------------------------------------------

export const REGION_COORDS: Record<string, [number, number]> = {
  // Oceans & Seas
  "eastern mediterranean": [34.0, 25.0],
  "mediterranean":         [36.0, 15.0],
  "western mediterranean": [37.0, 2.0],
  "red sea":               [18.0, 39.5],
  "arabian sea":           [16.0, 64.0],
  "persian gulf":          [26.5, 51.5],
  "gulf of oman":          [24.5, 58.5],
  "north arabian sea":     [20.0, 64.0],
  "south china sea":       [15.0, 115.0],
  "east china sea":        [28.0, 125.0],
  "philippine sea":        [20.0, 130.0],
  "sea of japan":          [40.0, 135.0],
  "taiwan strait":         [24.0, 119.5],
  "western pacific":       [20.0, 140.0],
  "pacific":               [20.0, -150.0],
  "indian ocean":          [-5.0, 70.0],
  "north atlantic":        [40.0, -40.0],
  "atlantic":              [30.0, -50.0],
  "gulf of aden":          [12.5, 45.0],
  "horn of africa":        [10.0, 50.0],
  "strait of hormuz":      [26.5, 56.3],
  "bab el-mandeb":         [12.6, 43.3],
  "suez canal":            [30.5, 32.3],
  "baltic sea":            [57.0, 18.0],
  "north sea":             [56.0, 3.0],
  "black sea":             [43.0, 34.0],
  "south atlantic":        [-20.0, -20.0],
  "coral sea":             [-18.0, 155.0],
  "gulf of mexico":        [25.0, -90.0],
  "caribbean":             [15.0, -75.0],

  // Specific bases / ports
  "norfolk":      [36.95, -76.33],
  "san diego":    [32.68, -117.15],
  "yokosuka":     [35.28, 139.67],
  "pearl harbor": [21.35, -157.95],
  "guam":         [13.45, 144.79],
  "bahrain":      [26.23, 50.55],
  "rota":         [36.62, -6.35],
  "naples":       [40.85, 14.27],
  "bremerton":    [47.56, -122.63],
  "puget sound":  [47.56, -122.63],
  "newport news": [36.98, -76.43],

  // Fleet / combatant command areas — these are VAGUE regions, not ship positions.
  // Use broad ocean centers, never port cities.
  "5th fleet": [22.0, 60.0],   // Arabian Sea (not Dubai/Bahrain)
  "6th fleet": [36.0, 15.0],   // Mediterranean
  "7th fleet": [25.0, 130.0],  // Western Pacific
  "3rd fleet": [30.0, -130.0], // Eastern Pacific
  "2nd fleet": [35.0, -60.0],  // North Atlantic
  // NOTE: "centcom", "indopacom", "eucom", "southcom" deliberately EXCLUDED.
  // These are command names that appear in news articles but don't indicate
  // a ship's actual position. "US Centcom says X" doesn't mean the ship is at CENTCOM HQ.
};

// ---------------------------------------------------------------------------
// Cache — persists GDELT-sourced positions between cold starts
// Written atomically: .tmp → rename to avoid partial-read race conditions
// ---------------------------------------------------------------------------

const CACHE_FILE = join(process.cwd(), "carriers-cache.json");

interface CacheEntry {
  lat: number;
  lng: number;
  desc: string;
  source: string;
  sourceUrl: string;
  updated: string;
}

function loadCache(): Record<string, CacheEntry> {
  try {
    if (existsSync(CACHE_FILE)) {
      const raw = readFileSync(CACHE_FILE, "utf-8");
      return JSON.parse(raw) as Record<string, CacheEntry>;
    }
  } catch (err) {
    // Cache miss or parse error — non-fatal, proceed with fallbacks
    console.warn("[carriers] cache load failed:", err);
  }
  return {};
}

function saveCache(data: Record<string, CacheEntry>): void {
  const tmp = CACHE_FILE + ".tmp";
  try {
    writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
    renameSync(tmp, CACHE_FILE);
  } catch (err) {
    // Non-fatal — next request will refetch from GDELT
    console.warn("[carriers] cache save failed:", err);
  }
}

// ---------------------------------------------------------------------------
// matchCarrier — map article text to a hull number
// Checks hull number variants first (CVN-78, CVN78), then ship last name
// ---------------------------------------------------------------------------

export function matchCarrier(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [hull, info] of Object.entries(CARRIER_REGISTRY)) {
    // Hull number: "CVN-78" or "CVN78" (with or without hyphen)
    if (lower.includes(hull.toLowerCase()) || lower.includes(hull.toLowerCase().replace("-", ""))) {
      return hull;
    }
    // Ship last name: extract from "USS Gerald R. Ford (CVN-78)" → "ford"
    // We split on "(" to strip the hull suffix, then take the final word
    const shipName = info.name.toLowerCase().split("(")[0].trim();
    const lastName = shipName.split(" ").filter(Boolean).pop() ?? "";
    if (lastName.length > 3 && lower.includes(lastName)) {
      return hull;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// matchRegion — map article text to lat/lng
// Longest match wins so "eastern mediterranean" beats "mediterranean"
// ---------------------------------------------------------------------------

export function matchRegion(text: string): [number, number] | null {
  const lower = text.toLowerCase();
  // Sort by descending key length so longer (more specific) regions match first
  const sorted = Object.entries(REGION_COORDS).sort(([a], [b]) => b.length - a.length);
  for (const [region, coords] of sorted) {
    if (lower.includes(region)) {
      return coords;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// classifyStatus — derive operational status from position
// ---------------------------------------------------------------------------

export function classifyStatus(
  lat: number,
  lng: number,
  entry: RegistryEntry
): CarrierStatus {
  // Within ~5.5km of homeport pier → in port
  if (
    Math.abs(lat - entry.homeportLat) < 0.05 &&
    Math.abs(lng - entry.homeportLng) < 0.05
  ) {
    return "in_port";
  }

  // Atlantic transit band (rough: 20–55°N, 90–10°W) → en_route
  const inAtlantic =
    lat >= 20 && lat <= 55 && lng >= -90 && lng <= -10;
  // Pacific transit band (rough: 5–55°N, 180–100°W) → en_route
  const inPacific =
    lat >= 5 && lat <= 55 && lng >= -180 && lng <= -100;

  if (inAtlantic || inPacific) {
    return "en_route";
  }

  return "deployed";
}

// ---------------------------------------------------------------------------
// fetchGdeltCarrierNews — query GDELT for recent carrier movement headlines
// Uses Promise.allSettled so one failing query never blocks the rest
// ---------------------------------------------------------------------------

interface GdeltArticle {
  title?: string;
  url?: string;
}

interface GdeltResponse {
  articles?: GdeltArticle[];
}

interface NewsResult {
  title: string;
  url: string;
}

const GDELT_SEARCH_TERMS = [
  "USS+Nimitz+carrier",
  "USS+Ford+carrier",
  "USS+Eisenhower+carrier",
  "USS+Vinson+carrier",
  "USS+Roosevelt+carrier+navy",
  "USS+Lincoln+carrier",
  "USS+Truman+carrier",
  "USS+Reagan+carrier",
  "USS+Washington+carrier+navy",
  "USS+Bush+carrier",
  "USS+Stennis+carrier",
];

async function fetchGdeltCarrierNews(): Promise<NewsResult[]> {
  const requests = GDELT_SEARCH_TERMS.map(async (term): Promise<NewsResult[]> => {
    const url =
      `https://api.gdeltproject.org/api/v2/doc/doc` +
      `?query=${term}&mode=artlist&maxrecords=5&format=json&timespan=14d`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data: GdeltResponse = await res.json();
    return (data.articles ?? []).map((a) => ({
      title: a.title ?? "",
      url: a.url ?? "",
    }));
  });

  const results = await Promise.allSettled(requests);
  const articles: NewsResult[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") {
      articles.push(...r.value);
    } else {
      // Log individual failures at debug level — GDELT is frequently unreliable
      console.debug("[carriers] GDELT query failed:", r.reason);
    }
  }
  console.log(`[carriers] GDELT: fetched ${articles.length} articles`);
  return articles;
}

// ---------------------------------------------------------------------------
// parsePositionsFromNews — extract hull → position mappings from headlines
// First match per carrier wins (GDELT returns newest articles first)
// ---------------------------------------------------------------------------

function parsePositionsFromNews(
  articles: NewsResult[]
): Record<string, CacheEntry> {
  const updates: Record<string, CacheEntry> = {};
  const now = new Date().toISOString();

  for (const article of articles) {
    const hull = matchCarrier(article.title);
    if (!hull || hull in updates) continue; // skip if no match or already updated

    const coords = matchRegion(article.title);
    if (!coords) continue;

    updates[hull] = {
      lat: coords[0],
      lng: coords[1],
      desc: article.title.slice(0, 100),
      source: "GDELT News API",
      sourceUrl: article.url || "https://api.gdeltproject.org",
      updated: now,
    };
    console.log(
      `[carriers] OSINT update: ${CARRIER_REGISTRY[hull]?.name} → [${coords[0]}, ${coords[1]}] — "${article.title.slice(0, 60)}"`
    );
  }
  return updates;
}

// ---------------------------------------------------------------------------
// getCarrierPositions — main export
//
// Strategy (fail-safe layering):
//   1. Build baseline from CARRIER_REGISTRY fallbacks (always succeeds)
//   2. Overlay disk cache (GDELT positions from prior runs)
//   3. Try fresh GDELT fetch; overlay any new positions
//   4. Save updated cache atomically
//   5. Return typed Carrier[] array
// ---------------------------------------------------------------------------

export async function getCarrierPositions(): Promise<{
  carriers: Carrier[];
  lastGdeltFetch: string | null;
}> {
  const now = new Date().toISOString();
  let lastGdeltFetch: string | null = null;

  // Step 1: baseline from static fallbacks
  const positions: Record<
    string,
    { lat: number; lng: number; desc: string; source: string; sourceUrl: string; updated: string }
  > = {};

  for (const [hull, entry] of Object.entries(CARRIER_REGISTRY)) {
    positions[hull] = {
      lat: entry.fallbackLat,
      lng: entry.fallbackLng,
      desc: entry.fallbackDesc,
      source: "USNI News Fleet & Marine Tracker",
      sourceUrl: "https://news.usni.org/category/fleet-tracker",
      updated: now,
    };
  }

  // Step 2: overlay disk cache (may contain GDELT-sourced positions)
  const cache = loadCache();
  for (const [hull, cached] of Object.entries(cache)) {
    if (hull in positions && cached.source.startsWith("GDELT")) {
      positions[hull] = { ...positions[hull], ...cached };
    }
  }

  // Step 3: fresh GDELT fetch — catch all errors so fallbacks always serve
  try {
    const articles = await fetchGdeltCarrierNews();
    const newsUpdates = parsePositionsFromNews(articles);
    for (const [hull, update] of Object.entries(newsUpdates)) {
      if (hull in positions) {
        positions[hull] = { ...positions[hull], ...update };
      }
    }
    lastGdeltFetch = now;

    // Step 4: save updated cache atomically
    const cachePayload: Record<string, CacheEntry> = {};
    for (const [hull, pos] of Object.entries(positions)) {
      if (pos.source === "GDELT News API") {
        cachePayload[hull] = pos as CacheEntry;
      }
    }
    if (Object.keys(cachePayload).length > 0) {
      saveCache(cachePayload);
    }
  } catch (err) {
    // GDELT down or network failure — proceed with fallback + cached data
    console.warn("[carriers] GDELT fetch failed, using fallback/cache:", err);
  }

  // Step 5: convert to typed Carrier[] array
  const carriers: Carrier[] = Object.entries(positions).map(([hull, pos]) => {
    const entry = CARRIER_REGISTRY[hull];
    const status = classifyStatus(pos.lat, pos.lng, entry);
    return {
      hull,
      name: entry.name,
      lat: pos.lat,
      lng: pos.lng,
      status,
      desc: pos.desc,
      wiki: entry.wiki,
      source: pos.source,
      sourceUrl: pos.sourceUrl,
      lastUpdate: pos.updated,
      estimated: true,
    };
  });

  return { carriers, lastGdeltFetch };
}
