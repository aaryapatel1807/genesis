'use client';

import { create } from 'zustand';
import { GEN_PHASE_META, type GenPhase } from '@/lib/generation';

export type ToastKind = 'info' | 'warn' | 'error';

interface ToastState {
  message: string;
  kind: ToastKind;
}

interface WorldUIState {
  /** Generation-sequence phase (the staged world birth). */
  phase: GenPhase;
  setPhase: (phase: GenPhase) => void;
  /** Reset to the start of the sequence (fresh world load). */
  resetSequence: () => void;

  /** Global toast (single, latest-wins). */
  toast: ToastState | null;
  showToast: (message: string, kind?: ToastKind) => void;
  dismissToast: () => void;

  /** Screen-reader announcements (aria-live polite). */
  announcement: string;
  announce: (text: string) => void;
}

export const useWorldStore = create<WorldUIState>()((set) => ({
  phase: 'searching',
  setPhase: (phase) => {
    set({ phase });
  },
  resetSequence: () => set({ phase: 'searching', toast: null }),

  toast: null,
  showToast: (message, kind = 'info') => set({ toast: { message, kind } }),
  dismissToast: () => set({ toast: null }),

  announcement: '',
  announce: (text) => {
    // Announce the staged beat copy alongside the phase for screen readers.
    set({ announcement: text });
  },
}));

/** Convenience: the progress copy for the current phase. */
export function phaseCopy(phase: GenPhase): string {
  return GEN_PHASE_META[phase].copy;
}
