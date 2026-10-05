/**
 * lib/agents/ranking.ts — pure sort by influence, descending.
 */
import type { GNode } from '../types';

export function rankNodes(nodes: GNode[]): GNode[] {
  return [...nodes].sort((a, b) => b.influence - a.influence);
}
