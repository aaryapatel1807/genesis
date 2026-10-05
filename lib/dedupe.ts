/**
 * lib/dedupe.ts — deterministic merge helpers (deliberately not LLM).
 */
import type { GEdge, GNode } from './types';

/** Lowercase, strip every non-alphanumeric — the canonical name key. */
export function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Drop candidates whose normalized name+type already exists (in `existing`
 *  or earlier in `candidates`). First occurrence wins. */
export function dedupeNodes(existing: GNode[], candidates: GNode[]): GNode[] {
  const seen = new Set(existing.map((n) => `${normalizeName(n.name)}|${n.type}`));
  const out: GNode[] = [];
  for (const c of candidates) {
    const k = `${normalizeName(c.name)}|${c.type}`;
    if (seen.has(k)) {
      continue;
    }
    seen.add(k);
    out.push(c);
  }
  return out;
}

/** Drop candidate edges duplicating an existing (source|target|relation) triple. */
export function dedupeEdges(existing: GEdge[], candidates: GEdge[]): GEdge[] {
  const seen = new Set(existing.map((e) => `${e.source}|${e.target}|${e.relation}`));
  const out: GEdge[] = [];
  for (const c of candidates) {
    const k = `${c.source}|${c.target}|${c.relation}`;
    if (seen.has(k)) {
      continue;
    }
    seen.add(k);
    out.push(c);
  }
  return out;
}
