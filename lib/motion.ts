'use client';

import { useReducedMotion } from 'framer-motion';
import type { Variants } from 'framer-motion';

/**
 * Genesis motion system — single source of truth for animation.
 * Signature: fade + blur + gentle rise, premium durations, expo-out easing.
 * (Animations.md)
 */

/** Signature easing — expo-out-ish, matches the CSS cubic-bezier(0.22,1,0.36,1). */
export const GENESIS_EASE = [0.22, 1, 0.36, 1] as const;

/** Premium durations in seconds — never twitchy, never sluggish. */
export const DURATION = {
  micro: 0.15,
  fast: 0.25,
  base: 0.4,
  slow: 0.6,
  cinematic: 0.9,
} as const;

export const fadeBlurUp: Variants = {
  hidden: { opacity: 0, y: 24, filter: 'blur(8px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: DURATION.slow, ease: GENESIS_EASE },
  },
};

export const fadeBlur: Variants = {
  hidden: { opacity: 0, filter: 'blur(8px)' },
  show: {
    opacity: 1,
    filter: 'blur(0px)',
    transition: { duration: DURATION.base, ease: GENESIS_EASE },
  },
};

export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

export const sheetRight: Variants = {
  hidden: { opacity: 0, x: 32 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: DURATION.base, ease: GENESIS_EASE },
  },
  exit: {
    opacity: 0,
    x: 24,
    transition: { duration: DURATION.fast, ease: GENESIS_EASE },
  },
};

export const sheetBottom: Variants = {
  hidden: { opacity: 0, y: 32 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.base, ease: GENESIS_EASE },
  },
  exit: {
    opacity: 0,
    y: 24,
    transition: { duration: DURATION.fast, ease: GENESIS_EASE },
  },
};

/**
 * Reduced-motion-safe variant picker: when the user prefers reduced motion,
 * every signature animation degrades to a quick crossfade (Accessibility.md).
 */
export function useMotionVariants(): {
  reduced: boolean;
  enter: Variants;
  enterUp: Variants;
  container: Variants;
} {
  const reduced = useReducedMotion() ?? false;
  if (reduced) {
    const crossfade: Variants = {
      hidden: { opacity: 0 },
      show: { opacity: 1, transition: { duration: 0.2 } },
    };
    return {
      reduced,
      enter: crossfade,
      enterUp: crossfade,
      container: { hidden: {}, show: {} },
    };
  }
  return {
    reduced,
    enter: fadeBlur,
    enterUp: fadeBlurUp,
    container: staggerContainer,
  };
}
