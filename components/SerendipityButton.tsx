'use client';

import { motion } from 'framer-motion';
import { Dices } from 'lucide-react';
import { GENESIS_EASE } from '@/lib/motion';

interface SerendipityButtonProps {
  onSurprise: () => void;
  disabled?: boolean;
}

export function SerendipityButton({ onSurprise, disabled }: SerendipityButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onSurprise}
      disabled={disabled}
      whileHover={disabled ? undefined : { scale: 1.04 }}
      whileTap={disabled ? undefined : { scale: 0.95 }}
      transition={{ duration: 0.18, ease: GENESIS_EASE }}
      aria-label="Surprise me — jump to a random notable entity"
      className="flex items-center gap-2 rounded-full border border-line bg-surface/80 px-4 py-2 text-[13px] font-medium text-ink backdrop-blur-md transition-colors hover:border-gold/60 hover:text-gold disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Dices size={16} aria-hidden="true" />
      Surprise me
    </motion.button>
  );
}
