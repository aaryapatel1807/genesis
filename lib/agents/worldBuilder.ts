/**
 * lib/agents/worldBuilder.ts — orchestrates explorer -> verifier -> evidence ->
 * dedupe -> score into GNode/GEdge objects. Used by scripts/build-world.ts and
 * (via toNodes) by the /api/world/expand route.
 *
 * Also owns the per-query "expansion cache" (query -> extracted entities, 7d):
 * populated on live expansion, read by the cache-only degraded path.
 */
import { cacheKey, getCache, setCache } from '../cache';
import { dedupeEdges, dedupeNodes, normalizeName } from '../dedupe';
import { influenceFor, scoreNode } from '../score';
import type { SearchEngine, SerpResult } from '../serpapi';
import type { GEdge, GNode } from '../types';
import { extractEntities, type ExtractedEntity, type Extraction } from './explorer';
import { attachEvidence, nodeIdFor } from './evidence';
import { verifyRelations } from './relationship';

export interface QueryResults {
  query: string;
  engine: SearchEngine;
  results: SerpResult[];
}

function domainOf(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function resultsFor(name: string, results: SerpResult[]): SerpResult[] {
  const norm = normalizeName(name);
  return results.filter((r) => norm.length > 0 && normalizeName(`${r.title} ${r.snippet}`).includes(norm));
}

function newestDateOf(results: SerpResult[]): string {
  const dates = results
    .map((r) => r.date)
    .filter((d): d is string => typeof d === 'string' && d.length > 0);
  if (dates.length === 0) {
    return 'unknown';
  }
  return dates.sort().reverse()[0];
}

/** Build scored GNodes for new entities (ids `n_<slug>`, first_seen = this year). */
export function toNodes(entities: ExtractedEntity[], results: SerpResult[]): GNode[] {
  const year = String(new Date().getFullYear());
  return entities.map((e) => {
    const hits = resultsFor(e.name, results);
    const domains = new Set(hits.map((h) => domainOf(h.link)).filter(Boolean));
    const sources = hits.length === 0 ? 0 : Math.max(1, domains.size);
    return {
      id: nodeIdFor(e.name),
      name: e.name,
      type: e.type,
      description: e.description,
      influence: influenceFor(e.type, sources),
      reality: scoreNode(sources, newestDateOf(hits)),
      first_seen: year,
    };
  });
}

/** Full pipeline for a set of per-query result bundles: extract, verify, evidence, dedupe, score. */
export async function buildWorldFromResults(
  topic: string,
  bundles: QueryResults[]
): Promise<{ nodes: GNode[]; edges: GEdge[] }> {
  const allResults = bundles.flatMap((b) => b.results);
  const extraction = await extractEntities(allResults, topic);
  const verified = verifyRelations(extraction.relations, extraction.entities);
  const edges = attachEvidence(verified, allResults);
  const nodes = toNodes(extraction.entities, allResults);
  return {
    nodes: dedupeNodes([], nodes),
    edges: dedupeEdges([], edges),
  };
}

// --- Expansion cache: query -> extracted entities (7d TTL, via lib/cache) ---

function expansionKey(query: string, engine: SearchEngine): string {
  return cacheKey(`expansion|${engine}|${query}`);
}

export async function cacheExpansion(
  query: string,
  engine: SearchEngine,
  extraction: Extraction
): Promise<void> {
  await setCache(expansionKey(query, engine), extraction);
}

export async function getCachedExpansion(
  query: string,
  engine: SearchEngine
): Promise<Extraction | null> {
  const v = await getCache(expansionKey(query, engine));
  if (typeof v !== 'object' || v === null) {
    return null;
  }
  const rec = v as Record<string, unknown>;
  if (!Array.isArray(rec.entities) || !Array.isArray(rec.relations)) {
    return null;
  }
  return v as Extraction;
}
