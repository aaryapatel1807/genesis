'use client';

import { motion } from 'framer-motion';
import { GENESIS_EASE } from '@/lib/motion';
import { Tooltip } from './ui/tooltip';

interface CreditPillProps {
  used: number;
  total: number;
}

export function CreditPill({ used, total }: CreditPillProps) {
  const remaining = Math.max(total - used, 0);
  const low = total > 0 && remaining / total < 0.2;

  return (
    <Tooltip content="SerpApi live-search budget for this session">
      <motion.div
        key={used}
        role="status"
        aria-label={`${used} of ${total} searches used`}
        initial={{ scale: 0.96 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.25, ease: GENESIS_EASE }}
        className={`flex items-center gap-2 rounded-full border px-3 py-2 font-mono text-[11px] backdrop-blur-md ${
          low
            ? 'border-gold/50 bg-gold/10 text-gold'
            : 'border-line bg-surface/80 text-muted'
        }`}
      >
        <span
          aria-hidden="true"
          className={`h-1.5 w-1.5 rounded-full ${low ? 'bg-gold' : 'bg-teal'}`}
        />
        {used}/{total} searches
      </motion.div>
    </Tooltip>
  );
}
