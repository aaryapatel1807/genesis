/**
 * lib/serpapi.ts — the ONLY SerpApi access point in the codebase.
 *
 * - Throws `SERPAPI_KEY_MISSING` when SERPAPI_API_KEY is unset (callers degrade).
 * - Cache-first: key = sha256(`serpapi|<engine>|<query>`); hits return fresh:false.
 * - Misses go live (1/sec throttle for the free plan), are cached, and append one
 *   line to data/credit-ledger.json (best effort).
 * - No key is ever logged.
 */
import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { cacheKey, getCache, setCache } from './cache';

export type SearchEngine = 'google' | 'google_news' | 'google_scholar' | 'google_jobs';

export interface SerpResult {
  title: string;
  snippet: string;
  link: string;
  /** Publisher name (organic `source`, news `source.name`). */
  source?: string;
  date?: string;
}

interface SerpapiModule {
  getJson(params: Record<string, string | number>): Promise<Record<string, unknown>>;
}

interface LedgerEntry {
  at: string;
  engine: SearchEngine;
  query_hash: string;
  cached: boolean;
}

// Free-plan courtesy throttle: max 1 live call per 1.1s, module-wide.
let lastCallAt = 0;
async function throttle(): Promise<void> {
  const wait = 1100 - (Date.now() - lastCallAt);
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  lastCallAt = Date.now();
}

function keyFor(engine: SearchEngine, query: string): string {
  return cacheKey(`serpapi|${engine}|${query}`);
}

/** Read the raw-result cache without spending a credit. Null on miss/expiry. */
export async function peekCache(engine: SearchEngine, query: string): Promise<SerpResult[] | null> {
  const v = await getCache(keyFor(engine, query));
  return Array.isArray(v) ? (v as SerpResult[]) : null;
}

interface RawResult {
  title?: unknown;
  snippet?: unknown;
  link?: unknown;
  /** Organic results: string. News results: { name: string }. */
  source?: unknown;
  date?: unknown;
}

function toSerpResult(r: RawResult): SerpResult {
  const title = typeof r.title === 'string' ? r.title : '';
  const snippet = typeof r.snippet === 'string' ? r.snippet : '';
  const link = typeof r.link === 'string' ? r.link : '';
  const out: SerpResult = { title, snippet, link };
  const src = r.source;
  const sourceName =
    typeof src === 'string'
      ? src
      : typeof src === 'object' && src !== null && typeof (src as Record<string, unknown>).name === 'string'
        ? ((src as Record<string, unknown>).name as string)
        : '';
  if (sourceName.length > 0) {
    out.source = sourceName;
  }
  if (typeof r.date === 'string' && r.date.length > 0) {
    out.date = r.date;
  }
  return out;
}

function extractResults(json: Record<string, unknown>): SerpResult[] {
  const lists: unknown[] = [];
  for (const k of ['organic_results', 'news_results', 'jobs_results']) {
    const v = json[k];
    if (Array.isArray(v)) {
      lists.push(...v);
    }
  }
  return lists.slice(0, 10).map((r) => toSerpResult((r ?? {}) as RawResult));
}

async function appendLedger(entry: LedgerEntry): Promise<void> {
  try {
    const dir = join(process.cwd(), 'data');
    await mkdir(dir, { recursive: true });
    await appendFile(join(dir, 'credit-ledger.json'), JSON.stringify(entry) + '\n', 'utf-8');
  } catch {
    // best effort
  }
}

export async function search(
  engine: SearchEngine,
  query: string
): Promise<{ results: SerpResult[]; fresh: boolean }> {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    throw new Error('SERPAPI_KEY_MISSING');
  }
  const key = keyFor(engine, query);
  const hit = await peekCache(engine, query);
  if (hit) {
    return { results: hit, fresh: false };
  }
  await throttle();
  const mod = (await import('serpapi')) as unknown as SerpapiModule;
  const json = await mod.getJson({ engine, q: query, num: 10, gl: 'us', hl: 'en', api_key: apiKey });
  const results = extractResults(json);
  await setCache(key, results);
  await appendLedger({ at: new Date().toISOString(), engine, query_hash: key, cached: false });
  return { results, fresh: true };
}
