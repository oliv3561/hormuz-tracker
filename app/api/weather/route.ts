/**
 * Open-Meteo weather forecast for Strait of Hormuz (26.5N, 56.0E).
 * Returns 7-day daily summaries. Cache: 1 hour.
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPEN_METEO_URL =
  "https://api.open-meteo.com/v1/forecast" +
  "?latitude=26.5&longitude=56.0" +
  "&hourly=temperature_2m,windspeed_10m,windgusts_10m,precipitation" +
  "&forecast_days=7&timezone=Asia%2FDubai";

export interface DayWeather {
  date: string;
  tempMax: number;
  tempMin: number;
  windMax: number;
  gustMax: number;
  precip: number;
  windWarning: boolean;
}

let cachedData: DayWeather[] | null = null;
let cacheExpiry = 0;

async function fetchWeather(): Promise<DayWeather[]> {
  const res = await fetch(OPEN_METEO_URL, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Open-Meteo returned ${res.status}`);
  const json = await res.json();

  const times: string[] = json.hourly?.time ?? [];
  const temps: number[] = json.hourly?.temperature_2m ?? [];
  const winds: number[] = json.hourly?.windspeed_10m ?? [];
  const gusts: number[] = json.hourly?.windgusts_10m ?? [];
  const precips: number[] = json.hourly?.precipitation ?? [];

  const byDate = new Map<string, {
    temps: number[];
    winds: number[];
    gusts: number[];
    precips: number[];
  }>();

  for (let i = 0; i < times.length; i++) {
    const date = times[i].slice(0, 10);
    if (!byDate.has(date)) {
      byDate.set(date, { temps: [], winds: [], gusts: [], precips: [] });
    }
    const d = byDate.get(date)!;
    if (temps[i] != null) d.temps.push(temps[i]);
    if (winds[i] != null) d.winds.push(winds[i]);
    if (gusts[i] != null) d.gusts.push(gusts[i]);
    if (precips[i] != null) d.precips.push(precips[i]);
  }

  const days: DayWeather[] = [];
  for (const [date, d] of byDate.entries()) {
    const gustMax = d.gusts.length ? Math.max(...d.gusts) : 0;
    days.push({
      date,
      tempMax: d.temps.length ? Math.max(...d.temps) : 0,
      tempMin: d.temps.length ? Math.min(...d.temps) : 0,
      windMax: d.winds.length ? Math.max(...d.winds) : 0,
      gustMax,
      precip: d.precips.reduce((s, v) => s + v, 0),
      windWarning: gustMax > 40,
    });
  }

  days.sort((a, b) => a.date.localeCompare(b.date));
  return days;
}

export async function GET() {
  const now = Date.now();

  if (cachedData && now < cacheExpiry) {
    return NextResponse.json({ data: cachedData, cached: true });
  }

  try {
    const data = await fetchWeather();
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
