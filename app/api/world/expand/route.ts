/**
 * POST /api/world/expand { nodeId }
 * Expand a node with live search (<=2 fresh SerpApi searches), capped per session.
 * Graceful degradation: missing keys -> cache-only graft, or an honest empty note.
 */
import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { cacheKey } from '@/lib/cache';
import { dedupeEdges, dedupeNodes } from '@/lib/dedupe';
import { peekCache, type SearchEngine, type SerpResult } from '@/lib/serpapi';
import type { World } from '@/lib/types';
import { extractEntities, type ExtractedEntity, type ExtractedRelation, type Extraction } from '@/lib/agents/explorer';
import { attachEvidence } from '@/lib/agents/evidence';
import { canExpand, recordExpansion } from '@/lib/agents/memory';
import { planExpansion } from '@/lib/agents/planner';
import { verifyRelations } from '@/lib/agents/relationship';
import { runSearchBundles, type QueryBundle, type TaggedSerpResult } from '@/lib/agents/search';
import { cacheExpansion, getCachedExpansion, toNodes } from '@/lib/agents/worldBuilder';

const ENGINE: SearchEngine = 'google';

interface Graft {
  addedNodes: World['nodes'];
  addedEdges: World['edges'];
}

async function loadWorld(): Promise<World | null> {
  try {
    return await getDb().getWorld();
  } catch {
    return null;
  }
}

function mergeExtractions(list: Extraction[]): { entities: ExtractedEntity[]; relations: ExtractedRelation[] } {
  const entities: ExtractedEntity[] = [];
  const relations: ExtractedRelation[] = [];
  for (const e of list) {
    entities.push(...e.entities);
    relations.push(...e.relations);
  }
  return { entities, relations };
}

function buildGraft(world: World, extraction: Extraction, results: SerpResult[]): Graft {
  const verified = verifyRelations(extraction.relations, extraction.entities);
  const edges = attachEvidence(verified, results);
  const addedNodes = dedupeNodes(world.nodes, toNodes(extraction.entities, results));
  const addedEdges = dedupeEdges(world.edges, edges);
  return { addedNodes, addedEdges };
}

/** Degraded path (SerpApi and/or Groq key missing): build a graft from cache only. */
async function cacheOnlyGraft(world: World, queries: string[]): Promise<Graft | null> {
  const tagged: TaggedSerpResult[] = [];
  const cachedExtractions: Extraction[] = [];
  for (const query of queries) {
    const hit = await peekCache(ENGINE, query);
    if (hit) {
      tagged.push(...hit.map((r) => ({ ...r, engine: ENGINE })));
    }
    const cached = await getCachedExpansion(query, ENGINE);
    if (cached) {
      cachedExtractions.push(cached);
    }
  }
  if (tagged.length === 0 && cachedExtractions.length === 0) {
    return null;
  }
  if (cachedExtractions.length > 0) {
    return buildGraft(world, mergeExtractions(cachedExtractions), tagged);
  }
  // SerpApi cache hits exist and Groq is available: extract live from cached results.
  if (process.env.GROQ_API_KEY && tagged.length > 0) {
    const extraction = await extractEntities(tagged, world.meta.topic);
    return buildGraft(world, extraction, tagged);
  }
  return null;
}

function logExpand(ms: number, fresh: number, queryHashes: string[]): void {
  console.log(JSON.stringify({ route: 'expand', ms, serpapiFresh: fresh, queries: queryHashes }));
}

export async function POST(req: Request): Promise<NextResponse> {
  const started = Date.now();
  const queryHashes: string[] = [];
  try {
    const body = (await req.json().catch(() => ({}))) as { nodeId?: unknown };
    const nodeId = typeof body.nodeId === 'string' ? body.nodeId : '';

    const world = await loadWorld();
    if (!world) {
      logExpand(Date.now() - started, 0, queryHashes);
      return NextResponse.json({ error: 'world not built yet' }, { status: 500 });
    }
    const node = world.nodes.find((n) => n.id === nodeId);
    if (!node) {
      logExpand(Date.now() - started, 0, queryHashes);
      return NextResponse.json({ error: 'unknown node' }, { status: 404 });
    }

    let sessionId = req.headers.get('x-session-id') ?? '';
    if (!sessionId) {
      sessionId = randomUUID();
    }

    if (!canExpand(sessionId)) {
      logExpand(Date.now() - started, 0, queryHashes);
      return NextResponse.json(
        { error: 'expansion budget exhausted', cached: true, sessionId },
        { status: 429 }
      );
    }

    const queries = planExpansion(node);
    queryHashes.push(...queries.map((q) => cacheKey(q).slice(0, 12)));

    const hasSerp = Boolean(process.env.SERPAPI_API_KEY);
    const hasGroq = Boolean(process.env.GROQ_API_KEY);

    // --- Degraded: cache-only ---
    if (!hasSerp || !hasGroq) {
      const graft = await cacheOnlyGraft(world, queries);
      logExpand(Date.now() - started, 0, queryHashes);
      if (graft) {
        return NextResponse.json({ ...graft, searchesUsed: 0, cached: true, sessionId });
      }
      return NextResponse.json({
        addedNodes: [],
        addedEdges: [],
        note: 'Live expansion unavailable — showing cached universe.',
        cached: true,
        sessionId,
      });
    }

    // --- Live path ---
    const bundles: QueryBundle[] = await runSearchBundles(queries, ENGINE);
    const freshCount = bundles.filter((b) => b.fresh).length;
    if (freshCount > 0) {
      recordExpansion(sessionId, freshCount);
    }

    const tagged = bundles.flatMap((b) => b.results);
    const extractions: Extraction[] = [];
    for (const b of bundles) {
      if (b.results.length === 0) {
        continue;
      }
      const extraction = await extractEntities(b.results, world.meta.topic);
      await cacheExpansion(b.query, b.engine, extraction);
      extractions.push(extraction);
    }

    logExpand(Date.now() - started, freshCount, queryHashes);

    if (extractions.length === 0) {
      return NextResponse.json({
        addedNodes: [],
        addedEdges: [],
        note: 'no further entities found',
        searchesUsed: freshCount,
        cached: freshCount === 0,
        sessionId,
      });
    }

    const graft = buildGraft(world, mergeExtractions(extractions), tagged);
    return NextResponse.json({
      ...graft,
      searchesUsed: freshCount,
      cached: freshCount === 0,
      sessionId,
    });
  } catch {
    logExpand(Date.now() - started, 0, queryHashes);
    return NextResponse.json({ error: 'expansion failed' }, { status: 500 });
  }
}
