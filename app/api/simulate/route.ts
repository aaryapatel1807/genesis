/**
 * POST /api/simulate { scenario }
 * What-if scenario simulation over the world graph.
 * Every response carries the SIMULATION label (response contract, not decoration).
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextResponse } from 'next/server';
import { runSimulation, sanitizeScenario } from '@/lib/agents/simulation';
import type { World } from '@/lib/types';

const SIM_LABEL = 'SIMULATION — AI-generated scenario, not factual prediction.';

async function loadWorld(): Promise<World | null> {
  try {
    const raw = await readFile(join(process.cwd(), 'data', 'world.json'), 'utf-8');
    return JSON.parse(raw) as World;
  } catch {
    return null;
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body = (await req.json().catch(() => ({}))) as { scenario?: unknown };
    const scenario = sanitizeScenario(typeof body.scenario === 'string' ? body.scenario : '');
    if (!scenario) {
      return NextResponse.json({ error: 'scenario is required' }, { status: 400 });
    }

    const world = await loadWorld();
    if (!world) {
      return NextResponse.json({ error: 'world not built yet' }, { status: 500 });
    }

    if (!process.env.GROQ_API_KEY) {
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
    return NextResponse.json({ scenario, label: SIM_LABEL, ...result });
  } catch {
    return NextResponse.json({ error: 'simulation failed' }, { status: 500 });
  }
}
