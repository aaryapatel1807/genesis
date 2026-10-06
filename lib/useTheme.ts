'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  THEME_STORAGE_KEY,
  applyTheme,
  resolveInitialTheme,
  type Theme,
} from '@/lib/theme';

/**
 * useTheme — standalone client hook for the dual dark/light theme.
 *
 * Initializes from `document.documentElement.dataset.theme` (set by the
 * no-flash inline script in app/layout.tsx, before hydration) and falls
 * back to resolveInitialTheme(). Syncs across tabs via 'storage' events.
 * Standalone — no zustand needed.
 */
export function useTheme(): [Theme, (next: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>((): Theme => {
    if (typeof document !== 'undefined') {
      const preset = document.documentElement.dataset.theme;
      if (preset === 'dark' || preset === 'light') return preset;
    }
    return resolveInitialTheme();
  });

  const setTheme = useCallback((next: Theme): void => {
    setThemeState(next);
    applyTheme(next);
  }, []);

  // Cross-tab sync: another tab changed genesis-theme in localStorage.
  useEffect(() => {
    const onStorage = (e: StorageEvent): void => {
      if (e.key !== THEME_STORAGE_KEY) return;
      if (e.newValue === 'dark' || e.newValue === 'light') {
        setThemeState(e.newValue);
        applyTheme(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return [theme, setTheme];
}
