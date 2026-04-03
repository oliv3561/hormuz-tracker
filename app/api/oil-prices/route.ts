/**
 * Oil price data from EIA (spot prices) + FRED (historical series).
 * Returns Brent and WTI for last 90 days. Cache: 1 hour.
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EIA_KEY = process.env.EIA_API_KEY ?? "";
const FRED_KEY = process.env.FRED_API_KEY ?? "";

export interface PricePoint {
  date: string;
  brent: number | null;
  wti: number | null;
}

let cachedData: PricePoint[] | null = null;
let cacheExpiry = 0;

async function fetchEIABrentWTI(): Promise<Map<string, { brent?: number; wti?: number }>> {
  const url =
    `https://api.eia.gov/v2/petroleum/pri/spt/data/?api_key=${EIA_KEY}` +
    `&frequency=daily&data[0]=value` +
    `&facets[product][]=EPCBRENT&facets[product][]=EPCWTI` +
    `&sort[0][column]=period&sort[0][direction]=desc&length=90`;

  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`EIA returned ${res.status}`);
  const json = await res.json();

  const map = new Map<string, { brent?: number; wti?: number }>();
  const rows: Array<{ period: string; product: string; value: string }> =
    json.response?.data ?? [];

  for (const row of rows) {
    const date = row.period.slice(0, 10);
    const val = parseFloat(row.value);
    if (isNaN(val)) continue;
    const entry = map.get(date) ?? {};
    if (row.product === "EPCBRENT") entry.brent = val;
    if (row.product === "EPCWTI") entry.wti = val;
    map.set(date, entry);
  }
  return map;
}

async function fetchFREDSeries(seriesId: string): Promise<Map<string, number>> {
  const url =
    `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}` +
    `&api_key=${FRED_KEY}&file_type=json&sort_order=desc&limit=90`;

  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`FRED ${seriesId} returned ${res.status}`);
  const json = await res.json();

  const map = new Map<string, number>();
  const obs: Array<{ date: string; value: string }> = json.observations ?? [];
  for (const o of obs) {
    const val = parseFloat(o.value);
    if (!isNaN(val) && o.value !== ".") map.set(o.date, val);
  }
  return map;
}

async function buildPriceSeries(): Promise<PricePoint[]> {
  const [eiaOil, fredBrent, fredWTI] = await Promise.allSettled([
    fetchEIABrentWTI(),
    fetchFREDSeries("DCOILBRENTEU"),
    fetchFREDSeries("DCOILWTICO"),
  ]);

  const oilMap =
    eiaOil.status === "fulfilled" ? eiaOil.value : new Map<string, { brent?: number; wti?: number }>();
  const fredBrentMap =
    fredBrent.status === "fulfilled" ? fredBrent.value : new Map<string, number>();
  const fredWTIMap =
    fredWTI.status === "fulfilled" ? fredWTI.value : new Map<string, number>();

  const dateSet = new Set<string>([
    ...oilMap.keys(),
    ...fredBrentMap.keys(),
    ...fredWTIMap.keys(),
  ]);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const points: PricePoint[] = [];
  for (const date of dateSet) {
    if (date < cutoffStr) continue;
    const oilEntry = oilMap.get(date) ?? {};
    points.push({
      date,
      brent: oilEntry.brent ?? fredBrentMap.get(date) ?? null,
      wti: oilEntry.wti ?? fredWTIMap.get(date) ?? null,
    });
  }

  points.sort((a, b) => a.date.localeCompare(b.date));
  return points;
}

export async function GET() {
  const now = Date.now();

  if (cachedData && now < cacheExpiry) {
    return NextResponse.json({ data: cachedData, cached: true });
  }

  try {
    const data = await buildPriceSeries();
    cachedData = data;
    cacheExpiry = now + 60 * 60 * 1000;
    return NextResponse.json({ data, cached: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (cachedData) {
      return NextResponse.json({ data: cachedData, cached: true, stale: true });
    }
    return NextResponse.json({ error: message, data: [] }, { status: 502 });
  }
}
