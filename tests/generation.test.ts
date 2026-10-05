import { describe, expect, it } from 'vitest';
import {
  GEN_BEATS,
  GEN_PHASES,
  GEN_PHASE_META,
  nextPhase,
  phaseIndex,
  stagedBeatTotalMs,
} from '../lib/generation';

describe('generation sequence phase machine', () => {
  it('orders the beats: searching → discovering → relationships → generating → blooming → ready', () => {
    expect(GEN_PHASES).toEqual([
      'searching',
      'discovering',
      'relationships',
      'generating',
      'blooming',
      'ready',
    ]);
    let phase = GEN_PHASES[0] as (typeof GEN_PHASES)[number];
    const walked = [phase];
    for (;;) {
      const next = nextPhase(phase);
      if (!next) break;
      walked.push(next);
      phase = next;
    }
    expect(walked).toEqual([...GEN_PHASES]);
    expect(nextPhase('ready')).toBeNull();
  });

  it('exposes the four user-facing beats with copy and positive durations', () => {
    expect(GEN_BEATS).toEqual([
      'searching',
      'discovering',
      'relationships',
      'generating',
    ]);
    for (const beat of GEN_BEATS) {
      const meta = GEN_PHASE_META[beat];
      expect(meta.title.length).toBeGreaterThan(0);
      expect(meta.copy.length).toBeGreaterThan(0);
      expect(meta.durationMs).toBeGreaterThan(0);
    }
    expect(stagedBeatTotalMs()).toBeGreaterThan(0);
  });

  it('phaseIndex tracks progress monotonically', () => {
    const indices = GEN_PHASES.map(phaseIndex);
    expect(indices).toEqual([0, 1, 2, 3, 4, 5]);
  });
});
