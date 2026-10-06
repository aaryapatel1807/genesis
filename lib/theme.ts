/**
 * lib/theme — theme foundation for Genesis dual dark/light theming.
 *
 * Pure, side-effect-free helpers (testable under node): storage key,
 * reading persisted / system preference, resolving the initial theme,
 * and applying a theme to the DOM. Tailwind colors map 1:1 to the CSS
 * custom properties in app/globals.css, so switching
 * `document.documentElement.dataset.theme` adapts the whole UI.
 */

export type Theme = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'genesis-theme';

const THEME_COLOR_META: Record<Theme, string> = {
  dark: '#04080a',
  light: '#f3f5ff',
};

function isTheme(value: unknown): value is Theme {
  return value === 'dark' || value === 'light';
}

/** Persisted theme, or null when none stored / storage unavailable (SSR-safe). */
export function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(raw) ? raw : null;
  } catch {
    return null;
  }
}

/**
 * OS-level preference. Returns 'dark' when matchMedia is unavailable or
 * neither query matches — dark is the product default and wins ties.
 */
export function getSystemTheme(): Theme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'dark';
  }
  try {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

/** stored ?? system ?? 'dark' — dark is the product default. */
export function resolveInitialTheme(): Theme {
  return getStoredTheme() ?? getSystemTheme() ?? 'dark';
}

/**
 * Applies a theme: sets `data-theme` on <html>, persists it, and updates
 * every `<meta name="theme-color">` so the browser chrome matches.
 */
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // storage unavailable (private mode etc.) — theme still applies in-memory
  }
  const metas = document.querySelectorAll('meta[name="theme-color"]');
  metas.forEach((meta) => meta.setAttribute('content', THEME_COLOR_META[theme]));
}

/** Returns the other theme. */
export function toggleTheme(current: Theme): Theme {
  return current === 'dark' ? 'light' : 'dark';
}

/**
 * Reads the live theme from the data-theme attribute. Dark is the product
 * default — any non-'light' value (or SSR) resolves to dark.
 */
export function getTheme(): Theme {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}
