import type { Locale } from "@/i18n/config";
import type { ThemePreference } from "./config";

type ThemeCopy = {
  appearance: string;
  changeAppearance: string;
  preferences: Record<ThemePreference, string>;
};

const copy: Record<Locale, ThemeCopy> = {
  en: {
    appearance: "Appearance",
    changeAppearance: "Change appearance",
    preferences: {
      system: "System",
      light: "Light",
      dark: "Dark",
    },
  },
  bn: {
    appearance: "দেখার ধরন",
    changeAppearance: "দেখার ধরন পরিবর্তন করুন",
    preferences: {
      system: "সিস্টেম",
      light: "লাইট",
      dark: "ডার্ক",
    },
  },
};

export function getThemeCopy(locale: Locale): ThemeCopy {
  return copy[locale];
}
