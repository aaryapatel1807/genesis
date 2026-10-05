import { afterEach, describe, expect, it } from 'vitest';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { JsonAdapter } from '../lib/db/jsonAdapter';

const DATA_DIR = join(process.cwd(), 'data');
const BUDGET_PATH = join(DATA_DIR, 'session-budgets.json');
const SIM_LOG_PATH = join(DATA_DIR, 'simulation-log.jsonl');
const TOKEN = `vitest-${Date.now()}`;

afterEach(async () => {
  // keep the repo's data dir clean of test artifacts
  try {
    const raw = await readFile(BUDGET_PATH, 'utf-8');
    const budgets = JSON.parse(raw) as Record<string, number>;
    delete budgets[TOKEN];
    await writeFile(BUDGET_PATH, JSON.stringify(budgets), 'utf-8');
  } catch {
    /* ignore */
  }
});

describe('JsonAdapter session budget (BUG 5)', () => {
  it('starts at 0 and accumulates durably', async () => {
    const db = new JsonAdapter();
    expect(await db.getSessionBudget(TOKEN)).toBe(0);
    await db.recordSessionBudget(TOKEN, 3);
    expect(await db.getSessionBudget(TOKEN)).toBe(3);
    // a NEW adapter instance sees the same value -> durable, not in-memory
    expect(await new JsonAdapter().getSessionBudget(TOKEN)).toBe(3);
    await db.recordSessionBudget(TOKEN, 2);
    expect(await db.getSessionBudget(TOKEN)).toBe(5);
  });
});

describe('JsonAdapter.logSimulation (BUG 4)', () => {
  it('caps raw scenario text at 100 chars before writing to disk', async () => {
    const db = new JsonAdapter();
    const before = await readFile(SIM_LOG_PATH, 'utf-8').catch(() => '');
    const beforeLines = before.split('\n').filter(Boolean).length;
    await db.logSimulation({
      at: new Date().toISOString(),
      scenario: 'x'.repeat(200),
      affected: [],
      cascades: [],
    });
    const after = await readFile(SIM_LOG_PATH, 'utf-8');
    const lines = after.split('\n').filter(Boolean);
    expect(lines.length).toBe(beforeLines + 1);
    const entry = JSON.parse(lines[lines.length - 1]) as { scenario: string };
    expect(entry.scenario.length).toBeLessThanOrEqual(100);
  });
});
