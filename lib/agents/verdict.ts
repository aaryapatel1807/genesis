/**
 * lib/agents/verdict.ts — the structured forecast MiroFish never shipped.
 *
 * verdict.json answers "so what?" after a simulation run:
 *   { forecast, probability, confidence, signals, narratives }
 *
 * Honesty contract (do not weaken):
 * - `probability` is a STRUCTURAL propagation score derived from the graph
 *   (how far the shock travelled), not a real-world probability.
 * - `confidence` is grounded in REAL data: the mean evidence confidence of
 *   the affected nodes (their `reality.confidence` from SerpApi evidence).
 * - Everything carries isSimulation: true upstream.
 */
import type { GEdge, Relation, World } from '../types';
import type { SimRound } from './simulation';

export interface Verdict {
  /** One-sentence plain-language summary of the run. */
  forecast: string;
  /** 0..1 structural propagation score — labelled as such, never as a prediction. */
  probability: number;
  /** 0..1 mean evidence confidence of affected nodes (real data). */
  confidence: number;
  /** Top structural signals, most important first. */
  signals: string[];
  /** One narrative line per round, in round order. */
  narratives: string[];
  /** Fraction of the world reached (0..1). */
  spread: number;
  /** Number of propagation rounds executed. */
  rounds: number;
  isSimulation: true;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;
const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

function shortScenario(scenario: string): string {
  const s = scenario.trim();
  return s.length > 80 ? `${s.slice(0, 77)}…` : s;
}

/** Count how many round-entries each relation carried. */
function relationCounts(rounds: readonly SimRound[]): Array<[Relation, number]> {
  const counts = new Map<Relation, number>();
  for (const r of rounds) {
    if (r.viaRelation) counts.set(r.viaRelation, (counts.get(r.viaRelation) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

/**
 * Build the verdict from a completed round log. Pure and deterministic:
 * same rounds in → same verdict out.
 */
export function buildVerdict(
  scenario: string,
  world: World,
  rounds: readonly SimRound[],
): Verdict {
  const byId = new Map(world.nodes.map((n) => [n.id, n]));
  const affectedIds = [...new Set(rounds.map((r) => r.nodeId))];
  const affected = affectedIds
    .map((id) => byId.get(id))
    .filter((n): n is NonNullable<typeof n> => Boolean(n));

  const spread = world.nodes.length === 0 ? 0 : affectedIds.length / world.nodes.length;
  const maxRound = rounds.reduce((m, r) => Math.max(m, r.round), 1);

  // Structural propagation score: reach × depth. Labelled honestly upstream.
  const probability = round2(Math.min(0.95, 0.2 + 0.6 * spread + 0.05 * maxRound));

  // Evidence-grounded confidence: real `reality.confidence` of affected nodes.
  const confidences = affected
    .map((n) => n.reality?.confidence)
    .filter((c): c is number => typeof c === 'number' && Number.isFinite(c));
  const confidence =
    confidences.length === 0
      ? 0.5
      : round2(clamp01(confidences.reduce((a, b) => a + b, 0) / confidences.length / 100));

  const relCounts = relationCounts(rounds);
  const topRelation = relCounts[0];

  // Type concentration: which node types absorbed the shock.
  const typeCounts = new Map<string, number>();
  for (const n of affected) typeCounts.set(n.type, (typeCounts.get(n.type) ?? 0) + 1);
  const topTypes = [...typeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([t, c]) => `${c} ${t}${c === 1 ? '' : 's'}`)
    .join(' and ');

  const seedNames = rounds
    .filter((r) => r.round === 1)
    .slice(0, 3)
    .map((r) => r.nodeName);

  const signals: string[] = [];
  signals.push(
    `${affectedIds.length} of ${world.nodes.length} entities reached in ${maxRound} round${maxRound === 1 ? '' : 's'}`,
  );
  if (seedNames.length > 0) {
    signals.push(`Epicentre: ${seedNames.join(', ')}`);
  }
  if (topRelation) {
    signals.push(
      `Strongest conduit: ${topRelation[0]} (${topRelation[1]} edge${topRelation[1] === 1 ? '' : 's'} carried the shock)`,
    );
  }
  const heaviest = [...affected].sort((a, b) => b.influence - a.influence)[0];
  if (heaviest) {
    signals.push(`Highest-influence entity hit: ${heaviest.name} (influence ${heaviest.influence})`);
  }

  const forecast =
    `Under the scenario "${shortScenario(scenario)}", the shock reaches ` +
    `${affectedIds.length} ${affectedIds.length === 1 ? 'entity' : 'entities'} within ${maxRound} ` +
    `round${maxRound === 1 ? '' : 's'}` +
    (topTypes ? `, concentrated in ${topTypes}` : '') +
    `. Simulation only — not a prediction.`;

  // One narrative per round.
  const byRound = new Map<number, SimRound[]>();
  for (const r of rounds) {
    const list = byRound.get(r.round) ?? [];
    list.push(r);
    byRound.set(r.round, list);
  }
  const narratives: string[] = [];
  for (const round of [...byRound.keys()].sort((a, b) => a - b)) {
    const entries = byRound.get(round) ?? [];
    const names = entries.slice(0, 4).map((e) => e.nodeName);
    const extra = entries.length > 4 ? ` and ${entries.length - 4} more` : '';
    const rels = [...new Set(entries.map((e) => e.viaRelation).filter(Boolean))];
    const label = round === 1 ? 'epicentre' : `wave ${round}`;
    narratives.push(
      `Round ${round} (${label}): ${names.join(', ')}${extra}` +
        (rels.length > 0 ? ` — ${rels.join(', ')} ripples` : '') +
        '.',
    );
  }

  return {
    forecast,
    probability,
    confidence,
    signals,
    narratives,
    spread: round2(clamp01(spread)),
    rounds: maxRound,
    isSimulation: true,
  };
}

/** Keep edge-strength metadata visible for future weighted propagation. */
export function edgeStrengthOf(edges: readonly GEdge[], edgeId: string): string {
  return edges.find((e) => e.id === edgeId)?.strength ?? 'medium';
}
