/**
 * lib/agents/explorer.ts — A1 Extractor.
 * Groq reads search-result snippets and emits entities + relations as JSON.
 * The LLM is a pure text->JSON function here: no tools, no loops, no chat.
 */
import { groqJson } from '../groq';
import type { SerpResult } from '../serpapi';
import type { NodeType, Relation } from '../types';

export interface ExtractedEntity {
  name: string;
  type: NodeType;
  description: string;
}

export interface ExtractedRelation {
  source: string;
  target: string;
  relation: Relation;
  evidence_snippet: string;
}

export interface Extraction {
  entities: ExtractedEntity[];
  relations: ExtractedRelation[];
}

const NODE_TYPES: readonly NodeType[] = [
  'company', 'researcher', 'university', 'product', 'startup', 'funder',
  'patent', 'event', 'technology', 'paper', 'job', 'country', 'government', 'law',
];

const RELATIONS: readonly Relation[] = [
  'investment', 'partnership', 'supplies', 'employs',
  'researches', 'acquired', 'competes', 'powers',
];

export const EXTRACTION_PROMPT = `You are a precise entity extractor for the AI technology ecosystem.
Return ONLY valid JSON matching this schema:
{
  "entities": [{ "name": "...", "type": "<one of: company, researcher, university, product, startup, funder, patent, event, technology, paper, job, country, government, law>", "description": "<=2 sentences>" }],
  "relations": [{ "source": "<entity name>", "target": "<entity name>", "relation": "<one of: investment, partnership, supplies, employs, researches, acquired, competes, powers>", "evidence_snippet": "<verbatim snippet from the input supporting this relation>" }]
}
Rules:
- Entity names must appear verbatim in the input text. Never invent entities.
- If unsure about an entity or a relation, omit it.
- Max 12 entities.`;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function isExtraction(v: unknown): v is Extraction {
  if (!isRecord(v) || !Array.isArray(v.entities) || !Array.isArray(v.relations)) {
    return false;
  }
  const entitiesOk = v.entities.every(
    (e) =>
      isRecord(e) &&
      typeof e.name === 'string' &&
      e.name.length > 0 &&
      typeof e.type === 'string' &&
      (NODE_TYPES as readonly string[]).includes(e.type) &&
      typeof e.description === 'string'
  );
  const relationsOk = v.relations.every(
    (r) =>
      isRecord(r) &&
      typeof r.source === 'string' &&
      r.source.length > 0 &&
      typeof r.target === 'string' &&
      r.target.length > 0 &&
      typeof r.relation === 'string' &&
      (RELATIONS as readonly string[]).includes(r.relation) &&
      typeof r.evidence_snippet === 'string' &&
      r.evidence_snippet.trim().length > 0
  );
  return entitiesOk && relationsOk;
}

export async function extractEntities(results: SerpResult[], topic: string): Promise<Extraction> {
  const input = results
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\n${r.link}`)
    .join('\n\n');
  const raw = await groqJson(
    EXTRACTION_PROMPT,
    `Topic: ${topic}\n\nSearch results:\n${input}`,
    { temperature: 0.2 }
  );
  if (!isExtraction(raw)) {
    throw new Error('EXTRACTION_SCHEMA_MISMATCH');
  }
  return { entities: raw.entities.slice(0, 12), relations: raw.relations };
}
