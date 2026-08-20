/**
 * design-system/theme/ThemeProvider.tsx
 *
 * The only way a component may obtain a colour. Wrap the app once in
 * <ThemeProvider>, then call useTheme() anywhere below it.
 *
 * Appearance follows the OS by default and can be pinned by the user.
 */
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import {
  darkTheme,
  lightTheme,
  medicineInk,
  radii,
  borderWidth,
  space,
  layout,
  hitSlop,
  typography,
  fontFamily,
  fontWeight,
  elevation,
  motion,
  type ElevationLevel,
  type ThemeColors,
} from '../tokens';

export type ColorSchemePreference = 'system' | 'light' | 'dark';

export type Theme = {
  colors: ThemeColors;
  space: typeof space;
  layout: typeof layout;
  hitSlop: typeof hitSlop;
  radii: typeof radii;
  borderWidth: typeof borderWidth;
  typography: typeof typography;
  fontFamily: typeof fontFamily;
  fontWeight: typeof fontWeight;
  medicineInk: typeof medicineInk;
  motion: typeof motion;
  isDark: boolean;
  /** Elevation pre-bound to this theme's shadow colour. */
  elevation: (level: ElevationLevel) => ReturnType<typeof elevation>;
};

type ThemeContextValue = {
  theme: Theme;
  preference: ColorSchemePreference;
  setPreference: (next: ColorSchemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function buildTheme(isDark: boolean): Theme {
  const colors = isDark ? darkTheme : lightTheme;
  return {
    colors,
    space,
    layout,
    hitSlop,
    radii,
    borderWidth,
    typography,
    fontFamily,
    fontWeight,
    medicineInk,
    motion,
    isDark,
    elevation: (level: ElevationLevel) => elevation(level, colors.shadow),
  };
}

export function ThemeProvider({
  children,
  initialPreference = 'system',
}: {
  children: React.ReactNode;
  initialPreference?: ColorSchemePreference;
}) {
  const systemScheme = useColorScheme();
  const [preference, setPreference] = useState<ColorSchemePreference>(initialPreference);

  const isDark = preference === 'system' ? systemScheme === 'dark' : preference === 'dark';
  const theme = useMemo(() => buildTheme(isDark), [isDark]);

  const handleSetPreference = useCallback((next: ColorSchemePreference) => {
    setPreference(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, preference, setPreference: handleSetPreference }),
    [theme, preference, handleSetPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme() must be called inside <ThemeProvider>.');
  }
  return ctx.theme;
}

export function useColorSchemePreference() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useColorSchemePreference() must be called inside <ThemeProvider>.');
  }
  return { preference: ctx.preference, setPreference: ctx.setPreference };
}

/**
 * Convenience for stylesheets that depend on the theme. Keeps the
 * `const styles = useThemedStyles(factory)` pattern out of every component.
 */
export function useThemedStyles<T>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [theme, factory]);
}
