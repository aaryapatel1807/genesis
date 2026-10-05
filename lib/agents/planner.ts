/**
 * lib/agents/planner.ts — bounded, template-driven query planning (code, not LLM).
 * Returns at most 2 query strings for expanding a node. No autonomous loops.
 */
import type { GNode } from '../types';

export function planExpansion(node: GNode): string[] {
  const name = node.name;
  switch (node.type) {
    case 'company':
    case 'startup':
    case 'funder':
      return [`${name} partnerships`, `${name} funding news`];
    case 'researcher':
      return [`${name} research papers`, `${name} affiliation`];
    case 'product':
      return [`${name} launch`, `${name} competitors`];
    default:
      return [`${name} news`];
  }
}
