/**
 * Breaking news — Google News RSS for Hormuz-related headlines.
 * Parsed with regex, no external XML library. Cache: 5 minutes.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface NewsItem {
  title: string;
  link: string;
  date: string;
  source: string;
}

const RSS_URL =
  "https://news.google.com/rss/search?q=%22strait+of+hormuz%22+OR+%22hormuz+blockade%22+OR+%22persian+gulf+crisis%22&hl=en-US&gl=US&ceid=US:en";

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_ITEMS = 15;

let cachedItems: NewsItem[] = [];
let cacheExpiresAt = 0;

function stripCdata(s: string): string {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}

function parseRSS(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const rawTitle = block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "";
    const rawLink = block.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "";
    const rawDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? "";
    const rawSource = block.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] ?? "";

    const title = stripCdata(rawTitle);
    const link = stripCdata(rawLink).trim();
    const date = rawDate.trim();
    const source = stripCdata(rawSource);

    if (title && link) {
      items.push({ title, link, date, source });
    }
  }

  return items.slice(0, MAX_ITEMS);
}

export async function GET() {
  const now = Date.now();

  if (now < cacheExpiresAt && cachedItems.length > 0) {
    return Response.json(
      { data: cachedItems, cached: true },
      { headers: { "Cache-Control": "public, max-age=300" } }
    );
  }

  try {
    const res = await fetch(RSS_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; HormuzTracker/2.0)" },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`);

    const xml = await res.text();
    const items = parseRSS(xml);

    cachedItems = items;
    cacheExpiresAt = now + CACHE_TTL_MS;

    return Response.json(
      { data: items, cached: false },
      { headers: { "Cache-Control": "public, max-age=300" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (cachedItems.length > 0) {
      return Response.json(
        { data: cachedItems, cached: true, stale: true },
        { headers: { "Cache-Control": "no-store" } }
      );
    }
    return Response.json(
      { data: [], error: msg },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}
