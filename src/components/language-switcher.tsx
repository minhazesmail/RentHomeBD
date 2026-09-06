"use client";

import type { Locale } from "@/i18n/config";
import { useLocale } from "@/i18n/use-locale";
import styles from "./language-switcher.module.css";

const choices: Array<{ locale: Locale; shortLabel: string }> = [
  { locale: "en", shortLabel: "EN" },
  { locale: "bn", shortLabel: "বাংলা" },
];

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, dictionary, setLocale } = useLocale();

  return (
    <div
      className={`${styles.switcher} ${className}`.trim()}
      role="group"
      aria-label={dictionary.common.changeLanguage}
      data-language-switcher
    >
      {choices.map((choice, index) => {
        const active = locale === choice.locale;
        const ariaLabel = choice.locale === "en"
          ? dictionary.common.switchToEnglish
          : dictionary.common.switchToBangla;

        return (
          <span className={styles.choiceWrap} key={choice.locale}>
            {index > 0 && <span className={styles.separator} aria-hidden="true">/</span>}
            <button
              className={active ? styles.activeChoice : styles.choice}
              type="button"
              aria-label={ariaLabel}
              aria-pressed={active}
              onClick={() => setLocale(choice.locale)}
            >
              {choice.shortLabel}
            </button>
          </span>
        );
      })}
    </div>
  );
}
