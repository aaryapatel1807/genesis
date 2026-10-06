import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  THEME_STORAGE_KEY,
  applyTheme,
  getStoredTheme,
  getSystemTheme,
  resolveInitialTheme,
  toggleTheme,
} from '@/lib/theme';

/**
 * lib/theme is pure + DOM-guarded so it runs under the node vitest
 * environment. We stub window (localStorage + matchMedia) and document
 * explicitly per test via vi.stubGlobal.
 */

function stubWindow(opts: {
  store?: Record<string, string>;
  matchMediaLight?: boolean | null;
}): Record<string, string> {
  const store = opts.store ?? {};
  const light = opts.matchMediaLight ?? null;
  const matchMedia: unknown =
    light === null ? undefined : vi.fn(() => ({ matches: light }));
  const win: Record<string, unknown> = {
    localStorage: {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
    },
    matchMedia,
  };
  vi.stubGlobal('window', win);
  return store;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('toggleTheme', () => {
  it('flips dark to light and light to dark', () => {
    expect(toggleTheme('dark')).toBe('light');
    expect(toggleTheme('light')).toBe('dark');
  });
});

describe('getStoredTheme', () => {
  it('returns null under SSR (no window)', () => {
    expect(getStoredTheme()).toBeNull();
  });

  it('returns the stored theme when valid', () => {
    stubWindow({ store: { [THEME_STORAGE_KEY]: 'light' } });
    expect(getStoredTheme()).toBe('light');
  });

  it('returns null for missing or invalid stored values', () => {
    stubWindow({ store: {} });
    expect(getStoredTheme()).toBeNull();
    stubWindow({ store: { [THEME_STORAGE_KEY]: 'nope' } });
    expect(getStoredTheme()).toBeNull();
  });
});

describe('getSystemTheme', () => {
  it('returns light when the OS prefers a light scheme', () => {
    stubWindow({ matchMediaLight: true });
    expect(getSystemTheme()).toBe('light');
  });

  it('returns dark when the OS prefers dark', () => {
    stubWindow({ matchMediaLight: false });
    expect(getSystemTheme()).toBe('dark');
  });

  it('defaults to dark when matchMedia is unavailable (ties go dark)', () => {
    stubWindow({});
    expect(getSystemTheme()).toBe('dark');
  });
});

describe('resolveInitialTheme', () => {
  it('prefers the stored theme over the system preference', () => {
    stubWindow({ store: { [THEME_STORAGE_KEY]: 'dark' }, matchMediaLight: true });
    expect(resolveInitialTheme()).toBe('dark');
  });

  it('falls back to the system theme when nothing is stored', () => {
    stubWindow({ store: {}, matchMediaLight: true });
    expect(resolveInitialTheme()).toBe('light');
  });

  it('falls back to dark when nothing is stored and the system is unknown', () => {
    stubWindow({});
    expect(resolveInitialTheme()).toBe('dark');
  });
});

describe('applyTheme', () => {
  it('no-ops when document is unavailable', () => {
    stubWindow({});
    expect(() => applyTheme('light')).not.toThrow();
  });

  it('sets data-theme, persists to storage, and updates meta theme-color', () => {
    const store = stubWindow({ store: {} });
    const metaEls = Array.from({ length: 2 }, () => ({ content: '' }));
    vi.stubGlobal('document', {
      documentElement: { dataset: {} as Record<string, string> },
      querySelectorAll: () => ({
        forEach: (fn: (m: { setAttribute: (n: string, v: string) => void }) => void) =>
          metaEls.forEach((m) =>
            fn({
              setAttribute: (name: string, value: string) => {
                if (name === 'content') m.content = value;
              },
            }),
          ),
      }),
    });

    const dataset = (document as unknown as { documentElement: { dataset: Record<string, string> } })
      .documentElement.dataset;

    applyTheme('light');
    expect(dataset.theme).toBe('light');
    expect(store[THEME_STORAGE_KEY]).toBe('light');
    expect(metaEls.every((m) => m.content === '#f3f5ff')).toBe(true);

    applyTheme('dark');
    expect(dataset.theme).toBe('dark');
    expect(store[THEME_STORAGE_KEY]).toBe('dark');
    expect(metaEls.every((m) => m.content === '#04080a')).toBe(true);
  });
});
