'use client';

import { motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/lib/useTheme';
import { toggleTheme } from '@/lib/theme';

/**
 * ThemeToggle — small ghost-pill icon button for the dual dark/light theme.
 * Sun icon shows in dark mode (tap to go light), Moon icon in light mode.
 * Consistent with the header's existing pill styling.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useTheme();

  const isDark = theme === 'dark';
  const label = isDark ? 'Switch to light theme' : 'Switch to dark theme';
  const Icon = isDark ? Sun : Moon;

  return (
    <motion.button
      type="button"
      onClick={() => setTheme(toggleTheme(theme))}
      aria-label={label}
      title={label}
      whileTap={{ scale: 0.88 }}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-muted transition-colors hover:text-ink focus-visible:outline-2"
    >
      <Icon size={17} aria-hidden="true" strokeWidth={1.6} />
    </motion.button>
  );
}
