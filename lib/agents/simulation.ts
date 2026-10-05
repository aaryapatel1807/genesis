/**
 * lib/agents/simulation.ts — A3 Simulator.
 * One-shot Groq call over a compact world summary + sanitized scenario.
 * Anti-hallucination: any nodeId not in the world is dropped server-side.
 * Output always carries isSimulation: true; the response label is added by the route.
 */
import { groqJson } from '../groq';
import type { World } from '../types';

export type CascadeSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Cascade {
  nodeId: string;
  effect: string;
  severity: CascadeSeverity;
}

export interface SimulationResult {
  affected: string[];
  cascades: Cascade[];
  isSimulation: true;
}

export const SIMULATION_PROMPT = `You are a scenario engine, not a predictor.
Given a world graph (nodes and edges) and a hypothetical scenario, list the nodes
that would be affected and describe plausible 1-step cascade effects.
Return ONLY valid JSON:
{ "affected": ["<node id>"], "cascades": [{ "node": "<node id>", "effect": "<one sentence>", "severity": "<low|medium|high|critical>" }] }
Rules:
- Effects must follow existing edges only — never invent new relationships.
- Never state outcomes as facts; this is a hypothetical exercise.
- Use only node ids listed in the input world.`;

const SEVERITIES: readonly string[] = ['low', 'medium', 'high', 'critical'];
const MAX_EDGES_IN_SUMMARY = 150;

/** Strip HTML-ish characters and cap at 200 chars. */
export function sanitizeScenario(scenario: string): string {
  return scenario.replace(/[<>]/g, '').trim().slice(0, 200);
}

function buildSummary(world: World): string {
  const nodes = world.nodes.map((n) => `${n.id}|${n.name}|${n.type}`).join('\n');
  const edges = world.edges
    .slice(0, MAX_EDGES_IN_SUMMARY)
    .map((e) => `${e.source} -${e.relation}-> ${e.target}`)
    .join('\n');
  return `NODES (id|name|type):\n${nodes}\n\nEDGES (source -relation-> target):\n${edges}`;
}

export async function runSimulation(scenario: string, world: World): Promise<SimulationResult> {
  const clean = sanitizeScenario(scenario);
  const ids = new Set(world.nodes.map((n) => n.id));

  const raw = await groqJson(
    SIMULATION_PROMPT,
    `World:\n${buildSummary(world)}\n\nScenario: ${clean}`,
    { temperature: 0.5, maxTokens: 600 }
  );
  const rec = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;

  const cascades: Cascade[] = [];
  if (Array.isArray(rec.cascades)) {
    for (const c of rec.cascades) {
      if (typeof c !== 'object' || c === null) {
        continue;
      }
      const cc = c as Record<string, unknown>;
      const nodeId =
        typeof cc.nodeId === 'string' ? cc.nodeId : typeof cc.node === 'string' ? cc.node : '';
      const effect = typeof cc.effect === 'string' ? cc.effect.slice(0, 300) : '';
      const severity: CascadeSeverity =
        typeof cc.severity === 'string' && SEVERITIES.includes(cc.severity)
          ? (cc.severity as CascadeSeverity)
          : 'low';
      if (!nodeId || !ids.has(nodeId) || !effect) {
        continue; // anti-hallucination: unknown or empty
      }
      cascades.push({ nodeId, effect, severity });
    }
  }

  const affected: string[] = [];
  if (Array.isArray(rec.affected)) {
    for (const a of rec.affected) {
      if (typeof a === 'string' && ids.has(a)) {
        affected.push(a);
      }
    }
  }
  for (const c of cascades) {
    if (!affected.includes(c.nodeId)) {
      affected.push(c.nodeId);
    }
  }

  return { affected, cascades, isSimulation: true };
}
