/**
 * AIS vessel data — reads from the shared ais-data.json file
 * written by the hormuztracker collector process every 3 seconds.
 */

import { readFileSync } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_FILE = process.env.AIS_DATA_PATH
  ?? path.join(process.cwd(), "..", "hormuztracker", "ais-data.json");

export async function GET() {
  try {
    const raw = readFileSync(DATA_FILE, "utf-8");
    const data = JSON.parse(raw);
    return Response.json(data, {
      headers: { "Cache-Control": "no-cache, no-store" },
    });
  } catch {
    return Response.json(
      { connected: false, count: 0, vessels: [], error: "Collector not running" },
      { headers: { "Cache-Control": "no-cache" } }
    );
  }
}
