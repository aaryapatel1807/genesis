/**
 * lib/score.ts — the Reality Meter and influence scoring.
 * Confidence is COMPUTED, never asserted by the LLM.
 */
import type { NodeType, Reality } from './types';

/**
 * confidence = min(95, 35 + 15*min(sources,4))
 * 1 source -> 50 · 2 -> 65 · 3 -> 80 · 4+ -> 95 (never 100).
 * freshness passes the newest source date straight through.
 */
export function scoreNode(sources: number, newestDate: string): Reality {
  return {
    confidence: Math.min(95, 35 + 15 * Math.min(sources, 4)),
    freshness: newestDate,
    sources,
  };
}

/** Recency bucket for a day count: fresh (<=30d), aging (<=180d), stale. */
export function freshnessLabel(days: number): 'fresh' | 'aging' | 'stale' {
  if (days <= 30) return 'fresh';
  if (days <= 180) return 'aging';
  return 'stale';
}

const TYPE_BASE: Record<NodeType, number> = {
  company: 70,
  researcher: 55,
  university: 50,
  product: 65,
  startup: 45,
  funder: 50,
  patent: 30,
  event: 40,
  technology: 60,
  paper: 45,
  job: 25,
  country: 55,
  government: 50,
  law: 45,
};

/** Deterministic 0-100 influence: per-type base + up to +20 for source depth. */
export function influenceFor(type: NodeType, sources: number): number {
  return Math.min(100, TYPE_BASE[type] + Math.min(sources, 4) * 5);
}
