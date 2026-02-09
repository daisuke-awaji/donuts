/**
 * Theme Store
 * Manages theme state (light/dark/system) with localStorage persistence
 * and OS preference detection.
 */

import { create } from 'zustand';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'donuts-theme';

/**
 * Resolve the effective theme based on user preference and OS setting.
 */
function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

/**
 * Apply the resolved theme to the document root element.
 */
function applyTheme(resolvedTheme: ResolvedTheme): void {
  document.documentElement.setAttribute('data-theme', resolvedTheme);
}

/**
 * Read the persisted theme from localStorage.
 */
function getPersistedTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch {
    // localStorage unavailable
  }
  return 'light';
}

interface ThemeState {
  /** User-selected theme preference */
  theme: Theme;
  /** Resolved effective theme (light or dark) */
  resolvedTheme: ResolvedTheme;
  /** Set theme preference and apply it */
  setTheme: (theme: Theme) => void;
  /** Initialize theme from localStorage and OS detection */
  initialize: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',
  resolvedTheme: 'light',

  setTheme: (theme: Theme) => {
    const resolved = resolveTheme(theme);
    applyTheme(resolved);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // localStorage unavailable
    }
    set({ theme, resolvedTheme: resolved });
  },

  initialize: () => {
    const theme = getPersistedTheme();
    const resolved = resolveTheme(theme);
    applyTheme(resolved);
    set({ theme, resolvedTheme: resolved });

    // Listen for OS theme changes when "system" is selected
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const currentTheme = get().theme;
      if (currentTheme === 'system') {
        const newResolved = resolveTheme('system');
        applyTheme(newResolved);
        set({ resolvedTheme: newResolved });
      }
    };
    mediaQuery.addEventListener('change', handleChange);
  },
}));
