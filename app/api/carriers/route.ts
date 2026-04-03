import { NextResponse } from "next/server";
import { getCarrierPositions } from "@/lib/carriers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// In-memory cache: 1h TTL — GDELT data is stale within minutes anyway.
// The carriers lib also maintains a disk cache so cold starts are fast.
let cachedData: Awaited<ReturnType<typeof getCarrierPositions>> | null = null;
let cacheExpiry = 0;

export async function GET() {
  const now = Date.now();
  if (cachedData && now < cacheExpiry) {
    return NextResponse.json({ ...cachedData, cached: true });
  }
  try {
    const data = await getCarrierPositions();
    cachedData = data;
    cacheExpiry = now + 60 * 60 * 1000; // 1 hour
    return NextResponse.json({ ...data, cached: false });
  } catch (err) {
    if (cachedData) {
      return NextResponse.json({ ...cachedData, cached: true, stale: true });
    }
    return NextResponse.json(
      { carriers: [], cached: false, error: String(err) },
      { status: 502 }
    );
  }
}
