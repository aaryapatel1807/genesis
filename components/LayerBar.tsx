'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { LAYER_ORDER, type Layer } from '@/lib/types';
import { cn } from '@/lib/cn';
import { DURATION, GENESIS_EASE } from '@/lib/motion';

interface LayerBarProps {
  active: Set<Layer>;
  onToggle: (layer: Layer) => void;
}

export function LayerBar({ active, onToggle }: LayerBarProps) {
  const reduced = useReducedMotion() ?? false;

  return (
    <div
      role="group"
      aria-label="Knowledge layers"
      className="flex max-w-[70vw] gap-2 overflow-x-auto rounded-full border border-line bg-surface/80 px-2 py-2 backdrop-blur-md"
    >
      {LAYER_ORDER.map((layer) => {
        const isActive = active.has(layer);
        return (
          <motion.button
            key={layer}
            type="button"
            aria-pressed={isActive}
            onClick={() => onToggle(layer)}
            whileTap={{ scale: 0.94 }}
            transition={{ duration: DURATION.micro, ease: GENESIS_EASE }}
            className={cn(
              'relative whitespace-nowrap rounded-full px-4 py-1.5 text-[12px] font-medium transition-colors',
              isActive ? 'text-gold' : 'text-muted hover:text-ink',
            )}
          >
            {isActive && (
              <motion.span
                layoutId="layer-active-pill"
                aria-hidden="true"
                transition={
                  reduced
                    ? { duration: 0.01 }
                    : { duration: DURATION.base, ease: GENESIS_EASE }
                }
                className="absolute inset-0 rounded-full bg-gold/15 shadow-[0_0_12px_rgba(245,185,66,0.35)]"
              />
            )}
            <span className="relative z-10">{layer}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
