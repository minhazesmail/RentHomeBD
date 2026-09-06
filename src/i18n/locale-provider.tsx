"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useMemo, useState, type ReactNode } from "react";

import {
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_COOKIE_NAME,
  type Locale,
} from "./config";
import type { Dictionary } from "./dictionaries/en";
import {
  formatCurrency as formatCurrencyValue,
  formatDate as formatDateValue,
  formatNumber as formatNumberValue,
  formatRelativeTime as formatRelativeTimeValue,
} from "./format";
import { getDictionary } from "./get-dictionary";

export type LocaleContextValue = {
  locale: Locale;
  dictionary: Dictionary;
  setLocale: (locale: Locale) => void;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (value: number) => string;
  formatDate: (value: Date | number | string, options?: Intl.DateTimeFormatOptions) => string;
  formatRelativeTime: (value: number, unit: Intl.RelativeTimeFormatUnit) => string;
};

export const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((nextLocale: Locale) => {
    if (typeof document !== "undefined") {
      document.cookie = `${LOCALE_COOKIE_NAME}=${nextLocale}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax`;
      document.documentElement.lang = nextLocale;
    }

    setLocaleState(nextLocale);
    router.refresh();
  }, [router]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      dictionary: getDictionary(locale),
      setLocale,
      formatNumber: (number, options) => formatNumberValue(number, locale, options),
      formatCurrency: (number) => formatCurrencyValue(number, locale),
      formatDate: (date, options) => formatDateValue(date, locale, options),
      formatRelativeTime: (number, unit) => formatRelativeTimeValue(number, unit, locale),
    }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
