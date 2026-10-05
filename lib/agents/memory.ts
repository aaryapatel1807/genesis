/**
 * lib/agents/memory.ts — session-scoped expansion budget.
 * In-memory Map keyed by an explicit session token (no cookies).
 * Tracks fresh SerpApi searches used per session; budget is 10.
 */
export interface SessionState {
  expansionsUsed: number;
}

const EXPANSION_BUDGET = 10;
const sessions = new Map<string, SessionState>();

export function getSessionState(token: string): SessionState | undefined {
  return sessions.get(token);
}

/** True while the session has fresh-search budget left. */
export function canExpand(token: string): boolean {
  return (sessions.get(token)?.expansionsUsed ?? 0) < EXPANSION_BUDGET;
}

/** Record n fresh searches against the session. */
export function recordExpansion(token: string, n: number): void {
  const state = sessions.get(token) ?? { expansionsUsed: 0 };
  state.expansionsUsed += n;
  sessions.set(token, state);
}

/** Alias kept for pipeline readability. */
export function noteExpansion(token: string, n: number): void {
  recordExpansion(token, n);
}
