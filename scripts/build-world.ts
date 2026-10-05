/**
 * scripts/build-world.ts — Genesis entity pipeline CLI (run manually, human-supervised).
 *
 * STAGE 1: seed queries (SearchPipeline.md, ~12 across google/news/scholar/jobs)
 * STAGE 2: serpapi.search each (exits with a message if SERPAPI_API_KEY is missing)
 * STAGE 3: worldBuilder.buildWorldFromResults (extract -> verify -> evidence -> dedupe -> score)
 * STAGE 4: write data/world.json
 * STAGE 5: derive per-year snapshots (first_seen <= year) into data/snapshots/<year>.json
 *
 * Logs one JSON line per stage event to data/build-log.jsonl AND stdout.
 * Usage: npx tsx scripts/build-world.ts
 */
import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { cacheKey } from '../lib/cache';
import { search, type SearchEngine } from '../lib/serpapi';
import { buildWorldFromResults, type QueryResults } from '../lib/agents/worldBuilder';
import type { World } from '../lib/types';

const TOPIC = 'AI ecosystem';
const SNAPSHOT_YEARS = ['2020', '2022', '2024', '2026'];

const SEED_QUERIES: { engine: SearchEngine; query: string }[] = [
  // companies & products
  { engine: 'google', query: 'top artificial intelligence companies 2026' },
  { engine: 'google', query: 'largest AI labs and startups 2026' },
  { engine: 'google', query: 'most popular AI products 2026' },
  // people & institutions
  { engine: 'google', query: 'leading AI researchers 2026' },
  { engine: 'google', query: 'top universities AI research 2026' },
  // money & news
  { engine: 'google', query: 'AI startup funding rounds 2026' },
  { engine: 'google_news', query: 'artificial intelligence news' },
  { engine: 'google_news', query: 'AI industry developments' },
  // research (scholar)
  { engine: 'google_scholar', query: 'large language models' },
  { engine: 'google_scholar', query: 'diffusion models research' },
  // hiring (jobs)
  { engine: 'google_jobs', query: 'machine learning engineer' },
  { engine: 'google_jobs', query: 'AI researcher jobs' },
];

function domainOf(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

async function logLine(entry: Record<string, unknown>): Promise<void> {
  const line = JSON.stringify(entry);
  console.log(line);
  try {
    const dir = join(process.cwd(), 'data');
    await mkdir(dir, { recursive: true });
    await appendFile(join(dir, 'build-log.jsonl'), line + '\n', 'utf-8');
  } catch {
    // best effort
  }
}

async function main(): Promise<void> {
  // STAGE 1 — seed queries
  await logLine({ stage: 1, event: 'seed_queries', count: SEED_QUERIES.length });

  // STAGE 2 — search each (respect missing key: exit with a message)
  const bundles: QueryResults[] = [];
  let freshCount = 0;
  for (const { engine, query } of SEED_QUERIES) {
    const queryHash = cacheKey(query).slice(0, 16);
    try {
      const { results, fresh } = await search(engine, query);
      if (fresh) {
        freshCount += 1;
      }
      bundles.push({ query, engine, results });
      await logLine({
        stage: 2,
        event: 'search',
        engine,
        query_hash: queryHash,
        result_count: results.length,
        fresh,
      });
    } catch (err) {
      if (err instanceof Error && err.message === 'SERPAPI_KEY_MISSING') {
        console.error('SERPAPI_API_KEY is not set. Add it to .env (see .env.example) and retry.');
        process.exit(1);
      }
      await logLine({
        stage: 2,
        event: 'search_error',
        engine,
        query_hash: queryHash,
        error: err instanceof Error ? err.message : 'unknown',
      });
    }
  }
  await logLine({ stage: 2, event: 'search_done', queries: SEED_QUERIES.length, serpapi_fresh: freshCount });

  // STAGE 3 — extract -> verify -> evidence -> dedupe -> score
  let world: World;
  try {
    const { nodes, edges } = await buildWorldFromResults(TOPIC, bundles);
    if (nodes.length === 0) {
      await logLine({ stage: 3, event: 'empty_world', error: 'no entities extracted' });
      console.error('Build failed: extraction produced zero entities.');
      process.exit(1);
    }
    const allResults = bundles.flatMap((b) => b.results);
    const sourceCount = new Set(allResults.map((r) => domainOf(r.link)).filter(Boolean)).size;
    world = {
      meta: {
        topic: TOPIC,
        built_at: new Date().toISOString(),
        node_count: nodes.length,
        edge_count: edges.length,
        source_count: sourceCount,
      },
      nodes,
      edges,
    };
    await logLine({
      stage: 3,
      event: 'world_built',
      nodes: nodes.length,
      edges: edges.length,
      sources: sourceCount,
      serpapi_fresh: freshCount,
    });
  } catch (err) {
    await logLine({
      stage: 3,
      event: 'build_error',
      error: err instanceof Error ? err.message : 'unknown',
    });
    console.error('Build failed at extraction:', err instanceof Error ? err.message : err);
    process.exit(1);
  }

  // STAGE 4 — write data/world.json
  await mkdir(join(process.cwd(), 'data'), { recursive: true });
  await writeFile(join(process.cwd(), 'data', 'world.json'), JSON.stringify(world, null, 2), 'utf-8');
  await logLine({ stage: 4, event: 'world_written', path: 'data/world.json' });

  // STAGE 5 — per-year snapshots: nodes with first_seen <= year + edges whose endpoints exist
  await mkdir(join(process.cwd(), 'data', 'snapshots'), { recursive: true });
  for (const year of SNAPSHOT_YEARS) {
    const snapNodes = world.nodes.filter((n) => n.first_seen <= year);
    const ids = new Set(snapNodes.map((n) => n.id));
    const snapEdges = world.edges.filter((e) => ids.has(e.source) && ids.has(e.target));
    const snapshot: World = {
      meta: {
        ...world.meta,
        snapshot_year: year,
        node_count: snapNodes.length,
        edge_count: snapEdges.length,
      },
      nodes: snapNodes,
      edges: snapEdges,
    };
    await writeFile(
      join(process.cwd(), 'data', 'snapshots', `${year}.json`),
      JSON.stringify(snapshot, null, 2),
      'utf-8'
    );
    await logLine({ stage: 5, event: 'snapshot_written', year, nodes: snapNodes.length, edges: snapEdges.length });
  }

  await logLine({ stage: 5, event: 'build_complete' });
}

main().catch((err) => {
  console.error('Fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
