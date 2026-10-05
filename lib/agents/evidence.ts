/**
 * lib/agents/evidence.ts — attach search evidence to verified relations.
 * Emits GEdge objects with node ids derived deterministically from entity names
 * (`n_<slug>`), so they align with the ids built by worldBuilder.toNodes.
 * strength: 2+ distinct source domains -> strong, 1 -> medium.
 */
import { normalizeName } from '../dedupe';
import type { SerpResult } from '../serpapi';
import type { Evidence, GEdge, Strength } from '../types';
import type { ExtractedRelation } from './explorer';

export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'node';
}

/** Deterministic node id for an entity name. Shared with worldBuilder. */
export function nodeIdFor(name: string): string {
  return `n_${slugify(name)}`;
}

function domainOf(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function engineOf(res: SerpResult): string {
  const maybe = res as unknown as Record<string, unknown>;
  return typeof maybe.engine === 'string' ? maybe.engine : 'unknown';
}

function mentions(text: string, name: string): boolean {
  const norm = normalizeName(name);
  return norm.length > 0 && normalizeName(text).includes(norm);
}

export function attachEvidence(relations: ExtractedRelation[], results: SerpResult[]): GEdge[] {
  return relations.map((r) => {
    const matched = results.filter(
      (res) =>
        mentions(`${res.title} ${res.snippet}`, r.source) &&
        mentions(`${res.title} ${res.snippet}`, r.target)
    );
    const domains = new Set(matched.map((m) => domainOf(m.link)).filter(Boolean));
    const strength: Strength = domains.size >= 2 ? 'strong' : 'medium';
    const evidence: Evidence[] =
      matched.length > 0
        ? matched.slice(0, 3).map((m) => ({
            snippet: m.snippet || m.title,
            url: m.link,
            engine: engineOf(m),
            date: m.date ?? 'unknown',
          }))
        : [{ snippet: r.evidence_snippet, url: '', engine: 'unknown', date: 'unknown' }];
    return {
      id: `e_${slugify(r.source)}_${slugify(r.target)}_${r.relation}`,
      source: nodeIdFor(r.source),
      target: nodeIdFor(r.target),
      relation: r.relation,
      strength,
      evidence,
    };
  });
}
