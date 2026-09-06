"use client";

import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  THEME_COOKIE_MAX_AGE,
  THEME_COOKIE_NAME,
  type ResolvedTheme,
  type ThemePreference,
} from "./config";

export type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyResolvedTheme(theme: ResolvedTheme) {
  document.documentElement.dataset.resolvedTheme = theme;
}

export function ThemeProvider({
  initialPreference,
  children,
}: {
  initialPreference: ThemePreference;
  children: ReactNode;
}) {
  const [preference, setPreferenceState] = useState<ThemePreference>(initialPreference);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    initialPreference === "dark" ? "dark" : "light",
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncResolvedTheme = () => {
      const nextResolvedTheme = preference === "system" ? (media.matches ? "dark" : "light") : preference;
      applyResolvedTheme(nextResolvedTheme);
      setResolvedTheme(nextResolvedTheme);
    };

    syncResolvedTheme();
    if (preference !== "system") return;

    media.addEventListener("change", syncResolvedTheme);
    return () => media.removeEventListener("change", syncResolvedTheme);
  }, [preference]);

  const setPreference = useCallback((nextPreference: ThemePreference) => {
    const nextResolvedTheme = nextPreference === "system" ? systemTheme() : nextPreference;

    document.documentElement.dataset.theme = nextPreference;
    applyResolvedTheme(nextResolvedTheme);
    document.cookie = `${THEME_COOKIE_NAME}=${nextPreference}; Path=/; Max-Age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax`;

    setPreferenceState(nextPreference);
    setResolvedTheme(nextResolvedTheme);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, resolvedTheme, setPreference }),
    [preference, resolvedTheme, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
