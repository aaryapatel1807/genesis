import { NextResponse } from 'next/server';

/**
 * GET /api/trending — "What the world is asking today".
 *
 * Per the Day-2 cut order this uses Google News (SerpApi `google_news`
 * engine) instead of a Google Trends strip. One live call returns the top
 * stories; each card links into the /answer flow with the story as the
 * question. Results are cached for 45 minutes (memory only — the file
 * cache's 7-day TTL is wrong for trending data).
 *
 * Without a SerpApi key (or on failure) it returns six evergreen example
 * questions marked `fallback: true` so the landing never looks broken.
 */

export interface TrendingItem {
  title: string;
  source: string;
  link: string | null;
  date: string | null;
  /** The question the card asks when tapped. */
  query: string;
}

const TREND_TTL_MS = 45 * 60 * 1000;

let mem: { v: TrendingItem[]; exp: number } | null = null;

const FALLBACK: TrendingItem[] = [
  { title: 'Is AI taking jobs?', source: 'Example', link: null, date: null, query: 'Is AI taking jobs?' },
  { title: 'Who makes the AI chips?', source: 'Example', link: null, date: null, query: 'Who makes the AI chips?' },
  { title: 'Which AI tools are most used?', source: 'Example', link: null, date: null, query: 'Which AI tools are most used?' },
  { title: 'What is new with AI agents?', source: 'Example', link: null, date: null, query: 'What is new with AI agents?' },
  { title: 'How is the AI industry changing this year?', source: 'Example', link: null, date: null, query: 'How is the AI industry changing this year?' },
  { title: 'Which companies lead in AI research?', source: 'Example', link: null, date: null, query: 'Which companies lead in AI research?' },
];

function fallback(cached: boolean): NextResponse {
  return NextResponse.json(
    { items: FALLBACK, fallback: true, cached, updatedAt: new Date().toISOString() },
    { headers: { 'Cache-Control': 'public, s-maxage=60' } },
  );
}

export async function GET(): Promise<NextResponse> {
  if (mem && Date.now() < mem.exp) {
    return NextResponse.json(
      { items: mem.v, fallback: false, cached: true, updatedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': 'public, s-maxage=60' } },
    );
  }

  const apiKey = process.env.SERPAPI_API_KEY ?? process.env.SERPAPI_KEY ?? '';
  if (!apiKey) {
    return fallback(false);
  }

  try {
    const mod = (await import('serpapi')) as unknown as {
      getJson: (params: Record<string, string | number>) => Promise<Record<string, unknown>>;
    };
    const json = await mod.getJson({
      engine: 'google_news',
      q: 'world news',
      gl: 'us',
      hl: 'en',
      api_key: apiKey,
    });
    const stories = Array.isArray(json['news_results']) ? json['news_results'] : [];
    const seen = new Set<string>();
    const items: TrendingItem[] = [];
    for (const s of stories) {
      if (items.length >= 6 || typeof s !== 'object' || s === null) continue;
      const r = s as Record<string, unknown>;
      const title = typeof r['title'] === 'string' ? r['title'].trim() : '';
      if (!title || seen.has(title.toLowerCase())) continue;
      seen.add(title.toLowerCase());
      const src = r['source'];
      const source =
        typeof src === 'object' && src !== null && typeof (src as Record<string, unknown>)['name'] === 'string'
          ? ((src as Record<string, unknown>)['name'] as string)
          : 'News';
      items.push({
        title,
        source,
        link: typeof r['link'] === 'string' ? (r['link'] as string) : null,
        date: typeof r['date'] === 'string' ? (r['date'] as string) : null,
        query: title,
      });
    }
    if (items.length === 0) {
      return fallback(false);
    }
    mem = { v: items, exp: Date.now() + TREND_TTL_MS };
    return NextResponse.json(
      { items, fallback: false, cached: false, updatedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': 'public, s-maxage=60' } },
    );
  } catch {
    return fallback(false);
  }
}
