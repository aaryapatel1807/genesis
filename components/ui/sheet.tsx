'use client';

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { DURATION, GENESIS_EASE } from '@/lib/motion';

/**
 * Genesis Sheet — shadcn-style dialog/sheet primitive, hand-rolled.
 * Slides panels in from the right (detail sheets) or bottom (mobile sheets)
 * with the signature easing. Handles Escape-to-close, initial focus, and
 * aria-modal semantics. No redesign: panel visuals come from children.
 */

type SheetSide = 'right' | 'bottom';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  /** Accessible name for the dialog. */
  label: string;
  side?: SheetSide;
  className?: string;
  children: React.ReactNode;
}

export function Sheet({
  open,
  onClose,
  label,
  side = 'right',
  className,
  children,
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion() ?? false;

  // Escape closes; focus lands on the panel for keyboard users.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    panelRef.current?.focus({ preventScroll: true });
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const offset = side === 'right' ? { x: 32 } : { y: 32 };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="sheet"
          role="dialog"
          aria-modal="true"
          aria-label={label}
          ref={panelRef}
          tabIndex={-1}
          initial={
            reduced
              ? { opacity: 0 }
              : { opacity: 0, ...offset, filter: 'blur(6px)' }
          }
          animate={
            reduced ? { opacity: 1 } : { opacity: 1, x: 0, y: 0, filter: 'blur(0px)' }
          }
          exit={
            reduced
              ? { opacity: 0 }
              : { opacity: 0, x: side === 'right' ? 24 : 0, y: side === 'bottom' ? 24 : 0 }
          }
          transition={{ duration: reduced ? 0.2 : DURATION.base, ease: GENESIS_EASE }}
          className={cn('pointer-events-auto outline-none', className)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
