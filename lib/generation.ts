/**
 * The Genesis generation sequence — the staged world-birth choreography.
 *
 * The graph is NEVER displayed instantly. Every world load runs:
 *   searching → discovering → relationships → generating
 *     → blooming (nodes stagger in, edges draw, camera zooms)
 *     → ready (interaction enabled)
 *
 * This module is the pure, testable phase machine. Timing orchestration
 * lives in app/world/page.tsx; canvas choreography in UniverseGraph.
 */

export const GEN_PHASES = [
  'searching',
  'discovering',
  'relationships',
  'generating',
  'blooming',
  'ready',
] as const;

export type GenPhase = (typeof GEN_PHASES)[number];

export interface GenPhaseMeta {
  /** Short beat title shown in the sequence overlay. */
  title: string;
  /** Progress copy shown under the title. */
  copy: string;
  /** How long the beat holds (ms) before advancing. */
  durationMs: number;
}

export const GEN_PHASE_META: Record<GenPhase, GenPhaseMeta> = {
  searching: {
    title: 'Searching',
    copy: 'Querying live sources across the AI ecosystem…',
    durationMs: 1000,
  },
  discovering: {
    title: 'Discovering entities',
    copy: 'Identifying companies, researchers, papers and products…',
    durationMs: 1100,
  },
  relationships: {
    title: 'Building relationships',
    copy: 'Weaving evidence-backed connections between entities…',
    durationMs: 1100,
  },
  generating: {
    title: 'Generating world',
    copy: 'Composing the universe — layout, gravity, light…',
    durationMs: 900,
  },
  blooming: {
    title: 'World emerging',
    copy: 'Entities blooming · connections drawing · camera descending…',
    durationMs: 2400,
  },
  ready: {
    title: 'Universe ready',
    copy: 'Interaction enabled — click any entity to inspect it.',
    durationMs: 0,
  },
};

/** The four user-facing beats (blooming/ready are canvas-side). */
export const GEN_BEATS: GenPhase[] = [
  'searching',
  'discovering',
  'relationships',
  'generating',
];

/** Advance one phase; null once the sequence is complete. */
export function nextPhase(phase: GenPhase): GenPhase | null {
  const idx = GEN_PHASES.indexOf(phase);
  if (idx < 0 || idx >= GEN_PHASES.length - 1) return null;
  return GEN_PHASES[idx + 1] as GenPhase;
}

/** Index of a phase in the sequence (for progress bars / checklists). */
export function phaseIndex(phase: GenPhase): number {
  return GEN_PHASES.indexOf(phase);
}

/** Total staged beat time, excluding the canvas-side blooming beat. */
export function stagedBeatTotalMs(): number {
  return GEN_BEATS.reduce((sum, p) => sum + GEN_PHASE_META[p].durationMs, 0);
}
