'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle, Info, OctagonX, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { DURATION, GENESIS_EASE } from '@/lib/motion';
import { useWorldStore, type ToastKind } from '@/stores/useWorldStore';

const KIND_STYLES: Record<ToastKind, string> = {
  info: 'border-line bg-surface/95 text-ink',
  warn: 'border-gold/50 bg-gold/10 text-gold',
  error: 'border-red/60 bg-red/10 text-red',
};

const KIND_ICON: Record<ToastKind, typeof Info> = {
  info: Info,
  warn: AlertTriangle,
  error: OctagonX,
};

/**
 * Global toast — reads from the zustand store, animates in with the
 * signature ease, auto-dismisses after 5s. role="status" announces
 * politely to screen readers.
 */
export function Toast() {
  const toast = useWorldStore((s) => s.toast);
  const dismissToast = useWorldStore((s) => s.dismissToast);
  const reduced = useReducedMotion() ?? false;

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(dismissToast, 5000);
    return () => window.clearTimeout(timer);
  }, [toast, dismissToast]);

  const Icon = toast ? KIND_ICON[toast.kind] : Info;

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.message}
          role="status"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.97 }}
          transition={{ duration: DURATION.base, ease: GENESIS_EASE }}
          className={cn(
            'flex max-w-sm items-start gap-3 rounded-[14px] border px-4 py-3 text-[13px]',
            'shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-md',
            KIND_STYLES[toast.kind],
          )}
        >
          <Icon size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
          <p className="flex-1">{toast.message}</p>
          <button
            type="button"
            onClick={dismissToast}
            aria-label="Dismiss notification"
            className="rounded p-0.5 text-muted transition-all hover:scale-110 hover:text-ink active:scale-95"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
