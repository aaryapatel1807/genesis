'use client';

import { useId, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { DURATION, GENESIS_EASE } from '@/lib/motion';

/**
 * Genesis Tooltip — hover/focus tooltip in the glassmorphism idiom.
 * Keyboard accessible: appears on focus as well as hover.
 */
interface TooltipProps {
  content: string;
  children: React.ReactNode;
  className?: string;
}

export function Tooltip({ content, children, className }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const id = useId();
  const reduced = useReducedMotion() ?? false;

  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      <span aria-describedby={visible ? id : undefined}>{children}</span>
      <AnimatePresence>
        {visible && (
          <motion.span
            key="tip"
            id={id}
            role="tooltip"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.96 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={{ duration: DURATION.fast, ease: GENESIS_EASE }}
            className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-line bg-surface-2/95 px-2.5 py-1.5 font-mono text-[11px] text-ink shadow-[0_8px_24px_rgba(0,0,0,0.5)] backdrop-blur-md"
          >
            {content}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
