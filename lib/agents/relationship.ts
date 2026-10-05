/**
 * lib/agents/relationship.ts — A2 Relation Verifier.
 * Deterministic (not LLM). Keeps the extractor honest:
 *  - drop relations whose endpoints are not extracted entities
 *  - drop self-relations, duplicates, and evidence-less relations
 *  - cap 3 relations per entity pair
 */
import { normalizeName } from '../dedupe';
import type { ExtractedEntity, ExtractedRelation } from './explorer';

export function verifyRelations(
  relations: ExtractedRelation[],
  entities: ExtractedEntity[]
): ExtractedRelation[] {
  const names = new Set(entities.map((e) => normalizeName(e.name)));
  const seen = new Set<string>();
  const pairCount = new Map<string, number>();
  const out: ExtractedRelation[] = [];

  for (const r of relations) {
    const s = normalizeName(r.source);
    const t = normalizeName(r.target);
    if (!s || !t || s === t) {
      continue;
    }
    if (!names.has(s) || !names.has(t)) {
      continue; // unknown endpoint
    }
    if (!r.evidence_snippet || !r.evidence_snippet.trim()) {
      continue; // no evidence
    }
    const pairKey = s < t ? `${s}|${t}` : `${t}|${s}`;
    const dupKey = `${pairKey}|${r.relation}`;
    if (seen.has(dupKey)) {
      continue; // duplicate
    }
    if ((pairCount.get(pairKey) ?? 0) >= 3) {
      continue; // cap 3 per pair
    }
    seen.add(dupKey);
    pairCount.set(pairKey, (pairCount.get(pairKey) ?? 0) + 1);
    out.push(r);
  }
  return out;
}
