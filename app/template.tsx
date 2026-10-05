'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { DURATION, GENESIS_EASE } from '@/lib/motion';

/**
 * Page transition — every route enters with the signature fade + blur
 * (and a gentle rise on the landing page's behalf). Reduced motion:
 * plain crossfade.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduced = useReducedMotion() ?? false;

  return (
    <motion.div
      key={pathname}
      initial={reduced ? { opacity: 0 } : { opacity: 0, filter: 'blur(8px)' }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, filter: 'blur(0px)' }}
      transition={{ duration: reduced ? 0.2 : DURATION.slow, ease: GENESIS_EASE }}
    >
      {children}
    </motion.div>
  );
}
