/**
 * lib/agents/simulation.ts — A3 Simulator (multi-round engine).
 *
 * MiroFish-inspired upgrade: instead of a one-shot "affected list", the
 * simulator now runs ROUNDS —
 *   round 1: epicentre (seed nodes most directly implicated by the scenario)
 *   rounds 2-4: propagation waves that travel along real edges, with
 *   severity decaying by distance and edge strength.
 *
 * Each hit entity reacts through its Persona (lib/agents/personas.ts), and
 * the run closes with a structured Verdict (lib/agents/verdict.ts) —
 * the verdict.json MiroFish never shipped.
 *
 * Fully deterministic without GROQ_API_KEY (keyword seeds + template
 * effects). With a key, one LLM call picks smarter seeds; propagation
 * itself stays structural so it is cheap and reproducible.
 *
 * Anti-hallucination: every node id is validated against the world;
 * unknown ids are dropped. Output always carries isSimulation: true.
 */
import { groqJson } from '../groq';
import type { GNode, Relation, Strength, World } from '../types';
import { buildPersonas, indexPersonas, react, type Persona } from './personas';
import { buildVerdict, type Verdict } from './verdict';

export type CascadeSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Cascade {
  nodeId: string;
  effect: string;
  severity: CascadeSeverity;
}

/** One entity hit in one round of the simulation. */
export interface SimRound {
  /** 1 = epicentre (seeds), 2+ = propagation waves. */
  round: number;
  nodeId: string;
  nodeName: string;
  effect: string;
  severity: CascadeSeverity;
  /** The edge that carried the shock here; null for epicentre nodes. */
  viaRelation: Relation | null;
  viaNodeId: string | null;
  /** The entity's persona reacting to the hit. */
  reaction: string;
}

export interface SimulationResult {
  affected: string[];
  cascades: Cascade[];
  /** Full round log — the heart of the multi-round engine. */
  rounds: SimRound[];
  /** Personas of the affected entities, in affected order. */
  personas: Persona[];
  verdict: Verdict;
  isSimulation: true;
}

export const SEED_PROMPT = `You are a scenario engine, not a predictor.
Given a world graph (nodes) and a hypothetical scenario, pick the 3-5 nodes MOST DIRECTLY implicated by the scenario.
Return ONLY valid JSON:
{ "seeds": ["<node id>"] }
Rules:
- Use only node ids listed in the input world.
- Prefer nodes named or described in the scenario; otherwise pick the most central hubs.
- Never state outcomes as facts; this is a hypothetical exercise.`;

const SEVERITY_ORDER: readonly CascadeSeverity[] = ['low', 'medium', 'high', 'critical'];
const MAX_WAVES = 3; // rounds 2..4 after the round-1 epicentre
const MAX_PER_WAVE = 12;
const MAX_SEEDS = 5;

/** Strip HTML-ish characters and cap at 200 chars. */
export function sanitizeScenario(scenario: string): string {
  return scenario.replace(/[<>]/g, '').trim().slice(0, 200);
}

// --- Seed selection ----------------------------------------------------------

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'to', 'for', 'with',
  'what', 'if', 'when', 'how', 'would', 'could', 'should', 'will',
  'its', 'their', 'this', 'that', 'from', 'into', 'over', 'under', 'about',
  'after', 'before', 'between', 'during', 'does', 'are', 'was', 'were',
  'has', 'have', 'had', 'been', 'being', 'than', 'then', 'them', 'they',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

/**
 * Keyword seed selection (no LLM): score nodes by token overlap with the
 * scenario — name ×3, type ×2, description ×1. Deterministic.
 * Falls back to the highest-influence hubs when nothing matches.
 */
export function findSeedNodes(scenario: string, world: World, maxSeeds = MAX_SEEDS): string[] {
  const tokens = new Set(tokenize(scenario));
  const scored = world.nodes.map((n) => {
    const nameT = new Set(tokenize(n.name));
    const typeT = new Set(tokenize(n.type));
    const descT = new Set(tokenize(n.description ?? ''));
    let score = 0;
    for (const t of tokens) {
      if (nameT.has(t)) score += 3;
      else if (typeT.has(t)) score += 2;
      else if (descT.has(t)) score += 1;
    }
    return { id: n.id, score, influence: n.influence };
  });
  const byId = (a: { id: string }, b: { id: string }): number =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  const matched = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || b.influence - a.influence || byId(a, b));
  if (matched.length > 0) {
    return matched.slice(0, maxSeeds).map((s) => s.id);
  }
  return [...world.nodes]
    .sort((a, b) => b.influence - a.influence || byId(a, b))
    .slice(0, Math.min(3, maxSeeds))
    .map((n) => n.id);
}

async function llmSeedNodes(scenario: string, world: World): Promise<string[]> {
  const ids = new Set(world.nodes.map((n) => n.id));
  const summary = world.nodes.map((n) => `${n.id}|${n.name}|${n.type}`).join('\n');
  const raw = await groqJson(
    SEED_PROMPT,
    `World nodes (id|name|type):\n${summary}\n\nScenario: ${scenario}`,
    { temperature: 0.3, maxTokens: 300 },
  );
  const rec = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const seeds = Array.isArray(rec.seeds)
    ? rec.seeds.filter((s): s is string => typeof s === 'string' && ids.has(s))
    : [];
  return seeds.slice(0, MAX_SEEDS);
}

// --- Round propagation -------------------------------------------------------

const STRENGTH_RANK: Record<Strength, number> = { strong: 3, medium: 2, weak: 1 };

function decaySeverity(prev: CascadeSeverity, strength: Strength): CascadeSeverity {
  const drop = strength === 'strong' ? 0 : strength === 'medium' ? 1 : 2;
  const idx = Math.max(0, SEVERITY_ORDER.indexOf(prev) - drop);
  return SEVERITY_ORDER[idx];
}

function seedSeverity(node: GNode): CascadeSeverity {
  return node.influence >= 70 ? 'critical' : node.influence >= 40 ? 'high' : 'medium';
}

const RELATION_EFFECT: Record<Relation, (src: string, dst: string) => string> = {
  investment: (s, d) => `Funding exposure via ${s}: capital flows around ${d} wobble.`,
  partnership: (s, d) => `Partnership ripple: ${s} drags ${d} into the shock.`,
  supplies: (s, d) => `Supply-chain knock-on: ${s} disrupts what ${d} depends on.`,
  employs: (s, d) => `Talent movement between ${s} and ${d} accelerates.`,
  researches: (s, d) => `Research spillover from ${s} shifts the agenda at ${d}.`,
  acquired: (s, d) => `Ownership shock: ${s}'s move rattles ${d}.`,
  competes: (s, d) => `Competitive pressure between ${s} and ${d} intensifies.`,
  powers: (s, d) => `Dependency jolt: ${d} leans on ${s}, and it shows.`,
};

interface AdjInfo {
  relation: Relation;
  strength: Strength;
}

/**
 * Multi-round propagation. Pure and deterministic: shocks travel along real
 * edges only (undirected), severity decays with distance and edge strength,
 * each wave is capped and ordered deterministically.
 */
export function propagateRounds(
  scenario: string,
  world: World,
  seedIds: readonly string[],
  personas: ReadonlyMap<string, Persona>,
): SimRound[] {
  const byId = new Map(world.nodes.map((n) => [n.id, n]));

  // Undirected adjacency, deduped to the strongest parallel edge.
  const adj = new Map<string, Map<string, AdjInfo>>();
  for (const e of world.edges) {
    for (const [a, b] of [
      [e.source, e.target],
      [e.target, e.source],
    ] as const) {
      let m = adj.get(a);
      if (!m) {
        m = new Map();
        adj.set(a, m);
      }
      const cur = m.get(b);
      if (!cur || STRENGTH_RANK[e.strength] > STRENGTH_RANK[cur.strength]) {
        m.set(b, { relation: e.relation, strength: e.strength });
      }
    }
  }

  const rounds: SimRound[] = [];
  const visited = new Set<string>();
  const severityOf = new Map<string, CascadeSeverity>();

  const pushRound = (
    round: number,
    nodeId: string,
    viaNodeId: string | null,
    viaRelation: Relation | null,
    severity: CascadeSeverity,
  ): boolean => {
    const node = byId.get(nodeId);
    if (!node || visited.has(nodeId)) return false;
    const viaName = viaNodeId ? (byId.get(viaNodeId)?.name ?? 'the network') : '';
    const effect =
      viaRelation && viaNodeId
        ? RELATION_EFFECT[viaRelation](viaName, node.name)
        : 'Directly implicated by the scenario.';
    const persona = personas.get(nodeId);
    rounds.push({
      round,
      nodeId,
      nodeName: node.name,
      effect,
      severity,
      viaRelation,
      viaNodeId,
      reaction: persona ? react(persona, effect) : '',
    });
    visited.add(nodeId);
    severityOf.set(nodeId, severity);
    return true;
  };

  // Round 1: epicentre.
  let frontier: string[] = [];
  for (const id of seedIds) {
    const node = byId.get(id);
    if (!node) continue; // anti-hallucination: unknown seed dropped
    if (pushRound(1, id, null, null, seedSeverity(node))) frontier.push(id);
  }

  // Rounds 2..N: propagation waves. Effects are structural — the scenario
  // text already shaped the seeds, so it is intentionally unused here.
  void scenario;
  for (let round = 2; round <= MAX_WAVES + 1 && frontier.length > 0; round++) {
    const candidates: Array<{
      id: string;
      via: string;
      relation: Relation;
      severity: CascadeSeverity;
    }> = [];
    for (const id of frontier) {
      const prevSev = severityOf.get(id) ?? 'medium';
      const neighbours = adj.get(id);
      if (!neighbours) continue;
      for (const [nid, info] of neighbours) {
        if (visited.has(nid)) continue;
        candidates.push({
          id: nid,
          via: id,
          relation: info.relation,
          severity: decaySeverity(prevSev, info.strength),
        });
      }
    }
    // Deterministic order: severity → influence → id. Cap the wave.
    candidates.sort(
      (a, b) =>
        SEVERITY_ORDER.indexOf(b.severity) - SEVERITY_ORDER.indexOf(a.severity) ||
        (byId.get(b.id)?.influence ?? 0) - (byId.get(a.id)?.influence ?? 0) ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    );
    const seenWave = new Set<string>();
    const nextFrontier: string[] = [];
    for (const c of candidates.slice(0, MAX_PER_WAVE)) {
      if (seenWave.has(c.id)) continue;
      seenWave.add(c.id);
      if (pushRound(round, c.id, c.via, c.relation, c.severity)) nextFrontier.push(c.id);
    }
    frontier = nextFrontier;
  }

  return rounds;
}

// --- Orchestration -----------------------------------------------------------

/**
 * Run the full multi-round simulation: seeds → waves → personas → verdict.
 * One optional LLM call (seed picking); everything else is structural and
 * reproducible.
 */
export async function runSimulation(scenario: string, world: World): Promise<SimulationResult> {
  const clean = sanitizeScenario(scenario);
  const ids = new Set(world.nodes.map((n) => n.id));

  let seedIds: string[] = [];
  if (process.env.GROQ_API_KEY) {
    try {
      seedIds = (await llmSeedNodes(clean, world)).filter((id) => ids.has(id));
    } catch {
      seedIds = []; // fall through to keyword seeds
    }
  }
  if (seedIds.length === 0) {
    seedIds = findSeedNodes(clean, world);
  }

  const personaIndex = indexPersonas(buildPersonas(world));
  const rounds = propagateRounds(clean, world, seedIds, personaIndex);

  const affected = [...new Set(rounds.map((r) => r.nodeId))];
  const cascades: Cascade[] = rounds.map((r) => ({
    nodeId: r.nodeId,
    effect: r.effect,
    severity: r.severity,
  }));
  const personas = affected
    .map((id) => personaIndex.get(id))
    .filter((p): p is Persona => Boolean(p));
  const verdict = buildVerdict(clean, world, rounds);

  return { affected, cascades, rounds, personas, verdict, isSimulation: true };
}
