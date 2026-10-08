/**
 * lib/build.ts — question → answer + entity map (the Day-1 product core).
 *
 * Pipeline:
 *   1. searchQuestion: SerpApi `google` (answer + sources) + `google_news`
 *      (what's recent), merged and deduped to ~10 clean results.
 *   2. buildAnswer: Groq (free) turns results into strict JSON —
 *      3 answer points, entities in 5 groups, links, sources.
 *   3. Trust rating is computed IN CODE from source agreement, never by AI:
 *      4+ distinct sources = "Well supported", 2-3 = "Some support",
 *      0-1 = "Unsure".
 *   4. getBuild: question-keyed cache (7d TTL) — repeat questions return
 *      instantly without spending SerpApi quota.
 *
 * Honesty: every payload carries isLiveResearch:true and the engine names.
 * Nothing here invents facts — the LLM only reorganises retrieved results.
 */
import { cacheKey, getCache, setCache } from './cache';
import { groqJson } from './groq';
import { search, type SerpResult } from './serpapi';

export interface CleanResult {
  title: string;
  snippet: string;
  link: string;
  source: string;
  date?: string;
}

export interface AnswerPoint {
  point: string;
  sentence: string;
}

export type EntityGroup = 'Companies' | 'Models' | 'People' | 'Hardware' | 'Ideas';
export const ENTITY_GROUPS: readonly EntityGroup[] = [
  'Companies',
  'Models',
  'People',
  'Hardware',
  'Ideas',
];

export interface BuildEntity {
  name: string;
  group: EntityGroup;
  description: string;
}

export interface BuildLink {
  from: string;
  to: string;
  reason: string;
}

export interface BuildSource {
  name: string;
  link: string;
  date?: string;
}

export type TrustRating = 'Well supported' | 'Some support' | 'Unsure';

export interface BuildAnswer {
  question: string;
  answer: AnswerPoint[];
  entities: BuildEntity[];
  links: BuildLink[];
  sources: BuildSource[];
  trust: TrustRating;
  /** Distinct publisher domains behind the trust rating. */
  supportingSources: number;
  /** True when served from the question cache (instant, zero quota). */
  cached: boolean;
  /** Present when the shape degraded (e.g. AI summary unavailable). */
  note?: string;
  engines: string[];
  isLiveResearch: true;
}

const MAX_RESULTS = 10;
const MAX_QUESTION = 300;

function domainOf(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function toClean(r: SerpResult): CleanResult | null {
  if (!r.title || !r.link) return null;
  return {
    title: r.title,
    snippet: r.snippet || '',
    link: r.link,
    source: r.source || domainOf(r.link) || 'unknown',
    ...(r.date ? { date: r.date } : {}),
  };
}

/**
 * Step 2: two SerpApi calls, one question. google for the answer + sources,
 * google_news for what's recent. Returns ~10 clean, deduped results.
 * Throws SERPAPI_KEY_MISSING when the key is unset.
 */
export async function searchQuestion(question: string): Promise<{
  results: CleanResult[];
  fresh: boolean;
}> {
  const [web, news] = await Promise.all([search('google', question), search('google_news', question)]);
  const seen = new Set<string>();
  const merged: CleanResult[] = [];
  for (const r of [...web.results, ...news.results]) {
    const c = toClean(r);
    if (!c || seen.has(c.link)) continue;
    seen.add(c.link);
    merged.push(c);
    if (merged.length >= MAX_RESULTS) break;
  }
  return { results: merged, fresh: web.fresh || news.fresh };
}

/** Step 3 (code, not AI): trust from distinct-source agreement. */
export function trustFor(sources: Pick<BuildSource, 'name' | 'link'>[]): {
  trust: TrustRating;
  supportingSources: number;
} {
  const domains = new Set(
    sources.map((s) => domainOf(s.link) || s.name.toLowerCase()).filter(Boolean),
  );
  const n = domains.size;
  return {
    trust: n >= 4 ? 'Well supported' : n >= 2 ? 'Some support' : 'Unsure',
    supportingSources: n,
  };
}

const ANSWER_PROMPT = `You turn live search results into a tight research brief.
Given a question and web results (title, snippet, link, source, date), return ONLY valid JSON:
{
  "answer": [
    { "point": "<short headline>", "sentence": "<one supporting sentence>" },
    { "point": "<short headline>", "sentence": "<one supporting sentence>" },
    { "point": "<short headline>", "sentence": "<one supporting sentence>" }
  ],
  "entities": [
    { "name": "<entity>", "group": "<Companies|Models|People|Hardware|Ideas>", "description": "<one line>" }
  ],
  "links": [
    { "from": "<entity name>", "to": "<entity name>", "reason": "<why they connect, one line>" }
  ],
  "sources": [
    { "name": "<publisher>", "link": "<url>", "date": "<date or empty>" }
  ]
}
Rules:
- Exactly 3 answer points. Every claim must be traceable to a result snippet — never invent.
- 4-10 entities, each in exactly one of the five groups. No other group names.
- Links only between entities you listed; 3-8 links.
- Sources: every result you actually used (up to 10), publisher name + link + date.
- If the results are thin, say so in the points ("Sources are thin here") rather than padding.`;

function asRecord(v: unknown): Record<string, unknown> {
  return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {};
}

function str(v: unknown, max = 300): string {
  return typeof v === 'string' ? v.slice(0, max).trim() : '';
}

function cleanGroup(g: unknown): EntityGroup {
  return (ENTITY_GROUPS as readonly string[]).includes(typeof g === 'string' ? g : '')
    ? (g as EntityGroup)
    : 'Ideas';
}

/** Defensive normalisation of the LLM's JSON into the strict BuildAnswer shape. */
export function normalizeAnswer(question: string, raw: unknown, results: CleanResult[]): BuildAnswer {
  const rec = asRecord(raw);

  const answer: AnswerPoint[] = [];
  if (Array.isArray(rec.answer)) {
    for (const p of rec.answer.slice(0, 3)) {
      const pr = asRecord(p);
      const point = str(pr.point, 120);
      const sentence = str(pr.sentence, 400);
      if (point && sentence) answer.push({ point, sentence });
    }
  }

  const entities: BuildEntity[] = [];
  if (Array.isArray(rec.entities)) {
    for (const e of rec.entities.slice(0, 10)) {
      const er = asRecord(e);
      const name = str(er.name, 80);
      const description = str(er.description, 200);
      if (name && description) entities.push({ name, group: cleanGroup(er.group), description });
    }
  }
  const names = new Set(entities.map((e) => e.name.toLowerCase()));

  const links: BuildLink[] = [];
  if (Array.isArray(rec.links)) {
    for (const l of rec.links.slice(0, 8)) {
      const lr = asRecord(l);
      const from = str(lr.from, 80);
      const to = str(lr.to, 80);
      const reason = str(lr.reason, 200);
      if (from && to && reason && names.has(from.toLowerCase()) && names.has(to.toLowerCase())) {
        links.push({ from, to, reason });
      }
    }
  }

  // Sources: prefer the LLM's list, but every link must be a real result URL.
  const resultLinks = new Set(results.map((r) => r.link));
  const sources: BuildSource[] = [];
  if (Array.isArray(rec.sources)) {
    for (const s of rec.sources) {
      const sr = asRecord(s);
      const link = str(sr.link, 500);
      const name = str(sr.name, 120);
      if (link && name && resultLinks.has(link)) {
        const date = str(sr.date, 40);
        sources.push({ name, link, ...(date ? { date } : {}) });
      }
    }
  }
  // Fall back to the raw results when the LLM's source list is unusable.
  if (sources.length === 0) {
    for (const r of results) {
      sources.push({ name: r.source, link: r.link, ...(r.date ? { date: r.date } : {}) });
    }
  }

  const { trust, supportingSources } = trustFor(sources);
  return {
    question,
    answer,
    entities,
    links,
    sources,
    trust,
    supportingSources,
    cached: false,
    engines: ['google', 'google_news'],
    isLiveResearch: true,
  };
}

/** Clip at a word boundary so fallback text never ends mid-word. */
function clipAtWord(text: string, max: number): string {
  const t = text.trim().replace(/^[.…\s]+/, '');
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  const clipped = (lastSpace > max * 0.5 ? cut.slice(0, lastSpace) : cut).trim();
  return `${clipped}…`;
}

/** Extractive fallback when the LLM is unavailable: 3 points from top snippets. */
function extractiveFallback(question: string, results: CleanResult[]): BuildAnswer {
  const answer: AnswerPoint[] = [];
  for (const r of results.slice(0, 3)) {
    // Accumulate whole sentences (cap ~280 chars) so the fallback reads
    // like complete thoughts instead of trailing off mid-sentence.
    const sentences = r.snippet
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    let sentence = '';
    for (const s of sentences) {
      const next = `${sentence} ${s}`.trim();
      if (next.length > 280) break;
      sentence = next;
    }
    if (!sentence && sentences.length > 0) {
      sentence = clipAtWord(sentences[0], 280);
    }
    if (r.title && sentence) {
      answer.push({ point: clipAtWord(r.title, 120), sentence });
    }
  }
  const sources: BuildSource[] = results.map((r) => ({
    name: r.source,
    link: r.link,
    ...(r.date ? { date: r.date } : {}),
  }));
  const { trust, supportingSources } = trustFor(sources);
  return {
    question,
    answer,
    entities: [],
    links: [],
    sources,
    trust,
    supportingSources,
    cached: false,
    note: 'AI summary unavailable — showing the top sources directly.',
    engines: ['google', 'google_news'],
    isLiveResearch: true,
  };
}

function emptyAnswer(question: string, note: string): BuildAnswer {
  return {
    question,
    answer: [],
    entities: [],
    links: [],
    sources: [],
    trust: 'Unsure',
    supportingSources: 0,
    cached: false,
    note,
    engines: ['google', 'google_news'],
    isLiveResearch: true,
  };
}

/** Step 1 of the pipeline: sanitise the incoming question. */
export function sanitizeQuestion(q: unknown): string {
  return typeof q === 'string' ? q.replace(/[<>]/g, '').trim().slice(0, MAX_QUESTION) : '';
}

function cacheKeyFor(question: string): string {
  return cacheKey(`build|v1|${question.toLowerCase().trim()}`);
}

/**
 * Step 4: the full question → answer pipeline with a question-keyed cache.
 * Cache hits return in milliseconds with zero SerpApi spend.
 */
export async function getBuild(question: string): Promise<BuildAnswer> {
  const q = sanitizeQuestion(question);
  if (!q) {
    throw new Error('QUESTION_REQUIRED');
  }
  const key = cacheKeyFor(q);
  const hit = await getCache(key);
  if (hit && typeof hit === 'object') {
    return { ...(hit as BuildAnswer), cached: true };
  }

  const { results } = await searchQuestion(q);
  if (results.length === 0) {
    return emptyAnswer(q, "We couldn't find enough sources — try rewording the question.");
  }

  let built: BuildAnswer;
  try {
    const raw = await groqJson(
      ANSWER_PROMPT,
      `Question: ${q}\n\nResults:\n${results
        .map((r, i) => `${i + 1}. ${r.title} (${r.source}${r.date ? `, ${r.date}` : ''})\n${r.link}\n${r.snippet}`)
        .join('\n\n')}`,
      { temperature: 0.3, maxTokens: 2000 },
    );
    built = normalizeAnswer(q, raw, results);
  } catch {
    built = extractiveFallback(q, results);
  }

  await setCache(key, built);
  return built;
}
