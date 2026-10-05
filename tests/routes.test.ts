import { describe, expect, it } from 'vitest';
import { GET as getWorld } from '../app/api/world/route';
import { GET as getSnapshot } from '../app/api/world/snapshot/[year]/route';
import { POST as postExpand } from '../app/api/world/expand/route';
import { POST as postSimulate } from '../app/api/simulate/route';

const SIM_LABEL = 'SIMULATION — AI-generated scenario, not factual prediction.';

function req(path: string, init?: RequestInit): Request {
  return new Request(`http://localhost${path}`, init);
}

describe('GET /api/world', () => {
  it('serves the precomputed universe', async () => {
    const res = await getWorld();
    expect(res.status).toBe(200);
    const world = await res.json();
    expect(Array.isArray(world.nodes)).toBe(true);
    expect(Array.isArray(world.edges)).toBe(true);
    expect(world.nodes.length).toBeGreaterThan(50);
  });
});

describe('GET /api/world/snapshot/[year]', () => {
  it('serves 2020 and 404s unknown years with a code', async () => {
    const ok = await getSnapshot(req('/api/world/snapshot/2020'), { params: { year: '2020' } });
    expect(ok.status).toBe(200);
    const bad = await getSnapshot(req('/api/world/snapshot/1999'), { params: { year: '1999' } });
    expect(bad.status).toBe(404);
    expect((await bad.json()).code).toBe('UNKNOWN_SNAPSHOT');
  });
});

describe('POST /api/world/expand', () => {
  async function expand(body: unknown, headers: Record<string, string> = {}) {
    return postExpand(
      req('/api/world/expand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: typeof body === 'string' ? body : JSON.stringify(body),
      })
    );
  }

  it('404s unknown nodes with a machine-readable code (BUG 8)', async () => {
    const res = await expand({ nodeId: 'n_nope' }, { 'x-session-id': 'vitest-1' });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.code).toBe('UNKNOWN_NODE');
  });

  it('treats a literal null body as {} -> 404, not 500 (BUG 9)', async () => {
    const res = await expand('null', { 'x-session-id': 'vitest-1' });
    expect(res.status).toBe(404);
  });

  it('rejects a missing x-session-id with 400, never mints one (BUG 5)', async () => {
    const world = await (await getWorld()).json();
    const nodeId = world.nodes[0].id as string;
    const res = await expand({ nodeId }); // no session header
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('SESSION_REQUIRED');
  });

  it('degrades honestly without keys and always returns searchesUsed (BUG 2)', async () => {
    const world = await (await getWorld()).json();
    const nodeId = world.nodes[0].id as string;
    const res = await expand({ nodeId }, { 'x-session-id': `vitest-${Date.now()}` });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(typeof json.searchesUsed).toBe('number');
    expect(json.searchesUsed).toBe(0);
    expect(json.cached).toBe(true);
  });
});

describe('POST /api/simulate', () => {
  async function simulate(body: unknown) {
    return postSimulate(
      req('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: typeof body === 'string' ? body : JSON.stringify(body),
      })
    );
  }

  it('400s missing scenarios WITH the simulation label (BUG 8)', async () => {
    const res = await simulate({});
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe('SCENARIO_REQUIRED');
    expect(json.label).toBe(SIM_LABEL);
  });

  it('treats a literal null body as {} -> 400, not 500 (BUG 9)', async () => {
    const res = await simulate('null');
    expect(res.status).toBe(400);
  });

  it('labels every 200 as simulation (degraded without GROQ key)', async () => {
    const res = await simulate({ scenario: 'What if NVIDIA vanished?' });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.label).toBe(SIM_LABEL);
    expect(json.isSimulation).toBe(true);
  });
});
