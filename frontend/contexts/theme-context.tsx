/**
 * Colour-scheme preference. The user can pin the app to light or dark, or
 * follow the OS ('system'). The choice persists across launches via
 * AsyncStorage (localStorage on web).
 *
 * The resolved scheme ('light' | 'dark') is what everything downstream reads,
 * via `hooks/use-color-scheme`, which pulls from this context. `useTheme()`
 * builds on that, so the whole app re-renders when the preference changes.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ColorScheme = 'light' | 'dark';

const STORAGE_KEY = 'gnocchi.theme-preference';

interface ThemePreferenceValue {
  /** What the user picked. */
  preference: ThemePreference;
  /** The scheme actually in effect after resolving 'system'. */
  scheme: ColorScheme;
  setPreference: (pref: ThemePreference) => void;
}

const ThemePreferenceContext = createContext<ThemePreferenceValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  // Hydrate the saved preference once on mount.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (!cancelled && (saved === 'system' || saved === 'light' || saved === 'dark')) {
          setPreferenceState(saved);
        }
      })
      .catch(() => {
        /* first launch / storage unavailable — stick with 'system' */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = (pref: ThemePreference) => {
    setPreferenceState(pref);
    AsyncStorage.setItem(STORAGE_KEY, pref).catch(() => {
      /* non-fatal: the choice still applies for this session */
    });
  };

  const value = useMemo<ThemePreferenceValue>(() => {
    const scheme: ColorScheme =
      preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;
    return { preference, scheme, setPreference };
  }, [preference, systemScheme]);

  return (
    <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>
  );
}

/** Read + set the colour-scheme preference. Throws outside a ThemeProvider. */
export function useThemePreference(): ThemePreferenceValue {
  const ctx = useContext(ThemePreferenceContext);
  if (!ctx) {
    throw new Error('useThemePreference must be used within a ThemeProvider');
  }
  return ctx;
}

/**
 * Resolved scheme, safe to call outside the provider (falls back to the OS
 * scheme). Kept separate so low-level hooks don't hard-crash if rendered
 * before the provider mounts.
 */
export function useResolvedScheme(): ColorScheme {
  const ctx = useContext(ThemePreferenceContext);
  const systemScheme = useSystemColorScheme();
  if (ctx) return ctx.scheme;
  return systemScheme === 'dark' ? 'dark' : 'light';
}
