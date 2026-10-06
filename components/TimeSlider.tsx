'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { DURATION, GENESIS_EASE } from '@/lib/motion';

interface TimeSliderProps {
  year: number;
  onChange: (year: number) => void;
}

const STOPS: { year: number; caption: string }[] = [
  { year: 2020, caption: 'GPT-3 and the scale bet' },
  { year: 2022, caption: 'the generative boom begins' },
  { year: 2024, caption: 'agents go mainstream' },
  { year: 2026, caption: 'the living ecosystem' },
];

export function TimeSlider({ year, onChange }: TimeSliderProps) {
  const activeCaption = STOPS.find((s) => s.year === year)?.caption ?? '';
  const reduced = useReducedMotion() ?? false;

  return (
    <div className="flex max-w-[92vw] flex-col items-center gap-2">
      <div
        role="group"
        aria-label="Time travel"
        className="flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-line bg-surface/80 px-2 py-2 backdrop-blur-md"
      >
        {STOPS.map((stop) => {
          const isActive = stop.year === year;
          return (
            <motion.button
              key={stop.year}
              type="button"
              aria-pressed={isActive}
              aria-label={`${stop.year} — ${stop.caption}`}
              onClick={() => onChange(stop.year)}
              whileTap={{ scale: 0.94 }}
              transition={{ duration: DURATION.micro, ease: GENESIS_EASE }}
              className={cn(
                'relative rounded-full px-4 py-1.5 font-mono text-[12px] transition-colors',
                isActive ? 'text-void' : 'text-muted hover:text-ink',
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="time-active-pill"
                  aria-hidden="true"
                  transition={
                    reduced
                      ? { duration: 0.01 }
                      : { duration: DURATION.base, ease: GENESIS_EASE }
                  }
                  className="absolute inset-0 rounded-full bg-gold shadow-[0_0_12px_color-mix(in_srgb,var(--gold)_45%,transparent)]"
                />
              )}
              <span className="relative z-10 font-semibold">{stop.year}</span>
            </motion.button>
          );
        })}
      </div>
      <p aria-live="polite" className="font-mono text-[11px] text-muted">
        {year} — {activeCaption}
      </p>
    </div>
  );
}
