"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useRef } from "react";

import { useLocale } from "@/i18n/use-locale";
import { THEME_PREFERENCES, type ThemePreference } from "@/theme/config";
import { getThemeCopy } from "@/theme/copy";
import { useTheme } from "@/theme/use-theme";
import styles from "./theme-switcher.module.css";

const ICONS = {
  system: Monitor,
  light: Sun,
  dark: Moon,
} satisfies Record<ThemePreference, typeof Monitor>;

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale } = useLocale();
  const { preference, setPreference } = useTheme();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const copy = getThemeCopy(locale);
  const CurrentIcon = ICONS[preference];

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!detailsRef.current?.open) return;
      if (detailsRef.current.contains(event.target as Node)) return;
      detailsRef.current.open = false;
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  function choose(nextPreference: ThemePreference) {
    setPreference(nextPreference);
    if (detailsRef.current) detailsRef.current.open = false;
  }

  return (
    <details
      className={`${styles.root} ${compact ? styles.compact : ""}`}
      ref={detailsRef}
      onKeyDown={(event) => {
        if (event.key === "Escape" && detailsRef.current) {
          detailsRef.current.open = false;
          detailsRef.current.querySelector("summary")?.focus();
        }
      }}
    >
      <summary className={styles.trigger} aria-label={copy.changeAppearance} aria-haspopup="menu">
        <CurrentIcon size={16} strokeWidth={2} aria-hidden="true" />
        <span className={styles.triggerLabel}>{copy.preferences[preference]}</span>
      </summary>
      <div className={styles.menu} role="menu" aria-label={copy.appearance}>
        <span className={styles.menuLabel}>{copy.appearance}</span>
        {THEME_PREFERENCES.map((item) => {
          const Icon = ICONS[item];
          const active = item === preference;
          return (
            <button
              className={`${styles.option} ${active ? styles.optionActive : ""}`}
              type="button"
              role="menuitemradio"
              aria-checked={active}
              onClick={() => choose(item)}
              key={item}
            >
              <Icon size={16} strokeWidth={2} aria-hidden="true" />
              <span>{copy.preferences[item]}</span>
            </button>
          );
        })}
      </div>
    </details>
  );
}
