/**
 * lib/agents/narrator.ts — A4 Narrator.
 * v1 choice: hand-written era captions (demo-safe, zero LLM risk).
 */
const ERA_CAPTIONS: Record<string, string> = {
  '2020': 'GPT-3 and the scale bet',
  '2022': 'the generative boom begins',
  '2024': 'agents go mainstream',
  '2026': 'the living ecosystem',
};

export function eraCaption(year: string): string {
  return ERA_CAPTIONS[year] ?? `${year} — the ecosystem evolves`;
}
