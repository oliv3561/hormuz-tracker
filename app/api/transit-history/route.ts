/**
 * IMF PortWatch daily transit data for Strait of Hormuz.
 * Returns last 90 days of vessel counts. Cache: 1 hour.
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PORTWATCH_URL =
  "https://services9.arcgis.com/weJ1QsnbMYJlCHdG/ArcGIS/rest/services/Daily_Chokepoints_Data/FeatureServer/0/query";

export interface TransitDay {
  date: string;
  total: number;
  tanker: number;
  container: number;
  dry_bulk: number;
  cargo: number;
  capacity_tanker: number;
  capacity_total: number;
}

let cachedData: TransitDay[] | null = null;
let cacheExpiry = 0;

async function fetchPortWatch(): Promise<TransitDay[]> {
  const params = new URLSearchParams({
    where: "portname='Strait of Hormuz'",
    outFields: "date,n_tanker,n_total,n_container,n_dry_bulk,n_cargo,capacity_tanker,capacity",
    orderByFields: "date DESC",
    resultRecordCount: "90",
    f: "json",
  });

  const res = await fetch(`${PORTWATCH_URL}?${params}`, {
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error(`PortWatch API returned ${res.status}`);

  const json = await res.json();
  const features: Array<{ attributes: Record<string, unknown> }> = json.features ?? [];

  const days: TransitDay[] = features
    .map((f) => {
      const a = f.attributes;
      const rawDate = a.date;
      let dateStr = "";
      if (typeof rawDate === "number") {
        dateStr = new Date(rawDate).toISOString().slice(0, 10);
      } else if (typeof rawDate === "string") {
        dateStr = rawDate.slice(0, 10);
      }
      return {
        date: dateStr,
        total: Number(a.n_total ?? 0),
        tanker: Number(a.n_tanker ?? 0),
        container: Number(a.n_container ?? 0),
        dry_bulk: Number(a.n_dry_bulk ?? 0),
        cargo: Number(a.n_cargo ?? 0),
        capacity_tanker: Number(a.capacity_tanker ?? 0),
        capacity_total: Number(a.capacity ?? 0),
      };
    })
    .filter((d) => d.date !== "")
    .sort((a, b) => a.date.localeCompare(b.date));

  return days;
}

export async function GET() {
  const now = Date.now();

  if (cachedData && now < cacheExpiry) {
    return NextResponse.json({ data: cachedData, cached: true });
  }

  try {
    const data = await fetchPortWatch();
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
