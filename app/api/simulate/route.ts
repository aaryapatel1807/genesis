/**
 * POST /api/simulate { scenario }
 * What-if scenario simulation over the world graph (multi-round engine).
 * Every response carries the SIMULATION label (response contract, not decoration).
 *
 * The engine is fully deterministic without GROQ_API_KEY (keyword seeds +
 * structural propagation + template effects), so demo mode now returns a
 * complete run — rounds, personas, verdict — instead of empty arrays.
 * With a key, one LLM call picks smarter seeds; propagation stays structural.
 */
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { runSimulation, sanitizeScenario } from '@/lib/agents/simulation';
import type { SimCascade, World } from '@/lib/types';

const SIM_LABEL = 'SIMULATION — AI-generated scenario, not factual prediction.';

/** Every response — including errors — carries the SIMULATION label (contract). */
const err = (error: string, code: string, status: number): NextResponse =>
  NextResponse.json({ error, code, label: SIM_LABEL }, { status });

async function loadWorld(): Promise<World | null> {
  try {
    return await getDb().getWorld();
  } catch {
    return null;
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const parsed: unknown = await req.json().catch(() => ({}));
    const body = (parsed !== null && typeof parsed === 'object' ? parsed : {}) as {
      scenario?: unknown;
    };
    const scenario = sanitizeScenario(typeof body.scenario === 'string' ? body.scenario : '');
    if (!scenario) {
      return err('scenario is required', 'SCENARIO_REQUIRED', 400);
    }

    const world = await loadWorld();
    if (!world) {
      return err('world not built yet', 'WORLD_NOT_BUILT', 500);
    }

    const result = await runSimulation(scenario, world);
    await getDb().logSimulation({
      at: new Date().toISOString(),
      scenario,
      affected: result.affected,
      cascades: result.cascades.map((c: SimCascade) => ({
        nodeId: c.nodeId,
        effect: c.effect,
        severity: c.severity,
      })),
      rounds: result.verdict.rounds,
      verdict: {
        forecast: result.verdict.forecast,
        probability: result.verdict.probability,
        confidence: result.verdict.confidence,
        signals: result.verdict.signals,
      },
    });
    return NextResponse.json({
      scenario,
      label: SIM_LABEL,
      ...result,
      ...(process.env.GROQ_API_KEY
        ? {}
        : {
            note: 'Demo mode: keyword seeds + structural propagation (no GROQ_API_KEY).',
          }),
    });
  } catch {
    return err('simulation failed', 'SIMULATION_FAILED', 500);
  }
}
