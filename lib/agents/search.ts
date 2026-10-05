/**
 * lib/agents/search.ts — wraps lib/serpapi for the pipeline.
 * runSearchBundles preserves per-query freshness + engine tags;
 * runSearches is the plain concatenated view (capped at 20 results total).
 */
import { search, type SearchEngine, type SerpResult } from '../serpapi';

export interface TaggedSerpResult extends SerpResult {
  engine: SearchEngine;
}

export interface QueryBundle {
  query: string;
  engine: SearchEngine;
  results: TaggedSerpResult[];
  fresh: boolean;
}

const MAX_QUERIES = 2;
const MAX_RESULTS = 20;

export async function runSearchBundles(
  queries: string[],
  engine: SearchEngine
): Promise<QueryBundle[]> {
  const bundles: QueryBundle[] = [];
  for (const query of queries.slice(0, MAX_QUERIES)) {
    const { results, fresh } = await search(engine, query);
    bundles.push({
      query,
      engine,
      results: results.map((r) => ({ ...r, engine })),
      fresh,
    });
  }
  return bundles;
}

export async function runSearches(queries: string[], engine: SearchEngine): Promise<SerpResult[]> {
  const bundles = await runSearchBundles(queries, engine);
  return bundles.flatMap((b) => b.results).slice(0, MAX_RESULTS);
}
