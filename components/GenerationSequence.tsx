'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  GEN_BEATS,
  GEN_PHASE_META,
  phaseIndex,
} from '@/lib/generation';
import { DURATION, GENESIS_EASE } from '@/lib/motion';
import { useWorldStore } from '@/stores/useWorldStore';
import { AgentChecklist } from '@/components/AgentChecklist';

/**
 * The Genesis generation sequence overlay — the staged world birth.
 *
 * Beats: Searching → Discovering entities → Building relationships →
 * Generating world → (canvas) nodes bloom → edges draw → camera zooms →
 * interaction enabled. Each beat is a real staged step with progress copy;
 * the checklist marks completed beats with a gold check.
 *
 * Reduced motion: the overlay becomes a single quick crossfade.
 */
export function GenerationSequence() {
  const phase = useWorldStore((s) => s.phase);
  const reduced = useReducedMotion() ?? false;
  const active = phase !== 'ready';
  const idx = phaseIndex(phase);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="genesis-sequence"
          role="status"
          aria-label="Generating world"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{
            opacity: 0,
            filter: 'blur(8px)',
            transition: { duration: reduced ? 0.2 : DURATION.slow, ease: GENESIS_EASE },
          }}
          transition={{ duration: DURATION.base }}
          className="absolute inset-0 z-40 grid place-items-center bg-void/85 backdrop-blur-md"
        >
          <div className="w-full max-w-md px-8 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-muted">
              Genesis
            </p>

            {/* Current beat — crossfading title + copy */}
            <div className="mt-6 min-h-[92px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={phase}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12, filter: 'blur(6px)' }}
                  animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8, filter: 'blur(6px)' }}
                  transition={{ duration: reduced ? 0.15 : DURATION.base, ease: GENESIS_EASE }}
                >
                  <h2 className="text-[26px] font-bold tracking-[-0.02em] text-ink">
                    {GEN_PHASE_META[phase].title}
                  </h2>
                  <p aria-live="polite" className="mt-2 font-mono text-[12px] text-muted">
                    {GEN_PHASE_META[phase].copy}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Agent checklist — the single loading narrative. The v2 "wow"
                moment: per-agent statuses replace the old beat list so the
                overlay never shows two competing checklists. */}
            <div className="mx-auto mt-8 max-w-xs text-left">
              <AgentChecklist phase={phase} />
            </div>

            {/* Thin gold progress hairline */}
            <div className="mt-8 h-px w-full overflow-hidden rounded-full bg-line">
              <motion.div
                className="h-full bg-gold shadow-[0_0_12px_color-mix(in_srgb,var(--gold)_80%,transparent)]"
                initial={{ width: '4%' }}
                animate={{ width: `${Math.min(96, 8 + (idx / GEN_BEATS.length) * 88)}%` }}
                transition={{ duration: DURATION.slow, ease: GENESIS_EASE }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
