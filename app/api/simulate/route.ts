/**
 * POST /api/simulate { scenario }
 * What-if scenario simulation over the world graph.
 * Every response carries the SIMULATION label (response contract, not decoration).
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

    if (!process.env.GROQ_API_KEY) {
      await getDb().logSimulation({
        at: new Date().toISOString(),
        scenario,
        affected: [],
        cascades: [],
      });
      return NextResponse.json({
        scenario,
        label: SIM_LABEL,
        affected: [],
        cascades: [],
        note: 'Simulator unavailable without GROQ_API_KEY.',
        isSimulation: true,
      });
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
    });
    return NextResponse.json({ scenario, label: SIM_LABEL, ...result });
  } catch {
    return err('simulation failed', 'SIMULATION_FAILED', 500);
  }
}
